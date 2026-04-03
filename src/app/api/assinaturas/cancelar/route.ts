/**
 * API para cancelar assinatura automática no Mercado Pago
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function getMPConfig() {
  const config = await db.configuracaoPagamento.findFirst()
  return {
    accessToken: config?.mpAccessToken
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lojaId } = body

    if (!lojaId) {
      return NextResponse.json({ error: 'ID da loja é obrigatório' }, { status: 400 })
    }

    const loja = await db.loja.findUnique({
      where: { id: lojaId }
    })

    if (!loja?.mpPreapprovalId) {
      return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 })
    }

    // Cancelar no Mercado Pago
    const mpConfig = await getMPConfig()
    
    const response = await fetch(`https://api.mercadopago.com/preapproval/${loja.mpPreapprovalId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpConfig.accessToken}`
      },
      body: JSON.stringify({
        status: 'cancelled'
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({
        error: data.message || 'Erro ao cancelar assinatura'
      }, { status: 400 })
    }

    // Atualizar loja
    await db.loja.update({
      where: { id: lojaId },
      data: {
        mpAssinaturaStatus: 'cancelled',
        cobrancaAutomatica: false
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Assinatura cancelada. Você pode continuar usando até o fim do período pago.'
    })

  } catch (error) {
    console.error('[Assinatura] Erro ao cancelar:', error)
    return NextResponse.json({
      error: 'Erro ao cancelar assinatura'
    }, { status: 500 })
  }
}
