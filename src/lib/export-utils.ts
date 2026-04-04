/**
 * Utilitários para exportação de relatórios
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { formatCurrency, formatDate } from './utils'
import { STATUS_LABELS, type StatusOS } from '@/types'

interface RelatorioData {
  sucesso: boolean
  periodo: {
    inicio: string
    fim: string
  }
  resumo: {
    totalOs: number
    osEntregues: number
    osCanceladas: number
    faturamentoTotal: number
    ticketMedio: number
    tempoMedioReparo: number
    taxaConversao: number
  }
  osPorStatus: Array<{ status: string; count: number }>
  osPorDia: Array<{ data: string; count: number; valor: number }>
  faturamentoPorMes: Array<{ mes: string; valor: number }>
  topClientes: Array<{
    id: string
    nome: string
    telefone: string
    totalOs: number
    totalGasto: number
  }>
  equipamentosMaisReparados: Array<{
    equipamento: string
    count: number
  }>
  loja?: {
    nome: string
  }
}

/**
 * Exporta relatório para PDF
 */
export function exportarRelatorioPDF(data: RelatorioData, nomeArquivo?: string) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Título
  doc.setFontSize(20)
  doc.setTextColor(5, 150, 105) // emerald-600
  doc.text('Relatório OSFY', pageWidth / 2, 20, { align: 'center' })
  
  // Nome da loja
  if (data.loja?.nome) {
    doc.setFontSize(12)
    doc.setTextColor(100, 116, 139) // slate-500
    doc.text(data.loja.nome, pageWidth / 2, 28, { align: 'center' })
  }
  
  // Período
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text(
    `Período: ${formatDate(data.periodo.inicio)} a ${formatDate(data.periodo.fim)}`,
    pageWidth / 2, 36, { align: 'center' }
  )
  
  // Linha separadora
  doc.setDrawColor(226, 232, 240) // slate-200
  doc.line(14, 42, pageWidth - 14, 42)
  
  // Resumo Executivo
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42) // slate-900
  doc.text('Resumo Executivo', 14, 52)
  
  const resumoData = [
    ['Faturamento Total', formatCurrency(data.resumo.faturamentoTotal)],
    ['Total de OS', data.resumo.totalOs.toString()],
    ['OS Entregues', data.resumo.osEntregues.toString()],
    ['OS Canceladas', data.resumo.osCanceladas.toString()],
    ['Ticket Médio', formatCurrency(data.resumo.ticketMedio)],
    ['Tempo Médio de Reparo', `${data.resumo.tempoMedioReparo.toFixed(1)} dias`],
    ['Taxa de Conversão', `${data.resumo.taxaConversao.toFixed(1)}%`],
  ]
  
  autoTable(doc, {
    startY: 56,
    head: [['Indicador', 'Valor']],
    body: resumoData,
    theme: 'striped',
    headStyles: {
      fillColor: [5, 150, 105], // emerald-600
      textColor: 255,
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 60, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  })
  
  // OS por Status
  const currentY = (doc as any).lastAutoTable.finalY + 15
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text('OS por Status', 14, currentY)
  
  const statusData = data.osPorStatus.map(item => [
    STATUS_LABELS[item.status as StatusOS] || item.status,
    item.count.toString(),
    data.resumo.totalOs > 0 
      ? `${((item.count / data.resumo.totalOs) * 100).toFixed(1)}%` 
      : '0%'
  ])
  
  autoTable(doc, {
    startY: currentY + 4,
    head: [['Status', 'Quantidade', 'Percentual']],
    body: statusData,
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246], // blue-500
      textColor: 255,
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
    },
    margin: { left: 14, right: 14 },
  })
  
  // Top Clientes
  const currentY2 = (doc as any).lastAutoTable.finalY + 15
  if (data.topClientes.length > 0) {
    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.text('Top Clientes', 14, currentY2)
    
    const clientesData = data.topClientes.slice(0, 10).map((cliente, index) => [
      (index + 1).toString(),
      cliente.nome,
      cliente.telefone,
      cliente.totalOs.toString(),
      formatCurrency(cliente.totalGasto),
    ])
    
    autoTable(doc, {
      startY: currentY2 + 4,
      head: [['#', 'Nome', 'Telefone', 'Total OS', 'Total Gasto']],
      body: clientesData,
      theme: 'striped',
      headStyles: {
        fillColor: [139, 92, 246], // violet-500
        textColor: 255,
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
      },
      margin: { left: 14, right: 14 },
    })
  }
  
  // Equipamentos Mais Reparados
  const currentY3 = (doc as any).lastAutoTable.finalY + 15
  if (data.equipamentosMaisReparados.length > 0) {
    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.text('Equipamentos Mais Reparados', 14, currentY3)
    
    const equipData = data.equipamentosMaisReparados.slice(0, 10).map((item, index) => [
      (index + 1).toString(),
      item.equipamento,
      `${item.count} reparos`,
    ])
    
    autoTable(doc, {
      startY: currentY3 + 4,
      head: [['#', 'Equipamento', 'Quantidade']],
      body: equipData,
      theme: 'striped',
      headStyles: {
        fillColor: [245, 158, 11], // amber-500
        textColor: 255,
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 10,
      },
      margin: { left: 14, right: 14 },
    })
  }
  
  // Faturamento por Mês
  const currentY4 = (doc as any).lastAutoTable.finalY + 15
  if (data.faturamentoPorMes.length > 0) {
    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.text('Faturamento por Mês', 14, currentY4)
    
    const fatData = data.faturamentoPorMes.map(item => [
      item.mes,
      formatCurrency(item.valor),
    ])
    
    autoTable(doc, {
      startY: currentY4 + 4,
      head: [['Mês', 'Faturamento']],
      body: fatData,
      theme: 'striped',
      headStyles: {
        fillColor: [5, 150, 105], // emerald-600
        textColor: 255,
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 10,
      },
      margin: { left: 14, right: 14 },
    })
  }
  
  // Rodapé
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184) // slate-400
    doc.text(
      `Gerado em ${new Date().toLocaleString('pt-BR')} | Página ${i} de ${pageCount}`,
      pageWidth / 2, doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }
  
  // Salvar arquivo
  const fileName = nomeArquivo || `relatorio-osfy-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

/**
 * Exporta relatório para Excel
 */
export function exportarRelatorioExcel(data: RelatorioData, nomeArquivo?: string) {
  const workbook = XLSX.utils.book_new()
  
  // Planilha: Resumo
  const resumoData = [
    ['RELATÓRIO OSFY'],
    ['Período:', formatDate(data.periodo.inicio), 'a', formatDate(data.periodo.fim)],
    [],
    ['RESUMO EXECUTIVO'],
    ['Indicador', 'Valor'],
    ['Faturamento Total', data.resumo.faturamentoTotal],
    ['Total de OS', data.resumo.totalOs],
    ['OS Entregues', data.resumo.osEntregues],
    ['OS Canceladas', data.resumo.osCanceladas],
    ['Ticket Médio', data.resumo.ticketMedio],
    ['Tempo Médio de Reparo (dias)', data.resumo.tempoMedioReparo],
    ['Taxa de Conversão (%)', data.resumo.taxaConversao],
  ]
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData)
  wsResumo['!cols'] = [{ wch: 30 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(workbook, wsResumo, 'Resumo')
  
  // Planilha: OS por Status
  const statusData = [
    ['STATUS', 'QUANTIDADE', 'PERCENTUAL'],
    ...data.osPorStatus.map(item => [
      STATUS_LABELS[item.status as StatusOS] || item.status,
      item.count,
      data.resumo.totalOs > 0 
        ? ((item.count / data.resumo.totalOs) * 100).toFixed(1) 
        : '0'
    ])
  ]
  const wsStatus = XLSX.utils.aoa_to_sheet(statusData)
  wsStatus['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(workbook, wsStatus, 'OS por Status')
  
  // Planilha: Top Clientes
  if (data.topClientes.length > 0) {
    const clientesData = [
      ['#', 'NOME', 'TELEFONE', 'TOTAL OS', 'TOTAL GASTO'],
      ...data.topClientes.map((cliente, index) => [
        index + 1,
        cliente.nome,
        cliente.telefone,
        cliente.totalOs,
        cliente.totalGasto,
      ])
    ]
    const wsClientes = XLSX.utils.aoa_to_sheet(clientesData)
    wsClientes['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(workbook, wsClientes, 'Top Clientes')
  }
  
  // Planilha: Equipamentos
  if (data.equipamentosMaisReparados.length > 0) {
    const equipData = [
      ['#', 'EQUIPAMENTO', 'QUANTIDADE'],
      ...data.equipamentosMaisReparados.map((item, index) => [
        index + 1,
        item.equipamento,
        item.count,
      ])
    ]
    const wsEquip = XLSX.utils.aoa_to_sheet(equipData)
    wsEquip['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(workbook, wsEquip, 'Equipamentos')
  }
  
  // Planilha: Faturamento por Mês
  if (data.faturamentoPorMes.length > 0) {
    const fatData = [
      ['MÊS', 'FATURAMENTO'],
      ...data.faturamentoPorMes.map(item => [
        item.mes,
        item.valor,
      ])
    ]
    const wsFat = XLSX.utils.aoa_to_sheet(fatData)
    wsFat['!cols'] = [{ wch: 15 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(workbook, wsFat, 'Faturamento Mensal')
  }
  
  // Planilha: OS por Dia
  if (data.osPorDia.length > 0) {
    const diaData = [
      ['DATA', 'QUANTIDADE', 'VALOR'],
      ...data.osPorDia.map(item => [
        formatDate(item.data),
        item.count,
        item.valor,
      ])
    ]
    const wsDia = XLSX.utils.aoa_to_sheet(diaData)
    wsDia['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(workbook, wsDia, 'OS por Dia')
  }
  
  // Gerar arquivo
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  
  const fileName = nomeArquivo || `relatorio-osfy-${new Date().toISOString().split('T')[0]}.xlsx`
  saveAs(blob, fileName)
}

/**
 * Exporta lista de OS para Excel
 */
export function exportarOSExcel(listaOS: Array<{
  codigoOs: string
  cliente: { nome: string; telefone: string }
  equipamento: string
  status: string
  valor: number
  createdAt: string | Date
}>, nomeArquivo?: string) {
  const data = [
    ['CÓDIGO', 'CLIENTE', 'TELEFONE', 'EQUIPAMENTO', 'STATUS', 'VALOR', 'DATA'],
    ...listaOS.map(os => [
      os.codigoOs,
      os.cliente.nome,
      os.cliente.telefone,
      os.equipamento,
      STATUS_LABELS[os.status as StatusOS] || os.status,
      os.valor || 0,
      formatDate(os.createdAt),
    ])
  ]
  
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  worksheet['!cols'] = [
    { wch: 10 }, // CÓDIGO
    { wch: 30 }, // CLIENTE
    { wch: 18 }, // TELEFONE
    { wch: 25 }, // EQUIPAMENTO
    { wch: 20 }, // STATUS
    { wch: 15 }, // VALOR
    { wch: 12 }, // DATA
  ]
  
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ordens de Serviço')
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  
  const fileName = nomeArquivo || `ordens-servico-${new Date().toISOString().split('T')[0]}.xlsx`
  saveAs(blob, fileName)
}
