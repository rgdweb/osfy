'use client'

import { useEffect, useState } from 'react'
import { Settings, Save, Loader2, Globe, DollarSign, Phone, Mail, FileText, CreditCard, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Configuracoes {
  siteNome: string
  siteDescricao: string
  sitePreco: string
  sitePrecoAnual: string
  siteWhatsapp: string
  siteEmail: string
  siteTermos: string
  sitePolitica: string
  // Mercado Pago
  mpAccessToken: string
  mpPublicKey: string
  mpClientId: string
  mpClientSecret: string
  mpAmbiente: string
}

interface DiagnosticoMP {
  ambienteConfigurado: string
  tokenTipo: string
  tokenValido: boolean
  tokenCompativel: boolean
  problema: string | null
  solucao: string | null
}

interface TesteMPResult {
  success: boolean
  diagnostico?: DiagnosticoMP
  conexaoMP?: {
    success: boolean
    userId?: number
    nome?: string
    error?: string
  }
  configuracao?: {
    ambiente: string
    temAccessToken: boolean
    temPublicKey: boolean
    temClientId: boolean
    temClientSecret: boolean
  }
  error?: string
}

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [testandoMP, setTestandoMP] = useState(false)
  const [testeMPResult, setTesteMPResult] = useState<TesteMPResult | null>(null)
  
  const [formData, setFormData] = useState<Configuracoes>({
    siteNome: '',
    siteDescricao: '',
    sitePreco: '',
    sitePrecoAnual: '',
    siteWhatsapp: '',
    siteEmail: '',
    siteTermos: '',
    sitePolitica: '',
    mpAccessToken: '',
    mpPublicKey: '',
    mpClientId: '',
    mpClientSecret: '',
    mpAmbiente: 'sandbox'
  })

  useEffect(() => {
    fetch('/api/superadmin/configuracoes')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFormData(data.configuracoes)
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

  const handleTestarMP = async () => {
    setTestandoMP(true)
    setTesteMPResult(null)
    
    try {
      const response = await fetch('/api/superadmin/mercadopago/testar')
      const data = await response.json()
      setTesteMPResult(data)
      
      if (data.success) {
        toast.success('Conexão com Mercado Pago OK!')
      } else {
        toast.error(data.error || 'Erro ao testar conexão')
      }
    } catch {
      toast.error('Erro ao testar conexão')
    } finally {
      setTestandoMP(false)
    }
  }

  // Detectar ambiente pelo token
  const detectarAmbientePeloToken = (token: string) => {
    if (token.startsWith('APP_USR')) return 'producao'
    if (token.startsWith('TEST-')) return 'sandbox'
    return ''
  }

  const ambienteDetectado = detectarAmbientePeloToken(formData.mpAccessToken)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações do Sistema</h1>
        <p className="text-slate-500">Personalize as informações do seu sistema</p>
      </div>

      <form onSubmit={handleSalvar} className="space-y-6">
        {/* Mercado Pago - Primeiro para facilitar */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-white">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
              <CreditCard className="w-5 h-5" />
              Mercado Pago - Pagamentos Online
            </CardTitle>
            <CardDescription>
              Configure suas credenciais do Mercado Pago para receber pagamentos online
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Instruções */}
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
              <p className="font-medium mb-2">Como obter suas credenciais:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Acesse <a href="https://www.mercadopago.com.br/developers/panel" target="_blank" rel="noopener noreferrer" className="underline">Mercado Pago Developers</a></li>
                <li>Vá em "Suas integrações" → Clique na sua aplicação</li>
                <li>Copie o <strong>Access Token</strong> e <strong>Public Key</strong></li>
                <li>Em Produção, use tokens que começam com "APP_USR"</li>
              </ol>
            </div>

            {/* Ambiente detectado */}
            {formData.mpAccessToken && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Ambiente detectado:</span>
                <Badge className={ambienteDetectado === 'producao' ? 'bg-green-500' : 'bg-yellow-500'}>
                  {ambienteDetectado === 'producao' ? 'Produção' : 
                   ambienteDetectado === 'sandbox' ? 'Sandbox (Testes)' : 'Token inválido'}
                </Badge>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="mpAccessToken">Access Token *</Label>
              <Input
                id="mpAccessToken"
                type="password"
                value={formData.mpAccessToken}
                onChange={(e) => setFormData({ ...formData, mpAccessToken: e.target.value })}
                placeholder="APP_USR-xxxx ou TEST-xxxx"
              />
              <p className="text-xs text-slate-500">
                Token de produção (APP_USR) ou Sandbox (TEST-)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mpPublicKey">Public Key</Label>
              <Input
                id="mpPublicKey"
                type="password"
                value={formData.mpPublicKey}
                onChange={(e) => setFormData({ ...formData, mpPublicKey: e.target.value })}
                placeholder="APP_USR-xxxx ou TEST-xxxx"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mpClientId">Client ID (opcional)</Label>
                <Input
                  id="mpClientId"
                  value={formData.mpClientId}
                  onChange={(e) => setFormData({ ...formData, mpClientId: e.target.value })}
                  placeholder="123456789"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mpClientSecret">Client Secret (opcional)</Label>
                <Input
                  id="mpClientSecret"
                  type="password"
                  value={formData.mpClientSecret}
                  onChange={(e) => setFormData({ ...formData, mpClientSecret: e.target.value })}
                  placeholder="XXXX"
                />
              </div>
            </div>

            {/* Resultado do teste */}
            {testeMPResult && (
              <div className={`p-4 rounded-lg ${testeMPResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {testeMPResult.success ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Conexão bem-sucedida!</span>
                    </div>
                    
                    {testeMPResult.diagnostico && (
                      <div className="text-sm text-green-600 space-y-1">
                        <p>Ambiente: <Badge className="bg-green-500">{testeMPResult.diagnostico.ambienteConfigurado}</Badge></p>
                        <p>Token: <Badge className="bg-green-500">{testeMPResult.diagnostico.tokenTipo}</Badge></p>
                      </div>
                    )}
                    
                    {testeMPResult.conexaoMP && (
                      <div className="text-sm text-green-600">
                        <p>Conta: {testeMPResult.conexaoMP.nome || `ID: ${testeMPResult.conexaoMP.userId}`}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 text-red-700">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5" />
                      <span className="font-medium">Erro na conexão</span>
                    </div>
                    <p className="text-sm">{testeMPResult.error}</p>
                    
                    {testeMPResult.diagnostico?.problema && (
                      <div className="bg-red-100 p-2 rounded text-sm">
                        <p><strong>Problema:</strong> {testeMPResult.diagnostico.problema}</p>
                        {testeMPResult.diagnostico.solucao && (
                          <p><strong>Solução:</strong> {testeMPResult.diagnostico.solucao}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestarMP}
                disabled={testandoMP || !formData.mpAccessToken}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                {testandoMP ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Testar Conexão
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informações do Site */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-600" />
              Informações do Site
            </CardTitle>
            <CardDescription>
              Dados que aparecem na página inicial e no sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteNome">Nome do Sistema</Label>
              <Input
                id="siteNome"
                value={formData.siteNome}
                onChange={(e) => setFormData({ ...formData, siteNome: e.target.value })}
                placeholder="TecOS"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="siteDescricao">Descrição do Sistema</Label>
              <Textarea
                id="siteDescricao"
                value={formData.siteDescricao}
                onChange={(e) => setFormData({ ...formData, siteDescricao: e.target.value })}
                placeholder="Sistema de Ordens de Serviço para Assistências Técnicas"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preços */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Preços dos Planos
            </CardTitle>
            <CardDescription>
              Valores cobrados das lojas parceiras
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sitePreco">Preço Mensal (R$)</Label>
                <Input
                  id="sitePreco"
                  type="number"
                  value={formData.sitePreco}
                  onChange={(e) => setFormData({ ...formData, sitePreco: e.target.value })}
                  placeholder="29"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sitePrecoAnual">Preço Anual (R$)</Label>
                <Input
                  id="sitePrecoAnual"
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
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="w-5 h-5 text-emerald-600" />
              Contato do Sistema
            </CardTitle>
            <CardDescription>
              Informações de contato para suporte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteWhatsapp">WhatsApp de Suporte</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="siteWhatsapp"
                  value={formData.siteWhatsapp}
                  onChange={(e) => setFormData({ ...formData, siteWhatsapp: e.target.value })}
                  placeholder="11999999999"
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="siteEmail">Email de Suporte</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="siteEmail"
                  type="email"
                  value={formData.siteEmail}
                  onChange={(e) => setFormData({ ...formData, siteEmail: e.target.value })}
                  placeholder="suporte@tecos.com"
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Termos e Política */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              Termos e Políticas
            </CardTitle>
            <CardDescription>
              Textos legais exibidos no sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteTermos">Termos de Uso</Label>
              <Textarea
                id="siteTermos"
                value={formData.siteTermos}
                onChange={(e) => setFormData({ ...formData, siteTermos: e.target.value })}
                placeholder="Digite os termos de uso..."
                rows={5}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sitePolitica">Política de Privacidade</Label>
              <Textarea
                id="sitePolitica"
                value={formData.sitePolitica}
                onChange={(e) => setFormData({ ...formData, sitePolitica: e.target.value })}
                placeholder="Digite a política de privacidade..."
                rows={5}
              />
            </div>
          </CardContent>
        </Card>

        {/* Botão Salvar */}
        <Button 
          type="submit" 
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          disabled={salvando}
        >
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
