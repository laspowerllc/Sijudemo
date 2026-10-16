import { z } from "zod";
import { parseVideoUrl, LIMITS } from "@/lib/domain/training";

const id = z.string().min(1).max(64);
const MUSCLES = ["chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "core", "full_body", "cardio"] as const;
const EQUIPMENT = ["barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "band", "other"] as const;

export const exerciseInput = z.object({
  id: id.optional(),
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(80),
  muscleGroup: z.enum(MUSCLES),
  equipment: z.enum(EQUIPMENT),
  videoUrl: z
    .string()
    .trim()
    .max(300)
    .transform((v) => v || null)
    .refine((v) => v === null || parseVideoUrl(v) !== null, "Solo enlaces de YouTube o Vimeo"),
  instructions: z.string().trim().max(1000),
});
export type ExerciseInput = z.infer<typeof exerciseInput>;

const item = z
  .object({
    id,
    exerciseId: id,
    sets: z.number().int().min(1).max(LIMITS.maxSets),
    repsMin: z.number().int().min(1).max(LIMITS.maxReps),
    repsMax: z.number().int().min(1).max(LIMITS.maxReps),
    rir: z.number().int().min(0).max(LIMITS.maxRir).nullable(),
    restSec: z.number().int().min(0).max(LIMITS.maxRestSec),
    notes: z.string().trim().max(300),
  })
  .refine((x) => x.repsMin <= x.repsMax, "Las repeticiones mínimas superan a las máximas");

const day = z.object({
  id,
  name: z.string().trim().min(1).max(40),
  items: z.array(item).max(LIMITS.maxItemsPerDay),
});

const week = z.object({
  id,
  isDeload: z.boolean(),
  deloadPercent: z.number().int().min(30).max(95),
  days: z.array(day).min(1).max(LIMITS.maxDaysPerWeek),
});

export const programInput = z.object({
  id,
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300),
  weeks: z.array(week).min(1).max(LIMITS.maxWeeks),
});
export type ProgramInput = z.infer<typeof programInput>;

export const assignInput = z.object({
  programId: id,
  clientIds: z.array(id).min(1).max(200),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((d) => new Date(`${d}T00:00:00Z`).getUTCDay() === 1, "La fecha de inicio debe ser un lunes."),
});
