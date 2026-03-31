import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getMercadoPagoConfig, consultarPagamento, mapearStatusMP } from '@/lib/mercadopago'

// Webhook do Mercado Pago
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('Webhook MP recebido:', JSON.stringify(body, null, 2))

    // Verificar tipo de notificação
    const { type, data, action } = body

    // Mercado Pago pode enviar diferentes tipos de notificação
    // payment: notificação de pagamento
    // merchant_order: notificação de preferência/ordem
    if (type !== 'payment' && type !== 'merchant_order') {
      return NextResponse.json({ received: true, message: 'Tipo de notificação ignorado' })
    }

    const config = await getMercadoPagoConfig()
    if (!config) {
      console.error('Configuração MP não encontrada')
      return NextResponse.json({ error: 'Config not found' }, { status: 500 })
    }

    // Se for notificação de pagamento
    if (type === 'payment' && data?.id) {
      const paymentId = String(data.id)
      
      // Consultar detalhes do pagamento
      const paymentInfo = await consultarPagamento(config, paymentId)
      
      if (!paymentInfo) {
        console.error('Não foi possível consultar o pagamento:', paymentId)
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
      }

      const { status, externalReference } = paymentInfo
      
      // Se tem external_reference (ID da OS)
      if (externalReference) {
        const statusMapeado = mapearStatusMP(status)
        
        // Atualizar OS
        const osAtualizada = await db.ordemServico.update({
          where: { id: externalReference },
          data: {
            mpStatus: status,
            mpPaymentId: paymentId,
            // Se aprovado, marca como pago
            ...(statusMapeado === 'aprovado' && {
              pago: true,
              dataPagamento: new Date(),
              formaPagamento: 'pix'
            })
          }
        })

        // Se aprovado, criar histórico
        if (statusMapeado === 'aprovado') {
          await db.historicoOS.create({
            data: {
              osId: externalReference,
              descricao: `Pagamento aprovado via Mercado Pago (ID: ${paymentId})`,
              status: osAtualizada.status
            }
          })
        }

        console.log(`OS ${externalReference} atualizada - Status MP: ${status}`)
      }
    }

    // Se for notificação de merchant_order (preferência)
    if (type === 'merchant_order' && data?.id) {
      // Buscar a preferência para verificar pagamentos associados
      const merchantOrderId = String(data.id)
      
      try {
        const response = await fetch(`https://api.mercadopago.com/merchant_orders/${merchantOrderId}`, {
          headers: {
            'Authorization': `Bearer ${config.accessToken}`
          }
        })

        if (response.ok) {
          const merchantOrder = await response.json()
          
          // Verificar se tem external_reference
          if (merchantOrder.external_reference) {
            const osId = merchantOrder.external_reference
            
            // Verificar pagamentos associados
            if (merchantOrder.payments && merchantOrder.payments.length > 0) {
              const lastPayment = merchantOrder.payments[merchantOrder.payments.length - 1]
              const statusMapeado = mapearStatusMP(lastPayment.status)
              
              await db.ordemServico.update({
                where: { id: osId },
                data: {
                  mpStatus: lastPayment.status,
                  mpPaymentId: String(lastPayment.id),
                  ...(statusMapeado === 'aprovado' && {
                    pago: true,
                    dataPagamento: new Date()
                  })
                }
              })

              if (statusMapeado === 'aprovado') {
                await db.historicoOS.create({
                  data: {
                    osId,
                    descricao: `Pagamento aprovado via Mercado Pago (ID: ${lastPayment.id})`,
                    status: 'pago'
                  }
                })
              }
            }
          }
        }
      } catch (error) {
        console.error('Erro ao processar merchant_order:', error)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Erro no webhook MP:', error)
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    )
  }
}

// Verificação do webhook (alguns serviços fazem GET)
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Mercado Pago Webhook endpoint' 
  })
}
