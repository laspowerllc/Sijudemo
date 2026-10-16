import Link from "next/link";
import { getMessages } from "@/i18n";
import { getSession } from "@/lib/data";
import { getActiveDiet, listDishes, listFoods } from "@/lib/data/nutrition";
import { GROUP_ORDER, dishFitsMeal, formatRation, gramsPerRation, kcalOf, roundGrams, summarizeDish } from "@/lib/domain/nutrition";
import { formatNumber } from "@/lib/dates";
import { cn } from "@/lib/cn";

export const metadata = { title: "Dieta · Siju" };

export default async function ClientDietPage({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { dia } = await searchParams;
  const session = await getSession();
  if (!session.clientId) return null;
  const m = getMessages();
  const t = m.nutrition;
  const diet = await getActiveDiet(session, session.clientId);

  if (!diet) {
    return (
      <div className="px-4 pt-2">
        <Link href="/app" className="text-xs text-fg-muted">← {m.clientNav.today}</Link>
        <h1 className="mt-1 text-lg font-semibold">Dieta</h1>
        <p className="mt-2 text-xs text-fg-subtle">Tu coach aún no te ha asignado una dieta.</p>
      </div>
    );
  }

  // Platos y alimentos: el cliente ve los de su coach para poder cocinar.
  const [foods, dishes] = await Promise.all([listFoods(session), listDishes(session)]);
  const foodMap = new Map(foods.map((f) => [f.id, f]));
  const dishSummaries = dishes.map((d) => ({ dish: d, sum: summarizeDish(d, foodMap) }));
  const idx = Math.max(0, diet.days.findIndex((d) => d.id === dia));
  const day = diet.days[idx];

  return (
    <div className="flex flex-col gap-3 px-4 pt-2">
      <div>
        <Link href="/app" className="text-xs text-fg-muted">← {m.clientNav.today}</Link>
        <h1 className="mt-1 text-lg font-semibold">{diet.name}</h1>
        <p className="text-xs text-fg-muted tnum">
          {formatNumber(kcalOf(day.targets))} kcal · {day.targets.protein} g P · {day.targets.carbs} g HC · {day.targets.fat} g G
        </p>
      </div>

      {diet.days.length > 1 && (
        <nav className="flex gap-1 rounded border border-border bg-bg p-1">
          {diet.days.map((d, i) => (
            <Link
              key={d.id}
              href={{ query: { dia: d.id } }}
              className={cn("flex h-9 flex-1 items-center justify-center rounded text-sm", i === idx ? "bg-accent font-medium text-accent-fg" : "text-fg-muted")}
            >
              {d.name}
            </Link>
          ))}
        </nav>
      )}

      {day.meals.map((meal) => {
        const fits = dishSummaries.filter(({ sum }) => dishFitsMeal(sum.rations, meal.rations));
        return (
          <section key={meal.id} className="rounded border border-border bg-bg">
            <h2 className="border-b border-border px-3 py-2 font-semibold">{meal.name}</h2>
            <ul>
              {GROUP_ORDER.filter((g) => meal.rations[g]).map((g) => {
                const n = meal.rations[g]!;
                const options = foods.filter((f) => f.group === g);
                return (
                  <li key={g} className="border-b border-border last:border-0">
                    <details>
                      <summary className="flex h-11 cursor-pointer list-none items-center justify-between px-3">
                        <span>{t.groups[g]}</span>
                        <span className="text-xs text-fg-muted tnum">{formatRation(n)} {n === 1 ? "ración" : "raciones"} ▾</span>
                      </summary>
                      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 px-3 pb-3 text-xs">
                        {options.map((f) => {
                          const gpr = gramsPerRation(f);
                          if (!gpr) return null;
                          const grams = gpr * n;
                          return (
                            <li key={f.id} className="flex justify-between gap-2">
                              <span className="truncate text-fg-muted">{f.name}</span>
                              <span className="tnum whitespace-nowrap">
                                {f.unitGrams && grams / f.unitGrams >= 0.75
                                  ? `${Math.round((grams / f.unitGrams) * 2) / 2} ${f.unitName}`
                                  : `${roundGrams(grams)} g`}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  </li>
                );
              })}
            </ul>
            {fits.length > 0 && (
              <div className="border-t border-border bg-surface px-3 py-2">
                <p className="mb-1 text-2xs font-semibold tracking-wide text-fg-muted uppercase">Ideas para cocinar</p>
                {fits.map(({ dish, sum }) => (
                  <details key={dish.id} className="py-1">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-sm">
                      <span>{dish.name}</span>
                      <span className="text-2xs text-fg-subtle tnum">{formatNumber(sum.macros.kcal)} kcal</span>
                    </summary>
                    <ul className="mt-1 text-xs text-fg-muted">
                      {dish.ingredients.map((ing) => (
                        <li key={ing.foodId} className="flex justify-between">
                          <span>{foodMap.get(ing.foodId)?.name}</span>
                          <span className="tnum">{roundGrams(ing.grams)} g</span>
                        </li>
                      ))}
                    </ul>
                    {dish.instructions && <p className="mt-1 text-xs">{dish.instructions}</p>}
                  </details>
                ))}
              </div>
            )}
          </section>
        );
      })}
      <p className="pb-2 text-2xs text-fg-subtle">Cantidades en crudo. Dentro de cada grupo puedes cambiar un alimento por otro.</p>
    </div>
  );
}

