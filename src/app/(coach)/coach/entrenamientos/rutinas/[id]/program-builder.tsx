"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2, X } from "lucide-react";
import { fmt, type Messages } from "@/i18n";
import type { Program, ProgramDay, ProgramItem } from "@/lib/types";
import { LIMITS } from "@/lib/domain/training";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { assignProgramAction, saveProgramAction } from "../../actions";
import { ExercisePicker, type PickerExercise } from "./exercise-picker";
import { AssignDialog, type AssignableClient } from "@/components/coach/assign-dialog";

type Draft = Pick<Program, "id" | "name" | "description" | "weeks">;

const uid = (p: string) => `${p}_${crypto.randomUUID().slice(0, 8)}`;

/** Copia profunda con ids nuevos (semanas, días y ejercicios). */
function cloneDays(days: ProgramDay[]): ProgramDay[] {
  return days.map((d) => ({ ...d, id: uid("d"), items: d.items.map((i) => ({ ...i, id: uid("it") })) }));
}

type Action =
  | { type: "meta"; name?: string; description?: string }
  | { type: "addWeek" }
  | { type: "duplicateWeek"; w: number }
  | { type: "fillWeeks"; w: number }
  | { type: "removeWeek"; w: number }
  | { type: "deload"; w: number; isDeload?: boolean; deloadPercent?: number }
  | { type: "addDay"; w: number }
  | { type: "duplicateDay"; w: number; d: number }
  | { type: "removeDay"; w: number; d: number }
  | { type: "renameDay"; w: number; d: number; name: string }
  | { type: "addItem"; w: number; d: number; exerciseId: string }
  | { type: "updateItem"; w: number; d: number; i: number; patch: Partial<ProgramItem> }
  | { type: "moveItem"; w: number; d: number; i: number; dir: -1 | 1 }
  | { type: "removeItem"; w: number; d: number; i: number };

function reducer(state: Draft, a: Action): Draft {
  const weeks = structuredClone(state.weeks);
  const week = "w" in a ? weeks[a.w] : undefined;
  switch (a.type) {
    case "meta":
      return { ...state, ...(a.name !== undefined && { name: a.name }), ...(a.description !== undefined && { description: a.description }) };
    case "addWeek": {
      if (weeks.length >= LIMITS.maxWeeks) return state;
      const last = weeks[weeks.length - 1];
      weeks.push({ id: uid("wk"), isDeload: false, deloadPercent: 60, days: cloneDays(last.days) });
      break;
    }
    case "duplicateWeek":
      if (weeks.length >= LIMITS.maxWeeks) return state;
      weeks.splice(a.w + 1, 0, { ...week!, id: uid("wk"), days: cloneDays(week!.days) });
      break;
    case "fillWeeks":
      weeks.forEach((wk, idx) => {
        if (idx !== a.w) wk.days = cloneDays(week!.days);
      });
      break;
    case "removeWeek":
      if (weeks.length === 1) return state;
      weeks.splice(a.w, 1);
      break;
    case "deload":
      if (a.isDeload !== undefined) week!.isDeload = a.isDeload;
      if (a.deloadPercent !== undefined) week!.deloadPercent = a.deloadPercent;
      break;
    case "addDay":
      if (week!.days.length >= LIMITS.maxDaysPerWeek) return state;
      week!.days.push({ id: uid("d"), name: `Día ${week!.days.length + 1}`, items: [] });
      break;
    case "duplicateDay":
      if (week!.days.length >= LIMITS.maxDaysPerWeek) return state;
      week!.days.splice(a.d + 1, 0, { ...cloneDays([week!.days[a.d]])[0], name: `${week!.days[a.d].name} (copia)` });
      break;
    case "removeDay":
      if (week!.days.length === 1) return state;
      week!.days.splice(a.d, 1);
      break;
    case "renameDay":
      week!.days[a.d].name = a.name;
      break;
    case "addItem": {
      const items = week!.days[a.d].items;
      if (items.length >= LIMITS.maxItemsPerDay) return state;
      // Por defecto hereda los parámetros del último ejercicio del día.
      const prev = items[items.length - 1];
      items.push({
        id: uid("it"),
        exerciseId: a.exerciseId,
        sets: prev?.sets ?? 3,
        repsMin: prev?.repsMin ?? 8,
        repsMax: prev?.repsMax ?? 12,
        rir: prev?.rir ?? 2,
        restSec: prev?.restSec ?? 90,
        notes: "",
      });
      break;
    }
    case "updateItem":
      Object.assign(week!.days[a.d].items[a.i], a.patch);
      break;
    case "moveItem": {
      const items = week!.days[a.d].items;
      const j = a.i + a.dir;
      if (j < 0 || j >= items.length) return state;
      [items[a.i], items[j]] = [items[j], items[a.i]];
      break;
    }
    case "removeItem":
      week!.days[a.d].items.splice(a.i, 1);
      break;
  }
  return { ...state, weeks };
}

export function ProgramBuilder({
  initial,
  exercises,
  clients,
  defaultStart,
  m,
}: {
  initial: Program;
  exercises: PickerExercise[];
  clients: AssignableClient[];
  defaultStart: string;
  m: Messages;
}) {
  const b = m.training.builder;
  const [draft, dispatch] = useReducer(reducer, { id: initial.id, name: initial.name, description: initial.description, weeks: initial.weeks });
  const [saved, setSaved] = useState(() => JSON.stringify({ name: initial.name, description: initial.description, weeks: initial.weeks }));
  const [w, setW] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const snapshot = JSON.stringify({ name: draft.name, description: draft.description, weeks: draft.weeks });
  const dirty = snapshot !== saved;
  const weekIdx = Math.min(w, draft.weeks.length - 1);
  const week = draft.weeks[weekIdx];
  const exById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = () =>
    startTransition(async () => {
      setError(null);
      const res = await saveProgramAction(draft);
      if (res.ok) setSaved(snapshot);
      else setError(res.error);
    });

  // Ctrl/Cmd + S para guardar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (dirty && !pending) save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const totalItems = week.days.reduce((n, d) => n + d.items.length, 0);

  return (
    <div className="flex min-h-full flex-col">
      {/* Cabecera */}
      <div className="sticky top-0 z-10 border-b border-border bg-bg px-5 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/coach/entrenamientos" className="text-xs text-fg-muted hover:text-fg">
            ← {b.back}
          </Link>
          <input
            value={draft.name}
            onChange={(e) => dispatch({ type: "meta", name: e.target.value })}
            maxLength={80}
            aria-label={m.training.newProgramName}
            className="min-w-0 flex-1 rounded border border-transparent px-1 text-[15px] font-semibold hover:border-border focus:border-accent focus:outline-none"
          />
          <span className={cn("text-xs", dirty ? "text-warn" : "text-fg-subtle")}>{pending ? b.saving : dirty ? b.unsaved : b.saved}</span>
          <Button onClick={save} disabled={!dirty || pending} variant={dirty ? "primary" : "secondary"} title="Ctrl/Cmd + S">
            {b.save}
          </Button>
          <Button onClick={() => setAssignOpen(true)} variant={dirty ? "secondary" : "primary"}>
            {b.assign}
          </Button>
        </div>
        <input
          value={draft.description}
          onChange={(e) => dispatch({ type: "meta", description: e.target.value })}
          placeholder={b.description}
          maxLength={300}
          className="mt-1 w-full rounded border border-transparent px-1 text-xs text-fg-muted placeholder:text-fg-subtle hover:border-border focus:border-accent focus:outline-none"
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>

      {/* Semanas */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-surface px-5 py-1.5">
        {draft.weeks.map((wk, i) => (
          <button
            key={wk.id}
            onClick={() => setW(i)}
            className={cn(
              "flex h-7 items-center gap-1 rounded px-2.5 text-xs tnum",
              i === weekIdx ? "bg-bg font-medium ring-1 ring-border-strong" : "text-fg-muted hover:bg-surface-2",
            )}
          >
            S{i + 1}
            {wk.isDeload && <span className="text-2xs text-info">· {b.deload.toLowerCase()}</span>}
          </button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => { dispatch({ type: "addWeek" }); setW(draft.weeks.length); }} disabled={draft.weeks.length >= LIMITS.maxWeeks}>
          <Plus className="size-3.5" /> {b.addWeek}
        </Button>

        <div className="ml-auto flex flex-wrap items-center gap-1">
          <label className="mr-2 flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={week.isDeload}
              onChange={(e) => dispatch({ type: "deload", w: weekIdx, isDeload: e.target.checked })}
              className="accent-accent"
            />
            {b.deload}
          </label>
          {week.isDeload && (
            <label className="mr-2 flex items-center gap-1 text-xs whitespace-nowrap text-fg-muted">
              <NumberCell
                value={week.deloadPercent}
                min={30}
                max={95}
                onChange={(v) => dispatch({ type: "deload", w: weekIdx, deloadPercent: v ?? 60 })}
                label="%"
              />
              % carga
            </label>
          )}
          <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "duplicateWeek", w: weekIdx })} disabled={draft.weeks.length >= LIMITS.maxWeeks}>
            <Copy className="size-3.5" /> {b.duplicateWeek}
          </Button>
          {draft.weeks.length > 1 && (
            <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "fillWeeks", w: weekIdx })} title="Sustituye los días de las demás semanas por los de esta">
              {b.fillWeeks}
            </Button>
          )}
          {draft.weeks.length > 1 && (
            <Button size="sm" variant="ghost" onClick={() => { dispatch({ type: "removeWeek", w: weekIdx }); setW(Math.max(0, weekIdx - 1)); }}>
              <Trash2 className="size-3.5" /> {b.removeWeek}
            </Button>
          )}
        </div>
      </div>

      {/* Días */}
      <div className="flex flex-col gap-3 p-5">
        <div className="text-xs text-fg-muted">
          {fmt(b.week, { n: weekIdx + 1 })} · {week.days.length} días · {totalItems} ejercicios
          {week.isDeload && <span className="ml-2 text-info">{fmt(b.deloadAt, { pct: week.deloadPercent })}</span>}
        </div>

        {week.days.map((day, d) => (
          <section key={day.id} className="rounded border border-border">
            <header className="flex h-9 items-center gap-2 border-b border-border bg-surface px-3">
              <input
                value={day.name}
                onChange={(e) => dispatch({ type: "renameDay", w: weekIdx, d, name: e.target.value })}
                maxLength={40}
                aria-label="Nombre del día"
                className="w-48 rounded border border-transparent bg-transparent px-1 text-xs font-semibold hover:border-border focus:border-accent focus:bg-bg focus:outline-none"
              />
              <span className="text-2xs text-fg-subtle tnum">{day.items.length}</span>
              <div className="ml-auto flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "duplicateDay", w: weekIdx, d })} disabled={week.days.length >= LIMITS.maxDaysPerWeek}>
                  <Copy className="size-3.5" /> {b.duplicateDay}
                </Button>
                {week.days.length > 1 && (
                  <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "removeDay", w: weekIdx, d })} aria-label={b.removeDay}>
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </header>

            {day.items.length > 0 && (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-2xs text-fg-muted uppercase">
                    <th className="w-8 py-1 pl-3 text-left font-medium">#</th>
                    <th className="py-1 text-left font-medium">Ejercicio</th>
                    <th className="w-14 py-1 text-center font-medium">{b.sets}</th>
                    <th className="w-28 py-1 text-center font-medium">{b.reps}</th>
                    <th className="w-14 py-1 text-center font-medium">{b.rir}</th>
                    <th className="w-20 py-1 text-center font-medium">{b.rest} (s)</th>
                    <th className="py-1 text-left font-medium">{b.notes}</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {day.items.map((it, i) => {
                    const ex = exById.get(it.exerciseId);
                    const upd = (patch: Partial<ProgramItem>) => dispatch({ type: "updateItem", w: weekIdx, d, i, patch });
                    return (
                      <tr key={it.id} className="border-t border-border hover:bg-surface/60">
                        <td className="pl-3 text-fg-subtle tnum">{i + 1}</td>
                        <td className="py-1 pr-2">
                          <span className="font-medium">{ex?.name ?? "Ejercicio no disponible"}</span>
                          {ex && <span className="ml-2 text-2xs text-fg-subtle">{m.muscles[ex.muscleGroup]}</span>}
                        </td>
                        <td className="text-center">
                          <NumberCell value={it.sets} min={1} max={LIMITS.maxSets} onChange={(v) => upd({ sets: v ?? 1 })} label={b.sets} />
                        </td>
                        <td className="text-center">
                          <span className="inline-flex items-center gap-1">
                            <NumberCell value={it.repsMin} min={1} max={LIMITS.maxReps} onChange={(v) => v !== null && upd({ repsMin: v, repsMax: Math.max(v, it.repsMax) })} label="Reps mín." />
                            <span className="text-fg-subtle">–</span>
                            <NumberCell value={it.repsMax} min={1} max={LIMITS.maxReps} onChange={(v) => v !== null && upd({ repsMax: v, repsMin: Math.min(v, it.repsMin) })} label="Reps máx." />
                          </span>
                        </td>
                        <td className="text-center">
                          <NumberCell value={it.rir} min={0} max={LIMITS.maxRir} nullable onChange={(v) => upd({ rir: v })} label={b.rir} />
                        </td>
                        <td className="text-center">
                          <NumberCell value={it.restSec} min={0} max={LIMITS.maxRestSec} step={15} onChange={(v) => upd({ restSec: v ?? 0 })} label={b.rest} wide />
                        </td>
                        <td className="pr-2">
                          <input
                            value={it.notes}
                            onChange={(e) => upd({ notes: e.target.value })}
                            maxLength={300}
                            aria-label={b.notes}
                            className="h-7 w-full rounded border border-transparent px-1 text-xs hover:border-border focus:border-accent focus:outline-none"
                          />
                        </td>
                        <td className="pr-2 text-right whitespace-nowrap">
                          <IconBtn label={b.moveUp} onClick={() => dispatch({ type: "moveItem", w: weekIdx, d, i, dir: -1 })} disabled={i === 0}>
                            <ArrowUp className="size-3.5" />
                          </IconBtn>
                          <IconBtn label={b.moveDown} onClick={() => dispatch({ type: "moveItem", w: weekIdx, d, i, dir: 1 })} disabled={i === day.items.length - 1}>
                            <ArrowDown className="size-3.5" />
                          </IconBtn>
                          <IconBtn label={b.remove} onClick={() => dispatch({ type: "removeItem", w: weekIdx, d, i })}>
                            <X className="size-3.5" />
                          </IconBtn>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <div className="border-t border-border">
              {day.items.length < LIMITS.maxItemsPerDay && (
                <ExercisePicker exercises={exercises} m={m} onPick={(exerciseId) => dispatch({ type: "addItem", w: weekIdx, d, exerciseId })} />
              )}
            </div>
          </section>
        ))}

        <div>
          <Button size="sm" onClick={() => dispatch({ type: "addDay", w: weekIdx })} disabled={week.days.length >= LIMITS.maxDaysPerWeek}>
            <Plus className="size-3.5" /> {b.addDay}
          </Button>
        </div>
      </div>

      <AssignDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={`${m.training.assign.title}: ${draft.name}`}
        startLabel={m.training.assign.startDate}
        onAssign={async (clientIds, startDate) => {
          const res = await assignProgramAction({ programId: draft.id, clientIds, startDate });
          return res.ok ? { ok: true, ...res.data } : { ok: false, error: res.error };
        }}
        dirty={dirty}
        clients={clients}
        defaultStart={defaultStart}
        m={m}
      />
    </div>
  );
}

/** Celda numérica compacta. Valida en el cliente; el servidor vuelve a validar. */
function NumberCell({
  value,
  onChange,
  min,
  max,
  step = 1,
  nullable,
  label,
  wide,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  step?: number;
  nullable?: boolean;
  label: string;
  wide?: boolean;
}) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      value={value ?? ""}
      min={min}
      max={max}
      step={step}
      aria-label={label}
      placeholder={nullable ? "—" : undefined}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "" && nullable) return onChange(null);
        const n = Math.round(Number(raw));
        if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
      }}
      className={cn("h-7 px-1 text-center tnum [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none", wide ? "w-16" : "w-11")}
    />
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex size-6 items-center justify-center rounded text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30"
    >
      {children}
    </button>
  );
}

