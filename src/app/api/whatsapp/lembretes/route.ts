import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * CRON JOB: Enviar lembretes via WhatsApp Cloud API (Meta)
 * 
 * GRATUITO: Até 1000 conversas/mês
 * Documentação: https://developers.facebook.com/docs/whatsapp/cloud-api
 * 
 * Variáveis de ambiente necessárias:
 * - WHATSAPP_TOKEN: Token de acesso do Meta Business
 * - WHATSAPP_PHONE_ID: ID do número de telefone Business
 * 
 * Importante: Usa templates aprovados no Meta Business
 * Template inicial: "fatura_pendente" (precisa criar no Meta)
 */
export async function GET(request: NextRequest) {
  try {
    // Validar segredo
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    if (secret !== process.env.CRON_SECRET && process.env.CRON_SECRET) {
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
        mensagem: 'WhatsApp não configurado. Configure WHATSAPP_TOKEN e WHATSAPP_PHONE_ID no Meta Business.',
        lembretesEnviados: 0,
        instrucoes: [
          '1. Acesse: https://business.facebook.com',
          '2. Vá em Configurações → WhatsApp → API Setup',
          '3. Copie o Phone Number ID e Access Token',
          '4. Configure nas variáveis de ambiente'
        ]
      })
    }

    console.log('[WhatsApp Cloud] Iniciando envio de lembretes...', new Date().toISOString())

    const resultados = {
      lembretesEnviados: 0,
      semTelefone: 0,
      erroEnvio: 0,
      jaEnviadoHoje: 0,
      erros: [] as string[]
    }

    const hoje = new Date()

    // Buscar faturas vencidas ou vencendo nos próximos 3 dias
    const dataLimite = new Date(hoje)
    dataLimite.setDate(dataLimite.getDate() + 3)

    const faturas = await db.fatura.findMany({
      where: {
        status: { in: ['pendente', 'vencida'] },
        dataVencimento: { lte: dataLimite }
      },
      include: { loja: true }
    })

    console.log(`[WhatsApp Cloud] ${faturas.length} faturas encontradas`)

    for (const fatura of faturas) {
      try {
        const loja = fatura.loja

        // Verificar se tem WhatsApp
        if (!loja.whatsapp && !loja.telefone) {
          resultados.semTelefone++
          continue
        }

        // Verificar se já enviou lembrete nas últimas 24h
        if (fatura.dataLembrete) {
          const horasDesdeUltimo = (hoje.getTime() - new Date(fatura.dataLembrete).getTime()) / (1000 * 60 * 60)
          if (horasDesdeUltimo < 24) {
            resultados.jaEnviadoHoje++
            continue
          }
        }

        // Formatar telefone (apenas números, com código do Brasil)
        let telefone = (loja.whatsapp || loja.telefone || '').replace(/\D/g, '')
        
        // Adicionar 55 se não tiver
        if (telefone.length <= 11) {
          telefone = '55' + telefone
        }

        // Calcular dias
        const diffTime = new Date(fatura.dataVencimento).getTime() - hoje.getTime()
        const diasDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        const diasAtraso = diasDiff < 0 ? Math.abs(diasDiff) : 0

        // Enviar mensagem via Cloud API
        const enviado = await enviarWhatsAppCloudAPI(
          whatsappPhoneId,
          whatsappToken,
          telefone,
          {
            nomeLoja: loja.nome,
            valor: fatura.valor.toFixed(2).replace('.', ','),
            vencimento: new Date(fatura.dataVencimento).toLocaleDateString('pt-BR'),
            diasAtraso,
            linkPagamento: 'https://tec-os.vercel.app/painel/faturas'
          }
        )

        if (enviado.success) {
          // Atualizar data do último lembrete
          await db.fatura.update({
            where: { id: fatura.id },
            data: { dataLembrete: hoje }
          })

          resultados.lembretesEnviados++
          console.log(`[WhatsApp Cloud] Enviado: ${loja.nome}`)
        } else {
          resultados.erroEnvio++
          resultados.erros.push(`Erro ${loja.nome}: ${enviado.error}`)
        }

        // Aguardar 2 segundos entre envios
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error) {
        const errorMsg = `Erro fatura ${fatura.id}: ${error}`
        console.error(errorMsg)
        resultados.erros.push(errorMsg)
      }
    }

    console.log('[WhatsApp Cloud] Concluído:', resultados)

    return NextResponse.json({
      success: true,
      processadoEm: new Date().toISOString(),
      resultados
    })

  } catch (error) {
    console.error('[WhatsApp Cloud] Erro fatal:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao enviar lembretes',
        detalhes: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * Enviar mensagem via WhatsApp Cloud API
 * 
 * Usa template "hello_world" que já vem aprovado por padrão
 * Para mensagens personalizadas, crie um template no Meta Business
 */
async function enviarWhatsAppCloudAPI(
  phoneId: string,
  token: string,
  telefone: string,
  dados: {
    nomeLoja: string
    valor: string
    vencimento: string
    diasAtraso: number
    linkPagamento: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`
    
    // Usar template "hello_world" que já vem aprovado
    // Para personalizar, crie um template no Meta Business
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

    // Se tiver template personalizado aprovado, use este formato:
    // const body = {
    //   messaging_product: 'whatsapp',
    //   to: telefone,
    //   type: 'template',
    //   template: {
    //     name: 'fatura_pendente', // Nome do seu template aprovado
    //     language: { code: 'pt_BR' },
    //     components: [
    //       {
    //         type: 'body',
    //         parameters: [
    //           { type: 'text', text: dados.nomeLoja },
    //           { type: 'text', text: dados.valor },
    //           { type: 'text', text: dados.vencimento },
    //           { type: 'text', text: dados.diasAtraso.toString() },
    //           { type: 'text', text: dados.linkPagamento }
    //         ]
    //       }
    //     ]
    //   }
    // }

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
