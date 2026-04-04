'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  Save,
  User,
  Smartphone,
  FileText,
  DollarSign,
  Clock,
  ExternalLink,
  QrCode,
  MessageCircle,
  Printer,
  CreditCard,
  CheckCircle,
  Camera,
  Trash2,
  X,
  Key,
  AlertTriangle,
  Send
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { STATUS_LABELS, STATUS_COLORS, type StatusOS } from '@/types'
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { OrdemServico, Cliente, HistoricoOS, FotoOS, Assinatura, Usuario, Loja } from '@prisma/client'
import { UploadImagem } from '@/components/painel/UploadImagem'

interface OSDetailPageProps {
  os: OrdemServico & {
    cliente: Cliente
    tecnico: { id: string; nome: string } | null
    historico: HistoricoOS[]
    fotos: FotoOS[]
    assinatura: Assinatura | null
    loja: { 
      id: string; 
      slug: string; 
      nome: string; 
      telefone?: string; 
      endereco?: string; 
      cidade?: string; 
      estado?: string; 
      logo?: string;
      // Campos Efí Bank
      usarPagamentoSistema?: boolean;
      efiClientId?: string | null;
      efiAmbiente?: string | null;
      pixChave?: string | null;
      pixTipo?: string | null;
      pixNome?: string | null;
    }
    // Campos de pagamento Mercado Pago
    mpPaymentId?: string | null
    mpPreferenceId?: string | null
    linkPagamento?: string | null
    pixQrCode?: string | null
    pixCopiaCola?: string | null
    boletoUrl?: string | null
    // Campos de pagamento Efí Bank
    efiPaymentId?: string | null
    efiPixQrCode?: string | null
    efiPixCopiaCola?: string | null
    efiTxId?: string | null
    pagamentoGateway?: string | null
  }
}

const FORMAS_PAGAMENTO = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'crediario', label: 'Crediário' },
]

// Função para imprimir a OS em duas vias (A4 Paisagem)
const imprimirOS = async (os: OSDetailPageProps['os']) => {
  // Soma todos os valores: orçamento + serviço + peças
  const valorTotal = (os.orcamento || 0) + (os.valorServico || 0) + (os.valorPecas || 0)
  
  // Gerar QR Code para acompanhamento da OS
  const linkAcompanhamento = `https://tec-os.vercel.app/os/${os.id}`
  let qrCodeBase64 = ''
  
  try {
    // Importar dinamicamente a biblioteca qrcode
    const QRCode = (await import('qrcode')).default
    qrCodeBase64 = await QRCode.toDataURL(linkAcompanhamento, {
      width: 80,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error)
  }
  
  const conteudo = `
<!DOCTYPE html>
<html>
<head>
  <title>OS #${os.numeroOs} - ${os.loja.nome}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { 
      size: A4 landscape; 
      margin: 3mm;
    }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 10px; 
      display: flex;
      justify-content: center;
      align-items: flex-start;
      background: white;
      color: #000;
      min-height: 100vh;
    }
    .container {
      display: flex;
      gap: 5mm;
      width: 100%;
      height: 100%;
      padding: 2mm;
    }
    .via {
      flex: 1;
      background: white;
      padding: 4mm;
      border: 2px solid #000;
      display: flex;
      flex-direction: column;
      font-size: 10px;
      max-height: 190mm;
      overflow: hidden;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .header-logo {
      max-width: 80px;
      max-height: 35px;
      margin-bottom: 2px;
      object-fit: contain;
    }
    .header h1 { font-size: 14px; color: #000; margin-bottom: 1px; font-weight: bold; }
    .header p { color: #000; font-size: 9px; }
    .via-titulo {
      text-align: center;
      padding: 4px;
      margin-bottom: 5px;
      border-radius: 3px;
      font-weight: bold;
      font-size: 11px;
    }
    .via-cliente { background: #000; color: #fff; }
    .via-loja { background: #333; color: #fff; }
    .os-numero {
      text-align: right;
      font-size: 10px;
      color: #000;
      margin-bottom: 5px;
    }
    .os-numero strong { font-size: 12px; color: #000; }
    .section { margin-bottom: 5px; }
    .section-title {
      background: #000;
      color: #fff;
      padding: 2px 5px;
      font-weight: bold;
      border-radius: 2px;
      margin-bottom: 3px;
      font-size: 9px;
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; }
    .field { margin-bottom: 2px; }
    .field-label { font-weight: bold; color: #000; font-size: 8px; text-transform: uppercase; }
    .field-value { color: #000; font-size: 10px; font-weight: 600; }
    .problema-box {
      border: 1px solid #000;
      padding: 4px;
      border-radius: 2px;
      background: #fff;
      font-size: 10px;
      line-height: 1.3;
    }
    .valores { margin-top: 5px; border-top: 1px solid #000; padding-top: 5px; }
    .valor-linha { display: flex; justify-content: space-between; padding: 1px 0; font-size: 10px; }
    .valor-total { font-weight: bold; font-size: 12px; border-top: 1px solid #000; padding-top: 3px; margin-top: 2px; }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 9px;
      border: 1px solid #000;
    }
    .pago-info {
      margin-top: 3px;
      padding: 3px;
      border-radius: 2px;
      font-size: 10px;
      font-weight: bold;
      text-align: center;
      border: 1px solid #000;
    }
    .pago { background: #000; color: #fff; }
    .pendente { background: #fff; color: #000; }
    .assinatura-area {
      margin-top: auto;
      border-top: 1px solid #000;
      padding-top: 5px;
      text-align: center;
    }
    .assinatura-linha {
      margin-top: 15px;
      border-top: 1px solid #000;
      padding-top: 2px;
      font-size: 9px;
    }
    .assinatura-img {
      max-height: 30px;
      margin-bottom: 2px;
    }
    .qrcode-box {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 5px;
      padding: 5px;
      border: 1px solid #000;
      border-radius: 3px;
      background: #fff;
    }
    .qrcode-img {
      width: 50px;
      height: 50px;
    }
    .qrcode-text {
      text-align: left;
      font-size: 8px;
      color: #000;
    }
    .qrcode-text p { margin-bottom: 1px; }
    .codigo-box {
      display: inline-block;
      background: #000;
      color: #fff;
      padding: 2px 6px;
      border-radius: 2px;
      font-weight: bold;
      font-size: 10px;
      letter-spacing: 1px;
    }
    .footer {
      margin-top: 5px;
      border-top: 1px solid #000;
      padding-top: 3px;
      font-size: 8px;
      color: #000;
      text-align: center;
    }
    @media print {
      body { background: white; min-height: auto; }
      .container { border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- VIA DO CLIENTE -->
    <div class="via">
      <div class="via-titulo via-cliente">📱 VIA DO CLIENTE</div>
      <div class="header">
        ${os.loja.logo ? `<img src="${os.loja.logo}" class="header-logo" alt="Logo" />` : ''}
        <h1>${os.loja.nome}</h1>
        <p>${os.loja.endereco || ''} ${os.loja.cidade ? `- ${os.loja.cidade}` : ''} ${os.loja.estado ? `/ ${os.loja.estado}` : ''}</p>
        <p>${os.loja.telefone || ''}</p>
      </div>
      
      <div class="os-numero">
        OS: <strong>#${os.numeroOs}</strong> | Data: ${formatDateTime(os.dataCriacao)}<br>
        <span style="font-size: 10px; font-weight: bold;">Código: <strong>${os.codigoOs || os.id.substring(0, 8).toUpperCase()}</strong></span>
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
        ${os.formaPagamento ? `<div class="valor-linha"><span>Forma Pgto:</span><span>${FORMAS_PAGAMENTO.find(f => f.value === os.formaPagamento)?.label || os.formaPagamento}</span></div>` : ''}
        <div class="pago-info ${os.pago ? 'pago' : 'pendente'}">
          ${os.pago ? '✓ PAGO' : 'PENDENTE'}
        </div>
      </div>
      ` : ''}
      
      <div class="assinatura-area">
        <p style="font-size: 10px; font-weight: bold;">Assinatura do Cliente:</p>
        ${os.assinatura ? `<img src="${os.assinatura.imagem}" class="assinatura-img" alt="Assinatura" />` : ''}
        <div class="assinatura-linha">_________________________________</div>
      </div>
      
      ${qrCodeBase64 ? `
      <div class="qrcode-box">
        <img src="${qrCodeBase64}" class="qrcode-img" alt="QR Code" />
        <div class="qrcode-text">
          <p><strong>📱 Escaneie para acompanhar</strong></p>
          <p>sua OS em tempo real</p>
          <p style="margin-top: 4px;">Código: <span class="codigo-box">${os.codigoOs || os.id.substring(0, 8).toUpperCase()}</span></p>
        </div>
      </div>
      ` : ''}
      
      <div class="footer">
        <p><strong>TecOS</strong> - Sistema de Gestão de Ordens de Serviço</p>
      </div>
    </div>
    
    <!-- VIA DA LOJA -->
    <div class="via">
      <div class="via-titulo via-loja">📋 VIA DA LOJA</div>
      <div class="header">
        ${os.loja.logo ? `<img src="${os.loja.logo}" class="header-logo" alt="Logo" />` : ''}
        <h1>${os.loja.nome}</h1>
        <p>${os.loja.endereco || ''} ${os.loja.cidade ? `- ${os.loja.cidade}` : ''} ${os.loja.estado ? `/ ${os.loja.estado}` : ''}</p>
        <p>${os.loja.telefone || ''}</p>
      </div>
      
      <div class="os-numero">
        OS: <strong>#${os.numeroOs}</strong> | Data: ${formatDateTime(os.dataCriacao)}<br>
        <span style="font-size: 10px; font-weight: bold;">Código Assinatura: <strong>${os.codigoOs || ''}</strong></span>
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
          ${os.senhaAparelho ? `
          <div class="field">
            <div class="field-label">Senha</div>
            <div class="field-value">${os.senhaAparelho}</div>
          </div>
          ` : ''}
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">PROBLEMA</div>
        <div class="problema-box">
          ${os.problema}
          ${os.acessorios ? `<br><strong>Acessórios:</strong> ${os.acessorios}` : ''}
          ${os.estadoAparelho ? `<br><strong>Estado:</strong> ${os.estadoAparelho}` : ''}
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
        ${os.formaPagamento ? `<div class="valor-linha"><span>Forma Pgto:</span><span>${FORMAS_PAGAMENTO.find(f => f.value === os.formaPagamento)?.label || os.formaPagamento}</span></div>` : ''}
        <div class="pago-info ${os.pago ? 'pago' : 'pendente'}">
          ${os.pago ? '✓ PAGO' : 'PENDENTE'}
        </div>
      </div>
      ` : ''}
      
      <div class="assinatura-area">
        <p style="font-size: 10px; font-weight: bold;">Assinatura do Técnico:</p>
        <div class="assinatura-linha">_________________________________</div>
      </div>
      
      <div class="footer">
        <p><strong>TecOS</strong> - Sistema de Gestão de Ordens de Serviço</p>
      </div>
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

export function OSDetailPage({ os }: OSDetailPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(os.status)
  const [orcamento, setOrcamento] = useState(os.orcamento?.toString() || '')
  const [diagnostico, setDiagnostico] = useState(os.diagnostico || '')
  const [solucao, setSolucao] = useState(os.solucao || '')
  const [valorServico, setValorServico] = useState(os.valorServico?.toString() || '')
  const [valorPecas, setValorPecas] = useState(os.valorPecas?.toString() || '')
  const [formaPagamento, setFormaPagamento] = useState(os.formaPagamento || '')
  const [pago, setPago] = useState(os.pago)
  const [garantiaDias, setGarantiaDias] = useState(os.garantiaDias?.toString() || '90')
  const [fotos, setFotos] = useState<FotoOS[]>(os.fotos)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  
  // Estados para CPF do cliente
  const [clienteCpf, setClienteCpf] = useState(os.cliente.cpf || '')
  const [atualizandoCpf, setAtualizandoCpf] = useState(false)
  
  // Estados para modal de foto
  const [fotoSelecionada, setFotoSelecionada] = useState<string | null>(null)
  
  // Estados para exclusão
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Estado para QR Code gerado localmente
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  // Gerar QR Code quando o componente montar
  useEffect(() => {
    const gerarQRCode = async () => {
      try {
        const QRCode = (await import('qrcode')).default
        const link = `${window.location.origin}/os/${os.id}`
        const qr = await QRCode.toDataURL(link, {
          width: 150,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        })
        setQrCodeUrl(qr)
      } catch (error) {
        console.error('Erro ao gerar QR Code:', error)
      }
    }
    gerarQRCode()
  }, [os.id])
  
  // Estados para pagamento online
  const [gerandoPagamento, setGerandoPagamento] = useState(false)
  const [pagamentoGerado, setPagamentoGerado] = useState<{
    linkPagamento?: string
    pixQrCode?: string
    pixCopiaCola?: string
    boletoUrl?: string
    valorTotal?: number
  } | null>(null)

  // Estado para popup de WhatsApp após mudança de status
  const [showWhatsAppPopup, setShowWhatsAppPopup] = useState(false)
  const [whatsappData, setWhatsappData] = useState<{
    status: string
    link: string
    mensagem: string
  } | null>(null)

  // Verificar se houve mudança de status recente ao carregar
  useEffect(() => {
    const storageKey = `os_status_change_${os.id}`
    const savedData = sessionStorage.getItem(storageKey)
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        // Só mostra se foi há menos de 30 segundos
        if (parsed.timestamp && (Date.now() - parsed.timestamp < 30000)) {
          setWhatsappData({
            status: parsed.status,
            link: parsed.link,
            mensagem: parsed.mensagem
          })
          setShowWhatsAppPopup(true)
        }
        // Limpa o sessionStorage
        sessionStorage.removeItem(storageKey)
      } catch (e) {
        console.error('Erro ao recuperar dados do status:', e)
      }
    }
  }, [os.id])

  const handlePrint = async () => {
    await imprimirOS(os)
  }

  // Atualizar CPF do cliente
  const handleAtualizarCpf = async () => {
    setAtualizandoCpf(true)
    try {
      const response = await fetch(`/api/painel/clientes/${os.cliente.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: clienteCpf })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('CPF atualizado com sucesso!')
      } else {
        toast.error(data.error || 'Erro ao atualizar CPF')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setAtualizandoCpf(false)
    }
  }

  // Função para gerar mensagem de WhatsApp baseada no status
  const gerarMensagemWhatsApp = (novoStatus: string, valorTotalOS: number) => {
    const linkOS = `${window.location.origin}/os/${os.id}`
    const telefone = os.cliente.telefone.replace(/\D/g, '')
    
    const mensagens: Record<string, string> = {
      aguardando: `Olá ${os.cliente.nome}!

Sua OS #${os.numeroOs} foi criada e está aguardando análise.

Equipamento: ${os.equipamento}
${os.marca ? `Marca: ${os.marca}` : ''}

Acompanhe seu reparo em tempo real:
${linkOS}

${os.loja.nome}`,

      em_analise: `Olá ${os.cliente.nome}!

Seu equipamento está em análise técnica.

OS #${os.numeroOs}
Equipamento: ${os.equipamento}

Em breve entraremos em contato com o diagnóstico.

Acompanhe em:
${linkOS}

${os.loja.nome}`,

      aguardando_aprovacao: `Olá ${os.cliente.nome}!

🔍 Diagnóstico concluído!

OS #${os.numeroOs}
Equipamento: ${os.equipamento}

${os.diagnostico ? `Diagnóstico: ${os.diagnostico}` : ''}
${valorTotalOS > 0 ? `\n💰 Valor: ${formatCurrency(valorTotalOS)}` : ''}

✅ Acesse o link para APROVAR ou RECUSAR:
${linkOS}

${os.loja.nome}`,

      em_reparo: `Olá ${os.cliente.nome}!

🔧 Seu equipamento está em reparo!

OS #${os.numeroOs}
Equipamento: ${os.equipamento}

Estamos trabalhando para finalizar o mais rápido possível.

Acompanhe o progresso:
${linkOS}

${os.loja.nome}`,

      aguardando_pecas: `Olá ${os.cliente.nome}!

📦 Aguardando peças para seu reparo.

OS #${os.numeroOs}
Equipamento: ${os.equipamento}

Assim que as peças chegarem, iniciaremos o reparo.

Acompanhe em:
${linkOS}

${os.loja.nome}`,

      pronto: `Olá ${os.cliente.nome}!

✅ Boa notícia! Seu equipamento está PRONTO!

OS #${os.numeroOs}
Equipamento: ${os.equipamento}
${os.marca ? `Marca: ${os.marca}` : ''}

${valorTotalOS > 0 ? `💰 Valor: ${formatCurrency(valorTotalOS)}` : ''}
📍 Retire na loja: ${os.loja.endereco || ''} ${os.loja.cidade ? `- ${os.loja.cidade}` : ''}

Mais detalhes:
${linkOS}

${os.loja.nome}`,

      entregue: `Olá ${os.cliente.nome}!

🎉 Equipamento entregue com sucesso!

OS #${os.numeroOs}
Equipamento: ${os.equipamento}

Obrigado pela confiança!

Avalie nosso serviço:
${linkOS}

${os.loja.nome}`,

      cancelado: `Olá ${os.cliente.nome}!

Sua OS #${os.numeroOs} foi cancelada.

Equipamento: ${os.equipamento}

Se tiver dúvidas, entre em contato conosco.

${os.loja.nome}`
    }

    return {
      mensagem: mensagens[novoStatus] || mensagens.aguardando,
      link: `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagens[novoStatus] || mensagens.aguardando)}`
    }
  }

  // Enviar WhatsApp quando a OS fica pronta (mantido para compatibilidade)
  const handleEnviarWhatsAppPronto = (valorTotalOS: number) => {
    const { link } = gerarMensagemWhatsApp('pronto', valorTotalOS)
    window.open(link, '_blank')
  }

  const handleUpdateStatus = async () => {
    if (status === os.status) return

    setLoading(true)
    try {
      const response = await fetch(`/api/painel/os/${os.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      const data = await response.json()

      if (data.success) {
        // Calcula valor total para a mensagem
        const valorTotalOS = (os.orcamento || 0) + (os.valorServico || 0) + (os.valorPecas || 0)
        const { link, mensagem } = gerarMensagemWhatsApp(status, valorTotalOS)
        
        // Salva no sessionStorage para mostrar popup após reload
        const storageKey = `os_status_change_${os.id}`
        sessionStorage.setItem(storageKey, JSON.stringify({
          status,
          link,
          mensagem,
          timestamp: Date.now()
        }))
        
        toast.success('Status atualizado com sucesso!')
        
        // Recarrega a página - o popup vai aparecer automaticamente
        window.location.reload()
      } else {
        toast.error(data.error || 'Erro ao atualizar status')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateOrcamento = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/painel/os/${os.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orcamento: parseFloat(orcamento) || null,
          diagnostico,
          solucao,
          valorServico: parseFloat(valorServico) || null,
          valorPecas: parseFloat(valorPecas) || null,
          formaPagamento: formaPagamento || null,
          pago,
          garantiaDias: parseInt(garantiaDias) || null
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Dados atualizados com sucesso!')
        window.location.reload()
      } else {
        toast.error(data.error || 'Erro ao atualizar dados')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  const handleEnviarWhatsApp = () => {
    const linkOS = `${window.location.origin}/os/${os.id}`
    const mensagem = `Olá ${os.cliente.nome}!

Sua ordem de serviço #${os.numeroOs} foi criada.

Equipamento: ${os.equipamento}
Status: ${STATUS_LABELS[os.status as StatusOS]}

Acompanhe seu reparo em tempo real:
${linkOS}

${os.loja.nome}`
    
    const telefone = os.cliente.telefone.replace(/\D/g, '')
    window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`, '_blank')
  }

  // Upload de foto na OS
  const handleUploadFoto = async (url: string) => {
    setUploadingFoto(true)
    try {
      const response = await fetch(`/api/painel/os/${os.id}/fotos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arquivo: url,
          descricao: '',
          tipo: 'recebimento'
        }),
      })

      const data = await response.json()
      
      if (data.sucesso) {
        setFotos([...fotos, data.foto])
        toast.success('Foto adicionada!')
      } else {
        toast.error(data.erro || 'Erro ao adicionar foto')
      }
    } catch {
      toast.error('Erro ao adicionar foto')
    } finally {
      setUploadingFoto(false)
    }
  }

  // Remover foto da OS
  const handleRemoverFoto = async (fotoId: string) => {
    try {
      const response = await fetch(`/api/painel/os/${os.id}/fotos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fotoId }),
      })

      const data = await response.json()
      
      if (data.sucesso) {
        setFotos(fotos.filter(f => f.id !== fotoId))
        toast.success('Foto removida!')
      } else {
        toast.error(data.erro || 'Erro ao remover foto')
      }
    } catch {
      toast.error('Erro ao remover foto')
    }
  }

  // Excluir OS
  const handleExcluirOS = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/painel/os/${os.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Ordem de serviço excluída com sucesso!')
        router.push('/painel/os')
      } else {
        toast.error(data.error || 'Erro ao excluir OS')
      }
    } catch {
      toast.error('Erro ao excluir OS')
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  // Gerar pagamento online para o cliente (Efí Bank PIX ou Mercado Pago)
  const handleGerarPagamento = async () => {
    setGerandoPagamento(true)
    
    try {
      // Gerar PIX via Efí Bank (primeira opção)
      const response = await fetch(`/api/os/${os.id}/pagamento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formaPagamento: 'pix' })
      })

      const data = await response.json()

      if (data.success) {
        setPagamentoGerado(data.pagamento)
        toast.success('PIX gerado! O cliente pode acessar a página pública para pagar.')
      } else {
        toast.error(data.error || 'Erro ao gerar pagamento')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setGerandoPagamento(false)
    }
  }

  const valorTotal = (() => {
    // Soma todos os valores: orçamento + serviço + peças
    const vOrcamento = parseFloat(orcamento) || 0
    const vServico = parseFloat(valorServico) || 0
    const vPecas = parseFloat(valorPecas) || 0
    return vOrcamento + vServico + vPecas
  })()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/painel/os">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">OS #{os.numeroOs}</h1>
              <Badge className={`${STATUS_COLORS[os.status as StatusOS]} text-white`}>
                {STATUS_LABELS[os.status as StatusOS]}
              </Badge>
            </div>
            <p className="text-slate-500">Criada em {formatDateTime(os.dataCriacao)}</p>
            {/* Código de Assinatura */}
            {os.codigoOs && (
              <div className="flex items-center gap-2 mt-1 text-sm">
                <Key className="w-4 h-4 text-emerald-600" />
                <span className="text-slate-500">Código Assinatura:</span>
                <span className="font-mono font-bold text-emerald-600">{os.codigoOs}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={handleEnviarWhatsApp}>
            <MessageCircle className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
          <a href={`/os/${os.id}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver como Cliente
            </Button>
          </a>
          <Button 
            variant="outline" 
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Atualizar Status */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Atualizar Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleUpdateStatus}
                  disabled={loading || status === os.status}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Diagnóstico e Orçamento */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Diagnóstico e Orçamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="diagnostico">Diagnóstico</Label>
                <Textarea
                  id="diagnostico"
                  placeholder="Descreva o diagnóstico do problema..."
                  value={diagnostico}
                  onChange={(e) => setDiagnostico(e.target.value)}
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="solucao">Solução Aplicada</Label>
                <Textarea
                  id="solucao"
                  placeholder="Descreva a solução aplicada..."
                  value={solucao}
                  onChange={(e) => setSolucao(e.target.value)}
                  rows={2}
                />
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orcamento">Orçamento (R$)</Label>
                  <Input
                    id="orcamento"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={orcamento}
                    onChange={(e) => setOrcamento(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valorServico">Valor Serviço (R$)</Label>
                  <Input
                    id="valorServico"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={valorServico}
                    onChange={(e) => setValorServico(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valorPecas">Valor Peças (R$)</Label>
                  <Input
                    id="valorPecas"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={valorPecas}
                    onChange={(e) => setValorPecas(e.target.value)}
                  />
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Forma de Pagamento
                  </Label>
                  <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGAMENTO.map((forma) => (
                        <SelectItem key={forma.value} value={forma.value}>
                          {forma.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Status do Pagamento</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox 
                      id="pago" 
                      checked={pago} 
                      onCheckedChange={(checked) => setPago(checked as boolean)}
                    />
                    <label 
                      htmlFor="pago" 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                    >
                      {pago ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Pago
                        </span>
                      ) : (
                        <span className="text-amber-600">Pendente</span>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Garantia */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Garantia (dias)
                  </Label>
                  <Select value={garantiaDias} onValueChange={setGarantiaDias}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="60">60 dias</SelectItem>
                      <SelectItem value="90">90 dias (padrão)</SelectItem>
                      <SelectItem value="120">120 dias</SelectItem>
                      <SelectItem value="180">180 dias (6 meses)</SelectItem>
                      <SelectItem value="365">365 dias (1 ano)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Mostrar data de validade da garantia se a OS estiver entregue */}
                {os.status === 'entregue' && os.garantiaFim && (
                  <div className="space-y-2">
                    <Label>Validade da Garantia</Label>
                    <div className={`p-3 rounded-lg ${
                      new Date(os.garantiaFim) > new Date() 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <p className={`font-medium ${
                        new Date(os.garantiaFim) > new Date() 
                          ? 'text-green-700' 
                          : 'text-red-700'
                      }`}>
                        {new Date(os.garantiaFim) > new Date() ? '✓ Garantia válida até' : '✗ Garantia vencida em'}
                      </p>
                      <p className="text-lg font-bold">
                        {formatDate(os.garantiaFim)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Total */}
              {valorTotal > 0 && (
                <div className="p-3 bg-slate-100 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total:</span>
                    <span className="text-xl font-bold text-emerald-600">
                      {formatCurrency(valorTotal)}
                    </span>
                  </div>
                </div>
              )}
              
              {os.aprovado !== null && (
                <div className={`p-3 rounded-lg ${os.aprovado ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className={os.aprovado ? 'text-green-700' : 'text-red-700'}>
                    {os.aprovado ? 'Orçamento aprovado pelo cliente' : 'Orçamento recusado pelo cliente'}
                    {os.dataAprovacao && ` em ${formatDateTime(os.dataAprovacao)}`}
                  </p>
                </div>
              )}

              {/* Pagamento Online - Gerar para o cliente */}
              {!os.pago && valorTotal > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-blue-700 font-medium">
                    <CreditCard className="w-5 h-5" />
                    Pagamento Online
                  </div>
                  
                  {/* Se já tem pagamento gerado */}
                  {(os.mpPaymentId || os.mpPreferenceId || pagamentoGerado) ? (
                    <div className="space-y-2">
                      <p className="text-green-700 text-sm font-medium">
                        ✓ Pagamento gerado! O cliente pode pagar pela página pública.
                      </p>
                      {(pagamentoGerado?.linkPagamento || os.linkPagamento) && (
                        <a 
                          href={pagamentoGerado?.linkPagamento || os.linkPagamento || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Abrir link de pagamento
                        </a>
                      )}
                      {/* Botão de Reset - TEMPORÁRIO PARA TESTES */}
                      <button
                        onClick={async () => {
                          if (!confirm('Resetar pagamento? Isso vai limpar os dados para gerar um novo.')) return
                          try {
                            const res = await fetch(`/api/os/${os.id}/resetar-pagamento`, { method: 'POST' })
                            const data = await res.json()
                            if (data.success) {
                              toast.success('Pagamento resetado!')
                              window.location.reload()
                            } else {
                              toast.error(data.error || 'Erro ao resetar')
                            }
                          } catch {
                            toast.error('Erro ao resetar pagamento')
                          }
                        }}
                        className="text-xs text-red-500 hover:text-red-700 underline mt-2"
                      >
                        🧪 Resetar pagamento (teste)
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-blue-600 text-sm mb-3">
                        Gere um PIX para o cliente pagar. O código aparecerá na página pública da OS.
                      </p>
                      
                      <Button 
                        onClick={handleGerarPagamento}
                        disabled={gerandoPagamento}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {gerandoPagamento ? (
                          <span className="animate-pulse">Gerando...</span>
                        ) : (
                          <>
                            <QrCode className="w-4 h-4 mr-2" />
                            Gerar PIX
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Assinatura do Cliente */}
              {os.assinatura && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 font-medium mb-2">OS assinada pelo cliente</p>
                  <img 
                    src={os.assinatura.imagem} 
                    alt="Assinatura" 
                    className="max-h-16 bg-white rounded border"
                  />
                  {os.assinatura.nome && (
                    <p className="text-xs text-green-600 mt-1">
                      Assinado por: {os.assinatura.nome} em {formatDateTime(os.assinatura.criadoEm)}
                    </p>
                  )}
                </div>
              )}
              
              <Button 
                onClick={handleUpdateOrcamento}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>

          {/* Histórico */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {os.historico.map((item, index) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {index < os.historico.length - 1 && (
                        <div className="w-0.5 h-full bg-slate-200 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm text-slate-500">{formatDateTime(item.criadoEm)}</p>
                      <p className="text-slate-900">{item.descricao}</p>
                      {item.status && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {STATUS_LABELS[item.status as StatusOS]}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          {/* Cliente */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-slate-600 font-medium mb-1">Nome</p>
                <p className="text-lg font-bold text-slate-800">{os.cliente.nome}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 font-medium mb-1">Telefone</p>
                <p className="text-base font-semibold text-slate-800">{os.cliente.telefone}</p>
              </div>
              {os.cliente.email && (
                <div>
                  <p className="text-sm text-slate-600 font-medium mb-1">E-mail</p>
                  <p className="text-base text-slate-800">{os.cliente.email}</p>
                </div>
              )}
              {/* CPF/CNPJ - Campo editável para pagamento */}
              <div className="pt-2 border-t border-slate-100">
                <Label htmlFor="clienteCpf" className="text-sm text-slate-600 font-medium">
                  CPF/CNPJ (para pagamentos)
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="clienteCpf"
                    placeholder="000.000.000-00"
                    value={clienteCpf}
                    onChange={(e) => setClienteCpf(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    size="sm"
                    onClick={handleAtualizarCpf}
                    disabled={atualizandoCpf}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {atualizandoCpf ? '...' : 'Salvar'}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Necessário para gerar boletos com código de barras
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Equipamento */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                Equipamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 font-medium mb-1">Equipamento</p>
                <p className="text-lg font-bold text-slate-800">{os.equipamento}</p>
              </div>
              {os.marca && (
                <div>
                  <p className="text-sm text-slate-600 font-medium mb-1">Marca</p>
                  <p className="text-base font-semibold text-slate-800">{os.marca}</p>
                </div>
              )}
              {os.modelo && (
                <div>
                  <p className="text-sm text-slate-600 font-medium mb-1">Modelo</p>
                  <p className="text-base font-semibold text-slate-800">{os.modelo}</p>
                </div>
              )}
              {os.imeiSerial && (
                <div>
                  <p className="text-sm text-slate-600 font-medium mb-1">IMEI/Serial</p>
                  <p className="font-mono text-base font-semibold text-slate-800">{os.imeiSerial}</p>
                </div>
              )}
              {os.senhaAparelho && (
                <div>
                  <p className="text-sm text-slate-600 font-medium mb-1">Senha</p>
                  <p className="text-base font-semibold text-slate-800">{os.senhaAparelho}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Problema */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Problema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg text-slate-800 leading-relaxed">{os.problema}</p>
              {os.acessorios && (
                <>
                  <Separator className="my-4" />
                  <div className="text-base">
                    <span className="text-slate-600 font-medium">Acessórios: </span>
                    <span className="text-slate-800">{os.acessorios}</span>
                  </div>
                </>
              )}
              {os.estadoAparelho && (
                <div className="text-base">
                  <span className="text-slate-600 font-medium">Estado: </span>
                  <span className="text-slate-800">{os.estadoAparelho}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fotos/Anexos */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-600" />
                Fotos/Anexos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Lista de fotos */}
              {fotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {fotos.map((foto) => (
                    <div key={foto.id} className="relative group cursor-pointer">
                      <img
                        src={foto.arquivo}
                        alt="Foto da OS"
                        className="w-full aspect-square object-cover rounded-lg border hover:opacity-80 transition-opacity"
                        onClick={() => setFotoSelecionada(foto.arquivo)}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoverFoto(foto.id)
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 
                                   opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload de nova foto */}
              <UploadImagem
                valorAtual={null}
                onUpload={handleUploadFoto}
                tipo="os"
                lojaId={os.lojaId}
                label={fotos.length === 0 ? 'Adicionar foto' : ''}
                tamanhoPreview={80}
              />

              {fotos.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-2">
                  Nenhuma foto adicionada
                </p>
              )}
            </CardContent>
          </Card>

          {/* QR Code */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-32 h-32"
                />
              ) : (
                <div className="w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-slate-300 animate-pulse" />
                </div>
              )}
              <p className="text-sm text-slate-500 mt-2">Escaneie para acessar a OS</p>
            </CardContent>
          </Card>
        </div>
      </div>

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

      {/* Dialog de Exclusão */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Excluir Ordem de Serviço
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              Tem certeza que deseja excluir a OS <strong>#{os.numeroOs}</strong>?
            </p>
            <p className="text-sm text-red-500 mt-2">
              Esta ação não pode ser desfeita. Todos os dados, fotos e histórico serão perdidos.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleExcluirOS}
              disabled={deleting}
            >
              {deleting ? 'Excluindo...' : 'Excluir OS'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de WhatsApp - Aparece após mudança de status */}
      <Dialog open={showWhatsAppPopup} onOpenChange={setShowWhatsAppPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <MessageCircle className="w-5 h-5" />
              Avisar Cliente via WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <p className="text-sm text-emerald-700 font-medium">
                Status atualizado para:
              </p>
              <p className="text-lg font-bold text-emerald-800 mt-1">
                {whatsappData?.status && STATUS_LABELS[whatsappData.status as StatusOS]}
              </p>
            </div>
            
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-2">Mensagem que será enviada:</p>
              <p className="text-sm text-slate-700 whitespace-pre-line max-h-40 overflow-y-auto">
                {whatsappData?.mensagem}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <User className="w-4 h-4" />
              <span>{os.cliente.nome}</span>
              <span className="text-slate-400">•</span>
              <span>{os.cliente.telefone}</span>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowWhatsAppPopup(false)}
              className="w-full sm:w-auto"
            >
              Agora não
            </Button>
            <Button 
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (whatsappData?.link) {
                  window.open(whatsappData.link, '_blank')
                }
                setShowWhatsAppPopup(false)
              }}
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
