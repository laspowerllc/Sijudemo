"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/data";
import { ForbiddenError, type AssignResult } from "@/lib/data/training";
import { archiveDiet, archiveDish, assignDiet, createDiet, duplicateDiet, saveDiet, saveDish } from "@/lib/data/nutrition";
import { assignDietInput, dietInput, dishInput } from "@/lib/validation/nutrition";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

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

const BASE = "/coach/nutricion";

export async function createDietAction(formData: FormData) {
  const name = z.string().trim().min(2).max(80).safeParse(formData.get("name"));
  if (!name.success) return;
  const diet = await createDiet(await getSession(), name.data);
  redirect(`${BASE}/dietas/${diet.id}`);
}

export async function saveDietAction(input: unknown) {
  return run(async () => {
    const d = await saveDiet(await getSession(), dietInput.parse(input));
    revalidatePath(BASE, "layout");
    return { updatedAt: d.updatedAt };
  });
}

export async function duplicateDietAction(formData: FormData) {
  const copy = await duplicateDiet(await getSession(), z.string().parse(formData.get("id")));
  redirect(`${BASE}/dietas/${copy.id}`);
}

export async function archiveDietAction(formData: FormData) {
  await archiveDiet(await getSession(), z.string().parse(formData.get("id")));
  revalidatePath(BASE);
}

export async function assignDietAction(input: unknown): Promise<ActionResult<AssignResult>> {
  return run(async () => {
    const { dietId, clientIds, startDate } = assignDietInput.parse(input);
    const res = await assignDiet(await getSession(), dietId, clientIds, startDate);
    revalidatePath("/coach", "layout");
    return res;
  });
}

export async function saveDishAction(input: unknown) {
  return run(async () => {
    const d = await saveDish(await getSession(), dishInput.parse(input));
    revalidatePath(BASE, "layout");
    return { id: d.id };
  });
}

export async function archiveDishAction(id: string) {
  return run(async () => {
    await archiveDish(await getSession(), z.string().parse(id));
    revalidatePath(BASE, "layout");
  });
}
