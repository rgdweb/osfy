import { db } from './db'

// ==================== MERCADO PAGO - CHECKOUT PRO ====================
// Documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/overview

// Tipos
export interface MercadoPagoConfig {
  accessToken: string
  publicKey: string
  clientId: string
  clientSecret: string
  ambiente: 'sandbox' | 'producao'
}

export interface CriarPagamentoParams {
  osId: string
  numeroOs: number
  valor: number
  descricao: string
  clienteNome: string
  clienteEmail?: string
  clienteTelefone?: string
  lojaNome: string
  formaPagamento: 'pix' | 'boleto' | 'link'
}

export interface PagamentoResult {
  success: boolean
  qrCode?: string
  pixCopiaCola?: string
  boletoUrl?: string
  linkPagamento?: string
  preferenceId?: string
  paymentId?: string
  dataExpiracao?: Date
  error?: string
}

// Buscar configurações do Mercado Pago
export async function getMercadoPagoConfig(): Promise<MercadoPagoConfig | null> {
  try {
    const configs = await db.configuracao.findMany({
      where: {
        chave: {
          in: ['mpAccessToken', 'mpPublicKey', 'mpClientId', 'mpClientSecret', 'mpAmbiente']
        }
      }
    })

    const configMap: Record<string, string> = {}
    configs.forEach(c => {
      configMap[c.chave] = c.valor
    })

    const accessToken = configMap.mpAccessToken
    if (!accessToken) {
      return null
    }

    // Detectar ambiente pelo token (mais confiável que configuração manual)
    // APP_USR = Produção | TEST = Sandbox
    const ambienteDetectado = accessToken.startsWith('APP_USR') ? 'producao' : 'sandbox'

    return {
      accessToken,
      publicKey: configMap.mpPublicKey || '',
      clientId: configMap.mpClientId || '',
      clientSecret: configMap.mpClientSecret || '',
      ambiente: ambienteDetectado
    }
  } catch (error) {
    console.error('Erro ao buscar configurações MP:', error)
    return null
  }
}

// ==================== CHECKOUT PRO - CRIAR PREFERÊNCIA ====================
// https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/create-payment-preference

export async function criarPreferenciaPagamento(
  config: MercadoPagoConfig,
  params: CriarPagamentoParams
): Promise<PagamentoResult> {
  try {
    // URL base do site para callbacks
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://tec-os.vercel.app'
    
    // ==================== CRIAR PREFERÊNCIA ====================
    // POST https://api.mercadopago.com/checkout/preferences
    // https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/create-payment-preference#editor_2
    
    const preferenceData = {
      // Item sendo vendido
      items: [
        {
          id: `os-${params.numeroOs}`,
          title: `OS #${params.numeroOs} - ${params.descricao.substring(0, 50)}`,
          description: params.descricao,
          category_id: 'services',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: params.valor
        }
      ],
      
      // Dados do pagador
      payer: {
        name: params.clienteNome.split(' ')[0],
        surname: params.clienteNome.split(' ').slice(1).join(' ') || '',
        email: params.clienteEmail || 'cliente@tecos.com',
        phone: params.clienteTelefone ? {
          area_code: params.clienteTelefone.slice(0, 2),
          number: params.clienteTelefone.replace(/\D/g, '').slice(2)
        } : undefined
      },
      
      // ==================== BACK URLs ====================
      // https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/configure-back-urls
      back_urls: {
        success: `${baseUrl}/pagamento/sucesso?os=${params.osId}`,
        failure: `${baseUrl}/pagamento/erro?os=${params.osId}`,
        pending: `${baseUrl}/pagamento/pendente?os=${params.osId}`
      },
      
      // Retorno automático para pagamentos aprovados
      auto_return: 'approved',
      
      // Referência externa (ID da OS para identificar no webhook)
      external_reference: params.osId,
      
      // ==================== WEBHOOK - NOTIFICATION URL ====================
      // URL para receber notificações de pagamento
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      
      // Data de expiração
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
      
      // Configurações de pagamento
      payment_methods: {
        // Para PIX apenas
        ...(params.formaPagamento === 'pix' && {
          excluded_payment_types: [
            { id: 'credit_card' },
            { id: 'debit_card' },
            { id: 'ticket' } // Boleto
          ],
          installments: 1
        }),
        // Para Boleto apenas
        ...(params.formaPagamento === 'boleto' && {
          excluded_payment_types: [
            { id: 'credit_card' },
            { id: 'debit_card' },
            { id: 'account_money' }
          ],
          installments: 1
        })
      },
      
      // Statement descriptor (nome que aparece na fatura)
      statement_descriptor: params.lojaNome.substring(0, 16).toUpperCase()
    }

    // Chamar API do Mercado Pago
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`
      },
      body: JSON.stringify(preferenceData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Erro ao criar preferência MP:', errorData)
      return {
        success: false,
        error: errorData.message || errorData.cause?.[0]?.description || 'Erro ao criar preferência de pagamento'
      }
    }

    const preferencia = await response.json()
    
    // ==================== INIT_POINT vs SANDBOX_INIT_POINT ====================
    // Produção usa init_point
    // Sandbox usa sandbox_init_point
    // https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/create-payment-preference#editor_2
    
    const linkPagamento = config.ambiente === 'producao'
      ? preferencia.init_point      // Produção
      : preferencia.sandbox_init_point  // Sandbox (testes)

    console.log(`[MP] Preferência criada: ${preferencia.id}`)
    console.log(`[MP] Ambiente: ${config.ambiente}`)
    console.log(`[MP] Link: ${linkPagamento}`)

    return {
      success: true,
      preferenceId: preferencia.id,
      linkPagamento
    }
  } catch (error) {
    console.error('Erro ao criar preferência:', error)
    return {
      success: false,
      error: 'Erro ao conectar com Mercado Pago'
    }
  }
}

// ==================== PAGAMENTO PIX DIRETO (API) ====================
// Cria pagamento PIX com QR Code instantâneo
// Não é Checkout Pro - é API direta de pagamentos

export async function criarPagamentoPix(
  config: MercadoPagoConfig,
  params: CriarPagamentoParams
): Promise<PagamentoResult> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://tec-os.vercel.app')

    // POST /v1/payments com payment_method_id = pix
    const paymentData = {
      transaction_amount: params.valor,
      description: `OS #${params.numeroOs} - ${params.lojaNome}`,
      payment_method_id: 'pix',
      external_reference: params.osId,
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      payer: {
        email: params.clienteEmail || 'cliente@tecos.com',
        first_name: params.clienteNome.split(' ')[0],
        last_name: params.clienteNome.split(' ').slice(1).join(' ') || ''
      },
      date_of_expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
    }

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`,
        'X-Idempotency-Key': `pix-os-${params.osId}-${Date.now()}`
      },
      body: JSON.stringify(paymentData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Erro ao criar PIX MP:', errorData)
      return {
        success: false,
        error: errorData.message || 'Erro ao criar pagamento PIX'
      }
    }

    const payment = await response.json()
    
    // Dados do PIX (QR Code e Copia e Cola)
    const pixData = payment.point_of_interaction?.transaction_data || {}

    return {
      success: true,
      paymentId: String(payment.id),
      qrCode: pixData.qr_code_base64,
      pixCopiaCola: pixData.qr_code,
      dataExpiracao: payment.date_of_expiration ? new Date(payment.date_of_expiration) : undefined
    }
  } catch (error) {
    console.error('Erro ao criar PIX:', error)
    return {
      success: false,
      error: 'Erro ao conectar com Mercado Pago'
    }
  }
}

// ==================== CRIAR LINK DE PAGAMENTO ====================
// Atalho para criar preferência com todos os meios de pagamento

export async function criarLinkPagamento(
  config: MercadoPagoConfig,
  params: CriarPagamentoParams
): Promise<PagamentoResult> {
  return criarPreferenciaPagamento(config, {
    ...params,
    formaPagamento: 'link'
  })
}

// ==================== CONSULTAR PAGAMENTO ====================

export async function consultarPagamento(
  config: MercadoPagoConfig,
  paymentId: string
): Promise<{ status: string; externalReference?: string } | null> {
  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`
      }
    })

    if (!response.ok) {
      return null
    }

    const payment = await response.json()
    return {
      status: payment.status,
      externalReference: payment.external_reference
    }
  } catch (error) {
    console.error('Erro ao consultar pagamento:', error)
    return null
  }
}

// ==================== CONSULTAR PREFERÊNCIA ====================

export async function consultarPreferencia(
  config: MercadoPagoConfig,
  preferenceId: string
): Promise<{ id: string; externalReference?: string; items?: unknown[] } | null> {
  try {
    const response = await fetch(`https://api.mercadopago.com/checkout/preferences/${preferenceId}`, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`
      }
    })

    if (!response.ok) {
      return null
    }

    const preference = await response.json()
    return {
      id: preference.id,
      externalReference: preference.external_reference,
      items: preference.items
    }
  } catch (error) {
    console.error('Erro ao consultar preferência:', error)
    return null
  }
}

// ==================== MAPEAR STATUS MP ====================

export function mapearStatusMP(status: string): 'pendente' | 'aprovado' | 'cancelado' | 'rejeitado' {
  switch (status) {
    case 'approved':
    case 'authorized':
      return 'aprovado'
    case 'pending':
    case 'in_process':
    case 'in_mediation':
      return 'pendente'
    case 'cancelled':
    case 'refunded':
    case 'charged_back':
      return 'cancelado'
    case 'rejected':
      return 'rejeitado'
    default:
      return 'pendente'
  }
}
