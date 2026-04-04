import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * CRON JOB: Enviar pesquisa de satisfação via WhatsApp
 * 
 * Envia automaticamente 3 dias após a OS ser finalizada (status "entregue")
 * 
 * Configurar para rodar diariamente às 10:00
 * URL: /api/cron/pesquisa-satisfacao?secret=SEU_CRON_SECRET
 * 
 * Usa WhatsApp Cloud API (Meta Business)
 * Até 1000 conversas/mês GRATUITAS
 */
export async function GET(request: NextRequest) {
  try {
    // Validar segredo
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    // Também aceita header Authorization (padrão Vercel)
    const authHeader = request.headers.get('Authorization')
    const isValidHeader = authHeader === `Bearer ${process.env.CRON_SECRET}`
    const isValidUrl = secret === process.env.CRON_SECRET
    
    if (process.env.CRON_SECRET && !isValidHeader && !isValidUrl) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar se WhatsApp está configurado
    const whatsappToken = process.env.WHATSAPP_TOKEN
    const whatsappPhoneId = process.env.WHATSAPP_PHONE_ID

    if (!whatsappToken || !whatsappPhoneId) {
      return NextResponse.json({
        success: true,
        mensagem: 'WhatsApp não configurado',
        pesquisasEnviadas: 0,
        instrucoes: [
          'Configure WHATSAPP_TOKEN e WHATSAPP_PHONE_ID no Meta Business',
          '1. Acesse: https://business.facebook.com',
          '2. Vá em Configurações → WhatsApp → API Setup',
          '3. Copie o Phone Number ID e Access Token'
        ]
      })
    }

    console.log('[Pesquisa Satisfação] Iniciando...', new Date().toISOString())

    const resultados = {
      pesquisasEnviadas: 0,
      semTelefone: 0,
      jaEnviada: 0,
      erroEnvio: 0,
      erros: [] as string[]
    }

    const hoje = new Date()
    
    // Buscar OS finalizadas há 3 dias que ainda não receberam pesquisa
    const dataAlvo = new Date(hoje)
    dataAlvo.setDate(dataAlvo.getDate() - 3)
    dataAlvo.setHours(0, 0, 0, 0)
    
    const dataLimite = new Date(dataAlvo)
    dataLimite.setHours(23, 59, 59, 999)

    // Buscar OS entregues/finalizadas há 3 dias sem pesquisa enviada
    const osFinalizadas = await db.ordemServico.findMany({
      where: {
        status: 'entregue',
        pesquisaEnviada: false,
        dataFinalizacao: {
          gte: dataAlvo,
          lte: dataLimite
        }
      },
      include: {
        cliente: true,
        loja: true
      }
    })

    console.log(`[Pesquisa Satisfação] ${osFinalizadas.length} OS encontradas para enviar pesquisa`)

    for (const os of osFinalizadas) {
      try {
        // Verificar se tem telefone
        if (!os.cliente.telefone) {
          resultados.semTelefone++
          continue
        }

        // Verificar se já foi avaliada (tem registro na tabela Avaliacao)
        const avaliacaoExistente = await db.avaliacao.findUnique({
          where: { osId: os.id }
        })
        
        if (avaliacaoExistente) {
          // Já avaliou, marcar como enviado
          await db.ordemServico.update({
            where: { id: os.id },
            data: {
              pesquisaEnviada: true,
              dataPesquisaEnviada: hoje
            }
          })
          resultados.jaEnviada++
          continue
        }

        // Formatar telefone
        let telefone = os.cliente.telefone.replace(/\D/g, '')
        if (telefone.length <= 11) {
          telefone = '55' + telefone
        }

        // Link para avaliação
        const linkAvaliacao = `https://tec-os.vercel.app/os/${os.id}`

        // Enviar WhatsApp
        const enviado = await enviarPesquisaWhatsApp(
          whatsappPhoneId,
          whatsappToken,
          telefone,
          {
            nomeCliente: os.cliente.nome.split(' ')[0] || 'Cliente',
            nomeLoja: os.loja.nome,
            numeroOs: os.numeroOs.toString(),
            linkAvaliacao
          }
        )

        if (enviado.success) {
          // Marcar como enviado
          await db.ordemServico.update({
            where: { id: os.id },
            data: {
              pesquisaEnviada: true,
              dataPesquisaEnviada: hoje
            }
          })
          
          resultados.pesquisasEnviadas++
          console.log(`[Pesquisa Satisfação] Enviado: OS #${os.numeroOs} - ${os.cliente.nome}`)
        } else {
          resultados.erroEnvio++
          resultados.erros.push(`Erro OS #${os.numeroOs}: ${enviado.error}`)
        }

        // Aguardar 2 segundos entre envios
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error) {
        const errorMsg = `Erro OS ${os.id}: ${error}`
        console.error(errorMsg)
        resultados.erros.push(errorMsg)
      }
    }

    console.log('[Pesquisa Satisfação] Concluído:', resultados)

    return NextResponse.json({
      success: true,
      processadoEm: new Date().toISOString(),
      resultados
    })

  } catch (error) {
    console.error('[Pesquisa Satisfação] Erro fatal:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao enviar pesquisas',
        detalhes: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * Enviar pesquisa de satisfação via WhatsApp Cloud API
 */
async function enviarPesquisaWhatsApp(
  phoneId: string,
  token: string,
  telefone: string,
  dados: {
    nomeCliente: string
    nomeLoja: string
    numeroOs: string
    linkAvaliacao: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`
    
    // Usar template hello_world (padrão do Meta)
    // Para mensagens personalizadas, crie um template no Meta Business
    const body = {
      messaging_product: 'whatsapp',
      to: telefone,
      type: 'template',
      template: {
        name: 'hello_world',
        language: {
          code: 'pt_BR'
        }
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const responseData = await response.json()

    if (!response.ok) {
      return { 
        success: false, 
        error: JSON.stringify(responseData) 
      }
    }

    return { success: true }

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }
  }
}
