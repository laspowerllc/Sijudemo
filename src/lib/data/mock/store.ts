import "server-only";
import type { AssignedDiet, AssignedPlan, Diet, Dish, Exercise, Food, Program, WorkoutSession } from "@/lib/types";
import { buildSeed, type Seed } from "./seed";
import { buildExercises, buildPrograms } from "./training-seed";
import { buildDiets, buildDishes, buildFoods } from "./nutrition-seed";
import { buildWorkoutHistory } from "./workout-seed";

/**
 * Almacén en memoria del servidor de desarrollo. Los cambios (ejercicios,
 * rutinas, asignaciones) duran mientras el servidor esté encendido.
 * Se guarda en globalThis para sobrevivir a la recarga en caliente.
 */
/** Súbelo al cambiar la forma del almacén: fuerza a regenerarlo en caliente. */
const STORE_VERSION = 3;

interface Store {
  version: number;
  day: string;
  seed: Seed;
  exercises: Exercise[];
  programs: Program[];
  plans: AssignedPlan[];
  foods: Food[];
  diets: Diet[];
  dishes: Dish[];
  assignedDiets: AssignedDiet[];
  sessions: WorkoutSession[];
}

const g = globalThis as unknown as { __sijuStore?: Store };

export function store(): Store {
  const now = new Date();
  const day = now.toDateString();
  if (!g.__sijuStore || g.__sijuStore.version !== STORE_VERSION) {
    const seed = buildSeed(now);
    const programs = buildPrograms(now);
    const diets = buildDiets(now);
    const exercises = buildExercises();
    const plans = seedPlans(seed, programs, now);
    g.__sijuStore = {
      version: STORE_VERSION,
      day,
      seed,
      exercises,
      programs,
      plans,
      foods: buildFoods(),
      diets,
      dishes: buildDishes(),
      assignedDiets: seedDiets(seed, diets, now),
      sessions: buildWorkoutHistory(plans, exercises, now),
    };
  } else if (g.__sijuStore.day !== day) {
    // La actividad de ejemplo es relativa a "hoy": se regenera al cambiar de día.
    g.__sijuStore.seed = buildSeed(now);
    g.__sijuStore.day = day;
  }
  return g.__sijuStore;
}

function seedPlans(seed: Seed, programs: Program[], now: Date): AssignedPlan[] {
  // Lunes de hace 2 semanas: los clientes van por la semana 3.
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) - 14);
  const startDate = d.toISOString().slice(0, 10);

  return seed.clients
    .filter((c) => c.orgId === programs[0].orgId && (c.status === "active" || c.status === "expired"))
    .map((c, i) => {
      const p = programs[i % 2];
      return {
        id: `plan_${c.id}`,
        orgId: c.orgId,
        clientId: c.id,
        sourceProgramId: p.id,
        name: p.name,
        weeks: structuredClone(p.weeks),
        startDate,
        assignedAt: d.toISOString(),
        archivedAt: null,
      };
    });
}

function seedDiets(seed: Seed, diets: Diet[], now: Date): AssignedDiet[] {
  const start = new Date(now.getTime() - 10 * 86_400_000).toISOString().slice(0, 10);
  return seed.clients
    .filter((c) => c.orgId === diets[0].orgId && c.status === "active")
    .filter((_, i) => i % 3 !== 2)
    .map((c, i) => {
      const d = diets[i % 4 === 3 ? 1 : 0];
      return {
        id: `adiet_${c.id}`,
        orgId: c.orgId,
        clientId: c.id,
        sourceDietId: d.id,
        name: d.name,
        days: structuredClone(d.days),
        startDate: start,
        assignedAt: new Date(`${start}T09:00:00`).toISOString(),
        archivedAt: null,
      };
    });
}

/** Solo desarrollo: vuelve a los datos de ejemplo iniciales. */
export function resetStore() {
  delete g.__sijuStore;
}
