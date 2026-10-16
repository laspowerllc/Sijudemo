import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEV_ROLE_COOKIE } from "@/lib/data";
import { resetStore } from "@/lib/data/mock/store";
import type { Messages } from "@/i18n";

/**
 * Solo en desarrollo, mientras no hay autenticación real: permite ver la
 * aplicación como cada rol para comprobar permisos.
 */
const ROLES = ["owner", "assistant", "client"] as const;

/** En desarrollo siempre; en producción solo si es una demo (SIJU_DEMO=1). Se elimina con el login real. */
const enabled = () => process.env.NODE_ENV !== "production" || process.env.SIJU_DEMO === "1";

async function switchRole(formData: FormData) {
  "use server";
  if (!enabled()) return;
  const role = String(formData.get("role"));
  if (!ROLES.includes(role as (typeof ROLES)[number])) return;
  (await cookies()).set(DEV_ROLE_COOKIE, role, { path: "/", sameSite: "lax", httpOnly: true });
  redirect(role === "client" ? "/app" : "/coach");
}

async function resetData() {
  "use server";
  if (!enabled()) return;
  resetStore();
  redirect("/");
}

export function DevRoleSwitcher({ current, m }: { current: string; m: Messages }) {
  if (!enabled()) return null;
  return (
    <form action={switchRole} className="flex items-center gap-1 text-2xs text-fg-subtle">
      <span>{m.dev.viewAs}:</span>
      {ROLES.map((r) => (
        <button
          key={r}
          name="role"
          value={r}
          className={r === current ? "font-semibold text-fg underline" : "hover:text-fg"}
        >
          {m.roles[r]}
        </button>
      ))}
      <button formAction={resetData} className="ml-2 hover:text-fg" title="Borra lo creado y vuelve a los datos de ejemplo">
        · Reiniciar datos
      </button>
    </form>
  );
}
