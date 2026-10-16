import Link from "next/link";
import { Check, ChevronRight, Footprints, Salad } from "lucide-react";
import { getSession, getClientRow } from "@/lib/data";
import { getActivePlan } from "@/lib/data/training";
import { listSessions } from "@/lib/data/workouts";
import { getActiveDiet } from "@/lib/data/nutrition";
import { currentWeekIndex } from "@/lib/domain/training";
import { kcalOf } from "@/lib/domain/nutrition";
import { formatNumber, formatShortDate, weekdayName } from "@/lib/dates";
import { isCheckinMissing } from "@/lib/domain/risk";
import { cn } from "@/lib/cn";

export const metadata = { title: "Hoy · Siju" };

export default async function ClientToday({ searchParams }: { searchParams: Promise<{ hecho?: string }> }) {
  const { hecho } = await searchParams;
  const session = await getSession();
  if (!session.clientId) return null;
  const [row, plan, sessions, diet] = await Promise.all([
    getClientRow(session, session.clientId),
    getActivePlan(session, session.clientId),
    listSessions(session, session.clientId),
    getActiveDiet(session, session.clientId),
  ]);
  if (!row) return null;

  const now = new Date();
  const { client, activity } = row;
  const firstName = client.fullName.split(" ")[0];
  const steps = activity.stepsToday ?? 0;
  const pct = Math.min(1, steps / client.stepGoal);

  const w = plan ? currentWeekIndex(plan, now) : null;
  const week = plan && w !== null ? plan.weeks[w] : null;
  const doneIds = new Set(sessions.filter((s) => s.planId === plan?.id && s.weekIndex === w && s.completedAt).map((s) => s.dayId));
  const next = week?.days.find((d) => !doneIds.has(d.id)) ?? null;

  return (
    <div className="flex flex-col gap-3 px-4">
      <header className="pt-2 pb-1">
        <p className="text-xs text-fg-muted">
          <span className="capitalize">{weekdayName(now.getDay())}</span>, {formatShortDate(now.toISOString())}
        </p>
        <h1 className="text-lg font-semibold">Hola, {firstName}</h1>
      </header>

      {hecho && (
        <p className="rounded border border-ok/40 bg-ok-soft px-3 py-2.5 font-medium text-ok">Entreno guardado. ¡Buen trabajo!</p>
      )}

      {isCheckinMissing(row, now) && (
        <Link href="/app/check-in" className="flex items-center justify-between rounded border border-warn/40 bg-warn-soft px-3 py-3 text-warn">
          <span className="font-medium">Tienes el check-in semanal pendiente</span>
          <ChevronRight className="size-4" />
        </Link>
      )}

      {/* Entreno */}
      <section className="rounded border border-border bg-bg">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <h2 className="text-xs font-semibold tracking-wide text-fg-muted uppercase">Entreno</h2>
          {plan && w !== null && (
            <span className="text-xs text-fg-muted">
              Semana {w + 1} de {plan.weeks.length}
              {week?.isDeload && <span className="ml-1.5 font-medium text-info">· descarga</span>}
            </span>
          )}
        </div>

        {!plan ? (
          <p className="px-3 py-5 text-center text-xs text-fg-subtle">Tu coach aún no te ha asignado un plan.</p>
        ) : w === null ? (
          <p className="px-3 py-5 text-center text-xs text-fg-subtle">
            {new Date(`${plan.startDate}T00:00:00`) > now
              ? `Tu plan "${plan.name}" empieza el ${formatShortDate(`${plan.startDate}T00:00:00`)}.`
              : `Has terminado "${plan.name}". Tu coach te asignará el siguiente.`}
          </p>
        ) : (
          <>
            {next ? (
              <Link href={`/app/entreno/${w + 1}/${next.id}`} className="m-3 flex items-center justify-between rounded bg-accent px-4 py-3.5 text-accent-fg">
                <span>
                  <span className="block text-xs opacity-80">Siguiente</span>
                  <span className="text-base font-semibold">{next.name}</span>
                  <span className="ml-2 text-xs opacity-80">{next.items.length} ejercicios</span>
                </span>
                <ChevronRight className="size-5" />
              </Link>
            ) : (
              <p className="m-3 rounded bg-ok-soft px-3 py-3 text-center font-medium text-ok">Semana completada</p>
            )}
            <ul>
              {week!.days.map((d) => {
                const done = doneIds.has(d.id);
                return (
                  <li key={d.id} className="border-t border-border">
                    <Link href={`/app/entreno/${w + 1}/${d.id}`} className="flex h-12 items-center gap-3 px-3">
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full border",
                          done ? "border-ok bg-ok text-white" : "border-border-strong",
                        )}
                      >
                        {done && <Check className="size-3.5" />}
                      </span>
                      <span className={cn("flex-1", done && "text-fg-muted")}>{d.name}</span>
                      <span className="text-xs text-fg-subtle">{d.items.length} ej.</span>
                      <ChevronRight className="size-4 text-fg-subtle" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* Dieta */}
      {diet && (
        <Link href="/app/dieta" className="flex items-center gap-3 rounded border border-border bg-bg px-3 py-3">
          <Salad className="size-5 text-fg-muted" strokeWidth={1.75} />
          <span className="flex-1">
            <span className="block font-medium">Dieta de hoy</span>
            <span className="text-xs text-fg-muted">
              {diet.days.map((d) => `${d.name}: ${formatNumber(kcalOf(d.targets))} kcal`).join(" · ")}
            </span>
          </span>
          <ChevronRight className="size-4 text-fg-subtle" />
        </Link>
      )}

      {/* Pasos */}
      <section className="rounded border border-border bg-bg px-3 py-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium">
            <Footprints className="size-4 text-fg-muted" strokeWidth={1.75} />
            Pasos de hoy
          </span>
          <span className="tnum">
            <strong>{formatNumber(steps)}</strong>
            <span className="text-fg-muted"> / {formatNumber(client.stepGoal)}</span>
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-sm bg-surface-2">
          <div className={`h-full ${pct >= 0.7 ? "bg-accent" : "bg-warn"}`} style={{ width: `${pct * 100}%` }} />
        </div>
      </section>
    </div>
  );
}
