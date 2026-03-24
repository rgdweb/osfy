import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// API para exportar dados para backup
// Esta API é chamada pelo script de backup no servidor externo

export async function GET(request: NextRequest) {
  try {
    // Validar chave de API
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    
    const API_KEY = process.env.BACKUP_API_KEY || 'a8f7d9e2b4c1m6n3p5q0r9s2t8u1v4w7'
    
    if (key !== API_KEY) {
      return NextResponse.json({ sucesso: false, erro: 'Não autorizado' }, { status: 401 })
    }

    // Buscar todas as lojas ativas
    const lojas = await db.loja.findMany({
      where: {
        status: { in: ['ativa', 'teste'] }
      },
      select: { id: true, nome: true }
    })

    // Exportar dados de cada loja
    const dadosExportados: Record<string, any> = {}

    for (const loja of lojas) {
      // Buscar todos os dados da loja
      const [clientes, ordens, usuarios, produtos, vendas] = await Promise.all([
        // Clientes
        db.cliente.findMany({
          where: { lojaId: loja.id },
          orderBy: { criadoEm: 'desc' }
        }),
        // Ordens de Serviço
        db.ordemServico.findMany({
          where: { lojaId: loja.id },
          include: {
            historico: true,
            fotos: true,
            assinatura: true,
            cliente: { select: { nome: true, telefone: true } },
            tecnico: { select: { nome: true } }
          },
          orderBy: { dataCriacao: 'desc' }
        }),
        // Usuários
        db.usuario.findMany({
          where: { lojaId: loja.id },
          select: {
            id: true,
            nome: true,
            email: true,
            tipo: true,
            ativo: true,
            criadoEm: true
          }
        }),
        // Produtos
        db.produto.findMany({
          where: { lojaId: loja.id },
          orderBy: { criadoEm: 'desc' }
        }),
        // Vendas
        db.venda.findMany({
          where: { lojaId: loja.id },
          include: { itens: true },
          orderBy: { dataVenda: 'desc' }
        })
      ])

      dadosExportados[loja.id] = {
        loja: {
          id: loja.id,
          nome: loja.nome
        },
        exportadoEm: new Date().toISOString(),
        estatisticas: {
          totalClientes: clientes.length,
          totalOS: ordens.length,
          totalUsuarios: usuarios.length,
          totalProdutos: produtos.length,
          totalVendas: vendas.length
        },
        dados: {
          clientes,
          ordens,
          usuarios,
          produtos,
          vendas
        }
      }
    }

    return NextResponse.json({
      sucesso: true,
      exportadoEm: new Date().toISOString(),
      totalLojas: lojas.length,
      lojas: dadosExportados
    })

  } catch (error) {
    console.error('[Backup Export] Erro:', error)
    return NextResponse.json({
      sucesso: false,
      erro: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
