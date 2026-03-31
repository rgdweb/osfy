import { useEffect, useRef, useCallback } from 'react'

interface UsePollingOptions {
  /** Intervalo em milissegundos (padrão: 30000 = 30 segundos) */
  interval?: number
  /** Se o polling deve estar ativo (padrão: true) */
  enabled?: boolean
  /** Callback executado a cada intervalo */
  onPoll: () => void | Promise<void>
  /** Executar imediatamente ao montar? (padrão: false) */
  immediate?: boolean
}

/**
 * Hook para atualização periódica de dados
 * 
 * @example
 * usePolling({
 *   interval: 30000, // 30 segundos
 *   onPoll: () => refetch(),
 *   enabled: true
 * })
 */
export function usePolling({
  interval = 30000,
  enabled = true,
  onPoll,
  immediate = false,
}: UsePollingOptions) {
  const savedCallback = useRef(onPoll)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Manter callback atualizado
  useEffect(() => {
    savedCallback.current = onPoll
  }, [onPoll])

  // Iniciar/parar baseado no enabled e pausar quando aba não visível
  useEffect(() => {
    const start = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      
      intervalRef.current = setInterval(() => {
        savedCallback.current()
      }, interval)
    }

    const stop = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop()
      } else if (enabled) {
        start()
        // Atualizar dados quando voltar para a aba
        savedCallback.current()
      }
    }

    if (enabled) {
      if (immediate) {
        savedCallback.current()
      }
      start()
    } else {
      stop()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, interval, immediate])
}

/**
 * Intervalos predefinidos
 */
export const POLLING_INTERVALS = {
  FAST: 10000,      // 10 segundos - para dados críticos
  NORMAL: 30000,    // 30 segundos - padrão
  SLOW: 60000,      // 1 minuto - dados menos críticos
  VERY_SLOW: 300000 // 5 minutos - dados estáticos
}

// Exportar com nome alternativo para compatibilidade
export const POLLING_INTERVAL = POLLING_INTERVALS
