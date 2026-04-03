'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { 
  Phone, 
  MessageCircle, 
  MapPin, 
  Clock, 
  Wrench,
  CheckCircle,
  Circle,
  User,
  Smartphone,
  Monitor,
  Tv,
  Gamepad2,
  QrCode,
  Camera,
  FileText,
  DollarSign,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Printer,
  PenTool,
  Key,
  Lock,
  X,
  CreditCard,
  Copy,
  ExternalLink,
  Star,
  Send,
  Loader2,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { STATUS_LABELS, STATUS_COLORS, type StatusOS } from '@/types'
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils'
import { OrdemServico, Loja, Cliente, HistoricoOS, FotoOS, Assinatura } from '@prisma/client'
import { SignatureCanvas } from '@/components/ui/signature-canvas'

interface OSPageClientProps {
  os: OrdemServico & {
    loja: Loja & {
      // Campos Efí Bank da loja
      usarPagamentoSistema?: boolean
      efiClientId?: string | null
      efiAmbiente?: string | null
      pixChave?: string | null
      pixTipo?: string | null
      pixNome?: string | null
    }
    cliente: Cliente
    historico: HistoricoOS[]
    fotos: FotoOS[]
    assinatura: Assinatura | null
    // Campos de pagamento Mercado Pago
    mpPaymentId?: string | null
    mpPreferenceId?: string | null
    linkPagamento?: string | null
    pixQrCode?: string | null
    pixCopiaCola?: string | null
    boletoUrl?: string | null
    boletoLinhaDigitavel?: string | null
    // Campos de pagamento Efí Bank
    efiPaymentId?: string | null
    efiPixQrCode?: string | null
    efiPixCopiaCola?: string | null
    efiTxId?: string | null
    pagamentoGateway?: string | null
  }
}

const STATUS_ORDER: StatusOS[] = [
  'recebido',
  'em_analise',
  'aguardando_aprovacao',
  'aguardando_peca',
  'em_manutencao',
  'em_testes',
  'pronto',
  'entregue'
]

const STATUS_ICONS: Record<StatusOS, React.ReactNode> = {
  recebido: <Circle className="w-5 h-5" />,
  em_analise: <FileText className="w-5 h-5" />,
  aguardando_aprovacao: <AlertCircle className="w-5 h-5" />,
  aguardando_peca: <Clock className="w-5 h-5" />,
  em_manutencao: <Wrench className="w-5 h-5" />,
  em_testes: <Monitor className="w-5 h-5" />,
  pronto: <CheckCircle className="w-5 h-5" />,
  entregue: <CheckCircle className="w-5 h-5" />
}

const FORMAS_PAGAMENTO: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  boleto: 'Boleto',
  crediario: 'Crediário'
}

// Função para imprimir a OS (1 via - recibo para o cliente)
const imprimirOS = (os: OSPageClientProps['os']) => {
  // Soma todos os valores: orçamento + serviço + peças
  const valorTotal = (os.orcamento || 0) + (os.valorServico || 0) + (os.valorPecas || 0)
  
  const conteudo = `
<!DOCTYPE html>
<html>
<head>
  <title>OS #${os.numeroOs} - ${os.loja.nome}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { 
      size: A4; 
      margin: 10mm;
    }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 12px; 
      background: white;
    }
    .via {
      background: white;
      padding: 5mm;
      max-width: 190mm;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #10b981;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .header h1 { font-size: 20px; color: #10b981; margin-bottom: 5px; }
    .header p { color: #666; font-size: 11px; }
    .os-numero {
      text-align: right;
      font-size: 12px;
      color: #666;
      margin-bottom: 15px;
    }
    .os-numero strong { font-size: 16px; color: #333; }
    .section { margin-bottom: 12px; }
    .section-title {
      background: #f3f4f6;
      padding: 6px 10px;
      font-weight: bold;
      border-radius: 4px;
      margin-bottom: 8px;
      font-size: 12px;
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .field { margin-bottom: 6px; }
    .field-label { font-weight: bold; color: #666; font-size: 10px; text-transform: uppercase; }
    .field-value { color: #333; font-size: 12px; }
    .problema-box {
      border: 1px solid #e5e7eb;
      padding: 10px;
      border-radius: 4px;
      background: #fafafa;
      font-size: 12px;
    }
    .valores { margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 12px; }
    .valor-linha { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
    .valor-total { font-weight: bold; font-size: 14px; border-top: 2px solid #333; padding-top: 8px; margin-top: 5px; }
    .status-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 11px;
    }
    .pago-info {
      margin-top: 8px;
      padding: 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      text-align: center;
    }
    .pago { background: #d1fae5; color: #065f46; }
    .pendente { background: #fef3c7; color: #92400e; }
    .assinatura-area {
      margin-top: 30px;
      border-top: 1px solid #333;
      padding-top: 10px;
      text-align: center;
    }
    .assinatura-linha {
      margin-top: 40px;
      border-top: 1px solid #333;
      padding-top: 5px;
      font-size: 11px;
    }
    .assinatura-img {
      max-height: 60px;
      margin-bottom: 10px;
    }
    .footer {
      margin-top: 20px;
      border-top: 1px solid #e5e7eb;
      padding-top: 10px;
      font-size: 10px;
      color: #666;
      text-align: center;
    }
    @media print {
      body { background: white; }
    }
  </style>
</head>
<body>
  <div class="via">
    <div class="header">
      <h1>${os.loja.nome}</h1>
      <p>${os.loja.endereco || ''} ${os.loja.cidade ? `- ${os.loja.cidade}` : ''} ${os.loja.estado ? `/ ${os.loja.estado}` : ''}</p>
      <p>${os.loja.telefone || ''}</p>
    </div>
    
    <div class="os-numero">
      OS: <strong>#${os.numeroOs}</strong> | Data: ${formatDateTime(os.dataCriacao)}
    </div>
    
    <div class="section">
      <div class="section-title">CLIENTE</div>
      <div class="grid">
        <div class="field">
          <div class="field-label">Nome</div>
          <div class="field-value">${os.cliente.nome}</div>
        </div>
        <div class="field">
          <div class="field-label">Telefone</div>
          <div class="field-value">${os.cliente.telefone}</div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">EQUIPAMENTO</div>
      <div class="grid">
        <div class="field">
          <div class="field-label">Equipamento</div>
          <div class="field-value">${os.equipamento}</div>
        </div>
        <div class="field">
          <div class="field-label">Marca/Modelo</div>
          <div class="field-value">${os.marca || '-'} ${os.modelo || ''}</div>
        </div>
        ${os.imeiSerial ? `
        <div class="field">
          <div class="field-label">IMEI/Serial</div>
          <div class="field-value">${os.imeiSerial}</div>
        </div>
        ` : ''}
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">PROBLEMA</div>
      <div class="problema-box">
        ${os.problema}
        ${os.acessorios ? `<br><strong>Acessórios:</strong> ${os.acessorios}` : ''}
      </div>
    </div>
    
    ${os.diagnostico ? `
    <div class="section">
      <div class="section-title">DIAGNÓSTICO</div>
      <div class="problema-box">${os.diagnostico}</div>
    </div>
    ` : ''}
    
    ${os.solucao ? `
    <div class="section">
      <div class="section-title">SOLUÇÃO</div>
      <div class="problema-box">${os.solucao}</div>
    </div>
    ` : ''}
    
    <div class="section">
      <div class="section-title">STATUS</div>
      <p><span class="status-badge" style="background: ${STATUS_COLORS[os.status as StatusOS].replace('bg-', '').replace('-100', '')}20; color: ${STATUS_COLORS[os.status as StatusOS].replace('bg-', '').replace('-500', '')};">
        ${STATUS_LABELS[os.status as StatusOS]}
      </span></p>
    </div>
    
    ${valorTotal > 0 ? `
    <div class="valores">
      <div class="section-title">VALORES</div>
      ${os.orcamento ? `<div class="valor-linha"><span>Orçamento:</span><span>${formatCurrency(os.orcamento)}</span></div>` : ''}
      ${os.valorServico ? `<div class="valor-linha"><span>Serviço:</span><span>${formatCurrency(os.valorServico)}</span></div>` : ''}
      ${os.valorPecas ? `<div class="valor-linha"><span>Peças:</span><span>${formatCurrency(os.valorPecas)}</span></div>` : ''}
      <div class="valor-linha valor-total"><span>TOTAL:</span><span>${formatCurrency(valorTotal)}</span></div>
      ${os.formaPagamento ? `<div class="valor-linha"><span>Forma de Pagamento:</span><span>${FORMAS_PAGAMENTO[os.formaPagamento] || os.formaPagamento}</span></div>` : ''}
      <div class="pago-info ${os.pago ? 'pago' : 'pendente'}">
        ${os.pago ? '✓ PAGO' : 'PENDENTE'}
      </div>
    </div>
    ` : ''}
    
    <div class="assinatura-area">
      <p style="font-size: 11px; margin-bottom: 10px;">Assinatura do Cliente:</p>
      ${os.assinatura ? `<img src="${os.assinatura.imagem}" class="assinatura-img" alt="Assinatura" />` : ''}
      <div class="assinatura-linha">_________________________________</div>
    </div>
    
    <div class="footer">
      <p>TecOS - Sistema de Gestão de Ordens de Serviço</p>
      <p>Acompanhe sua OS em: https://tec-os.vercel.app/os/${os.id}</p>
    </div>
  </div>
</body>
</html>
  `
  
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(conteudo)
    printWindow.document.close()
    printWindow.print()
  }
}

export function OSPageClient({ os }: OSPageClientProps) {
  const [mostrarFotos, setMostrarFotos] = useState(false)
  const [aprovando, setAprovando] = useState(false)
  const [mostrarAssinatura, setMostrarAssinatura] = useState(false)
  const [assinando, setAssinando] = useState(false)
  const [nomeAssinatura, setNomeAssinatura] = useState('')
  
  // Estado para verificação do código de assinatura
  const [codigoVerificacao, setCodigoVerificacao] = useState('')
  const [codigoVerificado, setCodigoVerificado] = useState(false)
  const [erroCodigo, setErroCodigo] = useState('')
  
  // Estado para modal de foto ampliada
  const [fotoSelecionada, setFotoSelecionada] = useState<string | null>(null)
  
  // Estados para pagamento online (PIX via Efí Bank)
  const [copiouPix, setCopiouPix] = useState(false)
  const [gerandoPagamento, setGerandoPagamento] = useState<string | null>(null)
  
  // Estados para avaliação
  const [mostrarAvaliacao, setMostrarAvaliacao] = useState(false)
  const [notaAvaliacao, setNotaAvaliacao] = useState(5)
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState('')
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false)
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false)
  const [avaliacaoExistente, setAvaliacaoExistente] = useState<{
    nota: number
    comentario: string | null
  } | null>(null)
  
  const currentStatusIndex = STATUS_ORDER.indexOf(os.status as StatusOS)

  // Buscar avaliação existente ao carregar
  useEffect(() => {
    const buscarAvaliacao = async () => {
      try {
        const response = await fetch(`/api/os/${os.id}/avaliacao`)
        const data = await response.json()
        if (data.success && data.avaliacao) {
          setAvaliacaoExistente({
            nota: data.avaliacao.nota,
            comentario: data.avaliacao.comentario
          })
        }
      } catch (error) {
        console.error('Erro ao buscar avaliação:', error)
      }
    }
    
    buscarAvaliacao()
  }, [os.id])

  // Função para verificar o código de assinatura
  const verificarCodigo = () => {
    if (!os.codigoOs) {
      // Se não tem código na OS, permite assinar diretamente (OS antigas)
      setCodigoVerificado(true)
      return
    }
    
    if (codigoVerificacao.trim().toUpperCase() === os.codigoOs.toUpperCase()) {
      setCodigoVerificado(true)
      setErroCodigo('')
    } else {
      setErroCodigo('Código incorreto. Verifique o código impresso na sua OS.')
    }
  }

  const handleAprovarOrcamento = async (aprovado: boolean) => {
    setAprovando(true)

    try {
      const response = await fetch(`/api/os/${os.id}/aprovar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aprovado })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(aprovado ? 'Orçamento aprovado!' : 'Orçamento recusado')
        window.location.reload()
      } else {
        toast.error(data.error || 'Erro ao processar aprovação')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setAprovando(false)
    }
  }

  const handleSalvarAssinatura = async (imagem: string) => {
    if (!nomeAssinatura.trim()) {
      toast.error('Por favor, informe seu nome')
      return
    }

    setAssinando(true)

    try {
      const response = await fetch(`/api/os/${os.id}/assinatura`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imagem,
          nome: nomeAssinatura 
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Assinatura salva com sucesso!')
        window.location.reload()
      } else {
        toast.error(data.error || 'Erro ao salvar assinatura')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setAssinando(false)
    }
  }

  const handleImprimirEtiqueta = () => {
    imprimirOS(os)
  }

  // Função para copiar código PIX
  const handleCopiarPix = async () => {
    // Prioriza código do Efí Bank se for o gateway usado
    const codigo = os.pagamentoGateway === 'efi' 
      ? (os.efiPixCopiaCola || os.pixCopiaCola)
      : (os.pixCopiaCola || os.efiPixCopiaCola)
    
    if (codigo) {
      try {
        await navigator.clipboard.writeText(codigo)
        setCopiouPix(true)
        toast.success('Código PIX copiado!')
        setTimeout(() => setCopiouPix(false), 3000)
      } catch {
        toast.error('Erro ao copiar')
      }
    }
  }

  // Função para enviar avaliação
  const handleEnviarAvaliacao = async () => {
    if (notaAvaliacao < 1 || notaAvaliacao > 5) {
      toast.error('Selecione uma nota de 1 a 5')
      return
    }

    setEnviandoAvaliacao(true)
    
    try {
      const response = await fetch(`/api/os/${os.id}/avaliacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nota: notaAvaliacao,
          comentario: comentarioAvaliacao
        })
      })

      const data = await response.json()

      if (data.success) {
        setAvaliacaoEnviada(true)
        setMostrarAvaliacao(false)
        toast.success('Avaliação enviada com sucesso!')
      } else {
        toast.error(data.error || 'Erro ao enviar avaliação')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setEnviandoAvaliacao(false)
    }
  }

  // Função para gerar PIX via Efí Bank (lojista) ou Mercado Pago (fallback)
  const handleGerarPagamento = async () => {
    setGerandoPagamento('pix')
    
    try {
      const response = await fetch(`/api/os/${os.id}/pagamento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formaPagamento: 'pix' })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('PIX gerado com sucesso!')
        window.location.reload()
      } else {
        const errorMsg = data.details 
          ? `${data.error}: ${data.details}` 
          : data.error || 'Erro ao gerar PIX'
        toast.error(errorMsg, { duration: 8000 })
        console.error('[PIX Error]', data)
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setGerandoPagamento(null)
    }
  }

  // Lógica: se tem valores reais (serviço/peças), usa eles; senão usa orçamento
  const valorTotal = (() => {
    const vServico = os.valorServico || 0
    const vPecas = os.valorPecas || 0
    if (vServico > 0 || vPecas > 0) {
      return vServico + vPecas
    }
    return os.orcamento || 0
  })()

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 print:static">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {os.loja.logo ? (
                <Image
                  src={os.loja.logo}
                  alt={os.loja.nome}
                  width={40}
                  height={40}
                  className="rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="font-bold text-slate-900">{os.loja.nome}</h1>
                <p className="text-xs text-slate-500">Ordem de Serviço</p>
              </div>
            </div>
            
            <Badge variant="outline" className="text-lg font-mono">
              OS #{os.numeroOs}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Status Card */}
        <Card className="border-slate-200 mb-6 overflow-hidden">
          <div className={`h-2 ${STATUS_COLORS[os.status as StatusOS]}`} />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {STATUS_LABELS[os.status as StatusOS]}
                </CardTitle>
                <CardDescription>
                  Última atualização: {formatDateTime(os.atualizadoEm)}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleImprimirEtiqueta} className="print:hidden">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Timeline Visual */}
        <Card className="border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Acompanhe o Progresso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {STATUS_ORDER.map((status, index) => {
                const isPast = index < currentStatusIndex
                const isCurrent = index === currentStatusIndex
                const isFuture = index > currentStatusIndex
                
                const historicoItem = os.historico.find(h => h.status === status)

                return (
                  <div key={status} className="flex items-start gap-4 mb-4 last:mb-0">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                      ${isPast ? 'bg-emerald-500 text-white' : ''}
                      ${isCurrent ? 'bg-emerald-500 text-white ring-4 ring-emerald-200' : ''}
                      ${isFuture ? 'bg-slate-200 text-slate-400' : ''}
                    `}>
                      {STATUS_ICONS[status]}
                    </div>
                    
                    <div className="flex-1 pt-1">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium ${isFuture ? 'text-slate-400' : 'text-slate-900'}`}>
                          {STATUS_LABELS[status]}
                        </p>
                        {historicoItem && (
                          <span className="text-xs text-slate-500">
                            {formatDateTime(historicoItem.criadoEm)}
                          </span>
                        )}
                      </div>
                      {historicoItem?.descricao && (
                        <p className="text-sm text-slate-600 mt-1">
                          {historicoItem.descricao}
                        </p>
                      )}
                    </div>
                    
                    {index < STATUS_ORDER.length - 1 && (
                      <div className={`
                        absolute left-5 w-0.5 h-6
                        ${index < currentStatusIndex ? 'bg-emerald-500' : 'bg-slate-200'}
                      `} style={{ top: `${index * 64 + 40}px` }} />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Grid Info */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Equipamento */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                Equipamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="flex justify-between text-base">
                <span className="text-slate-600 font-medium">Equipamento</span>
                <span className="font-bold text-slate-800">{os.equipamento}</span>
              </div>
              {os.marca && (
                <div className="flex justify-between text-base">
                  <span className="text-slate-600 font-medium">Marca</span>
                  <span className="font-semibold text-slate-800">{os.marca}</span>
                </div>
              )}
              {os.modelo && (
                <div className="flex justify-between text-base">
                  <span className="text-slate-600 font-medium">Modelo</span>
                  <span className="font-semibold text-slate-800">{os.modelo}</span>
                </div>
              )}
              {os.imeiSerial && (
                <div className="flex justify-between text-base">
                  <span className="text-slate-600 font-medium">IMEI/Serial</span>
                  <span className="font-mono font-semibold text-slate-800">{os.imeiSerial}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cliente */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="flex justify-between text-base">
                <span className="text-slate-600 font-medium">Nome</span>
                <span className="font-bold text-slate-800">{os.cliente.nome}</span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-slate-600 font-medium">Telefone</span>
                <a href={`tel:${os.cliente.telefone}`} className="text-emerald-600 font-semibold hover:underline">
                  {os.cliente.telefone}
                </a>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-slate-600 font-medium">Data de Entrada</span>
                <span className="font-semibold text-slate-800">{formatDate(os.dataCriacao)}</span>
              </div>
              {os.dataPrevisao && (
                <div className="flex justify-between text-base">
                  <span className="text-slate-600 font-medium">Previsão de Entrega</span>
                  <span className="font-semibold text-slate-800">{formatDate(os.dataPrevisao)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Problema e Diagnóstico */}
        <Card className="border-slate-200 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold text-slate-800">Problema Relatado</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-lg text-slate-800 leading-relaxed">{os.problema}</p>
            
            {os.acessorios && (
              <>
                <Separator className="my-5" />
                <div className="text-base">
                  <span className="text-slate-600 font-medium">Acessórios entregues: </span>
                  <span className="text-slate-800">{os.acessorios}</span>
                </div>
              </>
            )}
            
            {os.estadoAparelho && (
              <div className="mt-3 text-base">
                <span className="text-slate-600 font-medium">Estado do aparelho: </span>
                <span className="text-slate-800">{os.estadoAparelho}</span>
              </div>
            )}
            
            {os.diagnostico && (
              <>
                <Separator className="my-5" />
                <div>
                  <h4 className="font-bold text-lg text-slate-800 mb-2">Diagnóstico</h4>
                  <p className="text-base text-slate-700 leading-relaxed">{os.diagnostico}</p>
                </div>
              </>
            )}
            
            {os.solucao && (
              <div className="mt-5">
                <h4 className="font-bold text-lg text-slate-800 mb-2">Solução Aplicada</h4>
                <p className="text-base text-slate-700 leading-relaxed">{os.solucao}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orçamento e Pagamento */}
        {(os.orcamento || valorTotal > 0) && (
          <Card className="border-slate-200 mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Valores e Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {os.orcamento && (
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl font-bold text-slate-900">
                    Orçamento: {formatCurrency(os.orcamento)}
                  </span>
                  {os.aprovado !== null && (
                    <Badge className={os.aprovado ? 'bg-green-500' : 'bg-red-500'}>
                      {os.aprovado ? 'Aprovado' : 'Não aprovado'}
                    </Badge>
                  )}
                </div>
              )}
              
              {valorTotal > 0 && (
                <div className="bg-slate-50 p-4 rounded-lg mb-4">
                  <div className="space-y-2">
                    {os.valorServico && os.valorServico > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Serviço:</span>
                        <span className="font-medium">{formatCurrency(os.valorServico)}</span>
                      </div>
                    )}
                    {os.valorPecas && os.valorPecas > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Peças:</span>
                        <span className="font-medium">{formatCurrency(os.valorPecas)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg">
                      <span className="font-bold">Total:</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(valorTotal)}</span>
                    </div>
                    {os.formaPagamento && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Forma de Pagamento:</span>
                        <span className="font-medium">{FORMAS_PAGAMENTO[os.formaPagamento] || os.formaPagamento}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-600">Status:</span>
                      <Badge className={os.pago ? 'bg-green-500' : 'bg-amber-500'}>
                        {os.pago ? 'Pago' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Opção de Pagamento Online - SÓ APARECE SE A LOJA CONFIGUROU EFÍ BANK */}
              {!os.pago && valorTotal > 0 && os.loja.usarPagamentoSistema && os.loja.efiClientId && os.loja.pixChave && (
                <div className="mt-4 space-y-4">
                  {/* Se já tem pagamento gerado via Efí Bank */}
                  {(os.efiPixQrCode || os.efiPixCopiaCola) ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-4">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Pagamento disponível!</span>
                        <Badge variant="outline" className="ml-2 text-xs">via Efí Bank</Badge>
                      </div>
                      
                      {/* QR Code PIX - Efí Bank */}
                      {os.efiPixQrCode && (
                        <div className="bg-white p-4 rounded-lg border border-emerald-200 text-center">
                          <p className="text-sm text-slate-600 mb-2">Escaneie o QR Code para pagar com PIX</p>
                          <img 
                            src={os.efiPixQrCode.startsWith('data:') ? os.efiPixQrCode : `data:image/png;base64,${os.efiPixQrCode}`}
                            alt="QR Code PIX"
                            className="mx-auto w-48 h-48"
                          />
                        </div>
                      )}
                      
                      {/* Código PIX Copia e Cola - Efí Bank */}
                      {os.efiPixCopiaCola && (
                        <div className="space-y-2">
                          <p className="text-sm text-slate-600">Ou copie o código PIX:</p>
                          <div className="flex gap-2">
                            <div className="flex-1 bg-white p-3 rounded border border-emerald-200 font-mono text-xs break-all">
                              {os.efiPixCopiaCola?.substring(0, 50)}...
                            </div>
                            <Button 
                              onClick={handleCopiarPix}
                              variant="outline"
                              className="shrink-0"
                            >
                              {copiouPix ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Botão para gerar PIX via Efí Bank */
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                      <div className="flex items-center gap-2 text-blue-700">
                        <QrCode className="w-5 h-5" />
                        <span className="font-medium">Pagar com PIX</span>
                      </div>
                      
                      <button
                        onClick={() => handleGerarPagamento('pix')}
                        disabled={gerandoPagamento !== null}
                        className="w-full flex flex-col items-center p-6 rounded-xl border-2 border-emerald-500 bg-emerald-50 hover:bg-emerald-100 transition-all disabled:opacity-50"
                      >
                        {gerandoPagamento === 'pix' ? (
                          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-2" />
                        ) : (
                          <QrCode className="w-10 h-10 text-emerald-600 mb-2" />
                        )}
                        <span className="font-bold text-emerald-700 text-lg">Gerar QR Code PIX</span>
                        <span className="text-sm text-emerald-600 mt-1">Valor: {formatCurrency(valorTotal)}</span>
                      </button>
                      
                      <p className="text-xs text-slate-500 text-center">
                        Pagamento processado por Efí Bank
                      </p>
                    </div>
                  )}
                </div>
              )}
              
            </CardContent>
          </Card>
        )}

        {/* Fotos */}
        {os.fotos.length > 0 && (
          <Card className="border-slate-200 mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-600" />
                  Fotos ({os.fotos.length})
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setMostrarFotos(!mostrarFotos)}
                >
                  {mostrarFotos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            {mostrarFotos && (
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {os.fotos.map((foto) => (
                    <div 
                      key={foto.id} 
                      className="relative group cursor-pointer"
                      onClick={() => setFotoSelecionada(foto.arquivo)}
                    >
                      <img
                        src={foto.arquivo}
                        alt={foto.descricao || 'Foto da OS'}
                        className="w-full h-32 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity"
                      />
                      {foto.descricao && (
                        <p className="text-xs text-slate-500 mt-1">{foto.descricao}</p>
                      )}
                      <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
                        {foto.tipo}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Aprovação do Orçamento - Aparece quando está aguardando aprovação */}
        {os.status === 'aguardando_aprovacao' && os.aprovado === null && (
          <Card className="border-amber-200 bg-amber-50 mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                <AlertCircle className="w-5 h-5" />
                Aprovação do Orçamento
              </CardTitle>
              <CardDescription className="text-amber-600">
                Por favor, aprove ou recuse o orçamento abaixo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {os.orcamento && os.orcamento > 0 && (
                <div className="bg-white p-4 rounded-lg border border-amber-200 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-slate-700">Valor do Orçamento:</span>
                    <span className="text-2xl font-bold text-emerald-600">{formatCurrency(os.orcamento)}</span>
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleAprovarOrcamento(true)}
                  disabled={aprovando}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprovar Orçamento
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => handleAprovarOrcamento(false)}
                  disabled={aprovando}
                >
                  Não Aprovar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assinatura Digital */}
        <Card className="border-slate-200 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <PenTool className="w-5 h-5 text-emerald-600" />
              Assinatura Digital
            </CardTitle>
            <CardDescription>
              Assine esta ordem de serviço para confirmar o recebimento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {os.assinatura ? (
              <div className="space-y-3">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 font-medium mb-2">
                    Documento assinado digitalmente
                  </p>
                  <img
                    src={os.assinatura.imagem}
                    alt="Assinatura"
                    className="max-h-24 bg-white rounded border p-2"
                  />
                  {os.assinatura.nome && (
                    <p className="text-sm text-green-600 mt-2">
                      Assinado por: <strong>{os.assinatura.nome}</strong>
                    </p>
                  )}
                  <p className="text-xs text-green-500 mt-1">
                    em {formatDateTime(os.assinatura.criadoEm)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {!mostrarAssinatura ? (
                  <Button 
                    onClick={() => setMostrarAssinatura(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <PenTool className="w-4 h-4 mr-2" />
                    Assinar Documento
                  </Button>
                ) : (
                  <div className="space-y-4">
                    {/* Verificação do Código de Assinatura */}
                    {!codigoVerificado && os.codigoOs && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                        <div className="flex items-center gap-2 text-amber-700">
                          <Lock className="w-5 h-5" />
                          <span className="font-medium">Verificação de Segurança</span>
                        </div>
                        <p className="text-sm text-amber-600">
                          Digite o código de assinatura que está impresso na sua Ordem de Serviço para poder assinar.
                        </p>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                            <Input
                              placeholder="Digite o código de assinatura"
                              value={codigoVerificacao}
                              onChange={(e) => {
                                setCodigoVerificacao(e.target.value.toUpperCase())
                                setErroCodigo('')
                              }}
                              className="pl-10 uppercase font-mono tracking-wider"
                              maxLength={12}
                            />
                          </div>
                          <Button 
                            onClick={verificarCodigo}
                            className="bg-amber-600 hover:bg-amber-700"
                          >
                            Verificar
                          </Button>
                        </div>
                        {erroCodigo && (
                          <p className="text-sm text-red-600">{erroCodigo}</p>
                        )}
                      </div>
                    )}
                    
                    {/* Formulário de assinatura - só aparece após verificar código */}
                    {(codigoVerificado || !os.codigoOs) && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="nomeAssinatura">Seu Nome *</Label>
                          <Input
                            id="nomeAssinatura"
                            placeholder="Digite seu nome completo"
                            value={nomeAssinatura}
                            onChange={(e) => setNomeAssinatura(e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <Label>Sua Assinatura</Label>
                          <div className="mt-2">
                            <SignatureCanvas 
                              onSave={handleSalvarAssinatura}
                              onCancel={() => {
                                setMostrarAssinatura(false)
                                setCodigoVerificado(false)
                                setCodigoVerificacao('')
                              }}
                              width={400}
                              height={150}
                            />
                          </div>
                        </div>
                        
                        {assinando && (
                          <p className="text-sm text-slate-500 text-center">
                            Salvando assinatura...
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Avaliação do Atendimento */}
        {os.assinatura && (
          <Card className="border-slate-200 mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Avaliação do Atendimento
              </CardTitle>
              <CardDescription>
                Sua opinião é muito importante para nós
              </CardDescription>
            </CardHeader>
            <CardContent>
              {avaliacaoEnviada || avaliacaoExistente ? (
                <div className="text-center py-4">
                  <div className="flex justify-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-8 h-8 ${
                          star <= (avaliacaoExistente?.nota || notaAvaliacao)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-green-600 font-medium">Obrigado pela sua avaliação!</p>
                  {(avaliacaoExistente?.comentario || comentarioAvaliacao) && (
                    <p className="text-slate-600 text-sm mt-2 italic">
                      "{avaliacaoExistente?.comentario || comentarioAvaliacao}"
                    </p>
                  )}
                </div>
              ) : mostrarAvaliacao ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-slate-600 mb-2 block">Sua nota</Label>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNotaAvaliacao(star)}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`w-10 h-10 ${
                              star <= notaAvaliacao
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-slate-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="comentarioAvaliacao" className="text-sm text-slate-600 mb-2 block">
                      Comentário (opcional)
                    </Label>
                    <textarea
                      id="comentarioAvaliacao"
                      placeholder="Conte-nos como foi sua experiência..."
                      value={comentarioAvaliacao}
                      onChange={(e) => setComentarioAvaliacao(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setMostrarAvaliacao(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleEnviarAvaliacao}
                      disabled={enviandoAvaliacao}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {enviandoAvaliacao ? (
                        'Enviando...'
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar Avaliação
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-slate-600 mb-3">
                    Como foi sua experiência com nossa assistência?
                  </p>
                  <Button
                    onClick={() => setMostrarAvaliacao(true)}
                    className="bg-yellow-500 hover:bg-yellow-600"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Avaliar Atendimento
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* QR Code */}
        <Card className="border-slate-200 mb-6 print:break-inside-avoid">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" />
              QR Code da OS
            </CardTitle>
            <CardDescription>
              Escaneie para acessar esta página rapidamente
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/os/${os.id}`)}`}
                alt="QR Code"
                className="w-36 h-36"
              />
            </div>
            <p className="text-sm text-slate-500 mt-4 text-center">
              OS #{os.numeroOs} - {os.equipamento}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {os.cliente.nome}
            </p>
          </CardContent>
        </Card>

        {/* Contato da Loja */}
        <Card className="border-slate-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Precisa de Ajuda?</CardTitle>
            <CardDescription>
              Entre em contato com {os.loja.nome}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href={`tel:${os.loja.telefone}`} className="flex-1">
                <Button variant="outline" className="w-full">
                  <Phone className="w-4 h-4 mr-2" />
                  Ligar
                </Button>
              </a>
              <a 
                href={`https://wa.me/55${os.loja.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Gostaria de informações sobre a OS #${os.numeroOs}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </a>
            </div>
            
            <div className="mt-4 flex items-start gap-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{os.loja.endereco}, {os.loja.cidade} - {os.loja.estado}</span>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Modal de Foto Ampliada */}
      {fotoSelecionada && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setFotoSelecionada(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-slate-300"
            onClick={() => setFotoSelecionada(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={fotoSelecionada} 
            alt="Foto ampliada" 
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 mt-8 print:hidden">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            Powered by <span className="text-emerald-400">TecOS</span>
          </p>
        </div>
      </footer>
    </div>
  )
}
