"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";

export interface PickerItem {
  id: string;
  label: string;
  hint?: string;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Buscador con teclado: escribe, ↑/↓ para moverte, Enter para elegir. */
export function SearchPicker({
  items,
  onPick,
  placeholder,
  className,
}: {
  items: PickerItem[];
  onPick: (id: string) => void;
  placeholder: string;
  className?: string;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const words = norm(q.trim()).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return items.filter((it) => words.every((w) => norm(`${it.label} ${it.hint ?? ""}`).includes(w))).slice(0, 8);
  }, [q, items]);

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
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          "h-8 w-full border-0 bg-transparent px-3 text-[13px] placeholder:text-fg-subtle focus:bg-accent-soft/40 focus:outline-none",
          className,
        )}
      />
      {open && results.length > 0 && (
        <ul className="absolute top-full left-0 z-20 mt-px w-full max-w-md rounded border border-border-strong bg-bg py-1" role="listbox">
          {results.map((it, i) => (
            <li
              key={it.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(ev) => {
                ev.preventDefault();
                pick(it.id);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-[13px]", i === active && "bg-surface-2")}
            >
              <span>{it.label}</span>
              {it.hint && <span className="text-2xs text-fg-subtle">{it.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
