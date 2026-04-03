'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Bot, 
  X, 
  Send, 
  Loader2, 
  MessageCircle,
  ChevronRight,
  ClipboardList,
  Calculator,
  CreditCard,
  MessageCircle as WhatsAppIcon,
  PenTool,
  Users,
  ShoppingCart,
  Settings,
  Globe,
  Star,
  HelpCircle
} from 'lucide-react'

interface Mensagem {
  id: string
  tipo: 'usuario' | 'assistente' | 'opcoes' | 'categoria'
  conteudo: string
  opcoes?: Array<{
    pergunta: string
    resposta?: string
    categoria?: string
  }>
  resposta?: string
}

interface Categoria {
  id: string
  titulo: string
  icone: string
}

const icones: Record<string, any> = {
  'clipboard-list': ClipboardList,
  'calculator': Calculator,
  'credit-card': CreditCard,
  'message-circle': WhatsAppIcon,
  'pen-tool': PenTool,
  'users': Users,
  'shopping-cart': ShoppingCart,
  'settings': Settings,
  'globe': Globe,
  'star': Star,
  'help-circle': HelpCircle
}

export default function AssistenteVirtual() {
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (aberto && mensagens.length === 0) {
      carregarSaudacao()
    }
  }, [aberto])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function carregarSaudacao() {
    setLoading(true)
    try {
      const response = await fetch('/api/assistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const data = await response.json()
      
      setCategorias(data.categorias || [])
      
      setMensagens([{
        id: Date.now().toString(),
        tipo: 'assistente',
        conteudo: data.mensagem || 'Olá! Como posso te ajudar?'
      }])
    } catch (error) {
      setMensagens([{
        id: Date.now().toString(),
        tipo: 'assistente',
        conteudo: 'Olá! Sou o Assistente Virtual do TecOS. Como posso te ajudar?'
      }])
    } finally {
      setLoading(false)
    }
  }

  async function enviarMensagem(texto?: string) {
    const mensagem = texto || inputValue.trim()
    if (!mensagem || loading) return

    setInputValue('')
    
    // Adicionar mensagem do usuário
    setMensagens(prev => [...prev, {
      id: Date.now().toString(),
      tipo: 'usuario',
      conteudo: mensagem
    }])

    setLoading(true)
    
    try {
      const response = await fetch('/api/assistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem })
      })
      const data = await response.json()

      // Adicionar resposta do assistente
      if (data.tipo === 'resposta_direta') {
        setMensagens(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          tipo: 'assistente',
          conteudo: data.resposta,
          resposta: data.resposta
        }])
        
        // Se tem outras perguntas relacionadas
        if (data.outrasPerguntas && data.outrasPerguntas.length > 0) {
          setMensagens(prev => [...prev, {
            id: (Date.now() + 2).toString(),
            tipo: 'opcoes',
            conteudo: 'Perguntas relacionadas:',
            opcoes: data.outrasPerguntas
          }])
        }
      } else if (data.tipo === 'opcoes') {
        setMensagens(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          tipo: 'opcoes',
          conteudo: data.mensagem,
          opcoes: data.opcoes
        }])
      } else if (data.tipo === 'categoria') {
        setMensagens(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          tipo: 'categoria',
          conteudo: data.mensagem,
          opcoes: data.perguntas
        }])
      } else if (data.tipo === 'nao_encontrado' || data.tipo === 'ajuda') {
        setMensagens(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          tipo: 'assistente',
          conteudo: data.mensagem
        }])
        
        if (data.sugestoes) {
          setMensagens(prev => [...prev, {
            id: (Date.now() + 2).toString(),
            tipo: 'opcoes',
            conteudo: 'Sugestões:',
            opcoes: data.sugestoes
          }])
        }
        
        if (data.categorias) {
          setCategorias(data.categorias)
        }
      } else {
        setMensagens(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          tipo: 'assistente',
          conteudo: data.mensagem || data.resposta || 'Desculpe, não entendi. Pode reformular?'
        }])
      }
    } catch (error) {
      setMensagens(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        tipo: 'assistente',
        conteudo: 'Desculpe, tive um problema. Pode tentar novamente?'
      }])
    } finally {
      setLoading(false)
    }
  }

  async function selecionarCategoria(categoriaId: string) {
    setLoading(true)
    
    setMensagens(prev => [...prev, {
      id: Date.now().toString(),
      tipo: 'usuario',
      conteudo: categorias.find(c => c.id === categoriaId)?.titulo || categoriaId
    }])

    try {
      const response = await fetch('/api/assistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria: categoriaId })
      })
      const data = await response.json()

      setMensagens(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        tipo: 'categoria',
        conteudo: data.mensagem,
        opcoes: data.perguntas
      }])
    } catch (error) {
      setMensagens(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        tipo: 'assistente',
        conteudo: 'Erro ao carregar categoria.'
      }])
    } finally {
      setLoading(false)
    }
  }

  function selecionarOpcao(opcao: { pergunta: string; resposta?: string }) {
    // Adicionar a pergunta como mensagem do usuário
    setMensagens(prev => [...prev, {
      id: Date.now().toString(),
      tipo: 'usuario',
      conteudo: opcao.pergunta
    }])

    // Se já tem a resposta, mostrar direto
    if (opcao.resposta) {
      setTimeout(() => {
        setMensagens(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          tipo: 'assistente',
          conteudo: opcao.resposta!
        }])
      }, 300)
    } else {
      // Buscar resposta
      enviarMensagem(opcao.pergunta)
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarMensagem()
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-full shadow-lg transition-all hover:scale-105"
        title="Assistente Virtual"
      >
        <Bot className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100%-2rem)] md:w-96 max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
      {/* Header */}
      <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">Assistente TecOS</h3>
            <p className="text-xs text-emerald-100">Sempre pronto para ajudar</p>
          </div>
        </div>
        <button
          onClick={() => setAberto(false)}
          className="hover:bg-white/20 p-1.5 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 max-h-[50vh]">
        {mensagens.map((msg) => (
          <div key={msg.id}>
            {msg.tipo === 'usuario' ? (
              <div className="flex justify-end">
                <div className="bg-emerald-600 text-white px-4 py-2 rounded-2xl rounded-br-sm max-w-[85%]">
                  <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
                </div>
              </div>
            ) : msg.tipo === 'opcoes' ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">{msg.conteudo}</p>
                <div className="space-y-1">
                  {msg.opcoes?.map((opcao, idx) => (
                    <button
                      key={idx}
                      onClick={() => selecionarOpcao(opcao)}
                      className="w-full text-left bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg text-sm text-slate-700 transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate">{opcao.pergunta}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : msg.tipo === 'categoria' ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">{msg.conteudo}</p>
                <div className="space-y-1">
                  {msg.opcoes?.map((opcao, idx) => (
                    <button
                      key={idx}
                      onClick={() => selecionarOpcao(opcao)}
                      className="w-full text-left bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg text-sm text-slate-700 transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate">{opcao.pergunta}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex justify-start">
                <div className="bg-slate-100 px-4 py-2 rounded-2xl rounded-bl-sm max-w-[85%]">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{msg.conteudo}</p>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-sm">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Categorias */}
      {categorias.length > 0 && mensagens.length <= 2 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-slate-500 mb-2">Categorias:</p>
          <div className="flex flex-wrap gap-1">
            {categorias.map((cat) => {
              const IconeComponent = icones[cat.icone] || HelpCircle
              return (
                <button
                  key={cat.id}
                  onClick={() => selecionarCategoria(cat.id)}
                  className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-full text-xs text-slate-600 transition-colors"
                >
                  <IconeComponent className="w-3 h-3" />
                  <span>{cat.titulo}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-slate-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua dúvida..."
            className="flex-1 px-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={loading}
          />
          <button
            onClick={() => enviarMensagem()}
            disabled={loading || !inputValue.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white p-2 rounded-full transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
