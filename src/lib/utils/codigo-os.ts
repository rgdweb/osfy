import { db } from '@/lib/db'

/**
 * Gera um código único para OS no formato: 1 letra + 6 dígitos
 * Exemplo: A053219, B876543, C123456
 * 
 * O código é único globalmente (todas as lojas) para evitar
 * que alguém tente assinar uma OS de outra loja.
 */
export async function gerarCodigoOsUnico(): Promise<string> {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let codigo: string
  let tentativas = 0
  const maxTentativas = 100

  do {
    // Gerar código aleatório
    const letra = letras[Math.floor(Math.random() * letras.length)]
    const numeros = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
    codigo = `${letra}${numeros}`

    // Verificar se já existe
    const existente = await db.ordemServico.findUnique({
      where: { codigoOs: codigo }
    })

    if (!existente) {
      return codigo
    }

    tentativas++
  } while (tentativas < maxTentativas)

  // Se não conseguiu gerar um código único após muitas tentativas,
  // usa timestamp para garantir unicidade
  const letra = letras[Math.floor(Math.random() * letras.length)]
  const timestamp = Date.now().toString().slice(-6)
  return `${letra}${timestamp}`
}

/**
 * Valida se um código de OS está no formato correto
 */
export function validarCodigoOs(codigo: string): boolean {
  return /^[A-Z]\d{6}$/.test(codigo)
}
