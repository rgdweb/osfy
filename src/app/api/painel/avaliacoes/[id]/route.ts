import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PATCH - Responder avaliação
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    
    if (!user?.lojaId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { resposta } = body

    if (!resposta || resposta.trim().length < 3) {
      return NextResponse.json({ error: 'Resposta deve ter pelo menos 3 caracteres' }, { status: 400 })
    }

    // Verificar se a avaliação pertence à loja
    const avaliacao = await db.avaliacao.findFirst({
      where: { 
        id,
        lojaId: user.lojaId 
      }
    })

    if (!avaliacao) {
      return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 })
    }

    // Atualizar com a resposta
    const avaliacaoAtualizada = await db.avaliacao.update({
      where: { id },
      data: {
        resposta: resposta.trim(),
        dataResposta: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      avaliacao: avaliacaoAtualizada,
      message: 'Resposta enviada com sucesso!'
    })

  } catch (error) {
    console.error('[API Avaliação PATCH] Erro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
