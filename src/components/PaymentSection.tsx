"use client";

import { useMemo } from "react";
import { Btn, Input } from "./ui";
import { buildPaymentPlan, round2 } from "@/lib/payment";

export type PaymentFormState = {
  method: "cash" | "installment";
  cashPaid: string;
  interestRate: string;
  installmentCount: string;
  downPayment: string;
};

export const defaultPaymentState = (
  method: "cash" | "installment" = "cash"
): PaymentFormState => ({
  method,
  cashPaid: "",
  interestRate: "0",
  installmentCount: "3",
  downPayment: "0",
});

export function PaymentSection({
  subtotal,
  date,
  value,
  onChange,
  cashLabel = "المبلغ المدفوع الآن",
}: {
  subtotal: number;
  date: string;
  value: PaymentFormState;
  onChange: (next: PaymentFormState) => void;
  cashLabel?: string;
}) {
  const preview = useMemo(() => {
    try {
      if (subtotal <= 0) return null;
      return buildPaymentPlan({
        method: value.method,
        subtotal,
        interestRate: Number(value.interestRate) || 0,
        installmentCount: Number(value.installmentCount) || 0,
        downPayment: Number(value.downPayment) || 0,
        cashPaid:
          value.cashPaid === ""
            ? subtotal
            : Number(value.cashPaid),
        startDate: date ? new Date(date) : new Date(),
      });
    } catch {
      return null;
    }
  }, [subtotal, value, date]);

  return (
    <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
      <p className="mb-3 text-sm font-medium text-[var(--ink)]">نظام الدفع</p>
      <div className="mb-4 flex flex-wrap gap-2">
        <Btn
          type="button"
          variant={value.method === "cash" ? "primary" : "secondary"}
          onClick={() =>
            onChange({
              ...value,
              method: "cash",
              cashPaid: value.cashPaid || String(round2(subtotal) || ""),
            })
          }
        >
          كاش
        </Btn>
        <Btn
          type="button"
          variant={value.method === "installment" ? "primary" : "secondary"}
          onClick={() => onChange({ ...value, method: "installment" })}
        >
          تقسيط
        </Btn>
      </div>

      {value.method === "cash" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={cashLabel}
            type="number"
            min="0"
            step="0.01"
            value={value.cashPaid === "" ? (subtotal ? String(round2(subtotal)) : "") : value.cashPaid}
            onChange={(e) => onChange({ ...value, cashPaid: e.target.value })}
          />
          <div className="flex items-end pb-2 text-sm text-[var(--muted)]">
            المتبقي آجل:{" "}
            {formatPreview(
              Math.max(
                0,
                subtotal -
                  (value.cashPaid === ""
                    ? subtotal
                    : Number(value.cashPaid) || 0)
              )
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="عدد الأقساط"
              type="number"
              min="1"
              step="1"
              value={value.installmentCount}
              onChange={(e) =>
                onChange({ ...value, installmentCount: e.target.value })
              }
              required
            />
            <Input
              label="الفائدة % (0 = بدون)"
              type="number"
              min="0"
              step="0.01"
              value={value.interestRate}
              onChange={(e) =>
                onChange({ ...value, interestRate: e.target.value })
              }
            />
            <Input
              label="دفعة مقدمة"
              type="number"
              min="0"
              step="0.01"
              value={value.downPayment}
              onChange={(e) =>
                onChange({ ...value, downPayment: e.target.value })
              }
            />
          </div>
          {preview && preview.paymentMethod === "installment" && (
            <div className="rounded-lg border border-[var(--border)] bg-white p-3 text-sm">
              <div className="mb-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
                <span>قيمة الأصناف: {formatPreview(preview.subtotal)}</span>
                <span>
                  الفوائد ({preview.interestRate}%):{" "}
                  {formatPreview(preview.interestAmount)}
                </span>
                <span className="font-medium">
                  الإجمالي: {formatPreview(preview.total)}
                </span>
                <span>
                  بعد المقدمة:{" "}
                  {formatPreview(preview.total - preview.downPayment)}
                </span>
              </div>
              <p className="mb-2 text-xs text-[var(--muted)]">جدول الأقساط المتوقع</p>
              <div className="max-h-40 overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[var(--muted)]">
                      <th className="py-1 text-right font-medium">قسط</th>
                      <th className="py-1 text-right font-medium">الاستحقاق</th>
                      <th className="py-1 text-right font-medium">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.installments.map((row) => (
                      <tr key={row.sequence} className="border-t border-[var(--border)]">
                        <td className="py-1">{row.sequence}</td>
                        <td className="py-1">
                          {row.dueDate.toLocaleDateString("ar-EG")}
                        </td>
                        <td className="py-1">{formatPreview(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatPreview(n: number) {
  return n.toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function paymentPayload(value: PaymentFormState, subtotal: number) {
  if (value.method === "cash") {
    return {
      method: "cash" as const,
      cashPaid:
        value.cashPaid === "" ? subtotal : Number(value.cashPaid) || 0,
      interestRate: 0,
      installmentCount: 0,
      downPayment: 0,
    };
  }
  return {
    method: "installment" as const,
    cashPaid: 0,
    interestRate: Number(value.interestRate) || 0,
    installmentCount: Number(value.installmentCount) || 0,
    downPayment: Number(value.downPayment) || 0,
  };
}
