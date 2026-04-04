import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * CRON JOB: Processar faturas e bloqueio progressivo
 * 
 * Deve ser chamado diariamente (ex: 8h da manhã)
 * 
 * O que faz:
 * 1. Cria faturas para lojas ativas (apenas no banco, NÃO no MP)
 * 2. Atualiza status de faturas vencidas
 * 3. Aplica bloqueio progressivo (3, 5, 7 dias)
 * 
 * Segredo para validar chamada: CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    // Validar segredo - Vercel manda no header Authorization
    const authHeader = request.headers.get('Authorization')
    const urlSecret = new URL(request.url).searchParams.get('secret')
    
    // Aceita tanto header (padrão Vercel) quanto URL (para testes manuais)
    const isValidHeader = authHeader === `Bearer ${process.env.CRON_SECRET}`
    const isValidUrl = urlSecret === process.env.CRON_SECRET
    
    if (process.env.CRON_SECRET && !isValidHeader && !isValidUrl) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    console.log('[CRON] Iniciando processamento de faturas...', new Date().toISOString())

    const resultados = {
      faturasCriadas: 0,
      faturasVencidas: 0,
      lojasBloqueadas: 0,
      lojasAvisadas: 0,
      erros: [] as string[]
    }

    // Buscar configurações
    const config = await db.configuracaoPagamento.findFirst()
    const diaVencimento = config?.diaVencimento || 10
    const valorMensalidade = config?.valorMensalidade || 99.90
    const valorAnuidade = config?.valorAnuidade || 999.00

    // Data atual
    const hoje = new Date()
    const diaAtual = hoje.getDate()
    const mesAtual = hoje.getMonth()
    const anoAtual = hoje.getFullYear()

    // ==========================================
    // 1. CRIAR FATURAS PARA LOJAS ATIVAS
    // ==========================================
    
    // Buscar lojas ativas (não bloqueadas, trial expirado ou usado)
    const lojasAtivas = await db.loja.findMany({
      where: {
        status: 'ativa',
        // Tem trial expirado ou já usou trial
        OR: [
          { trialAte: { lt: hoje } },
          { trialUsado: true }
        ]
      },
      include: {
        faturas: {
          where: { status: 'pendente' },
          orderBy: { dataVencimento: 'desc' },
          take: 1
        }
      }
    })

    console.log(`[CRON] ${lojasAtivas.length} lojas ativas encontradas`)

    // Verificar se é dia de criar fatura (ou depois do dia)
    // E se a loja não tem fatura pendente para este mês
    for (const loja of lojasAtivas) {
      try {
        const faturaPendente = loja.faturas[0]
        
        // Se já tem fatura pendente, pular
        if (faturaPendente) {
          continue
        }

        // Verificar se já existe fatura para este mês
        const faturaEsteMes = await db.fatura.findFirst({
          where: {
            lojaId: loja.id,
            dataVencimento: {
              gte: new Date(anoAtual, mesAtual, 1),
              lt: new Date(anoAtual, mesAtual + 1, 1)
            }
          }
        })

        if (faturaEsteMes) {
          continue
        }

        // Criar fatura para este mês
        // Vencimento: dia definido nas configurações
        let dataVencimento = new Date(anoAtual, mesAtual, diaVencimento)
        
        // Se o dia de vencimento já passou, criar para o próximo mês
        if (diaAtual > diaVencimento) {
          dataVencimento = new Date(anoAtual, mesAtual + 1, diaVencimento)
        }

        // Contar faturas para gerar número
        const totalFaturas = await db.fatura.count({
          where: { lojaId: loja.id }
        })

        const novaFatura = await db.fatura.create({
          data: {
            lojaId: loja.id,
            numeroFatura: totalFaturas + 1,
            // Usar valor do Super Admin conforme plano da loja (mensal ou anual)
            valor: loja.plano === 'anual' ? valorAnuidade : valorMensalidade,
            status: 'pendente',
            dataVencimento,
            referencia: `${hoje.toLocaleString('pt-BR', { month: 'long' })}/${anoAtual}`
          }
        })

        console.log(`[CRON] Fatura criada: Loja ${loja.nome}, R$${novaFatura.valor}, Venc: ${dataVencimento.toLocaleDateString('pt-BR')}`)
        resultados.faturasCriadas++

      } catch (error) {
        const errorMsg = `Erro ao criar fatura para loja ${loja.id}: ${error}`
        console.error(errorMsg)
        resultados.erros.push(errorMsg)
      }
    }

    // ==========================================
    // 2. PROCESSAR FATURAS VENCIDAS
    // ==========================================

    // Buscar faturas vencidas que ainda estão como pendentes
    const faturasVencidas = await db.fatura.findMany({
      where: {
        status: 'pendente',
        dataVencimento: { lt: hoje }
      },
      include: { loja: true }
    })

    console.log(`[CRON] ${faturasVencidas.length} faturas vencidas encontradas`)

    for (const fatura of faturasVencidas) {
      try {
        // Calcular dias de atraso
        const diffTime = hoje.getTime() - new Date(fatura.dataVencimento).getTime()
        const diasAtraso = Math.floor(diffTime / (1000 * 60 * 60 * 24))

        // Atualizar status para vencida
        await db.fatura.update({
          where: { id: fatura.id },
          data: { status: 'vencida' }
        })

        resultados.faturasVencidas++

        // ==========================================
        // 3. BLOQUEIO PROGRESSIVO
        // ==========================================
        
        // 3 dias = Aviso no painel
        if (diasAtraso >= 3 && diasAtraso < 5) {
          // Marcar loja com aviso (mas não bloquear ainda)
          await db.loja.update({
            where: { id: fatura.lojaId },
            data: {
              motivoBloqueio: `Fatura vencida há ${diasAtraso} dias. Regularize para evitar bloqueio.`
            }
          })
          resultados.lojasAvisadas++
        }

        // 5 dias = Trava criação de OS
        if (diasAtraso >= 5 && diasAtraso < 7) {
          await db.loja.update({
            where: { id: fatura.lojaId },
            data: {
              motivoBloqueio: `Bloqueio parcial: Fatura vencida há ${diasAtraso} dias. Não é possível criar novas OS.`
            }
          })
          resultados.lojasAvisadas++
        }

        // 7+ dias = Bloqueio total
        if (diasAtraso >= 7) {
          await db.loja.update({
            where: { id: fatura.lojaId },
            data: {
              bloqueado: true,
              status: 'bloqueada',
              motivoBloqueio: `Bloqueio total: Fatura vencida há ${diasAtraso} dias.`
            }
          })
          resultados.lojasBloqueadas++
          console.log(`[CRON] Loja bloqueada: ${fatura.loja.nome}`)
        }

      } catch (error) {
        const errorMsg = `Erro ao processar fatura ${fatura.id}: ${error}`
        console.error(errorMsg)
        resultados.erros.push(errorMsg)
      }
    }

    // ==========================================
    // RESUMO
    // ==========================================

    console.log('[CRON] Processamento concluído:', resultados)

    return NextResponse.json({
      success: true,
      processadoEm: new Date().toISOString(),
      resultados
    })

  } catch (error) {
    console.error('[CRON] Erro fatal:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao processar faturas',
        detalhes: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
