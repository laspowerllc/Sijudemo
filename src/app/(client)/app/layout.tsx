import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getMessages } from "@/i18n";
import { getSession } from "@/lib/data";
import { BottomNav } from "@/components/client/bottom-nav";
import { DevRoleSwitcher } from "@/components/dev-role-switcher";
import { SyncStatus } from "@/components/client/sync-status";
import { ServiceWorker } from "@/components/client/service-worker";

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (session.role !== "client") redirect("/coach");
  const m = getMessages();

  return (
    <div className="min-h-dvh bg-surface text-sm">
      <div className="mx-auto max-w-lg pb-20">
        <div className="flex justify-end px-4 pt-2">
          <DevRoleSwitcher current={session.role} m={m} />
        </div>
        <SyncStatus />
        {children}
      </div>
      <BottomNav labels={m.clientNav} />
      <ServiceWorker />
    </div>
  );
}
