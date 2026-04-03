import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { criarPreferencia, criarPagamentoPix } from '@/lib/mercadopago'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo === 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Nao autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { tipoPlano, formaPagamento = 'link' } = body // 'pix' | 'link'

    if (!tipoPlano || !['mensal', 'anual'].includes(tipoPlano)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de plano invalido' },
        { status: 400 }
      )
    }

    // Buscar loja
    const loja = await db.loja.findUnique({
      where: { id: user.lojaId }
    })

    if (!loja) {
      return NextResponse.json(
        { success: false, error: 'Loja nao encontrada' },
        { status: 404 }
      )
    }

    // VERIFICAR SE JA EXISTE FATURA PENDENTE - nao permitir criar duplicata
    const faturaPendente = await db.fatura.findFirst({
      where: {
        lojaId: loja.id,
        status: 'pendente'
      }
    })

    if (faturaPendente) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ja existe uma fatura pendente. Pague a fatura existente antes de gerar uma nova.',
          faturaExistente: {
            id: faturaPendente.id,
            valor: faturaPendente.valor,
            dataVencimento: faturaPendente.dataVencimento,
            linkPagamento: faturaPendente.linkPagamento
          }
        },
        { status: 400 }
      )
    }

    // Buscar configuracoes de pagamento
    const configPagamento = await db.configuracaoPagamento.findFirst()
    
    if (!configPagamento?.mpAccessToken) {
      return NextResponse.json(
        { success: false, error: 'Sistema de pagamento nao configurado. Entre em contato com o suporte.' },
        { status: 400 }
      )
    }

    // Definir valor
    const valor = tipoPlano === 'anual' 
      ? (configPagamento.valorAnuidade || 290)
      : (configPagamento.valorMensalidade || 29.90)

    // Data de vencimento (5 dias a partir de hoje)
    const dataVencimento = new Date()
    dataVencimento.setDate(dataVencimento.getDate() + 5)

    // Descricao da cobranca
    const descricao = tipoPlano === 'anual'
      ? 'Plano Anual TecOS - ' + loja.nome
      : 'Plano Mensal TecOS - ' + loja.nome

    // Referencia externa para identificar a fatura
    const ultimoNumero = await db.fatura.count({
      where: { lojaId: loja.id }
    })
    const numeroFatura = ultimoNumero + 1
    const referenciaExterna = 'FATURA-' + loja.id.substring(0, 8) + '-' + numeroFatura

    // Variaveis para armazenar resultado
    let paymentId: string | undefined
    let preferenceId: string | undefined
    let linkPagamento: string | undefined
    let pixQrCode: string | undefined
    let pixCopiaCola: string | undefined

    if (formaPagamento === 'pix') {
      // Criar pagamento PIX direto (QR Code imediato)
      console.log('[Gerar Cobranca] Criando PIX:', { valor, descricao, referenciaExterna })
      
      const pixResult = await criarPagamentoPix(valor, descricao, referenciaExterna)
      
      if (!pixResult.success) {
        return NextResponse.json(
          { success: false, error: pixResult.error || 'Erro ao gerar PIX' },
          { status: 500 }
        )
      }
      
      paymentId = pixResult.paymentId?.toString()
      pixQrCode = pixResult.qrCodeBase64
      pixCopiaCola = pixResult.qrCode
      
    } else {
      // Criar preferencia (link com PIX, cartao, boleto)
      console.log('[Gerar Cobranca] Criando preferencia:', { valor, descricao, referenciaExterna })
      
      const prefResult = await criarPreferencia(
        descricao,
        valor,
        referenciaExterna,
        {
          descricao: tipoPlano === 'anual' ? 'Anuidade TecOS' : 'Mensalidade TecOS',
          notificationUrl: 'https://tec-os.vercel.app/api/webhooks/mercadopago'
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

    // Criar fatura no banco
    const fatura = await db.fatura.create({
      data: {
        lojaId: loja.id,
        numeroFatura,
        valor,
        status: 'pendente',
        formaPagamento: formaPagamento === 'pix' ? 'pix' : 'link',
        // Mercado Pago (campos corretos)
        mpPaymentId: paymentId,
        mpPreferenceId: preferenceId,
        // Campos de pagamento
        codigoPix: pixCopiaCola,
        qrCodePix: pixQrCode,
        linkPagamento,
        dataVencimento,
        referencia: tipoPlano === 'anual'
          ? 'Anual ' + new Date().getFullYear()
          : new Date().toLocaleString('pt-BR', { month: 'long' }) + '/' + new Date().getFullYear()
      }
    })

    // Atualizar loja com o novo plano
    await db.loja.update({
      where: { id: loja.id },
      data: {
        plano: tipoPlano,
        precoPlano: valor,
        trialUsado: true
      }
    })

    return NextResponse.json({
      success: true,
      fatura: {
        id: fatura.id,
        valor: fatura.valor,
        dataVencimento: fatura.dataVencimento,
        codigoPix: fatura.codigoPix,
        qrCodePix: fatura.qrCodePix,
        linkPagamento: fatura.linkPagamento,
        paymentId,
        preferenceId
      }
    })
  } catch (error) {
    console.error('Erro ao gerar cobranca:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar cobranca' },
      { status: 500 }
    )
  }
}
