'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Download, TrendingUp, TrendingDown, Clock, Users,
  DollarSign, Wrench, CheckCircle, AlertCircle, Calendar, BarChart3,
  PieChart, FileText, Package
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'
import { STATUS_LABELS, STATUS_COLORS, type StatusOS } from '@/types'
import { exportarRelatorioPDF, exportarRelatorioExcel } from '@/lib/export-utils'

interface RelatorioData {
  sucesso: boolean
  periodo: {
    inicio: string
    fim: string
  }
  loja?: {
    nome: string
  }
  resumo: {
    totalOs: number
    osEntregues: number
    osCanceladas: number
    faturamentoTotal: number
    ticketMedio: number
    tempoMedioReparo: number // em dias
    taxaConversao: number // percentual
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
}

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<RelatorioData | null>(null)
  const [periodo, setPeriodo] = useState('mes')

  useEffect(() => {
    carregarRelatorio()
  }, [periodo])

  const carregarRelatorio = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/painel/relatorios?periodo=${periodo}`)
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Erro ao carregar relatório:', err)
    } finally {
      setLoading(false)
    }
  }

  const exportarPDF = async () => {
    if (!data) return
    try {
      exportarRelatorioPDF(data)
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      alert('Erro ao exportar PDF')
    }
  }

  const exportarExcel = async () => {
    if (!data) return
    try {
      exportarRelatorioExcel(data)
    } catch (err) {
      console.error('Erro ao exportar Excel:', err)
      alert('Erro ao exportar Excel')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/painel" className="flex items-center gap-2">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-600" />
              <span className="text-xl font-bold text-slate-900">Relatórios</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-40">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semana">Última Semana</SelectItem>
                <SelectItem value="mes">Último Mês</SelectItem>
                <SelectItem value="trimestre">Último Trimestre</SelectItem>
                <SelectItem value="ano">Último Ano</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={exportarPDF}>
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            
            <Button variant="outline" onClick={exportarExcel}>
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {data?.sucesso ? (
          <div className="space-y-6">
            {/* Resumo Executivo */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-700">Faturamento</p>
                      <p className="text-2xl font-bold text-emerald-800">
                        {formatCurrency(data.resumo.faturamentoTotal)}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-100 rounded-xl">
                      <DollarSign className="w-6 h-6 text-emerald-700" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-sm text-emerald-600">
                    <TrendingUp className="w-4 h-4" />
                    <span>Período selecionado</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Total de OS</p>
                      <p className="text-2xl font-bold text-blue-800">{data.resumo.totalOs}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Wrench className="w-6 h-6 text-blue-700" />
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-blue-600">
                    {data.resumo.osEntregues} entregues
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Ticket Médio</p>
                      <p className="text-2xl font-bold text-purple-800">
                        {formatCurrency(data.resumo.ticketMedio)}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <FileText className="w-6 h-6 text-purple-700" />
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-purple-600">
                    Por ordem de serviço
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-700">Tempo Médio</p>
                      <p className="text-2xl font-bold text-amber-800">
                        {data.resumo.tempoMedioReparo > 0 
                          ? `${data.resumo.tempoMedioReparo.toFixed(1)} dias`
                          : '-'
                        }
                      </p>
                    </div>
                    <div className="p-3 bg-amber-100 rounded-xl">
                      <Clock className="w-6 h-6 text-amber-700" />
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-amber-600">
                    Para conclusão
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos de Status e Indicadores */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* OS por Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-emerald-600" />
                    OS por Status
                  </CardTitle>
                  <CardDescription>Distribuição das ordens de serviço</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.osPorStatus.map((item) => (
                      <div key={item.status} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-slate-700">
                              {STATUS_LABELS[item.status as StatusOS] || item.status}
                            </span>
                            <span className="text-sm font-bold text-slate-900">{item.count}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${STATUS_COLORS[item.status as StatusOS] || 'bg-slate-400'}`}
                              style={{ 
                                width: `${data.resumo.totalOs > 0 
                                  ? (item.count / data.resumo.totalOs) * 100 
                                  : 0}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Indicadores de Desempenho */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    Indicadores de Desempenho
                  </CardTitle>
                  <CardDescription>Métricas principais do período</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-700">Taxa de Conversão</span>
                      </div>
                      <span className="text-lg font-bold text-green-700">
                        {data.resumo.taxaConversao.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">OS Entregues</span>
                      </div>
                      <span className="text-lg font-bold text-blue-700">
                        {data.resumo.osEntregues}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="text-sm font-medium text-red-700">OS Canceladas</span>
                      </div>
                      <span className="text-lg font-bold text-red-700">
                        {data.resumo.osCanceladas}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-medium text-purple-700">Ticket Médio</span>
                      </div>
                      <span className="text-lg font-bold text-purple-700">
                        {formatCurrency(data.resumo.ticketMedio)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Clientes e Equipamentos */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Top Clientes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-600" />
                    Top Clientes
                  </CardTitle>
                  <CardDescription>Clientes com mais OS no período</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.topClientes.length > 0 ? (
                    <div className="space-y-3">
                      {data.topClientes.slice(0, 5).map((cliente, index) => (
                        <div key={cliente.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-amber-100 text-amber-700' :
                            index === 1 ? 'bg-slate-200 text-slate-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{cliente.nome}</p>
                            <p className="text-sm text-slate-500">{cliente.totalOs} OS</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-emerald-600">
                              {formatCurrency(cliente.totalGasto)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>Nenhum cliente no período</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Equipamentos Mais Reparados */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-emerald-600" />
                    Equipamentos Mais Reparados
                  </CardTitle>
                  <CardDescription>Ranking por quantidade de reparos</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.equipamentosMaisReparados.length > 0 ? (
                    <div className="space-y-3">
                      {data.equipamentosMaisReparados.slice(0, 5).map((item, index) => (
                        <div key={item.equipamento} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-amber-100 text-amber-700' :
                            index === 1 ? 'bg-slate-200 text-slate-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{item.equipamento}</p>
                          </div>
                          <Badge variant="secondary">{item.count} reparos</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>Nenhum equipamento no período</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Faturamento por Mês */}
            {data.faturamentoPorMes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-600" />
                    Faturamento por Mês
                  </CardTitle>
                  <CardDescription>Evolução do faturamento mensal</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 h-48">
                    {data.faturamentoPorMes.map((item, index) => {
                      const maxValue = Math.max(...data.faturamentoPorMes.map(i => i.valor))
                      const height = maxValue > 0 ? (item.valor / maxValue) * 100 : 0
                      
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1">
                          <div 
                            className="w-full bg-emerald-500 rounded-t transition-all hover:bg-emerald-600"
                            style={{ height: `${Math.max(height, 5)}%` }}
                            title={`${formatCurrency(item.valor)}`}
                          />
                          <span className="text-xs text-slate-500">{item.mes}</span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h2 className="text-xl font-semibold text-slate-700 mb-2">Nenhum dado disponível</h2>
            <p className="text-slate-500">Não há dados para o período selecionado</p>
          </div>
        )}
      </main>
    </div>
  )
}
