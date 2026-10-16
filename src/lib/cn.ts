import clsx, { type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Registrar el tamaño de texto propio (text-2xs) para que no se confunda con un color.
const twMerge = extendTailwindMerge({ extend: { theme: { text: ["2xs"] } } });

/** Une clases y resuelve conflictos de Tailwind (la última gana: "w-full" + "w-11" → "w-11"). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
