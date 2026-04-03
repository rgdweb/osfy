'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Save,
  Building,
  MapPin,
  Clock,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  CreditCard,
  CheckCircle,
  XCircle,
  RefreshCw,
  QrCode,
  HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { TIPOS_SERVICO, ESTADOS_BRASIL } from '@/types'
import { Loja } from '@prisma/client'
import { UploadImagem } from '@/components/painel/UploadImagem'

interface ConfiguracoesPageProps {
  loja: Loja
}

interface ConfigPagamento {
  usarPagamentoSistema: boolean
  efiClientId: string | null
  efiClientSecret: string | null
  efiAmbiente: string | null
  pixChave: string | null
  pixTipo: string | null
  pixNome: string | null
  temConfiguracao: boolean
}

export function ConfiguracoesPage({ loja }: ConfiguracoesPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingPagamento, setLoadingPagamento] = useState(false)
  const [testandoConexao, setTestandoConexao] = useState(false)
  const [configPagamento, setConfigPagamento] = useState<ConfigPagamento | null>(null)
  const [logo, setLogo] = useState<string | null>(loja.logo)
  
  const [formData, setFormData] = useState({
    nome: loja.nome,
    cpfCnpj: loja.cpfCnpj || '',
    telefone: loja.telefone,
    whatsapp: loja.whatsapp,
    cidade: loja.cidade,
    estado: loja.estado,
    endereco: loja.endereco,
    numeroEndereco: loja.numeroEndereco || '',
    bairro: loja.bairro || '',
    cep: loja.cep || '',
    complemento: loja.complemento || '',
    descricao: loja.descricao || '',
    horarioAtendimento: loja.horarioAtendimento || '',
    tiposServico: loja.tiposServico?.split(',') || []
  })

  // Formulário de pagamento
  const [pagamentoData, setPagamentoData] = useState({
    efiClientId: '',
    efiClientSecret: '',
    efiAmbiente: 'homologacao',
    pixChave: '',
    pixTipo: 'cpf',
    pixNome: ''
  })

  // Carregar configurações de pagamento
  useEffect(() => {
    async function carregarConfigPagamento() {
      try {
        const response = await fetch('/api/painel/configuracoes/pagamento')
        const data = await response.json()
        if (data.success) {
          setConfigPagamento(data.config)
          if (data.config.temConfiguracao) {
            setPagamentoData({
              // NÃO preencher as credenciais - vêm mascaradas do backend
              // O usuário só precisa preencher se quiser alterar
              efiClientId: '',
              efiClientSecret: '',
              efiAmbiente: data.config.efiAmbiente || 'homologacao',
              pixChave: data.config.pixChave || '',
              pixTipo: data.config.pixTipo || 'cpf',
              pixNome: data.config.pixNome || ''
            })
          }
        }
      } catch (error) {
        console.error('Erro ao carregar config de pagamento:', error)
      }
    }
    carregarConfigPagamento()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePagamentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPagamentoData(prev => ({ ...prev, [name]: value }))
  }

  const handleTipoServico = (tipoId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      tiposServico: checked 
        ? [...prev.tiposServico, tipoId]
        : prev.tiposServico.filter(t => t !== tipoId)
    }))
  }

  // Ativar/Desativar sistema de pagamento
  const handleTogglePagamento = async (ativar: boolean) => {
    setLoadingPagamento(true)
    try {
      const response = await fetch('/api/painel/configuracoes/pagamento', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'toggle', usarPagamentoSistema: ativar })
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message)
        router.refresh()
        // Recarregar config
        const configResponse = await fetch('/api/painel/configuracoes/pagamento')
        const configData = await configResponse.json()
        if (configData.success) {
          setConfigPagamento(configData.config)
        }
      } else {
        toast.error(data.error || 'Erro ao atualizar')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setLoadingPagamento(false)
    }
  }

  // Testar conexão com Efí Bank
  const handleTestarConexao = async () => {
    if (!pagamentoData.efiClientId || !pagamentoData.efiClientSecret) {
      toast.error('Preencha o Client ID e Client Secret para testar')
      return
    }

    setTestandoConexao(true)
    try {
      const response = await fetch('/api/painel/configuracoes/pagamento', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          acao: 'testar', 
          efiClientId: pagamentoData.efiClientId,
          efiClientSecret: pagamentoData.efiClientSecret,
          efiAmbiente: pagamentoData.efiAmbiente
        })
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success('Conexão realizada com sucesso!')
      } else {
        toast.error(data.message || data.error || 'Erro ao testar conexão')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setTestandoConexao(false)
    }
  }

  // Salvar configurações de pagamento
  const handleSalvarPagamento = async () => {
    if (!pagamentoData.pixChave) {
      toast.error('Preencha a Chave PIX')
      return
    }

    setLoadingPagamento(true)
    try {
      const response = await fetch('/api/painel/configuracoes/pagamento', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pagamentoData
        })
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success('Configurações salvas com sucesso!')
        router.refresh()
        // Recarregar config
        const configResponse = await fetch('/api/painel/configuracoes/pagamento')
        const configData = await configResponse.json()
        if (configData.success) {
          setConfigPagamento(configData.config)
        }
      } else {
        toast.error(data.error || 'Erro ao salvar')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setLoadingPagamento(false)
    }
  }

  // Remover configurações de pagamento
  const handleRemoverPagamento = async () => {
    if (!confirm('Tem certeza que deseja remover as configurações de pagamento?')) {
      return
    }

    setLoadingPagamento(true)
    try {
      const response = await fetch('/api/painel/configuracoes/pagamento', {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success('Configurações removidas')
        setConfigPagamento(null)
        setPagamentoData({
          efiClientId: '',
          efiClientSecret: '',
          efiAmbiente: 'homologacao',
          pixChave: '',
          pixTipo: 'cpf',
          pixNome: ''
        })
        router.refresh()
      } else {
        toast.error(data.error || 'Erro ao remover')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setLoadingPagamento(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/painel/configuracoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          logo,
          tiposServico: formData.tiposServico.join(',')
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Configurações salvas com sucesso!')
        router.refresh()
      } else {
        toast.error(data.error || 'Erro ao salvar configurações')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500">Personalize os dados da sua loja</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-600" />
              Informações da Loja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Loja</Label>
              <Input
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
              <Input
                id="cpfCnpj"
                name="cpfCnpj"
                value={formData.cpfCnpj}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '')
                  // Formatar CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)
                  if (value.length <= 11) {
                    value = value.replace(/(\d{3})(\d)/, '$1.$2')
                    value = value.replace(/(\d{3})(\d)/, '$1.$2')
                    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
                  } else {
                    value = value.replace(/(\d{2})(\d)/, '$1.$2')
                    value = value.replace(/(\d{3})(\d)/, '$1.$2')
                    value = value.replace(/(\d{3})(\d)/, '$1/$2')
                    value = value.replace(/(\d{4})(\d{1,2})$/, '$1-$2')
                  }
                  setFormData(prev => ({ ...prev, cpfCnpj: value }))
                }}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                maxLength={18}
              />
              <p className="text-xs text-slate-500">Necessário para emissão de boletos</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo da Loja */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-600" />
              Logo da Loja
            </CardTitle>
            <CardDescription>
              A logo aparecerá nas ordens de serviço e na sua página pública
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadImagem
              valorAtual={logo}
              onUpload={(url) => {
                setLogo(url)
                toast.success('Logo atualizada!')
              }}
              onRemover={() => {
                setLogo(null)
                toast.success('Logo removida!')
              }}
              tipo="logo"
              lojaId={loja.id}
              label=""
              tamanhoPreview={150}
            />
          </CardContent>
        </Card>

        {/* Localização */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              Localização
            </CardTitle>
            <CardDescription>
              Endereço completo necessário para emissão de boletos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP *</Label>
                <Input
                  id="cep"
                  name="cep"
                  placeholder="00000000"
                  value={formData.cep}
                  onChange={handleInputChange}
                  maxLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select 
                  value={formData.estado} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, estado: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BRASIL.map(uf => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="endereco">Logradouro (Rua/Avenida)</Label>
                <Input
                  id="endereco"
                  name="endereco"
                  placeholder="Rua das Flores"
                  value={formData.endereco}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numeroEndereco">Número</Label>
                <Input
                  id="numeroEndereco"
                  name="numeroEndereco"
                  placeholder="123"
                  value={formData.numeroEndereco}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  name="bairro"
                  placeholder="Centro"
                  value={formData.bairro}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  name="complemento"
                  placeholder="Sala 101, Loja B..."
                  value={formData.complemento}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Descrição e Horário */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              Descrição e Horário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição da Loja</Label>
              <Textarea
                id="descricao"
                name="descricao"
                placeholder="Descreva sua loja, experiência, diferenciais..."
                value={formData.descricao}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="horarioAtendimento">Horário de Atendimento</Label>
              <Input
                id="horarioAtendimento"
                name="horarioAtendimento"
                placeholder="Ex: Seg-Sex: 9h às 18h, Sáb: 9h às 13h"
                value={formData.horarioAtendimento}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tipos de Serviço */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Tipos de Serviço</CardTitle>
            <CardDescription>Selecione os tipos de equipamentos que sua loja repara</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {TIPOS_SERVICO.map((tipo) => (
                <div key={tipo.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={tipo.id}
                    checked={formData.tiposServico.includes(tipo.id)}
                    onCheckedChange={(checked) => handleTipoServico(tipo.id, checked as boolean)}
                  />
                  <Label htmlFor={tipo.id} className="cursor-pointer">
                    {tipo.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Link Público */}
        <Card className="border-slate-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Sua Página Pública</CardTitle>
            <CardDescription>Compartilhe este link com seus clientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white px-4 py-2 rounded-lg border border-slate-200 text-sm">
                {typeof window !== 'undefined' ? window.location.origin : ''}/loja/{loja.slug}
              </code>
              <a href={`/loja/${loja.slug}`} target="_blank" rel="noopener noreferrer">
                <Button type="button" variant="outline" size="icon">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Sistema de Pagamento Efí Bank */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" />
              Sistema de Pagamento
            </CardTitle>
            <CardDescription>
              Receba pagamentos das OS diretamente na sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle para ativar/desativar */}
            {!configPagamento?.usarPagamentoSistema ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <HelpCircle className="w-6 h-6 text-slate-400" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-700">Sistema de pagamento desativado</p>
                    <p className="text-sm text-slate-500">
                      Ative para receber pagamentos online das OS
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleTogglePagamento(true)}
                  disabled={loadingPagamento}
                >
                  {loadingPagamento ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Ativando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Ativar Sistema de Pagamento
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status */}
                {configPagamento?.temConfiguracao ? (
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium text-green-800">Pagamento configurado!</p>
                      <p className="text-sm text-green-600">
                        PIX: {configPagamento.pixChave}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <XCircle className="w-6 h-6 text-amber-600" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-800">Configure suas credenciais</p>
                      <p className="text-sm text-amber-600">
                        Preencha os dados abaixo para começar a receber
                      </p>
                    </div>
                  </div>
                )}

                {/* Formulário de configuração */}
                <div className="space-y-4 pt-4 border-t">
                  {/* Ambiente */}
                  <div className="space-y-2">
                    <Label htmlFor="efiAmbiente">Ambiente</Label>
                    <Select 
                      value={pagamentoData.efiAmbiente} 
                      onValueChange={(value) => setPagamentoData(prev => ({ ...prev, efiAmbiente: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="homologacao">Homologação (Teste)</SelectItem>
                        <SelectItem value="producao">Produção (Real)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      Use "Homologação" para testes e "Produção" para cobranças reais
                    </p>
                  </div>

                  {/* Client ID */}
                  <div className="space-y-2">
                    <Label htmlFor="efiClientId">Client ID *</Label>
                    <Input
                      id="efiClientId"
                      name="efiClientId"
                      placeholder={configPagamento?.temConfiguracao ? "•••••••• (deixe vazio para manter o atual)" : "Client ID da sua aplicação Efí"}
                      value={pagamentoData.efiClientId}
                      onChange={handlePagamentoChange}
                    />
                    {configPagamento?.temConfiguracao && (
                      <p className="text-xs text-emerald-600">
                        ✓ Já configurado - preencha apenas se quiser alterar
                      </p>
                    )}
                  </div>

                  {/* Client Secret */}
                  <div className="space-y-2">
                    <Label htmlFor="efiClientSecret">Client Secret *</Label>
                    <Input
                      id="efiClientSecret"
                      name="efiClientSecret"
                      type="password"
                      placeholder={configPagamento?.temConfiguracao ? "•••••••• (deixe vazio para manter o atual)" : "Client Secret da sua aplicação Efí"}
                      value={pagamentoData.efiClientSecret}
                      onChange={handlePagamentoChange}
                    />
                    {configPagamento?.temConfiguracao && (
                      <p className="text-xs text-emerald-600">
                        ✓ Já configurado - preencha apenas se quiser alterar
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      Encontre em: Efí Bank → API → Aplicações → Sua Aplicação
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pixTipo">Tipo de Chave PIX</Label>
                      <Select 
                        value={pagamentoData.pixTipo} 
                        onValueChange={(value) => setPagamentoData(prev => ({ ...prev, pixTipo: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                          <SelectItem value="email">E-mail</SelectItem>
                          <SelectItem value="telefone">Telefone</SelectItem>
                          <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pixChave">Chave PIX *</Label>
                      <Input
                        id="pixChave"
                        name="pixChave"
                        placeholder="Sua chave PIX"
                        value={pagamentoData.pixChave}
                        onChange={handlePagamentoChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pixNome">Nome do Recebedor</Label>
                    <Input
                      id="pixNome"
                      name="pixNome"
                      placeholder="Nome que aparece no PIX"
                      value={pagamentoData.pixNome}
                      onChange={handlePagamentoChange}
                    />
                  </div>

                  {/* Botões */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestarConexao}
                      disabled={testandoConexao}
                    >
                      {testandoConexao ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Testando...
                        </>
                      ) : (
                        'Testar Conexão'
                      )}
                    </Button>

                    <Button
                      type="button"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleSalvarPagamento}
                      disabled={loadingPagamento}
                    >
                      {loadingPagamento ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar Configurações'
                      )}
                    </Button>
                  </div>

                  {/* Link para criar conta */}
                  <div className="text-center pt-4 border-t">
                    <p className="text-sm text-slate-500 mb-2">
                      Não tem conta Efí Bank?
                    </p>
                    <a 
                      href="https://sejaefi.com.br/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                    >
                      Criar conta gratuita →
                    </a>
                  </div>

                  {/* Botão para desativar */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 mt-4"
                    onClick={() => handleTogglePagamento(false)}
                    disabled={loadingPagamento}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Desativar Sistema de Pagamento
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <Button 
          type="submit" 
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          disabled={loading}
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </form>
    </div>
  )
}
