import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// API para sincronizar colunas faltantes no banco Neon
// Adiciona a coluna codigoAcesso se não existir
export async function POST(request: Request) {
  try {
    // Verificar autorização via header secreto
    const authHeader = request.headers.get('authorization')
    const expectedAuth = process.env.SYNC_SCHEMA_SECRET || 'tecos-sync-2024'
    
    if (authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    console.log('[SYNC-SCHEMA] Verificando colunas do banco...')
    
    const results: string[] = []

    // 1. Verificar se a coluna codigoAcesso existe na tabela OrdemServico
    const checkColumn = await db.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'OrdemServico' 
      AND column_name = 'codigoAcesso'
    ` as { column_name: string }[]

    if (checkColumn.length === 0) {
      console.log('[SYNC-SCHEMA] Coluna codigoAcesso não existe. Criando...')
      
      // Adicionar a coluna codigoAcesso
      await db.$executeRawUnsafe(`
        ALTER TABLE "OrdemServico" 
        ADD COLUMN "codigoAcesso" TEXT UNIQUE
      `)
      
      results.push('Coluna codigoAcesso adicionada à tabela OrdemServico')
    } else {
      results.push('Coluna codigoAcesso já existe na tabela OrdemServico')
    }

    // 2. Verificar se a coluna cpf existe na tabela Cliente (se necessário no futuro)
    const checkCpf = await db.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Cliente' 
      AND column_name = 'cpf'
    ` as { column_name: string }[]

    if (checkCpf.length === 0) {
      console.log('[SYNC-SCHEMA] Coluna cpf não existe. Criando...')
      
      await db.$executeRawUnsafe(`
        ALTER TABLE "Cliente" 
        ADD COLUMN "cpf" TEXT
      `)
      
      results.push('Coluna cpf adicionada à tabela Cliente')
    } else {
      results.push('Coluna cpf já existe na tabela Cliente')
    }

    // 3. Verificar se a coluna endereco existe na tabela Cliente
    const checkEndereco = await db.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Cliente' 
      AND column_name = 'endereco'
    ` as { column_name: string }[]

    if (checkEndereco.length === 0) {
      console.log('[SYNC-SCHEMA] Coluna endereco não existe. Criando...')
      
      await db.$executeRawUnsafe(`
        ALTER TABLE "Cliente" 
        ADD COLUMN "endereco" TEXT
      `)
      
      results.push('Coluna endereco adicionada à tabela Cliente')
    } else {
      results.push('Coluna endereco já existe na tabela Cliente')
    }

    console.log('[SYNC-SCHEMA] Sincronização concluída!')

    return NextResponse.json({
      success: true,
      message: 'Schema sincronizado com sucesso',
      results
    })
  } catch (error) {
    console.error('[SYNC-SCHEMA] Erro:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao sincronizar schema',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Verificar estado atual do schema
    const columns = await db.$queryRaw`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_name IN ('OrdemServico', 'Cliente')
      AND column_name IN ('codigoAcesso', 'cpf', 'endereco')
      ORDER BY table_name, column_name
    `

    return NextResponse.json({
      message: 'Status do schema do banco',
      columns
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Erro ao verificar schema',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
