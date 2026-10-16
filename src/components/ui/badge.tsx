import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export type Tone = "neutral" | "ok" | "warn" | "danger" | "info" | "accent";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-fg-muted",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  accent: "bg-accent-soft text-accent",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded-sm px-1.5 text-2xs font-medium whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}
