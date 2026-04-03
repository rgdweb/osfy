import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const config = await db.configuracaoPagamento.findFirst()
    
    return NextResponse.json({
      success: true,
      configExiste: !!config,
      temApiKey: !!config?.asaasApiKey,
      apiKeyLength: config?.asaasApiKey?.length || 0,
      apiKeyPrefix: config?.asaasApiKey?.substring(0, 8) || '',
      ambiente: config?.asaasAmbiente || 'não configurado',
      valorMensalidade: config?.valorMensalidade,
      valorAnuidade: config?.valorAnuidade
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
}
