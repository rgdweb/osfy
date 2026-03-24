'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { XCircle, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

function ErroContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [osId, setOsId] = useState<string | null>(null)

  const externalReference = searchParams.get('external_reference')
  const preferenceId = searchParams.get('preference_id')
  const status = searchParams.get('status')

  useEffect(() => {
    // Se tem referência externa, buscar a OS
    if (externalReference && externalReference.startsWith('OS-')) {
      const parts = externalReference.split('-')
      if (parts.length >= 3) {
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
    } else {
      setLoading(false)
    }
  }, [externalReference])

  const tentarNovamente = () => {
    if (osId) {
      router.push(`/os/${osId}`)
    } else {
      router.push('/')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    )
  }

  const isFatura = externalReference?.startsWith('FATURA-')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Pagamento não realizado
          </h1>

          <p className="text-slate-600 mb-6">
            {isFatura 
              ? 'Não foi possível processar seu pagamento. Por favor, tente novamente.'
              : 'Houve um problema com seu pagamento. Nenhum valor foi cobrado.'}
          </p>

          {status && (
            <p className="text-sm text-slate-500 mb-4">
              Status: {status === 'null' ? 'Não processado' : status}
            </p>
          )}

          <div className="space-y-3">
            <Button 
              className="w-full bg-red-600 hover:bg-red-700"
              onClick={tentarNovamente}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
            
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PagamentoErroPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    }>
      <ErroContent />
    </Suspense>
  )
}
