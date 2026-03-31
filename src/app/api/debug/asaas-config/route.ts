import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const config = await db.configuracaoPagamento.findFirst()
    
    return NextResponse.json({
      temConfig: !!config,
      temApiKey: !!config?.asaasApiKey,
      apiKeyPrefix: config?.asaasApiKey ? config.asaasApiKey.substring(0, 10) + '...' : null,
      ambiente: config?.asaasAmbiente || 'não configurado',
      valorMensalidade: config?.valorMensalidade || 0,
      valorAnuidade: config?.valorAnuidade || 0,
      ativo: config?.ativo || false
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Erro ao buscar configuração',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
