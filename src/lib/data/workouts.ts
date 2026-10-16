import "server-only";
import type { Session, WorkoutSession } from "@/lib/types";
import type { PastExerciseSession } from "@/lib/domain/progression";
import type { WorkoutSessionInput } from "@/lib/validation/workout";
import { store } from "./mock/store";
import { getClientRow } from "./index";
import { ForbiddenError } from "./training";

/**
 * Sesiones de entreno. Solo el propio cliente registra; los coaches que pueden
 * ver al cliente las leen. Los registros no se borran nunca (se archivan).
 */

export async function listSessions(session: Session, clientId: string): Promise<WorkoutSession[]> {
  if (!(await getClientRow(session, clientId))) return [];
  return store()
    .sessions.filter((s) => s.clientId === clientId && !s.archivedAt)
    .sort((a, b) => (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt));
}

/** Historial por ejercicio (sesiones completadas, más reciente primero). */
export async function getExerciseHistory(session: Session, clientId: string): Promise<Map<string, PastExerciseSession[]>> {
  const map = new Map<string, PastExerciseSession[]>();
  for (const s of await listSessions(session, clientId)) {
    if (!s.completedAt) continue;
    const byEx = new Map<string, PastExerciseSession>();
    for (const set of s.sets) {
      if (!set.done) continue;
      let entry = byEx.get(set.exerciseId);
      if (!entry) byEx.set(set.exerciseId, (entry = { date: s.completedAt, isDeload: s.isDeload, sets: [] }));
      entry.sets.push({ weightKg: set.weightKg, reps: set.reps });
    }
    for (const [exId, entry] of byEx) map.set(exId, [...(map.get(exId) ?? []), entry]);
  }
  return map;
}

/**
 * Guarda (o vuelve a guardar) una sesión enviada desde el móvil. Es idempotente:
 * el id lo genera el dispositivo, así que reintentar tras estar sin conexión no duplica.
 */
export async function saveWorkoutSession(session: Session, input: WorkoutSessionInput): Promise<void> {
  if (session.role !== "client" || !session.clientId) throw new ForbiddenError();
  const row = await getClientRow(session, session.clientId);
  if (!row) throw new ForbiddenError();
  if (row.client.status !== "active") throw new ForbiddenError("Tu suscripción no está activa: no puedes registrar entrenos nuevos.");

  const s = store();
  // El plan debe ser del cliente (aunque se haya archivado mientras entrenaba sin conexión).
  const plan = s.plans.find((p) => p.id === input.planId && p.clientId === session.clientId);
  if (!plan) throw new ForbiddenError();
  const week = plan.weeks[input.weekIndex];
  const day = week?.days.find((d) => d.id === input.dayId);
  if (!week || !day) throw new ForbiddenError("El día de entreno no existe en tu plan.");
  const items = new Map(day.items.map((i) => [i.id, i]));
  for (const set of input.sets) {
    const it = items.get(set.itemId);
    if (!it || it.exerciseId !== set.exerciseId || set.setIndex >= it.sets + 5) throw new ForbiddenError("Serie no válida.");
  }

  const existing = s.sessions.find((x) => x.id === input.id);
  if (existing) {
    if (existing.clientId !== session.clientId) throw new ForbiddenError();
    Object.assign(existing, { sets: input.sets, completedAt: input.completedAt ?? existing.completedAt });
    return;
  }
  s.sessions.push({
    ...input,
    orgId: plan.orgId,
    clientId: session.clientId,
    isDeload: week.isDeload,
    archivedAt: null,
  });
}
