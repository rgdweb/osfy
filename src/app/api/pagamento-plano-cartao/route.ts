/**
 * API para processar pagamento com cartão de crédito
 * Recebe token gerado pelo SDK do Mercado Pago no frontend
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { criarPagamentoCartao } from '@/lib/mercadopago'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lojaId, token, paymentMethodId, parcelas, deviceId } = body

    console.log('[Pagamento Cartão] Recebido:', { 
      lojaId, 
      token: token ? `${token.substring(0, 10)}...` : null,
      paymentMethodId,
      parcelas,
      temDeviceId: !!deviceId
    })

    // Validações
    if (!lojaId) {
      return NextResponse.json({ error: 'ID da loja é obrigatório' }, { status: 400 })
    }

    if (!token) {
      return NextResponse.json({ error: 'Token do cartão é obrigatório' }, { status: 400 })
    }

    // Buscar loja
    const loja = await db.loja.findUnique({
      where: { id: lojaId }
    })

    if (!loja) {
      return NextResponse.json({ error: 'Loja não encontrada' }, { status: 404 })
    }

    const valor = loja.precoPlano || 29.90
    const tipoPlano = loja.plano || 'mensal'
    
    const descricao = tipoPlano === 'anual'
      ? `Plano Anual TecOS - ${loja.nome}`
      : `Plano Mensal TecOS - ${loja.nome}`

    const referenciaExterna = `FATURA-CARTAO-${loja.id.substring(0, 8)}-${Date.now()}`

    // Extrair nomes do responsável
    const nomes = loja.responsavel.split(' ')
    const firstName = nomes[0] || 'Cliente'
    const lastName = nomes.slice(1).join(' ') || ''

    // Processar pagamento com cartão
    const resultado = await criarPagamentoCartao(
      valor,
      descricao,
      referenciaExterna,
      token,
      deviceId,
      parcelas || 1,
      paymentMethodId,
      {
        email: loja.email,
        firstName,
        lastName,
        identificationNumber: loja.cpfCnpj || undefined
      }
    )

    console.log('[Pagamento Cartão] Resultado:', {
      success: resultado.success,
      paymentId: resultado.paymentId,
      status: resultado.status,
      error: resultado.error
    })

    if (!resultado.success) {
      return NextResponse.json({ 
        error: resultado.error || 'Erro ao processar pagamento',
        codigo: 'ERRO_CARTAO'
      }, { status: 400 })
    }

    // Salvar fatura
    const numeroFatura = await db.fatura.count({ where: { lojaId: loja.id } }) + 1
    const dataVencimento = new Date()
    dataVencimento.setDate(dataVencimento.getDate() + 8)

    // Mapear status do MP para status interno
    const statusFatura = resultado.status === 'approved' ? 'pago' : 'pendente'

    const fatura = await db.fatura.create({
      data: {
        lojaId: loja.id,
        numeroFatura,
        valor,
        status: statusFatura,
        formaPagamento: 'cartao',
        dataVencimento,
        referencia: tipoPlano === 'anual'
          ? `Anual ${new Date().getFullYear()}`
          : `${new Date().toLocaleString('pt-BR', { month: 'long' })}/${new Date().getFullYear()}`,
        // Salvar ID do pagamento para webhook
        codigoPix: resultado.paymentId?.toString()
      }
    })

    console.log('[Pagamento Cartão] Fatura criada:', fatura.id)

    // Se aprovado, atualizar status da loja
    if (resultado.status === 'approved') {
      await db.loja.update({
        where: { id: loja.id },
        data: {
          status: 'ativa',
          trialAte: null // Remove trial
        }
      })
      console.log('[Pagamento Cartão] Loja ativada:', loja.id)
    }

    return NextResponse.json({
      success: true,
      paymentId: resultado.paymentId,
      status: resultado.status,
      statusDetail: resultado.statusDetail,
      faturaId: fatura.id
    })

  } catch (error) {
    console.error('[Pagamento Cartão] Erro geral:', error)
    return NextResponse.json({ 
      error: 'Erro ao processar pagamento',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
