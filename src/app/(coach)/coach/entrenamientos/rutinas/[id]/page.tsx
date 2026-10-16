import { notFound } from "next/navigation";
import { getMessages } from "@/i18n";
import { getSession, listClientRows } from "@/lib/data";
import { getProgram, listActivePlansByClient, listExercises } from "@/lib/data/training";
import { nextMonday } from "@/lib/domain/training";
import { ProgramBuilder } from "./program-builder";
import type { AssignableClient } from "@/components/coach/assign-dialog";

export const metadata = { title: "Rutina · Siju" };

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const program = await getProgram(session, id);
  if (!program) notFound();

  const [exercises, rows, plans] = await Promise.all([listExercises(session), listClientRows(session), listActivePlansByClient(session)]);
  const clients: AssignableClient[] = rows
    .map((r) => ({
      id: r.client.id,
      name: r.client.fullName,
      status: r.client.status,
      current: plans.get(r.client.id)?.name ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  return (
    <ProgramBuilder
      initial={program}
      exercises={exercises.map((e) => ({ id: e.id, name: e.name, muscleGroup: e.muscleGroup }))}
      clients={clients}
      defaultStart={nextMonday(new Date())}
      m={getMessages()}
    />
  );
}
