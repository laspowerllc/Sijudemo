import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/** Bloque con borde y cabecera compacta. Sin sombras. */
export function Panel({
  title,
  count,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded border border-border bg-bg", className)}>
      {(title || actions) && (
        <header className="flex h-9 items-center justify-between gap-2 border-b border-border px-3">
          <h2 className="text-xs font-semibold">
            {title}
            {count !== undefined && <span className="ml-1.5 font-normal text-fg-subtle tnum">{count}</span>}
          </h2>
          {actions}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-3 py-6 text-center text-xs text-fg-subtle">{children}</p>;
}
