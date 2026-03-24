import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { db } from '@/lib/db'

// Função para gerar código de acesso único (6 caracteres alfanuméricos)
function gerarCodigoAcesso(): string {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let codigo = ''
  for (let i = 0; i < 6; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length))
  }
  return codigo
}

// Função para gerar código único garantindo que não existe no banco
async function gerarCodigoAcessoUnico(): Promise<string> {
  let codigo = gerarCodigoAcesso()
  let tentativas = 0
  
  while (tentativas < 10) {
    const existente = await db.ordemServico.findUnique({
      where: { codigoAcesso: codigo }
    })
    
    if (!existente) {
      return codigo
    }
    
    codigo = gerarCodigoAcesso()
    tentativas++
  }
  
  // Fallback: usar timestamp se não conseguir gerar único
  return Date.now().toString(36).toUpperCase().slice(-6)
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || !user.lojaId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const busca = searchParams.get('busca')

    // Construir filtros
    const where: Record<string, unknown> = {
      lojaId: user.lojaId
    }

    if (status && status !== 'todos') {
      where.status = status
    }

    if (busca) {
      where.OR = [
        { cliente: { nome: { contains: busca } } },
        { cliente: { telefone: { contains: busca } } },
        { equipamento: { contains: busca } },
        { numeroOs: isNaN(parseInt(busca)) ? undefined : parseInt(busca) }
      ].filter(Boolean)
    }

    const ordens = await db.ordemServico.findMany({
      where,
      include: {
        cliente: true,
        tecnico: {
          select: { id: true, nome: true }
        },
        fotos: {
          select: { id: true, arquivo: true },
          take: 1
        },
        _count: {
          select: { fotos: true, historico: true }
        }
      },
      orderBy: { dataCriacao: 'desc' }
    })

    return NextResponse.json({
      success: true,
      ordens
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar ordens de serviço' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || !user.lojaId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      clienteNome,
      clienteTelefone,
      clienteEmail,
      clienteCpf,
      clienteEndereco,
      equipamento,
      marca,
      modelo,
      imeiSerial,
      senhaAparelho,
      problema,
      acessorios,
      estadoAparelho,
      dataPrevisao
    } = body

    // Validações
    if (!clienteNome || !clienteTelefone || !equipamento || !problema) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios não preenchidos' },
        { status: 400 }
      )
    }

    // Buscar ou criar cliente
    let cliente = await db.cliente.findFirst({
      where: {
        lojaId: user.lojaId,
        telefone: clienteTelefone
      }
    })

    if (!cliente) {
      cliente = await db.cliente.create({
        data: {
          lojaId: user.lojaId,
          nome: clienteNome,
          telefone: clienteTelefone,
          email: clienteEmail || null,
          cpf: clienteCpf || null,
          endereco: clienteEndereco || null
        }
      })
    } else {
      // Atualizar dados do cliente se fornecidos
      const dadosAtualizacao: Record<string, string | null | undefined> = {}
      if (clienteNome && cliente.nome !== clienteNome) {
        dadosAtualizacao.nome = clienteNome
      }
      if (clienteEmail) {
        dadosAtualizacao.email = clienteEmail
      }
      if (clienteCpf) {
        dadosAtualizacao.cpf = clienteCpf
      }
      if (clienteEndereco) {
        dadosAtualizacao.endereco = clienteEndereco
      }
      
      if (Object.keys(dadosAtualizacao).length > 0) {
        await db.cliente.update({
          where: { id: cliente.id },
          data: dadosAtualizacao
        })
      }
    }

    // Incrementar contador de OS
    const contador = await db.contadorOS.upsert({
      where: { lojaId: user.lojaId },
      update: { ultimoNumero: { increment: 1 } },
      create: { lojaId: user.lojaId, ultimoNumero: 1 }
    })

    // Gerar código de acesso único
    const codigoAcesso = await gerarCodigoAcessoUnico()

    // Criar OS
    const os = await db.ordemServico.create({
      data: {
        lojaId: user.lojaId,
        clienteId: cliente.id,
        tecnicoId: user.tipo === 'usuario' ? user.id : null,
        numeroOs: contador.ultimoNumero,
        codigoAcesso,
        equipamento,
        marca: marca || null,
        modelo: modelo || null,
        imeiSerial: imeiSerial || null,
        senhaAparelho: senhaAparelho || null,
        problema,
        acessorios: acessorios || null,
        estadoAparelho: estadoAparelho || null,
        status: 'recebido',
        dataPrevisao: dataPrevisao ? new Date(dataPrevisao) : null
      },
      include: {
        cliente: true
      }
    })

    // Criar histórico inicial
    await db.historicoOS.create({
      data: {
        osId: os.id,
        descricao: 'Ordem de serviço criada',
        status: 'recebido'
      }
    })

    return NextResponse.json({
      success: true,
      os,
      message: `OS #${os.numeroOs} criada com sucesso`
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao criar ordem de serviço' },
      { status: 500 }
    )
  }
}
