import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'

// GET - Listar avaliações da loja
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user?.lojaId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pagina = parseInt(searchParams.get('pagina') || '1')
    const limite = parseInt(searchParams.get('limite') || '20')
    const nota = searchParams.get('nota')

    const where: {
      lojaId: string
      nota?: number
    } = {
      lojaId: user.lojaId
    }

    if (nota) {
      where.nota = parseInt(nota)
    }

    // Buscar avaliações
    const [avaliacoes, total] = await Promise.all([
      db.avaliacao.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip: (pagina - 1) * limite,
        take: limite,
        include: {
          loja: {
            select: { nome: true }
          }
        }
      }),
      db.avaliacao.count({ where })
    ])

    // Buscar OS relacionadas
    const osIds = avaliacoes.map(a => a.osId)
    const ordens = await db.ordemServico.findMany({
      where: { id: { in: osIds } },
      select: {
        id: true,
        numeroOs: true,
        cliente: {
          select: { nome: true }
        }
      }
    })

    // Mapear OS para cada avaliação
    const avaliacoesComOS = avaliacoes.map(avaliacao => {
      const os = ordens.find(o => o.id === avaliacao.osId)
      return {
        ...avaliacao,
        os: os ? {
          numeroOs: os.numeroOs,
          clienteNome: os.cliente.nome
        } : null
      }
    })

    // Calcular estatísticas
    const stats = await db.avaliacao.aggregate({
      where: { lojaId: user.lojaId },
      _avg: { nota: true },
      _count: { id: true }
    })

    // Contar por nota
    const contagemPorNota = await db.avaliacao.groupBy({
      by: ['nota'],
      where: { lojaId: user.lojaId },
      _count: { id: true }
    })

    return NextResponse.json({
      success: true,
      avaliacoes: avaliacoesComOS,
      paginacao: {
        pagina,
        limite,
        total,
        totalPaginas: Math.ceil(total / limite)
      },
      estatisticas: {
        media: stats._avg.nota || 0,
        total: stats._count.id,
        porNota: contagemPorNota.reduce((acc, item) => {
          acc[item.nota] = item._count.id
          return acc
        }, {} as Record<number, number>)
      }
    })

  } catch (error) {
    console.error('[API Avaliações GET] Erro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
