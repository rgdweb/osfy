import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * CRON JOB: Enviar lembretes via WhatsApp
 * 
 * Deve ser chamado 2x ao dia (ex: 9h e 18h)
 * 
 * O que faz:
 * 1. Envia lembrete 3 dias antes do vencimento
 * 2. Envia lembrete diário quando vencida
 * 3. Respeita intervalo de 24h entre mensagens (dataLembrete)
 * 
 * Evolution API:
 * - Documentação: https://doc.evolution-api.com
 * - Endpoint: POST /message/sendText/{instance}
 * 
 * Variáveis de ambiente necessárias:
 * - WHATSAPP_API_URL: URL da Evolution API (ex: http://localhost:8080)
 * - WHATSAPP_API_KEY: API Key da Evolution API
 * - WHATSAPP_INSTANCE: Nome da instância conectada
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
    const whatsappUrl = process.env.WHATSAPP_API_URL
    const whatsappKey = process.env.WHATSAPP_API_KEY
    const whatsappInstance = process.env.WHATSAPP_INSTANCE

    if (!whatsappUrl || !whatsappKey || !whatsappInstance) {
      return NextResponse.json({
        success: true,
        mensagem: 'WhatsApp não configurado. Configure WHATSAPP_API_URL, WHATSAPP_API_KEY e WHATSAPP_INSTANCE.',
        lembretesEnviados: 0
      })
    }

    console.log('[WhatsApp] Iniciando envio de lembretes...', new Date().toISOString())

    const resultados = {
      lembretesEnviados: 0,
      semTelefone: 0,
      erroEnvio: 0,
      jaEnviadoHoje: 0,
      erros: [] as string[]
    }

    const hoje = new Date()

    // ==========================================
    // 1. BUSCAR FATURAS PENDENTES/VENCIDAS
    // ==========================================

    // Faturas vencidas ou vencendo nos próximos 3 dias
    const dataLimite = new Date(hoje)
    dataLimite.setDate(dataLimite.getDate() + 3)

    const faturas = await db.fatura.findMany({
      where: {
        status: { in: ['pendente', 'vencida'] },
        dataVencimento: { lte: dataLimite }
      },
      include: { loja: true }
    })

    console.log(`[WhatsApp] ${faturas.length} faturas encontradas para lembrete`)

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

        // Calcular dias para vencer ou dias de atraso
        const diffTime = new Date(fatura.dataVencimento).getTime() - hoje.getTime()
        const diasDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        let mensagem: string
        let tipoLembrete: string

        if (diasDiff > 0) {
          // Ainda não venceu
          tipoLembrete = 'proximo_vencimento'
          mensagem = `👋 Olá *${loja.nome}*!

📅 Sua fatura vence em *${diasDiff} dia(s)*!

💰 *Valor:* R$ ${fatura.valor.toFixed(2).replace('.', ',')}
📆 *Vencimento:* ${new Date(fatura.dataVencimento).toLocaleDateString('pt-BR')}

🔗 Para pagar, acesse:
https://tec-os.vercel.app/painel/faturas

_Parabéns por manter sua conta em dia!_

💬 *TecOS - Sistema para Assistência Técnica*`
        } else if (diasDiff === 0) {
          // Vence hoje
          tipoLembrete = 'vence_hoje'
          mensagem = `⚠️ *ATENÇÃO ${loja.nome}!*

📅 Sua fatura vence *HOJE*!

💰 *Valor:* R$ ${fatura.valor.toFixed(2).replace('.', ',')}

🔗 Pague agora para evitar bloqueio:
https://tec-os.vercel.app/painel/faturas

💬 *TecOS - Sistema para Assistência Técnica*`
        } else {
          // Já venceu
          const diasAtraso = Math.abs(diasDiff)
          tipoLembrete = 'vencida'
          mensagem = `🚨 *FATURA VENCIDA* 🚨

Olá *${loja.nome}*, sua fatura está vencida há *${diasAtraso} dia(s)*!

💰 *Valor:* R$ ${fatura.valor.toFixed(2).replace('.', ',')}
📅 *Venceu em:* ${new Date(fatura.dataVencimento).toLocaleDateString('pt-BR')}

⚠️ *Atenção:* Após 7 dias de atraso, seu acesso será bloqueado.

🔗 Regularize agora:
https://tec-os.vercel.app/painel/faturas

💬 *TecOS - Sistema para Assistência Técnica*`
        }

        // Formatar telefone (apenas números, com código do Brasil)
        let telefone = (loja.whatsapp || loja.telefone || '').replace(/\D/g, '')
        
        // Adicionar 55 se não tiver
        if (telefone.length <= 11) {
          telefone = '55' + telefone
        }

        // Enviar mensagem via Evolution API
        const enviado = await enviarMensagemWhatsApp(
          whatsappUrl,
          whatsappKey,
          whatsappInstance,
          telefone,
          mensagem
        )

        if (enviado.success) {
          // Atualizar data do último lembrete
          await db.fatura.update({
            where: { id: fatura.id },
            data: { dataLembrete: hoje }
          })

          resultados.lembretesEnviados++
          console.log(`[WhatsApp] Lembrete enviado: ${loja.nome} (${tipoLembrete})`)
        } else {
          resultados.erroEnvio++
          resultados.erros.push(`Erro ao enviar para ${loja.nome}: ${enviado.error}`)
        }

        // Aguardar 2 segundos entre envios para não ser bloqueado
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error) {
        const errorMsg = `Erro ao processar fatura ${fatura.id}: ${error}`
        console.error(errorMsg)
        resultados.erros.push(errorMsg)
      }
    }

    console.log('[WhatsApp] Processamento concluído:', resultados)

    return NextResponse.json({
      success: true,
      processadoEm: new Date().toISOString(),
      resultados
    })

  } catch (error) {
    console.error('[WhatsApp] Erro fatal:', error)
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
 * Enviar mensagem via Evolution API
 */
async function enviarMensagemWhatsApp(
  apiUrl: string,
  apiKey: string,
  instance: string,
  telefone: string,
  mensagem: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${apiUrl}/message/sendText/${instance}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number: telefone,
        options: {
          delay: 1200,
          presence: 'composing'
        },
        textMessage: {
          text: mensagem
        }
      })
    })

    if (!response.ok) {
      const text = await response.text()
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${text.substring(0, 200)}` 
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
