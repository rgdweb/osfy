import { db } from './src/lib/db'

async function main() {
  const os = await db.ordemServico.findMany({
    where: { numeroOs: { in: [22, 23] } },
    select: {
      numeroOs: true,
      pago: true,
      mercadoPagoPaymentId: true,
      mercadoPagoPreferenceId: true,
      linkPagamento: true,
      asaasPaymentId: true
    }
  })
  console.log(JSON.stringify(os, null, 2))
  await db.$disconnect()
}

main()
