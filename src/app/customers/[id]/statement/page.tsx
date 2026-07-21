import { notFound } from "next/navigation";
import { getCustomerStatement } from "@/lib/actions";
import { StatementView } from "@/components/StatementView";

export const revalidate = 30;

export default async function CustomerStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getCustomerStatement(id);
  if (!data) notFound();

  return <StatementView data={data} backHref="/customers" />;
}
