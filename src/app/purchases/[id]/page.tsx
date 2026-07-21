import Link from "next/link";
import { notFound } from "next/navigation";
import { getPurchaseInvoice } from "@/lib/actions";
import { formatMoney, formatDate, paymentMethodLabel } from "@/lib/utils";
import { PageHeader, Panel, Table, Btn, StatCard } from "@/components/ui";
import { InstallmentsPanel } from "@/components/InstallmentsPanel";

export const revalidate = 30;

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inv = await getPurchaseInvoice(id);
  if (!inv) notFound();

  return (
    <div>
      <PageHeader
        title={`فاتورة شراء ${inv.number}`}
        subtitle={`${inv.supplier.name} · ${formatDate(inv.date)} · ${paymentMethodLabel(inv.paymentMethod)}`}
        actions={
          <Link href="/purchases">
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
        <StatCard label="المدفوع" value={formatMoney(inv.paid)} />
        <StatCard label="المتبقي" value={formatMoney(inv.total - inv.paid)} />
      </div>
      {inv.notes && (
        <p className="mb-4 text-sm text-[var(--muted)]">ملاحظات: {inv.notes}</p>
      )}

      <InstallmentsPanel
        kind="purchase"
        paymentMethod={inv.paymentMethod}
        interestRate={inv.interestRate}
        interestAmount={inv.interestAmount}
        downPayment={inv.downPayment}
        subtotal={inv.subtotal}
        installments={inv.installments}
      />

      <Panel>
        <Table
          headers={[
            "الصنف",
            "الكمية",
            "سعر الشراء",
            "سعر البيع",
            "الإجمالي",
            "دفعة المخزن",
          ]}
        >
          {inv.items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-[var(--border)] last:border-0"
            >
              <td className="px-4 py-3">{item.product.name}</td>
              <td className="px-4 py-3">{item.quantity}</td>
              <td className="px-4 py-3">{formatMoney(item.purchasePrice)}</td>
              <td className="px-4 py-3">{formatMoney(item.sellPrice)}</td>
              <td className="px-4 py-3">
                {formatMoney(item.quantity * item.purchasePrice)}
              </td>
              <td className="px-4 py-3 text-xs text-[var(--muted)]">
                {item.batch
                  ? `متبقي ${item.batch.remainingQty} من ${item.batch.quantity}`
                  : "—"}
              </td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}
