import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'

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
        nome: true,
        slug: true,
        responsavel: true,
        cpfCnpj: true,
        telefone: true,
        whatsapp: true,
        email: true,
        cidade: true,
        estado: true,
        endereco: true,
        numeroEndereco: true,
        bairro: true,
        cep: true,
        complemento: true,
        descricao: true,
        logo: true,
        horarioAtendimento: true,
        tiposServico: true,
        status: true,
        plano: true,
        precoPlano: true,
        trialAte: true
      }
    })

    if (!loja) {
      return NextResponse.json(
        { success: false, error: 'Loja não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      loja
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar configurações' },
      { status: 500 }
    )
  }
}

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
      nome,
      cpfCnpj,
      telefone,
      whatsapp,
      cidade,
      estado,
      endereco,
      numeroEndereco,
      bairro,
      cep,
      complemento,
      descricao,
      horarioAtendimento,
      tiposServico,
      logo,
      // Campos OAuth MP (para desconectar)
      mpConectado,
      mpAccessToken,
      mpRefreshToken,
      mpPublicKey,
      mpUserId
    } = body

    // Se está desconectando MP
    if (mpConectado === false) {
      await db.loja.update({
        where: { id: user.lojaId },
        data: {
          mpConectado: false,
          mpAccessToken: null,
          mpRefreshToken: null,
          mpPublicKey: null,
          mpUserId: null,
          mpTokenExpiresAt: null
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Mercado Pago desconectado com sucesso'
      })
    }

    const loja = await db.loja.update({
      where: { id: user.lojaId },
      data: {
        nome,
        cpfCnpj: cpfCnpj ? cpfCnpj.replace(/\D/g, '') : null, // Remove máscara
        telefone,
        whatsapp,
        cidade,
        estado,
        endereco,
        numeroEndereco: numeroEndereco || null,
        bairro: bairro || null,
        cep: cep ? cep.replace(/\D/g, '') : null, // Remove máscara
        complemento: complemento || null,
        descricao: descricao || null,
        horarioAtendimento: horarioAtendimento || null,
        tiposServico: tiposServico || null,
        logo: logo || null
      }
    })

    return NextResponse.json({
      success: true,
      loja,
      message: 'Configurações salvas com sucesso'
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar configurações' },
      { status: 500 }
    )
  }
}
