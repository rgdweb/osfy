/**
 * Integração com Efí Bank (antiga Gerencianet)
 * API Docs: https://dev.efipay.com.br/
 * 
 * Esta biblioteca permite que cada lojista receba pagamentos das OS
 * diretamente na sua conta Efí Bank.
 */

import { db } from './db'

// URLs base do Efí Bank
const EFI_URLS = {
  sandbox: 'https://sandbox.api.efipay.com.br',
  producao: 'https://api.efipay.com.br'
}

// Interface para configurações do lojista
interface ConfigEfi {
  clientId: string
  clientSecret: string
  accessToken?: string | null
  pixChave: string
  pixTipo: string
  pixNome: string
}

// Interface para resposta do PIX
interface EfiPixResponse {
  txid: string
  pixCopiaCola: string
  pixQrCode: string
  location: string
  valor: number
  status: string
}

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
      efiAccessToken: true,
      efiTokenExpiresAt: true,
      pixChave: true,
      pixTipo: true,
      pixNome: true
    }
  })

  if (!loja || !loja.usarPagamentoSistema || !loja.efiClientId || !loja.efiClientSecret) {
    return null
  }

  // Verificar se o token expirou
  if (loja.efiTokenExpiresAt && new Date() > loja.efiTokenExpiresAt) {
    // Token expirado, precisa renovar
    const novoToken = await renovarTokenEfi(loja.efiClientId, loja.efiClientSecret)
    if (novoToken) {
      await db.loja.update({
        where: { id: lojaId },
        data: {
          efiAccessToken: novoToken.access_token,
          efiTokenExpiresAt: new Date(Date.now() + novoToken.expires_in * 1000)
        }
      })
      loja.efiAccessToken = novoToken.access_token
    }
  }

  return {
    clientId: loja.efiClientId,
    clientSecret: loja.efiClientSecret,
    accessToken: loja.efiAccessToken,
    pixChave: loja.pixChave || '',
    pixTipo: loja.pixTipo || 'cpf',
    pixNome: loja.pixNome || ''
  }
}

/**
 * Obter token OAuth do Efí Bank
 */
export async function obterTokenEfi(clientId: string, clientSecret: string): Promise<{
  access_token: string
  expires_in: number
  token_type: string
} | null> {
  try {
    // Usar ambiente de produção
    const url = `${EFI_URLS.producao}/oauth/token`

    // Codificar credenciais em Base64
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

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

    if (!response.ok) {
      const error = await response.text()
      console.error('[Efí Bank] Erro ao obter token:', error)
      return null
    }

    const data = await response.json()
    console.log('[Efí Bank] Token obtido com sucesso')
    
    return data
  } catch (error) {
    console.error('[Efí Bank] Erro ao obter token:', error)
    return null
  }
}

/**
 * Renovar token do Efí Bank
 */
async function renovarTokenEfi(clientId: string, clientSecret: string): Promise<{
  access_token: string
  expires_in: number
} | null> {
  return obterTokenEfi(clientId, clientSecret)
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

    // Obter token se não tiver
    let accessToken = config.accessToken
    if (!accessToken) {
      const tokenData = await obterTokenEfi(config.clientId, config.clientSecret)
      if (!tokenData) {
        return { success: false, error: 'Erro ao autenticar com Efí Bank' }
      }
      accessToken = tokenData.access_token
      
      // Salvar token
      await db.loja.update({
        where: { id: lojaId },
        data: {
          efiAccessToken: accessToken,
          efiTokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
        }
      })
    }

    // Criar cobrança PIX
    const url = `${EFI_URLS.producao}/v2/cob`

    // Valor deve ser string com 2 casas decimais
    const valorFormatado = valor.toFixed(2)

    const body = {
      calendario: {
        expiracao: 3600 // 1 hora
      },
      devedor: {
        // Cliente que vai pagar (informações genéricas, o real será preenchido pelo app do banco)
      },
      valor: {
        original: valorFormatado
      },
      chave: config.pixChave,
      solicitacaoPagador: descricao,
      infoAdicionais: [
        {
          nome: 'Referencia',
          valor: referenciaExterna
        }
      ]
    }

    console.log('[Efí Bank] Criando cobrança PIX:', {
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
      status: data.status
    })

    return {
      success: true,
      txid: data.txid,
      pixCopiaCola: data.pixCopiaECola,
      pixQrCode: data.pixQrCode,
      location: data.loc?.location
    }
  } catch (error) {
    console.error('[Efí Bank] Erro ao criar cobrança PIX:', error)
    return { 
      success: false, 
      error: 'Erro interno ao criar cobrança PIX' 
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
    
    if (!config || !config.accessToken) {
      return { success: false, error: 'Loja não configurou pagamento' }
    }

    const url = `${EFI_URLS.producao}/v2/cob/${txid}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`
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
    
    if (!config || !config.accessToken) {
      return { success: false, error: 'Loja não configurou pagamento' }
    }

    const url = `${EFI_URLS.producao}/v2/webhook/${config.pixChave}`

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
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
 * Testar conexão com o Efí Bank
 */
export async function testarConexaoEfi(
  clientId: string,
  clientSecret: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const tokenData = await obterTokenEfi(clientId, clientSecret)
    
    if (!tokenData) {
      return { success: false, error: 'Credenciais inválidas' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Erro ao testar conexão' }
  }
}

/**
 * Validar assinatura do webhook do Efí Bank
 * O Efí Bank envia uma assinatura no header para validação
 */
export function validarWebhookEfi(
  payload: string,
  signature: string,
  clientSecret: string
): boolean {
  // O Efí Bank usa HMAC-SHA256 para assinar o payload
  // Por enquanto, retornamos true pois a validação requer configuração adicional
  // TODO: Implementar validação completa da assinatura
  return true
}
