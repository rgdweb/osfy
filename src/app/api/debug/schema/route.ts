import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'

// API para debugar o schema do banco Neon
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar todas as colunas da tabela OrdemServico
    const colunasOS = await db.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'OrdemServico'
      ORDER BY ordinal_position
    `

    // Verificar todas as colunas da tabela Cliente
    const colunasCliente = await db.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Cliente'
      ORDER BY ordinal_position
    `

    // Verificar se a tabela ContadorOS existe
    const tabelas = await db.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `

    // Tentar verificar contador
    let testeContador = null
    let erroContador = null

    try {
      const contador = await db.contadorOS.findFirst()
      testeContador = { contadorExiste: !!contador, valor: contador?.ultimoNumero }
    } catch (e) {
      erroContador = e instanceof Error ? e.message : 'Erro desconhecido'
    }

    return NextResponse.json({
      success: true,
      tabelas,
      colunasOrdemServico: colunasOS,
      colunasCliente,
      testeContador,
      erroContador
    })
  } catch (error) {
    console.error('[DEBUG] Erro:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro ao verificar schema',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
