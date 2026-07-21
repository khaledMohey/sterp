import Link from "next/link";
import { formatMoney, formatDate } from "@/lib/utils";
import { PageHeader, Panel, Table, Empty, StatCard, Btn } from "@/components/ui";
import { PartyPaymentsPanel } from "@/components/PartyPaymentsPanel";

type StatementRow = {
  id: string;
  date: Date;
  number: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  href: string;
};

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

type StatementData = {
  party: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
  };
  type: "customer" | "supplier";
  rows: StatementRow[];
  pendingInstallments: PendingInst[];
  openCashInvoices: OpenCashInvoice[];
  summary: {
    totalDebit: number;
    totalCredit: number;
    balance: number;
    invoicesCount: number;
    pendingInstallmentsCount?: number;
    pendingInstallmentsAmount?: number;
  };
};

export function StatementView({
  data,
  backHref,
}: {
  data: StatementData;
  backHref: string;
}) {
  const isCustomer = data.type === "customer";
  const balanceLabel = isCustomer ? "مستحق على العميل" : "مستحق للمورد";
  const debitLabel = isCustomer ? "مبيعات" : "مشتريات";
  const creditLabel = isCustomer ? "محصّل" : "مدفوع";

  return (
    <div>
      <PageHeader
        title={`كشف حساب — ${data.party.name}`}
        subtitle={[
          data.party.phone,
          data.party.address,
          isCustomer ? "عميل" : "مورد",
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <Link href={backHref}>
            <Btn type="button" variant="secondary">
              رجوع
            </Btn>
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="عدد الفواتير" value={String(data.summary.invoicesCount)} />
        <StatCard label={`إجمالي ${debitLabel}`} value={formatMoney(data.summary.totalDebit)} />
        <StatCard label={`إجمالي ${creditLabel}`} value={formatMoney(data.summary.totalCredit)} />
        <StatCard
          label={balanceLabel}
          value={formatMoney(data.summary.balance)}
          hint={
            data.summary.balance === 0
              ? "لا يوجد رصيد"
              : "استخدم قسم التسديد بالأسفل"
          }
        />
      </div>

      {(data.summary.pendingInstallmentsCount ?? 0) > 0 && (
        <div className="mb-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3 text-sm">
          يوجد{" "}
          <strong>{data.summary.pendingInstallmentsCount}</strong> قسط معلّق
          بقيمة{" "}
          <strong>
            {formatMoney(data.summary.pendingInstallmentsAmount || 0)}
          </strong>
          — يمكنك التسديد من الجدول التالي مباشرة.
        </div>
      )}

      <PartyPaymentsPanel
        kind={data.type}
        pendingInstallments={data.pendingInstallments}
        openCashInvoices={data.openCashInvoices}
      />

      <Panel>
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h3 className="font-medium">حركة الحساب</h3>
        </div>
        {data.rows.length === 0 ? (
          <Empty message="لا توجد حركات على هذا الحساب" />
        ) : (
          <Table
            headers={["التاريخ", "البيان", "مدين", "دائن", "الرصيد", ""]}
          >
            {data.rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="px-4 py-3">{formatDate(row.date)}</td>
                <td className="px-4 py-3">{row.description}</td>
                <td className="px-4 py-3">{formatMoney(row.debit)}</td>
                <td className="px-4 py-3">{formatMoney(row.credit)}</td>
                <td className="px-4 py-3 font-medium">
                  {formatMoney(row.balance)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={row.href}
                    className="text-[var(--accent)] hover:underline"
                  >
                    الفاتورة
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
