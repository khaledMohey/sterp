export type PaymentMethod = "cash" | "installment";

export type PaymentPlanInput = {
  method: PaymentMethod;
  subtotal: number;
  interestRate?: number;
  installmentCount?: number;
  downPayment?: number;
  cashPaid?: number;
  startDate?: Date;
};

export type InstallmentPlanRow = {
  sequence: number;
  dueDate: Date;
  amount: number;
};

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function buildPaymentPlan(input: PaymentPlanInput) {
  const subtotal = round2(input.subtotal);
  if (subtotal <= 0) throw new Error("إجمالي الأصناف يجب أن يكون أكبر من صفر");

  if (input.method === "cash") {
    const total = subtotal;
    const paid = round2(
      input.cashPaid !== undefined && input.cashPaid !== null
        ? input.cashPaid
        : total
    );
    if (paid < 0) throw new Error("المبلغ المدفوع غير صحيح");
    if (paid > total) throw new Error("المدفوع أكبر من إجمالي الفاتورة");
    return {
      paymentMethod: "cash" as const,
      subtotal,
      interestRate: 0,
      interestAmount: 0,
      downPayment: 0,
      installmentCount: 0,
      total,
      paid,
      installments: [] as InstallmentPlanRow[],
    };
  }

  const interestRate = Number(input.interestRate) || 0;
  if (interestRate < 0) throw new Error("نسبة الفائدة غير صحيحة");
  const count = Math.floor(Number(input.installmentCount) || 0);
  if (count < 1) throw new Error("حدد عدد الأقساط");

  const interestAmount = round2(subtotal * (interestRate / 100));
  const total = round2(subtotal + interestAmount);
  const downPayment = round2(Number(input.downPayment) || 0);
  if (downPayment < 0) throw new Error("الدفعة المقدمة غير صحيحة");
  if (downPayment >= total) {
    throw new Error("الدفعة المقدمة يجب أن تكون أقل من الإجمالي (أو استخدم كاش)");
  }

  const remaining = round2(total - downPayment);
  const base = round2(remaining / count);
  const installments: InstallmentPlanRow[] = [];
  const start = input.startDate ? new Date(input.startDate) : new Date();
  let allocated = 0;

  for (let i = 1; i <= count; i++) {
    const due = new Date(start);
    due.setMonth(due.getMonth() + i);
    const amount = i === count ? round2(remaining - allocated) : base;
    allocated = round2(allocated + amount);
    installments.push({ sequence: i, dueDate: due, amount });
  }

  return {
    paymentMethod: "installment" as const,
    subtotal,
    interestRate,
    interestAmount,
    downPayment,
    installmentCount: count,
    total,
    paid: downPayment,
    installments,
  };
}

export function paymentMethodLabel(method: string) {
  return method === "installment" ? "تقسيط" : "كاش";
}
