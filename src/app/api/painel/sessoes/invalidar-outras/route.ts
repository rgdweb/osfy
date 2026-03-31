import { NextResponse } from 'next/server'
import { getCurrentUser, invalidarOutrasSessoes } from '@/lib/auth/auth'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo === 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Obter ID da sessão atual do token
    const cookieStore = await cookies()
    const token = cookieStore.get('tecos-token')?.value
    
    let sessaoAtualId = null
    if (token) {
      const { verifyToken } = await import('@/lib/auth/auth')
      const decoded = await verifyToken(token)
      sessaoAtualId = decoded?.sessaoId
    }

    if (!sessaoAtualId) {
      return NextResponse.json(
        { success: false, error: 'Sessão atual não encontrada' },
        { status: 400 }
      )
    }

    const quantidade = await invalidarOutrasSessoes(sessaoAtualId, user.lojaId!, 'loja')

    return NextResponse.json({
      success: true,
      message: `${quantidade} sessões desconectadas`,
      quantidade
    })
  } catch (error) {
    console.error('Erro ao invalidar outras sessões:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao invalidar outras sessões' },
      { status: 500 }
    )
  }
}
