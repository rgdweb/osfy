import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'

// Verificar e criar notificações de faturas atrasadas
async function verificarFaturasAtrasadas(lojaId: string | null) {
  const agora = new Date()
  
  // Buscar faturas atrasadas (vencidas há mais de 1 dia e sem notificação recente)
  const ontem = new Date(agora)
  ontem.setDate(ontem.getDate() - 1)
  
  const faturasAtrasadas = await db.fatura.findMany({
    where: {
      status: 'pendente',
      dataVencimento: { lt: ontem },
      lojaId: lojaId || undefined,
      // Não notificar a mesma fatura todo dia - verificar se já tem notificação nos últimos 3 dias
      NOT: {
        loja: {
          notificacoes: {
            some: {
              tipo: 'mensalidade_atrasada',
              criadoEm: { gte: new Date(agora.getTime() - 3 * 24 * 60 * 60 * 1000) }
            }
          }
        }
      }
    },
    include: {
      loja: true
    },
    take: 10
  })
  
  // Criar notificações para cada fatura atrasada
  for (const fatura of faturasAtrasadas) {
    const diasAtraso = Math.floor((agora.getTime() - new Date(fatura.dataVencimento).getTime()) / (1000 * 60 * 60 * 24))
    
    await db.notificacao.create({
      data: {
        tipo: 'mensalidade_atrasada',
        titulo: 'Mensalidade Atrasada!',
        mensagem: `${fatura.loja.nome} está com fatura de R$ ${fatura.valor.toFixed(2)} atrasada há ${diasAtraso} dias`,
        lojaId: fatura.lojaId,
        referenciaId: fatura.id,
        referenciaTipo: 'fatura'
      }
    })
  }
}

// Listar notificações
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar faturas atrasadas antes de buscar notificações
    // Para superadmin, verifica todas; para loja, verifica só a dela
    await verificarFaturasAtrasadas(user.tipo === 'superadmin' ? null : user.lojaId)

    let notificacoes

    if (user.tipo === 'superadmin') {
      // Superadmin vê notificações sem lojaId (globais) e de nova loja
      notificacoes = await db.notificacao.findMany({
        where: {
          lojaId: null
        },
        orderBy: { criadoEm: 'desc' },
        take: 50
      })
    } else {
      // Loja vê notificações específicas dela
      notificacoes = await db.notificacao.findMany({
        where: {
          lojaId: user.lojaId
        },
        orderBy: { criadoEm: 'desc' },
        take: 50
      })
    }

    // Contar não lidas
    const naoLidas = notificacoes.filter(n => !n.lida).length

    return NextResponse.json({
      success: true,
      notificacoes,
      naoLidas
    })
  } catch (error) {
    console.error('Erro ao buscar notificações:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar notificações' },
      { status: 500 }
    )
  }
}

// Marcar todas como lidas
export async function PUT() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    if (user.tipo === 'superadmin') {
      await db.notificacao.updateMany({
        where: {
          lojaId: null,
          lida: false
        },
        data: { lida: true }
      })
    } else {
      await db.notificacao.updateMany({
        where: {
          lojaId: user.lojaId,
          lida: false
        },
        data: { lida: true }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao marcar notificações:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao marcar notificações' },
      { status: 500 }
    )
  }
}
