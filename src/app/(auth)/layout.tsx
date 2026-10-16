import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-start justify-center bg-surface px-4 py-12 sm:items-center sm:py-0">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex flex-col items-center gap-1.5">
          <span className="flex size-9 items-center justify-center rounded bg-accent text-base font-bold text-accent-fg">S</span>
          <span className="text-sm font-semibold">Siju</span>
        </div>
        <div className="rounded border border-border bg-bg p-5">{children}</div>
      </div>
    </div>
  );
}
