import Link from "next/link";
import { getMessages } from "@/i18n";
import { getSession, listClientRows } from "@/lib/data";
import { isAtRisk, isCheckinMissing, riskReasons } from "@/lib/domain/risk";
import { formatDaysUntil, formatMoney, formatPercent, formatRelativeDays, formatShortDate } from "@/lib/dates";
import { PAYMENT_TONE } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, Empty } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import type { ClientRow } from "@/lib/types";

export const metadata = { title: "Panel · Siju" };

export default async function CoachDashboard() {
  const session = await getSession();
  const rows = await listClientRows(session);
  const m = getMessages();
  const now = new Date();
  const isOwner = session.role === "owner";

  const active = rows.filter((r) => r.client.status === "active");
  const missing = active.filter((r) => isCheckinMissing(r, now));
  const toReview = active.filter((r) => r.activity.checkinSubmittedAt && !r.activity.checkinReviewedAt);
  const atRisk = active
    .filter((r) => isAtRisk(r, now))
    .sort((a, b) => riskReasons(b, now).length - riskReasons(a, now).length);
  const in14d = now.getTime() + 14 * 86_400_000;
  const renewals = rows
    .filter((r) => r.subscription?.renewsAt && r.client.status !== "invited")
    .filter((r) => new Date(r.subscription!.renewsAt!).getTime() <= in14d)
    .sort((a, b) => a.subscription!.renewsAt!.localeCompare(b.subscription!.renewsAt!));
  const renewals7d = renewals.filter((r) => new Date(r.subscription!.renewsAt!).getTime() <= now.getTime() + 7 * 86_400_000);
  const mrr = active.reduce((sum, r) => {
    const s = r.subscription;
    if (!s) return sum;
    return sum + (s.interval === "quarter" ? s.priceCents / 3 : s.priceCents);
  }, 0);

  return (
    <>
      <PageHeader title={m.dashboard.title} meta={formatShortDate(now.toISOString())} />
      <div className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
          <Stat label={m.dashboard.activeClients} value={active.length} />
          <Stat label={m.dashboard.pendingCheckins} value={missing.length} tone={missing.length ? "warn" : undefined} />
          <Stat label={m.dashboard.toReview} value={toReview.length} />
          <Stat label={m.dashboard.atRisk} value={atRisk.length} tone={atRisk.length ? "danger" : undefined} />
          {isOwner && <Stat label={m.dashboard.renewals7d} value={renewals7d.length} />}
          {isOwner && <Stat label={m.dashboard.mrr} value={formatMoney(mrr)} />}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title={m.dashboard.riskTitle} count={atRisk.length}>
            {atRisk.length === 0 ? (
              <Empty>{m.dashboard.noneRisk}</Empty>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{m.clients.cols.name}</Th>
                    <Th>{m.clients.cols.lastWorkout}</Th>
                    <Th>{m.clients.cols.adherence}</Th>
                    <Th>Motivos</Th>
                  </tr>
                </thead>
                <tbody>
                  {atRisk.map((r) => (
                    <Tr key={r.client.id}>
                      <Td><ClientLink row={r} /></Td>
                      <Td className="tnum text-fg-muted">{formatRelativeDays(r.activity.lastWorkoutAt, now)}</Td>
                      <Td className="tnum">{formatPercent(r.activity.adherence14d)}</Td>
                      <Td>
                        <div className="flex gap-1">
                          {riskReasons(r, now).map((reason) => (
                            <Badge key={reason} tone="danger">{m.risk[reason]}</Badge>
                          ))}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>

          <Panel title={m.dashboard.pendingTitle} count={missing.length}>
            {missing.length === 0 ? (
              <Empty>{m.dashboard.noneDue}</Empty>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{m.clients.cols.name}</Th>
                    <Th>Debía enviarlo</Th>
                    <Th>{m.clients.cols.coach}</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {missing.map((r) => (
                    <Tr key={r.client.id}>
                      <Td><ClientLink row={r} /></Td>
                      <Td className="tnum text-fg-muted">{formatShortDate(r.activity.checkinDueOn)}</Td>
                      <Td className="text-fg-muted">{r.assignedNames.join(", ") || "—"}</Td>
                      <Td className="text-right">
                        {/* Envío del recordatorio: se conecta en la fase de notificaciones */}
                        <ButtonLink href={`/coach/clientes/${r.client.id}?tab=chat`} size="sm" variant="ghost">
                          {m.common.remind}
                        </ButtonLink>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>

          <Panel title={m.dashboard.reviewTitle} count={toReview.length}>
            {toReview.length === 0 ? (
              <Empty>{m.dashboard.noneReview}</Empty>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{m.clients.cols.name}</Th>
                    <Th>Recibido</Th>
                    <Th>{m.clients.cols.adherence}</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {toReview.map((r) => (
                    <Tr key={r.client.id}>
                      <Td><ClientLink row={r} /></Td>
                      <Td className="tnum text-fg-muted">{formatRelativeDays(r.activity.checkinSubmittedAt, now)}</Td>
                      <Td className="tnum">{formatPercent(r.activity.adherence14d)}</Td>
                      <Td className="text-right">
                        <ButtonLink href={`/coach/clientes/${r.client.id}?tab=checkins`} size="sm" variant="ghost">
                          {m.common.review}
                        </ButtonLink>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>

          {isOwner && (
            <Panel title={m.dashboard.renewalsTitle} count={renewals.length}>
              {renewals.length === 0 ? (
                <Empty>{m.dashboard.noneRenewals}</Empty>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>{m.clients.cols.name}</Th>
                      <Th>{m.clients.cols.renews}</Th>
                      <Th className="text-right">Importe</Th>
                      <Th>{m.clients.cols.payment}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {renewals.map((r) => (
                      <Tr key={r.client.id}>
                        <Td><ClientLink row={r} /></Td>
                        <Td className="tnum text-fg-muted">
                          {formatShortDate(r.subscription!.renewsAt)} · {formatDaysUntil(r.subscription!.renewsAt, now)}
                        </Td>
                        <Td className="tnum text-right">{formatMoney(r.subscription!.priceCents)}</Td>
                        <Td>
                          <Badge tone={PAYMENT_TONE[r.subscription!.paymentStatus]}>{m.payment[r.subscription!.paymentStatus]}</Badge>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "warn" | "danger" }) {
  const color = tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : "text-fg";
  return (
    <div className="bg-bg px-3 py-2.5">
      <div className="text-2xs font-medium text-fg-muted uppercase tracking-wide">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tnum ${color}`}>{value}</div>
    </div>
  );
}

function ClientLink({ row }: { row: ClientRow }) {
  return (
    <Link href={`/coach/clientes/${row.client.id}`} className="font-medium hover:text-accent hover:underline">
      {row.client.fullName}
    </Link>
  );
}
