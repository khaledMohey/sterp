"use client";

import { useState, useTransition } from "react";
import { payInstallment, recordInvoicePayment } from "@/lib/actions";
import { formatMoney, formatDate } from "@/lib/utils";
import { Btn, Input, Panel, Table } from "./ui";

type PendingInst = {
  id: string;
  sequence: number;
  dueDate: Date;
  amount: number;
  paidAmount: number;
  status: string;
  invoiceId: string;
  invoiceNumber: string;
  remaining: number;
};

type OpenCashInvoice = {
  id: string;
  number: string;
  remaining: number;
  date: Date;
};

export function PartyPaymentsPanel({
  kind,
  pendingInstallments,
  openCashInvoices,
}: {
  kind: "customer" | "supplier";
  pendingInstallments: PendingInst[];
  openCashInvoices: OpenCashInvoice[];
}) {
  const isCustomer = kind === "customer";
  const actionKind = isCustomer ? "sales" : "purchase";

  if (pendingInstallments.length === 0 && openCashInvoices.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-6">
      {pendingInstallments.length > 0 && (
        <Panel>
          <div className="border-b border-[var(--border)] bg-[var(--accent)]/5 px-4 py-3">
            <h3 className="font-medium text-[var(--ink)]">
              {isCustomer ? "تحصيل أقساط من العميل" : "تسديد أقساط للمورد"}
            </h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              اضغط الزر بجانب القسط — المبلغ يتسجل في الخزنة فوراً
            </p>
          </div>
          <Table
            headers={[
              "الاستحقاق",
              "الفاتورة",
              "قسط",
              "المبلغ",
              "الحالة",
              "تسديد",
            ]}
          >
            {pendingInstallments.map((inst) => (
              <tr
                key={inst.id}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="px-4 py-3">{formatDate(inst.dueDate)}</td>
                <td className="px-4 py-3 font-medium">{inst.invoiceNumber}</td>
                <td className="px-4 py-3">#{inst.sequence}</td>
                <td className="px-4 py-3 font-medium">
                  {formatMoney(inst.remaining)}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--muted)]">
                  {inst.status === "partial" ? "جزئي" : "مستحق"}
                </td>
                <td className="px-4 py-3">
                  <InstallmentPayBtn
                    kind={actionKind}
                    installmentId={inst.id}
                    label={isCustomer ? "تحصيل القسط" : "تسديد القسط"}
                  />
                </td>
              </tr>
            ))}
          </Table>
        </Panel>
      )}

      {openCashInvoices.length > 0 && (
        <Panel>
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h3 className="font-medium">
              {isCustomer
                ? "تحصيل متبقي فواتير كاش"
                : "تسديد متبقي فواتير كاش"}
            </h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {openCashInvoices.map((inv) => (
              <CashPayRow
                key={inv.id}
                kind={actionKind}
                invoiceId={inv.id}
                number={inv.number}
                remaining={inv.remaining}
                isCustomer={isCustomer}
              />
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function InstallmentPayBtn({
  kind,
  installmentId,
  label,
}: {
  kind: "purchase" | "sales";
  installmentId: string;
  label: string;
}) {
  const [pending, start] = useTransition();
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
            alert(err instanceof Error ? err.message : "تعذر التسديد");
          }
        });
      }}
    >
      {pending ? "..." : label}
    </Btn>
  );
}

function CashPayRow({
  kind,
  invoiceId,
  number,
  remaining,
  isCustomer,
}: {
  kind: "purchase" | "sales";
  invoiceId: string;
  number: string;
  remaining: number;
  isCustomer: boolean;
}) {
  const [amount, setAmount] = useState(String(remaining));
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  return (
    <div className="flex flex-wrap items-end gap-3 px-4 py-3">
      <div className="min-w-[120px]">
        <p className="text-sm font-medium">{number}</p>
        <p className="text-xs text-[var(--muted)]">
          متبقي {formatMoney(remaining)}
        </p>
      </div>
      <Input
        label="المبلغ"
        type="number"
        min="0.01"
        max={remaining}
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-36"
      />
      <Btn
        type="button"
        disabled={pending}
        onClick={() => {
          setError("");
          const n = Number(amount);
          if (!n || n <= 0) {
            setError("أدخل مبلغاً صحيحاً");
            return;
          }
          if (
            !confirm(
              isCustomer
                ? "تأكيد تحصيل المبلغ للخزنة؟"
                : "تأكيد سداد المبلغ من الخزنة؟"
            )
          )
            return;
          start(async () => {
            try {
              await recordInvoicePayment(kind, invoiceId, n);
            } catch (err) {
              setError(err instanceof Error ? err.message : "تعذر التسجيل");
            }
          });
        }}
      >
        {pending ? "..." : isCustomer ? "تحصيل" : "تسديد"}
      </Btn>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}
