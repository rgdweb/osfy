/**
 * API de Configuração de Pagamento da Loja
 * Gerencia as configurações do Efí Bank para cada lojista
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { testarConexaoEfi } from '@/lib/efibank'

// GET - Buscar configurações de pagamento da loja
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || !user.lojaId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const loja = await db.loja.findUnique({
      where: { id: user.lojaId },
      select: {
        id: true,
        usarPagamentoSistema: true,
        efiClientId: true,
        efiClientSecret: true,
        pixChave: true,
        pixTipo: true,
        pixNome: true,
        efiAccessToken: true,
        efiTokenExpiresAt: true
      }
    })

    if (!loja) {
      return NextResponse.json(
        { success: false, error: 'Loja não encontrada' },
        { status: 404 }
      )
    }

    // Não retornar o client secret completo por segurança
    const configSegura = {
      ...loja,
      efiClientSecret: loja.efiClientSecret ? '••••••••' + loja.efiClientSecret.slice(-4) : null,
      efiAccessToken: null, // Nunca retornar o access token
      temConfiguracao: !!(loja.efiClientId && loja.efiClientSecret && loja.pixChave)
    }

    return NextResponse.json({
      success: true,
      config: configSegura
    })
  } catch (error) {
    console.error('[API Pagamento] Erro ao buscar configurações:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar configurações' },
      { status: 500 }
    )
  }
}

// PATCH - Atualizar configurações de pagamento
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || !user.lojaId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      usarPagamentoSistema,
      efiClientId,
      efiClientSecret,
      pixChave,
      pixTipo,
      pixNome,
      acao
    } = body

    // Ação: testar conexão
    if (acao === 'testar') {
      if (!efiClientId || !efiClientSecret) {
        return NextResponse.json({
          success: false,
          error: 'Preencha Client ID e Client Secret para testar'
        })
      }

      const teste = await testarConexaoEfi(efiClientId, efiClientSecret)
      
      return NextResponse.json({
        success: teste.success,
        message: teste.success ? 'Conexão realizada com sucesso!' : (teste.error || 'Erro ao testar conexão')
      })
    }

    // Ação: ativar/desativar sistema de pagamento
    if (acao === 'toggle') {
      await db.loja.update({
        where: { id: user.lojaId },
        data: {
          usarPagamentoSistema: usarPagamentoSistema || false
        }
      })

      return NextResponse.json({
        success: true,
        message: usarPagamentoSistema 
          ? 'Sistema de pagamento ativado! Configure suas credenciais.' 
          : 'Sistema de pagamento desativado.'
      })
    }

    // Ação: salvar configurações
    if (!efiClientId || !efiClientSecret || !pixChave) {
      return NextResponse.json({
        success: false,
        error: 'Preencha todos os campos obrigatórios'
      })
    }

    // Validar tipo de chave PIX
    const tiposValidos = ['cpf', 'cnpj', 'email', 'telefone', 'aleatoria']
    if (pixTipo && !tiposValidos.includes(pixTipo.toLowerCase())) {
      return NextResponse.json({
        success: false,
        error: 'Tipo de chave PIX inválido'
      })
    }

    // Limpar a chave PIX (remover formatação)
    const pixChaveLimpa = pixChave.replace(/\D/g, '') || pixChave.trim().toLowerCase()

    // Atualizar loja
    await db.loja.update({
      where: { id: user.lojaId },
      data: {
        usarPagamentoSistema: true,
        efiClientId,
        efiClientSecret,
        pixChave: pixChaveLimpa,
        pixTipo: pixTipo?.toLowerCase() || 'cpf',
        pixNome: pixNome || '',
        // Limpar token anterior para forçar nova autenticação
        efiAccessToken: null,
        efiTokenExpiresAt: null
      }
    })

    console.log('[API Pagamento] Configurações salvas para loja:', user.lojaId)

    return NextResponse.json({
      success: true,
      message: 'Configurações salvas com sucesso!'
    })
  } catch (error) {
    console.error('[API Pagamento] Erro ao salvar configurações:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar configurações' },
      { status: 500 }
    )
  }
}

// DELETE - Remover configurações de pagamento
export async function DELETE() {
  try {
    const user = await getCurrentUser()

    if (!user || !user.lojaId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    await db.loja.update({
      where: { id: user.lojaId },
      data: {
        usarPagamentoSistema: false,
        efiClientId: null,
        efiClientSecret: null,
        efiAccessToken: null,
        efiTokenExpiresAt: null,
        pixChave: null,
        pixTipo: null,
        pixNome: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Configurações de pagamento removidas'
    })
  } catch (error) {
    console.error('[API Pagamento] Erro ao remover configurações:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao remover configurações' },
      { status: 500 }
    )
  }
}
