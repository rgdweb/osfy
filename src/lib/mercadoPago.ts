import { db } from './db'

// URLs base do Mercado Pago
const MP_URLS = {
  sandbox: 'https://api.mercadopago.com',
  producao: 'https://api.mercadopago.com'
}

// Interfaces para resposta do Mercado Pago
interface MPCustomer {
  id: string
  email: string
  first_name: string
  last_name: string
  identification: {
    type: string
    number: string
  }
  date_created: string
}

interface MPPreference {
  id: string
  init_point: string
  sandbox_init_point: string
  external_reference: string
  items: MPItem[]
  payer: MPPayer
  back_urls: {
    success: string
    failure: string
    pending: string
  }
  notification_url: string
  date_created: string
}

interface MPPayment {
  id: number
  status: string
  status_detail: string
  payment_type: string
  payment_method_id: string
  transaction_amount: number
  external_reference: string
  date_created: string
  date_approved?: string
  payer: {
    email: string
    identification?: {
      type: string
      number: string
    }
  }
  point_of_interaction?: {
    transaction_data: {
      qr_code: string
      qr_code_base64: string
      ticket_url: string
    }
  }
}

interface MPItem {
  id: string
  title: string
  description?: string
  quantity: number
  unit_price: number
  currency_id: string
}

interface MPPayer {
  email: string
  name?: string
  surname?: string
  identification?: {
    type: string
    number: string
  }
  phone?: {
    area_code: string
    number: string
  }
}

// Interface para configurações de pagamento
interface ConfigPagamento {
  mpAccessToken: string | null
  mpPublicKey: string | null
  mpClientId: string | null
  mpClientSecret: string | null
  mpAmbiente: string
  mpWebhookSecret: string | null
}

// Buscar configurações de pagamento
async function getConfiguracao(): Promise<ConfigPagamento | null> {
  const config = await db.configuracaoPagamento.findFirst()
  if (!config) return null
  
  return {
    mpAccessToken: config.mpAccessToken,
    mpPublicKey: config.mpPublicKey,
    mpClientId: config.mpClientId,
    mpClientSecret: config.mpClientSecret,
    mpAmbiente: config.mpAmbiente || 'sandbox',
    mpWebhookSecret: config.mpWebhookSecret
  }
}

// Obter URL base (MP usa a mesma URL para sandbox e produção, muda só o token)
function getBaseUrl(): string {
  return MP_URLS.producao
}

// Fazer requisição para a API do Mercado Pago
async function mpRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown,
  accessToken?: string
): Promise<{ data?: unknown; error?: string; status: number }> {
  try {
    const config = accessToken ? null : await getConfiguracao()
    const token = accessToken || config?.mpAccessToken
    
    if (!token) {
      return { error: 'Access Token do Mercado Pago não configurado', status: 400 }
    }
    
    const url = `${getBaseUrl()}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
    
    const options: RequestInit = {
      method,
      headers
    }
    
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body)
    }
    
    console.log(`[MP] ${method} ${endpoint}`)
    
    const response = await fetch(url, options)
    const data = await response.json()
    
    if (!response.ok) {
      console.error('[MP] Erro na resposta:', data)
      return { 
        error: data.message || data.error || data.cause?.[0]?.description || 'Erro na API Mercado Pago',
        status: response.status
      }
    }
    
    return { data, status: response.status }
  } catch (error) {
    console.error('[MP] Erro na requisição:', error)
    return { error: 'Erro de conexão com Mercado Pago', status: 500 }
  }
}

// ==================== FUNÇÕES PÚBLICAS ====================

/**
 * Criar um cliente (Customer) no Mercado Pago
 */
export async function criarCustomer(
  nome: string,
  email: string,
  cpfCnpj: string,
  telefone?: string
): Promise<{ success: boolean; customerId?: string; error?: string }> {
  // Separar nome e sobrenome
  const nomes = nome.trim().split(' ')
  const firstName = nomes[0] || ''
  const lastName = nomes.slice(1).join(' ') || ''
  
  // Limpar CPF/CNPJ
  const cpfCnpjLimpo = cpfCnpj.replace(/\D/g, '')
  
  // Determinar tipo de documento
  const docType = cpfCnpjLimpo.length === 11 ? 'CPF' : cpfCnpjLimpo.length === 14 ? 'CNPJ' : 'CPF'
  
  // Limpar telefone
  const telefoneLimpo = telefone?.replace(/\D/g, '')
  const areaCode = telefoneLimpo?.slice(0, 2) || ''
  const phoneNumero = telefoneLimpo?.slice(2) || ''
  
  const body: Record<string, unknown> = {
    email,
    first_name: firstName,
    last_name: lastName,
    identification: {
      type: docType,
      number: cpfCnpjLimpo
    }
  }
  
  if (areaCode && phoneNumero) {
    body.phone = {
      area_code: areaCode,
      number: phoneNumero
    }
  }
  
  const result = await mpRequest('/customers', 'POST', body)
  
  if (result.error) {
    // Se já existe, buscar pelo email
    if (result.status === 400 || result.error.includes('already exists')) {
      const searchResult = await mpRequest(`/customers/search?email=${encodeURIComponent(email)}`)
      if (searchResult.data) {
        const customers = searchResult.data as { results?: MPCustomer[] }
        if (customers.results && customers.results.length > 0) {
          return { success: true, customerId: customers.results[0].id }
        }
      }
    }
    return { success: false, error: result.error }
  }
  
  const customer = result.data as MPCustomer
  return { success: true, customerId: customer.id }
}

/**
 * Buscar ou criar cliente no Mercado Pago
 */
export async function buscarOuCriarCustomer(
  nome: string,
  email: string,
  cpfCnpj: string,
  telefone?: string
): Promise<{ success: boolean; customerId?: string; error?: string }> {
  // Primeiro, buscar cliente existente pelo email
  const cpfCnpjLimpo = cpfCnpj.replace(/\D/g, '')
  
  const result = await mpRequest(`/customers/search?email=${encodeURIComponent(email)}`)
  
  if (result.data) {
    const customers = result.data as { results?: MPCustomer[] }
    if (customers.results && customers.results.length > 0) {
      return { success: true, customerId: customers.results[0].id }
    }
  }
  
  // Criar novo cliente
  return criarCustomer(nome, email, cpfCnpj, telefone)
}

/**
 * Criar uma preferência de pagamento (Link de pagamento)
 */
export async function criarPreferencia(
  dados: {
    titulo: string
    descricao?: string
    valor: number
    quantidade?: number
    externalReference: string
    payerEmail?: string
    payerName?: string
    payerCpf?: string
    payerPhone?: string
    notificationUrl?: string
    backUrls?: {
      success: string
      failure: string
      pending: string
    }
  }
): Promise<{ 
  success: boolean
  preferenceId?: string
  initPoint?: string
  sandboxInitPoint?: string
  qrCode?: string
  error?: string 
}> {
  const items: MPItem[] = [{
    id: dados.externalReference,
    title: dados.titulo,
    description: dados.descricao,
    quantity: dados.quantidade || 1,
    unit_price: dados.valor,
    currency_id: 'BRL'
  }]
  
  const preference: Record<string, unknown> = {
    items,
    external_reference: dados.externalReference,
    payment_methods: {
      installments: 1
    },
    expires: true,
    expiration_date_from: new Date().toISOString(),
    expiration_date_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias
  }
  
  // Adicionar payer se tiver dados
  if (dados.payerEmail) {
    const payer: MPPayer = {
      email: dados.payerEmail
    }
    
    if (dados.payerName) {
      const nomes = dados.payerName.trim().split(' ')
      payer.name = nomes[0]
      payer.surname = nomes.slice(1).join(' ')
    }
    
    if (dados.payerCpf) {
      const cpfLimpo = dados.payerCpf.replace(/\D/g, '')
      payer.identification = {
        type: cpfLimpo.length === 11 ? 'CPF' : 'CNPJ',
        number: cpfLimpo
      }
    }
    
    if (dados.payerPhone) {
      const telLimpo = dados.payerPhone.replace(/\D/g, '')
      payer.phone = {
        area_code: telLimpo.slice(0, 2),
        number: telLimpo.slice(2)
      }
    }
    
    preference.payer = payer
  }
  
  // Adicionar URLs de retorno
  if (dados.backUrls) {
    preference.back_urls = dados.backUrls
    preference.auto_return = 'approved'
  }
  
  // Adicionar URL de notificação
  if (dados.notificationUrl) {
    preference.notification_url = dados.notificationUrl
  }
  
  const result = await mpRequest('/checkout/preferences', 'POST', preference)
  
  if (result.error) {
    return { success: false, error: result.error }
  }
  
  const pref = result.data as MPPreference
  return {
    success: true,
    preferenceId: pref.id,
    initPoint: pref.init_point,
    sandboxInitPoint: pref.sandbox_init_point
  }
}

/**
 * Criar pagamento PIX direto
 */
export async function criarPagamentoPix(
  dados: {
    valor: number
    descricao: string
    externalReference: string
    payerEmail: string
    payerName?: string
    payerCpf?: string
  }
): Promise<{ 
  success: boolean
  paymentId?: number
  qrCode?: string
  qrCodeBase64?: string
  ticketUrl?: string
  error?: string 
}> {
  const payment: Record<string, unknown> = {
    transaction_amount: dados.valor,
    description: dados.descricao,
    payment_method_id: 'pix',
    external_reference: dados.externalReference,
    payer: {
      email: dados.payerEmail
    },
    date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
  }
  
  if (dados.payerName) {
    const nomes = dados.payerName.trim().split(' ')
    ;(payment.payer as Record<string, unknown>).first_name = nomes[0]
    ;(payment.payer as Record<string, unknown>).last_name = nomes.slice(1).join(' ')
  }
  
  if (dados.payerCpf) {
    const cpfLimpo = dados.payerCpf.replace(/\D/g, '')
    ;(payment.payer as Record<string, unknown>).identification = {
      type: cpfLimpo.length === 11 ? 'CPF' : 'CNPJ',
      number: cpfLimpo
    }
  }
  
  const result = await mpRequest('/v1/payments', 'POST', payment)
  
  if (result.error) {
    return { success: false, error: result.error }
  }
  
  const pay = result.data as MPPayment
  
  return {
    success: true,
    paymentId: pay.id,
    qrCode: pay.point_of_interaction?.transaction_data?.qr_code,
    qrCodeBase64: pay.point_of_interaction?.transaction_data?.qr_code_base64,
    ticketUrl: pay.point_of_interaction?.transaction_data?.ticket_url
  }
}

/**
 * Criar pagamento com Boleto
 */
export async function criarPagamentoBoleto(
  dados: {
    valor: number
    descricao: string
    externalReference: string
    payerEmail: string
    payerName?: string
    payerCpf?: string
    payerPhone?: string
    dataVencimento?: string // YYYY-MM-DD
  }
): Promise<{ 
  success: boolean
  paymentId?: number
  boletoUrl?: string
  boletoLinhaDigitavel?: string
  error?: string 
}> {
  const payment: Record<string, unknown> = {
    transaction_amount: dados.valor,
    description: dados.descricao,
    payment_method_id: 'bolbradesco',
    external_reference: dados.externalReference,
    payer: {
      email: dados.payerEmail
    },
    date_of_expiration: dados.dataVencimento || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  }
  
  if (dados.payerName) {
    const nomes = dados.payerName.trim().split(' ')
    ;(payment.payer as Record<string, unknown>).first_name = nomes[0]
    ;(payment.payer as Record<string, unknown>).last_name = nomes.slice(1).join(' ')
  }
  
  if (dados.payerCpf) {
    const cpfLimpo = dados.payerCpf.replace(/\D/g, '')
    ;(payment.payer as Record<string, unknown>).identification = {
      type: cpfLimpo.length === 11 ? 'CPF' : 'CNPJ',
      number: cpfLimpo
    }
  }
  
  if (dados.payerPhone) {
    const telLimpo = dados.payerPhone.replace(/\D/g, '')
    ;(payment.payer as Record<string, unknown>).phone = {
      area_code: telLimpo.slice(0, 2),
      number: telLimpo.slice(2)
    }
  }
  
  const result = await mpRequest('/v1/payments', 'POST', payment)
  
  if (result.error) {
    return { success: false, error: result.error }
  }
  
  const pay = result.data as MPPayment & { 
    transaction_details?: { 
      external_resource_url?: string
      verification_code?: string
    } 
  }
  
  return {
    success: true,
    paymentId: pay.id,
    boletoUrl: pay.transaction_details?.external_resource_url,
    boletoLinhaDigitavel: pay.transaction_details?.verification_code
  }
}

/**
 * Buscar status de um pagamento
 */
export async function buscarPagamento(
  paymentId: number | string
): Promise<{
  success: boolean
  status?: string
  statusDetail?: string
  paymentType?: string
  paymentMethodId?: string
  transactionAmount?: number
  externalReference?: string
  dateApproved?: string
  qrCode?: string
  qrCodeBase64?: string
  error?: string
}> {
  const result = await mpRequest(`/v1/payments/${paymentId}`)
  
  if (result.error) {
    return { success: false, error: result.error }
  }
  
  const pay = result.data as MPPayment
  
  return {
    success: true,
    status: pay.status,
    statusDetail: pay.status_detail,
    paymentType: pay.payment_type,
    paymentMethodId: pay.payment_method_id,
    transactionAmount: pay.transaction_amount,
    externalReference: pay.external_reference,
    dateApproved: pay.date_approved,
    qrCode: pay.point_of_interaction?.transaction_data?.qr_code,
    qrCodeBase64: pay.point_of_interaction?.transaction_data?.qr_code_base64
  }
}

/**
 * Buscar pagamento por referência externa (número da OS)
 */
export async function buscarPagamentoPorReferencia(
  externalReference: string
): Promise<{
  success: boolean
  payments?: MPPayment[]
  error?: string
}> {
  const result = await mpRequest(`/v1/payments/search?external_reference=${encodeURIComponent(externalReference)}`)
  
  if (result.error) {
    return { success: false, error: result.error }
  }
  
  const data = result.data as { results?: MPPayment[] }
  
  return {
    success: true,
    payments: data.results || []
  }
}

/**
 * Cancelar um pagamento
 */
export async function cancelarPagamento(
  paymentId: number | string
): Promise<{ success: boolean; error?: string }> {
  const result = await mpRequest(`/v1/payments/${paymentId}`, 'PUT', { status: 'cancelled' })
  
  if (result.error) {
    return { success: false, error: result.error }
  }
  
  return { success: true }
}

/**
 * Testar conexão com a API do Mercado Pago
 */
export async function testarConexao(
  accessToken?: string
): Promise<{ success: boolean; error?: string; info?: string }> {
  const token = accessToken
  
  if (!token) {
    return { success: false, error: 'Access Token não fornecido' }
  }
  
  // Testar fazendo uma busca simples
  const result = await mpRequest('/v1/payment_methods', 'GET', undefined, token)
  
  if (result.error) {
    return { success: false, error: result.error }
  }
  
  // Verificar se é produção ou sandbox pelo prefixo do token
  const isProduction = token.startsWith('APP_USR-')
  
  return { 
    success: true, 
    info: isProduction ? 'Ambiente de Produção' : 'Ambiente de Sandbox'
  }
}

/**
 * Validar webhook do Mercado Pago
 */
export async function validarWebhook(
  payload: unknown,
  signature?: string
): Promise<{ valid: boolean }> {
  // O Mercado Pago envia webhooks com estrutura específica
  try {
    const data = payload as { 
      type?: string
      action?: string
      data?: { id?: string }
      live_mode?: boolean
    }
    
    // Verificar se é um webhook válido do MP
    if (data.type && data.data?.id) {
      return { valid: true }
    }
    
    return { valid: false }
  } catch {
    return { valid: false }
  }
}

/**
 * Obter QR Code de um pagamento PIX existente
 */
export async function obterQrCodePix(
  paymentId: number | string
): Promise<{
  success: boolean
  qrCode?: string
  qrCodeBase64?: string
  error?: string
}> {
  const result = await mpRequest(`/v1/payments/${paymentId}`)
  
  if (result.error) {
    return { success: false, error: result.error }
  }
  
  const pay = result.data as MPPayment
  
  if (pay.point_of_interaction?.transaction_data) {
    return {
      success: true,
      qrCode: pay.point_of_interaction.transaction_data.qr_code,
      qrCodeBase64: pay.point_of_interaction.transaction_data.qr_code_base64
    }
  }
  
  return { success: false, error: 'QR Code não disponível para este pagamento' }
}

/**
 * Obter métodos de pagamento disponíveis
 */
export async function obterMetodosPagamento(): Promise<{
  success: boolean
  metodos?: Array<{
    id: string
    name: string
    payment_type_id: string
    thumbnail: string
  }>
  error?: string
}> {
  const result = await mpRequest('/v1/payment_methods')
  
  if (result.error) {
    return { success: false, error: result.error }
  }
  
  const metodos = result.data as Array<{
    id: string
    name: string
    payment_type_id: string
    thumbnail: string
  }>
  
  return { success: true, metodos }
}

// Mapeamento de status do Mercado Pago para status interno
export function mapearStatusMP(statusMP: string): string {
  const mapeamento: Record<string, string> = {
    'pending': 'pendente',
    'approved': 'paga',
    'authorized': 'autorizada',
    'in_process': 'em_analise',
    'in_mediation': 'em_medicao',
    'rejected': 'rejeitada',
    'cancelled': 'cancelada',
    'refunded': 'estornada',
    'charged_back': 'estornada'
  }
  
  return mapeamento[statusMP] || 'pendente'
}

// Traduzir status do MP para português
export function traduzirStatusMP(statusMP: string): string {
  const traducoes: Record<string, string> = {
    'pending': 'Pendente',
    'approved': 'Aprovado',
    'authorized': 'Autorizado',
    'in_process': 'Em análise',
    'in_mediation': 'Em mediação',
    'rejected': 'Rejeitado',
    'cancelled': 'Cancelado',
    'refunded': 'Estornado',
    'charged_back': 'Estornado'
  }
  
  return traducoes[statusMP] || statusMP
}
