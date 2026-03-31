import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// API de diagnóstico - Remove em produção
export async function GET() {
  try {
    // Buscar TODAS as configurações
    const todasConfigs = await db.configuracao.findMany({
      orderBy: { chave: 'asc' }
    })
    
    // Verificar se tem mpAccessToken
    const mpAccessToken = todasConfigs.find(c => c.chave === 'mpAccessToken')
    
    // Verificar configs MP esperadas
    const chavesEsperadas = ['mpAccessToken', 'mpPublicKey', 'mpClientId', 'mpClientSecret', 'mpAmbiente']
    const configsEncontradas = chavesEsperadas.map(chave => {
      const config = todasConfigs.find(c => c.chave === chave)
      return {
        chave,
        existe: !!config,
        temValor: !!(config?.valor),
        tamanho: config?.valor?.length || 0
      }
    })
    
    return NextResponse.json({
      success: true,
      diagnostico: {
        totalConfiguracoes: todasConfigs.length,
        todasChaves: todasConfigs.map(c => c.chave),
        configsMP: configsEncontradas,
        mpAccessTokenInfo: mpAccessToken ? {
          tamanho: mpAccessToken.valor.length,
          prefixo: mpAccessToken.valor.substring(0, 20) + '...',
          ambiente: mpAccessToken.valor.startsWith('APP_USR') ? 'producao' : 
                    mpAccessToken.valor.startsWith('TEST') ? 'sandbox' : 'desconhecido'
        } : null,
        problema: !mpAccessToken ? 'mpAccessToken não encontrado no banco' : 
                  mpAccessToken.valor.length < 50 ? 'mpAccessToken parece estar incompleto' : null
      }
    })
  } catch (error) {
    console.error('Erro no diagnóstico:', error)
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 })
  }
}
