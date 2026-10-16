import Link from "next/link";
import { getMessages, fmt } from "@/i18n";
import { MIN_PASSWORD_LENGTH } from "@/lib/domain/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export const metadata = { title: "Crear cuenta · Siju" };

export default function SignupPage() {
  const m = getMessages().auth;
  return (
    <>
      <h1 className="text-[15px] font-semibold">{m.signup}</h1>
      <p className="mb-4 text-xs text-fg-muted">{m.trial}</p>
      <form className="flex flex-col gap-3">
        <Field label={m.fullName}>
          <Input name="fullName" autoComplete="name" required maxLength={120} />
        </Field>
        <Field label={m.business}>
          <Input name="business" autoComplete="organization" required maxLength={120} />
        </Field>
        <Field label={m.email}>
          <Input type="email" name="email" autoComplete="email" required />
        </Field>
        <Field label={m.password} hint={fmt(m.passwordHint, { min: MIN_PASSWORD_LENGTH })}>
          <Input type="password" name="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} />
        </Field>
        <label className="flex items-start gap-2 text-xs text-fg-muted">
          <input type="checkbox" name="terms" required className="mt-0.5 accent-accent" />
          {m.terms}
        </label>
        <Button type="submit" variant="primary" className="mt-1 w-full">
          {m.continue}
        </Button>
      </form>
      <p className="mt-4 text-xs text-fg-muted">
        {m.haveAccount} <Link href="/login" className="text-fg underline">{m.login}</Link>
      </p>
    </>
  );
}
