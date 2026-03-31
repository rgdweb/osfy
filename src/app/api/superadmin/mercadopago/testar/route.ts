import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { testarConexao } from '@/lib/mercadopago'

// POST - Testar conexão com Mercado Pago
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { accessToken } = body

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Access Token é obrigatório' },
        { status: 400 }
      )
    }

    const result = await testarConexao(accessToken)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Conexão bem-sucedida com o Mercado Pago!',
        userId: result.userId
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Falha na conexão com Mercado Pago'
      })
    }
  } catch (error) {
    console.error('[TESTAR MERCADOPAGO] Erro:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao testar conexão' },
      { status: 500 }
    )
  }
}
