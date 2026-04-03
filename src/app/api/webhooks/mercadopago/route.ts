import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buscarPagamento, traduzirFormaPagamento } from '@/lib/mercadopago'

/**
 * Webhook do Mercado Pago
 * 
 * O Mercado Pago envia notificações para eventos de pagamento
 * Formato: { type: "payment", data: { id: "123456789" } }
 * 
 * Processa:
 * - Pagamentos de OS (Ordem de Serviço)
 * - Pagamentos de Faturas (Mensalidades/Anuidades)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('[Webhook MercadoPago] Recebido:', JSON.stringify(body, null, 2))
    
    // Validar estrutura básica
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }
    
    const { type, action, data, live_mode } = body
    
    // Mercado Pago pode enviar 'type' ou 'action' dependendo da versão
    const eventType = type || action
    
    console.log('[Webhook MercadoPago] Tipo:', eventType, 'Data:', data, 'LiveMode:', live_mode)
    
    // Processar notificação de pagamento
    if (eventType === 'payment' || eventType === 'payment.created' || eventType === 'payment.updated') {
      const paymentId = data?.id
      
      if (!paymentId) {
        console.error('[Webhook MercadoPago] Payment ID não informado')
        return NextResponse.json({ received: true, warning: 'Payment ID não informado' })
      }
      
      // Verificar se é um teste do Mercado Pago
      // - live_mode: false indica teste
      // - IDs baixos (< 1000000) são de teste
      const isTest = live_mode === false || parseInt(paymentId) < 1000000
      
      if (isTest) {
        console.log('[Webhook MercadoPago] ⚠️ TESTE detectado - Payment ID:', paymentId, 'LiveMode:', live_mode)
        return NextResponse.json({ 
          received: true, 
          test: true, 
          message: 'Webhook de teste recebido com sucesso!',
          paymentId: paymentId
        })
      }
      
      // Buscar detalhes do pagamento na API do Mercado Pago
      let paymentResult
      try {
        paymentResult = await buscarPagamento(parseInt(paymentId))
      } catch (apiError) {
        console.error('[Webhook MercadoPago] Erro na API do MP:', apiError)
        return NextResponse.json({ received: true, warning: 'Erro ao consultar API do MP' })
      }
      
      if (!paymentResult.success) {
        console.error('[Webhook MercadoPago] Erro ao buscar pagamento:', paymentResult.error)
        // Retornar 200 mesmo com erro para evitar retries
        return NextResponse.json({ received: true, warning: 'Pagamento não encontrado ou erro na API' })
      }
      
      console.log('[Webhook MercadoPago] Pagamento:', {
        id: paymentId,
        status: paymentResult.status,
        valor: paymentResult.valor,
        forma: paymentResult.formaPagamento
      })
      
      // Se o pagamento foi aprovado, processar
      if (paymentResult.status === 'approved') {
        
        // 1. Tentar encontrar OS pelo paymentId
        const os = await db.ordemServico.findFirst({
          where: {
            OR: [
              { mpPaymentId: paymentId.toString() },
              { mpPreferenceId: paymentId.toString() }
            ]
          }
        })
        
        if (os) {
          console.log('[Webhook MercadoPago] OS encontrada:', os.id, 'Status atual:', os.pago)
          
          if (!os.pago) {
            // Atualizar OS para paga
            await db.ordemServico.update({
              where: { id: os.id },
              data: {
                pago: true,
                dataPagamento: new Date(),
                formaPagamento: traduzirFormaPagamento(paymentResult.formaPagamento || 'pix'),
                atualizadoEm: new Date()
              }
            })
            
            // Adicionar histórico
            await db.historicoOS.create({
              data: {
                osId: os.id,
                descricao: `Pagamento confirmado via ${traduzirFormaPagamento(paymentResult.formaPagamento || 'pix')} - Valor: R$ ${paymentResult.valor?.toFixed(2)}`,
                status: os.status
              }
            })
            
            console.log('[Webhook MercadoPago] OS marcada como paga:', os.id)
          }
        } else {
          // 2. Tentar encontrar Fatura pelo paymentId
          const fatura = await db.fatura.findFirst({
            where: {
              OR: [
                { mpPaymentId: paymentId.toString() },
                { mpPreferenceId: paymentId.toString() }
              ]
            },
            include: { loja: true }
          })
          
          if (fatura) {
            console.log('[Webhook MercadoPago] Fatura encontrada:', fatura.id, 'Status atual:', fatura.status)
            
            if (fatura.status !== 'paga') {
              // Determinar se é mensal ou anual pela referência
              const isAnual = fatura.referencia?.toLowerCase().includes('anual') || 
                              fatura.loja.plano === 'anual'
              
              // Calcular nova data de expiração
              const agora = new Date()
              const diasParaAdicionar = isAnual ? 365 : 30
              const novaExpiracao = new Date(agora.getTime() + diasParaAdicionar * 24 * 60 * 60 * 1000)
              
              console.log('[Webhook MercadoPago] Tipo plano:', isAnual ? 'ANUAL' : 'MENSAL', 'Nova expiração:', novaExpiracao)
              
              // Atualizar fatura para paga
              await db.fatura.update({
                where: { id: fatura.id },
                data: {
                  status: 'paga',
                  dataPagamento: new Date(),
                  formaPagamento: traduzirFormaPagamento(paymentResult.formaPagamento || 'pix')
                }
              })
              
              // Atualizar loja: desbloquear e definir nova expiração
              await db.loja.update({
                where: { id: fatura.lojaId },
                data: {
                  bloqueado: false,
                  motivoBloqueio: null,
                  expiraEm: novaExpiracao,
                  // Se era trial, marcar como usado
                  trialUsado: true,
                  // Atualizar plano se necessário
                  plano: isAnual ? 'anual' : 'mensal'
                }
              })
              
              console.log('[Webhook MercadoPago] Fatura marcada como paga:', fatura.id)
              console.log('[Webhook MercadoPago] Loja atualizada - Expira em:', novaExpiracao)
            }
          } else {
            console.log('[Webhook MercadoPago] Nem OS nem Fatura encontrada para paymentId:', paymentId)
          }
        }
      }
    }
    
    // Processar notificação de merchant_order (preferência)
    if (eventType === 'merchant_order') {
      const merchantOrderId = data?.id
      console.log('[Webhook MercadoPago] Merchant Order:', merchantOrderId)
      
      // Buscar preferência e verificar pagamentos associados
      // O merchant_order contém informações sobre a preferência e pagamentos
    }
    
    // Sempre retornar 200 para o Mercado Pago
    return NextResponse.json({ received: true })
    
  } catch (error) {
    console.error('[Webhook MercadoPago] Erro:', error)
    // Retornar 200 mesmo com erro para evitar retries infinitos
    return NextResponse.json({ received: true, error: 'Erro interno' })
  }
}

// GET para verificação do webhook
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // Mercado Pago pode enviar verificação
  const challenge = searchParams.get('hub.challenge')
  
  if (challenge) {
    console.log('[Webhook MercadoPago] Verificação:', challenge)
    return new NextResponse(challenge, { status: 200 })
  }
  
  return NextResponse.json({ 
    status: 'ok',
    message: 'Webhook Mercado Pago ativo'
  })
}
