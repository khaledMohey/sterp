import { getProducts } from "@/lib/actions";
import { formatMoney, formatDate } from "@/lib/utils";
import { PageHeader, Panel, Table, Empty, StatCard } from "@/components/ui";
import { ProductForm } from "@/components/ProductForm";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const products = await getProducts();
  const totalQty = products.reduce((s, p) => s + p.stockQty, 0);
  const totalValue = products.reduce((s, p) => s + p.stockValue, 0);
  const batchCount = products.reduce((s, p) => s + p.batches.length, 0);

  return (
    <div>
      <PageHeader
        title="المخزن"
        subtitle="الأصناف مقسّمة إلى دفعات — كل دفعة لها سعر شراء وبيع مستقل"
        actions={<ProductForm />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="أصناف" value={String(products.length)} />
        <StatCard label="دفعات نشطة" value={String(batchCount)} />
        <StatCard
          label="قيمة المخزون"
          value={formatMoney(totalValue)}
          hint={`كمية إجمالية: ${totalQty}`}
        />
      </div>

      <Panel>
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h3 className="font-medium">الأصناف والدفعات</h3>
        </div>
        {products.length === 0 ? (
          <Empty message="لا يوجد أصناف — أضف صنفاً أو أنشئ فاتورة شراء" />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {products.map((p) => (
              <div key={p.id} className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h4 className="font-medium text-[var(--ink)]">{p.name}</h4>
                    <p className="text-xs text-[var(--muted)]">
                      {p.sku ? `كود: ${p.sku} · ` : ""}
                      الوحدة: {p.unit}
                    </p>
                  </div>
                  <div className="text-left text-sm">
                    <span className="text-[var(--muted)]">المتبقي: </span>
                    <span className="font-semibold">{p.stockQty}</span>
                    <span className="mx-2 text-[var(--border)]">|</span>
                    <span className="text-[var(--muted)]">القيمة: </span>
                    <span className="font-semibold">{formatMoney(p.stockValue)}</span>
                  </div>
                </div>
                {p.batches.length > 0 ? (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)]">
                    <Table
                      headers={[
                        "تاريخ الدفعة",
                        "الكمية الأصلية",
                        "المتبقي",
                        "سعر الشراء",
                        "سعر البيع",
                      ]}
                    >
                      {p.batches.map((b) => (
                        <tr
                          key={b.id}
                          className="border-b border-[var(--border)] last:border-0"
                        >
                          <td className="px-4 py-2">{formatDate(b.purchaseDate)}</td>
                          <td className="px-4 py-2">{b.quantity}</td>
                          <td className="px-4 py-2 font-medium">{b.remainingQty}</td>
                          <td className="px-4 py-2">{formatMoney(b.purchasePrice)}</td>
                          <td className="px-4 py-2">{formatMoney(b.sellPrice)}</td>
                        </tr>
                      ))}
                    </Table>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[var(--muted)]">لا دفعات متبقية</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
