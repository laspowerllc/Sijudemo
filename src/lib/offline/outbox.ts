"use client";

import { syncWorkoutAction } from "@/app/(client)/app/actions";
import type { WorkoutSessionInput } from "@/lib/validation/workout";

/**
 * Cola local de entrenos pendientes de enviar. Se guarda en localStorage para
 * que el cliente pueda entrenar sin cobertura: al volver la conexión se envía.
 * Nunca se descarta un entreno: si el servidor lo rechaza, queda en "failed"
 * para poder revisarlo.
 */

const OUTBOX = "siju:outbox";
const FAILED = "siju:outbox-failed";
const EVENT = "siju:outbox";

function read<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function write<T>(key: string, list: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Almacenamiento lleno o bloqueado: no hay mucho más que hacer en el cliente.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function pendingCount(): number {
  return read(OUTBOX).length;
}

export function enqueue(session: WorkoutSessionInput) {
  const list = read<WorkoutSessionInput>(OUTBOX).filter((s) => s.id !== session.id);
  write(OUTBOX, [...list, session]);
}

let flushing = false;

/** Envía lo pendiente. Devuelve cuántos quedan. */
export async function flush(): Promise<number> {
  if (flushing || (typeof navigator !== "undefined" && !navigator.onLine)) return pendingCount();
  flushing = true;
  try {
    for (const item of read<WorkoutSessionInput>(OUTBOX)) {
      let res;
      try {
        res = await syncWorkoutAction(item);
      } catch {
        break; // Sin red: se reintenta con el próximo evento "online".
      }
      if (res.ok || !res.retry) {
        write(OUTBOX, read<WorkoutSessionInput>(OUTBOX).filter((s) => s.id !== item.id));
        if (!res.ok) write(FAILED, [...read(FAILED), { ...item, error: res.error }]);
      } else {
        break;
      }
    }
  } finally {
    flushing = false;
  }
  return pendingCount();
}

export function subscribe(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  window.addEventListener("online", fn);
  window.addEventListener("offline", fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("online", fn);
    window.removeEventListener("offline", fn);
    window.removeEventListener("storage", fn);
  };
}

/* ───── Borradores del entreno en curso ───── */

const draftKey = (planId: string, week: number, dayId: string) => `siju:draft:${planId}:${week}:${dayId}`;

export function loadDraft<T>(planId: string, week: number, dayId: string): T | null {
  try {
    const raw = localStorage.getItem(draftKey(planId, week, dayId));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft(planId: string, week: number, dayId: string, value: unknown) {
  try {
    localStorage.setItem(draftKey(planId, week, dayId), JSON.stringify(value));
  } catch {
    /* ignorar */
  }
}

export function clearDraft(planId: string, week: number, dayId: string) {
  try {
    localStorage.removeItem(draftKey(planId, week, dayId));
  } catch {
    /* ignorar */
  }
}
