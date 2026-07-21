import Link from "next/link";
import { getReportsData, type ReportType } from "@/lib/actions";
import { formatMoney, formatDate, paymentMethodLabel } from "@/lib/utils";
import { PageHeader, Panel, Table, Empty, StatCard } from "@/components/ui";
import { ReportTypeTabs, type ReportTab } from "@/components/ReportTypeTabs";

export const dynamic = "force-dynamic";

const titles: Record<ReportType, { title: string; subtitle: string }> = {
  sales: {
    title: "تقرير المبيعات",
    subtitle: "فواتير البيع بالكاش والتقسيط مع الفوائد والتحصيل",
  },
  expenses: {
    title: "تقرير المصاريف",
    subtitle: "المنصرف من الخزنة بما فيه دفعات وأقساط المشتريات",
  },
  purchases: {
    title: "تقرير التوريدات",
    subtitle: "فواتير الشراء بالكاش والتقسيط مع الفوائد والمدفوعات",
  },
  profits: {
    title: "تقرير الأرباح",
    subtitle: "الربح شامل فوائد التقسيط وتكلفة FIFO",
  },
};

function parseType(raw?: string): ReportTab {
  if (
    raw === "sales" ||
    raw === "expenses" ||
    raw === "purchases" ||
    raw === "profits"
  ) {
    return raw;
  }
  return "sales";
}

function paymentCell(method: string, rate: number) {
  const label = paymentMethodLabel(method);
  if (method === "installment" && rate > 0) return `${label} ${rate}%`;
  if (method === "installment") return `${label} بدون فوائد`;
  return label;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: raw } = await searchParams;
  const type = parseType(raw);
  const data = await getReportsData();
  const { summary } = data;
  const meta = titles[type];

  return (
    <div>
      <PageHeader title="التقارير" subtitle="اختر نوع التقرير للعرض" />
      <div className="mb-6">
        <ReportTypeTabs current={type} />
      </div>

      <h3 className="mb-1 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--ink)]">
        {meta.title}
      </h3>
      <p className="mb-5 text-sm text-[var(--muted)]">{meta.subtitle}</p>

      {type === "sales" && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="عدد الفواتير" value={String(summary.salesCount)} />
            <StatCard label="إجمالي المبيعات" value={formatMoney(summary.salesTotal)} />
            <StatCard label="المحصّل" value={formatMoney(summary.salesPaid)} />
            <StatCard label="مستحقات العملاء" value={formatMoney(summary.receivables)} />
          </div>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="كاش / تقسيط"
              value={`${summary.salesCashCount} / ${summary.salesInstallmentCount}`}
            />
            <StatCard label="قيمة الأصناف" value={formatMoney(summary.salesSubtotal)} />
            <StatCard label="إجمالي الفوائد" value={formatMoney(summary.salesInterest)} />
            <StatCard
              label="أقساط بيع معلّقة"
              value={formatMoney(summary.pendingSalesInstallmentsAmount)}
            />
          </div>
          <Panel className="mb-6">
            {data.sales.length === 0 ? (
              <Empty message="لا توجد مبيعات" />
            ) : (
              <Table
                headers={[
                  "الرقم",
                  "التاريخ",
                  "العميل",
                  "الدفع",
                  "الأصناف",
                  "الفوائد",
                  "الإجمالي",
                  "المحصّل",
                  "المتبقي",
                  "",
                ]}
              >
                {data.sales.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{inv.number}</td>
                    <td className="px-4 py-3">{formatDate(inv.date)}</td>
                    <td className="px-4 py-3">{inv.customer.name}</td>
                    <td className="px-4 py-3 text-sm">
                      {paymentCell(inv.paymentMethod, inv.interestRate)}
                    </td>
                    <td className="px-4 py-3">
                      {formatMoney(inv.subtotal || inv.total)}
                    </td>
                    <td className="px-4 py-3">{formatMoney(inv.interestAmount)}</td>
                    <td className="px-4 py-3">{formatMoney(inv.total)}</td>
                    <td className="px-4 py-3">{formatMoney(inv.paid)}</td>
                    <td className="px-4 py-3">
                      {formatMoney(inv.total - inv.paid)}
                    </td>
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
          <Panel>
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h3 className="font-medium">أقساط بيع مستحقة</h3>
            </div>
            {data.pendingSalesInst.length === 0 ? (
              <Empty message="لا أقساط معلّقة" />
            ) : (
              <Table
                headers={[
                  "الاستحقاق",
                  "العميل",
                  "الفاتورة",
                  "قسط",
                  "المبلغ",
                  "الحالة",
                  "",
                ]}
              >
                {data.pendingSalesInst.map((i) => (
                  <tr
                    key={i.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-4 py-3">{formatDate(i.dueDate)}</td>
                    <td className="px-4 py-3">{i.invoice.customer.name}</td>
                    <td className="px-4 py-3">{i.invoice.number}</td>
                    <td className="px-4 py-3">#{i.sequence}</td>
                    <td className="px-4 py-3">
                      {formatMoney(i.amount - i.paidAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--muted)]">
                      {i.status === "partial" ? "جزئي" : "مستحق"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/sales/${i.invoiceId}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        تحصيل
                      </Link>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>
        </>
      )}

      {type === "expenses" && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="عدد الحركات" value={String(summary.expensesCount)} />
            <StatCard label="إجمالي المصاريف" value={formatMoney(summary.expensesTotal)} />
            <StatCard
              label="مدفوعات مشتريات"
              value={formatMoney(
                data.expenses
                  .filter((t) => t.referenceType === "purchase")
                  .reduce((s, t) => s + t.amount, 0)
              )}
            />
            <StatCard
              label="أقساط شراء معلّقة"
              value={formatMoney(summary.pendingPurchaseInstallmentsAmount)}
            />
          </div>
          <Panel>
            {data.expenses.length === 0 ? (
              <Empty message="لا توجد مصاريف" />
            ) : (
              <Table headers={["التاريخ", "الخزنة", "المبلغ", "النوع", "البيان"]}>
                {data.expenses.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-4 py-3">{formatDate(t.date)}</td>
                    <td className="px-4 py-3">{t.account.name}</td>
                    <td className="px-4 py-3 font-medium text-red-600">
                      {formatMoney(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--muted)]">
                      {t.referenceType === "purchase"
                        ? "دفع مشتريات / قسط"
                        : t.referenceType === "manual"
                          ? "يدوي"
                          : t.referenceType || "—"}
                    </td>
                    <td className="px-4 py-3">{t.notes || "—"}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>
        </>
      )}

      {type === "purchases" && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="عدد الفواتير" value={String(summary.purchasesCount)} />
            <StatCard label="إجمالي التوريدات" value={formatMoney(summary.purchaseTotal)} />
            <StatCard label="المدفوع" value={formatMoney(summary.purchasePaid)} />
            <StatCard label="مستحقات الموردين" value={formatMoney(summary.payables)} />
          </div>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="كاش / تقسيط"
              value={`${summary.purchaseCashCount} / ${summary.purchaseInstallmentCount}`}
            />
            <StatCard
              label="قيمة الأصناف"
              value={formatMoney(summary.purchaseSubtotal)}
            />
            <StatCard
              label="فوائد المشتريات"
              value={formatMoney(summary.purchaseInterest)}
            />
            <StatCard
              label="أقساط شراء معلّقة"
              value={formatMoney(summary.pendingPurchaseInstallmentsAmount)}
            />
          </div>
          <Panel className="mb-6">
            {data.purchases.length === 0 ? (
              <Empty message="لا توجد توريدات" />
            ) : (
              <Table
                headers={[
                  "الرقم",
                  "التاريخ",
                  "المورد",
                  "الدفع",
                  "الأصناف",
                  "الفوائد",
                  "الإجمالي",
                  "المدفوع",
                  "المتبقي",
                  "",
                ]}
              >
                {data.purchases.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{inv.number}</td>
                    <td className="px-4 py-3">{formatDate(inv.date)}</td>
                    <td className="px-4 py-3">{inv.supplier.name}</td>
                    <td className="px-4 py-3 text-sm">
                      {paymentCell(inv.paymentMethod, inv.interestRate)}
                    </td>
                    <td className="px-4 py-3">
                      {formatMoney(inv.subtotal || inv.total)}
                    </td>
                    <td className="px-4 py-3">{formatMoney(inv.interestAmount)}</td>
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
          <Panel>
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h3 className="font-medium">أقساط شراء مستحقة</h3>
            </div>
            {data.pendingPurchaseInst.length === 0 ? (
              <Empty message="لا أقساط معلّقة" />
            ) : (
              <Table
                headers={[
                  "الاستحقاق",
                  "المورد",
                  "الفاتورة",
                  "قسط",
                  "المبلغ",
                  "الحالة",
                  "",
                ]}
              >
                {data.pendingPurchaseInst.map((i) => (
                  <tr
                    key={i.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-4 py-3">{formatDate(i.dueDate)}</td>
                    <td className="px-4 py-3">{i.invoice.supplier.name}</td>
                    <td className="px-4 py-3">{i.invoice.number}</td>
                    <td className="px-4 py-3">#{i.sequence}</td>
                    <td className="px-4 py-3">
                      {formatMoney(i.amount - i.paidAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--muted)]">
                      {i.status === "partial" ? "جزئي" : "مستحق"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/purchases/${i.invoiceId}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        سداد
                      </Link>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>
        </>
      )}

      {type === "profits" && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="إجمالي المبيعات" value={formatMoney(summary.salesTotal)} />
            <StatCard label="تكلفة المبيعات" value={formatMoney(summary.salesCost)} />
            <StatCard label="صافي الربح" value={formatMoney(summary.profit)} />
            <StatCard
              label="هامش الربح"
              value={
                summary.salesTotal > 0
                  ? `${((summary.profit / summary.salesTotal) * 100).toFixed(1)}%`
                  : "0%"
              }
            />
          </div>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="ربح من الأصناف فقط"
              value={formatMoney(summary.profitWithoutInterest)}
              hint="بدون فوائد التقسيط"
            />
            <StatCard
              label="دخل الفوائد"
              value={formatMoney(summary.salesInterest)}
            />
            <StatCard
              label="تقسيط / كاش"
              value={`${summary.salesInstallmentCount} / ${summary.salesCashCount}`}
            />
          </div>
          <Panel>
            {data.sales.length === 0 ? (
              <Empty message="لا توجد فواتير لحساب الأرباح" />
            ) : (
              <Table
                headers={[
                  "الرقم",
                  "التاريخ",
                  "العميل",
                  "الدفع",
                  "الأصناف",
                  "الفوائد",
                  "الإجمالي",
                  "التكلفة",
                  "الربح",
                  "الهامش",
                  "",
                ]}
              >
                {data.sales.map((inv) => {
                  const profit = inv.total - inv.costTotal;
                  const margin =
                    inv.total > 0
                      ? ((profit / inv.total) * 100).toFixed(1)
                      : "0";
                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="px-4 py-3 font-medium">{inv.number}</td>
                      <td className="px-4 py-3">{formatDate(inv.date)}</td>
                      <td className="px-4 py-3">{inv.customer.name}</td>
                      <td className="px-4 py-3 text-sm">
                        {paymentCell(inv.paymentMethod, inv.interestRate)}
                      </td>
                      <td className="px-4 py-3">
                        {formatMoney(inv.subtotal || inv.total)}
                      </td>
                      <td className="px-4 py-3">
                        {formatMoney(inv.interestAmount)}
                      </td>
                      <td className="px-4 py-3">{formatMoney(inv.total)}</td>
                      <td className="px-4 py-3">{formatMoney(inv.costTotal)}</td>
                      <td className="px-4 py-3 font-medium text-[var(--ok)]">
                        {formatMoney(profit)}
                      </td>
                      <td className="px-4 py-3">{margin}%</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/sales/${inv.id}`}
                          className="text-[var(--accent)] hover:underline"
                        >
                          عرض
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
