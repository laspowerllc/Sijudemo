"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, LineChart, ClipboardCheck, MessageSquare, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Messages } from "@/i18n";

const ITEMS: { key: keyof Messages["clientNav"]; href: string; icon: LucideIcon }[] = [
  { key: "today", href: "/app", icon: CalendarCheck },
  { key: "progress", href: "/app/progreso", icon: LineChart },
  { key: "checkin", href: "/app/check-in", icon: ClipboardCheck },
  { key: "chat", href: "/app/chat", icon: MessageSquare },
  { key: "profile", href: "/app/perfil", icon: User },
];

export function BottomNav({ labels }: { labels: Messages["clientNav"] }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg">
        {ITEMS.map(({ key, href, icon: Icon }) => {
          const active = href === "/app" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={key} className="flex-1">
              <Link
                href={href}
                className={cn("flex h-14 flex-col items-center justify-center gap-0.5 text-2xs", active ? "text-accent" : "text-fg-muted")}
              >
                <Icon className="size-5" strokeWidth={active ? 2 : 1.75} />
                {labels[key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
