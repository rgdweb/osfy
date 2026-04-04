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
  ExternalLink
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



export function ConfiguracoesPage({ loja }: ConfiguracoesPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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





  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }



  const handleTipoServico = (tipoId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      tiposServico: checked 
        ? [...prev.tiposServico, tipoId]
        : prev.tiposServico.filter(t => t !== tipoId)
    }))
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
