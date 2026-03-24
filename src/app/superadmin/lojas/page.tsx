import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { LojasLista } from './lista-client'

// Desabilitar cache para sempre mostrar dados atualizados
export const revalidate = 0

export default async function LojasPage() {
  const user = await getCurrentUser()

  if (!user || user.tipo !== 'superadmin') {
    redirect('/')
  }

  const lojas = await db.loja.findMany({
    orderBy: { criadoEm: 'desc' },
    select: {
      id: true,
      nome: true,
      slug: true,
      responsavel: true,
      email: true,
      telefone: true,
      whatsapp: true,
      cidade: true,
      estado: true,
      endereco: true,
      descricao: true,
      horarioAtendimento: true,
      tiposServico: true,
      status: true,
      bloqueado: true,
      motivoBloqueio: true,
      trialAte: true,
      trialUsado: true,
      plano: true,
      precoPlano: true,
      criadoEm: true,
      _count: {
        select: { ordens: true, clientes: true }
      }
    }
  })

  return <LojasLista lojas={JSON.parse(JSON.stringify(lojas))} />
}
