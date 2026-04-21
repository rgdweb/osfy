import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { STATUS_LABELS } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const user = await getCurrentUser()

    if (!user || !user.lojaId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Verificar se a OS pertence à loja
    const osExistente = await db.ordemServico.findFirst({
      where: { id, lojaId: user.lojaId }
    })

    if (!osExistente) {
      return NextResponse.json(
        { success: false, error: 'Ordem de serviço não encontrada' },
        { status: 404 }
      )
    }

    // Preparar dados para atualização
    const updateData: Record<string, unknown> = {}

    if (body.status && body.status !== osExistente.status) {
      updateData.status = body.status
      
      // Se status for "aguardando_aprovacao", resetar aprovação para null
      // (garante que o botão de aprovação apareça na página pública)
      if (body.status === 'aguardando_aprovacao') {
        updateData.aprovado = null
        updateData.dataAprovacao = null
      }
      
      // Se status for "entregue", finalizar OS e calcular garantia
      if (body.status === 'entregue') {
        updateData.dataFinalizacao = new Date()
        
        // Calcular data de fim da garantia
        const diasGarantia = body.garantiaDias || osExistente.garantiaDias || 90
        const dataFimGarantia = new Date()
        dataFimGarantia.setDate(dataFimGarantia.getDate() + diasGarantia)
        
        updateData.garantiaInicio = new Date()
        updateData.garantiaFim = dataFimGarantia
        if (!osExistente.garantiaDias) {
          updateData.garantiaDias = diasGarantia
        }
      }
      
      // Se status for "pronto" e tiver valor total, marcar como pago
      if (body.status === 'pronto' && body.valorTotal) {
        updateData.valorTotal = body.valorTotal
      }
    }

    if (body.orcamento !== undefined) {
      updateData.orcamento = body.orcamento ? parseFloat(body.orcamento) : null
      
      // Verificar se deve mudar status para aguardando_aprovacao
      // Regras:
      // 1. Se a OS está em status avançado (pronto/entregue), NÃO regredir o status
      // 2. Se o status atual já é avançado ou o novo status seria avançado, manter
      // 3. Caso contrário, se tem orçamento, solicitar aprovação do cliente
      const statusAvancados = ['pronto', 'entregue']
      const statusAtualAvancado = statusAvancados.includes(osExistente.status)
      const novoStatusAvancado = body.status ? statusAvancados.includes(body.status) : false
      
      if (!statusAtualAvancado && !novoStatusAvancado) {
        // OS não está em status avançado - solicitar aprovação do orçamento
        updateData.status = 'aguardando_aprovacao'
        updateData.aprovado = null
      } else if (statusAtualAvancado && osExistente.aprovado === null && osExistente.orcamento !== null) {
        // OS está em status avançado mas nunca foi aprovada (caso raro) - manter status, resetar aprovação
        // Não regredir o status, apenas marcar que precisa de aprovação para registro
      }
    }

    if (body.diagnostico !== undefined) {
      updateData.diagnostico = body.diagnostico || null
    }

    if (body.solucao !== undefined) {
      updateData.solucao = body.solucao || null
    }

    if (body.valorServico !== undefined) {
      updateData.valorServico = body.valorServico ? parseFloat(body.valorServico) : null
    }

    if (body.valorPecas !== undefined) {
      updateData.valorPecas = body.valorPecas ? parseFloat(body.valorPecas) : null
    }

    if (body.formaPagamento !== undefined) {
      updateData.formaPagamento = body.formaPagamento || null
    }

    if (body.dataPagamento !== undefined) {
      updateData.dataPagamento = body.dataPagamento ? new Date(body.dataPagamento) : null
    }

    if (body.garantiaDias !== undefined) {
      updateData.garantiaDias = body.garantiaDias ? parseInt(body.garantiaDias) : null
    }

    // Calcular valorTotal se algum valor foi atualizado
    if (body.orcamento !== undefined || body.valorServico !== undefined || body.valorPecas !== undefined) {
      const orcamento = body.orcamento !== undefined 
        ? (body.orcamento ? parseFloat(body.orcamento) : 0)
        : (osExistente.orcamento || 0)
      const valorServico = body.valorServico !== undefined 
        ? (body.valorServico ? parseFloat(body.valorServico) : 0)
        : (osExistente.valorServico || 0)
      const valorPecas = body.valorPecas !== undefined 
        ? (body.valorPecas ? parseFloat(body.valorPecas) : 0)
        : (osExistente.valorPecas || 0)
      
      updateData.valorTotal = orcamento + valorServico + valorPecas
    }

    if (body.pago !== undefined) {
      updateData.pago = body.pago
      if (body.pago) {
        updateData.dataPagamento = new Date()
      }
    }

    // Atualizar OS
    const os = await db.ordemServico.update({
      where: { id },
      data: updateData
    })

    // Adicionar histórico se mudou status
    // Verificar tanto mudança manual (body.status) quanto automática (via orcamento)
    const statusFinal = updateData.status as string | undefined
    const statusMudou = statusFinal && statusFinal !== osExistente.status
    const statusManualMudou = body.status && body.status !== osExistente.status
    
    if (statusMudou) {
      await db.historicoOS.create({
        data: {
          osId: id,
          descricao: `Status alterado para ${STATUS_LABELS[statusFinal as keyof typeof STATUS_LABELS] || statusFinal}`,
          status: statusFinal
        }
      })
    }

    return NextResponse.json({
      success: true,
      os,
      message: 'Ordem de serviço atualizada'
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar ordem de serviço' },
      { status: 500 }
    )
  }
}

// Excluir OS
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const user = await getCurrentUser()

    if (!user || !user.lojaId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Verificar se a OS pertence à loja
    const osExistente = await db.ordemServico.findFirst({
      where: { id, lojaId: user.lojaId }
    })

    if (!osExistente) {
      return NextResponse.json(
        { success: false, error: 'Ordem de serviço não encontrada' },
        { status: 404 }
      )
    }

    // Excluir registros relacionados primeiro
    await db.historicoOS.deleteMany({ where: { osId: id } })
    await db.fotoOS.deleteMany({ where: { osId: id } })
    
    // Excluir assinatura se existir
    if (osExistente.assinaturaId) {
      await db.assinatura.delete({ where: { id: osExistente.assinaturaId } })
    }

    // Excluir a OS
    await db.ordemServico.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: 'Ordem de serviço excluída com sucesso'
    })
  } catch (error) {
    console.error('Erro ao excluir OS:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir ordem de serviço' },
      { status: 500 }
    )
  }
}
