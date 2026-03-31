'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Clock, ArrowLeft, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

function PendenteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [osId, setOsId] = useState<string | null>(null)

  const externalReference = searchParams.get('external_reference')
  const paymentId = searchParams.get('payment_id')

  useEffect(() => {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-amber-50">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-600" />
      </div>
    )
  }

  const isFatura = externalReference?.startsWith('FATURA-')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-amber-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Pagamento em Análise
          </h1>

          <p className="text-slate-600 mb-6">
            {isFatura 
              ? 'Seu pagamento está sendo processado. Você será notificado quando for confirmado.'
              : 'Seu pagamento está sendo processado. Assim que confirmado, você será notificado.'}
          </p>

          {paymentId && paymentId !== 'null' && (
            <p className="text-sm text-slate-500 mb-4">
              ID do Pagamento: {paymentId}
            </p>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Atenção:</strong> Se você pagou via PIX ou boleto, pode levar alguns minutos para a confirmação.
            </p>
          </div>

          <div className="space-y-3">
            {osId && (
              <Button 
                className="w-full bg-yellow-600 hover:bg-yellow-700"
                onClick={() => router.push(`/os/${osId}`)}
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PagamentoPendentePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-amber-50">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-600" />
      </div>
    }>
      <PendenteContent />
    </Suspense>
  )
}
