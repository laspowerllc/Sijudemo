import { describe, expect, it } from "vitest";
import type { Food } from "@/lib/types";
import { dishFitsMeal, gramsPerRation, kcalOf, macrosFromRations, summarizeDish } from "./nutrition";

const food = (id: string, group: Food["group"], p: number, c: number, f: number): Food => ({
  id, orgId: null, name: id, group, per100: { kcal: kcalOf({ protein: p, carbs: c, fat: f }), protein: p, carbs: c, fat: f }, unitGrams: null, unitName: null,
});

describe("equivalencias", () => {
  it("1 ración de proteína de pollo (23 g/100 g) ≈ 43 g", () => {
    expect(gramsPerRation(food("pollo", "protein", 23, 0, 1.5))).toBeCloseTo(43.5, 0);
  });

  it("un alimento sin el macro clave no tiene equivalencia", () => {
    expect(gramsPerRation(food("raro", "protein", 0, 10, 0))).toBeNull();
  });

  it("kcal = 4·P + 4·HC + 9·G", () => {
    expect(kcalOf({ protein: 150, carbs: 190, fat: 60 })).toBe(1900);
  });

  it("macros de una comida a partir de sus raciones", () => {
    const m = macrosFromRations({ protein: 2, fat: 1 });
    expect(m).toMatchObject({ protein: 20, carbs: 0, fat: 16 });
  });

  it("raciones de un plato y si encaja en una comida", () => {
    const foods = new Map([
      ["pollo", food("pollo", "protein", 20, 0, 0)],
      ["arroz", food("arroz", "carbs", 0, 80, 0)],
    ]);
    const { rations } = summarizeDish({ ingredients: [{ foodId: "pollo", grams: 200 }, { foodId: "arroz", grams: 75 }] }, foods);
    expect(rations.protein).toBeCloseTo(4);
    expect(rations.carbs).toBeCloseTo(3);
    expect(dishFitsMeal(rations, { protein: 4, carbs: 3 })).toBe(true);
    expect(dishFitsMeal(rations, { protein: 2, carbs: 3 })).toBe(false);
    // La verdura tiene más tolerancia
    expect(dishFitsMeal(rations, { protein: 4, carbs: 3, veg: 1.5 })).toBe(true);
  });
});
