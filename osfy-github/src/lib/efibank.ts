/**
 * Integração com Efí Bank (antiga Gerencianet)
 * API Docs: https://dev.efipay.com.br/docs/api-pix/credenciais/
 * 
 * Esta biblioteca permite que cada lojista receba pagamentos das OS
 * diretamente na sua conta Efí Bank usando o Token de Integração.
 */

import { db } from './db'

// URLs base do Efí Bank
// Documentação: https://dev.efipay.com.br/docs/api-pix/credenciais/
const EFI_URLS = {
  sandbox: 'https://sandbox.api.efipay.com.br',
  producao: 'https://api.efipay.com.br'
}

// Interface para configurações do lojista
interface ConfigEfi {
  tokenIntegracao: string
  pixChave: string
  pixTipo: string
  pixNome: string
}

/**
 * Buscar configurações do Efí Bank da loja
 */
export async function getLojaEfiConfig(lojaId: string): Promise<ConfigEfi | null> {
  const loja = await db.loja.findUnique({
    where: { id: lojaId },
    select: {
      usarPagamentoSistema: true,
      efiTokenIntegracao: true,
      pixChave: true,
      pixTipo: true,
      pixNome: true
    }
  })

  if (!loja || !loja.usarPagamentoSistema || !loja.efiTokenIntegracao || !loja.pixChave) {
    return null
  }

  return {
    tokenIntegracao: loja.efiTokenIntegracao,
    pixChave: loja.pixChave,
    pixTipo: loja.pixTipo || 'cpf',
    pixNome: loja.pixNome || ''
  }
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

    // Usar o Token de Integração diretamente como Bearer token
    const accessToken = config.tokenIntegracao

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
      solicitacaoPagador: descricao.substring(0, 140), // Limite de caracteres
      infoAdicionais: [
        {
          nome: 'Referencia',
          valor: referenciaExterna.substring(0, 50)
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
    
    if (!config) {
      return { success: false, error: 'Loja não configurou pagamento' }
    }

    const url = `${EFI_URLS.producao}/v2/cob/${txid}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.tokenIntegracao}`
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

    const url = `${EFI_URLS.producao}/v2/webhook/${config.pixChave}`

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.tokenIntegracao}`,
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
 * Testar conexão com o Efí Bank usando Token de Integração
 */
export async function testarConexaoEfi(
  tokenIntegracao: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Testar fazendo uma requisição para listar cobranças PIX
    // API: https://dev.efipay.com.br/docs/api-pix/cobrancas-imediatas#listar-cobranças
    const hoje = new Date().toISOString().split('T')[0]
    const response = await fetch(`${EFI_URLS.producao}/v2/cob?inicio=${hoje}T00:00:00Z&fim=${hoje}T23:59:59Z`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenIntegracao}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('[Efí Bank] Status da resposta:', response.status)

    if (response.ok || response.status === 404) {
      // 200 ou 404 (sem cobranças) indicam que o token é válido
      return { success: true }
    }

    const errorData = await response.json()
    console.error('[Efí Bank] Erro retornado:', errorData)
    
    return { 
      success: false, 
      error: errorData.mensagem || errorData.error_description || errorData.title || `Erro ${response.status}: Token inválido ou sem permissão PIX` 
    }
  } catch (error: unknown) {
    console.error('[Efí Bank] Erro ao testar conexão:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro de conexão com o Efí Bank' 
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
