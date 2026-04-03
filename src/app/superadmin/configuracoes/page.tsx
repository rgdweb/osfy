'use client'

import { useEffect, useState } from 'react'
import { Save, Loader2, Globe, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  
  const [formData, setFormData] = useState({
    siteNome: '',
    siteDescricao: '',
    sitePreco: '',
    sitePrecoAnual: '',
    siteWhatsapp: '',
    siteEmail: '',
    siteTermos: '',
    sitePolitica: '',
  })

  useEffect(() => {
    fetch('/api/superadmin/configuracoes')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFormData(prev => ({ ...prev, ...data.configuracoes }))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)

    try {
      const response = await fetch('/api/superadmin/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Configurações salvas com sucesso!')
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Erro ao salvar configurações')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações do Sistema</h1>
        <p className="text-slate-500">Personalize as informações do site</p>
      </div>

      {/* Card para redirecionar para pagamentos */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-white">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            Valores e Pagamentos
          </CardTitle>
          <CardDescription>
            Configure os valores das mensalidades, vencimentos e integração com Mercado Pago
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/superadmin/pagamentos">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <CreditCard className="w-4 h-4 mr-2" />
              Configurar Pagamentos
            </Button>
          </Link>
        </CardContent>
      </Card>

      <form onSubmit={handleSalvar} className="space-y-6">
        {/* Informações do Site */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-600" />
              Informações do Site
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Sistema</Label>
              <Input
                value={formData.siteNome}
                onChange={(e) => setFormData({ ...formData, siteNome: e.target.value })}
                placeholder="TecOS"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.siteDescricao}
                onChange={(e) => setFormData({ ...formData, siteDescricao: e.target.value })}
                placeholder="Sistema de Ordens de Serviço"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preços exibidos no site */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Preços Exibidos no Site</CardTitle>
            <CardDescription>
              Estes valores são apenas para exibição na página de criação de loja. 
              Os valores reais das faturas são configurados em{' '}
              <Link href="/superadmin/pagamentos" className="text-emerald-600 underline">
                Configurações de Pagamento
              </Link>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço Mensal (R$) - Exibição</Label>
                <Input
                  type="number"
                  value={formData.sitePreco}
                  onChange={(e) => setFormData({ ...formData, sitePreco: e.target.value })}
                  placeholder="29"
                />
              </div>
              <div className="space-y-2">
                <Label>Preço Anual (R$) - Exibição</Label>
                <Input
                  type="number"
                  value={formData.sitePrecoAnual}
                  onChange={(e) => setFormData({ ...formData, sitePrecoAnual: e.target.value })}
                  placeholder="290"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input
                value={formData.siteWhatsapp}
                onChange={(e) => setFormData({ ...formData, siteWhatsapp: e.target.value })}
                placeholder="11999999999"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.siteEmail}
                onChange={(e) => setFormData({ ...formData, siteEmail: e.target.value })}
                placeholder="suporte@tecos.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Termos e Políticas */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Termos e Políticas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Termos de Uso</Label>
              <Textarea
                value={formData.siteTermos}
                onChange={(e) => setFormData({ ...formData, siteTermos: e.target.value })}
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label>Política de Privacidade</Label>
              <Textarea
                value={formData.sitePolitica}
                onChange={(e) => setFormData({ ...formData, sitePolitica: e.target.value })}
                rows={5}
              />
            </div>
          </CardContent>
        </Card>

        {/* Botão Salvar */}
        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={salvando}>
          {salvando ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
