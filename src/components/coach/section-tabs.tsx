import Link from "next/link";
import { cn } from "@/lib/cn";

/** Pestañas de sección (subnavegación bajo la cabecera de página). */
export function SectionTabs({ tabs, active }: { tabs: { key: string; href: string; label: string }[]; active: string }) {
  return (
    <nav className="flex gap-4 border-b border-border px-5">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={cn(
            "-mb-px border-b-2 py-2 text-xs",
            t.key === active ? "border-accent font-medium text-fg" : "border-transparent text-fg-muted hover:text-fg",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
