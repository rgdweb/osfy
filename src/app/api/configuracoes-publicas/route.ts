import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Buscar configurações públicas do site (sem autenticação)
export async function GET() {
  try {
    // Buscar configurações gerais
    const configs = await db.configuracao.findMany()
    
    // Transformar em objeto chave-valor
    const configuracoes: Record<string, string> = {}
    configs.forEach(c => {
      configuracoes[c.chave] = c.valor
    })

    // Buscar valores REAIS de pagamento (usados para faturas)
    const configPagamento = await db.configuracaoPagamento.findFirst()

    // Retornar configurações públicas
    // Os preços vêm de ConfiguracaoPagamento (mesmos valores usados nas faturas)
    return NextResponse.json({
      success: true,
      configuracoes: {
        siteNome: configuracoes.siteNome || 'OSFY',
        siteDescricao: configuracoes.siteDescricao || 'Sistema de Gestão para Assistências Técnicas',
        // Preços REAIS de ConfiguracaoPagamento (usados nas faturas)
        sitePreco: configPagamento?.valorMensalidade?.toString() || '99',
        sitePrecoAnual: configPagamento?.valorAnuidade?.toString() || '999',
        siteWhatsapp: configuracoes.siteWhatsapp || '',
        siteEmail: configuracoes.siteEmail || '',
      }
    })
  } catch {
    return NextResponse.json({
      success: true,
      configuracoes: {
        siteNome: 'OSFY',
        siteDescricao: 'Sistema de Gestão para Assistências Técnicas',
        sitePreco: '99',
        sitePrecoAnual: '999',
        siteWhatsapp: '',
        siteEmail: '',
      }
    })
  }
}
