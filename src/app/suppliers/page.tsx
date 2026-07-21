import Link from "next/link";
import { getSuppliers } from "@/lib/actions";
import { PageHeader, Panel, Table, Empty } from "@/components/ui";
import { PartyForm, DeletePartyButton } from "@/components/PartyForm";

export const revalidate = 10;

export default async function SuppliersPage() {
  const suppliers = await getSuppliers();

  return (
    <div>
      <PageHeader
        title="الموردين"
        subtitle="كشف الحساب فيه تسديد الأقساط والمتبقي مباشرة"
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="p-5 lg:col-span-1">
          <h3 className="mb-4 font-medium">إضافة مورد</h3>
          <PartyForm type="supplier" />
        </Panel>
        <Panel className="lg:col-span-2">
          {suppliers.length === 0 ? (
            <Empty message="لا يوجد موردين بعد" />
          ) : (
            <Table headers={["الاسم", "الهاتف", "العنوان", "فواتير", ""]}>
              {suppliers.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">{s.phone || "—"}</td>
                  <td className="px-4 py-3">{s.address || "—"}</td>
                  <td className="px-4 py-3">{s._count.purchaseInvoices}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/suppliers/${s.id}/statement`}
                        className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)]"
                      >
                        كشف حساب / تسديد
                      </Link>
                      <DeletePartyButton type="supplier" id={s.id} />
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
