import { getCashAccounts } from "@/lib/actions";
import { formatMoney, formatDate } from "@/lib/utils";
import { PageHeader, Panel, Table, Empty, StatCard } from "@/components/ui";
import { CashAccountForm, CashTxForm } from "@/components/CashForms";

export const revalidate = 10;

export default async function CashPage() {
  let accounts = await getCashAccounts();
  if (accounts.length === 0) {
    const { createCashAccount } = await import("@/lib/actions");
    await createCashAccount("الخزنة الرئيسية");
    accounts = await getCashAccounts();
  }

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const allTx = accounts.flatMap((a) =>
    a.transactions.map((t) => ({ ...t, accountName: a.name }))
  );
  allTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      <PageHeader
        title="حسابات الخزنة"
        subtitle="الوارد من المبيعات والمنصرف للمشتريات والحركات اليدوية"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي الأرصدة" value={formatMoney(totalBalance)} />
        {accounts.slice(0, 3).map((a) => (
          <StatCard key={a.id} label={a.name} value={formatMoney(a.balance)} />
        ))}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Panel className="p-5">
          <h3 className="mb-4 font-medium">إضافة خزنة</h3>
          <CashAccountForm />
        </Panel>
        <Panel className="p-5">
          <h3 className="mb-4 font-medium">حركة يدوية</h3>
          <CashTxForm
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
          />
        </Panel>
      </div>

      <Panel>
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h3 className="font-medium">آخر الحركات</h3>
        </div>
        {allTx.length === 0 ? (
          <Empty message="لا توجد حركات بعد" />
        ) : (
          <Table headers={["التاريخ", "الخزنة", "النوع", "المبلغ", "المرجع", "البيان"]}>
            {allTx.slice(0, 50).map((t) => (
              <tr
                key={t.id}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="px-4 py-3">{formatDate(t.date)}</td>
                <td className="px-4 py-3">{t.accountName}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      t.type === "in" ? "text-[var(--ok)]" : "text-red-600"
                    }
                  >
                    {t.type === "in" ? "وارد" : "منصرف"}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{formatMoney(t.amount)}</td>
                <td className="px-4 py-3 text-xs text-[var(--muted)]">
                  {t.referenceType === "purchase"
                    ? "شراء"
                    : t.referenceType === "sales"
                      ? "بيع"
                      : "يدوي"}
                </td>
                <td className="px-4 py-3">{t.notes || "—"}</td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  );
}
