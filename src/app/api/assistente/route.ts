import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

// Cache da base de conhecimento
let baseConhecimento: any = null

async function carregarBaseConhecimento() {
  if (baseConhecimento) return baseConhecimento
  
  try {
    const filePath = join(process.cwd(), 'data', 'assistente-base-conhecimento.json')
    const content = await readFile(filePath, 'utf-8')
    baseConhecimento = JSON.parse(content)
    return baseConhecimento
  } catch (error) {
    console.error('[Assistente] Erro ao carregar base:', error)
    return null
  }
}

// Normalizar texto para comparação
function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .trim()
}

// Calcular pontuação de relevância
function calcularRelevancia(textoUsuario: string, palavrasChave: string[]): number {
  const palavrasUsuario = normalizarTexto(textoUsuario).split(/\s+/)
  let pontos = 0
  
  for (const palavraChave of palavrasChave) {
    const palavraNormalizada = normalizarTexto(palavraChave)
    
    // Correspondência exata
    if (palavrasUsuario.includes(palavraNormalizada)) {
      pontos += 10
    }
    
    // Correspondência parcial
    for (const palavra of palavrasUsuario) {
      if (palavra.includes(palavraNormalizada) || palavraNormalizada.includes(palavra)) {
        pontos += 5
      }
    }
  }
  
  return pontos
}

// Buscar respostas baseado no texto do usuário
function buscarRespostas(texto: string, base: any) {
  const textoNormalizado = normalizarTexto(texto)
  const resultados: any[] = []
  
  // Se for saudação
  if (textoNormalizado.match(/^(oi|ola|hey|bom dia|boa tarde|boa noite|e ai|eae|inicio|comecar|começar)$/)) {
    return {
      tipo: 'saudacao',
      mensagem: base.saudacoes.ola,
      sugestoes: base.respostasRapidas,
      categorias: Object.entries(base.categorias).map(([key, cat]: [string, any]) => ({
        id: key,
        titulo: cat.titulo,
        icone: cat.icone
      }))
    }
  }
  
  // Se pedir ajuda
  if (textoNormalizado.match(/(ajuda|help|socorro|como funciona|o que faz|opcoes|opções)/)) {
    return {
      tipo: 'ajuda',
      mensagem: base.saudacoes.ajuda,
      sugestoes: base.respostasRapidas,
      categorias: Object.entries(base.categorias).map(([key, cat]: [string, any]) => ({
        id: key,
        titulo: cat.titulo,
        icone: cat.icone
      }))
    }
  }
  
  // Buscar nas categorias
  for (const [catId, categoria] of Object.entries(base.categorias) as [string, any][]) {
    const pontosCategoria = calcularRelevancia(texto, categoria.palavrasChave)
    
    if (pontosCategoria > 0) {
      // Buscar nos tópicos da categoria
      for (const [topicoId, topico] of Object.entries(categoria.topicos) as [string, any][]) {
        const pontosTopico = calcularRelevancia(texto, topico.palavrasChave)
        const pontosTotal = pontosCategoria + pontosTopico
        
        if (pontosTotal > 0) {
          for (const pergunta of topico.perguntas) {
            const pontosPergunta = calcularRelevancia(texto, [pergunta.pergunta])
            const score = pontosTotal + pontosPergunta
            
            resultados.push({
              categoria: {
                id: catId,
                titulo: categoria.titulo,
                icone: categoria.icone
              },
              topico: topicoId,
              pergunta: pergunta.pergunta,
              resposta: pergunta.resposta,
              score
            })
          }
        }
      }
    }
  }
  
  // Ordenar por relevância
  resultados.sort((a, b) => b.score - a.score)
  
  // Se encontrou resultados
  if (resultados.length > 0) {
    // Agrupar por categoria para mostrar opções
    const categoriasEncontradas = [...new Set(resultados.map(r => r.categoria.id))]
    
    // Se tem muita certeza da resposta (score alto), retorna direto
    if (resultados[0].score >= 20) {
      return {
        tipo: 'resposta_direta',
        resposta: resultados[0].resposta,
        perguntaRelacionada: resultados[0].pergunta,
        outrasPerguntas: resultados.slice(1, 4).map(r => ({
          pergunta: r.pergunta,
          categoria: r.categoria.titulo
        }))
      }
    }
    
    // Se encontrou múltiplas categorias, mostra opções
    if (categoriasEncontradas.length > 1 || resultados.length > 1) {
      return {
        tipo: 'opcoes',
        mensagem: `Encontrei ${resultados.length} resultados relacionados. Escolha uma opção:`,
        opcoes: resultados.slice(0, 6).map(r => ({
          pergunta: r.pergunta,
          resposta: r.resposta,
          categoria: r.categoria.titulo
        }))
      }
    }
    
    // Retorna a única resposta encontrada
    return {
      tipo: 'resposta_direta',
      resposta: resultados[0].resposta,
      perguntaRelacionada: resultados[0].pergunta
    }
  }
  
  // Não encontrou nada
  return {
    tipo: 'nao_encontrado',
    mensagem: base.saudacoes.naoEntendi,
    sugestoes: base.respostasRapidas,
    categorias: Object.entries(base.categorias).map(([key, cat]: [string, any]) => ({
      id: key,
      titulo: cat.titulo,
      icone: cat.icone
    }))
  }
}

// Buscar respostas por categoria
function buscarPorCategoria(categoriaId: string, base: any) {
  const categoria = base.categorias[categoriaId]
  
  if (!categoria) {
    return {
      tipo: 'erro',
      mensagem: 'Categoria não encontrada'
    }
  }
  
  const perguntas: any[] = []
  
  for (const [topicoId, topico] of Object.entries(categoria.topicos) as [string, any][]) {
    for (const pergunta of topico.perguntas) {
      perguntas.push({
        pergunta: pergunta.pergunta,
        resposta: pergunta.resposta,
        topico: topicoId
      })
    }
  }
  
  return {
    tipo: 'categoria',
    categoria: {
      id: categoriaId,
      titulo: categoria.titulo,
      icone: categoria.icone
    },
    mensagem: `tópicos sobre ${categoria.titulo}:`,
    perguntas
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mensagem, categoria } = body
    
    const base = await carregarBaseConhecimento()
    
    if (!base) {
      return NextResponse.json({ 
        erro: 'Base de conhecimento não disponível' 
      }, { status: 500 })
    }
    
    // Se solicitou uma categoria específica
    if (categoria) {
      const resultado = buscarPorCategoria(categoria, base)
      return NextResponse.json(resultado)
    }
    
    // Buscar resposta baseada na mensagem
    if (!mensagem) {
      return NextResponse.json({ 
        tipo: 'saudacao',
        mensagem: base.saudacoes.ola,
        sugestoes: base.respostasRapidas,
        categorias: Object.entries(base.categorias).map(([key, cat]: [string, any]) => ({
          id: key,
          titulo: cat.titulo,
          icone: cat.icone
        }))
      })
    }
    
    const resultado = buscarRespostas(mensagem, base)
    return NextResponse.json(resultado)
    
  } catch (error: any) {
    console.error('[Assistente] Erro:', error)
    return NextResponse.json({ 
      tipo: 'erro',
      mensagem: 'Desculpe, tive um problema. Pode tentar novamente?' 
    })
  }
}
