import Link from "next/link";
import type { Messages } from "@/i18n";
import type { AssignedDiet } from "@/lib/types";
import { kcalOf, macrosFromRations, sumRations } from "@/lib/domain/nutrition";
import { formatNumber, formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { RationsLine } from "./rations";

/** Dieta asignada al cliente, en solo lectura (ficha del coach). */
export function DietView({ diet, dayParam, m, canAssign }: { diet: AssignedDiet | null; dayParam?: string; m: Messages; canAssign: boolean }) {
  const t = m.nutrition;
  if (!diet) {
    return (
      <div className="text-xs text-fg-muted">
        {t.plan.none}{" "}
        {canAssign && <Link href="/coach/nutricion" className="text-accent underline">{t.plan.assignFromDiets}</Link>}
      </div>
    );
  }
  const idx = Math.max(0, diet.days.findIndex((d) => d.id === dayParam));
  const day = diet.days[idx];
  const totals = macrosFromRations(sumRations(day.meals.map((x) => x.rations)));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 text-xs">
        <span className="text-[13px] font-semibold">{diet.name}</span>
        <span className="text-fg-muted">{t.plan.since}: {formatShortDate(`${diet.startDate}T00:00:00`)}</span>
      </div>
      {diet.days.length > 1 && (
        <nav className="flex gap-1">
          {diet.days.map((d, i) => (
            <Link
              key={d.id}
              href={{ query: { tab: "nutrition", dia: d.id } }}
              scroll={false}
              className={cn("flex h-7 items-center rounded px-2.5 text-xs", i === idx ? "bg-surface-2 font-medium" : "text-fg-muted hover:bg-surface")}
            >
              {d.name}
            </Link>
          ))}
        </nav>
      )}
      <div className="max-w-3xl overflow-hidden rounded border border-border">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-surface text-2xs text-fg-muted uppercase">
              <th className="h-8 pl-3 text-left font-semibold">{t.builder.meal}</th>
              <th className="text-left font-semibold">{t.builder.rations}</th>
              <th className="w-16 pr-3 text-right font-semibold">{t.macros.kcal}</th>
            </tr>
          </thead>
          <tbody>
            {day.meals.map((meal) => (
              <tr key={meal.id} className="border-t border-border">
                <td className="h-8 pl-3 font-medium">{meal.name}</td>
                <td className="text-fg-muted"><RationsLine rations={meal.rations} m={m} /></td>
                <td className="pr-3 text-right tnum">{formatNumber(macrosFromRations(meal.rations).kcal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-surface text-xs">
              <td className="h-8 pl-3 font-semibold">{t.builder.target}</td>
              <td className="text-fg-muted tnum">
                {day.targets.protein} P · {day.targets.carbs} HC · {day.targets.fat} G
                <span className="ml-2 text-fg-subtle">({t.builder.total.toLowerCase()}: {formatNumber(totals.kcal)} kcal)</span>
              </td>
              <td className="pr-3 text-right font-semibold tnum">{formatNumber(kcalOf(day.targets))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
