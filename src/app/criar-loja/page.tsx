'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Wrench, ArrowLeft, CheckCircle, MessageCircle, Lock, MapPin, Building, FileText, CreditCard, QrCode, Copy, ExternalLink, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TIPOS_SERVICO, ESTADOS_BRASIL } from '@/types'
import { toast } from 'sonner'

export default function CriarLojaPage() {
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [lojaSlug, setLojaSlug] = useState('')
  const [lojaExistente, setLojaExistente] = useState(false)
  
  // Estados simples para cada campo
  const [nome, setNome] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [endereco, setEndereco] = useState('')
  const [numeroEndereco, setNumeroEndereco] = useState('')
  const [bairro, setBairro] = useState('')
  const [cep, setCep] = useState('')
  const [descricao, setDescricao] = useState('')
  const [horarioAtendimento, setHorarioAtendimento] = useState('')
  const [tiposServico, setTiposServico] = useState<string[]>([])
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [tipoPlano, setTipoPlano] = useState<'mensal' | 'anual'>('mensal')
  
  // Estados para preços e cobrança
  const [precoMensal, setPrecoMensal] = useState('29')
  const [precoAnual, setPrecoAnual] = useState('290')
  const [cobranca, setCobranca] = useState<{
    valor: number
    pixQrCode?: string
    pixPayload?: string
    linkPagamento?: string
    linkBoleto?: string
  } | null>(null)

  const toggleServico = (id: string) => {
    setTiposServico(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  // Carregar configurações de preço
  useEffect(() => {
    fetch('/api/configuracoes-publicas')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.configuracoes) {
          if (data.configuracoes.sitePreco) setPrecoMensal(data.configuracoes.sitePreco)
          if (data.configuracoes.sitePrecoAnual) setPrecoAnual(data.configuracoes.sitePrecoAnual)
        }
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações
    if (!nome.trim()) {
      toast.error('Preencha o Nome da Loja')
      return
    }
    if (!responsavel.trim()) {
      toast.error('Preencha o Nome do Responsável')
      return
    }
    if (!cpfCnpj.trim()) {
      toast.error('Preencha o CPF/CNPJ')
      return
    }
    const cpfLimpo = cpfCnpj.replace(/\D/g, '')
    if (cpfLimpo.length !== 11 && cpfLimpo.length !== 14) {
      toast.error('CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos')
      return
    }
    if (!telefone.trim()) {
      toast.error('Preencha o Telefone')
      return
    }
    if (!whatsapp.trim()) {
      toast.error('Preencha o WhatsApp')
      return
    }
    if (!email.trim()) {
      toast.error('Preencha o Email')
      return
    }
    if (!senha.trim()) {
      toast.error('Preencha a Senha')
      return
    }
    if (senha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }
    if (senha !== confirmarSenha) {
      toast.error('As senhas não coincidem')
      return
    }
    if (!cidade.trim()) {
      toast.error('Preencha a Cidade')
      return
    }
    if (!estado) {
      toast.error('Selecione o Estado')
      return
    }
    if (!endereco.trim()) {
      toast.error('Preencha o Endereço')
      return
    }
    if (tiposServico.length === 0) {
      toast.error('Selecione pelo menos um tipo de serviço')
      return
    }
    if (!aceitouTermos) {
      toast.error('Você precisa aceitar os Termos de Uso e Política de Privacidade')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/lojas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          responsavel: responsavel.trim(),
          cpfCnpj: cpfCnpj.trim(),
          telefone: telefone.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim(),
          senha,
          cidade: cidade.trim(),
          estado,
          endereco: endereco.trim(),
          numeroEndereco: numeroEndereco.trim(),
          bairro: bairro.trim(),
          cep: cep.replace(/\D/g, ''),
          descricao: descricao.trim(),
          horarioAtendimento: horarioAtendimento.trim(),
          tiposServico: tiposServico.join(','),
          tipoPlano
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setLojaSlug(data.slug)
        if (data.cobranca) {
          setCobranca(data.cobranca)
        }
        setSucesso(true)
        toast.success('Loja criada com sucesso!')
      } else if (data.lojaExistente) {
        // Já existe loja com esses dados
        setLojaExistente(true)
      } else {
        toast.error(data.error || 'Erro ao criar loja')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  // Tela de loja existente - pedir para logar
  if (lojaExistente) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center border-amber-200">
          <CardHeader>
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-amber-600" />
            </div>
            <CardTitle className="text-2xl text-amber-700">Ops! Loja já cadastrada</CardTitle>
            <CardDescription className="text-base mt-2">
              Já existe uma loja cadastrada com este CPF/CNPJ ou email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
              <p className="text-amber-800">
                Faça login para acessar sua conta e regularizar o pagamento. 
                Após o pagamento, seu acesso será liberado automaticamente.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Link href="/login-simples">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Lock className="w-4 h-4 mr-2" />
                  Fazer Login
                </Button>
              </Link>
              
              <Link href="/">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Início
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center border-emerald-200">
          <CardHeader>
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl text-emerald-700">Loja Criada!</CardTitle>
            <CardDescription className="text-base mt-2">
              Sua loja foi cadastrada com sucesso! Você tem <strong>7 dias grátis</strong> para testar o sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cobrança */}
            {cobranca && (
              <>
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Valor a Pagar</h3>
                    <span className="text-2xl font-bold text-emerald-600">
                      R$ {cobranca.valor.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    Plano {tipoPlano === 'anual' ? 'Anual' : 'Mensal'}
                  </p>
                  
                  {/* PIX QR Code */}
                  {cobranca.pixQrCode && (
                    <div className="bg-slate-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-slate-600 mb-3">Escaneie o QR Code ou copie o código PIX</p>
                      <img 
                        src={`data:image/png;base64,${cobranca.pixQrCode}`} 
                        alt="QR Code PIX" 
                        className="mx-auto w-48 h-48"
                      />
                      {cobranca.pixPayload && (
                        <Button 
                          variant="outline" 
                          className="mt-3"
                          onClick={() => {
                            navigator.clipboard.writeText(cobranca.pixPayload!)
                            toast.success('Código PIX copiado!')
                          }}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copiar Código PIX
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {/* Link de Pagamento */}
                  {cobranca.linkPagamento && (
                    <div className="space-y-3">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                        <p className="text-sm text-emerald-700 font-medium">
                          ✓ Mercado Pago - PIX, Cartão ou Boleto
                        </p>
                      </div>
                      <Button 
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => window.open(cobranca.linkPagamento, '_blank')}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pagar com Mercado Pago
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Boleto */}
                  {cobranca.linkBoleto && (
                    <Button 
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(cobranca.linkBoleto, '_blank')}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Ver Boleto
                    </Button>
                  )}
                </div>
                
                {/* Divisor */}
                <div className="flex items-center gap-4 my-4">
                  <div className="flex-1 h-px bg-slate-200"></div>
                  <span className="text-sm text-slate-500">ou</span>
                  <div className="flex-1 h-px bg-slate-200"></div>
                </div>
              </>
            )}
            
            {/* Sem cobrança - mensagem */}
            {!cobranca && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <p className="text-blue-800 font-medium mb-2">
                  Seu período de teste começou!
                </p>
                <p className="text-blue-700 text-sm">
                  Você tem <strong>7 dias grátis</strong> para testar o sistema. Após esse período, será necessário pagar para continuar.
                </p>
              </div>
            )}
            
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-2">Link da sua loja:</p>
              <code className="text-emerald-600 font-mono text-sm bg-emerald-50 px-2 py-1 rounded">
                tec-os.vercel.app/loja/{lojaSlug}
              </code>
            </div>

            <div className="flex flex-col gap-3">
              <Link href="/login-simples">
                <Button className="bg-emerald-600 hover:bg-emerald-700 w-full">
                  <Lock className="w-4 h-4 mr-2" />
                  Acessar meu Painel
                </Button>
              </Link>
              
              <Link href="/">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Início
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              TecOS
            </span>
          </Link>
          
          <Link href="/">
            <Button variant="ghost" className="text-slate-600">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </header>

      {/* Form */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Crie sua Loja no TecOS
            </h1>
            <p className="text-slate-600">
              Preencha os dados abaixo para criar sua assistência técnica na plataforma
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados da Loja */}
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="w-5 h-5 text-emerald-600" />
                  Dados da Loja
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome da Loja *</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: TechCell Assistência"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responsavel">Nome do Responsável *</Label>
                    <Input
                      id="responsavel"
                      placeholder="Seu nome completo"
                      value={responsavel}
                      onChange={(e) => setResponsavel(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpfCnpj">CPF/CNPJ *</Label>
                    <Input
                      id="cpfCnpj"
                      placeholder="000.000.000-00"
                      value={cpfCnpj}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '')
                        if (value.length <= 11) {
                          // CPF: 000.000.000-00
                          value = value.replace(/(\d{3})(\d)/, '$1.$2')
                          value = value.replace(/(\d{3})(\d)/, '$1.$2')
                          value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
                        } else {
                          // CNPJ: 00.000.000/0000-00
                          value = value.replace(/(\d{2})(\d)/, '$1.$2')
                          value = value.replace(/(\d{3})(\d)/, '$1.$2')
                          value = value.replace(/(\d{3})(\d)/, '$1/$2')
                          value = value.replace(/(\d{4})(\d{1,2})$/, '$1-$2')
                        }
                        setCpfCnpj(value)
                      }}
                      maxLength={18}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone *</Label>
                    <Input
                      id="telefone"
                      placeholder="(00) 0000-0000"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp *</Label>
                    <Input
                      id="whatsapp"
                      placeholder="(00) 00000-0000"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Acesso */}
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-600" />
                  Dados de Acesso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="senha">Senha *</Label>
                    <Input
                      id="senha"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmarSenha">Confirmar Senha *</Label>
                    <Input
                      id="confirmarSenha"
                      type="password"
                      placeholder="Repita a senha"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Localização */}
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  Localização
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="cidade">Cidade *</Label>
                    <Input
                      id="cidade"
                      placeholder="Nome da cidade"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado *</Label>
                    <Select value={estado} onValueChange={setEstado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS_BRASIL.map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cep">CEP *</Label>
                      <Input
                        id="cep"
                        placeholder="00000000"
                        value={cep}
                        onChange={(e) => setCep(e.target.value.replace(/\D/g, ''))}
                        maxLength={8}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="cidade">Cidade *</Label>
                      <Input
                        id="cidade"
                        placeholder="Sua cidade"
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="endereco">Logradouro (Rua/Avenida) *</Label>
                    <Input
                      id="endereco"
                      placeholder="Rua das Flores"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="numeroEndereco">Número</Label>
                      <Input
                        id="numeroEndereco"
                        placeholder="123"
                        value={numeroEndereco}
                        onChange={(e) => setNumeroEndereco(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bairro">Bairro</Label>
                      <Input
                        id="bairro"
                        placeholder="Centro"
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Serviços */}
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-emerald-600" />
                  Tipos de Serviço
                </CardTitle>
                <CardDescription>
                  Selecione os tipos de equipamentos que sua loja repara
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {TIPOS_SERVICO.map((tipo) => (
                    <label key={tipo.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tiposServico.includes(tipo.id)}
                        onChange={() => toggleServico(tipo.id)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{tipo.label}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Escolha do Plano */}
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  Escolha seu Plano
                </CardTitle>
                <CardDescription>
                  Comece com <strong>7 dias grátis</strong> para testar o sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Mensal */}
                  <label 
                    className={`relative flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      tipoPlano === 'mensal' 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipoPlano"
                      value="mensal"
                      checked={tipoPlano === 'mensal'}
                      onChange={() => setTipoPlano('mensal')}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-900">Mensal</span>
                      {tipoPlano === 'mensal' && (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                      R${precoMensal}
                      <span className="text-sm font-normal text-slate-500">/mês</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      Flexibilidade mensal, cancele quando quiser
                    </p>
                  </label>

                  {/* Anual */}
                  <label 
                    className={`relative flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      tipoPlano === 'anual' 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipoPlano"
                      value="anual"
                      checked={tipoPlano === 'anual'}
                      onChange={() => setTipoPlano('anual')}
                      className="sr-only"
                    />
                    <div className="absolute -top-2 -right-2 bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                      2 MESES GRÁTIS
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-900">Anual</span>
                      {tipoPlano === 'anual' && (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                      R${precoAnual}
                      <span className="text-sm font-normal text-slate-500">/ano</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      Economize {(parseFloat(precoMensal) * 12 - parseFloat(precoAnual)).toFixed(0).replace('.', ',')} reais por ano
                    </p>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Informações Adicionais */}
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  Informações Adicionais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição da Loja</Label>
                  <Textarea
                    id="descricao"
                    placeholder="Conte um pouco sobre sua loja, experiência, diferenciais..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="horarioAtendimento">Horário de Atendimento</Label>
                  <Input
                    id="horarioAtendimento"
                    placeholder="Ex: Seg-Sex: 9h às 18h, Sáb: 9h às 13h"
                    value={horarioAtendimento}
                    onChange={(e) => setHorarioAtendimento(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex flex-col gap-4">
              {/* Checkbox de Termos */}
              <label className="flex items-start gap-3 cursor-pointer p-4 bg-slate-50 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={aceitouTermos}
                  onChange={(e) => setAceitouTermos(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <span className="text-sm text-slate-600">
                  Li e concordo com os{' '}
                  <Link href="/termos-de-uso" target="_blank" className="text-emerald-600 hover:underline font-medium">
                    Termos de Uso
                  </Link>{' '}
                  e{' '}
                  <Link href="/politica-de-privacidade" target="_blank" className="text-emerald-600 hover:underline font-medium">
                    Política de Privacidade
                  </Link>
                </span>
              </label>
              
              <Button 
                type="submit" 
                size="lg" 
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
              >
                {loading ? 'Criando loja...' : 'Criar Minha Loja'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
