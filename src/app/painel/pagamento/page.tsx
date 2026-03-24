'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CreditCard, QrCode, FileText, Copy, ExternalLink, CheckCircle, AlertTriangle,
  Clock, DollarSign, Calendar, ArrowLeft, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface StatusPagamento {
  success: boolean
  status: string
  loja: {
    nome: string
    plano: string
    precoPlano: number
  }
  trial: {
    ativo: boolean
    diasRestantes: number
    expirado: boolean
  }
  pagamento: {
    pendente: boolean
    atrasado: boolean
    diasAtraso: number
    valorOriginal: number
    valorComJuros: number
    dataVencimento: string | null
    fatura: {
      id: string
      codigoPix: string | null
      qrCodePix: string | null
      linkBoleto: string | null
      linkPagamento: string | null
    } | null
  }
  valores: {
    mensalidade: number
    anuidade: number
  }
  historico: Array<{
    id: string
    referencia: string
    valor: number
    dataPagamento: string
    formaPagamento: string
  }>
}

export default function PagamentoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [status, setStatus] = useState<StatusPagamento | null>(null)
  const [tipoPlano, setTipoPlano] = useState<'mensal' | 'anual'>('mensal')

  useEffect(() => {
    carregarStatus()
  }, [])

  const carregarStatus = async () => {
    try {
      const response = await fetch('/api/painel/status-pagamento')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      toast.error('Erro ao carregar status de pagamento')
    } finally {
      setLoading(false)
    }
  }

  const gerarCobranca = async () => {
    setGerando(true)
    try {
      const response = await fetch('/api/painel/gerar-cobranca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoPlano,
          formaPagamento: 'link'
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Cobrança gerada com sucesso!')
        carregarStatus()
      } else {
        toast.error(data.error || 'Erro ao gerar cobrança')
      }
    } catch (error) {
      toast.error('Erro ao gerar cobrança')
    } finally {
      setGerando(false)
    }
  }

  const copiarPix = () => {
    if (status?.pagamento.fatura?.codigoPix) {
      navigator.clipboard.writeText(status.pagamento.fatura.codigoPix)
      toast.success('Código PIX copiado!')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  // Se está em trial
  const emTrial = status?.trial.ativo
  const trialExpirado = status?.trial.expirado
  const temPagamentoPendente = status?.pagamento.pendente
  const emAtraso = status?.pagamento.atrasado
  const planoAtivo = status?.status === 'ativo' && !emTrial && !temPagamentoPendente

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/painel">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pagamento</h1>
          <p className="text-slate-500">Gerencie sua assinatura</p>
        </div>
      </div>

      {/* Status Banner */}
      {planoAtivo && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Plano Ativo</h2>
              <p className="text-emerald-100">
                Sua assinatura está em dia. {status?.loja.plano === 'anual' ? 'Plano Anual' : 'Plano Mensal'} ativo.
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">
                {status?.loja.plano === 'anual' ? 'Anual' : 'Mensal'}
              </p>
              <p className="text-emerald-100 text-sm">em dia</p>
            </div>
          </div>
        </div>
      )}

      {emTrial && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Período de Teste Gratuito</h2>
              <p className="text-emerald-100">
                Você ainda tem <strong>{status?.trial.diasRestantes} dias</strong> grátis para experimentar o sistema
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{status?.trial.diasRestantes}</p>
              <p className="text-emerald-100 text-sm">dias restantes</p>
            </div>
          </div>
        </div>
      )}

      {trialExpirado && !temPagamentoPendente && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Período de Teste Encerrado</h2>
              <p className="text-amber-100">
                Seus 7 dias grátis acabaram. Escolha um plano para continuar usando o sistema.
              </p>
            </div>
          </div>
        </div>
      )}

      {emAtraso && (
        <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Pagamento em Atraso</h2>
              <p className="text-red-100">
                Seu pagamento está atrasado há <strong>{status?.pagamento.diasAtraso} dias</strong>.
                Regularize para evitar bloqueio do sistema.
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-red-100">Valor atualizado</p>
              <p className="text-3xl font-bold">
                R$ {status?.pagamento.valorComJuros.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
        </div>
      )}

      {temPagamentoPendente && !emAtraso && !emTrial && (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Pagamento Pendente</h2>
              <p className="text-blue-100">
                Você tem uma fatura com vencimento em{' '}
                <strong>{new Date(status?.pagamento.dataVencimento || '').toLocaleDateString('pt-BR')}</strong>
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">
                R$ {status?.pagamento.valorOriginal.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Já tem fatura pendente - mostrar pagamento */}
      {temPagamentoPendente && status?.pagamento.fatura && (
        <Card className="border-emerald-200 overflow-hidden shadow-lg">
          <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
            <CardTitle className="flex items-center gap-2 text-white">
              <CreditCard className="w-5 h-5" />
              Realizar Pagamento
            </CardTitle>
            <CardDescription className="text-emerald-100">
              Clique no botão abaixo para pagar com PIX, Cartão ou Boleto
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center">
              {/* Valor */}
              <div className="mb-6">
                <p className="text-sm text-slate-500 mb-1">Valor a pagar</p>
                <p className="text-4xl font-bold text-emerald-600">
                  R$ {status?.pagamento.valorOriginal.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Plano {status?.loja.plano === 'anual' ? 'Anual' : 'Mensal'}
                </p>
              </div>

              {/* PIX QR Code se disponível */}
              {status.pagamento.fatura.qrCodePix && (
                <div className="bg-slate-50 rounded-xl p-6 mb-6">
                  <p className="text-sm text-slate-600 mb-4">Ou pague com PIX:</p>
                  <img
                    src={`data:image/png;base64,${status.pagamento.fatura.qrCodePix}`}
                    alt="QR Code PIX"
                    className="mx-auto w-48 h-48 rounded-lg shadow"
                  />
                  {status.pagamento.fatura.codigoPix && (
                    <Button
                      onClick={copiarPix}
                      variant="outline"
                      className="mt-4"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Código PIX
                    </Button>
                  )}
                </div>
              )}

              {/* Botão Principal - Link Mercado Pago */}
              {status.pagamento.fatura.linkPagamento && (
                <Button
                  onClick={() => window.open(status.pagamento.fatura?.linkPagamento || '', '_blank')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-14 text-lg font-semibold shadow-lg"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pagar Agora - PIX, Cartão ou Boleto
                  <ExternalLink className="w-5 h-5 ml-2" />
                </Button>
              )}

              <p className="text-xs text-slate-400 mt-4">
                O pagamento é processado pelo Mercado Pago. Após a confirmação, seu acesso será liberado automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Escolher plano - APENAS se NÃO tem fatura pendente */}
      {!temPagamentoPendente && !emTrial && !planoAtivo && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Escolha seu Plano
            </CardTitle>
            <CardDescription>
              Selecione o plano que melhor se adapta à sua necessidade
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {/* Mensal */}
              <button
                onClick={() => setTipoPlano('mensal')}
                className={`relative p-6 rounded-xl border-2 text-left transition-all ${
                  tipoPlano === 'mensal'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {tipoPlano === 'mensal' && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                )}
                <p className="font-semibold text-lg mb-1">Mensal</p>
                <p className="text-4xl font-bold text-slate-900">
                  R$ {status?.valores.mensalidade.toFixed(2).replace('.', ',')}
                  <span className="text-base font-normal text-slate-500">/mês</span>
                </p>
                <p className="text-sm text-slate-500 mt-3">
                  Flexibilidade mensal, cancele quando quiser
                </p>
              </button>

              {/* Anual */}
              <button
                onClick={() => setTipoPlano('anual')}
                className={`relative p-6 rounded-xl border-2 text-left transition-all ${
                  tipoPlano === 'anual'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="absolute -top-2 -right-2 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  2 MESES GRÁTIS
                </div>
                {tipoPlano === 'anual' && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                )}
                <p className="font-semibold text-lg mb-1">Anual</p>
                <p className="text-4xl font-bold text-slate-900">
                  R$ {status?.valores.anuidade.toFixed(2).replace('.', ',')}
                  <span className="text-base font-normal text-slate-500">/ano</span>
                </p>
                <p className="text-sm text-slate-500 mt-3">
                  Economize R$ {(status?.valores.mensalidade! * 12 - status?.valores.anuidade!).toFixed(0).replace('.', ',')} por ano
                </p>
              </button>
            </div>

            <Button
              onClick={gerarCobranca}
              className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg"
              disabled={gerando}
            >
              {gerando ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Gerando cobrança...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Gerar Cobrança - R$ {tipoPlano === 'anual'
                    ? status?.valores.anuidade.toFixed(2).replace('.', ',')
                    : status?.valores.mensalidade.toFixed(2).replace('.', ',')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Pagamentos */}
      {status?.historico && status.historico.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.historico.map((pag) => (
                <div
                  key={pag.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-medium">{pag.referencia}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(pag.dataPagamento).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">
                      R$ {pag.valor.toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-xs text-slate-500 uppercase">{pag.formaPagamento}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
