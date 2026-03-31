import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { testarConexao } from '@/lib/asaas'

export async function GET() {
  try {
    // Buscar configurações de pagamento
    const config = await db.configuracaoPagamento.findFirst()
    
    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma configuração de pagamento encontrada',
        config: null
      })
    }
    
    // Verificar se tem API Key
    const temApiKey = !!config.asaasApiKey
    const apiKeyMascarada = config.asaasApiKey 
      ? `${config.asaasApiKey.substring(0, 12)}...${config.asaasApiKey.substring(config.asaasApiKey.length - 4)}`
      : null
    
    // Verificar comprimento da API Key
    const apiKeyLength = config.asaasApiKey?.length || 0
    const apiKeyTemEspacos = config.asaasApiKey?.includes(' ') || false
    
    // Testar conexão com Asaas
    let testeConexao = null
    if (temApiKey) {
      testeConexao = await testarConexao(config.asaasApiKey!, config.asaasAmbiente || 'sandbox')
    }
    
    // Detalhes da URL usada
    const baseUrl = config.asaasAmbiente === 'producao' 
      ? 'https://api.asaas.com/api/v3'
      : 'https://sandbox.asaas.com/api/v3'

    return NextResponse.json({
      success: true,
      config: {
        temConfig: true,
        temApiKey,
        apiKeyMascarada,
        apiKeyLength,
        apiKeyTemEspacos,
        ambiente: config.asaasAmbiente || 'sandbox',
        valorMensalidade: config.valorMensalidade,
        valorAnuidade: config.valorAnuidade,
        webhookSecret: config.webhookSecret ? 'configurado' : 'não configurado'
      },
      testeConexao: testeConexao ? {
        success: testeConexao.success,
        error: testeConexao.error
      } : null,
      detalhes: {
        urlTestada: `${baseUrl}/customers?limit=1`,
        ambienteUsado: config.asaasAmbiente
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
}
