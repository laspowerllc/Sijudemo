import type { AssignedPlan } from "@/lib/types";

export const LIMITS = {
  maxWeeks: 16,
  maxDaysPerWeek: 7,
  maxItemsPerDay: 20,
  maxSets: 10,
  maxReps: 100,
  maxRir: 5,
  maxRestSec: 600,
} as const;

/** Lunes de la semana siguiente (o de esta si hoy es lunes), en formato YYYY-MM-DD. */
export function nextMonday(now: Date): string {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const add = (8 - d.getUTCDay()) % 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
}

/** Índice (0-based) de la semana en curso del plan, o null si no ha empezado / ya terminó. */
export function currentWeekIndex(plan: Pick<AssignedPlan, "startDate" | "weeks">, now: Date): number | null {
  const start = new Date(`${plan.startDate}T00:00:00`);
  const diff = Math.floor((now.getTime() - start.getTime()) / (7 * 86_400_000));
  if (diff < 0 || diff >= plan.weeks.length) return null;
  return diff;
}

const YT = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/;
const VIMEO = /^(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/;

/** Solo se aceptan enlaces de YouTube y Vimeo. Devuelve la URL de inserción. */
export function parseVideoUrl(url: string): { provider: "youtube" | "vimeo"; embedUrl: string } | null {
  const yt = url.match(YT);
  if (yt) return { provider: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
  const vm = url.match(VIMEO);
  if (vm) return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${vm[1]}` };
  return null;
}

export function formatReps(min: number, max: number): string {
  return min === max ? String(min) : `${min}–${max}`;
}

export function formatRest(sec: number): string {
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}:${String(s).padStart(2, "0")} min` : `${m} min`;
}
