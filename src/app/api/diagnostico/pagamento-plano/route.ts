import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Diagnóstico da API de pagamento do plano
 * Verifica se tudo está configurado corretamente
 */
export async function GET() {
  try {
    console.log('[Diagnóstico] Verificando configuração de pagamento...')
    
    // 1. Verificar configuração de pagamento
    const config = await db.configuracaoPagamento.findFirst()
    
    if (!config) {
      return NextResponse.json({
        success: false,
        erro: 'Nenhuma configuração de pagamento encontrada',
        solucao: 'Acesse o painel Super Admin > Configurações e configure o Mercado Pago'
      })
    }
    
    // 2. Verificar token
    const token = config.mpAccessToken
    const temToken = !!token
    const tokenPrefixo = token ? token.substring(0, 15) + '...' : null
    const tokenTipo = token?.startsWith('APP_USR-') ? 'PRODUCAO' 
                    : token?.startsWith('TEST-') ? 'SANDBOX' 
                    : 'DESCONHECIDO'
    
    // 3. Verificar ambiente
    const ambiente = config.mpAmbiente || 'sandbox'
    const ambienteCorreto = (token?.startsWith('APP_USR-') && ambiente === 'producao') ||
                           (token?.startsWith('TEST-') && ambiente === 'sandbox')
    
    // 4. Testar conexão com MP
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
          conexaoMP = { success: true, userId: data.id, email: data.email }
        } else {
          const text = await response.text()
          conexaoMP = { success: false, status: response.status, error: text.substring(0, 200) }
        }
      } catch (e) {
        conexaoMP = { success: false, error: String(e) }
      }
    }
    
    // 5. Verificar preços
    const precoMensal = config.valorMensalidade || 29.90
    const precoAnual = config.valorAnuidade || 290
    
    // 6. Contar lojas
    const totalLojas = await db.loja.count()
    const lojasAtivas = await db.loja.count({ where: { status: 'ativa' } })
    
    // 7. Contar faturas pendentes
    const faturasPendentes = await db.fatura.count({ where: { status: 'pendente' } })
    
    // Diagnóstico final
    const problemas: string[] = []
    
    if (!temToken) {
      problemas.push('Token do Mercado Pago nao configurado')
    }
    
    if (temToken && !ambienteCorreto) {
      problemas.push(`Token e ${tokenTipo} mas ambiente esta como ${ambiente}`)
    }
    
    if (conexaoMP && !conexaoMP.success) {
      problemas.push(`Falha na conexao com MP: ${conexaoMP.error}`)
    }
    
    return NextResponse.json({
      success: problemas.length === 0,
      MercadoPago: {
        configurado: temToken,
        ambiente,
        tokenTipo,
        ambienteCorreto,
        conexao: conexaoMP
      },
      precos: {
        mensal: precoMensal,
        anual: precoAnual
      },
      estatisticas: {
        totalLojas,
        lojasAtivas,
        faturasPendentes
      },
      problemas: problemas.length > 0 ? problemas : null,
      mensagem: problemas.length === 0 
        ? 'Tudo configurado corretamente!' 
        : `${problemas.length} problema(s) encontrado(s)`
    })
    
  } catch (error) {
    console.error('[Diagnóstico] Erro:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
}
