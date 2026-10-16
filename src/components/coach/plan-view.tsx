import Link from "next/link";
import { fmt, type Messages } from "@/i18n";
import type { AssignedPlan, Exercise } from "@/lib/types";
import { currentWeekIndex, formatReps, formatRest } from "@/lib/domain/training";
import { formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

/** Vista de solo lectura del plan asignado a un cliente (ficha del coach). */
export function PlanView({
  plan,
  exercises,
  weekParam,
  m,
  canAssign,
}: {
  plan: AssignedPlan | null;
  exercises: Exercise[];
  weekParam?: string;
  m: Messages;
  canAssign: boolean;
}) {
  const t = m.training.plan;
  if (!plan) {
    return (
      <div className="text-xs text-fg-muted">
        {t.none}{" "}
        {canAssign && (
          <Link href="/coach/entrenamientos" className="text-accent underline">
            {t.assignFromPrograms}
          </Link>
        )}
      </div>
    );
  }

  const now = new Date();
  const current = currentWeekIndex(plan, now);
  const requested = Number(weekParam) - 1;
  const w = Number.isInteger(requested) && requested >= 0 && requested < plan.weeks.length ? requested : (current ?? 0);
  const week = plan.weeks[w];
  const exById = new Map(exercises.map((e) => [e.id, e]));
  const started = new Date(`${plan.startDate}T00:00:00`) <= now;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="text-[13px] font-semibold">{plan.name}</span>
        <span className="text-fg-muted">
          {t.startedOn}: {formatShortDate(`${plan.startDate}T00:00:00`)}
        </span>
        {current !== null ? (
          <Badge tone="accent">{fmt(t.week, { n: current + 1, total: plan.weeks.length })}</Badge>
        ) : started ? (
          <Badge>{t.finished}</Badge>
        ) : (
          <Badge tone="info">{fmt(t.notStarted, { date: formatShortDate(`${plan.startDate}T00:00:00`) })}</Badge>
        )}
      </div>

      <nav className="flex gap-1">
        {plan.weeks.map((wk, i) => (
          <Link
            key={wk.id}
            href={{ query: { tab: "training", semana: i + 1 } }}
            scroll={false}
            className={cn(
              "flex h-7 items-center gap-1 rounded px-2.5 text-xs tnum",
              i === w ? "bg-surface-2 font-medium" : "text-fg-muted hover:bg-surface",
              i === current && "ring-1 ring-accent",
            )}
          >
            S{i + 1}
            {wk.isDeload && <span className="text-2xs text-info">· {m.training.builder.deload.toLowerCase()}</span>}
          </Link>
        ))}
      </nav>

      {week.isDeload && <p className="text-xs text-info">{fmt(m.training.builder.deloadAt, { pct: week.deloadPercent })}</p>}

      <div className="grid gap-3 xl:grid-cols-2">
        {week.days.map((day) => (
          <Panel key={day.id} title={day.name} count={day.items.length}>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-2xs text-fg-muted uppercase">
                  <th className="py-1 pl-3 text-left font-medium">Ejercicio</th>
                  <th className="w-12 py-1 text-right font-medium">{m.training.builder.sets}</th>
                  <th className="w-16 py-1 text-right font-medium">{m.training.builder.reps}</th>
                  <th className="w-12 py-1 text-right font-medium">{m.training.builder.rir}</th>
                  <th className="w-16 py-1 pr-3 text-right font-medium">{m.training.builder.rest}</th>
                </tr>
              </thead>
              <tbody>
                {day.items.map((it) => (
                  <tr key={it.id} className="border-t border-border">
                    <td className="py-1.5 pl-3">
                      {exById.get(it.exerciseId)?.name ?? "—"}
                      {it.notes && <div className="text-2xs text-fg-subtle">{it.notes}</div>}
                    </td>
                    <td className="text-right tnum">{it.sets}</td>
                    <td className="text-right tnum">{formatReps(it.repsMin, it.repsMax)}</td>
                    <td className="text-right tnum">{it.rir ?? "—"}</td>
                    <td className="pr-3 text-right whitespace-nowrap tnum text-fg-muted">{formatRest(it.restSec)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        ))}
      </div>
    </div>
  );
}
