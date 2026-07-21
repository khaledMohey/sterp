import { notFound } from "next/navigation";
import { getSupplierStatement } from "@/lib/actions";
import { StatementView } from "@/components/StatementView";

export const revalidate = 30;

export default async function SupplierStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getSupplierStatement(id);
  if (!data) notFound();

  return <StatementView data={data} backHref="/suppliers" />;
}
