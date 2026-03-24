import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Buscar configurações do MP
    const configs = await db.configuracao.findMany({
      where: {
        chave: {
          in: ['mpAccessToken', 'mpPublicKey', 'mpClientId', 'mpClientSecret', 'mpAmbiente']
        }
      }
    })

    const configMap: Record<string, string> = {}
    configs.forEach(c => {
      configMap[c.chave] = c.valor
    })

    const accessToken = configMap.mpAccessToken

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Access Token não configurado',
        configuracao: {
          ambiente: 'não configurado',
          temAccessToken: false,
          temPublicKey: !!configMap.mpPublicKey,
          temClientId: !!configMap.mpClientId,
          temClientSecret: !!configMap.mpClientSecret
        }
      })
    }

    // Detectar ambiente pelo token
    const ambienteDetectado = accessToken.startsWith('APP_USR') ? 'producao' : 
                              accessToken.startsWith('TEST-') ? 'sandbox' : 'desconhecido'

    // Validar formato do token
    const tokenValido = accessToken.startsWith('APP_USR') || accessToken.startsWith('TEST-')
    const tokenTipo = accessToken.startsWith('APP_USR') ? 'APP_USR (producao)' :
                      accessToken.startsWith('TEST-') ? 'TEST- (sandbox)' : 'Token inválido'

    // Diagnóstico
    let problema: string | null = null
    let solucao: string | null = null

    if (!tokenValido) {
      problema = 'Token não segue o formato esperado'
      solucao = 'Use um token que comece com APP_USR (produção) ou TEST- (sandbox)'
    }

    // Testar conexão com Mercado Pago
    let conexaoMP = { success: false }
    
    try {
      const response = await fetch('https://api.mercadopago.com/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const userData = await response.json()
        conexaoMP = {
          success: true,
          userId: userData.id,
          nome: userData.nickname || userData.first_name
        }
      } else {
        const errorData = await response.json()
        conexaoMP = {
          success: false,
          error: errorData.message || `Erro HTTP ${response.status}`
        }
        
        if (response.status === 401 || response.status === 403) {
          problema = 'Token inválido ou expirado'
          solucao = 'Gere um novo Access Token no painel do Mercado Pago Developers'
        }
      }
    } catch (error) {
      conexaoMP = {
        success: false,
        error: 'Não foi possível conectar ao Mercado Pago'
      }
    }

    return NextResponse.json({
      success: conexaoMP.success,
      diagnostico: {
        ambienteConfigurado: ambienteDetectado,
        tokenTipo,
        tokenValido,
        tokenCompativel: tokenValido,
        problema,
        solucao
      },
      conexaoMP,
      configuracao: {
        ambiente: ambienteDetectado,
        temAccessToken: !!accessToken,
        temPublicKey: !!configMap.mpPublicKey,
        temClientId: !!configMap.mpClientId,
        temClientSecret: !!configMap.mpClientSecret
      }
    })
  } catch (error) {
    console.error('Erro ao testar Mercado Pago:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao testar conexão' },
      { status: 500 }
    )
  }
}
