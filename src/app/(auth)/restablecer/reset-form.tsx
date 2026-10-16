"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { fmt, type Messages } from "@/i18n";
import { MIN_PASSWORD_LENGTH } from "@/lib/domain/auth";

export function ResetForm({ m }: { m: Messages["auth"] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        if (data.get("password") !== data.get("repeat")) {
          setError(m.passwordsDontMatch);
          return;
        }
        // Se guarda en Supabase Auth en la fase de backend.
        router.push("/login");
      }}
    >
      <Field label={m.newPassword} hint={fmt(m.passwordHint, { min: MIN_PASSWORD_LENGTH })}>
        <Input type="password" name="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} />
      </Field>
      <Field label={m.repeatPassword}>
        <Input
          type="password"
          name="repeat"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          onChange={() => setError(null)}
          aria-invalid={!!error}
        />
      </Field>
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button type="submit" variant="primary" className="w-full">
        {m.resetSubmit}
      </Button>
    </form>
  );
}
