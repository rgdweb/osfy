'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, X, Wrench, Store, DollarSign, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getRelativeTime } from '@/lib/utils'
import { toast } from 'sonner'

interface Notificacao {
  id: string
  tipo: string
  titulo: string
  mensagem: string
  lida: boolean
  referenciaId: string | null
  referenciaTipo: string | null
  criadoEm: string
}

const ICONE_POR_TIPO: Record<string, React.ElementType> = {
  aprovacao_orcamento: Check,
  reprovacao_orcamento: X,
  nova_loja: Store,
  mensalidade_atrasada: DollarSign,
  pagamento_realizado: DollarSign,
  os_pronta: Wrench,
}

const COR_POR_TIPO: Record<string, string> = {
  aprovacao_orcamento: 'text-green-600 bg-green-100',
  reprovacao_orcamento: 'text-red-600 bg-red-100',
  nova_loja: 'text-blue-600 bg-blue-100',
  mensalidade_atrasada: 'text-amber-600 bg-amber-100',
  pagamento_realizado: 'text-emerald-600 bg-emerald-100',
  os_pronta: 'text-purple-600 bg-purple-100',
}

export function NotificacoesBadge() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [naoLidas, setNaoLidas] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  // Título original da página
  const [tituloOriginal] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.title.replace(/^\(\d+\)\s*/, '')
    }
    return ''
  })

  const carregarNotificacoes = async () => {
    try {
      const response = await fetch('/api/notificacoes')
      const data = await response.json()
      
      if (data.success) {
        setNotificacoes(data.notificacoes)
        setNaoLidas(data.naoLidas)
      }
    } catch {
      // Silencia erro
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarNotificacoes()
    
    // Atualiza a cada 30 segundos
    const interval = setInterval(carregarNotificacoes, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // Atualizar título da aba com contador de notificações
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (naoLidas > 0) {
        document.title = `(${naoLidas}) ${tituloOriginal}`
      } else {
        document.title = tituloOriginal
      }
    }
  }, [naoLidas, tituloOriginal])

  const marcarComoLidas = async () => {
    try {
      const response = await fetch('/api/notificacoes', { method: 'PUT' })
      const data = await response.json()
      
      if (data.success) {
        setNaoLidas(0)
        setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
        toast.success('Notificações marcadas como lidas')
      }
    } catch {
      toast.error('Erro ao marcar notificações')
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-slate-600" />
          {naoLidas > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-medium animate-pulse">
              {naoLidas > 99 ? '99+' : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-slate-900">Notificações</h3>
          {naoLidas > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={marcarComoLidas}
              className="text-xs text-emerald-600 hover:text-emerald-700"
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          ) : notificacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <Bell className="w-10 h-10 mb-2 text-slate-300" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notificacoes.map((notif) => {
                const Icone = ICONE_POR_TIPO[notif.tipo] || AlertCircle
                const cor = COR_POR_TIPO[notif.tipo] || 'text-slate-600 bg-slate-100'
                
                return (
                  <div 
                    key={notif.id}
                    className={`p-3 hover:bg-slate-50 transition-colors ${!notif.lida ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cor}`}>
                        <Icone className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notif.lida ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                          {notif.titulo}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {notif.mensagem}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {getRelativeTime(notif.criadoEm)}
                        </p>
                      </div>
                      {!notif.lida && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
