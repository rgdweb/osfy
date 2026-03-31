'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, ArrowLeft, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

function SucessoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [osId, setOsId] = useState<string | null>(null)

  const externalReference = searchParams.get('external_reference')
  const paymentId = searchParams.get('payment_id')
  const status = searchParams.get('status')

  useEffect(() => {
    // Se tem referência externa, buscar a OS
    if (externalReference && externalReference.startsWith('OS-')) {
      // Extrair ID da OS da referência externa (formato: OS-{numero}-{idParcial})
      const parts = externalReference.split('-')
      if (parts.length >= 3) {
        // Buscar OS pelo número
        fetch(`/api/os/consultar?numeroOs=${parts[1]}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.os?.id) {
              setOsId(data.os.id)
            }
          })
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    } else if (externalReference && externalReference.startsWith('FATURA-')) {
      // É uma fatura, redirecionar para painel
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [externalReference])

  const voltarParaOS = () => {
    if (osId) {
      router.push(`/os/${osId}`)
    } else {
      router.push('/')
    }
  }

  const irParaPainel = () => {
    router.push('/painel')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  // Verificar se é fatura ou OS
  const isFatura = externalReference?.startsWith('FATURA-')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Pagamento Confirmado!
          </h1>

          <p className="text-slate-600 mb-6">
            {isFatura 
              ? 'Sua mensalidade foi paga com sucesso. Seu acesso foi liberado!'
              : 'Seu pagamento foi processado com sucesso. Você receberá uma confirmação por e-mail.'}
          </p>

          {paymentId && (
            <p className="text-sm text-slate-500 mb-4">
              ID do Pagamento: {paymentId}
            </p>
          )}

          <div className="space-y-3">
            {isFatura ? (
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={irParaPainel}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Ir para o Painel
              </Button>
            ) : (
              <>
                {osId && (
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={voltarParaOS}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver Ordem de Serviço
                  </Button>
                )}
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Início
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PagamentoSucessoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    }>
      <SucessoContent />
    </Suspense>
  )
}
