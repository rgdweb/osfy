import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const config = await db.configuracaoPagamento.findFirst()
    
    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma configuracao encontrada'
      })
    }

    // Verificar tipo do token
    const token = config.mpAccessToken || ''
    const isTestToken = token.startsWith('TEST-')
    const isProdToken = token.startsWith('APP_USR-')
    const ambiente = config.mpAmbiente
    
    // Diagnostico
    const diagnostico = {
      ambienteConfigurado: ambiente,
      tokenTipo: isTestToken ? 'TEST (sandbox)' : isProdToken ? 'APP_USR (producao)' : 'DESCONHECIDO',
      tokenValido: isTestToken || isProdToken,
      tokenCompativel: (ambiente === 'sandbox' && isTestToken) || (ambiente === 'producao' && isProdToken),
      problema: null as string | null,
      solucao: null as string | null
    }

    if (!diagnostico.tokenValido) {
      diagnostico.problema = 'Token invalido - deve comecar com TEST- ou APP_USR-'
      diagnostico.solucao = 'Gere um novo Access Token no Mercado Pago Developers'
    } else if (!diagnostico.tokenCompativel) {
      if (ambiente === 'sandbox' && isProdToken) {
        diagnostico.problema = 'Voce configurou ambiente SANDBOX mas esta usando token de PRODUCAO'
        diagnostico.solucao = 'Mude o ambiente para PRODUCAO ou use um token TEST-'
      } else if (ambiente === 'producao' && isTestToken) {
        diagnostico.problema = 'Voce configurou ambiente PRODUCAO mas esta usando token de SANDBOX'
        diagnostico.solucao = 'Mude o ambiente para SANDBOX ou use um token APP_USR-'
      }
    }

    // Testar conexao com MP
    let conexaoMP = null
    if (token) {
      try {
        const response = await fetch('https://api.mercadopago.com/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          conexaoMP = {
            success: true,
            userId: data.id,
            nome: data.nickname || data.first_name
          }
        } else {
          conexaoMP = {
            success: false,
            status: response.status,
            error: 'Token rejeitado pelo Mercado Pago'
          }
        }
      } catch (e) {
        conexaoMP = {
          success: false,
          error: String(e)
        }
      }
    }

    return NextResponse.json({
      success: true,
      diagnostico,
      conexaoMP,
      configuracao: {
        ambiente: config.mpAmbiente,
        temAccessToken: !!config.mpAccessToken,
        temPublicKey: !!config.mpPublicKey,
        temClientId: !!config.mpClientId,
        temClientSecret: !!config.mpClientSecret
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 })
  }
}
