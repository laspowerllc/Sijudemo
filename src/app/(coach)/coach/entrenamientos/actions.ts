"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/data";
import {
  ForbiddenError,
  archiveExercise,
  archiveProgram,
  assignProgram,
  createProgram,
  duplicateProgram,
  saveExercise,
  saveProgram,
  type AssignResult,
} from "@/lib/data/training";
import { assignInput, exerciseInput, programInput } from "@/lib/validation/training";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

/** Toda acción valida la entrada y comprueba permisos en el servidor. */
async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Datos no válidos." };
    if (e instanceof ForbiddenError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Algo ha fallado. Inténtalo de nuevo." };
  }
}

const BASE = "/coach/entrenamientos";

export async function saveExerciseAction(input: unknown) {
  return run(async () => {
    const ex = await saveExercise(await getSession(), exerciseInput.parse(input));
    revalidatePath(BASE, "layout");
    return { id: ex.id };
  });
}

export async function archiveExerciseAction(id: string) {
  return run(async () => {
    await archiveExercise(await getSession(), z.string().parse(id));
    revalidatePath(BASE, "layout");
  });
}

export async function createProgramAction(formData: FormData) {
  const name = z.string().trim().min(2).max(80).safeParse(formData.get("name"));
  if (!name.success) return;
  const program = await createProgram(await getSession(), name.data);
  redirect(`${BASE}/rutinas/${program.id}`);
}

export async function saveProgramAction(input: unknown) {
  return run(async () => {
    const p = await saveProgram(await getSession(), programInput.parse(input));
    revalidatePath(BASE, "layout");
    return { updatedAt: p.updatedAt };
  });
}

export async function duplicateProgramAction(formData: FormData) {
  const copy = await duplicateProgram(await getSession(), z.string().parse(formData.get("id")));
  redirect(`${BASE}/rutinas/${copy.id}`);
}

export async function archiveProgramAction(formData: FormData) {
  await archiveProgram(await getSession(), z.string().parse(formData.get("id")));
  revalidatePath(BASE);
}

export async function assignProgramAction(input: unknown): Promise<ActionResult<AssignResult>> {
  return run(async () => {
    const { programId, clientIds, startDate } = assignInput.parse(input);
    const res = await assignProgram(await getSession(), programId, clientIds, startDate);
    revalidatePath("/coach", "layout");
    return res;
  });
}
