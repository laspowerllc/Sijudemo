import Link from "next/link";
import { notFound } from "next/navigation";
import { getMessages } from "@/i18n";
import { getSession } from "@/lib/data";
import { listActiveDietsByClient, listDiets } from "@/lib/data/nutrition";
import { kcalOf } from "@/lib/domain/nutrition";
import { formatNumber, formatShortDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { NutritionTabs } from "@/components/coach/nutrition-tabs";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Empty } from "@/components/ui/panel";
import { archiveDietAction, createDietAction, duplicateDietAction } from "./actions";

export const metadata = { title: "Dietas · Siju" };

export default async function DietsPage() {
  const session = await getSession();
  if (session.role !== "owner") notFound();
  const [diets, assigned] = await Promise.all([listDiets(session), listActiveDietsByClient(session)]);
  const m = getMessages();
  const t = m.nutrition;

  const count = new Map<string, number>();
  for (const a of assigned.values()) if (a.sourceDietId) count.set(a.sourceDietId, (count.get(a.sourceDietId) ?? 0) + 1);

  return (
    <>
      <PageHeader
        title={t.title}
        actions={
          <form action={createDietAction} className="flex gap-2">
            <Input name="name" placeholder={t.dietName} required minLength={2} maxLength={80} className="w-64" aria-label={t.dietName} />
            <Button type="submit" variant="primary">{t.newDiet}</Button>
          </form>
        }
      />
      <NutritionTabs m={m} active="diets" />
      {diets.length === 0 ? (
        <Empty>{t.noDiets}</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th className="pl-5">{t.dietName}</Th>
              <Th>{t.dayTypes}</Th>
              <Th className="text-right">{t.kcalRange}</Th>
              <Th className="text-right">{t.assignedTo}</Th>
              <Th>{t.updated}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {diets.map((d) => {
              const kcals = d.days.map((day) => kcalOf(day.targets));
              const min = Math.min(...kcals);
              const max = Math.max(...kcals);
              return (
                <Tr key={d.id}>
                  <Td className="pl-5">
                    <Link href={`/coach/nutricion/dietas/${d.id}`} className="font-medium hover:text-accent hover:underline">{d.name}</Link>
                    {d.description && <div className="max-w-md truncate text-2xs text-fg-subtle">{d.description}</div>}
                  </Td>
                  <Td className="text-fg-muted">{d.days.map((x) => x.name).join(" · ")}</Td>
                  <Td className="text-right tnum">{min === max ? formatNumber(min) : `${formatNumber(min)}–${formatNumber(max)}`}</Td>
                  <Td className="text-right tnum">{count.get(d.id) ?? 0}</Td>
                  <Td className="tnum text-fg-muted">{formatShortDate(d.updatedAt)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <ButtonLink href={`/coach/nutricion/dietas/${d.id}`} size="sm" variant="ghost">{m.training.open}</ButtonLink>
                      <form action={duplicateDietAction}>
                        <input type="hidden" name="id" value={d.id} />
                        <Button type="submit" size="sm" variant="ghost">{m.training.duplicate}</Button>
                      </form>
                      <form action={archiveDietAction}>
                        <input type="hidden" name="id" value={d.id} />
                        <Button type="submit" size="sm" variant="ghost">{m.training.archive}</Button>
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
