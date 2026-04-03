import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'

// Buscar configurações do sistema
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Buscar todas as configurações
    const configs = await db.configuracao.findMany()
    
    // Transformar em objeto chave-valor
    const configuracoes: Record<string, string> = {}
    configs.forEach(c => {
      configuracoes[c.chave] = c.valor
    })

    // Valores padrão
    const defaultConfig = {
      siteNome: 'OSFY',
      siteDescricao: 'Sistema de Ordens de Serviço para Assistências Técnicas',
      sitePreco: '99',
      sitePrecoAnual: '999',
      siteWhatsapp: '',
      siteEmail: '',
      siteTermos: '',
      sitePolitica: '',
    }

    return NextResponse.json({
      success: true,
      configuracoes: { ...defaultConfig, ...configuracoes }
    })
  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar configurações' },
      { status: 500 }
    )
  }
}

// Atualizar configurações do sistema
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Salvar apenas configurações do site
    // Os valores de cobrança são salvos em /api/superadmin/pagamentos
    const configuracoesSite = {
      siteNome: body.siteNome,
      siteDescricao: body.siteDescricao,
      sitePreco: body.sitePreco,
      sitePrecoAnual: body.sitePrecoAnual,
      siteWhatsapp: body.siteWhatsapp,
      siteEmail: body.siteEmail,
      siteTermos: body.siteTermos,
      sitePolitica: body.sitePolitica,
    }

    // Atualizar configurações gerais
    for (const [chave, valor] of Object.entries(configuracoesSite)) {
      if (valor !== undefined) {
        await db.configuracao.upsert({
          where: { chave },
          update: { valor: String(valor) },
          create: { chave, valor: String(valor) }
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Configurações salvas com sucesso'
    })
  } catch (error) {
    console.error('Erro ao salvar configurações:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar configurações' },
      { status: 500 }
    )
  }
}
