import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Resetar pagamento de uma OS específica
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { numeroOs } = body
    
    if (!numeroOs) {
      return NextResponse.json({ error: 'numeroOs é obrigatório' }, { status: 400 })
    }
    
    // Buscar OS
    const os = await db.ordemServico.findFirst({
      where: { numeroOs: parseInt(numeroOs) },
      select: {
        id: true,
        numeroOs: true,
        pago: true,
        linkPagamento: true,
        mpPaymentId: true,
        mpPreferenceId: true,
        pixQrCode: true,
        pixCopiaCola: true
      }
    })
    
    if (!os) {
      return NextResponse.json({ error: 'OS nao encontrada' }, { status: 404 })
    }
    
    console.log('[Reset OS] OS #' + numeroOs + ' encontrada:', os)
    
    // Resetar todos os campos de pagamento
    await db.ordemServico.update({
      where: { id: os.id },
      data: {
        mpPaymentId: null,
        mpPreferenceId: null,
        linkPagamento: null,
        pixQrCode: null,
        pixCopiaCola: null,
        boletoUrl: null,
        boletoLinhaDigitavel: null,
        pago: false,
        dataPagamento: null,
        atualizadoEm: new Date()
      }
    })
    
    console.log('[Reset OS] OS #' + numeroOs + ' resetada!')
    
    return NextResponse.json({
      success: true,
      message: 'OS #' + numeroOs + ' resetada com sucesso!',
      os: {
        id: os.id,
        numeroOs: os.numeroOs,
        linkPagamentoAnterior: os.linkPagamento ? 'existia' : 'nao existia'
      }
    })
    
  } catch (error) {
    console.error('[Reset OS] Erro:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
