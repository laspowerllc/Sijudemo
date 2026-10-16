import { describe, expect, it } from "vitest";
import { recommendWeight, type PastExerciseSession } from "./progression";

const s = (date: string, sets: [number, number][], isDeload = false): PastExerciseSession => ({
  date,
  isDeload,
  sets: sets.map(([weightKg, reps]) => ({ weightKg, reps })),
});

const base = { repsMax: 10, isDeloadWeek: false, deloadPercent: 60, muscleGroup: "chest" as const, equipment: "barbell" as const };

describe("recommendWeight", () => {
  it("sin historial no recomienda", () => {
    expect(recommendWeight({ ...base, history: [] })).toBeNull();
  });

  it("mantiene si no llegó al máximo de repeticiones en todas las series", () => {
    const r = recommendWeight({ ...base, history: [s("2026-10-01", [[60, 10], [60, 9], [60, 8]])] });
    expect(r).toEqual({ weightKg: 60, reason: "keep", fromKg: 60 });
  });

  it("sube un 2,5 % (mínimo un salto de disco) en tren superior", () => {
    const r = recommendWeight({ ...base, history: [s("2026-10-01", [[60, 10], [60, 10], [60, 11]])] });
    expect(r?.reason).toBe("increase");
    expect(r?.weightKg).toBe(62.5);
  });

  it("sube un 5 % en tren inferior", () => {
    const r = recommendWeight({ ...base, muscleGroup: "quads", history: [s("2026-10-01", [[100, 10], [100, 10]])] });
    expect(r?.weightKg).toBe(105);
  });

  it("usa la sesión normal más reciente e ignora las de descarga", () => {
    const r = recommendWeight({
      ...base,
      history: [s("2026-09-20", [[50, 10], [50, 10]]), s("2026-10-01", [[30, 10], [30, 10]], true), s("2026-09-27", [[55, 8], [55, 8]])],
    });
    expect(r).toEqual({ weightKg: 55, reason: "keep", fromKg: 55 });
  });

  it("en semana de descarga aplica el porcentaje y redondea al salto del material", () => {
    const r = recommendWeight({ ...base, isDeloadWeek: true, history: [s("2026-10-01", [[82.5, 8], [82.5, 8]])] });
    expect(r).toEqual({ weightKg: 50, reason: "deload", fromKg: 82.5 });
  });

  it("toma como peso de trabajo el más repetido (ignora series de aproximación)", () => {
    const r = recommendWeight({ ...base, history: [s("2026-10-01", [[40, 10], [60, 10], [60, 10], [60, 10]])] });
    expect(r?.fromKg).toBe(60);
    expect(r?.reason).toBe("increase");
  });

  it("mancuernas suben de 1 en 1 kg como mínimo", () => {
    const r = recommendWeight({ ...base, equipment: "dumbbell", history: [s("2026-10-01", [[12, 10], [12, 10]])] });
    expect(r?.weightKg).toBe(13);
  });
});
