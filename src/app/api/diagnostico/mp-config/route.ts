import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Testar conexao com MP
async function testarConexaoMP(accessToken: string) {
  try {
    const response = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (!response.ok) {
      const text = await response.text()
      return { success: false, status: response.status, error: text }
    }
    
    const data = await response.json()
    return { success: true, userId: data.id, email: data.email }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// GET - Diagnostico completo
export async function GET() {
  try {
    // 1. Buscar configuracoes
    const config = await db.configuracaoPagamento.findFirst()
    
    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma configuracao de pagamento encontrada'
      })
    }
    
    // 2. Verificar tipo do token
    const token = config.mpAccessToken || ''
    const isProducao = token.startsWith('APP_USR-')
    const isSandbox = token.startsWith('TEST-')
    
    // 3. Testar conexao com a API
    let conexaoResult = null
    if (token) {
      conexaoResult = await testarConexaoMP(token)
    }
    
    // 4. Verificar se ambiente esta correto para o token
    const ambienteCorreto = (isProducao && config.mpAmbiente === 'producao') ||
                           (isSandbox && config.mpAmbiente === 'sandbox')
    
    // 5. Buscar OS #22
    const os22 = await db.ordemServico.findFirst({
      where: { numeroOs: 22 },
      select: {
        id: true,
        numeroOs: true,
        pago: true,
        linkPagamento: true,
        mpPreferenceId: true,
        aprovado: true
      }
    })
    
    return NextResponse.json({
      success: true,
      mercadoPago: {
        ambiente: config.mpAmbiente,
        ativo: config.ativo,
        tokenPrefixo: token.substring(0, 20) + '...',
        tokenTipo: isProducao ? 'PRODUCAO' : isSandbox ? 'SANDBOX' : 'DESCONHECIDO',
        ambienteCorreto,
        conexao: conexaoResult
      },
      os22: os22 || 'nao encontrada',
      problemas: [
        !ambienteCorreto ? 'Token e ambiente nao correspondem! Token e ' + (isProducao ? 'PRODUCAO' : 'SANDBOX') + ' mas ambiente esta como ' + config.mpAmbiente : null,
        os22?.linkPagamento ? 'OS #22 tem link antigo salvo: ' + os22.linkPagamento.substring(0, 50) + '...' : null
      ].filter(Boolean)
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error)
    })
  }
}
