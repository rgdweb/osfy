import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { nanoid } from 'nanoid'

// Script para popular codigoOs nas OS antigas
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    // Apenas superadmin pode executar
    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Apenas superadmin pode executar esta migração' },
        { status: 401 }
      )
    }

    // Buscar todas as OS sem codigoOs
    const osSemCodigo = await db.ordemServico.findMany({
      where: {
        OR: [
          { codigoOs: null },
          { codigoOs: '' }
        ]
      },
      select: { id: true, numeroOs: true }
    })

    if (osSemCodigo.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Todas as OS já possuem código de assinatura',
        atualizadas: 0
      })
    }

    // Atualizar cada OS com um código único
    let atualizadas = 0
    const erros: string[] = []

    for (const os of osSemCodigo) {
      try {
        // Gerar código único usando nanoid (8 caracteres alfanuméricos)
        const codigoOs = nanoid(8).toUpperCase()
        
        await db.ordemServico.update({
          where: { id: os.id },
          data: { codigoOs }
        })
        atualizadas++
      } catch (error) {
        erros.push(`OS #${os.numeroOs}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${atualizadas} OS atualizadas com código de assinatura`,
      atualizadas,
      totalEncontradas: osSemCodigo.length,
      erros: erros.length > 0 ? erros : undefined
    })
  } catch (error) {
    console.error('Erro na migração:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao executar migração' },
      { status: 500 }
    )
  }
}

// Verificar quantas OS precisam de código
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Apenas superadmin pode verificar' },
        { status: 401 }
      )
    }

    const semCodigo = await db.ordemServico.count({
      where: {
        OR: [
          { codigoOs: null },
          { codigoOs: '' }
        ]
      }
    })

    const comCodigo = await db.ordemServico.count({
      where: {
        codigoOs: { not: null }
      }
    })

    return NextResponse.json({
      success: true,
      semCodigo,
      comCodigo,
      total: semCodigo + comCodigo
    })
  } catch (error) {
    console.error('Erro ao verificar:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao verificar OS' },
      { status: 500 }
    )
  }
}
