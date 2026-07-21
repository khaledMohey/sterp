import Link from "next/link";
import { getCustomers, getProducts } from "@/lib/actions";
import { PageHeader, Btn } from "@/components/ui";
import { SalesForm } from "@/components/SalesForm";

export const revalidate = 60;

export default async function NewSalesPage() {
  const [customers, products] = await Promise.all([
    getCustomers(),
    getProducts(),
  ]);

  return (
    <div>
      <PageHeader
        title="فاتورة بيع جديدة"
        subtitle="اختر عميلاً أو أدخله يدوياً — السحب من الدفعات الأقدم تلقائياً"
        actions={
          <Link href="/sales">
            <Btn type="button" variant="secondary">
              رجوع
            </Btn>
          </Link>
        }
      />
      <SalesForm
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
        }))}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          stockQty: p.stockQty,
        }))}
      />
    </div>
  );
}
