/**
 * API para gerar pagamento do plano da loja
 * Só é chamada quando o usuário CLICA em uma das opções de pagamento
 * Isso evita criar faturas fantasmas no Mercado Pago
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { criarPreferencia, criarPagamentoPix, criarPagamentoBoleto } from '@/lib/mercadopago'

// Verificar se Mercado Pago está configurado
async function verificarConfiguracaoMP() {
  const config = await db.configuracaoPagamento.findFirst()
  
  if (!config) {
    return { configurado: false, erro: 'Configuração de pagamento não encontrada. Configure o Mercado Pago no painel do Super Admin.' }
  }
  
  if (!config.mpAccessToken) {
    return { configurado: false, erro: 'Access Token do Mercado Pago não configurado. Configure no painel do Super Admin.' }
  }
  
  return { configurado: true, config }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lojaId, formaPagamento } = body

    console.log('[Pagamento Plano] Recebido:', { lojaId, formaPagamento })

    if (!lojaId) {
      return NextResponse.json({ error: 'ID da loja é obrigatório' }, { status: 400 })
    }

    if (!formaPagamento || !['pix', 'boleto', 'cartao'].includes(formaPagamento)) {
      return NextResponse.json({ error: 'Forma de pagamento inválida' }, { status: 400 })
    }

    // Verificar configuração do Mercado Pago PRIMEIRO
    const mpConfig = await verificarConfiguracaoMP()
    if (!mpConfig.configurado) {
      console.error('[Pagamento Plano] MP não configurado:', mpConfig.erro)
      return NextResponse.json({ 
        error: mpConfig.erro,
        codigo: 'MP_NAO_CONFIGURADO'
      }, { status: 400 })
    }

    // Buscar loja
    const loja = await db.loja.findUnique({
      where: { id: lojaId }
    })

    if (!loja) {
      return NextResponse.json({ error: 'Loja não encontrada' }, { status: 404 })
    }

    // Verificar se já tem fatura pendente com link
    const faturaPendente = await db.fatura.findFirst({
      where: {
        lojaId: loja.id,
        status: 'pendente'
      },
      orderBy: { dataCriacao: 'desc' }
    })

    if (faturaPendente?.linkPagamento) {
      console.log('[Pagamento Plano] Fatura já existe:', faturaPendente.id)
      return NextResponse.json({
        success: true,
        cobranca: {
          valor: faturaPendente.valor,
          pixQrCode: faturaPendente.qrCodePix,
          pixPayload: faturaPendente.codigoPix,
          linkPagamento: faturaPendente.linkPagamento,
          linkBoleto: faturaPendente.linkBoleto,
          boletoLinhaDigitavel: faturaPendente.codigoBoleto
        },
        message: 'Pagamento já gerado anteriormente'
      })
    }

    // Buscar valores configurados no painel do super admin
    const configPagamento = await db.configuracaoPagamento.findFirst()
    const valorMensalidade = configPagamento?.valorMensalidade || 99.90
    const valorAnuidade = configPagamento?.valorAnuidade || 999.90
    
    const tipoPlano = loja.plano || 'mensal'
    const valor = tipoPlano === 'anual' ? valorAnuidade : valorMensalidade
    
    const descricao = tipoPlano === 'anual'
      ? `Plano Anual TecOS - ${loja.nome}`
      : `Plano Mensal TecOS - ${loja.nome}`

    const referenciaExterna = `FATURA-${loja.id.substring(0, 8)}-${Date.now()}`

    let pixQrCode: string | undefined
    let pixPayload: string | undefined
    let linkPagamento: string | undefined
    let linkBoleto: string | undefined
    let boletoLinhaDigitavel: string | undefined

    // Extrair nomes do responsável
    const nomes = loja.responsavel.split(' ')
    const firstName = nomes[0] || 'Cliente'
    const lastName = nomes.slice(1).join(' ') || ''

    // ===== PIX IMEDIATO =====
    if (formaPagamento === 'pix') {
      console.log('[Pagamento Plano] Gerando PIX...')
      
      try {
        const pixResult = await criarPagamentoPix(
          valor,
          descricao,
          referenciaExterna,
          {
            email: loja.email,
            firstName,
            lastName
          }
        )

        if (pixResult.success && pixResult.qrCodeBase64) {
          pixQrCode = pixResult.qrCodeBase64
          pixPayload = pixResult.qrCode
          console.log('[Pagamento Plano] PIX criado com sucesso')
        } else {
          console.error('[Pagamento Plano] Erro PIX:', pixResult.error)
        }
      } catch (err) {
        console.error('[Pagamento Plano] Exceção PIX:', err)
      }
    }

    // ===== BOLETO =====
    if (formaPagamento === 'boleto') {
      console.log('[Pagamento Plano] Gerando Boleto...')
      
      const cepLimpo = (loja.cep || '').replace(/\D/g, '')
      const cpfLimpo = (loja.cpfCnpj || '').replace(/\D/g, '')
      
      if (cepLimpo.length !== 8) {
        return NextResponse.json({ 
          error: 'CEP não cadastrado ou inválido',
          hint: 'Complete seu cadastro com CEP para gerar boleto'
        }, { status: 400 })
      }

      if (cpfLimpo.length !== 11 && cpfLimpo.length !== 14) {
        return NextResponse.json({ 
          error: 'CPF/CNPJ inválido',
          hint: 'Complete seu cadastro com CPF ou CNPJ para gerar boleto'
        }, { status: 400 })
      }

      try {
        const boletoResult = await criarPagamentoBoleto(
          valor,
          descricao,
          referenciaExterna,
          {
            email: loja.email,
            firstName,
            lastName,
            cpfCnpj: cpfLimpo,
            endereco: {
              logradouro: loja.endereco || 'Endereço não informado',
              numero: loja.numeroEndereco || 'S/N',
              bairro: loja.bairro || 'Centro',
              cep: cepLimpo,
              cidade: loja.cidade,
              estado: loja.estado
            }
          }
        )

        if (boletoResult.success) {
          linkBoleto = boletoResult.linkBoleto
          boletoLinhaDigitavel = boletoResult.linhaDigitavel
          console.log('[Pagamento Plano] Boleto criado com sucesso')
        } else {
          console.error('[Pagamento Plano] Erro Boleto:', boletoResult.error)
        }
      } catch (err) {
        console.error('[Pagamento Plano] Exceção Boleto:', err)
      }
    }

    // ===== LINK DE PAGAMENTO (sempre criar) =====
    console.log('[Pagamento Plano] Criando preferência...')
    
    try {
      const prefResult = await criarPreferencia(
        descricao,
        valor,
        referenciaExterna,
        {
          descricao: tipoPlano === 'anual' ? 'Anuidade TecOS' : 'Mensalidade TecOS',
          payer: {
            nome: loja.responsavel,
            email: loja.email,
            telefone: loja.telefone,
            cpfCnpj: loja.cpfCnpj || undefined,
            endereco: loja.endereco
          }
        }
      )

      if (prefResult.success && prefResult.linkPagamento) {
        linkPagamento = prefResult.linkPagamento
        console.log('[Pagamento Plano] Preferência criada')
      } else {
        console.error('[Pagamento Plano] Erro Preferência:', prefResult.error)
      }
    } catch (err) {
      console.error('[Pagamento Plano] Exceção Preferência:', err)
    }

    // ===== SALVAR FATURA =====
    const numeroFatura = await db.fatura.count({ where: { lojaId: loja.id } }) + 1
    
    // Data de vencimento (8 dias = 7 dias trial + 1 dia tolerância)
    const dataVencimento = new Date()
    dataVencimento.setDate(dataVencimento.getDate() + 8)

    try {
      await db.fatura.create({
        data: {
          lojaId: loja.id,
          numeroFatura,
          valor,
          status: 'pendente',
          formaPagamento,
          linkPagamento,
          qrCodePix: pixQrCode,
          codigoPix: pixPayload,
          linkBoleto,
          codigoBoleto: boletoLinhaDigitavel,
          dataVencimento,
          referencia: tipoPlano === 'anual'
            ? `Anual ${new Date().getFullYear()}`
            : `${new Date().toLocaleString('pt-BR', { month: 'long' })}/${new Date().getFullYear()}`
        }
      })
      console.log('[Pagamento Plano] Fatura salva')
    } catch (err) {
      console.error('[Pagamento Plano] Erro ao salvar fatura:', err)
    }

    // Verificar se gerou algo
    if (!pixQrCode && !linkPagamento && !linkBoleto) {
      return NextResponse.json({ 
        error: 'Não foi possível gerar o pagamento',
        hint: 'Verifique se o Mercado Pago está configurado corretamente no painel do Super Admin'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      cobranca: {
        valor,
        pixQrCode,
        pixPayload,
        linkPagamento,
        linkBoleto,
        boletoLinhaDigitavel
      }
    })

  } catch (error) {
    console.error('[Pagamento Plano] Erro geral:', error)
    return NextResponse.json({ 
      error: 'Erro ao gerar pagamento',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
