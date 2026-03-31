import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'

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
    const { lojaId, ativarDireto, expiraEm } = body

    if (!lojaId) {
      return NextResponse.json(
        { success: false, error: 'ID da loja é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar loja
    const loja = await db.loja.findUnique({
      where: { id: lojaId }
    })

    if (!loja) {
      return NextResponse.json(
        { success: false, error: 'Loja não encontrada' },
        { status: 404 }
      )
    }

    // Preparar dados para atualização
    const dadosAtualizacao: {
      trialAte: Date | null
      trialUsado: boolean
      status?: string
      expiraEm?: Date | null
    } = {
      trialAte: null,
      trialUsado: true
    }

    if (ativarDireto) {
      // Ativar diretamente como pago
      dadosAtualizacao.status = 'ativa'
      
      if (expiraEm) {
        dadosAtualizacao.expiraEm = new Date(expiraEm)
      } else {
        // Calcular data de expiração padrão (1 mês)
        const novaExpiracao = new Date()
        novaExpiracao.setMonth(novaExpiracao.getMonth() + 1)
        dadosAtualizacao.expiraEm = novaExpiracao
      }
    }

    // Atualizar loja
    const lojaAtualizada = await db.loja.update({
      where: { id: lojaId },
      data: dadosAtualizacao
    })

    return NextResponse.json({
      success: true,
      message: ativarDireto 
        ? 'Trial removido e loja ativada com sucesso!' 
        : 'Trial removido com sucesso!',
      loja: lojaAtualizada
    })
  } catch (error) {
    console.error('Erro ao remover trial:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao remover trial' },
      { status: 500 }
    )
  }
}
