import Link from "next/link";
import { getProducts, getSuppliers } from "@/lib/actions";
import { PageHeader, Btn } from "@/components/ui";
import { PurchaseForm } from "@/components/PurchaseForm";

export const revalidate = 60;

export default async function NewPurchasePage() {
  const [suppliers, products] = await Promise.all([
    getSuppliers(),
    getProducts(),
  ]);

  return (
    <div>
      <PageHeader
        title="فاتورة شراء جديدة"
        subtitle="اختر مورداً أو أدخله يدوياً — الأصناف تُضاف للمخزن كدفعات"
        actions={
          <Link href="/purchases">
            <Btn type="button" variant="secondary">
              رجوع
            </Btn>
          </Link>
        }
      />
      <PurchaseForm
        suppliers={suppliers.map((s) => ({
          id: s.id,
          name: s.name,
          phone: s.phone,
        }))}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
        }))}
      />
    </div>
  );
}
