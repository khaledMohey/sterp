import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.cashAccount.upsert({
    where: { name: "الخزنة الرئيسية" },
    update: {},
    create: { name: "الخزنة الرئيسية", balance: 0 },
  });

  const supplier = await prisma.supplier.create({
    data: { name: "مورد الجملة", phone: "01000000001" },
  });
  const customer = await prisma.customer.create({
    data: { name: "عميل نقدي", phone: "01000000002" },
  });

  const sugar = await prisma.product.create({
    data: { name: "سكر", sku: "SUG-1", unit: "كيس" },
  });
  const oil = await prisma.product.create({
    data: { name: "زيت", sku: "OIL-1", unit: "زجاجة" },
  });

  const purchase = await prisma.purchaseInvoice.create({
    data: {
      number: "P-2026-0001",
      supplierId: supplier.id,
      total: 5500,
      paid: 5500,
      items: {
        create: [
          {
            productId: sugar.id,
            quantity: 100,
            purchasePrice: 40,
            sellPrice: 50,
          },
          {
            productId: oil.id,
            quantity: 50,
            purchasePrice: 30,
            sellPrice: 40,
          },
        ],
      },
    },
    include: { items: true },
  });

  for (const item of purchase.items) {
    await prisma.batch.create({
      data: {
        productId: item.productId,
        quantity: item.quantity,
        remainingQty: item.quantity,
        purchasePrice: item.purchasePrice,
        sellPrice: item.sellPrice,
        purchaseDate: purchase.date,
        purchaseInvoiceItemId: item.id,
      },
    });
  }

  // Second batch with different prices
  const purchase2 = await prisma.purchaseInvoice.create({
    data: {
      number: "P-2026-0002",
      supplierId: supplier.id,
      total: 4500,
      paid: 2000,
      items: {
        create: [
          {
            productId: sugar.id,
            quantity: 100,
            purchasePrice: 45,
            sellPrice: 55,
          },
        ],
      },
    },
    include: { items: true },
  });

  for (const item of purchase2.items) {
    await prisma.batch.create({
      data: {
        productId: item.productId,
        quantity: item.quantity,
        remainingQty: item.quantity,
        purchasePrice: item.purchasePrice,
        sellPrice: item.sellPrice,
        purchaseDate: new Date(Date.now() + 86400000),
        purchaseInvoiceItemId: item.id,
      },
    });
  }

  const cash = await prisma.cashAccount.findFirstOrThrow({
    where: { name: "الخزنة الرئيسية" },
  });
  await prisma.cashTransaction.create({
    data: {
      accountId: cash.id,
      type: "out",
      amount: 7500,
      referenceType: "purchase",
      notes: "دفع مشتريات تجريبية",
    },
  });
  await prisma.cashAccount.update({
    where: { id: cash.id },
    data: { balance: -7500 },
  });

  console.log("Seed OK:", {
    supplier: supplier.name,
    customer: customer.name,
    products: [sugar.name, oil.name],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
