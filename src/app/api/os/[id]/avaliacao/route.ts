import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Buscar avaliação de uma OS
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const avaliacao = await db.avaliacao.findUnique({
      where: { osId: id },
      select: {
        id: true,
        nota: true,
        comentario: true,
        resposta: true,
        dataResposta: true,
        criadoEm: true
      }
    })

    return NextResponse.json({
      success: true,
      avaliacao
    })

  } catch (error) {
    console.error('[API Avaliação GET] Erro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Criar avaliação (cliente avalia a OS)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nota, comentario } = body

    console.log('[Avaliação] Recebendo avaliação:', { osId: id, nota, comentario })

    // Validar nota
    if (!nota || nota < 1 || nota > 5) {
      return NextResponse.json({ error: 'Nota deve ser entre 1 e 5' }, { status: 400 })
    }

    // Buscar OS
    const os = await db.ordemServico.findUnique({
      where: { id },
      select: { 
        id: true, 
        lojaId: true, 
        clienteId: true,
        status: true
      }
    })

    if (!os) {
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 })
    }

    // Verificar se já foi avaliada
    const avaliacaoExistente = await db.avaliacao.findUnique({
      where: { osId: id }
    })

    if (avaliacaoExistente) {
      return NextResponse.json({ error: 'Esta OS já foi avaliada' }, { status: 400 })
    }

    // Criar avaliação - clienteId é opcional
    const avaliacao = await db.avaliacao.create({
      data: {
        lojaId: os.lojaId,
        osId: id,
        clienteId: os.clienteId || null, // Pode ser null
        nota: parseInt(nota),
        comentario: comentario || null
      }
    })

    console.log('[Avaliação] Avaliação criada:', avaliacao.id)

    // Criar notificação para a loja (pode falhar silenciosamente)
    try {
      await db.notificacao.create({
        data: {
          tipo: 'nova_avaliacao',
          titulo: 'Nova avaliação recebida!',
          mensagem: `Você recebeu uma avaliação de ${nota} estrelas`,
          lojaId: os.lojaId,
          referenciaId: id,
          referenciaTipo: 'os'
        }
      })
    } catch (notifError) {
      console.error('[Avaliação] Erro ao criar notificação (não crítico):', notifError)
    }

    return NextResponse.json({
      success: true,
      avaliacao,
      message: 'Avaliação enviada com sucesso!'
    })

  } catch (error: any) {
    console.error('[API Avaliação POST] Erro completo:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error?.message || 'Erro desconhecido'
    }, { status: 500 })
  }
}
