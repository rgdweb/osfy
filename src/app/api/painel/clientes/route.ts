import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || !user.lojaId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const clientes = await db.cliente.findMany({
      where: { lojaId: user.lojaId },
      orderBy: { criadoEm: 'desc' },
      include: {
        _count: {
          select: { ordens: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      clientes
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar clientes' },
      { status: 500 }
    )
  }
}

// Excluir cliente (apenas se não tiver OS vinculada)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || !user.lojaId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get('id')

    if (!clienteId) {
      return NextResponse.json(
        { success: false, error: 'ID do cliente é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o cliente pertence à loja
    const cliente = await db.cliente.findFirst({
      where: {
        id: clienteId,
        lojaId: user.lojaId
      },
      include: {
        _count: {
          select: { ordens: true }
        }
      }
    })

    if (!cliente) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se tem OS vinculada
    if (cliente._count.ordens > 0) {
      return NextResponse.json(
        { success: false, error: 'Não é possível excluir cliente com OS vinculada' },
        { status: 400 }
      )
    }

    // Excluir cliente
    await db.cliente.delete({
      where: { id: clienteId }
    })

    return NextResponse.json({
      success: true,
      message: 'Cliente excluído com sucesso'
    })
  } catch (error) {
    console.error('Erro ao excluir cliente:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir cliente' },
      { status: 500 }
    )
  }
}
