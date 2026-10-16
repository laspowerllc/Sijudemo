import type { Equipment, MuscleGroup } from "@/lib/types";

/**
 * Peso recomendado por serie (doble progresión).
 *
 *  - Sin historial → sin recomendación.
 *  - Semana de descarga → % de descarga sobre el último peso de una semana normal.
 *  - Si en la última sesión normal completó el máximo de repeticiones en todas
 *    las series → sube (2,5 % tren superior, 5 % tren inferior), al menos un salto de disco.
 *  - Si no → mantiene el peso.
 */

export interface PastSet {
  weightKg: number | null;
  reps: number | null;
}

export interface PastExerciseSession {
  date: string;
  isDeload: boolean;
  sets: PastSet[];
}

export interface Recommendation {
  weightKg: number;
  reason: "increase" | "keep" | "deload";
  /** Peso de referencia (última sesión normal). */
  fromKg: number;
}

const LOWER: MuscleGroup[] = ["quads", "hamstrings", "glutes", "calves"];

/** Salto mínimo de carga según el material. */
export function weightStep(equipment: Equipment): number {
  switch (equipment) {
    case "barbell":
      return 2.5;
    case "machine":
    case "cable":
      return 2.5;
    case "dumbbell":
    case "kettlebell":
      return 1;
    default:
      return 0.5;
  }
}

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function recommendWeight(input: {
  history: PastExerciseSession[];
  repsMax: number;
  isDeloadWeek: boolean;
  deloadPercent: number;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
}): Recommendation | null {
  const { history, repsMax, isDeloadWeek, deloadPercent, muscleGroup, equipment } = input;
  const step = weightStep(equipment);

  // Última sesión normal (las de descarga no cuentan para progresar).
  const last = [...history]
    .filter((s) => !s.isDeload)
    .sort((a, b) => b.date.localeCompare(a.date))
    .find((s) => s.sets.some((x) => x.weightKg !== null && x.weightKg > 0));
  if (!last) return null;

  const weighted = last.sets.filter((x) => x.weightKg !== null && x.weightKg > 0);
  // Peso de trabajo: el más repetido; si empatan, el mayor.
  const fromKg = topWorkingWeight(weighted.map((x) => x.weightKg!));

  if (isDeloadWeek) {
    return { weightKg: Math.max(step, roundTo((fromKg * deloadPercent) / 100, step)), reason: "deload", fromKg };
  }

  const working = weighted.filter((x) => x.weightKg === fromKg);
  const hitTop = working.length > 0 && working.every((x) => (x.reps ?? 0) >= repsMax);
  if (!hitTop) return { weightKg: fromKg, reason: "keep", fromKg };

  const pct = LOWER.includes(muscleGroup) ? 0.05 : 0.025;
  const next = Math.max(fromKg + step, roundTo(fromKg * (1 + pct), step));
  return { weightKg: next, reason: "increase", fromKg };
}

function topWorkingWeight(weights: number[]): number {
  const count = new Map<number, number>();
  for (const w of weights) count.set(w, (count.get(w) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
}
