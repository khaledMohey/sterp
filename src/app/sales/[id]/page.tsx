import Link from "next/link";
import { notFound } from "next/navigation";
import { getSalesInvoice } from "@/lib/actions";
import { formatMoney, formatDate, paymentMethodLabel } from "@/lib/utils";
import { PageHeader, Panel, Table, Btn, StatCard } from "@/components/ui";
import { InstallmentsPanel } from "@/components/InstallmentsPanel";

export const revalidate = 30;

export default async function SalesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inv = await getSalesInvoice(id);
  if (!inv) notFound();

  return (
    <div>
      <PageHeader
        title={`فاتورة بيع ${inv.number}`}
        subtitle={`${inv.customer.name} · ${formatDate(inv.date)} · ${paymentMethodLabel(inv.paymentMethod)}`}
        actions={
          <Link href="/sales">
            <Btn type="button" variant="secondary">
              رجوع
            </Btn>
          </Link>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="قيمة الأصناف" value={formatMoney(inv.subtotal || inv.total)} />
        {inv.interestAmount > 0 && (
          <StatCard
            label={`فوائد ${inv.interestRate}%`}
            value={formatMoney(inv.interestAmount)}
          />
        )}
        <StatCard label="الإجمالي" value={formatMoney(inv.total)} />
        <StatCard label="التكلفة (FIFO)" value={formatMoney(inv.costTotal)} />
        <StatCard
          label="الربح"
          value={formatMoney(inv.total - inv.costTotal)}
        />
        <StatCard label="المحصّل" value={formatMoney(inv.paid)} />
        <StatCard label="المتبقي" value={formatMoney(inv.total - inv.paid)} />
      </div>
      {inv.notes && (
        <p className="mb-4 text-sm text-[var(--muted)]">ملاحظات: {inv.notes}</p>
      )}

      <InstallmentsPanel
        kind="sales"
        paymentMethod={inv.paymentMethod}
        interestRate={inv.interestRate}
        interestAmount={inv.interestAmount}
        downPayment={inv.downPayment}
        subtotal={inv.subtotal}
        installments={inv.installments}
      />

      <Panel className="mb-6">
        <Table
          headers={["الصنف", "الكمية", "سعر البيع", "الإجمالي", "تكلفة الدفعات"]}
        >
          {inv.items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-[var(--border)] last:border-0"
            >
              <td className="px-4 py-3">{item.product.name}</td>
              <td className="px-4 py-3">{item.quantity}</td>
              <td className="px-4 py-3">{formatMoney(item.unitPrice)}</td>
              <td className="px-4 py-3">
                {formatMoney(item.quantity * item.unitPrice)}
              </td>
              <td className="px-4 py-3">{formatMoney(item.costTotal)}</td>
            </tr>
          ))}
        </Table>
      </Panel>
      <Panel>
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h3 className="font-medium">توزيع السحب من الدفعات (FIFO)</h3>
        </div>
        <Table headers={["الصنف", "تاريخ الدفعة", "الكمية", "سعر تكلفة الدفعة"]}>
          {inv.items.flatMap((item) =>
            item.allocations.map((a) => (
              <tr
                key={a.id}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="px-4 py-3">{item.product.name}</td>
                <td className="px-4 py-3">
                  {formatDate(a.batch.purchaseDate)}
                </td>
                <td className="px-4 py-3">{a.quantity}</td>
                <td className="px-4 py-3">{formatMoney(a.costPrice)}</td>
              </tr>
            ))
          )}
        </Table>
      </Panel>
    </div>
  );
}
