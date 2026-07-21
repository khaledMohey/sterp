import { prisma } from "./prisma";

export function formatMoney(value: number) {
  return new Intl.NumberFormat("ar-EG", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export {
  buildPaymentPlan,
  paymentMethodLabel,
  round2,
  type PaymentMethod,
  type PaymentPlanInput,
  type InstallmentPlanRow,
} from "./payment";

type DbClient = typeof prisma;

export async function nextInvoiceNumber(
  prefix: "P" | "S",
  db: DbClient = prisma
) {
  const year = new Date().getFullYear();
  const start = `${prefix}-${year}-`;

  if (prefix === "P") {
    const last = await db.purchaseInvoice.findFirst({
      where: { number: { startsWith: start } },
      orderBy: { number: "desc" },
    });
    const seq = last ? Number(last.number.split("-").pop()) + 1 : 1;
    return `${start}${String(seq).padStart(4, "0")}`;
  }

  const last = await db.salesInvoice.findFirst({
    where: { number: { startsWith: start } },
    orderBy: { number: "desc" },
  });
  const seq = last ? Number(last.number.split("-").pop()) + 1 : 1;
  return `${start}${String(seq).padStart(4, "0")}`;
}

export type FifoLine = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export async function allocateFifo(
  productId: string,
  quantity: number,
  tx: typeof prisma
) {
  const batches = await tx.batch.findMany({
    where: { productId, remainingQty: { gt: 0 } },
    orderBy: [{ purchaseDate: "asc" }, { createdAt: "asc" }],
  });

  const totalAvailable = batches.reduce((s, b) => s + b.remainingQty, 0);
  if (totalAvailable < quantity) {
    throw new Error(
      `المخزون غير كافٍ. المتاح: ${totalAvailable}، المطلوب: ${quantity}`
    );
  }

  let remaining = quantity;
  const allocations: { batchId: string; quantity: number; costPrice: number }[] =
    [];
  let costTotal = 0;

  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.remainingQty, remaining);
    await tx.batch.update({
      where: { id: batch.id },
      data: { remainingQty: batch.remainingQty - take },
    });
    allocations.push({
      batchId: batch.id,
      quantity: take,
      costPrice: batch.purchasePrice,
    });
    costTotal += take * batch.purchasePrice;
    remaining -= take;
  }

  return { allocations, costTotal };
}
