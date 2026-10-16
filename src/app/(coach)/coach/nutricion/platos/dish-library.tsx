"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import type { Messages } from "@/i18n";
import type { Dish, DishIngredient, Food } from "@/lib/types";
import { gramsPerRation, roundGrams, summarizeDish } from "@/lib/domain/nutrition";
import { formatNumber } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Empty } from "@/components/ui/panel";
import { SearchPicker } from "@/components/ui/search-picker";
import { RationsLine } from "@/components/coach/rations";
import { archiveDishAction, saveDishAction } from "../actions";

type Draft = { id?: string; name: string; ingredients: DishIngredient[]; instructions: string };

export function DishLibrary({ dishes, foods, m }: { dishes: Dish[]; foods: Food[]; m: Messages }) {
  const t = m.nutrition.dish;
  const foodMap = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
  const pickerItems = useMemo(() => foods.map((f) => ({ id: f.id, label: f.name, hint: m.nutrition.groups[f.group] })), [foods, m]);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return dishes
      .filter((d) => !query || d.name.toLowerCase().includes(query))
      .map((d) => ({ dish: d, sum: summarizeDish(d, foodMap) }));
  }, [dishes, q, foodMap]);

  const sum = draft ? summarizeDish(draft, foodMap) : null;

  const save = () =>
    startTransition(async () => {
      const res = await saveDishAction(draft);
      if (res.ok) setDraft(null);
      else setError(res.error);
    });

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-5 py-2">
        <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="w-64" aria-label={t.search} />
        <Button
          variant="primary"
          className="ml-auto"
          onClick={() => {
            setError(null);
            setDraft({ name: "", ingredients: [], instructions: "" });
          }}
        >
          <Plus className="size-4" /> {t.newDish}
        </Button>
      </div>

      {rows.length === 0 ? (
        <Empty>{t.noDishes}</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th className="pl-5">{t.name}</Th>
              <Th className="text-right">{m.nutrition.macros.kcal}</Th>
              <Th className="text-right">{m.nutrition.macros.protein}</Th>
              <Th className="text-right">{m.nutrition.macros.carbs}</Th>
              <Th className="text-right">{m.nutrition.macros.fat}</Th>
              <Th>{t.rations}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ dish, sum }) => (
              <Tr
                key={dish.id}
                className="cursor-pointer"
                onClick={() => {
                  setError(null);
                  setDraft({ id: dish.id, name: dish.name, ingredients: dish.ingredients, instructions: dish.instructions });
                }}
              >
                <Td className="pl-5 font-medium">{dish.name}</Td>
                <Td className="text-right tnum">{formatNumber(sum.macros.kcal)}</Td>
                <Td className="text-right tnum">{Math.round(sum.macros.protein)}</Td>
                <Td className="text-right tnum">{Math.round(sum.macros.carbs)}</Td>
                <Td className="text-right tnum">{Math.round(sum.macros.fat)}</Td>
                <Td className="text-fg-muted"><RationsLine rations={sum.rations} m={m} /></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <Dialog open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? t.editDish : t.newDish} className="max-w-2xl">
        {draft && sum && (
          <form
            className="flex flex-col gap-3 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <Field label={t.name}>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required minLength={2} maxLength={80} autoFocus />
            </Field>

            <div>
              <div className="mb-1 text-xs font-medium text-fg-muted">{t.ingredients}</div>
              <div className="rounded border border-border">
                {draft.ingredients.map((ing, i) => {
                  const f = foodMap.get(ing.foodId);
                  const gpr = f ? gramsPerRation(f) : null;
                  return (
                    <div key={`${ing.foodId}-${i}`} className="flex items-center gap-2 border-b border-border px-3 py-1">
                      <span className="flex-1 text-[13px]">{f?.name ?? "—"}</span>
                      {f && <span className="text-2xs text-fg-subtle">{m.nutrition.groups[f.group]}{gpr && ` · ${(Math.round((ing.grams / gpr) * 10) / 10).toLocaleString("es")} rac.`}</span>}
                      <Input
                        type="number"
                        min={1}
                        max={2000}
                        value={ing.grams}
                        onChange={(e) => {
                          const grams = Math.max(1, Math.min(2000, Math.round(Number(e.target.value) || 0)));
                          setDraft({ ...draft, ingredients: draft.ingredients.map((x, j) => (j === i ? { ...x, grams } : x)) });
                        }}
                        aria-label={`${f?.name} (g)`}
                        className="h-7 w-16 px-1 text-right tnum"
                      />
                      <span className="text-xs text-fg-muted">{t.grams}</span>
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, ingredients: draft.ingredients.filter((_, j) => j !== i) })}
                        className="text-fg-muted hover:text-fg"
                        aria-label="Quitar"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
                <SearchPicker
                  items={pickerItems}
                  placeholder={t.addIngredient}
                  onPick={(foodId) => {
                    const f = foodMap.get(foodId);
                    const gpr = f ? gramsPerRation(f) : null;
                    // Por defecto, 1 ración del alimento.
                    setDraft({ ...draft, ingredients: [...draft.ingredients, { foodId, grams: gpr ? roundGrams(gpr) : 100 }] });
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-px overflow-hidden rounded border border-border bg-border text-center">
              {(["kcal", "protein", "carbs", "fat"] as const).map((k) => (
                <div key={k} className="bg-surface px-2 py-1.5">
                  <div className="text-2xs text-fg-muted uppercase">{m.nutrition.macros[k]}</div>
                  <div className="font-semibold tnum">{formatNumber(Math.round(sum.macros[k]))}</div>
                </div>
              ))}
              <div className="bg-surface px-2 py-1.5">
                <div className="text-2xs text-fg-muted uppercase">{t.rations}</div>
                <RationsLine rations={sum.rations} m={m} className="text-2xs" />
              </div>
            </div>

            <Field label={t.instructions}>
              <Textarea value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} maxLength={2000} />
            </Field>

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex items-center justify-between border-t border-border pt-3">
              <div>
                {draft.id && (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await archiveDishAction(draft.id!);
                        if (res.ok) setDraft(null);
                        else setError(res.error);
                      })
                    }
                  >
                    {m.training.archive}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setDraft(null)}>{m.common.cancel}</Button>
                <Button type="submit" variant="primary" disabled={pending}>{m.common.save}</Button>
              </div>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
