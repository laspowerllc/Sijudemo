const DAY_MS = 86_400_000;

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

const shortDate = new Intl.DateTimeFormat("es", { day: "2-digit", month: "short" });
const weekdayFmt = new Intl.DateTimeFormat("es", { weekday: "long" });

export function formatShortDate(iso: string | null): string {
  return iso ? shortDate.format(new Date(iso)) : "—";
}

/** "hoy", "ayer", "hace 3 d" — para columnas densas. */
export function formatRelativeDays(iso: string | null, now: Date): string {
  if (!iso) return "—";
  const days = daysBetween(new Date(iso), now);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  return `hace ${days} d`;
}

/** Días hasta una fecha futura: "en 3 d", "hoy", "vencida". */
export function formatDaysUntil(iso: string | null, now: Date): string {
  if (!iso) return "—";
  const days = Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY_MS);
  if (days < 0) return "vencida";
  if (days === 0) return "hoy";
  return `en ${days} d`;
}

export function weekdayName(weekday: number): string {
  // 2023-01-01 fue domingo
  return weekdayFmt.format(new Date(2023, 0, 1 + weekday));
}

export function formatMoney(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es", { style: "currency", currency, maximumFractionDigits: 0, useGrouping: "always" }).format(cents / 100);
}

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)} %`;
}

const intFmt = new Intl.NumberFormat("es", { useGrouping: "always" });

/** Agrupa siempre los miles (en "es" Intl no agrupa 4 cifras por defecto). */
export function formatNumber(n: number): string {
  return intFmt.format(n);
}
