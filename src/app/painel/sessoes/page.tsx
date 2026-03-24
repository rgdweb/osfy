'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Laptop, 
  Shield, 
  Clock,
  MapPin,
  LogOut,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Sessao {
  id: string
  dispositivo: string
  userAgent: string
  ipAddress: string
  dataCriacao: string
  dataExpiracao: string
  ultimoAcesso: string
  ativa: boolean
}

export default function SessoesPage() {
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [loading, setLoading] = useState(true)
  const [sessaoAtual, setSessaoAtual] = useState<string | null>(null)
  const [invalidando, setInvalidando] = useState<string | null>(null)

  useEffect(() => {
    carregarSessoes()
  }, [])

  const carregarSessoes = async () => {
    try {
      const response = await fetch('/api/painel/sessoes')
      const data = await response.json()
      
      if (data.success) {
        setSessoes(data.sessoes)
        setSessaoAtual(data.sessaoAtualId)
      }
    } catch {
      toast.error('Erro ao carregar sessões')
    } finally {
      setLoading(false)
    }
  }

  const getIconeDispositivo = (dispositivo: string) => {
    const d = dispositivo?.toLowerCase() || ''
    if (d.includes('iphone') || d.includes('android') || d.includes('mobile')) {
      return <Smartphone className="w-5 h-5" />
    }
    if (d.includes('tablet') || d.includes('ipad')) {
      return <Tablet className="w-5 h-5" />
    }
    if (d.includes('laptop') || d.includes('macbook')) {
      return <Laptop className="w-5 h-5" />
    }
    return <Monitor className="w-5 h-5" />
  }

  const handleInvalidarSessao = async (sessaoId: string) => {
    if (sessaoId === sessaoAtual) {
      toast.error('Você não pode desconectar a sessão atual')
      return
    }

    setInvalidando(sessaoId)
    try {
      const response = await fetch(`/api/painel/sessoes/${sessaoId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Sessão desconectada!')
        carregarSessoes()
      } else {
        toast.error(data.error || 'Erro ao desconectar sessão')
      }
    } catch {
      toast.error('Erro ao desconectar sessão')
    } finally {
      setInvalidando(null)
    }
  }

  const handleInvalidarOutras = async () => {
    if (!confirm('Tem certeza que deseja desconectar todas as outras sessões?')) return
    
    setInvalidando('todas')
    try {
      const response = await fetch('/api/painel/sessoes/invalidar-outras', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(`${data.quantidade} sessões desconectadas!`)
        carregarSessoes()
      } else {
        toast.error(data.error || 'Erro ao desconectar sessões')
      }
    } catch {
      toast.error('Erro ao desconectar sessões')
    } finally {
      setInvalidando(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  const sessoesOutras = sessoes.filter(s => s.id !== sessaoAtual)
  const sessaoAtualData = sessoes.find(s => s.id === sessaoAtual)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sessões e Segurança</h1>
        <p className="text-slate-500">Gerencie onde você está logado</p>
      </div>

      {/* Alertas */}
      {sessoes.length > 1 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-800">
                  Você tem {sessoes.length} sessões ativas
                </p>
                <p className="text-sm text-amber-700">
                  Se não reconhece alguma sessão, desconecte imediatamente por segurança.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={handleInvalidarOutras}
                disabled={invalidando === 'todas'}
              >
                {invalidando === 'todas' ? 'Desconectando...' : 'Desconectar Outras'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessão Atual */}
      {sessaoAtualData && (
        <Card className="border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Esta Sessão
              <Badge className="bg-emerald-100 text-emerald-700">Atual</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                {getIconeDispositivo(sessaoAtualData.dispositivo)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900">{sessaoAtualData.dispositivo || 'Dispositivo Desconhecido'}</p>
                <p className="text-sm text-slate-500">
                  Ativo agora • {sessaoAtualData.ipAddress || 'IP não detectado'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Expira em</p>
                <p className="text-sm text-slate-600">
                  {formatDistanceToNow(new Date(sessaoAtualData.dataExpiracao), { locale: ptBR, addSuffix: true })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outras Sessões */}
      {sessoesOutras.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Outras Sessões ({sessoesOutras.length})</CardTitle>
            <CardDescription>
              Sessões ativas em outros dispositivos ou navegadores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessoesOutras.map((sessao) => (
              <div 
                key={sessao.id} 
                className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg"
              >
                <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500">
                  {getIconeDispositivo(sessao.dispositivo)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">
                    {sessao.dispositivo || 'Dispositivo Desconhecido'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {sessao.ipAddress || 'IP não detectado'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(sessao.ultimoAcesso), { locale: ptBR, addSuffix: true })}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleInvalidarSessao(sessao.id)}
                  disabled={invalidando === sessao.id}
                >
                  {invalidando === sessao.id ? (
                    'Desconectando...'
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 mr-1" />
                      Desconectar
                    </>
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Nenhuma outra sessão */}
      {sessoesOutras.length === 0 && sessaoAtualData && (
        <Card className="border-slate-200">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
            <p className="font-medium text-slate-900">Tudo seguro!</p>
            <p className="text-sm text-slate-500">
              Você só está logado neste dispositivo.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dicas de Segurança */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-600" />
            Dicas de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
              <span>Desconecte sessões que não reconhece imediatamente</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
              <span>Nunca compartilhe sua senha com terceiros</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
              <span>Use senhas fortes e diferentes para cada serviço</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
              <span>Sempre faça logout em dispositivos públicos</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
