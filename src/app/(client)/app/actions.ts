"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/data";
import { ForbiddenError } from "@/lib/data/training";
import { saveWorkoutSession } from "@/lib/data/workouts";
import { workoutSessionInput } from "@/lib/validation/workout";

export type SyncResult = { ok: true } | { ok: false; error: string; retry: boolean };

/** Sincroniza una sesión de entreno. `retry: false` = error definitivo (no reintentar). */
export async function syncWorkoutAction(input: unknown): Promise<SyncResult> {
  try {
    await saveWorkoutSession(await getSession(), workoutSessionInput.parse(input));
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: "Datos no válidos.", retry: false };
    if (e instanceof ForbiddenError) return { ok: false, error: e.message, retry: false };
    console.error(e);
    return { ok: false, error: "Error del servidor.", retry: true };
  }
}
