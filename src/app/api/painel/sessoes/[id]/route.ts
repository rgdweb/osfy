import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, invalidarSessao } from '@/lib/auth/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo === 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params

    const sucesso = await invalidarSessao(id, user.lojaId!, 'loja')

    if (!sucesso) {
      return NextResponse.json(
        { success: false, error: 'Sessão não encontrada ou não pertence a você' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Sessão desconectada com sucesso'
    })
  } catch (error) {
    console.error('Erro ao invalidar sessão:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao invalidar sessão' },
      { status: 500 }
    )
  }
}
