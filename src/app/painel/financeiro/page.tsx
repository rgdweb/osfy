'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CreditCard, QrCode, FileText, Copy, CheckCircle, Clock, AlertCircle,
  ArrowLeft, Calendar, DollarSign, Loader2, ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface Fatura {
  id: string
  numeroFatura: number
  valor: number
  status: string
  formaPagamento: string | null
  dataVencimento: string
  dataPagamento: string | null
  referencia: string | null
  codigoPix: string | null
  qrCodePix: string | null
  linkBoleto: string | null
  linkPagamento: string | null
}

interface FinanceiroData {
  success: boolean
  loja: {
    nome: string
    plano: string
    statusFinanceiro: string
    diaVencimento: number
    proximoVencimento: string | null
    diasAtraso: number
  }
  faturaAtual: Fatura | null
  historico: Fatura[]
}

export default function FinanceiroPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<FinanceiroData | null>(null)
  const [gerando, setGerando] = useState(false)
  const [formaPagamento, setFormaPagamento] = useState<'pix' | 'boleto' | 'cartao'>('pix')

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      const response = await fetch('/api/painel/financeiro')
      const result = await response.json()
      setData(result)
    } catch (err) {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const gerarPagamento = async (faturaId: string) => {
    setGerando(true)

    try {
      const response = await fetch('/api/painel/gerar-cobranca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faturaId,
          formaPagamento
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Pagamento gerado!')
        carregarDados() // Recarregar para mostrar dados do pagamento
      } else {
        toast.error(result.error || 'Erro ao gerar pagamento')
      }
    } catch (err) {
      toast.error('Erro ao gerar pagamento')
    } finally {
      setGerando(false)
    }
  }

  const copiarPix = async (codigo: string) => {
    await navigator.clipboard.writeText(codigo)
    toast.success('Código PIX copiado!')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paga':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm">
            <CheckCircle className="w-4 h-4" />
            Paga
          </span>
        )
      case 'pendente':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-sm">
            <Clock className="w-4 h-4" />
            Pendente
          </span>
        )
      case 'atrasada':
      case 'atrasado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            Atrasada
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-sm">
            {status}
          </span>
        )
    }
  }

  const getStatusFinanceiroColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'text-emerald-600 bg-emerald-50'
      case 'pendente': return 'text-amber-600 bg-amber-50'
      case 'atrasado': return 'text-red-600 bg-red-50'
      case 'restrito': return 'text-orange-600 bg-orange-50'
      case 'bloqueado': return 'text-red-700 bg-red-100'
      default: return 'text-slate-600 bg-slate-50'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/painel" className="flex items-center gap-2">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
            <span className="text-xl font-bold text-slate-900">Financeiro</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Resumo */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Plano</p>
                    <p className="text-lg font-semibold text-slate-900 capitalize">
                      {data?.loja.plano || 'Mensal'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Vencimento</p>
                    <p className="text-lg font-semibold text-slate-900">
                      Dia {data?.loja.diaVencimento || 10}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getStatusFinanceiroColor(data?.loja.statusFinanceiro || 'ativo')}`}>
                    {data?.loja.statusFinanceiro === 'ativo' ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <AlertCircle className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Status</p>
                    <p className="text-lg font-semibold capitalize">
                      {data?.loja.statusFinanceiro || 'Ativo'}
                      {data?.loja.diasAtraso ? ` (${data.loja.diasAtraso} dias)` : ''}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fatura Atual */}
          {data?.faturaAtual && (
            <Card className="border-2 border-amber-200">
              <CardHeader className="bg-amber-50 border-b border-amber-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-amber-800">Fatura Atual</CardTitle>
                    <CardDescription>
                      Fatura #{data.faturaAtual.numeroFatura} • {data.faturaAtual.referencia}
                    </CardDescription>
                  </div>
                  {getStatusBadge(data.faturaAtual.status)}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-slate-500">Valor</p>
                    <p className="text-3xl font-bold text-slate-900">
                      R$ {data.faturaAtual.valor.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Vencimento</p>
                    <p className="text-lg text-slate-900">
                      {new Date(data.faturaAtual.dataVencimento).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                {/* Se já tem pagamento gerado */}
                {data.faturaAtual.qrCodePix ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600 text-center">Pagamento já gerado</p>
                    
                    {data.faturaAtual.qrCodePix && (
                      <div className="text-center bg-slate-50 rounded-xl p-4">
                        <img
                          src={`data:image/png;base64,${data.faturaAtual.qrCodePix}`}
                          alt="QR Code PIX"
                          className="mx-auto w-40 h-40"
                        />
                        {data.faturaAtual.codigoPix && (
                          <Button
                            onClick={() => copiarPix(data.faturaAtual.codigoPix!)}
                            variant="outline"
                            className="mt-2"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar Código PIX
                          </Button>
                        )}
                      </div>
                    )}

                    {data.faturaAtual.linkBoleto && (
                      <Button
                        onClick={() => window.open(data.faturaAtual.linkBoleto!, '_blank')}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Abrir Boleto
                      </Button>
                    )}

                    {data.faturaAtual.linkPagamento && (
                      <Button
                        onClick={() => window.open(data.faturaAtual.linkPagamento!, '_blank')}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Pagar Online
                      </Button>
                    )}
                  </div>
                ) : (
                  /* Gerar pagamento */
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600 text-center">
                      Escolha como pagar e clique para gerar:
                    </p>

                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => setFormaPagamento('pix')}
                        className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                          formaPagamento === 'pix' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'
                        }`}
                      >
                        <QrCode className={`w-6 h-6 mb-1 ${formaPagamento === 'pix' ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="text-sm font-medium">PIX</span>
                      </button>

                      <button
                        onClick={() => setFormaPagamento('boleto')}
                        className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                          formaPagamento === 'boleto' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                        }`}
                      >
                        <FileText className={`w-6 h-6 mb-1 ${formaPagamento === 'boleto' ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="text-sm font-medium">Boleto</span>
                      </button>

                      <button
                        onClick={() => setFormaPagamento('cartao')}
                        className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                          formaPagamento === 'cartao' ? 'border-purple-500 bg-purple-50' : 'border-slate-200'
                        }`}
                      >
                        <CreditCard className={`w-6 h-6 mb-1 ${formaPagamento === 'cartao' ? 'text-purple-600' : 'text-slate-400'}`} />
                        <span className="text-sm font-medium">Cartão</span>
                      </button>
                    </div>

                    <Button
                      onClick={() => gerarPagamento(data.faturaAtual!.id)}
                      disabled={gerando}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 h-12"
                    >
                      {gerando ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5 mr-2" />
                          Gerar Pagamento
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Histórico */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Faturas</CardTitle>
              <CardDescription>Todas as suas faturas</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.historico && data.historico.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {data.historico.map((fatura) => (
                    <div key={fatura.id} className="py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">
                          Fatura #{fatura.numeroFatura}
                        </p>
                        <p className="text-sm text-slate-500">
                          {fatura.referencia} • {fatura.formaPagamento || 'Pendente'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">
                          R$ {fatura.valor.toFixed(2).replace('.', ',')}
                        </p>
                        {getStatusBadge(fatura.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>Nenhuma fatura encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  )
}
