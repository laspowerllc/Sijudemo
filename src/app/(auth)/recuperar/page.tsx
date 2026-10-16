import Link from "next/link";
import { getMessages } from "@/i18n";
import { RecoverForm } from "./recover-form";

export const metadata = { title: "Recuperar contraseña · Siju" };

export default function RecoverPage() {
  const m = getMessages().auth;
  return (
    <>
      <h1 className="text-[15px] font-semibold">{m.recoverTitle}</h1>
      <p className="mb-4 text-xs text-fg-muted">{m.recoverText}</p>
      <RecoverForm m={m} />
      <p className="mt-4 text-center text-xs">
        <Link href="/login" className="text-fg-muted hover:text-fg hover:underline">← {m.backToLogin}</Link>
      </p>
    </>
  );
}
