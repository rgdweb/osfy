/**
 * Integração com Efí Bank (antiga Gerencianet)
 * API Docs: https://dev.efipay.com.br/docs/api-pix/credenciais/
 * 
 * Esta biblioteca permite que cada lojista receba pagamentos das OS
 * diretamente na sua conta Efí Bank usando Client ID e Client Secret.
 */

import { db } from './db'

// URLs base do Efí Bank
const EFI_URLS = {
  producao: 'https://api.efipay.com.br',
  homologacao: 'https://sandbox.api.efipay.com.br'
}

// Interface para configurações do lojista
interface ConfigEfi {
  clientId: string
  clientSecret: string
  ambiente: 'producao' | 'homologacao'
  pixChave: string
  pixTipo: string
  pixNome: string
}

// Cache de tokens para evitar requisições desnecessárias
const tokenCache = new Map<string, { token: string; expiresAt: number }>()

/**
 * Buscar configurações do Efí Bank da loja
 */
export async function getLojaEfiConfig(lojaId: string): Promise<ConfigEfi | null> {
  const loja = await db.loja.findUnique({
    where: { id: lojaId },
    select: {
      usarPagamentoSistema: true,
      efiClientId: true,
      efiClientSecret: true,
      efiAmbiente: true,
      pixChave: true,
      pixTipo: true,
      pixNome: true
    }
  })

  if (!loja || !loja.usarPagamentoSistema || !loja.efiClientId || !loja.efiClientSecret || !loja.pixChave) {
    return null
  }

  return {
    clientId: loja.efiClientId,
    clientSecret: loja.efiClientSecret,
    ambiente: (loja.efiAmbiente as 'producao' | 'homologacao') || 'homologacao',
    pixChave: loja.pixChave,
    pixTipo: loja.pixTipo || 'cpf',
    pixNome: loja.pixNome || ''
  }
}

/**
 * Obter URL base according com o ambiente
 */
function getBaseUrl(ambiente: 'producao' | 'homologacao'): string {
  return EFI_URLS[ambiente] || EFI_URLS.homologacao
}

/**
 * Obter token de acesso OAuth2 do Efí Bank
 * Documentação: https://dev.efipay.com.br/docs/api-pix/credenciais/
 */
async function obterTokenAcesso(config: ConfigEfi): Promise<string> {
  const cacheKey = `${config.clientId}-${config.ambiente}`
  const cached = tokenCache.get(cacheKey)
  
  // Se tem token em cache e ainda é válido (com margem de 5 minutos)
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    console.log('[Efí Bank] Usando token em cache')
    return cached.token
  }

  const baseUrl = getBaseUrl(config.ambiente)
  const url = `${baseUrl}/oauth/token`

  console.log('[Efí Bank] Obtendo novo token de acesso...', { ambiente: config.ambiente })

  // Criar Basic Auth com Client ID:Client Secret em base64
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'client_credentials'
    })
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('[Efí Bank] Erro ao obter token:', data)
    throw new Error(data.mensagem || data.error_description || 'Erro ao obter token de acesso')
  }

  console.log('[Efí Bank] Token obtido com sucesso')

  // Armazenar em cache
  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000)
  })

  return data.access_token
}

/**
 * Criar cobrança PIX imediata
 * Documentação: https://dev.efipay.com.br/docs/api-pix/cobrancas-imediatas
 */
export async function criarCobrancaPix(
  lojaId: string,
  valor: number,
  descricao: string,
  referenciaExterna: string
): Promise<{
  success: boolean
  txid?: string
  pixCopiaCola?: string
  pixQrCode?: string
  location?: string
  error?: string
}> {
  try {
    const config = await getLojaEfiConfig(lojaId)
    
    if (!config) {
      return { 
        success: false, 
        error: 'Loja não configurou pagamento. Configure o Efí Bank nas configurações.' 
      }
    }

    // Obter token de acesso
    const accessToken = await obterTokenAcesso(config)

    // Criar cobrança PIX
    const baseUrl = getBaseUrl(config.ambiente)
    const url = `${baseUrl}/v2/cob`

    // Valor deve ser string com 2 casas decimais
    const valorFormatado = valor.toFixed(2)

    const body = {
      calendario: {
        expiracao: 3600 // 1 hora
      },
      valor: {
        original: valorFormatado
      },
      chave: config.pixChave,
      solicitacaoPagador: descricao.substring(0, 140),
      infoAdicionais: [
        {
          nome: 'Referencia',
          valor: referenciaExterna.substring(0, 50)
        }
      ]
    }

    console.log('[Efí Bank] Criando cobrança PIX:', {
      ambiente: config.ambiente,
      valor: valorFormatado,
      chave: config.pixChave,
      referencia: referenciaExterna
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[Efí Bank] Erro ao criar cobrança:', data)
      return { 
        success: false, 
        error: data.mensagem || data.error_description || 'Erro ao criar cobrança PIX' 
      }
    }

    console.log('[Efí Bank] Cobrança criada:', {
      txid: data.txid,
      status: data.status,
      temPixCopiaECola: !!data.pixCopiaECola,
      temPixQrCode: !!data.pixQrCode,
      temLocation: !!data.loc?.location
    })

    // Se não veio o QR Code diretamente, buscar via location
    let pixQrCode = data.pixQrCode
    if (!pixQrCode && data.loc?.location) {
      console.log('[Efí Bank] Buscando QR Code via location:', data.loc.location)
      try {
        const qrResponse = await fetch(data.loc.location, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })
        const qrData = await qrResponse.json()
        console.log('[Efí Bank] Resposta QR:', qrData)
        
        if (qrData.imagemQrCode) {
          pixQrCode = qrData.imagemQrCode // base64
        } else if (qrData.qrCode) {
          pixQrCode = qrData.qrCode
        }
      } catch (qrError) {
        console.error('[Efí Bank] Erro ao buscar QR Code:', qrError)
      }
    }

    console.log('[Efí Bank] QR Code final:', pixQrCode ? `${pixQrCode.substring(0, 50)}...` : 'AUSENTE')

    return {
      success: true,
      txid: data.txid,
      pixCopiaCola: data.pixCopiaECola,
      pixQrCode: pixQrCode,
      location: data.loc?.location
    }
  } catch (error) {
    console.error('[Efí Bank] Erro ao criar cobrança PIX:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro interno ao criar cobrança PIX' 
    }
  }
}

/**
 * Consultar status de uma cobrança PIX
 */
export async function consultarCobrancaPix(
  lojaId: string,
  txid: string
): Promise<{
  success: boolean
  status?: string
  valor?: number
  pagador?: {
    nome: string
    cpf: string
  }
  dataPagamento?: string
  error?: string
}> {
  try {
    const config = await getLojaEfiConfig(lojaId)
    
    if (!config) {
      return { success: false, error: 'Loja não configurou pagamento' }
    }

    const accessToken = await obterTokenAcesso(config)
    const baseUrl = getBaseUrl(config.ambiente)
    const url = `${baseUrl}/v2/cob/${txid}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.mensagem || 'Erro ao consultar cobrança' }
    }

    return {
      success: true,
      status: data.status,
      valor: parseFloat(data.valor?.original || '0'),
      pagador: data.devedor ? {
        nome: data.devedor.nome || '',
        cpf: data.devedor.cpf || ''
      } : undefined,
      dataPagamento: data.calendario?.dataHoraUltimaAlteracao
    }
  } catch (error) {
    console.error('[Efí Bank] Erro ao consultar cobrança:', error)
    return { success: false, error: 'Erro ao consultar cobrança' }
  }
}

/**
 * Configurar webhook para receber notificações de pagamento
 * Documentação: https://dev.efipay.com.br/docs/api-pix/webhooks
 */
export async function configurarWebhookEfi(
  lojaId: string,
  webhookUrl: string
): Promise<{
  success: boolean
  webhookUrl?: string
  error?: string
}> {
  try {
    const config = await getLojaEfiConfig(lojaId)
    
    if (!config) {
      return { success: false, error: 'Loja não configurou pagamento' }
    }

    const accessToken = await obterTokenAcesso(config)
    const baseUrl = getBaseUrl(config.ambiente)
    const url = `${baseUrl}/v2/webhook/${config.pixChave}`

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        webhookUrl
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[Efí Bank] Erro ao configurar webhook:', data)
      return { success: false, error: data.mensagem || 'Erro ao configurar webhook' }
    }

    console.log('[Efí Bank] Webhook configurado:', data.webhookUrl)

    return {
      success: true,
      webhookUrl: data.webhookUrl
    }
  } catch (error) {
    console.error('[Efí Bank] Erro ao configurar webhook:', error)
    return { success: false, error: 'Erro ao configurar webhook' }
  }
}

/**
 * Mapear status do Efí Bank para status interno
 */
export function mapearStatusEfi(statusEfi: string): string {
  const mapeamento: Record<string, string> = {
    'ATIVA': 'pendente',
    'CONCLUIDA': 'pago',
    'REMOVIDA_PELO_USUARIO_RECEBEDOR': 'cancelado',
    'REMOVIDA_PELO_PSP': 'cancelado'
  }
  
  return mapeamento[statusEfi] || 'pendente'
}

/**
 * Testar conexão com o Efí Bank usando Client ID e Client Secret
 */
export async function testarConexaoEfi(
  clientId: string,
  clientSecret: string,
  ambiente: 'producao' | 'homologacao' = 'homologacao'
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const baseUrl = getBaseUrl(ambiente)
    const url = `${baseUrl}/oauth/token`

    console.log('[Efí Bank] Testando conexão:', { 
      ambiente, 
      baseUrl,
      clientIdLength: clientId?.length,
      clientSecretLength: clientSecret?.length
    })

    // Criar Basic Auth
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    console.log('[Efí Bank] Credentials base64:', credentials.substring(0, 20) + '...')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'client_credentials'
      })
    })

    console.log('[Efí Bank] Status da resposta:', response.status)

    const responseText = await response.text()
    console.log('[Efí Bank] Resposta:', responseText)

    if (response.ok) {
      return { success: true }
    }

    let errorData
    try {
      errorData = JSON.parse(responseText)
    } catch {
      errorData = { mensagem: responseText }
    }

    console.error('[Efí Bank] Erro detalhado:', errorData)

    return { 
      success: false, 
      error: errorData.mensagem || errorData.error_description || errorData.error || `Erro ${response.status}: Verifique as credenciais` 
    }
  } catch (error) {
    console.error('[Efí Bank] Erro ao testar conexão:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao conectar com o Efí Bank' 
    }
  }
}

/**
 * Validar assinatura do webhook do Efí Bank
 * O Efí Bank envia uma assinatura no header para validação
 */
export function validarWebhookEfi(
  payload: string,
  signature: string
): boolean {
  // O Efí Bank usa HMAC-SHA256 para assinar o payload
  // Por enquanto, retornamos true pois a validação requer configuração adicional
  // TODO: Implementar validação completa da assinatura
  return true
}
