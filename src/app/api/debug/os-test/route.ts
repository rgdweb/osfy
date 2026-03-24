import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'

// API para diagnosticar o problema de criação de OS
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || !user.lojaId) {
      return NextResponse.json({ error: 'Não autorizado', user: user ? { id: user.id, tipo: user.tipo } : null })
    }

    // 1. Verificar colunas da tabela OrdemServico
    const colunasOS = await db.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'OrdemServico'
      ORDER BY ordinal_position
    `

    // 2. Verificar colunas da tabela Cliente
    const colunasCliente = await db.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Cliente'
      ORDER BY ordinal_position
    `

    // 3. Verificar se tabela ContadorOS existe e tem dados
    let contadorStatus = null
    try {
      const contador = await db.contadorOS.findUnique({
        where: { lojaId: user.lojaId }
      })
      contadorStatus = { existe: true, valor: contador?.ultimoNumero ?? null }
    } catch (e) {
      contadorStatus = { existe: false, erro: e instanceof Error ? e.message : 'Erro desconhecido' }
    }

    // 4. Verificar modelo Prisma vs Banco
    const camposEsperadosOS = [
      'id', 'lojaId', 'clienteId', 'tecnicoId', 'numeroOs',
      'equipamento', 'marca', 'modelo', 'imeiSerial', 'senhaAparelho',
      'problema', 'acessorios', 'estadoAparelho', 'diagnostico', 'solucao',
      'status', 'orcamento', 'aprovado', 'dataAprovacao', 'valorServico',
      'valorPecas', 'valorTotal', 'pago', 'formaPagamento', 'dataPagamento',
      'dataCriacao', 'dataPrevisao', 'dataFinalizacao', 'atualizadoEm'
    ]

    const colunasBanco = (colunasOS as { column_name: string }[]).map(c => c.column_name)
    const camposFaltantes = camposEsperadosOS.filter(c => !colunasBanco.includes(c))
    const camposExtras = colunasBanco.filter(c => !camposEsperadosOS.includes(c))

    return NextResponse.json({
      success: true,
      user: { id: user.id, tipo: user.tipo, lojaId: user.lojaId },
      banco: {
        colunasOrdemServico: colunasOS,
        colunasCliente: colunasCliente,
        camposFaltantesNoBanco: camposFaltantes,
        camposExtrasNoBanco: camposExtras
      },
      contador: contadorStatus
    })
  } catch (error) {
    console.error('[DEBUG-OS] Erro:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro ao diagnosticar',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 })
  }
}
