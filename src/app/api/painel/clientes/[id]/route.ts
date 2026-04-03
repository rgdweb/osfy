import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Buscar cliente por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()

    if (!user || !user.lojaId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params

    const cliente = await db.cliente.findFirst({
      where: {
        id,
        lojaId: user.lojaId
      }
    })

    if (!cliente) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      cliente
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar cliente' },
      { status: 500 }
    )
  }
}

// PATCH - Atualizar cliente
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()

    if (!user || !user.lojaId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { nome, email, cpf, endereco } = body

    // Verificar se o cliente pertence à loja do usuário
    const clienteExistente = await db.cliente.findFirst({
      where: {
        id,
        lojaId: user.lojaId
      }
    })

    if (!clienteExistente) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar cliente
    const cliente = await db.cliente.update({
      where: { id },
      data: {
        nome: nome || clienteExistente.nome,
        email: email !== undefined ? email : clienteExistente.email,
        cpf: cpf !== undefined ? cpf : clienteExistente.cpf,
        endereco: endereco !== undefined ? endereco : clienteExistente.endereco
      }
    })

    return NextResponse.json({
      success: true,
      cliente
    })
  } catch (error) {
    console.error('[API Clientes] Erro ao atualizar:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar cliente' },
      { status: 500 }
    )
  }
}
