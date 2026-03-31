import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'

/**
 * API para buscar dados financeiros da loja
 * Retorna fatura atual, histórico e status
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo === 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Buscar loja
    const loja = await db.loja.findUnique({
      where: { id: user.lojaId },
      select: {
        nome: true,
        plano: true,
        statusFinanceiro: true,
        diaVencimento: true,
        proximoVencimento: true,
        diasAtraso: true
      }
    })

    if (!loja) {
      return NextResponse.json(
        { success: false, error: 'Loja não encontrada' },
        { status: 404 }
      )
    }

    // Buscar fatura atual (pendente)
    const faturaAtual = await db.fatura.findFirst({
      where: {
        lojaId: user.lojaId,
        status: 'pendente'
      },
      orderBy: { dataVencimento: 'asc' }
    })

    // Buscar histórico (últimas 12 faturas)
    const historico = await db.fatura.findMany({
      where: { lojaId: user.lojaId },
      orderBy: { dataCriacao: 'desc' },
      take: 12
    })

    return NextResponse.json({
      success: true,
      loja,
      faturaAtual,
      historico
    })

  } catch (error) {
    console.error('Erro ao buscar dados financeiros:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar dados' },
      { status: 500 }
    )
  }
}
