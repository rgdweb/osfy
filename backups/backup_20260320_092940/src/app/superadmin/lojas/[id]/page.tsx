'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Store, Mail, Phone, MapPin, Calendar, Gift, CreditCard,
  Clock, CheckCircle, XCircle, AlertTriangle, Loader2, Settings, Trash2,
  X, Crown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Loja {
  id: string
  nome: string
  slug: string
  responsavel: string
  email: string
  telefone: string
  whatsapp: string
  cidade: string
  estado: string
  endereco: string
  descricao: string | null
  status: string
  plano: string
  precoPlano: number
  trialAte: string | null
  trialUsado: boolean
  criadoEm: string
  expiraEm: string | null
  faturas: Array<{
    id: string
    numeroFatura: number
    valor: number
    status: string
    dataVencimento: string
    dataPagamento: string | null
  }>
}

export default function LojaDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loja, setLoja] = useState<Loja | null>(null)
  const [processando, setProcessando] = useState(false)
  const [dataExpiracao, setDataExpiracao] = useState('')

  useEffect(() => {
    carregarLoja()
  }, [params.id])

  const carregarLoja = async () => {
    try {
      const response = await fetch(`/api/superadmin/lojas/${params.id}`)
      const data = await response.json()

      if (data.success) {
        setLoja(data.loja)
        // Formatar data de expiração para o input
        if (data.loja.expiraEm) {
          const dataExp = new Date(data.loja.expiraEm)
          setDataExpiracao(dataExp.toISOString().split('T')[0])
        }
      } else {
        toast.error('Loja não encontrada')
        router.push('/superadmin/lojas')
      }
    } catch (error) {
      toast.error('Erro ao carregar loja')
    } finally {
      setLoading(false)
    }
  }

  const estenderTrial = async (dias: number) => {
    if (!loja) return
    
    setProcessando(true)
    try {
      const response = await fetch('/api/superadmin/trials/estender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lojaId: loja.id, dias })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Trial estendido por ${dias} dias!`)
        carregarLoja()
      } else {
        toast.error(data.error || 'Erro ao estender trial')
      }
    } catch (error) {
      toast.error('Erro ao estender trial')
    } finally {
      setProcessando(false)
    }
  }

  const removerTrial = async (ativarDireto: boolean = false) => {
    if (!loja) return
    
    setProcessando(true)
    try {
      const response = await fetch('/api/superadmin/trials/remover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lojaId: loja.id, 
          ativarDireto,
          expiraEm: dataExpiracao || null
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        carregarLoja()
      } else {
        toast.error(data.error || 'Erro ao remover trial')
      }
    } catch (error) {
      toast.error('Erro ao remover trial')
    } finally {
      setProcessando(false)
    }
  }

  const ativarLoja = async () => {
    if (!loja) return
    
    setProcessando(true)
    try {
      const response = await fetch('/api/superadmin/trials/ativar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lojaId: loja.id })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Loja ativada com sucesso!')
        carregarLoja()
      } else {
        toast.error(data.error || 'Erro ao ativar loja')
      }
    } catch (error) {
      toast.error('Erro ao ativar loja')
    } finally {
      setProcessando(false)
    }
  }

  const calcularDiasRestantes = (trialAte: string | null) => {
    if (!trialAte) return 0
    const agora = new Date()
    const fim = new Date(trialAte)
    const diffMs = fim.getTime() - agora.getTime()
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }

  const getStatusBadge = () => {
    if (!loja) return null
    
    const diasRestantes = calcularDiasRestantes(loja.trialAte)
    
    if (diasRestantes > 0) {
      return (
        <Badge className="bg-amber-100 text-amber-800 text-base px-3 py-1">
          <Gift className="w-4 h-4 mr-2" />
          Trial ({diasRestantes} dias restantes)
        </Badge>
      )
    }
    
    switch (loja.status) {
      case 'ativa':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 text-base px-3 py-1">
            <CheckCircle className="w-4 h-4 mr-2" />
            Ativa
          </Badge>
        )
      case 'pendente':
        return (
          <Badge className="bg-blue-100 text-blue-800 text-base px-3 py-1">
            <Clock className="w-4 h-4 mr-2" />
            Pendente
          </Badge>
        )
      case 'bloqueada':
        return (
          <Badge className="bg-red-100 text-red-800 text-base px-3 py-1">
            <XCircle className="w-4 h-4 mr-2" />
            Bloqueada
          </Badge>
        )
      default:
        return <Badge variant="secondary" className="text-base px-3 py-1">{loja.status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!loja) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Loja não encontrada</p>
        <Link href="/superadmin/lojas">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Lojas
          </Button>
        </Link>
      </div>
    )
  }

  const diasRestantes = calcularDiasRestantes(loja.trialAte)
  const emTrial = diasRestantes > 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/superadmin/lojas">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{loja.nome}</h1>
            {getStatusBadge()}
          </div>
          <p className="text-slate-500">{loja.email}</p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Dados da Loja */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-600" />
              Dados da Loja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Responsável</p>
                <p className="font-medium">{loja.responsavel}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Slug</p>
                <p className="font-medium font-mono text-sm">{loja.slug}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Telefone</p>
                  <p className="font-medium">{loja.telefone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">WhatsApp</p>
                  <p className="font-medium">{loja.whatsapp}</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-400 mt-1" />
              <div>
                <p className="text-sm text-slate-500">Endereço</p>
                <p className="font-medium">{loja.endereco}</p>
                <p className="text-slate-500">{loja.cidade} - {loja.estado}</p>
              </div>
            </div>

            {loja.descricao && (
              <div>
                <p className="text-sm text-slate-500">Descrição</p>
                <p className="text-sm text-slate-700">{loja.descricao}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plano e Trial */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Plano e Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Plano</p>
                <p className="font-medium capitalize">{loja.plano}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Valor</p>
                <p className="font-medium">R$ {loja.precoPlano?.toFixed(2).replace('.', ',')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Trial Até</p>
                <p className="font-medium">
                  {loja.trialAte 
                    ? new Date(loja.trialAte).toLocaleDateString('pt-BR')
                    : 'Não definido'}
                </p>
                {diasRestantes > 0 && (
                  <p className="text-sm text-amber-600">{diasRestantes} dias restantes</p>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-500">Trial Usado</p>
                <p className="font-medium">{loja.trialUsado ? 'Sim' : 'Não'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Criada em</p>
                  <p className="font-medium">{new Date(loja.criadoEm).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Expira em</p>
                  <p className="font-medium">
                    {loja.expiraEm 
                      ? new Date(loja.expiraEm).toLocaleDateString('pt-BR')
                      : 'Não definido'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            Ações
          </CardTitle>
          <CardDescription>Gerencie o trial e status desta loja</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estender Trial - só mostrar se estiver em trial */}
          {emTrial && (
            <div>
              <p className="text-sm font-medium mb-2">Estender Trial</p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => estenderTrial(7)}
                  disabled={processando}
                >
                  +7 dias
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => estenderTrial(15)}
                  disabled={processando}
                >
                  +15 dias
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => estenderTrial(30)}
                  disabled={processando}
                >
                  +30 dias
                </Button>
              </div>
            </div>
          )}

          {/* Remover Trial / Ativar Sem Trial */}
          {emTrial && (
            <div className="pt-4 border-t border-slate-200">
              <p className="text-sm font-medium mb-2">Remover Trial</p>
              <p className="text-xs text-slate-500 mb-3">
                Remova o período de teste. Você pode apenas remover ou ativar diretamente como loja paga.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline"
                  className="text-amber-600 border-amber-200 hover:bg-amber-50"
                  onClick={() => removerTrial(false)}
                  disabled={processando}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar Trial
                </Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => removerTrial(true)}
                  disabled={processando}
                >
                  {processando ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Crown className="w-4 h-4 mr-2" />
                  )}
                  Ativar como Pago
                </Button>
              </div>
            </div>
          )}

          {/* Definir Data de Expiração */}
          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm font-medium mb-2">Data de Expiração</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Input
                  type="date"
                  value={dataExpiracao}
                  onChange={(e) => setDataExpiracao(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button 
                variant="outline"
                onClick={async () => {
                  if (!loja || !dataExpiracao) return
                  setProcessando(true)
                  try {
                    const response = await fetch(`/api/superadmin/lojas/${loja.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        ...loja,
                        expiraEm: dataExpiracao 
                      })
                    })
                    const data = await response.json()
                    if (data.success) {
                      toast.success('Data de expiração atualizada!')
                      carregarLoja()
                    } else {
                      toast.error(data.error)
                    }
                  } catch {
                    toast.error('Erro ao atualizar data')
                  } finally {
                    setProcessando(false)
                  }
                }}
                disabled={processando || !dataExpiracao}
              >
                Salvar Data
              </Button>
            </div>
          </div>

          {/* Status da Loja */}
          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm font-medium mb-2">Status da Loja</p>
            <div className="flex flex-wrap gap-2">
              {!emTrial && loja.status !== 'ativa' && (
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={ativarLoja}
                  disabled={processando}
                >
                  {processando ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Ativar Loja
                </Button>
              )}
              
              <Link href={`/loja/${loja.slug}`} target="_blank">
                <Button variant="outline">
                  Ver Página Pública
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Faturas */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Histórico de Faturas</CardTitle>
        </CardHeader>
        <CardContent>
          {loja.faturas.length === 0 ? (
            <p className="text-slate-500 text-center py-4">Nenhuma fatura encontrada</p>
          ) : (
            <div className="space-y-2">
              {loja.faturas.map((fatura) => (
                <div
                  key={fatura.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">Fatura #{fatura.numeroFatura}</p>
                    <p className="text-sm text-slate-500">
                      Vencimento: {new Date(fatura.dataVencimento).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">R$ {fatura.valor.toFixed(2).replace('.', ',')}</p>
                    <Badge 
                      className={
                        fatura.status === 'paga' ? 'bg-emerald-100 text-emerald-800' :
                        fatura.status === 'pendente' ? 'bg-blue-100 text-blue-800' :
                        fatura.status === 'vencida' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-800'
                      }
                    >
                      {fatura.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
