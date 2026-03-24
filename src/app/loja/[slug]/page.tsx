import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { LojaPageClient } from './client'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const loja = await db.loja.findUnique({
    where: { slug }
  })

  if (!loja) {
    return {
      title: 'Loja não encontrada - TecOS'
    }
  }

  return {
    title: `${loja.nome} - Assistência Técnica | TecOS`,
    description: loja.descricao || `Assistência técnica ${loja.nome} em ${loja.cidade}, ${loja.estado}. ${loja.tiposServico?.replace(/,/g, ', ')}`
  }
}

export default async function LojaPage({ params }: Props) {
  const { slug } = await params
  
  const loja = await db.loja.findUnique({
    where: { slug },
    include: {
      _count: {
        select: { ordens: true, clientes: true }
      }
    }
  })

  if (!loja || loja.status === 'bloqueada') {
    notFound()
  }

  // Buscar avaliações da loja
  const avaliacoes = await db.avaliacao.findMany({
    where: { 
      lojaId: loja.id,
      aprovado: true 
    },
    orderBy: { criadoEm: 'desc' },
    take: 10,
    select: {
      id: true,
      nota: true,
      comentario: true,
      resposta: true,
      dataResposta: true,
      criadoEm: true
    }
  })

  // Calcular média das avaliações
  const mediaAvaliacoes = avaliacoes.length > 0
    ? avaliacoes.reduce((acc, av) => acc + av.nota, 0) / avaliacoes.length
    : 0

  return <LojaPageClient loja={loja} avaliacoes={avaliacoes} mediaAvaliacoes={mediaAvaliacoes} />
}
