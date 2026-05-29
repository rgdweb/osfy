import { NextRequest, NextResponse } from 'next/server'
import { loginLoja, loginSuperAdmin } from '@/lib/auth/auth'
import { ensureDatabaseInitialized, getInitError } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Garantir que o banco está inicializado
    try {
      await ensureDatabaseInitialized()
    } catch (dbError: unknown) {
      const dbErrorMsg = dbError instanceof Error ? dbError.message : String(dbError)
      console.error('[LOGIN] Erro no banco:', dbErrorMsg)
      
      // Retornar erro descritivo para o frontend
      let mensagemUsuario = 'Erro de conexão com o banco de dados.'
      
      if (dbErrorMsg.includes('can\'t reach') || dbErrorMsg.includes('P1001')) {
        mensagemUsuario = 'Banco de dados inacessível. Verifique se o servidor de banco está ativo.'
      } else if (dbErrorMsg.includes('does not exist') || dbErrorMsg.includes('P1003')) {
        mensagemUsuario = 'Tabelas do banco não encontradas. Execute: npx prisma db push'
      } else if (dbErrorMsg.includes('migration') || dbErrorMsg.includes('P3009')) {
        mensagemUsuario = 'Banco precisa de migração. Execute: npx prisma db push'
      } else if (dbErrorMsg.includes('DATABASE_URL')) {
        mensagemUsuario = 'Variável DATABASE_URL não configurada. Verifique as variáveis de ambiente.'
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: mensagemUsuario,
          debug: process.env.NODE_ENV !== 'production' ? dbErrorMsg : undefined
        },
        { status: 503 }
      )
    }
    
    const body = await request.json()
    const { email, senha, tipo } = body

    // Capturar User-Agent e IP
    const userAgent = request.headers.get('user-agent')
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() 
      || request.headers.get('x-real-ip') 
      || 'unknown'

    if (!email || !senha) {
      return NextResponse.json(
        { success: false, error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Normalizar email (remover espaços e converter para minúsculo)
    const emailNormalizado = email.toString().trim().toLowerCase()

    let result
    let tipoDetectado = tipo

    // Se tipo não especificado, tentar detectar automaticamente
    if (!tipo || tipo === 'auto') {
      // Tentar primeiro como superadmin
      result = await loginSuperAdmin(emailNormalizado, senha, userAgent, ipAddress)
      
      if (result.success) {
        tipoDetectado = 'superadmin'
      } else {
        // Se não for superadmin, tentar como loja
        result = await loginLoja(emailNormalizado, senha, userAgent, ipAddress)
        if (result.success) {
          tipoDetectado = 'loja'
        }
      }
    } else {
      // Tipo especificado
      if (tipo === 'superadmin') {
        result = await loginSuperAdmin(emailNormalizado, senha, userAgent, ipAddress)
      } else {
        result = await loginLoja(emailNormalizado, senha, userAgent, ipAddress)
      }
    }

    if (!result || !result.success) {
      return NextResponse.json(
        { success: false, error: result?.error || 'Email ou senha incorretos' },
        { status: 401 }
      )
    }

    // Create response with cookie
    const response = NextResponse.json({ 
      success: true, 
      tipo: tipoDetectado,
      bloqueada: result.bloqueada || false,
      sessoesAtivas: result.sessoesAtivas || 1
    })
    
    // Detectar se está em produção (HTTPS)
    const isProduction = process.env.NODE_ENV === 'production'
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const isSecure = isProduction || protocol === 'https'
    
    // Configurar cookie com opções compatíveis com ambos ambientes
    response.cookies.set('tecos-token', result.token!, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/',
    })

    return response
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[LOGIN] Erro inesperado:', errorMsg)
    
    // Em desenvolvimento, mostrar o erro real
    // Em produção, mostrar mensagem genérica mas com código de referência
    const isDev = process.env.NODE_ENV !== 'production'
    
    return NextResponse.json(
      { 
        success: false, 
        error: isDev ? `Erro: ${errorMsg}` : 'Erro interno do servidor. Tente novamente em alguns instantes.',
        debug: isDev ? errorMsg : undefined
      },
      { status: 500 }
    )
  }
}
