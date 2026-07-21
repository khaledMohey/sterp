import Link from "next/link";
import { getCustomers } from "@/lib/actions";
import { PageHeader, Panel, Table, Empty } from "@/components/ui";
import { PartyForm, DeletePartyButton } from "@/components/PartyForm";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div>
      <PageHeader
        title="العملاء"
        subtitle="كشف الحساب فيه تحصيل الأقساط والمتبقي مباشرة"
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="p-5 lg:col-span-1">
          <h3 className="mb-4 font-medium">إضافة عميل</h3>
          <PartyForm type="customer" />
        </Panel>
        <Panel className="lg:col-span-2">
          {customers.length === 0 ? (
            <Empty message="لا يوجد عملاء بعد" />
          ) : (
            <Table headers={["الاسم", "الهاتف", "العنوان", "فواتير", ""]}>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.phone || "—"}</td>
                  <td className="px-4 py-3">{c.address || "—"}</td>
                  <td className="px-4 py-3">{c._count.salesInvoices}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/customers/${c.id}/statement`}
                        className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)]"
                      >
                        كشف حساب / تسديد
                      </Link>
                      <DeletePartyButton type="customer" id={c.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
      </div>
    </div>
  );
}
