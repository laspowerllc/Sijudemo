import Link from "next/link";
import { getMessages } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export const metadata = { title: "Iniciar sesión · Siju" };

export default function LoginPage() {
  const m = getMessages().auth;
  return (
    <>
      <h1 className="mb-4 text-[15px] font-semibold">{m.login}</h1>
      {/* La autenticación real (Supabase Auth) se conecta en la fase de backend */}
      <form className="flex flex-col gap-3">
        <Field label={m.email}>
          <Input type="email" name="email" autoComplete="email" required />
        </Field>
        <Field label={m.password}>
          <Input type="password" name="password" autoComplete="current-password" required />
        </Field>
        <Link href="/recuperar" className="-mt-1 self-end text-xs text-fg-muted hover:text-fg hover:underline">
          {m.forgot}
        </Link>
        <Button type="submit" variant="primary" className="mt-1 w-full">
          {m.login}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-fg-muted">
        {m.noAccount} <Link href="/registro" className="text-fg underline">{m.signup}</Link>
      </p>
    </>
  );
}
