import "server-only";
import type { AssignedDiet, Diet, Dish, Food, Session } from "@/lib/types";
import type { DietInput, DishInput } from "@/lib/validation/nutrition";
import { store } from "./mock/store";
import { getClientRow, listClientRows } from "./index";
import { ForbiddenError, type AssignResult } from "./training";

/** Mismas reglas que entrenamiento: solo el propietario edita; nada se borra. */

function requireOwner(session: Session): string {
  if (session.role !== "owner" || !session.orgId) throw new ForbiddenError();
  return session.orgId;
}

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

/* ───── Alimentos ───── */

export async function listFoods(session: Session): Promise<Food[]> {
  if (session.role === "platform_admin") return [];
  return store()
    .foods.filter((f) => f.orgId === null || f.orgId === session.orgId)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/* ───── Platos ───── */

/** Coaches y clientes de la organización (el cliente los ve para cocinar su dieta). */
export async function listDishes(session: Session): Promise<Dish[]> {
  if (session.role === "platform_admin" || !session.orgId) return [];
  return store()
    .dishes.filter((d) => d.orgId === session.orgId && !d.archivedAt)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function saveDish(session: Session, input: DishInput): Promise<Dish> {
  const orgId = requireOwner(session);
  const s = store();
  const usable = new Set(s.foods.filter((f) => f.orgId === null || f.orgId === orgId).map((f) => f.id));
  if (input.ingredients.some((i) => !usable.has(i.foodId))) throw new ForbiddenError("Ingrediente no disponible.");
  if (input.id) {
    const dish = s.dishes.find((d) => d.id === input.id && d.orgId === orgId && !d.archivedAt);
    if (!dish) throw new ForbiddenError();
    Object.assign(dish, { name: input.name, ingredients: input.ingredients, instructions: input.instructions });
    return dish;
  }
  const dish: Dish = { ...input, id: newId("dish"), orgId, archivedAt: null };
  s.dishes.push(dish);
  return dish;
}

export async function archiveDish(session: Session, id: string): Promise<void> {
  const orgId = requireOwner(session);
  const dish = store().dishes.find((d) => d.id === id && d.orgId === orgId);
  if (!dish) throw new ForbiddenError();
  dish.archivedAt = new Date().toISOString();
}

/* ───── Dietas (plantillas) ───── */

export async function listDiets(session: Session): Promise<Diet[]> {
  if (session.role !== "owner") return [];
  return store()
    .diets.filter((d) => d.orgId === session.orgId && !d.archivedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getDiet(session: Session, id: string): Promise<Diet | null> {
  if (session.role !== "owner") return null;
  return store().diets.find((d) => d.id === id && d.orgId === session.orgId && !d.archivedAt) ?? null;
}

export async function createDiet(session: Session, name: string): Promise<Diet> {
  const orgId = requireOwner(session);
  const diet: Diet = {
    id: newId("diet"),
    orgId,
    name,
    description: "",
    days: [
      {
        id: newId("dd"),
        name: "Todos los días",
        targets: { protein: 140, carbs: 200, fat: 60 },
        meals: ["Desayuno", "Comida", "Merienda", "Cena"].map((n) => ({ id: newId("ml"), name: n, rations: {} })),
      },
    ],
    updatedAt: new Date().toISOString(),
    archivedAt: null,
  };
  store().diets.push(diet);
  return diet;
}

export async function saveDiet(session: Session, input: DietInput): Promise<Diet> {
  requireOwner(session);
  const diet = await getDiet(session, input.id);
  if (!diet) throw new ForbiddenError();
  Object.assign(diet, { name: input.name, description: input.description, days: input.days, updatedAt: new Date().toISOString() });
  return diet;
}

export async function duplicateDiet(session: Session, id: string): Promise<Diet> {
  requireOwner(session);
  const src = await getDiet(session, id);
  if (!src) throw new ForbiddenError();
  const copy: Diet = { ...structuredClone(src), id: newId("diet"), name: `${src.name} (copia)`, updatedAt: new Date().toISOString() };
  store().diets.push(copy);
  return copy;
}

export async function archiveDiet(session: Session, id: string): Promise<void> {
  requireOwner(session);
  const d = await getDiet(session, id);
  if (!d) throw new ForbiddenError();
  d.archivedAt = new Date().toISOString();
}

/* ───── Dietas asignadas ───── */

export async function assignDiet(session: Session, dietId: string, clientIds: string[], startDate: string): Promise<AssignResult> {
  const orgId = requireOwner(session);
  const diet = await getDiet(session, dietId);
  if (!diet) throw new ForbiddenError();
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
    s.assignedDiets.filter((a) => a.clientId === clientId && !a.archivedAt).forEach((a) => (a.archivedAt = now));
    s.assignedDiets.push({
      id: newId("adiet"),
      orgId,
      clientId,
      sourceDietId: diet.id,
      name: diet.name,
      days: structuredClone(diet.days),
      startDate,
      assignedAt: now,
      archivedAt: null,
    });
    result.assigned.push(clientId);
  }
  return result;
}

export async function getActiveDiet(session: Session, clientId: string): Promise<AssignedDiet | null> {
  const row = await getClientRow(session, clientId);
  if (!row) return null;
  return store().assignedDiets.find((a) => a.clientId === clientId && !a.archivedAt) ?? null;
}

export async function listActiveDietsByClient(session: Session): Promise<Map<string, AssignedDiet>> {
  const map = new Map<string, AssignedDiet>();
  if (session.role !== "owner" && session.role !== "assistant") return map;
  const visible = new Set((await listClientRows(session)).map((r) => r.client.id));
  for (const a of store().assignedDiets) if (!a.archivedAt && visible.has(a.clientId)) map.set(a.clientId, a);
  return map;
}
