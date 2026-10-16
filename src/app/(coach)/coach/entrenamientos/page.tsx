import Link from "next/link";
import { notFound } from "next/navigation";
import { getMessages } from "@/i18n";
import { getSession } from "@/lib/data";
import { listActivePlansByClient, listPrograms } from "@/lib/data/training";
import { formatShortDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { TrainingTabs } from "@/components/coach/training-tabs";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Empty } from "@/components/ui/panel";
import { archiveProgramAction, createProgramAction, duplicateProgramAction } from "./actions";

export const metadata = { title: "Rutinas · Siju" };

export default async function ProgramsPage() {
  const session = await getSession();
  if (session.role !== "owner") notFound();
  const [programs, plans] = await Promise.all([listPrograms(session), listActivePlansByClient(session)]);
  const m = getMessages();
  const t = m.training;

  const assignedCount = new Map<string, number>();
  for (const p of plans.values()) if (p.sourceProgramId) assignedCount.set(p.sourceProgramId, (assignedCount.get(p.sourceProgramId) ?? 0) + 1);

  return (
    <>
      <PageHeader
        title={t.title}
        actions={
          <form action={createProgramAction} className="flex gap-2">
            <Input name="name" placeholder={t.newProgramName} required minLength={2} maxLength={80} className="w-64" aria-label={t.newProgramName} />
            <Button type="submit" variant="primary">{t.newProgram}</Button>
          </form>
        }
      />
      <TrainingTabs m={m} active="programs" />
      {programs.length === 0 ? (
        <Empty>{t.noPrograms}</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th className="pl-5">{t.newProgramName}</Th>
              <Th className="text-right">{t.weeks}</Th>
              <Th className="text-right">{t.days}</Th>
              <Th className="text-right">{t.exercisesCount}</Th>
              <Th className="text-right">{t.assignedTo}</Th>
              <Th>{t.updated}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {programs.map((p) => {
              const deloads = p.weeks.filter((w) => w.isDeload).length;
              const days = Math.max(...p.weeks.map((w) => w.days.length));
              const exercises = new Set(p.weeks.flatMap((w) => w.days.flatMap((d) => d.items.map((i) => i.exerciseId)))).size;
              return (
                <Tr key={p.id}>
                  <Td className="pl-5">
                    <Link href={`/coach/entrenamientos/rutinas/${p.id}`} className="font-medium hover:text-accent hover:underline">
                      {p.name}
                    </Link>
                    {p.description && <div className="max-w-md truncate text-2xs text-fg-subtle">{p.description}</div>}
                  </Td>
                  <Td className="text-right tnum">
                    {p.weeks.length}
                    {deloads > 0 && <Badge className="ml-1.5">{deloads} {t.builder.deload.toLowerCase()}</Badge>}
                  </Td>
                  <Td className="text-right tnum">{days}</Td>
                  <Td className="text-right tnum">{exercises}</Td>
                  <Td className="text-right tnum">{assignedCount.get(p.id) ?? 0}</Td>
                  <Td className="tnum text-fg-muted">{formatShortDate(p.updatedAt)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <ButtonLink href={`/coach/entrenamientos/rutinas/${p.id}`} size="sm" variant="ghost">{t.open}</ButtonLink>
                      <form action={duplicateProgramAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <Button type="submit" size="sm" variant="ghost">{t.duplicate}</Button>
                      </form>
                      <form action={archiveProgramAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <Button type="submit" size="sm" variant="ghost">{t.archive}</Button>
                      </form>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
