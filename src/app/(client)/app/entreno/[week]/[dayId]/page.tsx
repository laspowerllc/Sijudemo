import Link from "next/link";
import { notFound } from "next/navigation";
import { getMessages } from "@/i18n";
import { getClientRow, getSession } from "@/lib/data";
import { getActivePlan, getExercisesByIds } from "@/lib/data/training";
import { getExerciseHistory, listSessions } from "@/lib/data/workouts";
import { recommendWeight } from "@/lib/domain/progression";
import { parseVideoUrl } from "@/lib/domain/training";
import { WorkoutLogger, type LoggerItem } from "@/components/client/workout-logger";

export const metadata = { title: "Entreno · Siju" };

export default async function WorkoutPage({ params }: { params: Promise<{ week: string; dayId: string }> }) {
  const { week: weekParam, dayId } = await params;
  const session = await getSession();
  if (session.role !== "client" || !session.clientId) notFound();

  const [plan, row] = await Promise.all([getActivePlan(session, session.clientId), getClientRow(session, session.clientId)]);
  const weekIndex = Number(weekParam) - 1;
  const week = plan?.weeks[weekIndex];
  const day = week?.days.find((d) => d.id === dayId);
  if (!plan || !week || !day || !row) notFound();

  const [exercises, history, sessions] = await Promise.all([
    getExercisesByIds(session, day.items.map((i) => i.exerciseId)),
    getExerciseHistory(session, session.clientId),
    listSessions(session, session.clientId),
  ]);
  const exById = new Map(exercises.map((e) => [e.id, e]));
  const done = sessions.find((s) => s.planId === plan.id && s.weekIndex === weekIndex && s.dayId === day.id && s.completedAt);

  const items: LoggerItem[] = day.items.map((it) => {
    const ex = exById.get(it.exerciseId);
    const past = history.get(it.exerciseId) ?? [];
    const loaded = !!ex && !["bodyweight", "other"].includes(ex.equipment);
    const rec =
      ex && loaded
        ? recommendWeight({
            history: past,
            repsMax: it.repsMax,
            isDeloadWeek: week.isDeload,
            deloadPercent: week.deloadPercent,
            muscleGroup: ex.muscleGroup,
            equipment: ex.equipment,
          })
        : null;
    const last = past.find((p) => !p.isDeload) ?? past[0] ?? null;
    return {
      item: it,
      name: ex?.name ?? "Ejercicio",
      instructions: ex?.instructions ?? "",
      videoUrl: ex?.videoUrl && parseVideoUrl(ex.videoUrl) ? ex.videoUrl : null,
      loaded,
      recommendation: rec,
      lastSets: last ? last.sets : null,
      lastDate: last?.date ?? null,
    };
  });

  const m = getMessages();
  return (
    <div className="px-4">
      <Link href="/app" className="text-xs text-fg-muted">← {m.clientNav.today}</Link>
      <WorkoutLogger
        planId={plan.id}
        weekIndex={weekIndex}
        totalWeeks={plan.weeks.length}
        isDeload={week.isDeload}
        deloadPercent={week.deloadPercent}
        dayId={day.id}
        dayName={day.name}
        items={items}
        completed={done ? { id: done.id, completedAt: done.completedAt!, sets: done.sets, startedAt: done.startedAt } : null}
        canLog={row.client.status === "active"}
      />
    </div>
  );
}
