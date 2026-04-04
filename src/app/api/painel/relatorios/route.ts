import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || !user.lojaId) {
      return NextResponse.json(
        { sucesso: false, erro: 'Não autorizado' },
        { status: 401 }
      )
    }

    const lojaId = user.lojaId
    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo') || 'mes'

    // Calcular datas do período
    const hoje = new Date()
    let dataInicio = new Date()

    switch (periodo) {
      case 'semana':
        dataInicio.setDate(hoje.getDate() - 7)
        break
      case 'mes':
        dataInicio.setMonth(hoje.getMonth() - 1)
        break
      case 'trimestre':
        dataInicio.setMonth(hoje.getMonth() - 3)
        break
      case 'ano':
        dataInicio.setFullYear(hoje.getFullYear() - 1)
        break
      default:
        dataInicio.setMonth(hoje.getMonth() - 1)
    }

    dataInicio.setHours(0, 0, 0, 0)

    // Buscar OS do período
    const osPeriodo = await db.ordemServico.findMany({
      where: {
        lojaId,
        dataCriacao: {
          gte: dataInicio,
          lte: hoje
        }
      },
      include: {
        cliente: {
          select: { id: true, nome: true, telefone: true }
        }
      }
    })

    // Buscar nome da loja
    const loja = await db.loja.findUnique({
      where: { id: lojaId },
      select: { nome: true }
    })

    // Calcular métricas
    const totalOs = osPeriodo.length
    const osEntregues = osPeriodo.filter(os => os.status === 'entregue').length
    const osCanceladas = osPeriodo.filter(os => os.status === 'cancelado').length
    
    // Faturamento total (OS pagas)
    const faturamentoTotal = osPeriodo
      .filter(os => os.pago)
      .reduce((acc, os) => {
        const valor = (os.orcamento || 0) + (os.valorServico || 0) + (os.valorPecas || 0)
        return acc + valor
      }, 0)

    // Ticket médio
    const osPagas = osPeriodo.filter(os => os.pago)
    const ticketMedio = osPagas.length > 0 ? faturamentoTotal / osPagas.length : 0

    // Tempo médio de reparo (dias entre criação e entrega)
    const osEntreguesComData = osPeriodo.filter(os => os.status === 'entregue' && os.atualizadoEm)
    let tempoMedioReparo = 0
    if (osEntreguesComData.length > 0) {
      const tempos = osEntreguesComData.map(os => {
        const diff = new Date(os.atualizadoEm!).getTime() - new Date(os.dataCriacao).getTime()
        return diff / (1000 * 60 * 60 * 24) // dias
      })
      tempoMedioReparo = tempos.reduce((a, b) => a + b, 0) / tempos.length
    }

    // Taxa de conversão
    const taxaConversao = totalOs > 0 ? (osEntregues / totalOs) * 100 : 0

    // OS por status
    const statusCounts: Record<string, number> = {}
    osPeriodo.forEach(os => {
      statusCounts[os.status] = (statusCounts[os.status] || 0) + 1
    })
    const osPorStatus = Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)

    // Faturamento por mês (últimos 12 meses)
    const faturamentoPorMes = []
    for (let i = 11; i >= 0; i--) {
      const inicioMes = new Date()
      inicioMes.setMonth(inicioMes.getMonth() - i)
      inicioMes.setDate(1)
      inicioMes.setHours(0, 0, 0, 0)
      
      const fimMes = new Date(inicioMes)
      fimMes.setMonth(fimMes.getMonth() + 1)
      fimMes.setDate(0)
      fimMes.setHours(23, 59, 59, 999)

      const osMes = await db.ordemServico.findMany({
        where: {
          lojaId,
          pago: true,
          atualizadoEm: {
            gte: inicioMes,
            lte: fimMes
          }
        },
        select: {
          orcamento: true,
          valorServico: true,
          valorPecas: true
        }
      })

      const valorMes = osMes.reduce((acc, os) => {
        return acc + (os.orcamento || 0) + (os.valorServico || 0) + (os.valorPecas || 0)
      }, 0)

      if (valorMes > 0) {
        faturamentoPorMes.push({
          mes: inicioMes.toLocaleDateString('pt-BR', { month: 'short' }),
          valor: valorMes
        })
      }
    }

    // Top clientes
    const clientesMap: Record<string, {
      id: string
      nome: string
      telefone: string
      totalOs: number
      totalGasto: number
    }> = {}
    
    osPeriodo.forEach(os => {
      const clienteId = os.clienteId
      if (!clientesMap[clienteId]) {
        clientesMap[clienteId] = {
          id: clienteId,
          nome: os.cliente.nome,
          telefone: os.cliente.telefone,
          totalOs: 0,
          totalGasto: 0
        }
      }
      clientesMap[clienteId].totalOs++
      if (os.pago) {
        const valor = (os.orcamento || 0) + (os.valorServico || 0) + (os.valorPecas || 0)
        clientesMap[clienteId].totalGasto += valor
      }
    })

    const topClientes = Object.values(clientesMap)
      .sort((a, b) => b.totalGasto - a.totalGasto)
      .slice(0, 10)

    // Equipamentos mais reparados
    const equipamentosMap: Record<string, number> = {}
    osPeriodo.forEach(os => {
      const equip = os.equipamento.toLowerCase().trim()
      equipamentosMap[equip] = (equipamentosMap[equip] || 0) + 1
    })

    const equipamentosMaisReparados = Object.entries(equipamentosMap)
      .map(([equipamento, count]) => ({ 
        equipamento: equipamento.charAt(0).toUpperCase() + equipamento.slice(1), 
        count 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // OS por dia (últimos 30 dias)
    const osPorDia = []
    for (let i = 29; i >= 0; i--) {
      const dia = new Date()
      dia.setDate(dia.getDate() - i)
      dia.setHours(0, 0, 0, 0)
      
      const fimDia = new Date(dia)
      fimDia.setHours(23, 59, 59, 999)

      const count = osPeriodo.filter(os => {
        const dataCriacao = new Date(os.dataCriacao)
        return dataCriacao >= dia && dataCriacao <= fimDia
      }).length

      if (count > 0) {
        osPorDia.push({
          data: dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          count
        })
      }
    }

    return NextResponse.json({
      sucesso: true,
      periodo: {
        inicio: dataInicio.toISOString(),
        fim: hoje.toISOString()
      },
      loja: {
        nome: loja?.nome || 'Loja'
      },
      resumo: {
        totalOs,
        osEntregues,
        osCanceladas,
        faturamentoTotal,
        ticketMedio,
        tempoMedioReparo,
        taxaConversao
      },
      osPorStatus,
      osPorDia,
      faturamentoPorMes,
      topClientes,
      equipamentosMaisReparados
    })

  } catch (error) {
    console.error('Erro ao gerar relatório:', error)
    return NextResponse.json(
      { sucesso: false, erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
