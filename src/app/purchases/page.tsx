import Link from "next/link";
import { getPurchaseInvoices } from "@/lib/actions";
import { formatMoney, formatDate, paymentMethodLabel } from "@/lib/utils";
import { PageHeader, Panel, Table, Empty, Btn } from "@/components/ui";

export const revalidate = 10;

export default async function PurchasesPage() {
  const invoices = await getPurchaseInvoices();

  return (
    <div>
      <PageHeader
        title="فواتير الشراء"
        subtitle="الشراء من الموردين يُدخل للمخزن كدفعات بأسعار مستقلة"
        actions={
          <Link href="/purchases/new">
            <Btn type="button">+ فاتورة شراء</Btn>
          </Link>
        }
      />
      <Panel>
        {invoices.length === 0 ? (
          <Empty message="لا توجد فواتير شراء بعد" />
        ) : (
          <Table
            headers={[
              "الرقم",
              "التاريخ",
              "المورد",
              "الدفع",
              "الإجمالي",
              "المدفوع",
              "المتبقي",
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
                <td className="px-4 py-3">{inv.supplier.name}</td>
                <td className="px-4 py-3 text-sm">
                  {paymentMethodLabel(inv.paymentMethod)}
                  {inv.paymentMethod === "installment" && inv.interestRate > 0
                    ? ` (${inv.interestRate}%)`
                    : ""}
                </td>
                <td className="px-4 py-3">{formatMoney(inv.total)}</td>
                <td className="px-4 py-3">{formatMoney(inv.paid)}</td>
                <td className="px-4 py-3">
                  {formatMoney(inv.total - inv.paid)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/purchases/${inv.id}`}
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
