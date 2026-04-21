import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface Props {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const body = await request.json()
    const { aprovado } = body

    if (typeof aprovado !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Decisão de aprovação é obrigatória' },
        { status: 400 }
      )
    }

    // Buscar a OS
    const os = await db.ordemServico.findUnique({
      where: { id }
    })

    if (!os) {
      return NextResponse.json(
        { success: false, error: 'Ordem de serviço não encontrada' },
        { status: 404 }
      )
    }

    // Determinar o novo status com base na aprovação
    // Se aprovado e a OS ainda está em aguardando_aprovacao, avançar para aguardando_peca
    // Se reprovado, voltar para em_analise
    // Mas se o status já avançou além de aguardando_aprovacao, não regredir
    const statusAvancados = ['em_manutencao', 'em_testes', 'pronto', 'entregue']
    const novoStatus = aprovado 
      ? (statusAvancados.includes(os.status) ? os.status : 'aguardando_peca')
      : (os.status === 'aguardando_aprovacao' ? 'em_analise' : os.status)

    // Atualizar a OS
    const osAtualizada = await db.ordemServico.update({
      where: { id },
      data: {
        aprovado,
        dataAprovacao: new Date(),
        status: novoStatus
      }
    })

    // Adicionar ao histórico
    await db.historicoOS.create({
      data: {
        osId: id,
        descricao: aprovado ? 'Orçamento aprovado pelo cliente' : 'Orçamento recusado pelo cliente',
        status: osAtualizada.status
      }
    })

    // Criar notificação para a loja
    await db.notificacao.create({
      data: {
        tipo: aprovado ? 'aprovacao_orcamento' : 'reprovacao_orcamento',
        titulo: aprovado ? 'Orçamento Aprovado!' : 'Orçamento Recusado',
        mensagem: `O cliente ${aprovado ? 'aprovou' : 'recusou'} o orçamento da OS #${os.numeroOs}`,
        lojaId: os.lojaId,
        referenciaId: id,
        referenciaTipo: 'os'
      }
    })

    return NextResponse.json({
      success: true,
      message: aprovado ? 'Orçamento aprovado' : 'Orçamento recusado'
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao processar aprovação' },
      { status: 500 }
    )
  }
}
