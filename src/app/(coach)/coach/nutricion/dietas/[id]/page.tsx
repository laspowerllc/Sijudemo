import { notFound } from "next/navigation";
import { getMessages } from "@/i18n";
import { getSession, listClientRows } from "@/lib/data";
import { getDiet, listActiveDietsByClient, listDishes, listFoods } from "@/lib/data/nutrition";
import type { AssignableClient } from "@/components/coach/assign-dialog";
import { DietBuilder } from "./diet-builder";

export const metadata = { title: "Dieta · Siju" };

export default async function DietPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const diet = await getDiet(session, id);
  if (!diet) notFound();

  const [foods, dishes, rows, assigned] = await Promise.all([
    listFoods(session),
    listDishes(session),
    listClientRows(session),
    listActiveDietsByClient(session),
  ]);
  const clients: AssignableClient[] = rows
    .map((r) => ({ id: r.client.id, name: r.client.fullName, status: r.client.status, current: assigned.get(r.client.id)?.name ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  return (
    <DietBuilder
      initial={diet}
      foods={foods}
      dishes={dishes}
      clients={clients}
      today={new Date().toISOString().slice(0, 10)}
      m={getMessages()}
    />
  );
}
