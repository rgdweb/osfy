import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Teste simples (para usar direto no navegador)
export async function GET() {
  return testarPIX(1.00)
}

// POST - Teste com valor customizado
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const valor = body.valor || 1.00
    return testarPIX(valor)
  } catch {
    return testarPIX(1.00)
  }
}

async function testarPIX(valor: number) {
  try {
    // Buscar configuração
    const config = await db.configuracaoPagamento.findFirst()
    
    if (!config || !config.mpAccessToken) {
      return NextResponse.json({ 
        error: 'Token não configurado',
        config: config ? 'existe mas sem token' : 'não existe'
      })
    }
    
    // Token info
    const token = config.mpAccessToken
    const tokenType = token.startsWith('APP_USR') ? 'PRODUÇÃO' : token.startsWith('TEST') ? 'SANDBOX' : 'DESCONHECIDO'
    
    // Criar pagamento PIX - payer é OBRIGATÓRIO
    const paymentBody = {
      transaction_amount: valor,
      description: 'Teste PIX Debug',
      payment_method_id: 'pix',
      external_reference: `TEST-${Date.now()}`,
      payer: {
        email: 'teste@osfy.com.br',
        first_name: 'Teste',
        last_name: 'Debug'
      }
    }
    
    console.log('[DEBUG PIX] Enviando para MP:', JSON.stringify(paymentBody))
    
    // X-Idempotency-Key é OBRIGATÓRIO para POST
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(paymentBody)
    })
    
    const responseText = await response.text()
    console.log('[DEBUG PIX] Status:', response.status)
    console.log('[DEBUG PIX] Response:', responseText)
    
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { rawText: responseText }
    }
    
    // Verificar se tem QR Code
    const temQRCode = responseData?.point_of_interaction?.transaction_data?.qr_code_base64
    
    return NextResponse.json({
      success: response.ok && !!temQRCode,
      httpStatus: response.status,
      tokenType,
      tokenPreview: `${token.substring(0, 15)}...${token.substring(token.length - 10)}`,
      request: paymentBody,
      response: responseData,
      diagnostico: {
        temQRCode: !!temQRCode,
        statusPagamento: responseData?.status,
        statusDetail: responseData?.status_detail,
        paymentId: responseData?.id,
        erro: responseData?.message || responseData?.error,
        causas: responseData?.causes
      }
    })
    
  } catch (error) {
    console.error('[DEBUG PIX] Erro:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
