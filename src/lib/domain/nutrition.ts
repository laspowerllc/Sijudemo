import type { Dish, Food, FoodGroup, Macros, Rations } from "@/lib/types";

/**
 * Sistema de equivalentes. Cada grupo tiene un macronutriente "clave" y la
 * cantidad que define 1 ración. Los gramos de cada alimento por ración se
 * calculan a partir de sus valores por 100 g, así todos los alimentos de un
 * grupo son intercambiables.
 */
export const GROUPS: Record<FoodGroup, { key: keyof Omit<Macros, "kcal">; amount: number; ref: Omit<Macros, "kcal"> }> = {
  protein: { key: "protein", amount: 10, ref: { protein: 10, carbs: 0, fat: 3 } },
  carbs: { key: "carbs", amount: 20, ref: { protein: 2, carbs: 20, fat: 0.5 } },
  fat: { key: "fat", amount: 10, ref: { protein: 0, carbs: 0, fat: 10 } },
  dairy: { key: "protein", amount: 7, ref: { protein: 7, carbs: 9, fat: 3 } },
  fruit: { key: "carbs", amount: 15, ref: { protein: 0.5, carbs: 15, fat: 0.2 } },
  veg: { key: "carbs", amount: 5, ref: { protein: 2, carbs: 5, fat: 0.3 } },
};

export const GROUP_ORDER: FoodGroup[] = ["protein", "carbs", "fat", "dairy", "fruit", "veg"];

export function kcalOf(m: { protein: number; carbs: number; fat: number }): number {
  return Math.round(m.protein * 4 + m.carbs * 4 + m.fat * 9);
}

/** Gramos de un alimento que equivalen a 1 ración de su grupo. */
export function gramsPerRation(food: Food): number | null {
  const g = GROUPS[food.group];
  const per100 = food.per100[g.key];
  if (per100 <= 0) return null;
  return (g.amount / per100) * 100;
}

/** Redondeo amable para mostrar cantidades a cocinar. */
export function roundGrams(g: number): number {
  if (g < 20) return Math.round(g);
  if (g < 100) return Math.round(g / 5) * 5;
  return Math.round(g / 10) * 10;
}

/** Macros aproximados de una comida a partir de sus raciones. */
export function macrosFromRations(rations: Rations): Macros {
  const m = { protein: 0, carbs: 0, fat: 0 };
  for (const g of GROUP_ORDER) {
    const n = rations[g] ?? 0;
    m.protein += GROUPS[g].ref.protein * n;
    m.carbs += GROUPS[g].ref.carbs * n;
    m.fat += GROUPS[g].ref.fat * n;
  }
  return { ...m, kcal: kcalOf(m) };
}

export function sumRations(list: Rations[]): Rations {
  const out: Rations = {};
  for (const r of list) for (const g of GROUP_ORDER) if (r[g]) out[g] = (out[g] ?? 0) + r[g]!;
  return out;
}

export interface DishSummary {
  macros: Macros;
  rations: Rations;
}

/** Macros reales del plato y sus raciones por grupo. */
export function summarizeDish(dish: Pick<Dish, "ingredients">, foods: Map<string, Food>): DishSummary {
  const macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const rations: Rations = {};
  for (const ing of dish.ingredients) {
    const f = foods.get(ing.foodId);
    if (!f) continue;
    const k = ing.grams / 100;
    macros.kcal += f.per100.kcal * k;
    macros.protein += f.per100.protein * k;
    macros.carbs += f.per100.carbs * k;
    macros.fat += f.per100.fat * k;
    const gpr = gramsPerRation(f);
    if (gpr) rations[f.group] = (rations[f.group] ?? 0) + ing.grams / gpr;
  }
  return { macros: { ...macros, kcal: Math.round(macros.kcal) }, rations };
}

/**
 * ¿Encaja el plato en la comida? Cada grupo debe coincidir con ±0,5 raciones
 * (la verdura es libre: ±1,5).
 */
export function dishFitsMeal(dish: Rations, meal: Rations): boolean {
  return GROUP_ORDER.every((g) => {
    const tol = g === "veg" ? 1.5 : 0.5;
    return Math.abs((dish[g] ?? 0) - (meal[g] ?? 0)) <= tol;
  });
}

export function formatRation(n: number | undefined): string {
  if (!n) return "—";
  return (Math.round(n * 10) / 10).toLocaleString("es");
}
