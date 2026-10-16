"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Copy, Plus, Trash2, X } from "lucide-react";
import type { Messages } from "@/i18n";
import type { Diet, DietDay, Dish, Food, FoodGroup, Rations } from "@/lib/types";
import { GROUP_ORDER, dishFitsMeal, kcalOf, macrosFromRations, roundGrams, summarizeDish, sumRations } from "@/lib/domain/nutrition";
import { formatNumber } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { AssignDialog, type AssignableClient } from "@/components/coach/assign-dialog";
import { RationsLine } from "@/components/coach/rations";
import { assignDietAction, saveDietAction } from "../../actions";

type Draft = Pick<Diet, "id" | "name" | "description" | "days">;
const uid = (p: string) => `${p}_${crypto.randomUUID().slice(0, 8)}`;
const MACROS = ["protein", "carbs", "fat"] as const;

export function DietBuilder({
  initial,
  foods,
  dishes,
  clients,
  today,
  m,
}: {
  initial: Diet;
  foods: Food[];
  dishes: Dish[];
  clients: AssignableClient[];
  today: string;
  m: Messages;
}) {
  const t = m.nutrition;
  const b = t.builder;
  const [draft, setDraft] = useState<Draft>({ id: initial.id, name: initial.name, description: initial.description, days: initial.days });
  const [saved, setSaved] = useState(() => JSON.stringify({ name: initial.name, description: initial.description, days: initial.days }));
  const [dayIdx, setDayIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const snapshot = JSON.stringify({ name: draft.name, description: draft.description, days: draft.days });
  const dirty = snapshot !== saved;
  const d = Math.min(dayIdx, draft.days.length - 1);
  const day = draft.days[d];

  const foodMap = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
  const dishSummaries = useMemo(() => dishes.map((dish) => ({ dish, sum: summarizeDish(dish, foodMap) })), [dishes, foodMap]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const updateDay = (fn: (day: DietDay) => DietDay) =>
    setDraft((s) => ({ ...s, days: s.days.map((x, i) => (i === d ? fn(structuredClone(x)) : x)) }));

  const setRation = (mealIdx: number, g: FoodGroup, value: number) =>
    updateDay((x) => {
      const r = x.meals[mealIdx].rations;
      if (value > 0) r[g] = value;
      else delete r[g];
      return x;
    });

  const save = () =>
    startTransition(async () => {
      setError(null);
      const res = await saveDietAction(draft);
      if (res.ok) setSaved(snapshot);
      else setError(res.error);
    });

  const totals = macrosFromRations(sumRations(day.meals.map((x) => x.rations)));
  const targetKcal = kcalOf(day.targets);

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-border bg-bg px-5 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/coach/nutricion" className="text-xs text-fg-muted hover:text-fg">← {b.back}</Link>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            maxLength={80}
            aria-label={t.dietName}
            className="min-w-0 flex-1 rounded border border-transparent px-1 text-[15px] font-semibold hover:border-border focus:border-accent focus:outline-none"
          />
          <span className={cn("text-xs", dirty ? "text-warn" : "text-fg-subtle")}>
            {pending ? m.training.builder.saving : dirty ? m.training.builder.unsaved : m.training.builder.saved}
          </span>
          <Button onClick={save} disabled={!dirty || pending} variant={dirty ? "primary" : "secondary"}>{m.common.save}</Button>
          <Button onClick={() => setAssignOpen(true)} variant={dirty ? "secondary" : "primary"}>{m.training.builder.assign}</Button>
        </div>
        <input
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder={b.description}
          maxLength={300}
          className="mt-1 w-full rounded border border-transparent px-1 text-xs text-fg-muted placeholder:text-fg-subtle hover:border-border focus:border-accent focus:outline-none"
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>

      {/* Tipos de día */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-surface px-5 py-1.5">
        {draft.days.map((x, i) => (
          <button
            key={x.id}
            onClick={() => setDayIdx(i)}
            className={cn("h-7 rounded px-2.5 text-xs", i === d ? "bg-bg font-medium ring-1 ring-border-strong" : "text-fg-muted hover:bg-surface-2")}
          >
            {x.name || "—"}
          </button>
        ))}
        {draft.days.length < 4 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft((s) => ({
                ...s,
                days: [...s.days, { ...structuredClone(day), id: uid("dd"), name: `Día ${s.days.length + 1}`, meals: day.meals.map((x) => ({ ...structuredClone(x), id: uid("ml") })) }],
              }));
              setDayIdx(draft.days.length);
            }}
          >
            <Copy className="size-3.5" /> {b.addDay}
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Input
            value={day.name}
            onChange={(e) => updateDay((x) => ({ ...x, name: e.target.value }))}
            maxLength={40}
            aria-label={b.dayName}
            className="h-7 w-40"
          />
          {draft.days.length > 1 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft((s) => ({ ...s, days: s.days.filter((_, i) => i !== d) }));
                setDayIdx(Math.max(0, d - 1));
              }}
            >
              <Trash2 className="size-3.5" /> {b.removeDay}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {/* Objetivo */}
        <div className="flex flex-wrap items-end gap-3">
          <span className="pb-1.5 text-xs font-semibold">{b.targets}</span>
          {MACROS.map((k) => (
            <label key={k} className="flex flex-col gap-0.5 text-2xs text-fg-muted">
              {t.macros[k]} (g)
              <Input
                type="number"
                min={0}
                max={1000}
                value={day.targets[k]}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(1000, Math.round(Number(e.target.value) || 0)));
                  updateDay((x) => ({ ...x, targets: { ...x.targets, [k]: v } }));
                }}
                className="h-7 w-20 text-right tnum"
              />
            </label>
          ))}
          <span className="pb-1.5 text-xs text-fg-muted tnum">= {formatNumber(targetKcal)} kcal</span>
        </div>

        {/* Comidas × grupos */}
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-surface text-2xs text-fg-muted uppercase">
                <th className="h-8 pl-3 text-left font-semibold">{b.meal}</th>
                {GROUP_ORDER.map((g) => (
                  <th key={g} className="w-16 text-center font-semibold">{t.groupsShort[g]}</th>
                ))}
                <th className="w-16 border-l border-border text-right font-semibold">{t.macros.kcal}</th>
                {MACROS.map((k) => <th key={k} className="w-12 text-right font-semibold">{t.macros[k]}</th>)}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {day.meals.map((meal, mi) => {
                const mm = macrosFromRations(meal.rations);
                return (
                  <tr key={meal.id} className="border-t border-border">
                    <td className="py-1 pl-3">
                      <input
                        value={meal.name}
                        onChange={(e) => updateDay((x) => { x.meals[mi].name = e.target.value; return x; })}
                        maxLength={40}
                        aria-label={b.meal}
                        className="h-7 w-full rounded border border-transparent px-1 font-medium hover:border-border focus:border-accent focus:outline-none"
                      />
                    </td>
                    {GROUP_ORDER.map((g) => (
                      <td key={g} className="text-center">
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          step={0.5}
                          value={meal.rations[g] ?? ""}
                          placeholder="·"
                          aria-label={`${meal.name} · ${t.groups[g]}`}
                          onChange={(e) => {
                            const v = Math.round(Math.max(0, Math.min(20, Number(e.target.value) || 0)) * 4) / 4;
                            setRation(mi, g, v);
                          }}
                          className="h-7 w-12 px-1 text-center tnum [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>
                    ))}
                    <td className="border-l border-border text-right tnum">{formatNumber(mm.kcal)}</td>
                    {MACROS.map((k) => <td key={k} className="text-right tnum text-fg-muted">{Math.round(mm[k])}</td>)}
                    <td className="text-center">
                      {day.meals.length > 1 && (
                        <button
                          type="button"
                          onClick={() => updateDay((x) => ({ ...x, meals: x.meals.filter((_, j) => j !== mi) }))}
                          aria-label={b.removeMeal}
                          className="text-fg-muted hover:text-fg"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="text-xs">
              <SummaryRow label={b.total} values={totals} cols={GROUP_ORDER.length} rations={sumRations(day.meals.map((x) => x.rations))} />
              <SummaryRow label={b.target} values={{ ...day.targets, kcal: targetKcal }} cols={GROUP_ORDER.length} muted />
              <DiffRow label={b.diff} total={totals} target={{ ...day.targets, kcal: targetKcal }} cols={GROUP_ORDER.length} />
            </tfoot>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button
            size="sm"
            onClick={() => updateDay((x) => ({ ...x, meals: [...x.meals, { id: uid("ml"), name: `Comida ${x.meals.length + 1}`, rations: {} }] }))}
            disabled={day.meals.length >= 8}
          >
            <Plus className="size-3.5" /> {b.addMeal}
          </Button>
          <p className="text-2xs text-fg-subtle">{b.approx}</p>
        </div>

        {/* Platos que encajan */}
        <section>
          <h2 className="mb-2 text-xs font-semibold">{b.fittingDishes}</h2>
          <div className="grid gap-3 xl:grid-cols-2">
            {day.meals.map((meal) => {
              const fits = dishSummaries.filter(({ sum }) => dishFitsMeal(sum.rations, meal.rations));
              return (
                <div key={meal.id} className="rounded border border-border">
                  <div className="flex h-8 items-center justify-between border-b border-border bg-surface px-3 text-xs">
                    <span className="font-semibold">{meal.name}</span>
                    <RationsLine rations={meal.rations} m={m} className="text-2xs text-fg-muted" />
                  </div>
                  {fits.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-fg-subtle">{b.noFittingDishes}</p>
                  ) : (
                    <ul>
                      {fits.map(({ dish, sum }) => (
                        <li key={dish.id} className="border-b border-border last:border-0">
                          <details className="group">
                            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-1.5 text-[13px] hover:bg-surface">
                              <span>{dish.name}</span>
                              <span className="text-2xs text-fg-subtle tnum">
                                {formatNumber(sum.macros.kcal)} kcal · {Math.round(sum.macros.protein)} P · {Math.round(sum.macros.carbs)} HC · {Math.round(sum.macros.fat)} G
                              </span>
                            </summary>
                            <ul className="px-3 pb-2 text-xs text-fg-muted">
                              {dish.ingredients.map((ing) => (
                                <li key={ing.foodId} className="flex justify-between">
                                  <span>{foodMap.get(ing.foodId)?.name}</span>
                                  <span className="tnum">{roundGrams(ing.grams)} g</span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <AssignDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={`${t.assign.title}: ${draft.name}`}
        startLabel={t.assign.startDate}
        onAssign={async (clientIds, startDate) => {
          const res = await assignDietAction({ dietId: draft.id, clientIds, startDate });
          return res.ok ? { ok: true, ...res.data } : { ok: false, error: res.error };
        }}
        dirty={dirty}
        clients={clients}
        defaultStart={today}
        m={m}
      />
    </div>
  );
}

type MacroValues = { kcal: number; protein: number; carbs: number; fat: number };

function SummaryRow({ label, values, cols, muted, rations }: { label: string; values: MacroValues; cols: number; muted?: boolean; rations?: Rations }) {
  return (
    <tr className={cn("border-t border-border", muted ? "text-fg-muted" : "bg-surface font-semibold")}>
      <td className="h-7 pl-4">{label}</td>
      {rations
        ? GROUP_ORDER.map((g) => (
            <td key={g} className="text-center tnum">{rations[g] ? Math.round(rations[g]! * 10) / 10 : ""}</td>
          ))
        : <td colSpan={cols} />}
      <td className="border-l border-border text-right tnum">{formatNumber(Math.round(values.kcal))}</td>
      {MACROS.map((k) => <td key={k} className="text-right tnum">{Math.round(values[k])}</td>)}
      <td />
    </tr>
  );
}

/** Diferencia frente al objetivo: verde ±5 %, ámbar ±10 %, rojo más. */
function DiffRow({ label, total, target, cols }: { label: string; total: MacroValues; target: MacroValues; cols: number }) {
  const cell = (k: keyof MacroValues) => {
    const diff = Math.round(total[k] - target[k]);
    const pct = target[k] ? Math.abs(diff) / target[k] : diff === 0 ? 0 : 1;
    const tone = pct <= 0.05 ? "text-ok" : pct <= 0.1 ? "text-warn" : "text-danger";
    return <span className={tone}>{diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff)}</span>;
  };
  return (
    <tr className="border-t border-border">
      <td className="h-7 pl-4 text-fg-muted">{label}</td>
      <td colSpan={cols} />
      <td className="border-l border-border text-right tnum">{cell("kcal")}</td>
      {MACROS.map((k) => <td key={k} className="text-right tnum">{cell(k)}</td>)}
      <td />
    </tr>
  );
}
