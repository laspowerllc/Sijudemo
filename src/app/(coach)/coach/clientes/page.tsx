import Link from "next/link";
import { getMessages, fmt } from "@/i18n";
import { getOrganization, getSession, listClientRows, listMembers } from "@/lib/data";
import { isCheckinMissing, isAtRisk } from "@/lib/domain/risk";
import { PLAN_LIMITS, TRIAL_PLAN } from "@/lib/domain/plans";
import { formatDaysUntil, formatNumber, formatPercent, formatRelativeDays, weekdayName } from "@/lib/dates";
import { CLIENT_STATUS_TONE, PAYMENT_TONE } from "@/lib/status";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/form";
import { Empty } from "@/components/ui/panel";
import { InviteClientDialog } from "@/components/coach/invite-client-dialog";
import type { ClientRow, ClientStatus } from "@/lib/types";

export const metadata = { title: "Clientes · Siju" };

const FILTERS: (ClientStatus | "all" | "risk")[] = ["all", "active", "paused", "expired", "invited", "risk"];

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>;
}) {
  const { estado = "all", q = "" } = await searchParams;
  const session = await getSession();
  const [rows, org, members] = await Promise.all([listClientRows(session), getOrganization(session), listMembers(session)]);
  const m = getMessages();
  const now = new Date();
  const isOwner = session.role === "owner";

  const counts = {
    all: rows.length,
    active: 0, paused: 0, expired: 0, invited: 0,
    risk: rows.filter((r) => isAtRisk(r, now)).length,
  };
  rows.forEach((r) => counts[r.client.status]++);

  const query = q.trim().toLowerCase();
  const filtered = rows
    .filter((r) => (estado === "all" ? true : estado === "risk" ? isAtRisk(r, now) : r.client.status === estado))
    .filter((r) => !query || r.client.fullName.toLowerCase().includes(query) || r.client.email.includes(query))
    .sort((a, b) => a.client.fullName.localeCompare(b.client.fullName, "es"));

  const limits = org ? PLAN_LIMITS[org.billingStatus === "trialing" ? TRIAL_PLAN : org.plan] : null;
  const limitText = limits?.maxActiveClients
    ? fmt(m.clients.limit, { count: counts.active, max: limits.maxActiveClients })
    : fmt(m.clients.limitUnlimited, { count: counts.active });
  const limitReached = !!limits?.maxActiveClients && counts.active >= limits.maxActiveClients;

  const filterLabel = (f: (typeof FILTERS)[number]) =>
    f === "all" ? m.clients.all : f === "risk" ? m.dashboard.atRisk : m.clientStatus[f];

  return (
    <>
      <PageHeader
        title={m.clients.title}
        meta={isOwner ? limitText : undefined}
        actions={
          isOwner && (
            <InviteClientDialog
              m={m}
              disabled={limitReached || org?.billingStatus === "read_only"}
              members={members.map((x) => ({ id: x.id, name: x.fullName, role: x.role }))}
            />
          )
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-2">
        <nav className="flex gap-1">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={{ query: { ...(f !== "all" && { estado: f }), ...(q && { q }) } }}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded px-2 text-xs",
                estado === f ? "bg-surface-2 font-medium text-fg" : "text-fg-muted hover:bg-surface",
              )}
            >
              {filterLabel(f)}
              <span className="tnum text-fg-subtle">{counts[f]}</span>
            </Link>
          ))}
        </nav>
        <form className="w-64">
          {estado !== "all" && <input type="hidden" name="estado" value={estado} />}
          <Input type="search" name="q" defaultValue={q} placeholder={m.clients.search} aria-label={m.clients.search} />
        </form>
      </div>

      {filtered.length === 0 ? (
        <Empty>{m.clients.empty}</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th className="pl-5">{m.clients.cols.name}</Th>
              <Th>{m.clients.cols.status}</Th>
              {isOwner && <Th>{m.clients.cols.coach}</Th>}
              <Th className="text-right">{m.clients.cols.adherence}</Th>
              <Th>{m.clients.cols.lastWorkout}</Th>
              <Th>{m.clients.cols.checkin}</Th>
              <Th className="text-right">{m.clients.cols.steps}</Th>
              {isOwner && <Th>{m.clients.cols.payment}</Th>}
              {isOwner && <Th>{m.clients.cols.renews}</Th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <Tr key={r.client.id}>
                <Td className="pl-5">
                  <Link href={`/coach/clientes/${r.client.id}`} className="font-medium hover:text-accent hover:underline">
                    {r.client.fullName}
                  </Link>
                  <div className="text-2xs text-fg-subtle">{r.client.email}</div>
                </Td>
                <Td>
                  <Badge tone={CLIENT_STATUS_TONE[r.client.status]}>{m.clientStatus[r.client.status]}</Badge>
                </Td>
                {isOwner && <Td className="text-fg-muted">{r.assignedNames.join(", ") || "—"}</Td>}
                <Td className="text-right">
                  <Adherence value={r.activity.adherence14d} />
                </Td>
                <Td className="tnum text-fg-muted">{formatRelativeDays(r.activity.lastWorkoutAt, now)}</Td>
                <Td><CheckinCell row={r} now={now} m={m} /></Td>
                <Td className="text-right tnum">
                  <Steps value={r.activity.stepsToday} goal={r.client.stepGoal} />
                </Td>
                {isOwner && (
                  <Td>
                    {r.subscription ? (
                      <Badge tone={PAYMENT_TONE[r.subscription.paymentStatus]}>{m.payment[r.subscription.paymentStatus]}</Badge>
                    ) : (
                      <span className="text-fg-subtle">—</span>
                    )}
                  </Td>
                )}
                {isOwner && <Td className="tnum text-fg-muted">{formatDaysUntil(r.subscription?.renewsAt ?? null, now)}</Td>}
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}

function Adherence({ value }: { value: number | null }) {
  if (value === null) return <span className="text-fg-subtle">—</span>;
  const color = value < 0.6 ? "bg-danger" : value < 0.8 ? "bg-warn" : "bg-ok";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-12 overflow-hidden rounded-sm bg-surface-2">
        <span className={`block h-full ${color}`} style={{ width: `${Math.round(value * 100)}%` }} />
      </span>
      <span className="w-9 tnum">{formatPercent(value)}</span>
    </span>
  );
}

function Steps({ value, goal }: { value: number | null; goal: number }) {
  if (value === null) return <span className="text-fg-subtle">—</span>;
  const low = value < goal * 0.7;
  return (
    <span className={low ? "text-warn" : undefined} title={`Objetivo ${formatNumber(goal)}`}>
      {formatNumber(value)}
    </span>
  );
}

function CheckinCell({ row, now, m }: { row: ClientRow; now: Date; m: ReturnType<typeof getMessages> }) {
  if (row.client.status !== "active") return <span className="text-fg-subtle">—</span>;
  if (row.activity.checkinSubmittedAt) return <Badge tone="ok">{m.clients.checkinSent}</Badge>;
  if (isCheckinMissing(row, now)) return <Badge tone="warn">{m.clients.checkinPending}</Badge>;
  return <span className="text-xs text-fg-muted capitalize">{weekdayName(row.client.checkinWeekday)}</span>;
}
