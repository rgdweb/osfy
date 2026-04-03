import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Teste simples
export async function GET() {
  return testarLink()
}

async function testarLink() {
  try {
    const config = await db.configuracaoPagamento.findFirst()
    
    if (!config || !config.mpAccessToken) {
      return NextResponse.json({ error: 'Token não configurado' })
    }
    
    const token = config.mpAccessToken
    const tokenType = token.startsWith('APP_USR') ? 'PRODUÇÃO' : 'SANDBOX'
    
    // Criar preferência de teste COM DADOS DO PAYER
    // IMPORTANTE: binary_mode = false para permitir PIX e Boleto
    const preferenceBody = {
      items: [{
        id: 'TEST-LINK',
        title: 'Teste Link Pagamento',
        description: 'Teste de Checkout Pro com dados do cliente',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: 1
      }],
      external_reference: `LINK-TEST-${Date.now()}`,
      back_urls: {
        success: 'https://tec-os.vercel.app/pagamento/sucesso',
        failure: 'https://tec-os.vercel.app/pagamento/erro',
        pending: 'https://tec-os.vercel.app/pagamento/pendente'
      },
      auto_return: 'approved',
      // IMPORTANTE: binary_mode = false permite PIX e Boleto
      binary_mode: false,
      // Configurar métodos de pagamento - NÃO excluir nenhum
      payment_methods: {
        installments: 12
      },
      // Payer com dados completos (essencial para boleto)
      payer: {
        name: 'Cliente',
        surname: 'Teste',
        email: 'cliente@teste.com.br',
        phone: {
          area_code: '11',
          number: '999999999'
        },
        identification: {
          type: 'CPF',
          number: '12345678901' // CPF de teste
        },
        address: {
          zip_code: '01310100',
          street_name: 'Av. Paulista',
          street_number: '1000'
        }
      }
    }
    
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    
    console.log('[DEBUG LINK] Criando preferência com PAYER e binary_mode=false:', JSON.stringify(preferenceBody, null, 2))
    
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(preferenceBody)
    })
    
    const responseText = await response.text()
    console.log('[DEBUG LINK] Status:', response.status)
    console.log('[DEBUG LINK] Response:', responseText)
    
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { rawText: responseText }
    }
    
    // Extrair links
    const initPoint = responseData?.init_point
    const sandboxInitPoint = responseData?.sandbox_init_point
    
    return NextResponse.json({
      success: response.ok,
      httpStatus: response.status,
      tokenType,
      preferenceId: responseData?.id,
      initPoint,
      sandboxInitPoint,
      linkParaTeste: tokenType === 'PRODUÇÃO' ? initPoint : sandboxInitPoint,
      payerEnviado: preferenceBody.payer,
      payerRecebido: responseData?.payer,
      binaryMode: responseData?.binary_mode,
      paymentMethods: responseData?.payment_methods,
      response: responseData
    })
    
  } catch (error) {
    console.error('[DEBUG LINK] Erro:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
