import type { AssignedPlan, Exercise, WorkoutSession } from "@/lib/types";
import { weightStep } from "@/lib/domain/progression";

/**
 * Historial de ejemplo: cada cliente con plan ha completado las semanas
 * anteriores a la actual. Los pesos suben cuando se llega al máximo de reps,
 * para que el peso recomendado tenga datos con los que trabajar.
 */
export function buildWorkoutHistory(plans: AssignedPlan[], exercises: Exercise[], now: Date): WorkoutSession[] {
  const exById = new Map(exercises.map((e) => [e.id, e]));
  const sessions: WorkoutSession[] = [];

  for (const plan of plans) {
    const start = new Date(`${plan.startDate}T00:00:00`);
    const seed = [...plan.clientId].reduce((a, c) => a + c.charCodeAt(0), 0);
    const weight = new Map<string, number>();

    plan.weeks.forEach((week, w) => {
      week.days.forEach((day, d) => {
        const date = new Date(start.getTime() + (w * 7 + d * 2) * 86_400_000 + 18 * 3_600_000);
        if (date >= now) return;
        const sets = day.items.flatMap((it, i) => {
          const ex = exById.get(it.exerciseId);
          const loaded = ex && !["bodyweight", "other"].includes(ex.equipment);
          if (loaded && !weight.has(it.exerciseId)) weight.set(it.exerciseId, initialWeight(ex.equipment, seed + i));
          const kg = loaded ? weight.get(it.exerciseId)! : null;
          const hitTop = (i + w + seed) % 2 === 0;
          return Array.from({ length: it.sets }, (_, k) => ({
            itemId: it.id,
            exerciseId: it.exerciseId,
            setIndex: k,
            weightKg: kg,
            reps: hitTop ? it.repsMax : Math.max(it.repsMin, it.repsMax - 1 - (k % 2)),
            rir: it.rir,
            done: true,
          }));
        });
        // Progresión para la semana siguiente
        day.items.forEach((it, i) => {
          const ex = exById.get(it.exerciseId);
          if (ex && weight.has(it.exerciseId) && (i + w + seed) % 2 === 0 && !week.isDeload) {
            weight.set(it.exerciseId, weight.get(it.exerciseId)! + weightStep(ex.equipment));
          }
        });
        sessions.push({
          id: `ws_${plan.id}_${w}_${d}`,
          orgId: plan.orgId,
          clientId: plan.clientId,
          planId: plan.id,
          weekIndex: w,
          dayId: day.id,
          isDeload: week.isDeload,
          startedAt: new Date(date.getTime() - 3_600_000).toISOString(),
          completedAt: date.toISOString(),
          sets,
          archivedAt: null,
        });
      });
    });
  }
  return sessions;
}

function initialWeight(equipment: Exercise["equipment"], n: number): number {
  const pick = (opts: number[]) => opts[n % opts.length];
  switch (equipment) {
    case "barbell":
      return pick([40, 50, 60, 70, 80]);
    case "dumbbell":
    case "kettlebell":
      return pick([10, 12, 14, 16, 20]);
    case "machine":
      return pick([30, 40, 50, 60]);
    case "cable":
      return pick([15, 20, 25, 30]);
    default:
      return 10;
  }
}
