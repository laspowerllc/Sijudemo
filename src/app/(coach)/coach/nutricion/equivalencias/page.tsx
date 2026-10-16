import { notFound } from "next/navigation";
import { getMessages, fmt } from "@/i18n";
import { getSession } from "@/lib/data";
import { listFoods } from "@/lib/data/nutrition";
import { GROUPS, GROUP_ORDER, gramsPerRation, roundGrams } from "@/lib/domain/nutrition";
import { PageHeader } from "@/components/ui/page-header";
import { NutritionTabs } from "@/components/coach/nutrition-tabs";
import { Panel } from "@/components/ui/panel";

export const metadata = { title: "Equivalencias · Siju" };

export default async function EquivalentsPage() {
  const session = await getSession();
  if (session.role !== "owner") notFound();
  const foods = await listFoods(session);
  const m = getMessages();
  const t = m.nutrition;

  return (
    <>
      <PageHeader title={t.title} />
      <NutritionTabs m={m} active="equivalents" />
      <div className="flex flex-col gap-3 p-5">
        <p className="text-xs text-fg-subtle">{t.equiv.note}</p>
        <div className="grid gap-3 xl:grid-cols-2">
          {GROUP_ORDER.map((g) => {
            const group = GROUPS[g];
            const list = foods.filter((f) => f.group === g);
            return (
              <Panel key={g} title={t.groups[g]} count={list.length}>
                <p className="border-b border-border px-3 py-1.5 text-2xs text-fg-muted">
                  {fmt(t.equiv.intro, { amount: group.amount, macro: t.equiv.macroName[group.key] })}
                </p>
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-2xs text-fg-muted uppercase">
                      <th className="py-1 pl-3 text-left font-medium">{t.equiv.food}</th>
                      <th className="py-1 text-right font-medium">{t.equiv.perRation}</th>
                      <th className="py-1 pr-3 text-right font-medium">{t.equiv.per100}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((f) => {
                      const gpr = gramsPerRation(f);
                      return (
                        <tr key={f.id} className="border-t border-border">
                          <td className="py-1.5 pl-3">{f.name}</td>
                          <td className="text-right tnum whitespace-nowrap">
                            {gpr ? `${roundGrams(gpr)} g` : "—"}
                            {gpr && f.unitGrams && (
                              <span className="ml-1.5 text-2xs text-fg-subtle">
                                {fmt(t.equiv.units, { n: (Math.round((gpr / f.unitGrams) * 10) / 10).toLocaleString("es"), unit: f.unitName ?? "" })}
                              </span>
                            )}
                          </td>
                          <td className="pr-3 text-right text-xs tnum whitespace-nowrap text-fg-muted">
                            {f.per100.kcal} · {f.per100.protein} · {f.per100.carbs} · {f.per100.fat}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Panel>
            );
          })}
        </div>
      </div>
    </>
  );
}
