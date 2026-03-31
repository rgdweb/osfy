import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const lojas = await db.loja.findMany({
      select: {
        id: true,
        nome: true,
        slug: true,
        email: true,
        plano: true,
        precoPlano: true,
        status: true,
        trialAte: true,
        createdAt: true,
        faturas: {
          select: {
            id: true,
            numeroFatura: true,
            valor: true,
            status: true,
            formaPagamento: true,
            codigoPix: true,
            qrCodePix: true,
            linkBoleto: true,
            linkPagamento: true,
            dataVencimento: true,
            createdAt: true
          }
        }
      }
    })

    // Buscar configuracoes de pagamento
    const config = await db.configuracaoPagamento.findFirst()
    
    return NextResponse.json({
      success: true,
      configuracao: {
        temApiKey: !!config?.mpAccessToken,
        apiKeyLength: config?.mpAccessToken?.length,
        ambiente: config?.mpAmbiente,
        valorMensalidade: config?.valorMensalidade,
        ativo: config?.ativo
      },
      lojas: lojas.map(l => ({
        ...l,
        faturas: l.faturas.map(f => ({
          ...f,
          qrCodePix: f.qrCodePix ? 'SIM (tem QR Code)' : null
        }))
      }))
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
}
