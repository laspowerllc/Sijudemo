import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getMessages, fmt } from "@/i18n";
import { getOrganization, getSession } from "@/lib/data";
import { daysBetween } from "@/lib/dates";
import { Sidebar } from "@/components/coach/sidebar";
import { DevRoleSwitcher } from "@/components/dev-role-switcher";
import type { Organization } from "@/lib/types";

export default async function CoachLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (session.role === "client") redirect("/app");
  const org = await getOrganization(session);
  if (!org) redirect("/login");
  const m = getMessages();

  return (
    <div className="flex h-dvh">
      <Sidebar nav={m.nav} role={session.role} orgName={org.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <BillingBanner org={org} m={m} />
        <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border px-5">
          <DevRoleSwitcher current={session.role} m={m} />
          <div className="flex items-center gap-3 text-xs">
            <span className="text-fg-muted">{m.roles[session.role]}</span>
            <span className="font-medium">{session.fullName}</span>
            {session.role === "owner" && <span className="rounded-sm border border-border px-1.5 text-2xs text-fg-muted">{m.plans[org.plan]}</span>}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function BillingBanner({ org, m }: { org: Organization; m: ReturnType<typeof getMessages> }) {
  const now = new Date();
  let text: string | null = null;
  let cls = "bg-info-soft text-info";
  if (org.billingStatus === "trialing" && org.trialEndsAt) {
    text = fmt(m.orgBilling.trialing, { days: Math.max(0, daysBetween(now, new Date(org.trialEndsAt))) });
  } else if (org.billingStatus === "past_due" && org.graceEndsAt) {
    text = fmt(m.orgBilling.past_due, { days: Math.max(0, daysBetween(now, new Date(org.graceEndsAt))) });
    cls = "bg-warn-soft text-warn";
  } else if (org.billingStatus === "read_only") {
    text = m.orgBilling.read_only;
    cls = "bg-danger-soft text-danger";
  }
  if (!text) return null;
  return <div className={`px-5 py-1.5 text-xs font-medium ${cls}`}>{text}</div>;
}
