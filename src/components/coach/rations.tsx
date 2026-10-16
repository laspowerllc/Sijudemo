import type { Messages } from "@/i18n";
import type { Rations } from "@/lib/types";
import { GROUP_ORDER, formatRation } from "@/lib/domain/nutrition";

/** "4 Prot. · 3 HC · 1 Grasa" — raciones de un plato o comida en una línea. */
export function RationsLine({ rations, m, className }: { rations: Rations; m: Messages; className?: string }) {
  const parts = GROUP_ORDER.filter((g) => (rations[g] ?? 0) >= 0.05).map(
    (g) => `${formatRation(rations[g])} ${m.nutrition.groupsShort[g]}`,
  );
  return <span className={className}>{parts.length ? parts.join(" · ") : "—"}</span>;
}
