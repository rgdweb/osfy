import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { criarCobrancaPix, consultarCobrancaPix, getLojaEfiConfig } from '@/lib/efibank'
import { gerarPixEstatico } from '@/lib/pix-estatico'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST - Gerar pagamento para a OS
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { formaPagamento } = body

    // Buscar OS com dados do cliente e loja
    const os = await db.ordemServico.findFirst({
      where: { id },
      include: {
        cliente: true,
        loja: true
      }
    })

    if (!os) {
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 })
    }

    // Calcular valor total
    const valorTotal = (os.orcamento || 0) + (os.valorServico || 0) + (os.valorPecas || 0)
    
    if (valorTotal <= 0) {
      return NextResponse.json({ error: 'Valor da OS é zero' }, { status: 400 })
    }

    // ===== SISTEMA DE PAGAMENTO DAS OS =====
    // MERCADO PAGO é usado APENAS para mensalidades/faturas das lojas (Super Admin)
    // 
    // Para OS dos clientes, usamos:
    // 1. Efí Bank (se a loja tiver configurado) - PIX dinâmico com valor fixo
    // 2. PIX Estático da loja (se tiver chave PIX cadastrada) - cliente digita o valor
    
    const efiConfig = await getLojaEfiConfig(os.lojaId)
    const lojaTemPixChave = os.loja.pixChave
    
    console.log('[Pagamento OS] Verificando gateway:', {
      lojaId: os.lojaId,
      temEfiConfig: !!efiConfig,
      formaPagamento,
      lojaTemPixChave: !!lojaTemPixChave
    })

    // Se já tem pagamento gerado via Efí Bank, retornar existente
    if (os.efiPaymentId && os.pagamentoGateway === 'efi') {
      const statusResult = await consultarCobrancaPix(os.lojaId, os.efiTxId || '')
      if (statusResult.success && statusResult.status === 'CONCLUIDA') {
        await db.ordemServico.update({
          where: { id },
          data: {
            pago: true,
            dataPagamento: new Date(),
            atualizadoEm: new Date()
          }
        })
      }
      return NextResponse.json({
        success: true,
        pagamento: {
          txid: os.efiTxId,
          pixQrCode: os.efiPixQrCode,
          pixCopiaCola: os.efiPixCopiaCola,
          gateway: 'efi',
          valorTotal
        },
        message: 'Pagamento já gerado anteriormente'
      })
    }

    const referenciaExterna = `OS-${os.numeroOs}-${os.id.substring(0, 8)}`
    const descricao = `OS #${os.numeroOs} - ${os.equipamento} - ${os.loja.nome}`

    // ===== OPÇÃO 1: EFÍ BANK (PIX Dinâmico) =====
    // PIX com valor fixo, o cliente escaneia e paga exatamente o valor da OS
    if (efiConfig && formaPagamento === 'pix') {
      console.log('[Pagamento OS] Usando Efí Bank para PIX dinâmico')
      
      const efiResult = await criarCobrancaPix(
        os.lojaId,
        valorTotal,
        descricao,
        referenciaExterna
      )
      
      if (!efiResult.success) {
        console.error('[Pagamento OS] Erro no Efí Bank:', efiResult.error)
        
        // Se falhou Efí Bank, tentar PIX estático como fallback
        if (lojaTemPixChave) {
          console.log('[Pagamento OS] Fallback para PIX estático')
          return await gerarPixEstaticoResposta(os, valorTotal, referenciaExterna)
        }
        
        return NextResponse.json({ 
          error: 'Erro ao gerar PIX via Efí Bank',
          details: efiResult.error 
        }, { status: 400 })
      }
      
      // Salvar dados do Efí Bank na OS
      await db.ordemServico.update({
        where: { id },
        data: {
          efiPaymentId: efiResult.txid,
          efiTxId: efiResult.txid,
          efiPixQrCode: efiResult.pixQrCode,
          efiPixCopiaCola: efiResult.pixCopiaCola,
          pagamentoGateway: 'efi',
          atualizadoEm: new Date()
        }
      })

      // Adicionar histórico
      await db.historicoOS.create({
        data: {
          osId: id,
          descricao: `PIX gerado: ${formatCurrency(valorTotal)} via Efí Bank (conta do lojista)`,
          status: os.status
        }
      })
      
      console.log('[Pagamento OS] PIX Efí criado:', { 
        txid: efiResult.txid, 
        temQrCode: !!efiResult.pixQrCode, 
        temCopiaCola: !!efiResult.pixCopiaCola 
      })
      
      return NextResponse.json({
        success: true,
        pagamento: {
          txid: efiResult.txid,
          pixQrCode: efiResult.pixQrCode,
          pixCopiaCola: efiResult.pixCopiaCola,
          gateway: 'efi',
          valorTotal
        }
      })
    }
    
    // ===== OPÇÃO 2: PIX ESTÁTICO DA LOJA =====
    // PIX sem valor fixo, o cliente digita o valor manualmente
    // Usado quando a loja tem chave PIX mas não configurou Efí Bank
    if (lojaTemPixChave && formaPagamento === 'pix') {
      console.log('[Pagamento OS] Usando PIX estático da loja')
      return await gerarPixEstaticoResposta(os, valorTotal, referenciaExterna)
    }
    
    // ===== NENHUMA OPÇÃO DISPONÍVEL =====
    // A loja não configurou sistema de pagamento
    return NextResponse.json({ 
      error: 'Sistema de pagamento não configurado',
      message: 'Esta loja não configurou pagamento online. Entre em contato diretamente.',
      hint: 'O lojista pode ativar em: Configurações > Sistema de Pagamento'
    }, { status: 400 })

  } catch (error) {
    console.error('[API OS Pagamento] Erro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// Função auxiliar para gerar resposta com PIX estático
async function gerarPixEstaticoResposta(
  os: { 
    id: string; 
    numeroOs: number; 
    lojaId: string; 
    status: string;
    loja: { 
      pixChave: string | null;
      pixNome: string | null;
      nome: string; 
      cidade: string 
    } 
  },
  valorTotal: number,
  referenciaExterna: string
) {
  const chavePix = os.loja.pixChave
  const nomeRecebedor = os.loja.pixNome || os.loja.nome
  
  if (!chavePix) {
    return NextResponse.json({ 
      error: 'Chave PIX não configurada',
      message: 'A loja não cadastrou uma chave PIX para recebimento.'
    }, { status: 400 })
  }
  
  const pixResult = await gerarPixEstatico({
    chavePix,
    valor: valorTotal,
    nomeRecebedor,
    cidade: os.loja.cidade || 'BRASIL',
    txid: referenciaExterna
  })
  
  // Salvar PIX estático na OS
  await db.ordemServico.update({
    where: { id: os.id },
    data: {
      efiPixQrCode: pixResult.qrCodeBase64,
      efiPixCopiaCola: pixResult.payload,
      pagamentoGateway: 'pix_estatico',
      atualizadoEm: new Date()
    }
  })

  // Adicionar histórico
  await db.historicoOS.create({
    data: {
      osId: os.id,
      descricao: `PIX gerado: ${formatCurrency(valorTotal)} via PIX Estático (chave: ${chavePix.substring(0, 8)}...)`,
      status: os.status
    }
  })
  
  return NextResponse.json({
    success: true,
    pagamento: {
      pixQrCode: pixResult.qrCodeBase64,
      pixCopiaCola: pixResult.payload,
      gateway: 'pix_estatico',
      valorTotal,
      chavePix,
      aviso: 'PIX estático - o cliente deve digitar o valor manualmente'
    }
  })
}

// GET - Buscar status do pagamento
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const os = await db.ordemServico.findFirst({
      where: { id },
      select: {
        id: true,
        lojaId: true,
        pago: true,
        dataPagamento: true,
        efiPaymentId: true,
        efiTxId: true,
        efiPixQrCode: true,
        efiPixCopiaCola: true,
        pagamentoGateway: true,
        orcamento: true,
        valorServico: true,
        valorPecas: true
      }
    })

    if (!os) {
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 })
    }

    const valorTotal = (os.orcamento || 0) + (os.valorServico || 0) + (os.valorPecas || 0)
    let statusAtual = os.pago ? 'approved' : 'pendente'
    
    // Verificar status via Efí Bank se for PIX dinâmico
    if (!os.pago && os.pagamentoGateway === 'efi' && os.efiTxId) {
      const statusResult = await consultarCobrancaPix(os.lojaId, os.efiTxId)
      if (statusResult.success) {
        statusAtual = statusResult.status === 'CONCLUIDA' ? 'approved' : 
                      statusResult.status === 'ATIVA' ? 'pendente' : 'pendente'
        
        if (statusAtual === 'approved') {
          await db.ordemServico.update({
            where: { id: os.id },
            data: {
              pago: true,
              dataPagamento: new Date(),
              atualizadoEm: new Date()
            }
          })
        }
      }
    }
    // PIX estático não tem como verificar automaticamente
    // O status precisa ser atualizado manualmente pelo lojista

    return NextResponse.json({
      success: true,
      pagamento: {
        pago: os.pago || statusAtual === 'approved',
        status: statusAtual,
        dataPagamento: os.dataPagamento,
        temCobranca: !!(os.efiPaymentId || os.efiPixQrCode),
        txid: os.efiTxId,
        pixQrCode: os.efiPixQrCode,
        pixCopiaCola: os.efiPixCopiaCola,
        valorTotal,
        gateway: os.pagamentoGateway || 'nenhum'
      }
    })

  } catch (error) {
    console.error('[API OS Pagamento GET] Erro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// Helper
function formatCurrency(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor)
}
