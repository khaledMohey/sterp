"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import {
  allocateFifo,
  buildPaymentPlan,
  nextInvoiceNumber,
  type PaymentMethod,
} from "./utils";

async function ensureDefaultCashAccount() {
  const existing = await prisma.cashAccount.findFirst({
    where: { name: "الخزنة الرئيسية" },
  });
  if (existing) return existing;
  return prisma.cashAccount.create({
    data: { name: "الخزنة الرئيسية", balance: 0 },
  });
}

async function recordCash(
  type: "in" | "out",
  amount: number,
  referenceType: string,
  referenceId: string,
  notes?: string
) {
  if (amount <= 0) return;
  const account = await ensureDefaultCashAccount();
  await prisma.$transaction(async (tx) => {
    const current = await tx.cashAccount.findUniqueOrThrow({
      where: { id: account.id },
    });
    await tx.cashTransaction.create({
      data: {
        accountId: account.id,
        type,
        amount,
        referenceType,
        referenceId,
        notes,
      },
    });
    await tx.cashAccount.update({
      where: { id: account.id },
      data: {
        balance:
          type === "in" ? current.balance + amount : current.balance - amount,
      },
    });
  });
}

// ─── Products ───────────────────────────────────────────────

export async function getProducts() {
  const products = await prisma.product.findMany({
    include: {
      batches: {
        where: { remainingQty: { gt: 0 } },
        orderBy: { purchaseDate: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return products.map((p) => {
    const qty = p.batches.reduce((s, b) => s + b.remainingQty, 0);
    const value = p.batches.reduce(
      (s, b) => s + b.remainingQty * b.purchasePrice,
      0
    );
    return { ...p, stockQty: qty, stockValue: value };
  });
}

export async function createProduct(data: {
  name: string;
  sku?: string;
  unit?: string;
}) {
  const product = await prisma.product.create({
    data: {
      name: data.name.trim(),
      sku: data.sku?.trim() || null,
      unit: data.unit?.trim() || "قطعة",
    },
  });
  revalidatePath("/inventory");
  revalidatePath("/");
  return product;
}

// ─── Customers ──────────────────────────────────────────────

export async function getCustomers() {
  return prisma.customer.findMany({
    include: { _count: { select: { salesInvoices: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createCustomer(data: {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}) {
  const customer = await prisma.customer.create({
    data: {
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  });
  revalidatePath("/customers");
  revalidatePath("/sales");
  return customer;
}

export async function updateCustomer(
  id: string,
  data: { name: string; phone?: string; address?: string; notes?: string }
) {
  await prisma.customer.update({
    where: { id },
    data: {
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  });
  revalidatePath("/customers");
}

export async function deleteCustomer(id: string) {
  const count = await prisma.salesInvoice.count({ where: { customerId: id } });
  if (count > 0) throw new Error("لا يمكن حذف عميل لديه فواتير");
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/customers");
}

// ─── Suppliers ──────────────────────────────────────────────

export async function getSuppliers() {
  return prisma.supplier.findMany({
    include: { _count: { select: { purchaseInvoices: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createSupplier(data: {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}) {
  const supplier = await prisma.supplier.create({
    data: {
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  });
  revalidatePath("/suppliers");
  revalidatePath("/purchases");
  return supplier;
}

export async function updateSupplier(
  id: string,
  data: { name: string; phone?: string; address?: string; notes?: string }
) {
  await prisma.supplier.update({
    where: { id },
    data: {
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  });
  revalidatePath("/suppliers");
}

export async function deleteSupplier(id: string) {
  const count = await prisma.purchaseInvoice.count({ where: { supplierId: id } });
  if (count > 0) throw new Error("لا يمكن حذف مورد لديه فواتير");
  await prisma.supplier.delete({ where: { id } });
  revalidatePath("/suppliers");
}

// ─── Purchases ──────────────────────────────────────────────

export async function getPurchaseInvoices() {
  return prisma.purchaseInvoice.findMany({
    include: {
      supplier: { select: { id: true, name: true, phone: true } },
      items: { select: { id: true } },
    },
    orderBy: { date: "desc" },
    take: 100,
  });
}

export async function getPurchaseInvoice(id: string) {
  return prisma.purchaseInvoice.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: { include: { product: true, batch: true } },
      installments: { orderBy: { sequence: "asc" } },
    },
  });
}

export async function createPurchaseInvoice(input: {
  supplierId?: string;
  newSupplier?: { name: string; phone?: string };
  date?: string;
  notes?: string;
  payment: {
    method: PaymentMethod;
    cashPaid?: number;
    interestRate?: number;
    installmentCount?: number;
    downPayment?: number;
  };
  items: {
    productId?: string;
    newProductName?: string;
    quantity: number;
    purchasePrice: number;
    sellPrice: number;
  }[];
}) {
  if (!input.items.length) throw new Error("أضف أصناف للفواتير");

  const invoice = await prisma.$transaction(async (tx) => {
    let supplierId = input.supplierId;
    if (!supplierId && input.newSupplier?.name) {
      const s = await tx.supplier.create({
        data: {
          name: input.newSupplier.name.trim(),
          phone: input.newSupplier.phone?.trim() || null,
        },
      });
      supplierId = s.id;
    }
    if (!supplierId) throw new Error("اختر أو أدخل مورد");

    let subtotal = 0;
    const resolvedItems: {
      productId: string;
      quantity: number;
      purchasePrice: number;
      sellPrice: number;
    }[] = [];

    for (const item of input.items) {
      let productId = item.productId;
      if (!productId && item.newProductName) {
        const p = await tx.product.create({
          data: { name: item.newProductName.trim() },
        });
        productId = p.id;
      }
      if (!productId) throw new Error("كل صنف يحتاج منتج");
      if (item.quantity <= 0) throw new Error("الكمية يجب أن تكون أكبر من صفر");
      subtotal += item.quantity * item.purchasePrice;
      resolvedItems.push({
        productId,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        sellPrice: item.sellPrice,
      });
    }

    const plan = buildPaymentPlan({
      method: input.payment.method,
      subtotal,
      interestRate: input.payment.interestRate,
      installmentCount: input.payment.installmentCount,
      downPayment: input.payment.downPayment,
      cashPaid: input.payment.cashPaid,
      startDate: input.date ? new Date(input.date) : new Date(),
    });

    const number = await nextInvoiceNumber("P", tx as unknown as typeof prisma);
    const inv = await tx.purchaseInvoice.create({
      data: {
        number,
        supplierId,
        date: input.date ? new Date(input.date) : new Date(),
        paymentMethod: plan.paymentMethod,
        subtotal: plan.subtotal,
        interestRate: plan.interestRate,
        interestAmount: plan.interestAmount,
        downPayment: plan.downPayment,
        installmentCount: plan.installmentCount,
        total: plan.total,
        paid: plan.paid,
        notes: input.notes || null,
        items: {
          create: resolvedItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            purchasePrice: i.purchasePrice,
            sellPrice: i.sellPrice,
          })),
        },
        installments: {
          create: plan.installments.map((row) => ({
            sequence: row.sequence,
            dueDate: row.dueDate,
            amount: row.amount,
            status: "pending",
          })),
        },
      },
      include: { items: true },
    });

    for (const line of inv.items) {
      await tx.batch.create({
        data: {
          productId: line.productId,
          quantity: line.quantity,
          remainingQty: line.quantity,
          purchasePrice: line.purchasePrice,
          sellPrice: line.sellPrice,
          purchaseDate: inv.date,
          purchaseInvoiceItemId: line.id,
        },
      });
    }

    return inv;
  });

  if (invoice.paid > 0) {
    await recordCash(
      "out",
      invoice.paid,
      "purchase",
      invoice.id,
      invoice.paymentMethod === "installment"
        ? `دفعة مقدمة شراء ${invoice.number}`
        : `دفع فاتورة شراء ${invoice.number}`
    );
  }

  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/cash");
  revalidatePath("/reports");
  revalidatePath("/suppliers");
  revalidatePath("/");
  return invoice;
}

// ─── Sales ──────────────────────────────────────────────────

export async function getSalesInvoices() {
  return prisma.salesInvoice.findMany({
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      items: { select: { id: true } },
    },
    orderBy: { date: "desc" },
    take: 100,
  });
}

export async function getSalesInvoice(id: string) {
  return prisma.salesInvoice.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
          allocations: { include: { batch: true } },
        },
      },
      installments: { orderBy: { sequence: "asc" } },
    },
  });
}

export async function createSalesInvoice(input: {
  customerId?: string;
  newCustomer?: { name: string; phone?: string };
  date?: string;
  notes?: string;
  payment: {
    method: PaymentMethod;
    cashPaid?: number;
    interestRate?: number;
    installmentCount?: number;
    downPayment?: number;
  };
  items: { productId: string; quantity: number; unitPrice: number }[];
}) {
  if (!input.items.length) throw new Error("أضف أصناف للفواتير");

  const invoice = await prisma.$transaction(async (tx) => {
    let customerId = input.customerId;
    if (!customerId && input.newCustomer?.name) {
      const c = await tx.customer.create({
        data: {
          name: input.newCustomer.name.trim(),
          phone: input.newCustomer.phone?.trim() || null,
        },
      });
      customerId = c.id;
    }
    if (!customerId) throw new Error("اختر أو أدخل عميل");

    let subtotal = 0;
    let costTotal = 0;
    const lines: {
      productId: string;
      quantity: number;
      unitPrice: number;
      costTotal: number;
      allocations: { batchId: string; quantity: number; costPrice: number }[];
    }[] = [];

    for (const item of input.items) {
      if (item.quantity <= 0) throw new Error("الكمية يجب أن تكون أكبر من صفر");
      const { allocations, costTotal: lineCost } = await allocateFifo(
        item.productId,
        item.quantity,
        tx as unknown as typeof prisma
      );
      subtotal += item.quantity * item.unitPrice;
      costTotal += lineCost;
      lines.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costTotal: lineCost,
        allocations,
      });
    }

    const plan = buildPaymentPlan({
      method: input.payment.method,
      subtotal,
      interestRate: input.payment.interestRate,
      installmentCount: input.payment.installmentCount,
      downPayment: input.payment.downPayment,
      cashPaid: input.payment.cashPaid,
      startDate: input.date ? new Date(input.date) : new Date(),
    });

    const number = await nextInvoiceNumber("S", tx as unknown as typeof prisma);
    const inv = await tx.salesInvoice.create({
      data: {
        number,
        customerId,
        date: input.date ? new Date(input.date) : new Date(),
        paymentMethod: plan.paymentMethod,
        subtotal: plan.subtotal,
        interestRate: plan.interestRate,
        interestAmount: plan.interestAmount,
        downPayment: plan.downPayment,
        installmentCount: plan.installmentCount,
        total: plan.total,
        costTotal,
        paid: plan.paid,
        notes: input.notes || null,
        installments: {
          create: plan.installments.map((row) => ({
            sequence: row.sequence,
            dueDate: row.dueDate,
            amount: row.amount,
            status: "pending",
          })),
        },
      },
    });

    for (const line of lines) {
      const salesItem = await tx.salesInvoiceItem.create({
        data: {
          invoiceId: inv.id,
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          costTotal: line.costTotal,
        },
      });
      for (const a of line.allocations) {
        await tx.salesBatchAllocation.create({
          data: {
            salesItemId: salesItem.id,
            batchId: a.batchId,
            quantity: a.quantity,
            costPrice: a.costPrice,
          },
        });
      }
    }

    return inv;
  });

  if (invoice.paid > 0) {
    await recordCash(
      "in",
      invoice.paid,
      "sales",
      invoice.id,
      invoice.paymentMethod === "installment"
        ? `دفعة مقدمة بيع ${invoice.number}`
        : `تحصيل فاتورة بيع ${invoice.number}`
    );
  }

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/cash");
  revalidatePath("/reports");
  revalidatePath("/customers");
  revalidatePath("/");
  return invoice;
}

export async function payInstallment(
  kind: "purchase" | "sales",
  installmentId: string
) {
  if (kind === "purchase") {
    const inst = await prisma.purchaseInstallment.findUnique({
      where: { id: installmentId },
      include: { invoice: true },
    });
    if (!inst) throw new Error("القسط غير موجود");
    if (inst.status === "paid") throw new Error("القسط مسدد مسبقاً");

    const remaining = inst.amount - inst.paidAmount;
    await prisma.$transaction(async (tx) => {
      await tx.purchaseInstallment.update({
        where: { id: installmentId },
        data: {
          paidAmount: inst.amount,
          status: "paid",
          paidAt: new Date(),
        },
      });
      await tx.purchaseInvoice.update({
        where: { id: inst.invoiceId },
        data: { paid: inst.invoice.paid + remaining },
      });
    });

    await recordCash(
      "out",
      remaining,
      "purchase",
      inst.invoiceId,
      `سداد قسط #${inst.sequence} — شراء ${inst.invoice.number}`
    );

    revalidatePath(`/purchases/${inst.invoiceId}`);
    revalidatePath("/purchases");
    revalidatePath("/cash");
    revalidatePath("/reports");
    revalidatePath("/suppliers");
    revalidatePath(`/suppliers/${inst.invoice.supplierId}/statement`);
    revalidatePath("/");
    return;
  }

  const inst = await prisma.salesInstallment.findUnique({
    where: { id: installmentId },
    include: { invoice: true },
  });
  if (!inst) throw new Error("القسط غير موجود");
  if (inst.status === "paid") throw new Error("القسط مسدد مسبقاً");

  const remaining = inst.amount - inst.paidAmount;
  await prisma.$transaction(async (tx) => {
    await tx.salesInstallment.update({
      where: { id: installmentId },
      data: {
        paidAmount: inst.amount,
        status: "paid",
        paidAt: new Date(),
      },
    });
    await tx.salesInvoice.update({
      where: { id: inst.invoiceId },
      data: { paid: inst.invoice.paid + remaining },
    });
  });

  await recordCash(
    "in",
    remaining,
    "sales",
    inst.invoiceId,
    `تحصيل قسط #${inst.sequence} — بيع ${inst.invoice.number}`
  );

  revalidatePath(`/sales/${inst.invoiceId}`);
  revalidatePath("/sales");
  revalidatePath("/cash");
  revalidatePath("/reports");
  revalidatePath("/customers");
  revalidatePath(`/customers/${inst.invoice.customerId}/statement`);
  revalidatePath("/");
}

/** تحصيل/سداد متبقي على فاتورة كاش (أو أي متبقي بدون قسط محدد) */
export async function recordInvoicePayment(
  kind: "purchase" | "sales",
  invoiceId: string,
  amount: number
) {
  if (amount <= 0) throw new Error("المبلغ يجب أن يكون أكبر من صفر");

  if (kind === "purchase") {
    const inv = await prisma.purchaseInvoice.findUniqueOrThrow({
      where: { id: invoiceId },
    });
    const due = inv.total - inv.paid;
    if (amount > due + 0.001) throw new Error(`المتبقي فقط ${due}`);

    await prisma.purchaseInvoice.update({
      where: { id: invoiceId },
      data: { paid: inv.paid + amount },
    });
    await recordCash(
      "out",
      amount,
      "purchase",
      invoiceId,
      `سداد على فاتورة شراء ${inv.number}`
    );
    revalidatePath(`/purchases/${invoiceId}`);
    revalidatePath("/purchases");
    revalidatePath("/cash");
    revalidatePath("/reports");
    revalidatePath("/suppliers");
    revalidatePath(`/suppliers/${inv.supplierId}/statement`);
    revalidatePath("/");
    return;
  }

  const inv = await prisma.salesInvoice.findUniqueOrThrow({
    where: { id: invoiceId },
  });
  const due = inv.total - inv.paid;
  if (amount > due + 0.001) throw new Error(`المتبقي فقط ${due}`);

  await prisma.salesInvoice.update({
    where: { id: invoiceId },
    data: { paid: inv.paid + amount },
  });
  await recordCash(
    "in",
    amount,
    "sales",
    invoiceId,
    `تحصيل على فاتورة بيع ${inv.number}`
  );
  revalidatePath(`/sales/${invoiceId}`);
  revalidatePath("/sales");
  revalidatePath("/cash");
  revalidatePath("/reports");
  revalidatePath("/customers");
  revalidatePath(`/customers/${inv.customerId}/statement`);
  revalidatePath("/");
}

export async function getProductSellPrice(productId: string) {
  const batch = await prisma.batch.findFirst({
    where: { productId, remainingQty: { gt: 0 } },
    orderBy: [{ purchaseDate: "asc" }, { createdAt: "asc" }],
  });
  return batch?.sellPrice ?? 0;
}

export async function getProductStock(productId: string) {
  const agg = await prisma.batch.aggregate({
    where: { productId },
    _sum: { remainingQty: true },
  });
  return agg._sum.remainingQty ?? 0;
}

// ─── Cash ───────────────────────────────────────────────────

export async function getCashAccounts() {
  return prisma.cashAccount.findMany({
    include: {
      transactions: { orderBy: { date: "desc" }, take: 50 },
    },
    orderBy: { name: "asc" },
  });
}

export async function createCashAccount(name: string) {
  const account = await prisma.cashAccount.create({
    data: { name: name.trim(), balance: 0 },
  });
  revalidatePath("/cash");
  return account;
}

export async function createManualCashTransaction(input: {
  accountId: string;
  type: "in" | "out";
  amount: number;
  notes?: string;
  date?: string;
}) {
  if (input.amount <= 0) throw new Error("المبلغ يجب أن يكون أكبر من صفر");

  await prisma.$transaction(async (tx) => {
    const account = await tx.cashAccount.findUniqueOrThrow({
      where: { id: input.accountId },
    });
    await tx.cashTransaction.create({
      data: {
        accountId: input.accountId,
        type: input.type,
        amount: input.amount,
        referenceType: "manual",
        notes: input.notes || null,
        date: input.date ? new Date(input.date) : new Date(),
      },
    });
    await tx.cashAccount.update({
      where: { id: input.accountId },
      data: {
        balance:
          input.type === "in"
            ? account.balance + input.amount
            : account.balance - input.amount,
      },
    });
  });

  revalidatePath("/cash");
  revalidatePath("/reports");
  revalidatePath("/");
}

// ─── Reports & Dashboard ────────────────────────────────────

export async function getDashboardStats() {
  const [
    products,
    customers,
    suppliers,
    purchaseAgg,
    salesAgg,
    cash,
    batchRows,
    salesByPay,
    purchaseByPay,
    salesInstallments,
    purchaseInstallments,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.customer.count(),
    prisma.supplier.count(),
    prisma.purchaseInvoice.aggregate({
      _sum: { total: true, paid: true, interestAmount: true },
      _count: true,
    }),
    prisma.salesInvoice.aggregate({
      _sum: { total: true, paid: true, costTotal: true, interestAmount: true },
      _count: true,
    }),
    prisma.cashAccount.aggregate({ _sum: { balance: true } }),
    prisma.batch.findMany({
      where: { remainingQty: { gt: 0 } },
      select: {
        remainingQty: true,
        purchasePrice: true,
        productId: true,
        product: { select: { id: true, name: true } },
      },
    }),
    prisma.salesInvoice.groupBy({
      by: ["paymentMethod"],
      _count: true,
    }),
    prisma.purchaseInvoice.groupBy({
      by: ["paymentMethod"],
      _count: true,
    }),
    prisma.salesInstallment.findMany({
      where: { status: { not: "paid" } },
      select: {
        id: true,
        sequence: true,
        dueDate: true,
        amount: true,
        paidAmount: true,
        invoiceId: true,
        invoice: {
          select: { number: true, customer: { select: { name: true } } },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 6,
    }),
    prisma.purchaseInstallment.findMany({
      where: { status: { not: "paid" } },
      select: {
        id: true,
        sequence: true,
        dueDate: true,
        amount: true,
        paidAmount: true,
        invoiceId: true,
        invoice: {
          select: { number: true, supplier: { select: { name: true } } },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 6,
    }),
  ]);

  const inventoryValue = batchRows.reduce(
    (s, b) => s + b.remainingQty * b.purchasePrice,
    0
  );

  const qtyByProduct = new Map<string, { id: string; name: string; qty: number }>();
  for (const b of batchRows) {
    const cur = qtyByProduct.get(b.productId);
    if (cur) cur.qty += b.remainingQty;
    else
      qtyByProduct.set(b.productId, {
        id: b.product.id,
        name: b.product.name,
        qty: b.remainingQty,
      });
  }
  const low = [...qtyByProduct.values()]
    .filter((p) => p.qty > 0 && p.qty <= 5)
    .slice(0, 8);

  const salesTotal = salesAgg._sum.total ?? 0;
  const salesPaid = salesAgg._sum.paid ?? 0;
  const costTotal = salesAgg._sum.costTotal ?? 0;
  const purchaseTotal = purchaseAgg._sum.total ?? 0;
  const purchasePaid = purchaseAgg._sum.paid ?? 0;

  const salesCashCount =
    salesByPay.find((g) => g.paymentMethod === "cash")?._count ?? 0;
  const salesInstallmentCount =
    salesByPay.find((g) => g.paymentMethod === "installment")?._count ?? 0;
  const purchaseCashCount =
    purchaseByPay.find((g) => g.paymentMethod === "cash")?._count ?? 0;
  const purchaseInstallmentCount =
    purchaseByPay.find((g) => g.paymentMethod === "installment")?._count ?? 0;

  const upcomingInstallments = [
    ...salesInstallments.map((i) => ({
      id: i.id,
      kind: "sales" as const,
      sequence: i.sequence,
      dueDate: i.dueDate,
      amount: i.amount - i.paidAmount,
      party: i.invoice.customer.name,
      invoiceNumber: i.invoice.number,
      href: `/sales/${i.invoiceId}`,
    })),
    ...purchaseInstallments.map((i) => ({
      id: i.id,
      kind: "purchase" as const,
      sequence: i.sequence,
      dueDate: i.dueDate,
      amount: i.amount - i.paidAmount,
      party: i.invoice.supplier.name,
      invoiceNumber: i.invoice.number,
      href: `/purchases/${i.invoiceId}`,
    })),
  ]
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 8);

  return {
    products,
    customers,
    suppliers,
    purchasesCount: purchaseAgg._count,
    purchasesTotal: purchaseTotal,
    salesCount: salesAgg._count,
    salesTotal,
    profit: salesTotal - costTotal,
    cashBalance: cash._sum.balance ?? 0,
    inventoryValue,
    lowStock: low,
    receivables: salesTotal - salesPaid,
    payables: purchaseTotal - purchasePaid,
    salesInterest: salesAgg._sum.interestAmount ?? 0,
    purchaseInterest: purchaseAgg._sum.interestAmount ?? 0,
    salesCashCount,
    salesInstallmentCount,
    purchaseCashCount,
    purchaseInstallmentCount,
    upcomingInstallments,
  };
}

export type ReportType = "sales" | "expenses" | "purchases" | "profits";

export async function getReportsData() {
  const [purchases, sales, batches, cashTx, pendingSalesInst, pendingPurchaseInst] =
    await Promise.all([
      prisma.purchaseInvoice.findMany({
        include: {
          supplier: { select: { id: true, name: true } },
          items: { select: { id: true } },
        },
        orderBy: { date: "desc" },
        take: 100,
      }),
      prisma.salesInvoice.findMany({
        include: {
          customer: { select: { id: true, name: true } },
          items: { select: { id: true } },
        },
        orderBy: { date: "desc" },
        take: 100,
      }),
      prisma.batch.findMany({
        where: { remainingQty: { gt: 0 } },
        include: { product: { select: { id: true, name: true } } },
        orderBy: { purchaseDate: "asc" },
        take: 200,
      }),
      prisma.cashTransaction.findMany({
        include: { account: { select: { id: true, name: true } } },
        orderBy: { date: "desc" },
        take: 100,
      }),
      prisma.salesInstallment.findMany({
        where: { status: { not: "paid" } },
        include: {
          invoice: {
            select: { id: true, number: true, customer: { select: { name: true } } },
          },
        },
        orderBy: { dueDate: "asc" },
        take: 50,
      }),
      prisma.purchaseInstallment.findMany({
        where: { status: { not: "paid" } },
        include: {
          invoice: {
            select: { id: true, number: true, supplier: { select: { name: true } } },
          },
        },
        orderBy: { dueDate: "asc" },
        take: 50,
      }),
    ]);

  const expenses = cashTx.filter((t) => t.type === "out");
  const salesTotal = sales.reduce((s, i) => s + i.total, 0);
  const salesSubtotal = sales.reduce((s, i) => s + (i.subtotal || i.total), 0);
  const salesCost = sales.reduce((s, i) => s + i.costTotal, 0);
  const salesInterest = sales.reduce((s, i) => s + i.interestAmount, 0);
  const salesPaid = sales.reduce((s, i) => s + i.paid, 0);
  const purchaseTotal = purchases.reduce((s, i) => s + i.total, 0);
  const purchaseSubtotal = purchases.reduce(
    (s, i) => s + (i.subtotal || i.total),
    0
  );
  const purchaseInterest = purchases.reduce((s, i) => s + i.interestAmount, 0);
  const purchasePaid = purchases.reduce((s, i) => s + i.paid, 0);
  const expensesTotal = expenses.reduce((s, t) => s + t.amount, 0);
  const inventoryValue = batches.reduce(
    (s, b) => s + b.remainingQty * b.purchasePrice,
    0
  );

  const salesCash = sales.filter((i) => i.paymentMethod === "cash");
  const salesInstallment = sales.filter((i) => i.paymentMethod === "installment");
  const purchaseCash = purchases.filter((i) => i.paymentMethod === "cash");
  const purchaseInstallment = purchases.filter(
    (i) => i.paymentMethod === "installment"
  );

  return {
    purchases,
    sales,
    batches,
    cashTx,
    expenses,
    pendingSalesInst,
    pendingPurchaseInst,
    summary: {
      salesTotal,
      salesSubtotal,
      salesCost,
      salesInterest,
      salesPaid,
      profit: salesTotal - salesCost,
      profitWithoutInterest: salesSubtotal - salesCost,
      purchaseTotal,
      purchaseSubtotal,
      purchaseInterest,
      purchasePaid,
      expensesTotal,
      inventoryValue,
      receivables: salesTotal - salesPaid,
      payables: purchaseTotal - purchasePaid,
      salesCount: sales.length,
      purchasesCount: purchases.length,
      expensesCount: expenses.length,
      salesCashCount: salesCash.length,
      salesInstallmentCount: salesInstallment.length,
      purchaseCashCount: purchaseCash.length,
      purchaseInstallmentCount: purchaseInstallment.length,
      pendingInstallmentsAmount:
        pendingSalesInst.reduce((s, i) => s + (i.amount - i.paidAmount), 0) +
        pendingPurchaseInst.reduce((s, i) => s + (i.amount - i.paidAmount), 0),
      pendingSalesInstallmentsAmount: pendingSalesInst.reduce(
        (s, i) => s + (i.amount - i.paidAmount),
        0
      ),
      pendingPurchaseInstallmentsAmount: pendingPurchaseInst.reduce(
        (s, i) => s + (i.amount - i.paidAmount),
        0
      ),
    },
  };
}

export async function getCustomerStatement(id: string) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return null;

  const invoices = await prisma.salesInvoice.findMany({
    where: { customerId: id },
    include: {
      items: { include: { product: true } },
      installments: { orderBy: { sequence: "asc" } },
    },
    orderBy: { date: "asc" },
  });

  let running = 0;
  const rows = invoices.map((inv) => {
    const debit = inv.total;
    const credit = inv.paid;
    running += debit - credit;
    const payLabel =
      inv.paymentMethod === "installment"
        ? inv.interestRate > 0
          ? `تقسيط ${inv.interestRate}%`
          : "تقسيط"
        : "كاش";
    return {
      id: inv.id,
      date: inv.date,
      number: inv.number,
      description: `فاتورة بيع ${inv.number} (${payLabel})`,
      debit,
      credit,
      balance: running,
      itemsCount: inv.items.length,
      href: `/sales/${inv.id}`,
      paymentMethod: inv.paymentMethod,
      remaining: inv.total - inv.paid,
    };
  });

  const pendingInstallments = invoices.flatMap((inv) =>
    inv.installments
      .filter((i) => i.status !== "paid")
      .map((i) => ({
        id: i.id,
        invoiceId: inv.id,
        invoiceNumber: inv.number,
        sequence: i.sequence,
        dueDate: i.dueDate,
        amount: i.amount,
        paidAmount: i.paidAmount,
        remaining: i.amount - i.paidAmount,
        status: i.status,
        href: `/sales/${inv.id}`,
      }))
  );

  const openCashInvoices = invoices
    .filter(
      (inv) =>
        inv.paymentMethod === "cash" && inv.total - inv.paid > 0.001
    )
    .map((inv) => ({
      id: inv.id,
      number: inv.number,
      date: inv.date,
      remaining: inv.total - inv.paid,
      href: `/sales/${inv.id}`,
    }));

  const totalDebit = invoices.reduce((s, i) => s + i.total, 0);
  const totalCredit = invoices.reduce((s, i) => s + i.paid, 0);

  return {
    party: customer,
    type: "customer" as const,
    rows,
    pendingInstallments,
    openCashInvoices,
    summary: {
      totalDebit,
      totalCredit,
      balance: totalDebit - totalCredit,
      invoicesCount: invoices.length,
      pendingInstallmentsCount: pendingInstallments.length,
      pendingInstallmentsAmount: pendingInstallments.reduce(
        (s, i) => s + i.remaining,
        0
      ),
    },
  };
}

export async function getSupplierStatement(id: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return null;

  const invoices = await prisma.purchaseInvoice.findMany({
    where: { supplierId: id },
    include: {
      items: { include: { product: true } },
      installments: { orderBy: { sequence: "asc" } },
    },
    orderBy: { date: "asc" },
  });

  let running = 0;
  const rows = invoices.map((inv) => {
    const debit = inv.total;
    const credit = inv.paid;
    running += debit - credit;
    const payLabel =
      inv.paymentMethod === "installment"
        ? inv.interestRate > 0
          ? `تقسيط ${inv.interestRate}%`
          : "تقسيط"
        : "كاش";
    return {
      id: inv.id,
      date: inv.date,
      number: inv.number,
      description: `فاتورة شراء ${inv.number} (${payLabel})`,
      debit,
      credit,
      balance: running,
      itemsCount: inv.items.length,
      href: `/purchases/${inv.id}`,
      paymentMethod: inv.paymentMethod,
      remaining: inv.total - inv.paid,
    };
  });

  const pendingInstallments = invoices.flatMap((inv) =>
    inv.installments
      .filter((i) => i.status !== "paid")
      .map((i) => ({
        id: i.id,
        invoiceId: inv.id,
        invoiceNumber: inv.number,
        sequence: i.sequence,
        dueDate: i.dueDate,
        amount: i.amount,
        paidAmount: i.paidAmount,
        remaining: i.amount - i.paidAmount,
        status: i.status,
        href: `/purchases/${inv.id}`,
      }))
  );

  const openCashInvoices = invoices
    .filter(
      (inv) =>
        inv.paymentMethod === "cash" && inv.total - inv.paid > 0.001
    )
    .map((inv) => ({
      id: inv.id,
      number: inv.number,
      date: inv.date,
      remaining: inv.total - inv.paid,
      href: `/purchases/${inv.id}`,
    }));

  const totalDebit = invoices.reduce((s, i) => s + i.total, 0);
  const totalCredit = invoices.reduce((s, i) => s + i.paid, 0);

  return {
    party: supplier,
    type: "supplier" as const,
    rows,
    pendingInstallments,
    openCashInvoices,
    summary: {
      totalDebit,
      totalCredit,
      balance: totalDebit - totalCredit,
      invoicesCount: invoices.length,
      pendingInstallmentsCount: pendingInstallments.length,
      pendingInstallmentsAmount: pendingInstallments.reduce(
        (s, i) => s + i.remaining,
        0
      ),
    },
  };
}
