import type { Locale } from "@/lib/types";
import { es, type Messages } from "./es";

const dictionaries: Record<Locale, Messages> = { es };

export const DEFAULT_LOCALE: Locale = "es";

export function getMessages(locale: Locale = DEFAULT_LOCALE): Messages {
  return dictionaries[locale];
}

/** Sustituye {variables} en un texto. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

export type { Messages };
