import "server-only";
import type { AssignedPlan, Exercise, Program, ProgramWeek, Session } from "@/lib/types";
import type { ExerciseInput, ProgramInput } from "@/lib/validation/training";
import { store } from "./mock/store";
import { getClientRow, listClientRows } from "./index";

/**
 * Repositorio de entrenamiento. Reglas (las mismas que tendrá RLS):
 *  - Biblioteca base (orgId null): lectura para todos los coaches, sin edición.
 *  - Ejercicios y rutinas propios: solo su organización; solo el propietario edita.
 *  - Planes asignados: los ve quien puede ver al cliente.
 *  - Nada se borra: se archiva.
 */

export class ForbiddenError extends Error {
  constructor(message = "No tienes permiso para esta acción.") {
    super(message);
  }
}

function requireOwner(session: Session): string {
  if (session.role !== "owner" || !session.orgId) throw new ForbiddenError();
  return session.orgId;
}

function isCoach(session: Session) {
  return session.role === "owner" || session.role === "assistant";
}

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

/* ───── Ejercicios ───── */

export async function listExercises(session: Session): Promise<Exercise[]> {
  if (!isCoach(session)) return [];
  return store()
    .exercises.filter((e) => !e.archivedAt && (e.orgId === null || e.orgId === session.orgId))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Ejercicios referenciados por un plan (también los archivados, para no romper planes antiguos). */
export async function getExercisesByIds(session: Session, ids: string[]): Promise<Exercise[]> {
  const set = new Set(ids);
  return store().exercises.filter((e) => set.has(e.id) && (e.orgId === null || e.orgId === session.orgId));
}

export async function saveExercise(session: Session, input: ExerciseInput): Promise<Exercise> {
  const orgId = requireOwner(session);
  const s = store();
  if (input.id) {
    const ex = s.exercises.find((e) => e.id === input.id);
    if (!ex || ex.orgId !== orgId) throw new ForbiddenError("Los ejercicios de la biblioteca base no se pueden editar. Duplícalo.");
    Object.assign(ex, { ...input, id: ex.id });
    return ex;
  }
  const ex: Exercise = { ...input, id: newId("ex"), orgId, archivedAt: null };
  s.exercises.push(ex);
  return ex;
}

export async function archiveExercise(session: Session, id: string): Promise<void> {
  const orgId = requireOwner(session);
  const ex = store().exercises.find((e) => e.id === id);
  if (!ex || ex.orgId !== orgId) throw new ForbiddenError();
  ex.archivedAt = new Date().toISOString();
}

/* ───── Rutinas (plantillas) ───── */

export async function listPrograms(session: Session): Promise<Program[]> {
  if (session.role !== "owner") return [];
  return store()
    .programs.filter((p) => p.orgId === session.orgId && !p.archivedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProgram(session: Session, id: string): Promise<Program | null> {
  if (session.role !== "owner") return null;
  return store().programs.find((p) => p.id === id && p.orgId === session.orgId && !p.archivedAt) ?? null;
}

export async function createProgram(session: Session, name: string): Promise<Program> {
  const orgId = requireOwner(session);
  const program: Program = {
    id: newId("prg"),
    orgId,
    name,
    description: "",
    weeks: [{ id: newId("wk"), isDeload: false, deloadPercent: 60, days: [{ id: newId("d"), name: "Día 1", items: [] }] }],
    updatedAt: new Date().toISOString(),
    archivedAt: null,
  };
  store().programs.push(program);
  return program;
}

export async function saveProgram(session: Session, input: ProgramInput): Promise<Program> {
  const orgId = requireOwner(session);
  const program = await getProgram(session, input.id);
  if (!program) throw new ForbiddenError();
  await assertExercisesUsable(orgId, input.weeks);
  Object.assign(program, { name: input.name, description: input.description, weeks: input.weeks, updatedAt: new Date().toISOString() });
  return program;
}

export async function duplicateProgram(session: Session, id: string): Promise<Program> {
  requireOwner(session);
  const src = await getProgram(session, id);
  if (!src) throw new ForbiddenError();
  const copy: Program = { ...structuredClone(src), id: newId("prg"), name: `${src.name} (copia)`, updatedAt: new Date().toISOString() };
  store().programs.push(copy);
  return copy;
}

export async function archiveProgram(session: Session, id: string): Promise<void> {
  requireOwner(session);
  const p = await getProgram(session, id);
  if (!p) throw new ForbiddenError();
  p.archivedAt = new Date().toISOString();
}

async function assertExercisesUsable(orgId: string, weeks: ProgramWeek[]) {
  const usable = new Set(store().exercises.filter((e) => !e.archivedAt && (e.orgId === null || e.orgId === orgId)).map((e) => e.id));
  for (const w of weeks) for (const d of w.days) for (const it of d.items) {
    if (!usable.has(it.exerciseId)) throw new ForbiddenError("La rutina contiene un ejercicio no disponible.");
  }
}

/* ───── Planes asignados ───── */

export interface AssignResult {
  assigned: string[];
  skipped: { clientId: string; reason: string }[];
}

/**
 * Copia la rutina en un plan para cada cliente. El plan activo anterior se
 * archiva (no se borra). Los clientes vencidos no reciben planes nuevos.
 */
export async function assignProgram(
  session: Session,
  programId: string,
  clientIds: string[],
  startDate: string,
): Promise<AssignResult> {
  const orgId = requireOwner(session);
  const program = await getProgram(session, programId);
  if (!program) throw new ForbiddenError();
  if (program.weeks.every((w) => w.days.every((d) => d.items.length === 0))) {
    throw new ForbiddenError("La rutina está vacía.");
  }

  const s = store();
  const now = new Date().toISOString();
  const result: AssignResult = { assigned: [], skipped: [] };

  for (const clientId of new Set(clientIds)) {
    const row = await getClientRow(session, clientId);
    if (!row) {
      result.skipped.push({ clientId, reason: "No encontrado" });
      continue;
    }
    if (row.client.status === "expired") {
      result.skipped.push({ clientId, reason: "Suscripción vencida" });
      continue;
    }
    s.plans.filter((p) => p.clientId === clientId && !p.archivedAt).forEach((p) => (p.archivedAt = now));
    s.plans.push({
      id: newId("plan"),
      orgId,
      clientId,
      sourceProgramId: program.id,
      name: program.name,
      weeks: structuredClone(program.weeks),
      startDate,
      assignedAt: now,
      archivedAt: null,
    });
    result.assigned.push(clientId);
  }
  return result;
}

export async function getActivePlan(session: Session, clientId: string): Promise<AssignedPlan | null> {
  const row = await getClientRow(session, clientId);
  if (!row) return null;
  return store().plans.find((p) => p.clientId === clientId && !p.archivedAt) ?? null;
}

export async function listActivePlansByClient(session: Session): Promise<Map<string, AssignedPlan>> {
  const map = new Map<string, AssignedPlan>();
  if (!isCoach(session)) return map;
  const visible = new Set((await listClientRows(session)).map((r) => r.client.id));
  for (const p of store().plans) if (!p.archivedAt && visible.has(p.clientId)) map.set(p.clientId, p);
  return map;
}
