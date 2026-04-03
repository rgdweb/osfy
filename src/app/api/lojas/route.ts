import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, generateUniqueSlug } from '@/lib/auth/auth'
import { criarPreferencia, criarPagamentoPix } from '@/lib/mercadopago'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      nome,
      responsavel,
      cpfCnpj,
      telefone,
      whatsapp,
      email,
      senha,
      cidade,
      estado,
      endereco,
      numeroEndereco,
      bairro,
      cep,
      descricao,
      horarioAtendimento,
      tiposServico,
      tipoPlano = 'mensal'
    } = body

    // Validacoes basicas
    if (!nome || !responsavel || !cpfCnpj || !telefone || !whatsapp || !email || !senha || !cidade || !estado || !endereco) {
      return NextResponse.json(
        { success: false, error: 'Todos os campos obrigatorios devem ser preenchidos' },
        { status: 400 }
      )
    }

    const cpfLimpo = cpfCnpj.replace(/\D/g, '')

    // Verificar se JA EXISTE loja com o mesmo CPF, CNPJ ou email
    const lojaExistente = await db.loja.findFirst({
      where: {
        OR: [
          { cpfCnpj: cpfLimpo },
          { email: email.toLowerCase().trim() }
        ]
      }
    })

    // Se ja existe loja com esses dados, bloquear e pedir para logar
    if (lojaExistente) {
      // Bloquear a loja existente ate regularizar
      await db.loja.update({
        where: { id: lojaExistente.id },
        data: {
          bloqueado: true,
          status: 'bloqueada',
          motivoBloqueio: 'Tentativa de cadastro duplicado - regularize o pagamento'
        }
      })
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ja existe uma loja cadastrada com este CPF/CNPJ ou email. Faca login para acessar sua conta e regularizar o pagamento.',
          lojaExistente: true
        },
        { status: 400 }
      )
    }

    // Gerar slug unico
    const slug = await generateUniqueSlug(nome)

    // Hash da senha
    const senhaHash = await hashPassword(senha)

    // Buscar configuracoes de pagamento
    const configPagamento = await db.configuracaoPagamento.findFirst()
    
    console.log('[Criar Loja] Config de pagamento:', {
      temConfig: !!configPagamento,
      temMpToken: !!configPagamento?.mpAccessToken,
      ambiente: configPagamento?.mpAmbiente
    })
    
    // Definir valor do plano
    const precoPlano = tipoPlano === 'anual' 
      ? (configPagamento?.valorAnuidade || 290)
      : (configPagamento?.valorMensalidade || 29.90)

    // PRIMEIRA LOJA - Dar 7 dias de trial
    const trialAte = new Date()
    trialAte.setDate(trialAte.getDate() + 7)
    const trialUsado = false

    // Criar loja com trial
    const loja = await db.loja.create({
      data: {
        nome,
        slug,
        responsavel,
        cpfCnpj: cpfLimpo,
        telefone,
        whatsapp,
        email,
        senhaHash,
        cidade,
        estado,
        endereco,
        numeroEndereco: numeroEndereco || null,
        bairro: bairro || null,
        cep: cep || null,
        descricao: descricao || null,
        horarioAtendimento: horarioAtendimento || null,
        tiposServico: tiposServico || null,
        status: 'ativa',
        plano: tipoPlano,
        precoPlano,
        trialAte,
        trialUsado,
        bloqueado: false
      }
    })

    // Criar contador de OS para a loja
    await db.contadorOS.create({
      data: {
        lojaId: loja.id,
        ultimoNumero: 0
      }
    })

    // Criar notificacao para superadmin
    await db.notificacao.create({
      data: {
        tipo: 'nova_loja',
        titulo: 'Nova Loja Cadastrada!',
        mensagem: nome + ' (' + email + ') se cadastrou no sistema. Plano: ' + tipoPlano + ' (Com trial 7 dias)',
        referenciaId: loja.id,
        referenciaTipo: 'loja',
        lojaId: null // null = para superadmin
      }
    })

    // Variavel para armazenar dados da cobranca
    let cobrancaData: {
      valor: number
      pixQrCode?: string
      pixPayload?: string
      linkPagamento?: string
      linkBoleto?: string
    } | null = null

    // Tentar criar cobranca no Mercado Pago se configurado
    if (configPagamento?.mpAccessToken) {
      try {
        console.log('[Criar Loja] Iniciando criacao de cobranca no Mercado Pago...')
        
        // Data de vencimento (8 dias = 7 dias de trial + 1 dia de tolerancia)
        const dataVencimento = new Date()
        dataVencimento.setDate(dataVencimento.getDate() + 8)

        // Descricao da cobranca
        const descricaoCobranca = tipoPlano === 'anual'
          ? 'Plano Anual TecOS - ' + nome
          : 'Plano Mensal TecOS - ' + nome

        // Referencia externa para identificar a fatura
        const referenciaExterna = 'FATURA-' + loja.id.substring(0, 8) + '-1'

        // 1. Criar PIX diretamente para QR Code imediato
        console.log('[Criar Loja] Criando PIX:', {
          valor: precoPlano,
          descricao: descricaoCobranca,
          referencia: referenciaExterna
        })

        const pixResult = await criarPagamentoPix(
          precoPlano,
          descricaoCobranca,
          referenciaExterna,
          {
            email: email.toLowerCase().trim(),
            firstName: responsavel.split(' ')[0] || 'Cliente',
            lastName: responsavel.split(' ').slice(1).join(' ') || ''
          }
        )

        if (pixResult.success && pixResult.qrCodeBase64) {
          console.log('[Criar Loja] PIX criado com sucesso!')
          cobrancaData = {
            valor: precoPlano,
            pixQrCode: pixResult.qrCodeBase64,
            pixPayload: pixResult.qrCode // código copia e cola
          }
        }

        // 2. Criar preferencia (link com PIX, Cartao, Boleto) como alternativa
        console.log('[Criar Loja] Criando preferencia:', {
          valor: precoPlano,
          descricao: descricaoCobranca,
          referencia: referenciaExterna
        })

        const prefResult = await criarPreferencia(
          descricaoCobranca,
          precoPlano,
          referenciaExterna,
          {
            descricao: tipoPlano === 'anual' ? 'Anuidade TecOS' : 'Mensalidade TecOS',
            payer: {
              nome: responsavel,
              email: email.toLowerCase().trim(),
              cpfCnpj: cpfLimpo,
              telefone: telefone,
              endereco: endereco
            }
          }
        )

        console.log('[Criar Loja] Resultado preferencia:', {
          success: prefResult.success,
          preferenceId: prefResult.preferenceId,
          temLink: !!prefResult.linkPagamento
        })

        if (prefResult.success && prefResult.preferenceId) {
          // Salvar fatura no banco (campos corretos)
          await db.fatura.create({
            data: {
              lojaId: loja.id,
              numeroFatura: 1,
              valor: precoPlano,
              status: 'pendente',
              formaPagamento: 'link',
              mpPreferenceId: prefResult.preferenceId,
              linkPagamento: prefResult.linkPagamento,
              // Salvar PIX na fatura também
              qrCodePix: cobrancaData?.pixQrCode,
              codigoPix: cobrancaData?.pixPayload,
              dataVencimento,
              referencia: tipoPlano === 'anual' 
                ? 'Anual ' + new Date().getFullYear()
                : new Date().toLocaleString('pt-BR', { month: 'long' }) + '/' + new Date().getFullYear()
            }
          })

          // Adicionar link de pagamento aos dados da cobranca
          if (cobrancaData) {
            cobrancaData.linkPagamento = prefResult.linkPagamento
          } else {
            cobrancaData = {
              valor: precoPlano,
              linkPagamento: prefResult.linkPagamento
            }
          }

          console.log('[Criar Loja] Fatura criada com sucesso!')
        }
      } catch (error) {
        console.error('[Criar Loja] Erro ao criar cobranca:', error)
        // Continua mesmo sem cobranca - loja foi criada
      }
    }

    return NextResponse.json({
      success: true,
      slug: loja.slug,
      cobranca: cobrancaData,
      message: 'Loja criada com sucesso'
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao criar loja: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'API de lojas funcionando' })
}
