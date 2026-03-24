/**
 * OAuth Mercado Pago - Callback
 * Recebe o código de autorização e troca pelos tokens
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Credenciais da aplicação MP
const MP_CLIENT_ID = '1510502773786551'
const MP_CLIENT_SECRET = 'UuiGNITz2rVZTmZAmq8wcw2CFuJtdlOL'

// URL de redirecionamento
const getRedirectUri = (request: NextRequest) => {
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  return `${protocol}://${host}/api/mp/oauth/callback`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parâmetros retornados pelo MP
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    console.log('[MP OAuth] Callback recebido:', {
      code: code ? `${code.substring(0, 20)}...` : null,
      state: state ? state.substring(0, 50) : null,
      error,
      errorDescription
    })

    // Verificar se houve erro na autorização
    if (error) {
      console.error('[MP OAuth] Erro na autorização:', error, errorDescription)
      return NextResponse.redirect(
        new URL('/painel/configuracoes?mp_error=' + encodeURIComponent(errorDescription || error), request.url)
      )
    }

    // Verificar se tem código
    if (!code) {
      console.error('[MP OAuth] Código não recebido')
      return NextResponse.redirect(
        new URL('/painel/configuracoes?mp_error=' + encodeURIComponent('Código de autorização não recebido'), request.url)
      )
    }

    // Decodificar state para obter lojaId
    let lojaId: string
    try {
      const stateData = JSON.parse(Buffer.from(state || '', 'base64').toString())
      lojaId = stateData.lojaId
      console.log('[MP OAuth] State decodificado:', { lojaId })
    } catch (e) {
      console.error('[MP OAuth] State inválido:', state)
      return NextResponse.redirect(
        new URL('/painel/configuracoes?mp_error=' + encodeURIComponent('State inválido'), request.url)
      )
    }

    // Trocar código pelos tokens
    const redirectUri = getRedirectUri(request)

    console.log('[MP OAuth] Trocando código por tokens...')
    console.log('[MP OAuth] Redirect URI:', redirectUri)

    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: MP_CLIENT_ID,
        client_secret: MP_CLIENT_SECRET,
        code: code,
        redirect_uri: redirectUri
      })
    })

    const tokenData = await tokenResponse.json()

    console.log('[MP OAuth] Resposta do token:', {
      status: tokenResponse.status,
      access_token: tokenData.access_token ? `${tokenData.access_token.substring(0, 20)}...` : null,
      refresh_token: tokenData.refresh_token ? `${tokenData.refresh_token.substring(0, 20)}...` : null,
      public_key: tokenData.public_key ? `${tokenData.public_key.substring(0, 20)}...` : null,
      user_id: tokenData.user_id,
      expires_in: tokenData.expires_in,
      error: tokenData.error || tokenData.message
    })

    if (!tokenResponse.ok) {
      console.error('[MP OAuth] Erro ao obter tokens:', tokenData)
      return NextResponse.redirect(
        new URL('/painel/configuracoes?mp_error=' + encodeURIComponent(tokenData.message || tokenData.error || 'Erro ao obter tokens'), request.url)
      )
    }

    // Calcular data de expiração (tokens expiram em ~6 meses)
    const expiresIn = tokenData.expires_in || 15552000 // 180 dias em segundos
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    // Atualizar loja com os tokens
    await db.loja.update({
      where: { id: lojaId },
      data: {
        mpAccessToken: tokenData.access_token,
        mpRefreshToken: tokenData.refresh_token,
        mpPublicKey: tokenData.public_key,
        mpUserId: tokenData.user_id?.toString(),
        mpTokenExpiresAt: expiresAt,
        mpConectado: true
      }
    })

    console.log('[MP OAuth] Loja conectada com sucesso:', {
      lojaId,
      userId: tokenData.user_id,
      expiresAt
    })

    // Redirecionar para página de configurações com sucesso
    return NextResponse.redirect(
      new URL('/painel/configuracoes?mp_success=true', request.url)
    )

  } catch (error) {
    console.error('[MP OAuth] Erro no callback:', error)
    return NextResponse.redirect(
      new URL('/painel/configuracoes?mp_error=' + encodeURIComponent('Erro interno no servidor'), request.url)
    )
  }
}
