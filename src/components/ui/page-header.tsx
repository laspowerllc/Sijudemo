import type { ReactNode } from "react";

export function PageHeader({ title, meta, actions }: { title: string; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-2">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[15px] font-semibold">{title}</h1>
        {meta && <span className="text-xs text-fg-muted">{meta}</span>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
