import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Teste de criação de Boleto via API direta
export async function GET() {
  return testarBoleto()
}

async function testarBoleto() {
  try {
    const config = await db.configuracaoPagamento.findFirst()
    
    if (!config || !config.mpAccessToken) {
      return NextResponse.json({ error: 'Token não configurado' })
    }
    
    const token = config.mpAccessToken
    const tokenType = token.startsWith('APP_USR') ? 'PRODUÇÃO' : 'SANDBOX'
    
    // CPF válido para teste
    const cpfTeste = '03207996973' // CPF informado pelo usuário
    
    // Criar pagamento BOLETO via API direta (não é Checkout Pro)
    // payment_method_id: "bolbradesco" = Boleto Bradesco (padrão do MP)
    // Valor mínimo para boleto geralmente é R$ 5,00
    const paymentBody = {
      transaction_amount: 10, // R$ 10,00 (valor mínimo para boleto)
      description: 'Teste Boleto via API Direta',
      payment_method_id: 'bolbradesco',
      external_reference: `BOLETO-TEST-${Date.now()}`,
      // Payer obrigatório para boleto
      payer: {
        email: 'cliente@teste.com.br',
        first_name: 'Cliente',
        last_name: 'Teste',
        identification: {
          type: 'CPF',
          number: cpfTeste
        },
        address: {
          zip_code: '01310100',
          street_name: 'Av. Paulista',
          street_number: '1000',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          federal_unit: 'SP'
        }
      },
      // Data de vencimento (5 dias)
      date_of_expiration: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    }
    
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    
    console.log('[DEBUG BOLETO] Criando pagamento com CPF:', cpfTeste, 'Valor: R$ 10')
    
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
    console.log('[DEBUG BOLETO] Status:', response.status)
    console.log('[DEBUG BOLETO] Response:', responseText)
    
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { rawText: responseText }
    }
    
    // Extrair dados do boleto
    const transactionData = responseData?.transaction_data || {}
    
    return NextResponse.json({
      success: response.ok,
      httpStatus: response.status,
      tokenType,
      paymentId: responseData?.id,
      status: responseData?.status,
      statusDetail: responseData?.status_detail,
      // Dados do boleto
      boleto: {
        codigoBarras: transactionData?.barcode?.content || null,
        linhaDigitavel: transactionData?.barcode?.content || null,
        linkBoleto: transactionData?.ticket_url || null,
        dataVencimento: responseData?.date_of_expiration || transactionData?.date_of_expiration || null
      },
      // Dados enviados
      cpfUsado: cpfTeste,
      valorEnviado: 10,
      // Resposta completa
      response: responseData
    })
    
  } catch (error) {
    console.error('[DEBUG BOLETO] Erro:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
