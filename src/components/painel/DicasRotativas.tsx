'use client'

import { useState, useEffect } from 'react'
import { Lightbulb, ChevronLeft, ChevronRight, Bell, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DICAS = [
  {
    titulo: "WhatsApp Rápido",
    texto: "Clique no botão 'WhatsApp' na OS para enviar o link direto pro cliente."
  },
  {
    titulo: "Assinatura Digital",
    texto: "O cliente assina pela página pública usando o código de segurança que está na OS impressa."
  },
  {
    titulo: "Receber Online",
    texto: "Gere PIX ou Boleto na OS e o cliente paga pela página pública!"
  },
  {
    titulo: "Aprovação Remota",
    texto: "O cliente pode aprovar o orçamento pela página pública, sem precisar ir na loja."
  },
  {
    titulo: "Ver como Cliente",
    texto: "Use o botão 'Ver como Cliente' para testar como o cliente vê sua OS."
  },
  {
    titulo: "Avaliação do Atendimento",
    texto: "Depois de assinar, o cliente pode avaliar com estrelas. As avaliações aparecem na página da loja!"
  },
  {
    titulo: "Status Pronto",
    texto: "Ao mudar para 'Pronto', o sistema pergunta se quer avisar o cliente no WhatsApp."
  },
  {
    titulo: "Logo da Loja",
    texto: "Configure a logo da sua loja em Configurações. Ela aparece na OS impressa e na página pública!"
  },
  {
    titulo: "Fotos da OS",
    texto: "Adicione fotos do equipamento antes e depois do reparo. O cliente vê na página pública!"
  },
  {
    titulo: "PDV Integrado",
    texto: "Venda produtos usando o PDV. Controle estoque, categorias e vendas tudo no mesmo sistema!"
  }
]

interface DicasRotativasProps {
  variant?: 'sidebar' | 'mobile'
}

export function DicasRotativas({ variant = 'sidebar' }: DicasRotativasProps) {
  const [indiceAtual, setIndiceAtual] = useState(0)
  const [pausado, setPausado] = useState(false)
  const [visivel, setVisivel] = useState(true)

  // Trocar dica automaticamente a cada 8 segundos
  useEffect(() => {
    if (pausado) return

    const interval = setInterval(() => {
      setIndiceAtual((prev) => (prev + 1) % DICAS.length)
    }, 8000)

    return () => clearInterval(interval)
  }, [pausado])

  const proximaDica = () => {
    setIndiceAtual((prev) => (prev + 1) % DICAS.length)
  }

  const dicaAnterior = () => {
    setIndiceAtual((prev) => (prev - 1 + DICAS.length) % DICAS.length)
  }

  // Versão Mobile - Sininho com popup
  if (variant === 'mobile') {
    if (!visivel) return null

    return (
      <div className="fixed bottom-20 left-4 right-4 z-40 bg-white rounded-xl shadow-lg border border-slate-200 p-3 animate-in slide-in-from-bottom-4">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
            <Lightbulb className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700">{DICAS[indiceAtual].titulo}</p>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{DICAS[indiceAtual].texto}</p>
          </div>
          <button 
            onClick={() => setVisivel(false)}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        
        <div className="flex items-center justify-center gap-1 mt-2">
          <button onClick={dicaAnterior} className="p-1 hover:bg-slate-100 rounded">
            <ChevronLeft className="w-3 h-3 text-slate-400" />
          </button>
          <div className="flex gap-1">
            {DICAS.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndiceAtual(i)}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  i === indiceAtual ? "bg-emerald-500 w-3" : "bg-slate-300"
                )}
              />
            ))}
          </div>
          <button onClick={proximaDica} className="p-1 hover:bg-slate-100 rounded">
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>
    )
  }

  // Versão Desktop - Card no sidebar
  return (
    <div 
      className="mt-auto pt-4"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 bg-amber-400 rounded-lg flex items-center justify-center">
            <Lightbulb className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-semibold text-amber-700">
            Dica {indiceAtual + 1}/{DICAS.length}
          </span>
        </div>
        
        <h4 className="text-sm font-medium text-slate-800 mb-1">
          {DICAS[indiceAtual].titulo}
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          {DICAS[indiceAtual].texto}
        </p>
        
        <div className="flex items-center justify-center gap-2 mt-3">
          <button 
            onClick={dicaAnterior}
            className="p-1 hover:bg-amber-200/50 rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-amber-600" />
          </button>
          <div className="flex gap-1">
            {DICAS.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndiceAtual(i)}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  i === indiceAtual ? "bg-amber-500 w-4" : "bg-amber-300"
                )}
              />
            ))}
          </div>
          <button 
            onClick={proximaDica}
            className="p-1 hover:bg-amber-200/50 rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-amber-600" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Componente do Sininho para Mobile
export function DicasMobileBell() {
  const [aberto, setAberto] = useState(false)
  const [indiceAtual, setIndiceAtual] = useState(0)

  return (
    <>
      <button
        onClick={() => setAberto(!aberto)}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setAberto(false)}>
          <div 
            className="absolute top-16 right-2 bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-72"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-amber-600" />
              </div>
              <span className="font-medium text-slate-800">Dica Rápida</span>
            </div>
            
            <h4 className="font-medium text-slate-800 mb-1">
              {DICAS[indiceAtual].titulo}
            </h4>
            <p className="text-sm text-slate-600">
              {DICAS[indiceAtual].texto}
            </p>
            
            <div className="flex items-center justify-center gap-2 mt-3">
              <button 
                onClick={() => setIndiceAtual((prev) => (prev - 1 + DICAS.length) % DICAS.length)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </button>
              <div className="flex gap-1">
                {DICAS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndiceAtual(i)}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all",
                      i === indiceAtual ? "bg-emerald-500 w-3" : "bg-slate-300"
                    )}
                  />
                ))}
              </div>
              <button 
                onClick={() => setIndiceAtual((prev) => (prev + 1) % DICAS.length)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
