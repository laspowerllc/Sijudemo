"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import type { Messages } from "@/i18n";

export function RecoverForm({ m }: { m: Messages["auth"] }) {
  const [sent, setSent] = useState(false);

  // El envío real (Supabase Auth + Resend) se conecta en la fase de backend.
  // El mensaje es el mismo exista o no la cuenta, para no revelar qué emails están registrados.
  if (sent) return <p className="rounded border border-border bg-surface p-3 text-xs">{m.recoverSent}</p>;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <Field label={m.email}>
        <Input type="email" name="email" autoComplete="email" required autoFocus />
      </Field>
      <Button type="submit" variant="primary" className="w-full">
        {m.recoverSubmit}
      </Button>
    </form>
  );
}
