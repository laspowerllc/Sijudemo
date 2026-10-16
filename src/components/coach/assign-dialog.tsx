"use client";

import { useMemo, useState, useTransition } from "react";
import { fmt, type Messages } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { CLIENT_STATUS_TONE } from "@/lib/status";
import type { ClientStatus } from "@/lib/types";

export interface AssignableClient {
  id: string;
  name: string;
  status: ClientStatus;
  /** Plan/dieta actual que se sustituirá. */
  current: string | null;
}

export interface AssignOutcome {
  ok: boolean;
  error?: string;
  assigned?: string[];
  skipped?: { clientId: string }[];
}

/** Diálogo común para asignar una rutina o una dieta a varios clientes. */
export function AssignDialog({
  open,
  onClose,
  title,
  startLabel,
  onAssign,
  dirty,
  clients,
  defaultStart,
  m,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  startLabel: string;
  onAssign: (clientIds: string[], startDate: string) => Promise<AssignOutcome>;
  dirty: boolean;
  clients: AssignableClient[];
  defaultStart: string;
  m: Messages;
}) {
  const a = m.training.assign;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [start, setStart] = useState(defaultStart);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    return clients.filter((c) => !query || c.name.toLowerCase().includes(query));
  }, [clients, q]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const submit = () =>
    startTransition(async () => {
      const res = await onAssign([...selected], start);
      if (!res.ok) return setMsg({ ok: false, text: res.error ?? "Error" });
      const skipped = res.skipped ?? [];
      const names = skipped.map((s) => clients.find((c) => c.id === s.clientId)?.name ?? s.clientId).join(", ");
      setMsg({
        ok: true,
        text: fmt(a.done, { n: res.assigned?.length ?? 0 }) + (skipped.length ? ` ${fmt(a.skipped, { n: skipped.length, names })}` : ""),
      });
      setSelected(new Set());
    });

  return (
    <Dialog open={open} onClose={() => { setMsg(null); onClose(); }} title={title} className="max-w-lg">
      <div className="flex flex-col gap-3 p-4">
        {dirty && <p className="rounded bg-warn-soft p-2 text-xs text-warn">{a.saveFirst}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label={startLabel}>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
          </Field>
          <Field label={a.clients}>
            <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={a.search} />
          </Field>
        </div>

        <ul className="max-h-72 overflow-y-auto rounded border border-border">
          {visible.map((c) => {
            const expired = c.status === "expired";
            return (
              <li key={c.id} className="border-b border-border last:border-0">
                <label className={`flex items-center gap-2 px-3 py-1.5 ${expired ? "opacity-50" : "cursor-pointer hover:bg-surface"}`}>
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} disabled={expired} className="accent-accent" />
                  <span className="flex-1 truncate text-[13px]">{c.name}</span>
                  {expired ? (
                    <span className="text-2xs text-danger">{a.expired}</span>
                  ) : (
                    c.current && <span className="max-w-48 truncate text-2xs text-fg-subtle">{fmt(a.replaces, { plan: c.current })}</span>
                  )}
                  {c.status !== "active" && !expired && <Badge tone={CLIENT_STATUS_TONE[c.status]}>{m.clientStatus[c.status]}</Badge>}
                </label>
              </li>
            );
          })}
        </ul>

        {msg && <p className={`text-xs ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>}

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button onClick={() => { setMsg(null); onClose(); }}>{m.common.cancel}</Button>
          <Button variant="primary" onClick={submit} disabled={pending || dirty || selected.size === 0 || !start}>
            {fmt(a.submit, { n: selected.size })}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
