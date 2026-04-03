import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getMercadoPagoConfig } from '@/lib/mercadopago'

interface Params {
  params: Promise<{ id: string }>
}

// GET - Buscar status do pagamento com DEBUG
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    console.log(`[PAGAMENTO DEBUG] Buscando OS: ${id}`)

    const os = await db.ordemServico.findUnique({
      where: { id },
      include: {
        loja: true,
        cliente: true
      }
    })

    if (!os) {
      console.log(`[PAGAMENTO DEBUG] OS não encontrada`)
      return NextResponse.json(
        { success: false, error: 'OS não encontrada' },
        { status: 404 }
      )
    }

    // Calcular valor total
    const valorTotal = os.valorTotal || (os.valorServico || 0) + (os.valorPecas || 0)
    console.log(`[PAGAMENTO DEBUG] OS encontrada:`, {
      id: os.id,
      numeroOs: os.numeroOs,
      valorTotal,
      valorServico: os.valorServico,
      valorPecas: os.valorPecas,
      pago: os.pago
    })

    // Verificar se tem configuração MP
    const config = await getMercadoPagoConfig()
    console.log(`[PAGAMENTO DEBUG] Config MP:`, {
      temConfig: !!config,
      temAccessToken: !!config?.accessToken,
      ambiente: config?.ambiente,
      tokenPrefixo: config?.accessToken?.substring(0, 20)
    })

    if (!config) {
      console.log(`[PAGAMENTO DEBUG] MP não configurado`)
      return NextResponse.json({
        success: true,
        pagamentoHabilitado: false,
        debug: {
          motivo: 'Mercado Pago não configurado',
          valorTotal,
          pago: os.pago
        },
        os: {
          id: os.id,
          numeroOs: os.numeroOs,
          valorTotal,
          pago: os.pago
        }
      })
    }

    // Verificar condições para mostrar botão
    const condicoes = {
      temConfig: !!config,
      temValor: valorTotal > 0,
      naoPago: !os.pago
    }
    
    console.log(`[PAGAMENTO DEBUG] Condições:`, condicoes)

    return NextResponse.json({
      success: true,
      pagamentoHabilitado: true,
      debug: {
        condicoes,
        valorTotal,
        pago: os.pago,
        podePagar: condicoes.temConfig && condicoes.temValor && condicoes.naoPago
      },
      os: {
        id: os.id,
        numeroOs: os.numeroOs,
        valorTotal,
        pago: os.pago,
        mpStatus: os.mpStatus,
        pixQrCode: os.pixQrCode,
        pixCopiaCola: os.pixCopiaCola,
        linkPagamento: os.linkPagamento
      }
    })
  } catch (error) {
    console.error('[PAGAMENTO DEBUG] Erro:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar pagamento', debug: String(error) },
      { status: 500 }
    )
  }
}
