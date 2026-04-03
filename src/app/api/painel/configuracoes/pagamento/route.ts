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
        efiAmbiente: true,
        pixChave: true,
        pixTipo: true,
        pixNome: true
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
      efiClientId: loja.efiClientId ? '••••••••' + loja.efiClientId.slice(-4) : null,
      efiClientSecret: loja.efiClientSecret ? '••••••••••••' : null,
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
      efiAmbiente,
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
          error: 'Preencha o Client ID e Client Secret para testar'
        })
      }

      const ambiente = efiAmbiente || 'homologacao'
      console.log('[API Pagamento] Testando conexão Efí Bank:', { 
        ambiente,
        clientIdLength: efiClientId?.length,
        clientSecretLength: efiClientSecret?.length
      })

      const resultado = await testarConexaoEfi(efiClientId, efiClientSecret, ambiente as 'producao' | 'homologacao')

      if (resultado.success) {
        return NextResponse.json({
          success: true,
          message: 'Conexão realizada com sucesso!'
        })
      }

      return NextResponse.json({
        success: false,
        error: resultado.error || 'Erro ao testar conexão'
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
    // Buscar configuração atual para preservar credenciais se não forem enviadas
    const lojaAtual = await db.loja.findUnique({
      where: { id: user.lojaId },
      select: { efiClientId: true, efiClientSecret: true }
    })

    // Se credenciais não foram enviadas mas já existem no banco, manter as atuais
    const clientIdParaSalvar = efiClientId || lojaAtual?.efiClientId
    const clientSecretParaSalvar = efiClientSecret || lojaAtual?.efiClientSecret

    if (!clientIdParaSalvar || !clientSecretParaSalvar || !pixChave) {
      return NextResponse.json({
        success: false,
        error: 'Preencha Client ID, Client Secret e Chave PIX'
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

    // Validar ambiente
    const ambientesValidos = ['producao', 'homologacao']
    if (efiAmbiente && !ambientesValidos.includes(efiAmbiente)) {
      return NextResponse.json({
        success: false,
        error: 'Ambiente inválido. Use "producao" ou "homologacao"'
      })
    }

    // Limpar a chave PIX (remover formatação se for CPF/CNPJ/telefone)
    let pixChaveLimpa = pixChave
    if (pixTipo === 'cpf' || pixTipo === 'cnpj' || pixTipo === 'telefone') {
      pixChaveLimpa = pixChave.replace(/\D/g, '')
    } else if (pixTipo === 'email') {
      pixChaveLimpa = pixChave.trim().toLowerCase()
    }

    // Atualizar loja
    await db.loja.update({
      where: { id: user.lojaId },
      data: {
        usarPagamentoSistema: true,
        efiClientId: clientIdParaSalvar,
        efiClientSecret: clientSecretParaSalvar,
        efiAmbiente: efiAmbiente || 'homologacao',
        pixChave: pixChaveLimpa,
        pixTipo: pixTipo?.toLowerCase() || 'cpf',
        pixNome: pixNome || ''
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
        efiAmbiente: null,
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
