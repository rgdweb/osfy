import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'

// Buscar configuracoes de pagamento
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Nao autorizado' },
        { status: 401 }
      )
    }

    // Buscar ou criar configuracao
    let config = await db.configuracaoPagamento.findFirst()

    if (!config) {
      config = await db.configuracaoPagamento.create({
        data: {
          mpAmbiente: 'sandbox',
          valorMensalidade: 99.90,
          valorAnuidade: 999.00,
          diaVencimento: 10,
          diasBloqueio: 20,
          diasTolerancia: 3,
          ativo: false
        }
      })
    }

    return NextResponse.json({
      success: true,
      configuracao: config
    })
  } catch (error) {
    console.error('[PAGAMENTOS] Erro ao buscar configuracoes:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar configuracoes' },
      { status: 500 }
    )
  }
}

// Salvar configuracoes de pagamento
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Nao autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Buscar configuracao existente
    let config = await db.configuracaoPagamento.findFirst()

    const dataToUpdate = {
      // Dados Mercado Pago (campos corretos do schema)
      mpAccessToken: body.mpAccessToken || null,
      mpPublicKey: body.mpPublicKey || null,
      mpClientId: body.mpClientId || null,
      mpClientSecret: body.mpClientSecret || null,
      mpAmbiente: body.mpAmbiente || 'sandbox',
      mpWebhookSecret: body.mpWebhookSecret || null,
      
      // PIX Estatico
      chavePix: body.chavePix || null,
      tipoChavePix: body.tipoChavePix || null,
      nomeRecebedor: body.nomeRecebedor || null,
      
      // Configuracoes
      valorMensalidade: parseFloat(body.valorMensalidade) || 99.90,
      valorAnuidade: parseFloat(body.valorAnuidade) || 999.00,
      diaVencimento: parseInt(body.diaVencimento) || 10,
      diasBloqueio: parseInt(body.diasBloqueio) || 20,
      diasTolerancia: parseInt(body.diasTolerancia) || 3,
      ativo: body.ativo ?? false
    }

    if (config) {
      config = await db.configuracaoPagamento.update({
        where: { id: config.id },
        data: dataToUpdate
      })
    } else {
      config = await db.configuracaoPagamento.create({
        data: dataToUpdate
      })
    }

    return NextResponse.json({
      success: true,
      configuracao: config
    })
  } catch (error) {
    console.error('[PAGAMENTOS] Erro ao salvar configuracoes:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar configuracoes' },
      { status: 500 }
    )
  }
}
