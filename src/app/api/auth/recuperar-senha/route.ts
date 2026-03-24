import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth/auth'

// Função para gerar senha aleatória
function gerarSenhaAleatoria(tamanho: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let senha = ''
  for (let i = 0; i < tamanho; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return senha
}

// Função para limpar caracteres não numéricos
function apenasNumeros(valor: string): string {
  return valor.replace(/\D/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const { email, tipo, resposta, token } = await request.json()
    
    // Validações básicas
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email é obrigatório' },
        { status: 400 }
      )
    }
    
    if (!tipo || !resposta || !token) {
      return NextResponse.json(
        { success: false, error: 'Verificação de segurança é obrigatória' },
        { status: 400 }
      )
    }
    
    // Validar token
    try {
      const decoded = Buffer.from(token, 'base64').toString()
      const [lojaIdToken, , tipoOriginal] = decoded.split(':')
      
      if (tipo !== tipoOriginal) {
        return NextResponse.json(
          { success: false, error: 'Token de verificação inválido' },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json(
        { success: false, error: 'Token de verificação inválido' },
        { status: 400 }
      )
    }
    
    // Buscar loja pelo email
    const loja = await db.loja.findUnique({
      where: { email: email.toLowerCase().trim() }
    })
    
    if (!loja) {
      return NextResponse.json(
        { success: false, error: 'Email não encontrado no sistema' },
        { status: 404 }
      )
    }
    
    // Verificar se a loja está ativa
    if (loja.status !== 'ativa') {
      return NextResponse.json(
        { success: false, error: 'Loja não está ativa. Entre em contato com o suporte.' },
        { status: 403 }
      )
    }
    
    // Verificar se está em trial ou com pagamento em dia
    const agora = new Date()
    const trialExpirado = loja.trialAte && new Date(loja.trialAte) < agora
    const planoExpirado = loja.expiraEm && new Date(loja.expiraEm) < agora
    
    if (trialExpirado && planoExpirado) {
      return NextResponse.json(
        { success: false, error: 'Seu período de trial expirou. Entre em contato para renovar.' },
        { status: 403 }
      )
    }
    
    // Validar resposta de segurança
    let respostaCorreta = false
    const respostaLimpa = apenasNumeros(resposta)
    
    switch (tipo) {
      case 'telefone_final':
        const telefoneLimpo = apenasNumeros(loja.telefone)
        respostaCorreta = telefoneLimpo.endsWith(respostaLimpa.slice(-4))
        break
        
      case 'whatsapp_final':
        const whatsappLimpo = apenasNumeros(loja.whatsapp)
        respostaCorreta = whatsappLimpo.endsWith(respostaLimpa.slice(-4))
        break
        
      case 'cpf_inicio':
        const cpfLimpo = apenasNumeros(loja.cpfCnpj || '')
        respostaCorreta = cpfLimpo.startsWith(respostaLimpa.slice(0, 3))
        break
    }
    
    if (!respostaCorreta) {
      return NextResponse.json(
        { success: false, error: 'Resposta incorreta. Tente novamente.' },
        { status: 400 }
      )
    }
    
    // Tudo validado - gerar nova senha
    const novaSenha = gerarSenhaAleatoria(10)
    const senhaHash = await hashPassword(novaSenha)
    
    // Atualizar senha no banco
    await db.loja.update({
      where: { id: loja.id },
      data: { senhaHash }
    })
    
    console.log(`[Recuperar Senha] Nova senha gerada para ${email}: ${novaSenha}`)
    
    // Em produção, aqui você enviaria um email
    // Por enquanto, retorna a senha para mostrar na tela
    
    return NextResponse.json({
      success: true,
      novaSenha,
      message: 'Nova senha gerada com sucesso'
    })
    
  } catch (error) {
    console.error('[Recuperar Senha] Erro:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao processar solicitação' },
      { status: 500 }
    )
  }
}
