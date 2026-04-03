import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const osId = searchParams.get('osId')
    
    if (!osId) {
      return NextResponse.json({ error: 'osId obrigatorio' }, { status: 400 })
    }

    const os = await db.ordemServico.findUnique({
      where: { id: osId },
      select: {
        id: true,
        numeroOs: true,
        pago: true,
        valorTotal: true,
        linkPagamento: true,
        pixQrCode: true,
        pixCopiaCola: true,
        mpPaymentId: true,
        mpPreferenceId: true
      }
    })

    return NextResponse.json({
      success: true,
      os: {
        ...os,
        temPagamento: !!(os?.mpPaymentId || os?.mpPreferenceId),
        temLink: !!os?.linkPagamento,
        temQrCode: !!os?.pixQrCode
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }, { status: 500 })
  }
}
