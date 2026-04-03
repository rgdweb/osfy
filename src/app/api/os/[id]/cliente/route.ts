import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PATCH - Atualizar CPF do cliente
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { cpf } = body

    if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
      return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
    }

    const cpfLimpo = cpf.replace(/\D/g, '')

    // Buscar OS para pegar o clienteId
    const os = await db.ordemServico.findUnique({
      where: { id },
      select: { clienteId: true }
    })

    if (!os) {
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 })
    }

    // Atualizar CPF do cliente
    await db.cliente.update({
      where: { id: os.clienteId },
      data: { cpf: cpfLimpo }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[API OS Cliente] Erro:', error)
    return NextResponse.json({ error: 'Erro ao atualizar CPF' }, { status: 500 })
  }
}
