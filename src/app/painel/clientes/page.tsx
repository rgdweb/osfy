'use client'

import { useEffect, useState } from 'react'
import { Users, Phone, Mail, Wrench, Search, Trash2, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface Cliente {
  id: string
  nome: string
  telefone: string
  email: string | null
  criadoEm: string
  _count: {
    ordens: number
  }
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  const fetchClientes = async () => {
    try {
      const response = await fetch('/api/painel/clientes')
      const data = await response.json()
      
      if (data.success) {
        setClientes(data.clientes)
      }
    } catch {
      toast.error('Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClientes()
  }, [])

  const handleExcluirCliente = async () => {
    if (!clienteParaExcluir) return

    setExcluindo(true)
    try {
      const response = await fetch(`/api/painel/clientes?id=${clienteParaExcluir.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Cliente excluído com sucesso!')
        setClientes(clientes.filter(c => c.id !== clienteParaExcluir.id))
        setClienteParaExcluir(null)
      } else {
        toast.error(data.error || 'Erro ao excluir cliente')
      }
    } catch {
      toast.error('Erro ao excluir cliente')
    } finally {
      setExcluindo(false)
    }
  }

  const clientesFiltrados = clientes.filter(cliente => 
    cliente.nome.toLowerCase().includes(busca.toLowerCase()) ||
    cliente.telefone.includes(busca) ||
    (cliente.email && cliente.email.toLowerCase().includes(busca.toLowerCase()))
  )

  // Contar clientes sem OS
  const clientesSemOS = clientes.filter(c => c._count.ordens === 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-slate-200 rounded w-64 mb-4"></div>
          <div className="h-10 bg-slate-200 rounded w-full max-w-md mb-6"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-32 bg-slate-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-500">{clientes.length} clientes cadastrados</p>
        </div>
        {clientesSemOS.length > 0 && (
          <p className="text-sm text-slate-500">
            {clientesSemOS.length} cliente(s) sem OS vinculada
          </p>
        )}
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por nome, telefone ou email..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de Clientes */}
      {clientesFiltrados.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12">
            <div className="text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>{busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}</p>
              <p className="text-sm mt-2">
                Os clientes serão cadastrados automaticamente ao criar ordens de serviço
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clientesFiltrados.map((cliente) => (
            <Card key={cliente.id} className="border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{cliente.nome}</CardTitle>
                    <CardDescription>
                      Desde {formatDate(cliente.criadoEm)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      {cliente._count.ordens} OS
                    </Badge>
                    {/* Botão de excluir - só aparece se não tiver OS */}
                    {cliente._count.ordens === 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setClienteParaExcluir(cliente)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{cliente.telefone}</span>
                </div>
                {cliente.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{cliente.email}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={!!clienteParaExcluir} onOpenChange={() => setClienteParaExcluir(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Excluir Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              Tem certeza que deseja excluir o cliente <strong>{clienteParaExcluir?.nome}</strong>?
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Este cliente não possui OS vinculada e pode ser removido com segurança.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setClienteParaExcluir(null)}
              disabled={excluindo}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleExcluirCliente}
              disabled={excluindo}
            >
              {excluindo ? 'Excluindo...' : 'Excluir Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
