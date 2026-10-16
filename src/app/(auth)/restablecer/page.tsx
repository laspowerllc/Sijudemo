import { getMessages } from "@/i18n";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Nueva contraseña · Siju" };

/** Destino del enlace del email de recuperación. */
export default function ResetPage() {
  const m = getMessages().auth;
  return (
    <>
      <h1 className="mb-4 text-[15px] font-semibold">{m.resetTitle}</h1>
      <ResetForm m={m} />
    </>
  );
}
