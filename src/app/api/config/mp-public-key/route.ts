import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * API para buscar a Public Key do Mercado Pago
 * Usada no frontend para inicializar o SDK
 */
export async function GET() {
  try {
    const config = await db.configuracaoPagamento.findFirst()
    
    if (!config || !config.mpPublicKey) {
      return NextResponse.json({
        success: false,
        error: 'Public Key não configurada'
      })
    }
    
    return NextResponse.json({
      success: true,
      publicKey: config.mpPublicKey
    })
  } catch (error) {
    console.error('[MP Public Key] Erro:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar configuração'
    })
  }
}
