/**
 * API para criar assinatura automática no Mercado Pago
 * Usa o sistema de Preapproval para cobrança recorrente automática
 * 
 * Vantagens:
 * - Cobrança automática no cartão do cliente
 * - Não precisa de intervenção do lojista
 * - Menos inadimplência
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Buscar configurações do MP
async function getMPConfig() {
  const config = await db.configuracaoPagamento.findFirst()
  return {
    accessToken: config?.mpAccessToken,
    publicKey: config?.mpPublicKey,
    ambiente: config?.mpAmbiente || 'sandbox'
  }
}

// URL base do site
function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://tec-os.vercel.app'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lojaId, plano, cardToken } = body

    if (!lojaId) {
      return NextResponse.json({ error: 'ID da loja é obrigatório' }, { status: 400 })
    }

    if (!cardToken) {
      return NextResponse.json({ error: 'Token do cartão é obrigatório' }, { status: 400 })
    }

    // Buscar loja
    const loja = await db.loja.findUnique({
      where: { id: lojaId }
    })

    if (!loja) {
      return NextResponse.json({ error: 'Loja não encontrada' }, { status: 404 })
    }

    // Buscar configurações do MP
    const mpConfig = await getMPConfig()
    if (!mpConfig.accessToken) {
      return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 400 })
    }

    // Buscar configurações de pagamento para pegar os valores configurados
    const configPagamento = await db.configuracaoPagamento.findFirst()
    const valorMensalidade = configPagamento?.valorMensalidade || 99.90
    const valorAnuidade = configPagamento?.valorAnuidade || 999.90
    
    // Usar valor do plano conforme configuração do super admin
    const valor = loja.plano === 'anual' ? valorAnuidade : valorMensalidade
    
    // Criar assinatura no Mercado Pago
    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpConfig.accessToken}`
      },
      body: JSON.stringify({
        reason: `Assinatura TecOS - Plano ${plano === 'anual' ? 'Anual' : 'Mensal'}`,
        external_reference: `ASSINATURA-${loja.id.substring(0, 8)}`,
        payer_email: loja.email,
        auto_recurring: {
          frequency: plano === 'anual' ? 12 : 1,
          frequency_type: 'months',
          transaction_amount: valor,
          currency_id: 'BRL'
        },
        back_url: `${getBaseUrl()}/painel`,
        card_token_id: cardToken,
        status: 'authorized'
      })
    })

    const data = await response.json()

    console.log('[Assinatura] Resposta MP:', {
      status: response.status,
      id: data.id,
      status_detail: data.status
    })

    if (!response.ok) {
      return NextResponse.json({
        error: data.message || 'Erro ao criar assinatura',
        details: data.cause?.map((c: { description: string }) => c.description).join(', ')
      }, { status: 400 })
    }

    // Salvar dados da assinatura na loja
    await db.loja.update({
      where: { id: loja.id },
      data: {
        mpPreapprovalId: data.id,
        mpAssinaturaStatus: 'authorized',
        cobrancaAutomatica: true
      }
    })

    // Criar fatura do primeiro pagamento
    const numeroFatura = await db.fatura.count({ where: { lojaId: loja.id } }) + 1
    
    await db.fatura.create({
      data: {
        lojaId: loja.id,
        numeroFatura,
        valor,
        status: 'paga',
        formaPagamento: 'cartao_assinatura',
        mpPaymentId: data.first_payment_id?.toString(),
        dataPagamento: new Date(),
        referencia: plano === 'anual'
          ? `Anual ${new Date().getFullYear()}`
          : `${new Date().toLocaleString('pt-BR', { month: 'long' })}/${new Date().getFullYear()}`
      }
    })

    // Ativar loja
    await db.loja.update({
      where: { id: loja.id },
      data: {
        status: 'ativa',
        trialAte: null
      }
    })

    return NextResponse.json({
      success: true,
      assinaturaId: data.id,
      status: data.status,
      message: 'Assinatura criada com sucesso! Você será cobrado automaticamente.'
    })

  } catch (error) {
    console.error('[Assinatura] Erro:', error)
    return NextResponse.json({
      error: 'Erro ao criar assinatura',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
