"use client";

import { useRef, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { weekdayName } from "@/lib/dates";
import type { Messages } from "@/i18n";

interface MemberOption {
  id: string;
  name: string;
  role: "owner" | "assistant";
}

export function InviteClientDialog({ m, members, disabled }: { m: Messages; members: MemberOption[]; disabled?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [sent, setSent] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    // El envío real (alta + email con Resend) se conecta en la fase de backend.
    setSent(String(data.get("email")));
    e.currentTarget.reset();
  }

  return (
    <>
      <Button
        variant="primary"
        onClick={() => {
          setSent(null);
          ref.current?.showModal();
        }}
        disabled={disabled}
        title={disabled ? m.invite.limitReached : undefined}
      >
        <UserPlus className="size-4" strokeWidth={1.75} />
        {m.clients.invite}
      </Button>

      <dialog
        ref={ref}
        className="m-auto w-full max-w-md rounded border border-border-strong bg-bg p-0 text-fg backdrop:bg-fg/30"
      >
        <div className="flex h-10 items-center justify-between border-b border-border px-4">
          <h2 className="text-[13px] font-semibold">{m.invite.title}</h2>
          <button onClick={() => ref.current?.close()} className="text-fg-muted hover:text-fg" aria-label={m.common.cancel}>
            <X className="size-4" />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col gap-3 p-4 text-[13px]">
            <p>
              Invitación preparada para <strong>{sent}</strong>.
            </p>
            <p className="text-xs text-fg-muted">Modo demo: el envío real se activa al conectar el backend.</p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setSent(null)}>Invitar a otro</Button>
              <Button variant="primary" onClick={() => ref.current?.close()}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3 p-4">
            <Field label={m.invite.fullName} className="col-span-2">
              <Input name="fullName" required maxLength={120} autoFocus />
            </Field>
            <Field label={m.invite.email} className="col-span-2">
              <Input name="email" type="email" required maxLength={254} />
            </Field>
            <Field label={m.invite.goal} className="col-span-2">
              <Input name="goal" maxLength={200} />
            </Field>
            <Field label={m.invite.assignTo}>
              <Select name="memberId" defaultValue={members.find((x) => x.role === "owner")?.id}>
                {members.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={m.invite.price}>
              <Input name="price" type="number" min={0} step={1} defaultValue={89} className="tnum" />
            </Field>
            <Field label={m.invite.checkinDay}>
              <Select name="checkinWeekday" defaultValue={1}>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <option key={d} value={d} className="capitalize">
                    {weekdayName(d)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={m.invite.stepGoal}>
              <Input name="stepGoal" type="number" min={1000} max={40000} step={500} defaultValue={8000} className="tnum" />
            </Field>
            <p className="col-span-2 text-2xs text-fg-subtle">{m.invite.hint}</p>
            <div className="col-span-2 flex justify-end gap-2 border-t border-border pt-3">
              <Button onClick={() => ref.current?.close()}>{m.invite.cancel}</Button>
              <Button type="submit" variant="primary">
                {m.invite.submit}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
