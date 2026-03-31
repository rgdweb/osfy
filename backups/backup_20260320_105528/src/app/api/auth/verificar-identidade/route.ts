import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Tipos de perguntas de verificação
type TipoPergunta = 'telefone_final' | 'cpf_inicio' | 'whatsapp_final'

interface PerguntaVerificacao {
  tipo: TipoPergunta
  pergunta: string
  placeholder: string
}

// Função para gerar pergunta aleatória baseada nos dados do cadastro
function gerarPerguntaAleatoria(loja: { telefone: string; whatsapp: string; cpfCnpj: string | null }): PerguntaVerificacao {
  const perguntasDisponiveis: PerguntaVerificacao[] = []
  
  // Pergunta sobre os 4 últimos dígitos do telefone
  if (loja.telefone && loja.telefone.length >= 4) {
    perguntasDisponiveis.push({
      tipo: 'telefone_final',
      pergunta: 'Digite os 4 últimos dígitos do telefone cadastrado',
      placeholder: 'Ex: 1234'
    })
  }
  
  // Pergunta sobre os 4 últimos dígitos do WhatsApp
  if (loja.whatsapp && loja.whatsapp.length >= 4 && loja.whatsapp !== loja.telefone) {
    perguntasDisponiveis.push({
      tipo: 'whatsapp_final',
      pergunta: 'Digite os 4 últimos dígitos do WhatsApp cadastrado',
      placeholder: 'Ex: 5678'
    })
  }
  
  // Pergunta sobre os 3 primeiros dígitos do CPF/CNPJ
  if (loja.cpfCnpj && loja.cpfCnpj.length >= 11) {
    perguntasDisponiveis.push({
      tipo: 'cpf_inicio',
      pergunta: 'Digite os 3 primeiros dígitos do CPF/CNPJ cadastrado',
      placeholder: 'Ex: 123'
    })
  }
  
  // Se não houver perguntas disponíveis, usa o telefone como fallback
  if (perguntasDisponiveis.length === 0) {
    perguntasDisponiveis.push({
      tipo: 'telefone_final',
      pergunta: 'Digite os 4 últimos dígitos do telefone cadastrado',
      placeholder: 'Ex: 1234'
    })
  }
  
  // Retorna uma pergunta aleatória
  const indice = Math.floor(Math.random() * perguntasDisponiveis.length)
  return perguntasDisponiveis[indice]
}

// Função para limpar caracteres não numéricos
function apenasNumeros(valor: string): string {
  return valor.replace(/\D/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email é obrigatório' },
        { status: 400 }
      )
    }
    
    // Buscar loja pelo email
    const loja = await db.loja.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        telefone: true,
        whatsapp: true,
        cpfCnpj: true,
        status: true,
        trialAte: true,
        expiraEm: true
      }
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
        { success: false, error: 'Seu período expirou. Entre em contato para renovar.' },
        { status: 403 }
      )
    }
    
    // Gerar pergunta aleatória
    const pergunta = gerarPerguntaAleatoria(loja)
    
    // Gerar um token de sessão simples para validar depois
    const tokenSessao = Buffer.from(`${loja.id}:${Date.now()}:${pergunta.tipo}`).toString('base64')
    
    return NextResponse.json({
      success: true,
      pergunta: pergunta.pergunta,
      tipo: pergunta.tipo,
      placeholder: pergunta.placeholder,
      token: tokenSessao
    })
    
  } catch (error) {
    console.error('[Verificar Identidade] Erro:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao processar solicitação' },
      { status: 500 }
    )
  }
}

// Endpoint para validar a resposta
export async function PUT(request: NextRequest) {
  try {
    const { email, tipo, resposta, token } = await request.json()
    
    if (!email || !tipo || !resposta || !token) {
      return NextResponse.json(
        { success: false, error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }
    
    // Validar token
    try {
      const decoded = Buffer.from(token, 'base64').toString()
      const [, , tipoOriginal] = decoded.split(':')
      
      if (tipo !== tipoOriginal) {
        return NextResponse.json(
          { success: false, error: 'Token inválido' },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 400 }
      )
    }
    
    // Buscar loja
    const loja = await db.loja.findUnique({
      where: { email: email.toLowerCase().trim() }
    })
    
    if (!loja) {
      return NextResponse.json(
        { success: false, error: 'Email não encontrado' },
        { status: 404 }
      )
    }
    
    // Validar resposta baseada no tipo
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
    
    // Resposta correta - retornar sucesso para gerar senha
    return NextResponse.json({
      success: true,
      validado: true,
      message: 'Identidade verificada com sucesso'
    })
    
  } catch (error) {
    console.error('[Validar Resposta] Erro:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao processar solicitação' },
      { status: 500 }
    )
  }
}
