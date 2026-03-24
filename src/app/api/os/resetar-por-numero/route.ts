import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Buscar OS por numero (para debug)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const numeroOs = searchParams.get('numeroOs')

    if (!numeroOs) {
      return NextResponse.json({ error: 'Parametro numeroOs e obrigatorio' }, { status: 400 })
    }

    const os = await db.ordemServico.findFirst({
      where: { numeroOs: parseInt(numeroOs) },
      select: {
        id: true,
        numeroOs: true,
        pago: true,
        linkPagamento: true,
        mpPreferenceId: true,
        mpPaymentId: true,
        pixQrCode: true,
        atualizadoEm: true
      }
    })

    if (!os) {
      return NextResponse.json({ error: 'OS #' + numeroOs + ' nao encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, os })

  } catch (error) {
    console.error('[Buscar OS] Erro:', error)
    return NextResponse.json({ error: 'Erro ao buscar OS' }, { status: 500 })
  }
}

// POST - Resetar pagamento de uma OS pelo numero
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { numeroOs } = body

    if (!numeroOs) {
      return NextResponse.json({ error: 'Numero da OS e obrigatorio' }, { status: 400 })
    }

    // Buscar OS pelo numero
    const os = await db.ordemServico.findFirst({
      where: { numeroOs: parseInt(numeroOs) },
      select: {
        id: true,
        numeroOs: true,
        pago: true,
        linkPagamento: true,
        mpPreferenceId: true
      }
    })

    if (!os) {
      return NextResponse.json({ error: 'OS #' + numeroOs + ' nao encontrada' }, { status: 404 })
    }

    console.log('[Reset Pagamento] OS #' + numeroOs + ' encontrada:', os.id)

    // Resetar todos os campos de pagamento (campos corretos do schema)
    await db.ordemServico.update({
      where: { id: os.id },
      data: {
        // Mercado Pago (campos corretos)
        mpPaymentId: null,
        mpPreferenceId: null,
        linkPagamento: null,
        pixQrCode: null,
        pixCopiaCola: null,
        boletoUrl: null,
        boletoLinhaDigitavel: null,
        // Status
        pago: false,
        dataPagamento: null,
        atualizadoEm: new Date()
      }
    })

    console.log('[Reset Pagamento] OS #' + numeroOs + ' resetada com sucesso!')

    return NextResponse.json({
      success: true,
      message: 'Pagamento da OS #' + numeroOs + ' resetado com sucesso!',
      os: {
        id: os.id,
        numeroOs: os.numeroOs
      }
    })

  } catch (error) {
    console.error('[Reset Pagamento] Erro:', error)
    return NextResponse.json({ error: 'Erro ao resetar pagamento' }, { status: 500 })
  }
}
