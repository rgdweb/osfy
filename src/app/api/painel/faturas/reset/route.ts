import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'

// ⚠️ TEMPORÁRIO - RESET DE FATURA PARA TESTES
// Remover após os testes de sandbox
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const { faturaId } = await request.json()

    if (!user || !user.lojaId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    if (!faturaId) {
      return NextResponse.json(
        { success: false, error: 'ID da fatura é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se a fatura pertence à loja
    const fatura = await db.fatura.findFirst({
      where: {
        id: faturaId,
        lojaId: user.lojaId
      }
    })

    if (!fatura) {
      return NextResponse.json(
        { success: false, error: 'Fatura não encontrada' },
        { status: 404 }
      )
    }

    // Resetar dados de pagamento (manter status pendente)
    const faturaResetada = await db.fatura.update({
      where: { id: faturaId },
      data: {
        // Limpar dados de pagamento
        mpPaymentId: null,
        mpPreferenceId: null,
        codigoPix: null,
        qrCodePix: null,
        linkBoleto: null,
        codigoBoleto: null,
        linkPagamento: null,
        // Resetar status para pendente se estava paga
        status: 'pendente',
        formaPagamento: null,
        dataPagamento: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Fatura resetada com sucesso',
      fatura: faturaResetada
    })
  } catch (error) {
    console.error('[RESET FATURA] Erro:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao resetar fatura' },
      { status: 500 }
    )
  }
}
