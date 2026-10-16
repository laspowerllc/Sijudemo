"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { Messages } from "@/i18n";
import type { MuscleGroup } from "@/lib/types";

export interface PickerExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Buscador con teclado: escribe, ↑/↓ para moverte, Enter para añadir. */
export function ExercisePicker({
  exercises,
  onPick,
  m,
}: {
  exercises: PickerExercise[];
  onPick: (id: string) => void;
  m: Messages;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const query = norm(q.trim());
    if (!query) return [];
    const words = query.split(/\s+/);
    return exercises
      .filter((e) => {
        const hay = `${norm(e.name)} ${norm(m.muscles[e.muscleGroup])}`;
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 8);
  }, [q, exercises, m.muscles]);

  const pick = (id: string) => {
    onPick(id);
    setQ("");
    setActive(0);
  };

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!results.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(results[active].id);
          } else if (e.key === "Escape") {
            setQ("");
          }
        }}
        placeholder={m.training.builder.addExercise}
        aria-label={m.training.builder.addExercise}
        className="h-8 w-full border-0 bg-transparent px-3 text-[13px] placeholder:text-fg-subtle focus:bg-accent-soft/40 focus:outline-none"
      />
      {open && results.length > 0 && (
        <ul className="absolute top-full left-0 z-20 mt-px w-full max-w-md rounded border border-border-strong bg-bg py-1" role="listbox">
          {results.map((e, i) => (
            <li
              key={e.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(ev) => {
                ev.preventDefault();
                pick(e.id);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-center justify-between px-3 py-1.5 text-[13px]", i === active && "bg-surface-2")}
            >
              <span>{e.name}</span>
              <span className="text-2xs text-fg-subtle">{m.muscles[e.muscleGroup]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
