"use client";

import { useTransition } from "react";
import { payInstallment } from "@/lib/actions";
import { formatMoney, formatDate } from "@/lib/utils";
import { Btn, Panel, Table, Empty } from "./ui";

type Installment = {
  id: string;
  sequence: number;
  dueDate: Date;
  amount: number;
  paidAmount: number;
  status: string;
  paidAt: Date | null;
};

export function InstallmentsPanel({
  kind,
  installments,
  paymentMethod,
  interestRate,
  interestAmount,
  downPayment,
  subtotal,
}: {
  kind: "purchase" | "sales";
  installments: Installment[];
  paymentMethod: string;
  interestRate: number;
  interestAmount: number;
  downPayment: number;
  subtotal: number;
}) {
  if (paymentMethod !== "installment") {
    return (
      <Panel className="mb-6 p-4">
        <p className="text-sm text-[var(--muted)]">
          نظام الدفع: <span className="font-medium text-[var(--ink)]">كاش</span>
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="mb-6">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h3 className="font-medium">جدول الأقساط</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          أصناف {formatMoney(subtotal)}
          {interestRate > 0
            ? ` · فوائد ${interestRate}% = ${formatMoney(interestAmount)}`
            : " · بدون فوائد"}
          {downPayment > 0 ? ` · مقدمة ${formatMoney(downPayment)}` : ""}
        </p>
      </div>
      {installments.length === 0 ? (
        <Empty message="لا أقساط" />
      ) : (
        <Table
          headers={[
            "#",
            "الاستحقاق",
            "المبلغ",
            "المدفوع",
            "الحالة",
            "تاريخ السداد",
            "",
          ]}
        >
          {installments.map((inst) => (
            <tr
              key={inst.id}
              className="border-b border-[var(--border)] last:border-0"
            >
              <td className="px-4 py-3">{inst.sequence}</td>
              <td className="px-4 py-3">{formatDate(inst.dueDate)}</td>
              <td className="px-4 py-3">{formatMoney(inst.amount)}</td>
              <td className="px-4 py-3">{formatMoney(inst.paidAmount)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={inst.status} />
              </td>
              <td className="px-4 py-3 text-sm text-[var(--muted)]">
                {inst.paidAt ? formatDate(inst.paidAt) : "—"}
              </td>
              <td className="px-4 py-3">
                {inst.status !== "paid" && (
                  <PayButton kind={kind} installmentId={inst.id} />
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Panel>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "مسدد",
    partial: "جزئي",
    pending: "مستحق",
  };
  const color =
    status === "paid"
      ? "text-[var(--ok)]"
      : status === "partial"
        ? "text-[var(--warn)]"
        : "text-[var(--muted)]";
  return <span className={`text-sm font-medium ${color}`}>{map[status] || status}</span>;
}

function PayButton({
  kind,
  installmentId,
}: {
  kind: "purchase" | "sales";
  installmentId: string;
}) {
  const [pending, start] = useTransition();
  const label = kind === "sales" ? "تحصيل القسط" : "تسديد القسط";
  return (
    <Btn
      type="button"
      className="!px-3 !py-1.5 text-xs"
      disabled={pending}
      onClick={() => {
        if (!confirm(`${label} وتسجيله في الخزنة؟`)) return;
        start(async () => {
          try {
            await payInstallment(kind, installmentId);
          } catch (err) {
            alert(err instanceof Error ? err.message : "تعذر السداد");
          }
        });
      }}
    >
      {pending ? "..." : label}
    </Btn>
  );
}
