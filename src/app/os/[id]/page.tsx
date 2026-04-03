import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { OSPageClient } from './client'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const os = await db.ordemServico.findUnique({
    where: { id },
    include: {
      loja: true,
      cliente: true
    }
  })

  if (!os) {
    return {
      title: 'OS não encontrada - TecOS'
    }
  }

  return {
    title: `OS #${os.numeroOs} - ${os.equipamento} | TecOS`
  }
}

export default async function OSPage({ params }: Props) {
  const { id } = await params
  
  const os = await db.ordemServico.findUnique({
    where: { id },
    select: {
      id: true,
      lojaId: true,
      clienteId: true,
      tecnicoId: true,
      numeroOs: true,
      codigoOs: true,
      equipamento: true,
      marca: true,
      modelo: true,
      imeiSerial: true,
      senhaAparelho: true,
      problema: true,
      acessorios: true,
      estadoAparelho: true,
      diagnostico: true,
      solucao: true,
      status: true,
      orcamento: true,
      aprovado: true,
      dataAprovacao: true,
      valorServico: true,
      valorPecas: true,
      valorTotal: true,
      pago: true,
      formaPagamento: true,
      dataPagamento: true,
      dataCriacao: true,
      dataPrevisao: true,
      dataFinalizacao: true,
      atualizadoEm: true,
      // Campos de pagamento Mercado Pago
      mpPaymentId: true,
      mpPreferenceId: true,
      linkPagamento: true,
      pixQrCode: true,
      pixCopiaCola: true,
      boletoUrl: true,
      boletoLinhaDigitavel: true,
      // Campos de pagamento Efí Bank
      efiPaymentId: true,
      efiPixQrCode: true,
      efiPixCopiaCola: true,
      efiTxId: true,
      pagamentoGateway: true,
      // Relacionamentos
      loja: {
        select: {
          id: true,
          nome: true,
          slug: true,
          telefone: true,
          whatsapp: true,
          endereco: true,
          cidade: true,
          estado: true,
          logo: true,
          // Campos Efí Bank - para saber se loja aceita pagamento
          usarPagamentoSistema: true,
          efiClientId: true,
          efiAmbiente: true,
          pixChave: true,
          pixTipo: true,
          pixNome: true
        }
      },
      cliente: true,
      historico: {
        orderBy: { criadoEm: 'desc' }
      },
      fotos: {
        orderBy: { criadoEm: 'desc' }
      },
      assinatura: true
    }
  })

  if (!os) {
    notFound()
  }

  return <OSPageClient os={os} />
}
