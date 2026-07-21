import Link from "next/link";
import { getSalesInvoices } from "@/lib/actions";
import { formatMoney, formatDate, paymentMethodLabel } from "@/lib/utils";
import { PageHeader, Panel, Table, Empty, Btn } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const invoices = await getSalesInvoices();

  return (
    <div>
      <PageHeader
        title="فواتير البيع"
        subtitle="البيع للعملاء يسحب من المخزن بالدفعات الأقدم أولاً (FIFO)"
        actions={
          <Link href="/sales/new">
            <Btn type="button">+ فاتورة بيع</Btn>
          </Link>
        }
      />
      <Panel>
        {invoices.length === 0 ? (
          <Empty message="لا توجد فواتير بيع بعد" />
        ) : (
          <Table
            headers={[
              "الرقم",
              "التاريخ",
              "العميل",
              "الدفع",
              "الإجمالي",
              "التكلفة",
              "الربح",
              "المحصّل",
              "",
            ]}
          >
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)]/60"
              >
                <td className="px-4 py-3 font-medium">{inv.number}</td>
                <td className="px-4 py-3">{formatDate(inv.date)}</td>
                <td className="px-4 py-3">{inv.customer.name}</td>
                <td className="px-4 py-3 text-sm">
                  {paymentMethodLabel(inv.paymentMethod)}
                  {inv.paymentMethod === "installment" && inv.interestRate > 0
                    ? ` (${inv.interestRate}%)`
                    : ""}
                </td>
                <td className="px-4 py-3">{formatMoney(inv.total)}</td>
                <td className="px-4 py-3">{formatMoney(inv.costTotal)}</td>
                <td className="px-4 py-3 text-[var(--ok)]">
                  {formatMoney(inv.total - inv.costTotal)}
                </td>
                <td className="px-4 py-3">{formatMoney(inv.paid)}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/sales/${inv.id}`}
                    className="text-[var(--accent)] hover:underline"
                  >
                    عرض
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  );
}
