import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { hash, compare } from 'bcryptjs'
import { randomBytes } from 'crypto'

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'tecos-secret-key-super-segura-2024'
)

// Tipos de usuário
export type UserType = 'loja' | 'usuario' | 'superadmin'

export interface AuthUser {
  id: string
  tipo: UserType
  lojaId?: string
  nome: string
  email: string
  sessaoId?: string
}

// Hash de senha
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}

// Verificar senha
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash)
}

// Gerar token de sessão único
export function gerarTokenSessao(): string {
  return randomBytes(32).toString('hex')
}

// Detectar informações do dispositivo
export function detectarDispositivo(userAgent: string | null): string {
  if (!userAgent) return 'Desconhecido'
  
  const ua = userAgent.toLowerCase()
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    if (ua.includes('android')) return 'Android'
    if (ua.includes('iphone')) return 'iPhone'
    return 'Mobile'
  }
  
  if (ua.includes('windows')) return 'Windows'
  if (ua.includes('mac')) return 'Mac'
  if (ua.includes('linux')) return 'Linux'
  
  return 'Desktop'
}

// Gerar token JWT
export async function generateToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    tipo: user.tipo,
    lojaId: user.lojaId,
    nome: user.nome,
    email: user.email,
    sessaoId: user.sessaoId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY)
}

// Verificar token JWT
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)
    return payload as unknown as AuthUser
  } catch {
    return null
  }
}

// Criar sessão no banco
async function criarSessao(
  userId: string, 
  tipo: 'loja' | 'usuario' | 'superadmin',
  tokenSessao: string,
  userAgent: string | null,
  ipAddress: string | null
) {
  const dispositivo = detectarDispositivo(userAgent)
  const dataExpiracao = new Date()
  dataExpiracao.setDate(dataExpiracao.getDate() + 7) // 7 dias
  
  const sessaoData: {
    tokenSessao: string
    userAgent: string | null
    ipAddress: string | null
    dispositivo: string
    ativa: boolean
    dataExpiracao: Date
    lojaId?: string
    usuarioId?: string
    superAdminId?: string
  } = {
    tokenSessao,
    userAgent,
    ipAddress,
    dispositivo,
    ativa: true,
    dataExpiracao
  }
  
  if (tipo === 'loja') {
    sessaoData.lojaId = userId
  } else if (tipo === 'usuario') {
    sessaoData.usuarioId = userId
  } else {
    sessaoData.superAdminId = userId
  }
  
  return db.sessao.create({
    data: sessaoData
  })
}

// Invalidar sessões antigas (opcional - manter apenas as últimas 3)
async function limparSessoesAntigas(
  userId: string, 
  tipo: 'loja' | 'usuario' | 'superadmin'
) {
  const whereClause: {
    lojaId?: string
    usuarioId?: string
    superAdminId?: string
    ativa: boolean
  } = { ativa: true }
  
  if (tipo === 'loja') {
    whereClause.lojaId = userId
  } else if (tipo === 'usuario') {
    whereClause.usuarioId = userId
  } else {
    whereClause.superAdminId = userId
  }
  
  // Buscar sessões ativas
  const sessoes = await db.sessao.findMany({
    where: whereClause,
    orderBy: { ultimoAcesso: 'desc' }
  })
  
  // Se tem mais de 3 sessões, invalidar as antigas
  if (sessoes.length >= 3) {
    const sessoesParaInvalidar = sessoes.slice(2) // Manter apenas as 2 mais recentes
    await db.sessao.updateMany({
      where: {
        id: { in: sessoesParaInvalidar.map(s => s.id) }
      },
      data: { ativa: false }
    })
  }
}

// Contar sessões ativas
export async function contarSessoesAtivas(
  userId: string,
  tipo: 'loja' | 'usuario' | 'superadmin'
): Promise<number> {
  const whereClause: {
    lojaId?: string
    usuarioId?: string
    superAdminId?: string
    ativa: boolean
  } = { ativa: true }
  
  if (tipo === 'loja') {
    whereClause.lojaId = userId
  } else if (tipo === 'usuario') {
    whereClause.usuarioId = userId
  } else {
    whereClause.superAdminId = userId
  }
  
  return db.sessao.count({ where: whereClause })
}

// Login de loja
export async function loginLoja(
  email: string, 
  senha: string,
  userAgent?: string | null,
  ipAddress?: string | null
): Promise<{ success: boolean; token?: string; error?: string; sessoesAtivas?: number }> {
  console.log('[AUTH-LOJA] Buscando loja com email:', email)
  
  const loja = await db.loja.findUnique({
    where: { email }
  })

  console.log('[AUTH-LOJA] Loja encontrada:', loja ? `${loja.email} (${loja.status})` : 'NENHUMA')

  if (!loja) {
    return { success: false, error: 'Email não encontrado' }
  }

  if (loja.status === 'pendente') {
    return { success: false, error: 'Sua loja ainda não foi ativada. Aguarde a aprovação.' }
  }

  // Loja bloqueada pode logar, mas verá apenas faturas
  const lojaBloqueada = loja.status === 'bloqueada' || loja.bloqueado

  const senhaValida = await verifyPassword(senha, loja.senhaHash)
  if (!senhaValida) {
    return { success: false, error: 'Senha incorreta' }
  }

  // Criar sessão
  const tokenSessao = gerarTokenSessao()
  await criarSessao(loja.id, 'loja', tokenSessao, userAgent || null, ipAddress || null)
  
  // Limpar sessões antigas
  await limparSessoesAntigas(loja.id, 'loja')
  
  // Contar sessões ativas
  const sessoesAtivas = await contarSessoesAtivas(loja.id, 'loja')

  const token = await generateToken({
    id: loja.id,
    tipo: 'loja',
    lojaId: loja.id,
    nome: loja.responsavel,
    email: loja.email,
    sessaoId: tokenSessao
  })

  return { success: true, token, bloqueada: lojaBloqueada, sessoesAtivas }
}

// Login de usuário (técnico)
export async function loginUsuario(
  email: string, 
  senha: string, 
  lojaSlug: string,
  userAgent?: string | null,
  ipAddress?: string | null
): Promise<{ success: boolean; token?: string; error?: string; sessoesAtivas?: number }> {
  const loja = await db.loja.findUnique({
    where: { slug: lojaSlug }
  })

  if (!loja) {
    return { success: false, error: 'Loja não encontrada' }
  }

  const usuario = await db.usuario.findFirst({
    where: { email, lojaId: loja.id }
  })

  if (!usuario) {
    return { success: false, error: 'Email não encontrado' }
  }

  if (!usuario.ativo) {
    return { success: false, error: 'Usuário inativo' }
  }

  const senhaValida = await verifyPassword(senha, usuario.senhaHash)
  if (!senhaValida) {
    return { success: false, error: 'Senha incorreta' }
  }

  // Criar sessão
  const tokenSessao = gerarTokenSessao()
  await criarSessao(usuario.id, 'usuario', tokenSessao, userAgent || null, ipAddress || null)
  
  // Limpar sessões antigas
  await limparSessoesAntigas(usuario.id, 'usuario')
  
  // Contar sessões ativas
  const sessoesAtivas = await contarSessoesAtivas(usuario.id, 'usuario')

  const token = await generateToken({
    id: usuario.id,
    tipo: 'usuario',
    lojaId: loja.id,
    nome: usuario.nome,
    email: usuario.email,
    sessaoId: tokenSessao
  })

  return { success: true, token, sessoesAtivas }
}

// Login de super admin
export async function loginSuperAdmin(
  email: string, 
  senha: string,
  userAgent?: string | null,
  ipAddress?: string | null
): Promise<{ success: boolean; token?: string; error?: string; sessoesAtivas?: number }> {
  console.log('[AUTH-SUPERADMIN] Buscando admin com email:', email)
  
  const admin = await db.superAdmin.findUnique({
    where: { email }
  })

  console.log('[AUTH-SUPERADMIN] Admin encontrado:', admin ? admin.email : 'NENHUM')

  if (!admin) {
    return { success: false, error: 'Email não encontrado' }
  }

  const senhaValida = await verifyPassword(senha, admin.senhaHash)
  if (!senhaValida) {
    return { success: false, error: 'Senha incorreta' }
  }

  // Criar sessão
  const tokenSessao = gerarTokenSessao()
  await criarSessao(admin.id, 'superadmin', tokenSessao, userAgent || null, ipAddress || null)
  
  // Limpar sessões antigas
  await limparSessoesAntigas(admin.id, 'superadmin')
  
  // Contar sessões ativas
  const sessoesAtivas = await contarSessoesAtivas(admin.id, 'superadmin')

  const token = await generateToken({
    id: admin.id,
    tipo: 'superadmin',
    nome: admin.nome,
    email: admin.email,
    sessaoId: tokenSessao
  })

  return { success: true, token, sessoesAtivas }
}

// Obter usuário atual
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('tecos-token')?.value

    if (!token) {
      return null
    }

    const user = await verifyToken(token)
    
    // Verificar se a sessão ainda está ativa
    if (user?.sessaoId) {
      const sessao = await db.sessao.findUnique({
        where: { tokenSessao: user.sessaoId }
      })
      
      if (!sessao || !sessao.ativa || sessao.dataExpiracao < new Date()) {
        return null
      }
      
      // Atualizar último acesso
      await db.sessao.update({
        where: { tokenSessao: user.sessaoId },
        data: { ultimoAcesso: new Date() }
      })
    }
    
    return user
  } catch {
    return null
  }
}

// Listar sessões ativas de um usuário
export async function listarSessoesAtivas(
  userId: string,
  tipo: 'loja' | 'usuario' | 'superadmin'
) {
  const whereClause: {
    lojaId?: string
    usuarioId?: string
    superAdminId?: string
    ativa: boolean
  } = { ativa: true }
  
  if (tipo === 'loja') {
    whereClause.lojaId = userId
  } else if (tipo === 'usuario') {
    whereClause.usuarioId = userId
  } else {
    whereClause.superAdminId = userId
  }
  
  return db.sessao.findMany({
    where: whereClause,
    orderBy: { ultimoAcesso: 'desc' }
  })
}

// Invalidar uma sessão específica
export async function invalidarSessao(sessaoId: string, userId: string, tipo: 'loja' | 'usuario' | 'superadmin'): Promise<boolean> {
  const sessao = await db.sessao.findUnique({
    where: { id: sessaoId }
  })
  
  if (!sessao) return false
  
  // Verificar se a sessão pertence ao usuário
  if (tipo === 'loja' && sessao.lojaId !== userId) return false
  if (tipo === 'usuario' && sessao.usuarioId !== userId) return false
  if (tipo === 'superadmin' && sessao.superAdminId !== userId) return false
  
  await db.sessao.update({
    where: { id: sessaoId },
    data: { ativa: false }
  })
  
  return true
}

// Invalidar todas as outras sessões (manter apenas a atual)
export async function invalidarOutrasSessoes(
  sessaoAtualId: string,
  userId: string,
  tipo: 'loja' | 'usuario' | 'superadmin'
): Promise<number> {
  const whereClause: {
    lojaId?: string
    usuarioId?: string
    superAdminId?: string
    ativa: boolean
    id?: { not: string }
  } = { 
    ativa: true,
    id: { not: sessaoAtualId }
  }
  
  if (tipo === 'loja') {
    whereClause.lojaId = userId
  } else if (tipo === 'usuario') {
    whereClause.usuarioId = userId
  } else {
    whereClause.superAdminId = userId
  }
  
  const result = await db.sessao.updateMany({
    where: whereClause,
    data: { ativa: false }
  })
  
  return result.count
}

// Gerar slug único
export function generateSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 50)
}

// Verificar se slug existe
export async function slugExists(slug: string): Promise<boolean> {
  const loja = await db.loja.findUnique({
    where: { slug }
  })
  return !!loja
}

// Gerar slug único
export async function generateUniqueSlug(nome: string): Promise<string> {
  let slug = generateSlug(nome)
  let contador = 1

  while (await slugExists(slug)) {
    slug = `${generateSlug(nome)}-${contador}`
    contador++
  }

  return slug
}
