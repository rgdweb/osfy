'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import Link from 'next/link'
import { Wrench, ArrowLeft, KeyRound } from 'lucide-react'

export default function LoginSimplesPage() {
  const [email, setEmail] = useState('admin@tecos.com')
  const [senha, setSenha] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [debug, setDebug] = useState('')
  
  // Estados para recuperação de senha
  const [showRecuperar, setShowRecuperar] = useState(false)
  const [emailRecuperar, setEmailRecuperar] = useState('')
  const [loadingRecuperar, setLoadingRecuperar] = useState(false)
  const [senhaGerada, setSenhaGerada] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setDebug('Enviando requisição...')

    try {
      const requestBody = { 
        email: email.trim().toLowerCase(), 
        senha, 
        tipo: 'auto' 
      }
      setDebug(`Enviando: ${JSON.stringify(requestBody)}`)

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      setDebug(`Resposta: ${JSON.stringify(data, null, 2)}`)

      if (data.success) {
        toast.success('Login realizado!')
        setDebug(prev => prev + '\n\n✅ Sucesso! Redirecionando...')
        
        setTimeout(() => {
          const destino = data.tipo === 'superadmin' ? '/superadmin' : '/painel'
          window.location.href = destino
        }, 1000)
      } else {
        toast.error(data.error || 'Erro no login')
        setDebug(prev => prev + `\n\n❌ Erro: ${data.error}`)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setDebug(`Erro de conexão: ${errorMsg}`)
      toast.error('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const handleRecuperarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!emailRecuperar.trim()) {
      toast.error('Digite seu email')
      return
    }
    
    setLoadingRecuperar(true)
    setSenhaGerada('')
    
    try {
      const response = await fetch('/api/auth/recuperar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailRecuperar.trim().toLowerCase() })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Nova senha gerada com sucesso!')
        setSenhaGerada(data.novaSenha)
        setEmailRecuperar('')
      } else {
        toast.error(data.error || 'Erro ao recuperar senha')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setLoadingRecuperar(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-white">Login TecOS</CardTitle>
              <CardDescription className="text-slate-400">Detecção automática de tipo</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="seu@email.com"
              />
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="senha" className="text-slate-300">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="••••••••"
              />
            </div>

            {/* Submit */}
            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
            
            {/* Esqueceu a senha */}
            <button
              type="button"
              onClick={() => setShowRecuperar(true)}
              className="w-full text-sm text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              Esqueceu a senha?
            </button>
          </form>
          
          {/* Modal Recuperar Senha */}
          {showRecuperar && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-md bg-slate-800 border-slate-700">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <KeyRound className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white">Recuperar Senha</CardTitle>
                      <CardDescription className="text-slate-400">
                        Digite seu email para gerar uma nova senha
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRecuperarSenha} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="emailRecuperar" className="text-slate-300">Email cadastrado</Label>
                      <Input
                        id="emailRecuperar"
                        type="email"
                        value={emailRecuperar}
                        onChange={(e) => setEmailRecuperar(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="seu@email.com"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 border-slate-600 text-slate-300"
                        onClick={() => {
                          setShowRecuperar(false)
                          setSenhaGerada('')
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        disabled={loadingRecuperar}
                      >
                        {loadingRecuperar ? 'Gerando...' : 'Gerar Nova Senha'}
                      </Button>
                    </div>
                  </form>
                  
                  {/* Senha gerada */}
                  {senhaGerada && (
                    <div className="mt-4 p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg">
                      <p className="text-emerald-400 text-sm mb-2">Nova senha gerada:</p>
                      <div className="flex items-center gap-2">
                        <code className="text-lg font-mono text-white bg-slate-900 px-3 py-1 rounded flex-1">
                          {senhaGerada}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-emerald-600 text-emerald-400"
                          onClick={() => {
                            navigator.clipboard.writeText(senhaGerada)
                            toast.success('Senha copiada!')
                          }}
                        >
                          Copiar
                        </Button>
                      </div>
                      <p className="text-slate-400 text-xs mt-2">
                        Use esta senha para fazer login. Você pode alterá-la depois no painel.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Debug Info */}
          {debug && (
            <div className="mt-4 p-3 bg-slate-900 rounded-lg text-xs text-slate-400 font-mono whitespace-pre-wrap max-h-40 overflow-auto">
              {debug}
            </div>
          )}

          {/* Links */}
          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            <Link href="/debug" className="text-emerald-400 hover:underline">
              Ver Debug
            </Link>
            <span className="text-slate-600">|</span>
            <Link href="/" className="text-slate-400 hover:underline">
              Voltar ao Início
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
