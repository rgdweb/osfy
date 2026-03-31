import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Buscar OS #22
  const os = await prisma.ordemServico.findFirst({
    where: { numeroOs: 22 },
    select: { 
      id: true, 
      numeroOs: true,
      pago: true,
      linkPagamento: true,
      mercadoPagoPreferenceId: true
    }
  })
  
  if (!os) {
    console.log('OS #22 não encontrada!')
    return
  }
  
  console.log('OS encontrada:', os)
  
  // Resetar pagamento
  const updated = await prisma.ordemServico.update({
    where: { id: os.id },
    data: {
      mercadoPagoPaymentId: null,
      mercadoPagoPreferenceId: null,
      linkPagamento: null,
      pixQrCode: null,
      pixCopiaCola: null,
      ticketUrl: null,
      asaasPaymentId: null,
      boletoUrl: null,
      boletoLinhaDigitavel: null,
      pago: false,
      dataPagamento: null,
      atualizadoEm: new Date()
    }
  })
  
  console.log('✅ Pagamento resetado com sucesso!')
  console.log('ID da OS:', os.id)
  console.log('Agora acesse a página pública e gere um novo link de pagamento')
}

main().catch(console.error).finally(() => prisma.$disconnect())
