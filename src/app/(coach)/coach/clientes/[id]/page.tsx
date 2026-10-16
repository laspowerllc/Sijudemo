import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getMessages, fmt, type Messages } from "@/i18n";
import { getSession, getClientRow } from "@/lib/data";
import { getActivePlan, getExercisesByIds } from "@/lib/data/training";
import { PlanView } from "@/components/coach/plan-view";
import { getActiveDiet } from "@/lib/data/nutrition";
import { DietView } from "@/components/coach/diet-view";
import { riskReasons } from "@/lib/domain/risk";
import { formatMoney, formatNumber, formatPercent, formatRelativeDays, formatShortDate, weekdayName } from "@/lib/dates";
import { CLIENT_STATUS_TONE, PAYMENT_TONE } from "@/lib/status";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { ClientRow, Session } from "@/lib/types";

type Tab = keyof Messages["clientDetail"]["tabs"];
const TABS: Tab[] = ["summary", "training", "nutrition", "checkins", "progress", "chat", "payments"];

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; semana?: string; dia?: string }>;
}) {
  const [{ id }, { tab: tabParam, semana, dia }] = await Promise.all([params, searchParams]);
  const session = await getSession();
  // Devuelve null si el cliente no existe o el usuario no tiene permiso: 404 en ambos casos.
  const row = await getClientRow(session, id);
  if (!row) notFound();

  const m = getMessages();
  const now = new Date();
  const tabs = TABS.filter((t) => t !== "payments" || session.role === "owner");
  const tab: Tab = tabs.includes(tabParam as Tab) ? (tabParam as Tab) : "summary";
  const { client } = row;
  const reasons = client.status === "active" ? riskReasons(row, now) : [];

  return (
    <>
      <div className="border-b border-border px-5 pt-3">
        <Link href="/coach/clientes" className="text-xs text-fg-muted hover:text-fg">
          ← {m.clients.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold">{client.fullName}</h1>
            <Badge tone={CLIENT_STATUS_TONE[client.status]}>{m.clientStatus[client.status]}</Badge>
            {reasons.length >= 2 && <Badge tone="danger">{m.dashboard.atRisk}</Badge>}
          </div>
          <div className="flex gap-2">
            <Button size="sm">{m.clientDetail.edit}</Button>
            {client.status === "active" && <Button size="sm">{m.clientDetail.pause}</Button>}
            {client.status === "paused" && <Button size="sm">{m.clientDetail.resume}</Button>}
          </div>
        </div>
        <nav className="mt-2 -mb-px flex gap-4">
          {tabs.map((t) => (
            <Link
              key={t}
              href={{ query: t === "summary" ? {} : { tab: t } }}
              className={cn(
                "border-b-2 pb-2 text-xs",
                t === tab ? "border-accent font-medium text-fg" : "border-transparent text-fg-muted hover:text-fg",
              )}
            >
              {m.clientDetail.tabs[t]}
            </Link>
          ))}
        </nav>
      </div>

      <div className="p-5">
        {tab === "summary" ? (
          <Summary row={row} session={session} m={m} now={now} />
        ) : tab === "training" ? (
          <TrainingTab session={session} clientId={client.id} semana={semana} m={m} />
        ) : tab === "nutrition" ? (
          <DietView diet={await getActiveDiet(session, client.id)} dayParam={dia} m={m} canAssign={session.role === "owner"} />
        ) : (
          <p className="text-xs text-fg-subtle">{m.clientDetail.comingSoon}</p>
        )}
      </div>
    </>
  );
}

function Summary({ row, session, m, now }: { row: ClientRow; session: Session; m: Messages; now: Date }) {
  const { client, activity, subscription } = row;
  const d = m.clientDetail;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <Panel title={d.goal} bodyClassName="p-3">
          <p>{client.goal || "—"}</p>
        </Panel>
        <Panel
          title={d.injuries}
          actions={<Badge tone="warn"><ShieldAlert className="mr-1 size-3" />{d.sensitive}</Badge>}
          bodyClassName="p-3"
        >
          <p className={client.injuries ? undefined : "text-fg-subtle"}>{client.injuries || "Sin lesiones registradas."}</p>
        </Panel>
        <Panel title={d.notes} bodyClassName="p-3">
          <p className={cn("whitespace-pre-line", !client.notes && "text-fg-subtle")}>{client.notes || "—"}</p>
        </Panel>
      </div>

      <Panel title="Datos" bodyClassName="text-[13px]">
        <dl className="divide-y divide-border">
          <Row label={d.since} value={formatShortDate(client.startedAt)} />
          <Row label={m.clients.cols.lastWorkout} value={formatRelativeDays(activity.lastWorkoutAt, now)} />
          <Row label={m.clients.cols.adherence} value={formatPercent(activity.adherence14d)} />
          <Row label={d.checkinDay} value={<span className="capitalize">{weekdayName(client.checkinWeekday)}</span>} />
          <Row label={d.stepGoal} value={formatNumber(client.stepGoal)} />
          <Row label={d.timezone} value={client.timezone} />
          {session.role === "owner" && <Row label={d.assigned} value={row.assignedNames.join(", ") || "Solo propietario"} />}
          {session.role === "owner" && subscription && (
            <Row
              label={m.clients.cols.payment}
              value={
                <span className="flex items-center gap-2">
                  <span className="tnum">
                    {formatMoney(subscription.priceCents)}/{subscription.interval === "month" ? "mes" : "trim."}
                  </span>
                  <Badge tone={PAYMENT_TONE[subscription.paymentStatus]}>{m.payment[subscription.paymentStatus]}</Badge>
                </span>
              }
            />
          )}
          <Row
            label={d.consent}
            value={
              client.sensitiveConsentAt ? (
                <span className="text-ok">{fmt(d.consentGiven, { date: formatShortDate(client.sensitiveConsentAt) })}</span>
              ) : (
                <span className="text-warn">{d.consentMissing}</span>
              )
            }
          />
        </dl>
      </Panel>
    </div>
  );
}

async function TrainingTab({ session, clientId, semana, m }: { session: Session; clientId: string; semana?: string; m: Messages }) {
  const plan = await getActivePlan(session, clientId);
  const ids = plan ? plan.weeks.flatMap((w) => w.days.flatMap((d) => d.items.map((i) => i.exerciseId))) : [];
  const exercises = await getExercisesByIds(session, ids);
  return <PlanView plan={plan} exercises={exercises} weekParam={semana} m={m} canAssign={session.role === "owner"} />;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2">
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
