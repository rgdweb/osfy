import { NextResponse } from 'next/server'
import { db, isDbInitialized, getInitError } from '@/lib/db'

export async function GET() {
  const status: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: {
      configured: !!process.env.DATABASE_URL,
      initialized: isDbInitialized(),
      error: getInitError()
    }
  }

  try {
    // Teste rápido de conexão
    await db.$queryRaw`SELECT 1`
    status.database.connected = true
  } catch (error: unknown) {
    status.database.connected = false
    status.database.connectionError = error instanceof Error ? error.message : String(error)
  }

  const isHealthy = status.database.connected === true

  return NextResponse.json(
    { 
      healthy: isHealthy,
      ...status 
    },
    { status: isHealthy ? 200 : 503 }
  )
}
