import Link from "next/link";
import { getDashboardStats } from "@/lib/actions";
import { formatMoney, formatDate } from "@/lib/utils";
import { PageHeader, StatCard, Panel, Table, Empty, Btn } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const s = await getDashboardStats();

  return (
    <div>
      <PageHeader
        title="لوحة التحكم"
        subtitle="نظرة سريعة على المخزن والمبيعات والخزنة والأقساط"
        actions={
          <>
            <Link href="/purchases/new">
              <Btn type="button">فاتورة شراء</Btn>
            </Link>
            <Link href="/sales/new">
              <Btn type="button" variant="secondary">
                فاتورة بيع
              </Btn>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="رصيد الخزنة" value={formatMoney(s.cashBalance)} />
        <StatCard label="قيمة المخزون" value={formatMoney(s.inventoryValue)} />
        <StatCard label="إجمالي المبيعات" value={formatMoney(s.salesTotal)} />
        <StatCard
          label="الربح التقديري"
          value={formatMoney(s.profit)}
          hint="يشمل فوائد التقسيط"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="مستحقات العملاء"
          value={formatMoney(s.receivables)}
          hint="متبقي من فواتير البيع"
        />
        <StatCard
          label="مستحقات الموردين"
          value={formatMoney(s.payables)}
          hint="متبقي من فواتير الشراء"
        />
        <StatCard
          label="فوائد مبيعات"
          value={formatMoney(s.salesInterest)}
          hint="من فواتير التقسيط"
        />
        <StatCard
          label="فوائد مشتريات"
          value={formatMoney(s.purchaseInterest)}
          hint="تكلفة فوائد التوريد"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="أصناف" value={String(s.products)} />
        <StatCard label="عملاء" value={String(s.customers)} />
        <StatCard label="موردين" value={String(s.suppliers)} />
        <StatCard
          label="فواتير"
          value={`${s.salesCount} بيع / ${s.purchasesCount} شراء`}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="مبيعات حسب الدفع"
          value={`${s.salesCashCount} كاش · ${s.salesInstallmentCount} تقسيط`}
        />
        <StatCard
          label="مشتريات حسب الدفع"
          value={`${s.purchaseCashCount} كاش · ${s.purchaseInstallmentCount} تقسيط`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h3 className="font-medium">أقساط قريبة الاستحقاق</h3>
            <p className="text-xs text-[var(--muted)]">تحصيل من عملاء أو سداد لموردين</p>
          </div>
          {s.upcomingInstallments.length === 0 ? (
            <Empty message="لا توجد أقساط معلّقة" />
          ) : (
            <Table headers={["الاستحقاق", "النوع", "الطرف", "الفاتورة", "المبلغ", ""]}>
              {s.upcomingInstallments.map((row) => (
                <tr
                  key={`${row.kind}-${row.id}`}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-4 py-3 text-sm">{formatDate(row.dueDate)}</td>
                  <td className="px-4 py-3 text-sm">
                    {row.kind === "sales" ? "تحصيل" : "سداد"} #{row.sequence}
                  </td>
                  <td className="px-4 py-3 text-sm">{row.party}</td>
                  <td className="px-4 py-3 text-sm">{row.invoiceNumber}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {formatMoney(row.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={row.href}
                      className="text-sm text-[var(--accent)] hover:underline"
                    >
                      فتح
                    </Link>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>

        <Panel>
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h3 className="font-medium">أصناف منخفضة المخزون</h3>
          </div>
          {s.lowStock.length === 0 ? (
            <Empty message="لا توجد أصناف منخفضة حالياً" />
          ) : (
            <Table headers={["الصنف", "الكمية المتبقية"]}>
              {s.lowStock.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3 text-[var(--warn)]">{p.qty}</td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
      </div>
    </div>
  );
}
