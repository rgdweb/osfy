import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Função para inicializar o banco de dados automaticamente
let isInitialized = false
let initError: string | null = null

export async function ensureDatabaseInitialized() {
  if (isInitialized) return
  
  try {
    console.log('[DB] Verificando inicialização do banco...')
    
    // Verificar conexão com o banco
    await db.$queryRaw`SELECT 1`
    console.log('[DB] Conexão com banco OK')
    
    // Verificar se existe pelo menos um SuperAdmin
    const adminCount = await db.superAdmin.count()
    
    if (adminCount === 0) {
      console.log('[DB] Banco vazio, criando dados iniciais...')
      
      // Criar SuperAdmin padrão
      const senhaHash = await hash('admin123', 12)
      await db.superAdmin.create({
        data: {
          nome: 'Administrador',
          email: 'admin@tecos.com',
          senhaHash
        }
      })
      console.log('[DB] SuperAdmin criado: admin@tecos.com')
      
      // Criar loja de teste
      const lojaExists = await db.loja.findUnique({
        where: { email: 'teste@techcell.com' }
      })
      
      if (!lojaExists) {
        await db.loja.create({
          data: {
            nome: 'TechCell Teste',
            slug: 'techcell-teste',
            responsavel: 'João Silva',
            telefone: '11999999999',
            whatsapp: '11999999999',
            email: 'teste@techcell.com',
            senhaHash,
            cidade: 'São Paulo',
            estado: 'SP',
            endereco: 'Rua Teste, 123',
            status: 'ativa'
          }
        })
        console.log('[DB] Loja teste criada: teste@techcell.com')
      }
      
      console.log('[DB] Inicialização concluída!')
    } else {
      console.log('[DB] Banco já inicializado')
    }
    
    isInitialized = true
    initError = null
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    initError = errorMsg
    console.error('[DB] Erro na inicialização:', errorMsg)
    
    // Verificar tipo de erro e dar mensagem útil
    if (errorMsg.includes('P1001') || errorMsg.includes('can\'t reach')) {
      console.error('[DB] ERRO: Banco de dados inacessível. Verifique se o Neon está ativo e DATABASE_URL está correto.')
    } else if (errorMsg.includes('P3009') || errorMsg.includes('migration')) {
      console.error('[DB] ERRO: Tabelas não existem. Rode: npx prisma db push')
    } else if (errorMsg.includes('P1003') || errorMsg.includes('does not exist')) {
      console.error('[DB] ERRO: Banco/tabela não existe. Verifique DATABASE_URL e rode: npx prisma db push')
    }
    
    // Re-throw para que o chamador saiba que falhou
    throw new Error(`Falha na conexão com o banco: ${errorMsg}`)
  }
}

export function getInitError() {
  return initError
}

export function isDbInitialized() {
  return isInitialized
}
