/**
 * Integração com Mercado Pago
 * API Docs: https://www.mercadopago.com.br/developers/pt/docs
 */

import { db } from './db'

// URLs base do Mercado Pago
const MP_URLS = {
  sandbox: 'https://api.mercadopago.com',
  producao: 'https://api.mercadopago.com'
}

// Interface para configurações de pagamento
interface ConfigPagamento {
  mpAccessToken: string | null
  mpPublicKey: string | null
  mpAmbiente: string
}

// Interface para resposta da Preference
interface MPPreference {
  id: string
  init_point: string
  sandbox_init_point: string
  external_reference: string
  items: MPItem[]
  payer?: MPPayer
  payment_methods: {
    excluded_payment_methods: { id: string }[]
    excluded_payment_types: { id: string }[]
    installments: number
  }
  back_urls: {
    success: string
    failure: string
    pending: string
  }
  auto_return: string
  notification_url: string
  date_created: string
  expires: boolean
  expiration_date_from?: string
  expiration_date_to?: string
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
  name?: string
  email?: string
  phone?: {
    area_code: string
    number: string
  }
}

// Interface para resposta do Payment
interface MPPayment {
  id: number
  status: string
  status_detail: string
  payment_type_id: string
  payment_method_id: string
  transaction_amount: number
  external_reference?: string
  date_created: string
  date_approved?: string
  point_of_interaction?: {
    transaction_data: {
      qr_code: string
      qr_code_base64: string
      ticket_url: string
    }
  }
}

// Buscar configurações de pagamento do Super Admin
async function getConfiguracao(): Promise<ConfigPagamento | null> {
  const config = await db.configuracaoPagamento.findFirst()
  if (!config) return null

  return {
    mpAccessToken: config.mpAccessToken,
    mpPublicKey: config.mpPublicKey,
    mpAmbiente: config.mpAmbiente || 'sandbox'
  }
}

/**
 * Buscar token do Mercado Pago da LOJA (OAuth)
 * Retorna null se a loja não estiver conectada
 */
export async function getLojaMpToken(lojaId: string): Promise<{
  accessToken: string | null
  publicKey: string | null
  conectado: boolean
}> {
  const loja = await db.loja.findUnique({
    where: { id: lojaId },
    select: {
      mpAccessToken: true,
      mpPublicKey: true,
      mpConectado: true,
      mpTokenExpiresAt: true,
      mpRefreshToken: true
    }
  })

  if (!loja || !loja.mpConectado || !loja.mpAccessToken) {
    return { accessToken: null, publicKey: null, conectado: false }
  }

  // Verificar se o token expirou
  if (loja.mpTokenExpiresAt && new Date() > loja.mpTokenExpiresAt) {
    console.warn('[MercadoPago] Token da loja expirado:', lojaId)
    // TODO: Implementar renovação do token com refresh_token
    return { accessToken: null, publicKey: null, conectado: false }
  }

  return {
    accessToken: loja.mpAccessToken,
    publicKey: loja.mpPublicKey,
    conectado: true
  }
}

/**
 * Verificar qual token usar baseado no contexto
 * - Para OS/pagamentos da loja: usar token da LOJA (OAuth)
 * - Para mensalidades/faturas: usar token do SUPER ADMIN
 */
export async function getTokenContexto(lojaId?: string, contexto: 'os' | 'mensalidade' = 'os'): Promise<{
  accessToken: string | null
  publicKey: string | null
  origem: 'loja' | 'superadmin' | null
}> {
  // Mensalidades sempre usam token do Super Admin
  if (contexto === 'mensalidade') {
    const config = await getConfiguracao()
    return {
      accessToken: config?.mpAccessToken || null,
      publicKey: config?.mpPublicKey || null,
      origem: config?.mpAccessToken ? 'superadmin' : null
    }
  }

  // Para OS, tentar usar token da loja primeiro
  if (lojaId) {
    const lojaToken = await getLojaMpToken(lojaId)
    if (lojaToken.conectado && lojaToken.accessToken) {
      return {
        accessToken: lojaToken.accessToken,
        publicKey: lojaToken.publicKey,
        origem: 'loja'
      }
    }
  }

  // Fallback: usar token do Super Admin (compatibilidade)
  const config = await getConfiguracao()
  return {
    accessToken: config?.mpAccessToken || null,
    publicKey: config?.mpPublicKey || null,
    origem: config?.mpAccessToken ? 'superadmin' : null
  }
}

// Obter URL base conforme ambiente
function getBaseUrl(): string {
  // Mercado Pago usa a mesma URL para sandbox e produção
  // A diferenciação é feita pelo Access Token
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
    
    const baseUrl = getBaseUrl()
    const url = `${baseUrl}${endpoint}`
    
    console.log('[MercadoPago] Fazendo requisição:', {
      url,
      method,
      temToken: !!token,
      tokenPreview: token ? `${token.substring(0, 10)}...` : null
    })
    
    // Headers obrigatórios
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
    
    // X-Idempotency-Key é OBRIGATÓRIO para POST/PUT
    // Deve ser único para cada requisição
    if (method === 'POST' || method === 'PUT') {
      headers['X-Idempotency-Key'] = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    }
    
    const options: RequestInit = {
      method,
      headers
    }
    
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body)
    }
    
    const response = await fetch(url, options)
    
    // Capturar texto bruto primeiro
    const responseText = await response.text()
    console.log('[MercadoPago] Resposta bruta:', {
      status: response.status,
      statusText: response.statusText,
      bodyPreview: responseText.substring(0, 500)
    })
    
    // Tentar fazer parse do JSON
    let data
    try {
      data = JSON.parse(responseText)
    } catch {
      const errorMsg = responseText 
        ? `Resposta não-JSON do Mercado Pago (HTTP ${response.status}): ${responseText.substring(0, 200)}`
        : `Resposta vazia do Mercado Pago (HTTP ${response.status})`
      return { 
        error: errorMsg,
        status: response.status
      }
    }
    
    if (!response.ok) {
      console.error('[MercadoPago] Erro na resposta:', {
        status: response.status,
        data: JSON.stringify(data)
      })
      
      const errorMsg = data.message || data.error || 
        (data.causes && data.causes.map((c: { description: string }) => c.description).join(', ')) ||
        `Erro HTTP ${response.status}`
      
      return { 
        error: errorMsg,
        status: response.status
      }
    }
    
    return { data, status: response.status }
  } catch (error) {
    console.error('[MercadoPago] Erro na requisição:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { error: `Erro de conexão: ${errorMessage}`, status: 500 }
  }
}

// ==================== FUNÇÕES PÚBLICAS ====================

/**
 * Criar uma preferência de pagamento (link com PIX, cartão, boleto)
 * IMPORTANTE: Para boleto funcionar com código de barras, passe dados do payer com CPF/CNPJ
 */
export async function criarPreferencia(
  titulo: string,
  valor: number,
  referenciaExterna: string,
  opcoes?: {
    descricao?: string
    quantidade?: number
    backUrls?: {
      success: string
      failure: string
      pending: string
    }
    notificationUrl?: string
    expiraEm?: number // minutos
    payer?: {
      nome?: string
      email?: string
      telefone?: string
      cpfCnpj?: string
      endereco?: string
    }
  }
): Promise<{
  success: boolean
  preferenceId?: string
  linkPagamento?: string
  linkSandbox?: string
  error?: string
}> {
  const config = await getConfiguracao()
  const ambiente = config?.mpAmbiente || 'sandbox'
  const isProducao = ambiente === 'producao'
  
  // Montar items
  const items: MPItem[] = [{
    id: referenciaExterna,
    title: titulo,
    description: opcoes?.descricao,
    quantity: opcoes?.quantidade || 1,
    unit_price: valor,
    currency_id: 'BRL'
  }]
  
  // Montar payer com dados do cliente (IMPORTANTE para boleto)
  // SEMPRE enviar payer, mesmo que com dados genéricos
  const payerData: Record<string, unknown> = {}
  
  if (opcoes?.payer) {
    const p = opcoes.payer
    
    if (p.nome) {
      const nomes = p.nome.split(' ')
      payerData.name = nomes[0] || 'Cliente'
      payerData.surname = nomes.slice(1).join(' ') || ''
    } else {
      payerData.name = 'Cliente'
      payerData.surname = ''
    }
    
    if (p.email) {
      payerData.email = p.email
    } else {
      payerData.email = 'cliente@osfy.com.br'
    }
    
    if (p.telefone) {
      // Tentar extrair DDD e número
      const telefone = p.telefone.replace(/\D/g, '')
      if (telefone.length >= 10) {
        payerData.phone = {
          area_code: telefone.substring(0, 2),
          number: telefone.substring(2)
        }
      }
    }
    
    // CPF/CNPJ é essencial para boleto
    if (p.cpfCnpj) {
      const doc = p.cpfCnpj.replace(/\D/g, '')
      if (doc.length >= 11) {
        payerData.identification = {
          type: doc.length === 11 ? 'CPF' : 'CNPJ',
          number: doc
        }
      }
    }
    
    // Endereço (string única)
    if (p.endereco) {
      payerData.address = {
        zip_code: '00000000', // CEP genérico se não informado
        street_name: p.endereco,
        street_number: 'S/N'
      }
    }
  } else {
    // Payer genérico quando não informado
    payerData.name = 'Cliente'
    payerData.surname = 'OSFY'
    payerData.email = 'cliente@osfy.com.br'
  }
  
  // Montar body
  const body: Record<string, unknown> = {
    items,
    external_reference: referenciaExterna,
    back_urls: opcoes?.backUrls || {
      success: 'https://tec-os.vercel.app/pagamento/sucesso',
      failure: 'https://tec-os.vercel.app/pagamento/erro',
      pending: 'https://tec-os.vercel.app/pagamento/pendente'
    },
    auto_return: 'approved',
    // IMPORTANTE: binary_mode = false permite PIX e Boleto (pagamentos pendentes)
    binary_mode: false,
    // Aceita PIX, Cartao, Boleto - NÃO excluir nenhum método
    payment_methods: {
      installments: 12, // Maximo de parcelas
      // NÃO usar excluded_payment_methods ou excluded_payment_types
    }
  }
  
  // SEMPRE adicionar payer
  body.payer = payerData
  console.log('[MercadoPago] Payer configurado:', JSON.stringify(payerData))
  
  // URL de notificacao (webhook)
  if (opcoes?.notificationUrl) {
    body.notification_url = opcoes.notificationUrl
  }
  
  // Expiracao (padrao: 30 dias)
  const expiraMinutos = opcoes?.expiraEm || (30 * 24 * 60) // 30 dias
  if (expiraMinutos > 0) {
    body.expires = true
    const agora = new Date()
    const expiracao = new Date(agora.getTime() + expiraMinutos * 60 * 1000)
    body.expiration_date_from = agora.toISOString()
    body.expiration_date_to = expiracao.toISOString()
  }
  
  console.log('[MercadoPago] Criando preferencia:', { titulo, valor, referenciaExterna, ambiente, isProducao })
  
  const result = await mpRequest('/checkout/preferences', 'POST', body)
  
  if (result.error) {
    return { success: false, error: result.error }
  }
  
  const preference = result.data as MPPreference
  
  // IMPORTANTE: Usar o link correto baseado no ambiente
  // - Access Token TEST-xxx = usar sandbox_init_point
  // - Access Token APP_USR-xxx = usar init_point
  let linkPagamento: string | undefined
  
  if (isProducao) {
    // Producao: usar init_point
    linkPagamento = preference.init_point
    console.log('[MercadoPago] Ambiente PRODUCAO - usando init_point')
  } else {
    // Sandbox: usar sandbox_init_point
    linkPagamento = preference.sandbox_init_point
    console.log('[MercadoPago] Ambiente SANDBOX - usando sandbox_init_point')
  }
  
  console.log('[MercadoPago] Preferencia criada:', {
    id: preference.id,
    init_point: preference.init_point ? 'OK' : 'N/A',
    sandbox_init_point: preference.sandbox_init_point ? 'OK' : 'N/A',
    linkFinal: linkPagamento ? 'OK' : 'ERRO - SEM LINK',
    ambiente
  })
  
  if (!linkPagamento) {
    // Fallback: tentar qualquer link disponivel
    linkPagamento = preference.init_point || preference.sandbox_init_point
  }
  
  if (!linkPagamento) {
    return { 
      success: false, 
      error: 'Mercado Pago nao retornou link de pagamento. Verifique se o Access Token esta correto e corresponde ao ambiente (TEST para sandbox, APP_USR para producao).' 
    }
  }
  
  return {
    success: true,
    preferenceId: preference.id,
    linkPagamento,
    linkSandbox: preference.sandbox_init_point
  }
}

/**
 * Criar pagamento PIX diretamente (QR Code imediato)
 * Payer é OBRIGATÓRIO - pode ser dados genéricos para PIX neutro
 */
export async function criarPagamentoPix(
  valor: number,
  descricao: string,
  referenciaExterna: string,
  payerInfo?: {
    email?: string
    firstName?: string
    lastName?: string
    identificationType?: string
    identificationNumber?: string
  }
): Promise<{
  success: boolean
  paymentId?: number
  qrCode?: string
  qrCodeBase64?: string
  ticketUrl?: string
  error?: string
}> {
  // Payer é OBRIGATÓRIO para PIX
  // Se não informado, usa dados genéricos
  const payer = payerInfo?.email ? {
    email: payerInfo.email,
    first_name: payerInfo.firstName || 'Cliente',
    last_name: payerInfo.lastName || '',
    identification: payerInfo.identificationNumber ? {
      type: payerInfo.identificationType || 'CPF',
      number: payerInfo.identificationNumber
    } : undefined
  } : {
    // PIX neutro - dados genéricos obrigatórios
    email: 'cliente@osfy.com.br',
    first_name: 'Cliente',
    last_name: 'OSFY'
  }
  
  const body = {
    transaction_amount: valor,
    description: descricao,
    payment_method_id: 'pix',
    external_reference: referenciaExterna,
    payer: payer,
    // Opcional: data de expiracao (30 minutos)
    date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString()
  }
  
  console.log('[MercadoPago] Criando PIX:', { 
    valor, 
    descricao, 
    referenciaExterna,
    payer: JSON.stringify(payer),
    body: JSON.stringify(body, null, 2)
  })
  
  const result = await mpRequest('/v1/payments', 'POST', body)
  
  console.log('[MercadoPago] Resposta completa:', JSON.stringify(result, null, 2))
  
  if (result.error) {
    console.error('[MercadoPago] Erro ao criar PIX:', result.error)
    return { success: false, error: result.error }
  }
  
  const payment = result.data as MPPayment
  
  console.log('[MercadoPago] Payment criado:', {
    id: payment.id,
    status: payment.status,
    status_detail: payment.status_detail,
    tem_point_of_interaction: !!payment.point_of_interaction,
    tem_transaction_data: !!payment.point_of_interaction?.transaction_data
  })
  
  // Verificar se gerou o QR Code
  const transactionData = payment.point_of_interaction?.transaction_data
  
  if (!transactionData) {
    console.error('[MercadoPago] QR Code não gerado. Payment:', JSON.stringify(payment, null, 2))
    return { 
      success: false, 
      error: `QR Code PIX não gerado. Status: ${payment.status} - ${payment.status_detail}. Verifique se o PIX está habilitado na sua conta Mercado Pago.` 
    }
  }
  
  console.log('[MercadoPago] PIX criado com sucesso:', {
    paymentId: payment.id,
    temQrCode: !!transactionData.qr_code,
    temQrCodeBase64: !!transactionData.qr_code_base64,
    temTicketUrl: !!transactionData.ticket_url
  })
  
  return {
    success: true,
    paymentId: payment.id,
    qrCode: transactionData.qr_code,
    qrCodeBase64: transactionData.qr_code_base64,
    ticketUrl: transactionData.ticket_url
  }
}

/**
 * Criar pagamento BOLETO diretamente (código de barras imediato)
 * Payer com CPF/CNPJ e ENDEREÇO COMPLETO são OBRIGATÓRIOS
 */
export async function criarPagamentoBoleto(
  valor: number,
  descricao: string,
  referenciaExterna: string,
  payerInfo: {
    email?: string
    firstName?: string
    lastName?: string
    cpfCnpj: string // OBRIGATÓRIO
    // Endereço completo - TODOS obrigatórios para boleto registrado
    endereco: {
      logradouro: string // Nome da rua/avenida
      numero: string // Número
      bairro: string // Bairro
      cep: string // CEP (apenas números)
      cidade: string // Cidade
      estado: string // UF (2 letras)
      complemento?: string // Complemento (opcional)
    }
  }
): Promise<{
  success: boolean
  paymentId?: number
  codigoBarras?: string
  linhaDigitavel?: string
  linkBoleto?: string
  dataVencimento?: string
  error?: string
}> {
  // Validação: valor mínimo para boleto é R$ 5,00
  if (valor < 5) {
    return { 
      success: false, 
      error: 'Valor mínimo para boleto é R$ 5,00' 
    }
  }
  
  // Payer é OBRIGATÓRIO para boleto
  if (!payerInfo.cpfCnpj) {
    return { 
      success: false, 
      error: 'CPF/CNPJ é obrigatório para gerar boleto' 
    }
  }
  
  // Limpar CPF/CNPJ (apenas números)
  const documento = payerInfo.cpfCnpj.replace(/\D/g, '')
  
  if (documento.length !== 11 && documento.length !== 14) {
    return { 
      success: false, 
      error: 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos' 
    }
  }
  
  // Validar endereço completo
  const { endereco } = payerInfo
  const cepLimpo = endereco.cep.replace(/\D/g, '')
  
  if (!endereco.logradouro || endereco.logradouro.trim() === '') {
    return { success: false, error: 'Logradouro (rua/avenida) é obrigatório para boleto' }
  }
  if (!endereco.numero || endereco.numero.trim() === '') {
    return { success: false, error: 'Número do endereço é obrigatório para boleto' }
  }
  if (!endereco.bairro || endereco.bairro.trim() === '') {
    return { success: false, error: 'Bairro é obrigatório para boleto' }
  }
  if (cepLimpo.length !== 8) {
    return { success: false, error: 'CEP deve ter 8 dígitos para boleto' }
  }
  if (!endereco.cidade || endereco.cidade.trim() === '') {
    return { success: false, error: 'Cidade é obrigatória para boleto' }
  }
  if (!endereco.estado || endereco.estado.length !== 2) {
    return { success: false, error: 'Estado (UF) deve ter 2 letras para boleto' }
  }
  
  const body = {
    transaction_amount: valor,
    description: descricao,
    payment_method_id: 'bolbradesco',
    external_reference: referenciaExterna,
    payer: {
      email: payerInfo.email || 'cliente@osfy.com.br',
      first_name: payerInfo.firstName || 'Cliente',
      last_name: payerInfo.lastName || '',
      identification: {
        type: documento.length === 11 ? 'CPF' : 'CNPJ',
        number: documento
      },
      // Endereço completo - OBRIGATÓRIO para boleto registrado
      address: {
        zip_code: cepLimpo,
        street_name: endereco.logradouro,
        street_number: endereco.numero,
        neighborhood: endereco.bairro,
        city: endereco.cidade,
        federal_unit: endereco.estado.toUpperCase()
      }
    },
    // Vencimento em 3 dias
    date_of_expiration: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  }
  
  console.log('[MercadoPago] Criando BOLETO:', { 
    valor, 
    descricao, 
    referenciaExterna,
    documento: documento.substring(0, 3) + '***',
    endereco: {
      ...endereco,
      cep: cepLimpo
    }
  })
  
  const result = await mpRequest('/v1/payments', 'POST', body)
  
  if (result.error) {
    console.error('[MercadoPago] Erro ao criar BOLETO:', result.error)
    return { success: false, error: result.error }
  }
  
  const payment = result.data as Record<string, unknown>
  
  // Log completo da resposta para debug
  console.log('[MercadoPago] BOLETO resposta COMPLETA:', JSON.stringify(payment, null, 2))
  
  // Extrair dados do boleto
  // O Mercado Pago retorna barcode na raiz do objeto ou em transaction_details
  const barcode = payment?.barcode as Record<string, unknown> || {}
  const transactionDetails = payment?.transaction_details as Record<string, unknown> || {}
  
  // O código de barras pode vir em barcode.content ou transaction_details.barcode.content
  const codigoBarras = (barcode?.content as string) || 
                       ((transactionDetails?.barcode as Record<string, unknown>)?.content as string)
  
  // A linha digitável pode vir em digitable_line ou digitable_line_mask
  const linhaDigitavel = (transactionDetails?.digitable_line as string) ||
                         (payment?.digitable_line as string)
  
  // O link do boleto
  const linkBoleto = transactionDetails?.external_resource_url as string
  
  console.log('[MercadoPago] BOLETO dados extraídos:', {
    paymentId: payment?.id,
    status: payment?.status,
    codigoBarras,
    linhaDigitavel,
    linkBoleto
  })
  
  return {
    success: true,
    paymentId: payment?.id as number,
    codigoBarras,
    linhaDigitavel,
    linkBoleto,
    dataVencimento: payment?.date_of_expiration as string
  }
}

/**
 * Criar pagamento com CARTÃO DE CRÉDITO
 * Token e Device ID são obrigatórios (gerados no frontend via SDK)
 */
export async function criarPagamentoCartao(
  valor: number,
  descricao: string,
  referenciaExterna: string,
  token: string,
  deviceId?: string, // Opcional - pode não ser capturado em alguns casos
  parcelas: number = 1,
  paymentMethodId?: string, // visa, master, amex, etc (opcional - MP detecta pelo token)
  payerInfo?: {
    email?: string
    firstName?: string
    lastName?: string
    identificationType?: string
    identificationNumber?: string
  }
): Promise<{
  success: boolean
  paymentId?: number
  status?: string
  statusDetail?: string
  error?: string
}> {
  // Montar body
  const body: Record<string, unknown> = {
    transaction_amount: valor,
    description: descricao,
    token, // Token do cartão (gerado pelo SDK)
    installments: parcelas,
    external_reference: referenciaExterna,
    payer: {
      email: payerInfo?.email || 'cliente@osfy.com.br',
      first_name: payerInfo?.firstName || 'Cliente',
      last_name: payerInfo?.lastName || '',
    }
  }
  
  // Se tiver payment_method_id (visa, master, etc), usar
  if (paymentMethodId) {
    body.payment_method_id = paymentMethodId
  }
  // Se não, deixar o MP detectar automaticamente pelo token
  
  // Device ID - só enviar se tiver valor
  if (deviceId && deviceId.trim() !== '') {
    body.device_id = deviceId
    console.log('[MercadoPago] Device ID:', deviceId)
  } else {
    console.warn('[MercadoPago] Device ID não capturado - prosseguindo sem ele')
  }
  
  // Adicionar CPF/CNPJ se informado
  if (payerInfo?.identificationNumber) {
    const doc = payerInfo.identificationNumber.replace(/\D/g, '')
    body.payer = {
      ...body.payer as object,
      identification: {
        type: payerInfo.identificationType || (doc.length === 11 ? 'CPF' : 'CNPJ'),
        number: doc
      }
    }
  }
  
  console.log('[MercadoPago] Criando CARTÃO:', { 
    valor, 
    descricao, 
    referenciaExterna,
    parcelas,
    paymentMethodId,
    temDeviceId: !!(deviceId && deviceId.trim())
  })
  
  const result = await mpRequest('/v1/payments', 'POST', body)
  
  if (result.error) {
    console.error('[MercadoPago] Erro ao criar CARTÃO:', result.error)
    return { success: false, error: result.error }
  }
  
  const payment = result.data as Record<string, unknown>
  
  console.log('[MercadoPago] CARTÃO criado:', {
    id: payment?.id,
    status: payment?.status,
    status_detail: payment?.status_detail
  })
  
  return {
    success: true,
    paymentId: payment?.id as number,
    status: payment?.status as string,
    statusDetail: payment?.status_detail as string
  }
}

/**
 * Buscar status de um pagamento
 */
export async function buscarPagamento(
  paymentId: number
): Promise<{
  success: boolean
  status?: string
  statusDetail?: string
  valor?: number
  dataAprovacao?: string
  formaPagamento?: string
  error?: string
}> {
  const result = await mpRequest(`/v1/payments/${paymentId}`)
  
  if (result.error) {
    return { success: false, error: result.error }
  }
  
  const payment = result.data as MPPayment
  
  return {
    success: true,
    status: payment.status,
    statusDetail: payment.status_detail,
    valor: payment.transaction_amount,
    dataAprovacao: payment.date_approved,
    formaPagamento: payment.payment_type_id
  }
}

/**
 * Buscar pagamento por referência externa
 */
export async function buscarPagamentoPorReferencia(
  referenciaExterna: string
): Promise<{
  success: boolean
  payments?: MPPayment[]
  error?: string
}> {
  const result = await mpRequest(
    `/v1/payments/search?external_reference=${encodeURIComponent(referenciaExterna)}`
  )
  
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
 * Buscar preferência por ID
 */
export async function buscarPreferencia(
  preferenceId: string
): Promise<{
  success: boolean
  preference?: MPPreference
  error?: string
}> {
  const result = await mpRequest(`/checkout/preferences/${preferenceId}`)
  
  if (result.error) {
    return { success: false, error: result.error }
  }
  
  return {
    success: true,
    preference: result.data as MPPreference
  }
}

/**
 * Cancelar pagamento
 */
export async function cancelarPagamento(
  paymentId: number
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
): Promise<{ success: boolean; error?: string; userId?: string }> {
  // Usar endpoint de busca simples para testar o token
  const result = await mpRequest('/users/me', 'GET', undefined, accessToken)
  
  if (result.error) {
    return { success: false, error: result.error }
  }
  
  const data = result.data as { id?: number }
  
  return { 
    success: true,
    userId: data.id?.toString()
  }
}

/**
 * Validar webhook do Mercado Pago
 */
export function validarWebhookMercadoPago(
  body: unknown,
  signature?: string
): { valid: boolean; type?: string; data?: unknown } {
  if (!body || typeof body !== 'object') {
    return { valid: false }
  }
  
  const webhookData = body as { type?: string; action?: string; data?: unknown }
  
  // Verificar se é uma notificação válida do Mercado Pago
  if (!webhookData.type) {
    return { valid: false }
  }
  
  // Tipos de notificação do Mercado Pago
  const tiposValidos = [
    'payment',
    'merchant_order',
    'preapproval',
    'stop_preapproval',
    'topic' // formato antigo
  ]
  
  const type = webhookData.type || webhookData.action
  
  return {
    valid: tiposValidos.includes(webhookData.type) || tiposValidos.includes(webhookData.action || ''),
    type,
    data: webhookData.data
  }
}

/**
 * Mapear status do Mercado Pago para status interno
 */
export function mapearStatusMercadoPago(statusMP: string): string {
  const mapeamento: Record<string, string> = {
    'pending': 'pendente',
    'approved': 'pago',
    'authorized': 'pago',
    'in_process': 'em_analise',
    'in_mediation': 'em_disputa',
    'rejected': 'rejeitado',
    'cancelled': 'cancelado',
    'refunded': 'devolvido',
    'charged_back': 'chargeback'
  }
  
  return mapeamento[statusMP] || 'pendente'
}

/**
 * Traduzir forma de pagamento do Mercado Pago
 */
export function traduzirFormaPagamento(paymentTypeId: string): string {
  const traducao: Record<string, string> = {
    'account_money': 'Saldo Mercado Pago',
    'ticket': 'Boleto',
    'bank_transfer': 'Transferência',
    'atm': 'Caixa Eletrônico',
    'credit_card': 'Cartão de Crédito',
    'debit_card': 'Cartão de Débito',
    'prepaid_card': 'Cartão Pré-pago',
    'pix': 'PIX',
    'digital_wallet': 'Carteira Digital'
  }
  
  return traducao[paymentTypeId] || paymentTypeId
}
