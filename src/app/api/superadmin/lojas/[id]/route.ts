import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, hashPassword } from '@/lib/auth/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params

    const loja = await db.loja.findUnique({
      where: { id },
      include: {
        faturas: {
          orderBy: { dataVencimento: 'desc' },
          take: 20
        }
      }
    })

    if (!loja) {
      return NextResponse.json(
        { success: false, error: 'Loja não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      loja
    })
  } catch (error) {
    console.error('Erro ao buscar loja:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar loja' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const data = await request.json()

    // Verificar se a loja existe
    const lojaExistente = await db.loja.findUnique({
      where: { id }
    })

    if (!lojaExistente) {
      return NextResponse.json(
        { success: false, error: 'Loja não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se o slug já existe em outra loja
    if (data.slug && data.slug !== lojaExistente.slug) {
      const slugExistente = await db.loja.findFirst({
        where: { 
          slug: data.slug,
          NOT: { id }
        }
      })
      if (slugExistente) {
        return NextResponse.json(
          { success: false, error: 'Este slug já está sendo usado por outra loja' },
          { status: 400 }
        )
      }
    }

    // Verificar se o email já existe em outra loja
    if (data.email && data.email !== lojaExistente.email) {
      const emailExistente = await db.loja.findFirst({
        where: { 
          email: data.email.toLowerCase(),
          NOT: { id }
        }
      })
      if (emailExistente) {
        return NextResponse.json(
          { success: false, error: 'Este email já está sendo usado por outra loja' },
          { status: 400 }
        )
      }
    }

    // Preparar dados para atualização
    const dadosAtualizacao: Record<string, unknown> = {
      nome: data.nome,
      slug: data.slug?.toLowerCase().trim(),
      responsavel: data.responsavel,
      telefone: data.telefone,
      whatsapp: data.whatsapp,
      email: data.email?.toLowerCase().trim(),
      cidade: data.cidade,
      estado: data.estado?.toUpperCase(),
      endereco: data.endereco,
      descricao: data.descricao || null,
      horarioAtendimento: data.horarioAtendimento || null,
      tiposServico: data.tiposServico || null,
      status: data.status
    }

    // Se data de expiração foi fornecida
    if (data.expiraEm) {
      dadosAtualizacao.expiraEm = new Date(data.expiraEm)
    }

    // Se uma nova senha foi fornecida, hashear
    if (data.senha && data.senha.trim() !== '') {
      dadosAtualizacao.senhaHash = await hashPassword(data.senha)
    }

    // Atualizar a loja
    const lojaAtualizada = await db.loja.update({
      where: { id },
      data: dadosAtualizacao
    })

    return NextResponse.json({
      success: true,
      message: 'Loja atualizada com sucesso!',
      loja: lojaAtualizada
    })

  } catch (error) {
    console.error('Erro ao atualizar loja:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar loja' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Verificar se a loja existe
    const loja = await db.loja.findUnique({
      where: { id },
      include: {
        _count: {
          select: { ordens: true, clientes: true }
        }
      }
    })

    if (!loja) {
      return NextResponse.json(
        { success: false, error: 'Loja não encontrada' },
        { status: 404 }
      )
    }

    // Excluir a loja (cascade vai excluir OS, clientes, etc.)
    await db.loja.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: `Loja "${loja.nome}" excluída com sucesso! (${loja._count.ordens} OS e ${loja._count.clientes} clientes removidos)`
    })

  } catch (error) {
    console.error('Erro ao excluir loja:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir loja' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.tipo !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { action } = await request.json()

    const loja = await db.loja.findUnique({
      where: { id }
    })

    if (!loja) {
      return NextResponse.json(
        { success: false, error: 'Loja não encontrada' },
        { status: 404 }
      )
    }

    let novoStatus = loja.status
    let message = ''
    let dadosAtualizacao: Record<string, unknown> = {}

    switch (action) {
      case 'aprovar':
        novoStatus = 'ativa'
        dadosAtualizacao = { status: novoStatus }
        message = 'Loja aprovada com sucesso!'
        break
      case 'bloquear':
        novoStatus = 'bloqueada'
        dadosAtualizacao = { 
          status: novoStatus,
          bloqueado: true,
          motivoBloqueio: 'Bloqueado pelo super admin'
        }
        message = 'Loja bloqueada com sucesso!'
        break
      case 'ativar':
        novoStatus = 'ativa'
        dadosAtualizacao = { 
          status: novoStatus,
          bloqueado: false,
          motivoBloqueio: null
        }
        message = 'Loja reativada com sucesso!'
        break
      case 'desbloquear':
        novoStatus = 'ativa'
        dadosAtualizacao = { 
          status: novoStatus,
          bloqueado: false,
          motivoBloqueio: null
        }
        message = 'Loja desbloqueada com sucesso!'
        break
      default:
        return NextResponse.json(
          { success: false, error: 'Ação inválida' },
          { status: 400 }
        )
    }

    const lojaAtualizada = await db.loja.update({
      where: { id },
      data: dadosAtualizacao
    })

    return NextResponse.json({
      success: true,
      message,
      loja: lojaAtualizada
    })

  } catch (error) {
    console.error('Erro ao processar ação:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao processar ação' },
      { status: 500 }
    )
  }
}
