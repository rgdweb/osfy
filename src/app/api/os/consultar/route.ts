import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lojaId = searchParams.get('lojaId')
    const numeroOs = searchParams.get('numeroOs')

    if (!numeroOs) {
      return NextResponse.json(
        { success: false, error: 'Número da OS não informado' },
        { status: 400 }
      )
    }

    // Se tem lojaId, buscar por loja + número
    // Se não tem, buscar apenas pelo número (para páginas de retorno do Mercado Pago)
    const where = lojaId 
      ? { lojaId, numeroOs: parseInt(numeroOs) }
      : { numeroOs: parseInt(numeroOs) }

    const os = await db.ordemServico.findFirst({
      where,
      select: {
        id: true,
        numeroOs: true,
        pago: true,
        status: true
      }
    })

    if (!os) {
      return NextResponse.json(
        { success: false, error: 'Ordem de serviço não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      os
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao consultar ordem de serviço' },
      { status: 500 }
    )
  }
}
