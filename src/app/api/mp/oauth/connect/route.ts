/**
 * OAuth Mercado Pago - Conectar conta
 * Redireciona o lojista para autorizar o acesso à conta MP
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Credenciais da aplicação MP (fornecidas pelo usuário)
const MP_CLIENT_ID = '1510502773786551'
const MP_CLIENT_SECRET = 'UuiGNITz2rVZTmZAmq8wcw2CFuJtdlOL'

// URL de redirecionamento (deve estar configurada no MP Developers)
const getRedirectUri = (request: NextRequest) => {
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  return `${protocol}://${host}/api/mp/oauth/callback`
}

export async function GET(request: NextRequest) {
  try {
    // Verificar se a loja está logada
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Loja não autenticada' },
        { status: 401 }
      )
    }

    // Buscar sessão
    const sessao = await db.sessao.findFirst({
      where: {
        tokenSessao: sessionToken,
        ativa: true,
        dataExpiracao: { gt: new Date() }
      },
      include: { loja: true }
    })

    if (!sessao || !sessao.loja) {
      return NextResponse.json(
        { error: 'Sessão inválida ou expirada' },
        { status: 401 }
      )
    }

    const loja = sessao.loja

    // Gerar state único para segurança (contém ID da loja)
    const state = Buffer.from(JSON.stringify({
      lojaId: loja.id,
      timestamp: Date.now()
    })).toString('base64')

    // URL de redirecionamento
    const redirectUri = getRedirectUri(request)

    // Construir URL de autorização do Mercado Pago
    const authUrl = new URL('https://auth.mercadopago.com.br/authorization')

    authUrl.searchParams.set('client_id', MP_CLIENT_ID)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('platform_id', 'mp') // Plataforma própria
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)

    console.log('[MP OAuth] Iniciando conexão para loja:', loja.id)
    console.log('[MP OAuth] Redirect URI:', redirectUri)
    console.log('[MP OAuth] Auth URL:', authUrl.toString())

    // Redirecionar para o Mercado Pago
    return NextResponse.redirect(authUrl.toString())

  } catch (error) {
    console.error('[MP OAuth] Erro ao iniciar conexão:', error)
    return NextResponse.json(
      { error: 'Erro ao iniciar conexão com Mercado Pago' },
      { status: 500 }
    )
  }
}
