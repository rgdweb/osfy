import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { criarPreferencia, criarPagamentoPix, criarPagamentoBoleto } from '@/lib/mercadopago'

/**
 * GERAR COBRANÇA SOB DEMANDA
 * 
 * Essa API é chamada quando o lojista CLICA para pagar.
 * Ela pega uma fatura existente e gera o pagamento no Mercado Pago.
 * 
 * IMPORTANTE: Não gera fatura automática no MP, só quando o lojista solicita.
 * Isso evita acumular faturas no MP e ativar antifraude.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo === 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { faturaId, formaPagamento = 'link' } = body // 'pix' | 'boleto' | 'link'

    // Buscar fatura
    let fatura = await db.fatura.findFirst({
      where: {
        id: faturaId || undefined,
        lojaId: user.lojaId,
        status: { in: ['pendente', 'vencida'] }
      },
      include: { loja: true }
    })

    // Se não passou faturaId, buscar a mais antiga pendente
    if (!fatura && !faturaId) {
      fatura = await db.fatura.findFirst({
        where: {
          lojaId: user.lojaId,
          status: { in: ['pendente', 'vencida'] }
        },
        include: { loja: true },
        orderBy: { dataVencimento: 'asc' }
      })
    }

    if (!fatura) {
      return NextResponse.json(
        { success: false, error: 'Nenhuma fatura pendente encontrada' },
        { status: 404 }
      )
    }

    // Se já tem link de pagamento, retornar
    if (fatura.linkPagamento || fatura.codigoPix) {
      return NextResponse.json({
        success: true,
        fatura: {
          id: fatura.id,
          numeroFatura: fatura.numeroFatura,
          valor: fatura.valor,
          codigoPix: fatura.codigoPix,
          qrCodePix: fatura.qrCodePix,
          linkBoleto: fatura.linkBoleto,
          codigoBoleto: fatura.codigoBoleto,
          linkPagamento: fatura.linkPagamento
        },
        mensagem: 'Pagamento já gerado anteriormente'
      })
    }

    // Buscar configurações de pagamento
    const config = await db.configuracaoPagamento.findFirst()
    
    if (!config?.mpAccessToken) {
      return NextResponse.json(
        { success: false, error: 'Sistema de pagamento não configurado' },
        { status: 400 }
      )
    }

    // Dados do lojista
    const loja = fatura.loja
    const referenciaExterna = `FATURA-${fatura.id.substring(0, 8)}-${fatura.numeroFatura}`
    const descricao = `Fatura #${fatura.numeroFatura} - ${loja.nome}`

    // Variáveis para armazenar resultado
    let paymentId: string | undefined
    let preferenceId: string | undefined
    let linkPagamento: string | undefined
    let pixQrCode: string | undefined
    let pixCopiaCola: string | undefined
    let boletoUrl: string | undefined
    let boletoLinha: string | undefined

    // Gerar pagamento conforme forma escolhida
    if (formaPagamento === 'pix') {
      // PIX direto
      console.log('[Cobrança] Gerando PIX para fatura:', fatura.id)
      
      const pixResult = await criarPagamentoPix(fatura.valor, descricao, referenciaExterna, {
        email: loja.email,
        firstName: loja.responsavel || loja.nome,
        identificationNumber: loja.cpfCnpj || undefined,
        identificationType: loja.cpfCnpj && loja.cpfCnpj.length > 14 ? 'CNPJ' : 'CPF'
      })
      
      if (!pixResult.success) {
        return NextResponse.json(
          { success: false, error: pixResult.error || 'Erro ao gerar PIX' },
          { status: 500 }
        )
      }
      
      paymentId = pixResult.paymentId?.toString()
      pixQrCode = pixResult.qrCodeBase64
      pixCopiaCola = pixResult.qrCode

    } else if (formaPagamento === 'boleto') {
      // Boleto - precisa de CPF/CNPJ e endereço completo
      if (!loja.cpfCnpj) {
        return NextResponse.json(
          { success: false, error: 'CPF/CNPJ é obrigatório para gerar boleto' },
          { status: 400 }
        )
      }

      if (!loja.cep) {
        return NextResponse.json(
          { success: false, error: 'CEP é obrigatório para gerar boleto' },
          { status: 400 }
        )
      }
      
      console.log('[Cobrança] Gerando Boleto para fatura:', fatura.id)
      
      const boletoResult = await criarPagamentoBoleto(
        fatura.valor,
        descricao,
        referenciaExterna,
        {
          email: loja.email,
          firstName: loja.responsavel || loja.nome,
          cpfCnpj: loja.cpfCnpj,
          endereco: {
            logradouro: loja.endereco || 'Não informado',
            numero: loja.numeroEndereco || 'S/N',
            bairro: loja.bairro || 'Centro',
            cep: loja.cep,
            cidade: loja.cidade,
            estado: loja.estado
          }
        }
      )
      
      if (!boletoResult.success) {
        return NextResponse.json(
          { success: false, error: boletoResult.error || 'Erro ao gerar boleto' },
          { status: 500 }
        )
      }
      
      paymentId = boletoResult.paymentId?.toString()
      boletoUrl = boletoResult.linkBoleto
      boletoLinha = boletoResult.linhaDigitavel

    } else {
      // Link de pagamento (PIX + Cartão + Boleto no checkout do MP)
      console.log('[Cobrança] Gerando Link para fatura:', fatura.id)
      
      const prefResult = await criarPreferencia(
        descricao,
        fatura.valor,
        referenciaExterna,
        {
          descricao: `Fatura mensalidade - ${fatura.referencia || 'Mensalidade'}`,
          notificationUrl: `${process.env.NEXT_PUBLIC_URL || 'https://tec-os.vercel.app'}/api/webhooks/mercadopago`,
          payer: {
            nome: loja.responsavel || loja.nome,
            email: loja.email,
            cpfCnpj: loja.cpfCnpj || undefined,
            telefone: loja.whatsapp || loja.telefone
          }
        }
      )
      
      if (!prefResult.success) {
        return NextResponse.json(
          { success: false, error: prefResult.error || 'Erro ao gerar link de pagamento' },
          { status: 500 }
        )
      }
      
      preferenceId = prefResult.preferenceId
      linkPagamento = prefResult.linkPagamento
    }

    // Atualizar fatura com dados do pagamento
    const faturaAtualizada = await db.fatura.update({
      where: { id: fatura.id },
      data: {
        mpPaymentId: paymentId,
        mpPreferenceId: preferenceId,
        codigoPix: pixCopiaCola,
        qrCodePix: pixQrCode,
        linkBoleto: boletoUrl,
        codigoBoleto: boletoLinha,
        linkPagamento
      }
    })

    console.log('[Cobrança] Fatura atualizada:', {
      id: fatura.id,
      formaPagamento,
      temPix: !!pixCopiaCola,
      temBoleto: !!boletoUrl,
      temLink: !!linkPagamento
    })

    return NextResponse.json({
      success: true,
      fatura: {
        id: faturaAtualizada.id,
        numeroFatura: faturaAtualizada.numeroFatura,
        valor: faturaAtualizada.valor,
        codigoPix: faturaAtualizada.codigoPix,
        qrCodePix: faturaAtualizada.qrCodePix,
        linkBoleto: faturaAtualizada.linkBoleto,
        codigoBoleto: faturaAtualizada.codigoBoleto,
        linkPagamento: faturaAtualizada.linkPagamento
      }
    })

  } catch (error) {
    console.error('[Cobrança] Erro:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao gerar cobrança',
        detalhes: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
