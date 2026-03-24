import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo === 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Buscar sessões ativas
    const sessoes = await db.sessao.findMany({
      where: {
        lojaId: user.lojaId,
        ativa: true,
        dataExpiracao: { gte: new Date() }
      },
      orderBy: { ultimoAcesso: 'desc' }
    })

    // Obter ID da sessão atual do token
    const cookieStore = await cookies()
    const token = cookieStore.get('tecos-token')?.value
    
    // Decodificar token para pegar sessaoId
    let sessaoAtualId = null
    if (token) {
      const { verifyToken } = await import('@/lib/auth/auth')
      const decoded = await verifyToken(token)
      sessaoAtualId = decoded?.sessaoId
    }

    return NextResponse.json({
      success: true,
      sessoes,
      sessaoAtualId
    })
  } catch (error) {
    console.error('Erro ao buscar sessões:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar sessões' },
      { status: 500 }
    )
  }
}
