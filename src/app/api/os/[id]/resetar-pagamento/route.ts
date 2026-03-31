import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST - Resetar dados de pagamento da OS (para testes)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Verificar se a OS existe
    const os = await db.ordemServico.findFirst({
      where: { id },
      select: { id: true, pago: true }
    })

    if (!os) {
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 })
    }

    // Limpar dados de pagamento (Mercado Pago)
    await db.ordemServico.update({
      where: { id },
      data: {
        // Campos Mercado Pago
        mpPaymentId: null,
        mpPreferenceId: null,
        linkPagamento: null,
        pixQrCode: null,
        pixCopiaCola: null,
        boletoUrl: null,
        boletoLinhaDigitavel: null,
        // Resetar status de pagamento
        pago: false,
        dataPagamento: null,
        atualizadoEm: new Date()
      }
    })

    // Adicionar histórico
    await db.historicoOS.create({
      data: {
        osId: id,
        descricao: 'Pagamento resetado (teste)',
        status: 'aguardando_aprovacao'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Pagamento resetado com sucesso'
    })

  } catch (error) {
    console.error('[API Reset Pagamento] Erro:', error)
    return NextResponse.json({ error: 'Erro ao resetar pagamento' }, { status: 500 })
  }
}
