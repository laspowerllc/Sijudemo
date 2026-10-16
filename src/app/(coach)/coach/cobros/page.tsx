import { notFound } from "next/navigation";
import { getSession } from "@/lib/data";
import { ComingSoon } from "@/components/coming-soon";

export default async function Page() {
  const session = await getSession();
  if (session.role !== "owner") notFound();
  return <ComingSoon title="Cobros" phase="F8" />;
}
