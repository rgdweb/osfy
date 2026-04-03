'use client'

import { useEffect, useState } from 'react'
import { 
  Save, 
  Loader2, 
  Check, 
  X, 
  DollarSign,
  CreditCard,
  QrCode,
  Shield,
  Link,
  ExternalLink,
  Key
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

interface ConfiguracaoPagamento {
  id: string
  mpAccessToken: string | null
  mpPublicKey: string | null
  mpClientId: string | null
  mpClientSecret: string | null
  mpAmbiente: string
  mpWebhookSecret: string | null
  chavePix: string | null
  tipoChavePix: string | null
  nomeRecebedor: string | null
  valorMensalidade: number
  valorAnuidade: number
  diaVencimento: number
  diasBloqueio: number
  diasTolerancia: number
  ativo: boolean
}

export default function PagamentosPage() {
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [conexaoStatus, setConexaoStatus] = useState<'sucesso' | 'erro' | null>(null)
  
  const [formData, setFormData] = useState<ConfiguracaoPagamento>({
    id: '',
    mpAccessToken: '',
    mpPublicKey: '',
    mpClientId: '',
    mpClientSecret: '',
    mpAmbiente: 'sandbox',
    mpWebhookSecret: '',
    chavePix: '',
    tipoChavePix: '',
    nomeRecebedor: '',
    valorMensalidade: 29.90,
    valorAnuidade: 290.00,
    diaVencimento: 10,
    diasBloqueio: 20,
    diasTolerancia: 3,
    ativo: false
  })

  useEffect(() => {
    loadConfiguracoes()
  }, [])

  const loadConfiguracoes = async () => {
    try {
      const res = await fetch('/api/superadmin/pagamentos')
      const data = await res.json()
      if (data.success) {
        setFormData(data.configuracao)
      }
    } catch {
      toast.error('Erro ao carregar configuracoes')
    } finally {
      setLoading(false)
    }
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)

    try {
      const response = await fetch('/api/superadmin/pagamentos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Configuracoes salvas com sucesso!')
        setFormData(data.configuracao)
      } else {
        toast.error(data.error || 'Erro ao salvar configuracoes')
      }
    } catch {
      toast.error('Erro ao salvar configuracoes')
    } finally {
      setSalvando(false)
    }
  }

  const testarConexao = async () => {
    if (!formData.mpAccessToken) {
      toast.error('Digite o Access Token do Mercado Pago primeiro')
      return
    }

    setTestando(true)
    setConexaoStatus(null)

    try {
      const response = await fetch('/api/superadmin/mercadopago/testar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: formData.mpAccessToken
        })
      })

      const data = await response.json()

      if (data.success) {
        setConexaoStatus('sucesso')
        toast.success(data.message || 'Conexao bem-sucedida!')
      } else {
        setConexaoStatus('erro')
        toast.error(data.error || 'Falha na conexao')
      }
    } catch {
      setConexaoStatus('erro')
      toast.error('Erro ao testar conexao')
    } finally {
      setTestando(false)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configuracoes de Pagamento</h1>
          <p className="text-slate-500">Configure a integracao com Mercado Pago para pagamentos</p>
        </div>
        <div className="flex items-center gap-2">
          {formData.ativo ? (
            <Badge className="bg-green-100 text-green-700">Sistema Ativo</Badge>
          ) : (
            <Badge variant="secondary">Sistema Inativo</Badge>
          )}
        </div>
      </div>

      <form onSubmit={handleSalvar} className="space-y-6">
        {/* Mercado Pago API */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Integracao Mercado Pago
            </CardTitle>
            <CardDescription>
              Configure suas credenciais do Mercado Pago para receber pagamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Como obter as credenciais:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Acesse <a href="https://www.mercadopago.com.br/developers/panel" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">Mercado Pago Developers <ExternalLink className="w-3 h-3" /></a></li>
                <li>Va em "Suas integracoes" - Selecione sua aplicacao</li>
                <li>Copie o <strong>Access Token</strong> (producao ou teste)</li>
                <li>Copie a <strong>Public Key</strong> (opcional, para frontend)</li>
              </ol>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <Select 
                  value={formData.mpAmbiente} 
                  onValueChange={(v) => setFormData({ ...formData, mpAmbiente: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                    <SelectItem value="producao">Producao</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Use Sandbox para testar com cartoes de teste
                </p>
              </div>

              <div className="space-y-2">
                <Label>Access Token *</Label>
                <Input
                  type="password"
                  value={formData.mpAccessToken || ''}
                  onChange={(e) => setFormData({ ...formData, mpAccessToken: e.target.value })}
                  placeholder="APP_USR-xxxx-xxxx-xxxx-xxxx"
                />
                <p className="text-xs text-slate-500">
                  Token de producao (APP_USR) ou teste (TEST)
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Public Key (opcional)</Label>
                <Input
                  type="password"
                  value={formData.mpPublicKey || ''}
                  onChange={(e) => setFormData({ ...formData, mpPublicKey: e.target.value })}
                  placeholder="APP_USR-xxxx-xxxx-xxxx-xxxx"
                />
              </div>

              <div className="space-y-2">
                <Label>Client ID (opcional)</Label>
                <Input
                  value={formData.mpClientId || ''}
                  onChange={(e) => setFormData({ ...formData, mpClientId: e.target.value })}
                  placeholder="123456789"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Secret (opcional)</Label>
                <Input
                  type="password"
                  value={formData.mpClientSecret || ''}
                  onChange={(e) => setFormData({ ...formData, mpClientSecret: e.target.value })}
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                />
              </div>

              <div className="space-y-2">
                <Label>Webhook Secret (opcional)</Label>
                <Input
                  type="password"
                  value={formData.mpWebhookSecret || ''}
                  onChange={(e) => setFormData({ ...formData, mpWebhookSecret: e.target.value })}
                  placeholder="Segredo para validar webhooks"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={testarConexao}
                disabled={testando}
              >
                {testando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4 mr-2" />
                    Testar Conexao
                  </>
                )}
              </Button>
              {conexaoStatus === 'sucesso' && (
                <span className="flex items-center gap-1 text-green-600 text-sm">
                  <Check className="w-4 h-4" /> Conectado
                </span>
              )}
              {conexaoStatus === 'erro' && (
                <span className="flex items-center gap-1 text-red-600 text-sm">
                  <X className="w-4 h-4" /> Falha na conexao
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* PIX Estatico */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" />
              PIX Estatico (Opcional)
            </CardTitle>
            <CardDescription>
              Configure sua chave PIX para pagamentos manuais (sem integracao)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Nota:</strong> O PIX estatico gera um QR Code com sua chave PIX. 
                O cliente paga e voce confirma manualmente. Para confirmacao automatica, 
                use a integracao com Mercado Pago acima.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo da Chave</Label>
                <Select 
                  value={formData.tipoChavePix || ''} 
                  onValueChange={(v) => setFormData({ ...formData, tipoChavePix: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CPF">CPF</SelectItem>
                    <SelectItem value="CNPJ">CNPJ</SelectItem>
                    <SelectItem value="TELEFONE">Telefone</SelectItem>
                    <SelectItem value="EMAIL">E-mail</SelectItem>
                    <SelectItem value="ALEATORIA">Chave Aleatoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Chave PIX</Label>
                <Input
                  value={formData.chavePix || ''}
                  onChange={(e) => setFormData({ ...formData, chavePix: e.target.value })}
                  placeholder="Digite sua chave PIX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome do Recebedor</Label>
              <Input
                value={formData.nomeRecebedor || ''}
                onChange={(e) => setFormData({ ...formData, nomeRecebedor: e.target.value })}
                placeholder="Nome que aparecera no PIX"
              />
            </div>
          </CardContent>
        </Card>

        {/* Valores */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Valores e Vencimentos
            </CardTitle>
            <CardDescription>
              Configure os valores das mensalidades e regras de vencimento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Mensalidade (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valorMensalidade}
                  onChange={(e) => setFormData({ ...formData, valorMensalidade: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Valor Anuidade (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valorAnuidade}
                  onChange={(e) => setFormData({ ...formData, valorAnuidade: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Dia do Vencimento</Label>
                <Input
                  type="number"
                  min="1"
                  max="28"
                  value={formData.diaVencimento}
                  onChange={(e) => setFormData({ ...formData, diaVencimento: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Dias para Bloqueio</Label>
                <Input
                  type="number"
                  value={formData.diasBloqueio}
                  onChange={(e) => setFormData({ ...formData, diasBloqueio: parseInt(e.target.value) })}
                />
                <p className="text-xs text-slate-500">Apos vencimento</p>
              </div>

              <div className="space-y-2">
                <Label>Dias de Tolerancia</Label>
                <Input
                  type="number"
                  value={formData.diasTolerancia}
                  onChange={(e) => setFormData({ ...formData, diasTolerancia: parseInt(e.target.value) })}
                />
                <p className="text-xs text-slate-500">Antes de cobrar juros</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Webhook */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Webhook
            </CardTitle>
            <CardDescription>
              Configure o webhook para confirmacao automatica de pagamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <Label className="text-sm font-medium">URL do Webhook (copie e cole no Mercado Pago)</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 text-sm bg-slate-100 p-2 rounded break-all">
                  https://tec-os.vercel.app/api/webhooks/mercadopago
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText('https://tec-os.vercel.app/api/webhooks/mercadopago')
                    toast.success('URL copiada!')
                  }}
                >
                  Copiar
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Como configurar no Mercado Pago:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Acesse <a href="https://www.mercadopago.com.br/developers/panel/webhooks" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">Webhooks no Mercado Pago <ExternalLink className="w-3 h-3" /></a></li>
                <li>Clique em "Criar webhook"</li>
                <li>Cole a URL acima no campo "URL do webhook"</li>
                <li>Selecione o evento <strong>Pagamentos</strong></li>
                <li>Clique em "Criar"</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Ativar Sistema */}
        <Card className="border-slate-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Ativar Sistema de Cobranca</Label>
                <p className="text-sm text-slate-500">
                  Quando ativo, as lojas receberao faturas mensais
                </p>
              </div>
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Botao Salvar */}
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
              Salvar Configuracoes
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
