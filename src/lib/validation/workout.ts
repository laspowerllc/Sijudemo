import { z } from "zod";

const id = z.string().min(1).max(64);

export const workoutSessionInput = z.object({
  id: z.string().regex(/^ws_[\w-]{8,64}$/),
  planId: id,
  weekIndex: z.number().int().min(0).max(51),
  dayId: id,
  startedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
  sets: z
    .array(
      z.object({
        itemId: id,
        exerciseId: id,
        setIndex: z.number().int().min(0).max(19),
        weightKg: z.number().min(0).max(1000).nullable(),
        reps: z.number().int().min(0).max(200).nullable(),
        rir: z.number().int().min(0).max(10).nullable(),
        done: z.boolean(),
      }),
    )
    .max(300),
});
export type WorkoutSessionInput = z.infer<typeof workoutSessionInput>;
