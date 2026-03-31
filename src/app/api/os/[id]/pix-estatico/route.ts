import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { gerarPixEstatico } from '@/lib/pix-estatico'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Obter PIX estático para a OS
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Buscar OS
    const os = await db.ordemServico.findFirst({
      where: { id },
      include: { loja: true }
    })

    if (!os) {
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 })
    }

    // Buscar configuração de pagamento
    const config = await db.configuracaoPagamento.findFirst()

    if (!config?.chavePix) {
      return NextResponse.json({ 
        error: 'PIX não configurado',
        detalhes: 'Acesse /superadmin/pagamentos para configurar sua chave PIX',
        temChavePix: false 
      }, { status: 400 })
    }

    // Calcular valor
    const valor = (os.orcamento || 0) + (os.valorServico || 0) + (os.valorPecas || 0)
    
    if (valor <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    }

    // Gerar PIX estático (payload + QR Code)
    const { payload, qrCodeBase64 } = await gerarPixEstatico({
      chavePix: config.chavePix,
      valor: valor,
      nomeRecebedor: config.nomeRecebedor || os.loja.nome,
      cidade: os.loja.cidade || undefined,
      txid: os.numeroOs.toString().padStart(6, '0')
    })

    return NextResponse.json({
      success: true,
      pix: {
        payload,
        qrCodeBase64, // Imagem PNG em base64 (data:image/png;base64,...)
        valor,
        chavePixMascarada: config.chavePix.substring(0, 4) + '***' + config.chavePix.substring(config.chavePix.length - 4),
        nomeRecebedor: config.nomeRecebedor || os.loja.nome
      }
    })

  } catch (error) {
    console.error('[PIX Estático] Erro:', error)
    return NextResponse.json({ error: 'Erro ao gerar PIX' }, { status: 500 })
  }
}
