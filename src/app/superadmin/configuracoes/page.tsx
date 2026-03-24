'use client'

import { useEffect, useState } from 'react'
import { Save, Loader2, Globe, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'site' | 'cobranca'>('site')
  
  const [formData, setFormData] = useState({
    siteNome: '',
    siteDescricao: '',
    sitePreco: '',
    sitePrecoAnual: '',
    siteWhatsapp: '',
    siteEmail: '',
    siteTermos: '',
    sitePolitica: '',
    valorMensalidade: '29.90',
    valorAnuidade: '290.00',
    diaVencimento: '10',
    diasBloqueio: '20',
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
        <p className="text-slate-500">Personalize as informações do site e regras de cobrança</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Dica:</strong> Para configurar pagamentos (Mercado Pago), acesse{' '}
          <a href="/superadmin/pagamentos" className="underline font-medium">Configurações de Pagamento</a>.
        </p>
      </div>

      {/* ABAS */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setAbaAtiva('site')}
          className={`px-4 py-2 rounded-t-lg flex items-center gap-2 ${abaAtiva === 'site' ? 'bg-emerald-100 text-emerald-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Globe className="w-4 h-4" />
          Site
        </button>
        <button
          onClick={() => setAbaAtiva('cobranca')}
          className={`px-4 py-2 rounded-t-lg flex items-center gap-2 ${abaAtiva === 'cobranca' ? 'bg-emerald-100 text-emerald-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <DollarSign className="w-4 h-4" />
          Cobrança
        </button>
      </div>

      <form onSubmit={handleSalvar} className="space-y-6">
        {/* ABA SITE */}
        {abaAtiva === 'site' && (
          <div className="space-y-6">
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

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Preços dos Planos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preço Mensal (R$)</Label>
                    <Input
                      type="number"
                      value={formData.sitePreco}
                      onChange={(e) => setFormData({ ...formData, sitePreco: e.target.value })}
                      placeholder="29"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço Anual (R$)</Label>
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
          </div>
        )}

        {/* ABA COBRANÇA */}
        {abaAtiva === 'cobranca' && (
          <div className="space-y-6">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Valores e Regras de Cobrança
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor da Mensalidade (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valorMensalidade}
                      onChange={(e) => setFormData({ ...formData, valorMensalidade: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor da Anuidade (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valorAnuidade}
                      onChange={(e) => setFormData({ ...formData, valorAnuidade: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dia do Vencimento</Label>
                    <Input
                      type="number"
                      min="1"
                      max="28"
                      value={formData.diaVencimento}
                      onChange={(e) => setFormData({ ...formData, diaVencimento: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dias para Bloqueio</Label>
                    <Input
                      type="number"
                      value={formData.diasBloqueio}
                      onChange={(e) => setFormData({ ...formData, diasBloqueio: e.target.value })}
                    />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Atenção:</strong> Lojas bloqueadas não conseguirão acessar o sistema após o período de tolerância.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
