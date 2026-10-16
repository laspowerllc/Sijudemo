import { getMessages, fmt } from "@/i18n";
import { MIN_PASSWORD_LENGTH } from "@/lib/domain/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export const metadata = { title: "Activa tu acceso · Siju" };

export default function AcceptInvitePage() {
  const m = getMessages().auth;
  // En la fase de backend el token se valida y se precargan nombre, email y coach.
  return (
    <>
      <h1 className="text-[15px] font-semibold">{m.acceptInvite}</h1>
      <p className="mb-4 text-xs text-fg-muted">{fmt(m.invitedBy, { coach: "Laura Méndez" })}</p>
      <form className="flex flex-col gap-3">
        <Field label={m.email}>
          <Input type="email" name="email" defaultValue="cliente@mail.com" readOnly className="bg-surface" />
        </Field>
        <Field label={m.password} hint={fmt(m.passwordHint, { min: MIN_PASSWORD_LENGTH })}>
          <Input type="password" name="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} />
        </Field>
        <label className="flex items-start gap-2 text-xs text-fg-muted">
          <input type="checkbox" name="terms" required className="mt-0.5 accent-accent" />
          {m.terms}
        </label>
        <Button type="submit" variant="primary" className="mt-1 h-10 w-full">
          {m.continue}
        </Button>
      </form>
    </>
  );
}
