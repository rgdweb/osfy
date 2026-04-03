/**
 * Webhook do Efí Bank
 * Recebe notificações de pagamento PIX confirmado
 * 
 * URL: https://tec-os.vercel.app/api/webhooks/efi
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { consultarCobrancaPix } from '@/lib/efibank'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('[Webhook Efí] Notificação recebida:', JSON.stringify(body, null, 2))

    // O Efí Bank envia notificações no formato:
    // {
    //   "tipo": "pix",
    //   "txid": "...",
    //   "valor": "100.00",
    //   "horario": "2024-01-01T10:00:00Z"
    // }

    const { tipo, txid, valor, horario } = body

    // Verificar se é uma notificação de PIX
    if (tipo !== 'pix') {
      console.log('[Webhook Efí] Tipo ignorado:', tipo)
      return NextResponse.json({ success: true, message: 'Tipo não processado' })
    }

    // Buscar OS pelo txid
    const os = await db.ordemServico.findFirst({
      where: { efiTxId: txid }
    })

    if (!os) {
      console.log('[Webhook Efí] OS não encontrada para txid:', txid)
      return NextResponse.json({ success: true, message: 'OS não encontrada' })
    }

    // Verificar status atual do pagamento no Efí
    const statusResult = await consultarCobrancaPix(os.lojaId, txid)

    if (!statusResult.success) {
      console.error('[Webhook Efí] Erro ao consultar status:', statusResult.error)
      return NextResponse.json({ success: false, error: 'Erro ao consultar status' })
    }

    console.log('[Webhook Efí] Status do pagamento:', statusResult.status)

    // Se pagamento foi concluído
    if (statusResult.status === 'CONCLUIDA' && !os.pago) {
      // Atualizar OS como paga
      await db.ordemServico.update({
        where: { id: os.id },
        data: {
          pago: true,
          dataPagamento: new Date(),
          formaPagamento: 'pix_efi',
          atualizadoEm: new Date()
        }
      })

      // Adicionar histórico
      await db.historicoOS.create({
        data: {
          osId: os.id,
          descricao: `Pagamento PIX confirmado via Efí Bank - R$ ${valor || statusResult.valor}`,
          status: os.status
        }
      })

      console.log('[Webhook Efí] OS marcada como paga:', os.id)

      return NextResponse.json({ 
        success: true, 
        message: 'Pagamento processado com sucesso',
        osId: os.id 
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Status processado',
      status: statusResult.status 
    })

  } catch (error) {
    console.error('[Webhook Efí] Erro:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

// GET para verificação do webhook
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    success: true, 
    message: 'Webhook Efí Bank ativo',
    timestamp: new Date().toISOString()
  })
}
