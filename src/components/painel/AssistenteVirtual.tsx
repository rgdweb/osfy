'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Loader2, Minimize2, Maximize2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Mensagem {
  id: string
  role: 'user' | 'assistant'
  content: string
  opcoes?: Array<{
    pergunta: string
    resposta?: string
    categoria?: string
  }>
}

const DICAS_RAPIDAS = [
  "Como gerar PIX?",
  "Como criar uma OS?",
  "Como enviar WhatsApp?",
  "Como assinar a OS?",
]

export function AssistenteVirtual() {
  const [aberto, setAberto] = useState(false)
  const [minimizado, setMinimizado] = useState(false)
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou o Assistente Virtual do TecOS. Como posso te ajudar?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDicas, setShowDicas] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [mensagens])

  const enviarMensagem = async (texto?: string) => {
    const mensagemTexto = texto || input.trim()
    if (!mensagemTexto || loading) return

    // Adicionar mensagem do usuário
    const novaMensagem: Mensagem = { 
      id: Date.now().toString(),
      role: 'user', 
      content: mensagemTexto 
    }
    setMensagens(prev => [...prev, novaMensagem])
    setInput('')
    setLoading(true)
    setShowDicas(false)

    try {
      const response = await fetch('/api/assistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: mensagemTexto })
      })

      const data = await response.json()

      // Tratar diferentes tipos de resposta da API
      let respostaTexto = ''
      let opcoes: Mensagem['opcoes'] = undefined

      if (data.tipo === 'resposta_direta') {
        respostaTexto = data.resposta
        if (data.outrasPerguntas && data.outrasPerguntas.length > 0) {
          opcoes = data.outrasPerguntas
        }
      } else if (data.tipo === 'opcoes') {
        respostaTexto = data.mensagem
        opcoes = data.opcoes
      } else if (data.tipo === 'saudacao' || data.tipo === 'ajuda') {
        respostaTexto = data.mensagem
        if (data.sugestoes) {
          opcoes = data.sugestoes
        }
      } else if (data.tipo === 'nao_encontrado') {
        respostaTexto = data.mensagem
        if (data.sugestoes) {
          opcoes = data.sugestoes
        }
      } else if (data.resposta) {
        respostaTexto = data.resposta
      } else if (data.mensagem) {
        respostaTexto = data.mensagem
      } else if (data.erro) {
        respostaTexto = 'Desculpe, tive um problema. Pode tentar novamente?'
      } else {
        respostaTexto = 'Desculpe, não entendi. Pode reformular?'
      }

      setMensagens(prev => [...prev, { 
        id: (Date.now() + 1).toString(),
        role: 'assistant', 
        content: respostaTexto,
        opcoes
      }])

    } catch {
      setMensagens(prev => [...prev, { 
        id: (Date.now() + 1).toString(),
        role: 'assistant', 
        content: 'Ops, erro de conexão. Verifique sua internet e tente novamente.' 
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarMensagem()
    }
  }

  // Selecionar uma opção
  const selecionarOpcao = (opcao: { pergunta: string; resposta?: string }) => {
    // Adicionar a pergunta como mensagem do usuário
    setMensagens(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: opcao.pergunta
    }])

    // Se já tem a resposta, mostrar direto
    if (opcao.resposta) {
      setTimeout(() => {
        setMensagens(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: opcao.resposta!
        }])
      }, 300)
    } else {
      // Buscar resposta
      enviarMensagem(opcao.pergunta)
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group hover:scale-110"
        aria-label="Abrir Assistente Virtual"
      >
        <Bot className="w-7 h-7 text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full" />
      </button>
    )
  }

  return (
    <div 
      className={cn(
        "fixed z-50 bg-white shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 flex flex-col",
        minimizado 
          ? "bottom-6 right-6 w-72 h-14" 
          : "bottom-6 right-6 w-96 h-[480px]"
      )}
    >
      {/* Header - fixo no topo */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-white" />
          <span className="font-semibold text-white">Assistente TecOS</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimizado(!minimizado)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            {minimizado ? (
              <Maximize2 className="w-4 h-4 text-white" />
            ) : (
              <Minimize2 className="w-4 h-4 text-white" />
            )}
          </button>
          <button
            onClick={() => setAberto(false)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {!minimizado && (
        <>
          {/* Área de Mensagens - scroll flexível */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 min-h-0">
            {mensagens.map((msg) => (
              <div key={msg.id}>
                <div
                  className={cn(
                    "flex",
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap",
                      msg.role === 'user'
                        ? 'bg-emerald-500 text-white rounded-br-md'
                        : 'bg-white text-slate-700 shadow-sm rounded-bl-md'
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
                
                {/* Mostrar opções se existir */}
                {msg.opcoes && msg.opcoes.length > 0 && msg.role === 'assistant' && (
                  <div className="mt-2 ml-2 space-y-1">
                    {msg.opcoes.slice(0, 4).map((opcao, idx) => (
                      <button
                        key={idx}
                        onClick={() => selecionarOpcao(opcao)}
                        className="w-full text-left bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-between group"
                      >
                        <span className="truncate">{opcao.pergunta}</span>
                        <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-md px-4 py-2 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Dicas Rápidas - acima do input */}
          {showDicas && mensagens.length === 1 && (
            <div className="px-4 py-2 bg-white border-t shrink-0">
              <p className="text-xs text-slate-500 mb-2">Perguntas frequentes:</p>
              <div className="flex flex-wrap gap-1">
                {DICAS_RAPIDAS.map((dica, i) => (
                  <button
                    key={i}
                    onClick={() => enviarMensagem(dica)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-full transition-colors"
                  >
                    {dica}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input - fixo na parte inferior */}
          <div className="p-3 border-t bg-white shrink-0">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua dúvida..."
                className="flex-1 text-sm"
                disabled={loading}
              />
              <Button
                onClick={() => enviarMensagem()}
                disabled={!input.trim() || loading}
                size="icon"
                className="bg-emerald-500 hover:bg-emerald-600 shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
