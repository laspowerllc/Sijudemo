"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Dumbbell,
  Salad,
  ClipboardCheck,
  MessageSquare,
  CreditCard,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Messages } from "@/i18n";
import type { Role } from "@/lib/types";

type NavKey = keyof Messages["nav"];

const ITEMS: { key: NavKey; href: string; icon: LucideIcon; ownerOnly?: boolean }[] = [
  { key: "dashboard", href: "/coach", icon: LayoutGrid },
  { key: "clients", href: "/coach/clientes", icon: Users },
  { key: "training", href: "/coach/entrenamientos", icon: Dumbbell, ownerOnly: true },
  { key: "nutrition", href: "/coach/nutricion", icon: Salad, ownerOnly: true },
  { key: "checkins", href: "/coach/check-ins", icon: ClipboardCheck },
  { key: "chat", href: "/coach/chat", icon: MessageSquare },
  { key: "billing", href: "/coach/cobros", icon: CreditCard, ownerOnly: true },
  { key: "settings", href: "/coach/ajustes", icon: Settings, ownerOnly: true },
];

export function Sidebar({ nav, role, orgName }: { nav: Messages["nav"]; role: Role; orgName: string }) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => !i.ownerOnly || role === "owner");

  return (
    <aside className="flex w-48 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-12 items-center gap-2 border-b border-border px-3">
        <span className="flex size-6 items-center justify-center rounded-sm bg-accent text-xs font-bold text-accent-fg">S</span>
        <span className="truncate text-[13px] font-semibold" title={orgName}>
          {orgName}
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-px p-1.5">
        {items.map(({ key, href, icon: Icon }) => {
          const active = href === "/coach" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={key}
              href={href}
              className={cn(
                "flex h-8 items-center gap-2 rounded px-2 text-[13px]",
                active ? "bg-bg font-medium text-fg ring-1 ring-border" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              <Icon className="size-4" strokeWidth={1.75} />
              {nav[key]}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
