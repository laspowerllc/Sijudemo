"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, PlayCircle, TrendingUp, Minus, TrendingDown, Timer } from "lucide-react";
import type { LoggedSet, ProgramItem } from "@/lib/types";
import type { PastSet, Recommendation } from "@/lib/domain/progression";
import { formatReps, formatRest } from "@/lib/domain/training";
import { formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { clearDraft, enqueue, flush, loadDraft, saveDraft } from "@/lib/offline/outbox";

export interface LoggerItem {
  item: ProgramItem;
  name: string;
  instructions: string;
  videoUrl: string | null;
  loaded: boolean;
  recommendation: Recommendation | null;
  lastSets: PastSet[] | null;
  lastDate: string | null;
}

interface Row {
  weightKg: string;
  reps: string;
  done: boolean;
}

interface Draft {
  id: string;
  startedAt: string;
  rows: Record<string, Row[]>;
}

/** Hora actual (fuera del componente: solo se llama desde manejadores de eventos). */
const nowMs = () => Date.now();

const fmtKg = (n: number) => n.toLocaleString("es", { maximumFractionDigits: 2 });
const parseNum = (s: string) => {
  const n = Number(s.replace(",", "."));
  return s.trim() === "" || !Number.isFinite(n) ? null : n;
};

export function WorkoutLogger(props: {
  planId: string;
  weekIndex: number;
  totalWeeks: number;
  isDeload: boolean;
  deloadPercent: number;
  dayId: string;
  dayName: string;
  items: LoggerItem[];
  completed: { id: string; startedAt: string; completedAt: string; sets: LoggedSet[] } | null;
  canLog: boolean;
}) {
  const { planId, weekIndex, dayId, items, completed, canLog } = props;
  const router = useRouter();

  const initial = useMemo<Draft>(() => {
    const rows: Record<string, Row[]> = {};
    for (const li of items) {
      rows[li.item.id] = Array.from({ length: li.item.sets }, (_, k) => {
        const logged = completed?.sets.find((s) => s.itemId === li.item.id && s.setIndex === k);
        if (logged) return { weightKg: logged.weightKg !== null ? fmtKg(logged.weightKg) : "", reps: logged.reps?.toString() ?? "", done: logged.done };
        return { weightKg: li.recommendation ? fmtKg(li.recommendation.weightKg) : "", reps: "", done: false };
      });
    }
    return { id: completed?.id ?? "", startedAt: completed?.startedAt ?? "", rows };
  }, [items, completed]);

  const [draft, setDraft] = useState<Draft>(initial);
  const [loaded, setLoaded] = useState(false);
  const [rest, setRest] = useState<{ until: number; total: number } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recuperar el borrador guardado en el móvil (entreno a medias, también sin conexión).
  useEffect(() => {
    const saved = loadDraft<Draft>(planId, weekIndex, dayId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de localStorage tras montar
    if (saved && !completed) setDraft(saved);
    setLoaded(true);
  }, [planId, weekIndex, dayId, completed]);

  // Se guarda en el mismo toque (no en un efecto): si el móvil cierra la pestaña justo después, no se pierde.
  const update = (itemId: string, k: number, patch: Partial<Row>) => {
    const d = draft;
    const next: Draft = {
      id: d.id || `ws_${crypto.randomUUID()}`,
      startedAt: d.startedAt || new Date().toISOString(),
      rows: { ...d.rows, [itemId]: d.rows[itemId].map((r, i) => (i === k ? { ...r, ...patch } : r)) },
    };
    setDraft(next);
    if (loaded && !completed) saveDraft(planId, weekIndex, dayId, next);
  };

  const toggleDone = (li: LoggerItem, k: number) => {
    const row = draft.rows[li.item.id][k];
    const nowDone = !row.done;
    // Al marcar sin reps escritas, se asume el máximo prescrito.
    update(li.item.id, k, { done: nowDone, ...(nowDone && !row.reps && { reps: String(li.item.repsMax) }) });
    if (nowDone && li.item.restSec > 0) setRest({ until: nowMs() + li.item.restSec * 1000, total: li.item.restSec });
  };

  const totalSets = Object.values(draft.rows).reduce((n, r) => n + r.length, 0);
  const doneSets = Object.values(draft.rows).reduce((n, r) => n + r.filter((x) => x.done).length, 0);
  const readOnly = !!completed || !canLog;

  const finish = async () => {
    setFinishing(true);
    setError(null);
    const id = draft.id || `ws_${crypto.randomUUID()}`;
    const sets: LoggedSet[] = items.flatMap((li) =>
      draft.rows[li.item.id].map((r, k) => ({
        itemId: li.item.id,
        exerciseId: li.item.exerciseId,
        setIndex: k,
        weightKg: li.loaded ? parseNum(r.weightKg) : null,
        reps: parseNum(r.reps) === null ? null : Math.round(parseNum(r.reps)!),
        rir: null,
        done: r.done,
      })),
    );
    enqueue({
      id,
      planId,
      weekIndex,
      dayId,
      startedAt: draft.startedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      sets,
    });
    clearDraft(planId, weekIndex, dayId);
    await flush();
    router.push("/app?hecho=1");
    router.refresh();
  };

  return (
    <div className="pb-28">
      <header className="pt-2 pb-3">
        <p className="text-xs text-fg-muted">
          Semana {weekIndex + 1} de {props.totalWeeks}
          {props.isDeload && <span className="ml-2 font-medium text-info">Descarga · carga al {props.deloadPercent} %</span>}
        </p>
        <h1 className="text-lg font-semibold">{props.dayName}</h1>
        {completed && <p className="mt-1 text-xs text-ok">Completado el {formatShortDate(completed.completedAt)}</p>}
        {!canLog && !completed && <p className="mt-1 text-xs text-danger">Tu suscripción no está activa: puedes ver tu plan pero no registrar entrenos.</p>}
      </header>

      <div className="flex flex-col gap-3">
        {items.map((li) => (
          <ExerciseCard
            key={li.item.id}
            li={li}
            rows={draft.rows[li.item.id]}
            readOnly={readOnly}
            onChange={(k, patch) => update(li.item.id, k, patch)}
            onToggle={(k) => toggleDone(li, k)}
          />
        ))}
      </div>

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}

      {!readOnly && (
        <div className="fixed inset-x-0 bottom-14 z-10 border-t border-border bg-bg px-4 pt-2 pb-2">
          <div className="mx-auto flex max-w-lg flex-col gap-2">
            {rest && <RestTimer rest={rest} onDone={() => setRest(null)} />}
            <button
              onClick={finish}
              disabled={finishing || doneSets === 0}
              className="h-12 w-full rounded bg-accent text-sm font-semibold text-accent-fg disabled:opacity-40"
            >
              {finishing ? "Guardando…" : `Finalizar entreno · ${doneSets}/${totalSets} series`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({
  li,
  rows,
  readOnly,
  onChange,
  onToggle,
}: {
  li: LoggerItem;
  rows: Row[];
  readOnly: boolean;
  onChange: (k: number, patch: Partial<Row>) => void;
  onToggle: (k: number) => void;
}) {
  const { item, recommendation: rec } = li;
  const [showInfo, setShowInfo] = useState(false);
  const allDone = rows.every((r) => r.done);

  return (
    <section className={cn("rounded border bg-bg", allDone ? "border-ok/40" : "border-border")}>
      <div className="px-3 pt-2.5 pb-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold">{li.name}</h2>
          {(li.videoUrl || li.instructions) && (
            <button onClick={() => setShowInfo((v) => !v)} className="flex items-center gap-1 text-xs text-accent" aria-expanded={showInfo}>
              {li.videoUrl ? <PlayCircle className="size-4" /> : null}
              Técnica
              <ChevronDown className={cn("size-3.5 transition-transform", showInfo && "rotate-180")} />
            </button>
          )}
        </div>
        <p className="text-xs text-fg-muted tnum">
          {item.sets} × {formatReps(item.repsMin, item.repsMax)} reps
          {item.rir !== null && ` · RIR ${item.rir}`}
          {item.restSec > 0 && ` · descanso ${formatRest(item.restSec)}`}
        </p>
        {item.notes && <p className="mt-0.5 text-xs text-fg">{item.notes}</p>}

        {showInfo && (
          <div className="mt-2 flex flex-col gap-2 text-xs">
            {li.instructions && <p className="text-fg-muted">{li.instructions}</p>}
            {li.videoUrl && (
              <a href={li.videoUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                Ver vídeo del ejercicio
              </a>
            )}
          </div>
        )}

        {li.loaded && (rec || li.lastSets) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded bg-surface px-2 py-1.5 text-xs">
            {rec && (
              <span className="flex items-center gap-1 font-medium">
                {rec.reason === "increase" ? <TrendingUp className="size-3.5 text-ok" /> : rec.reason === "deload" ? <TrendingDown className="size-3.5 text-info" /> : <Minus className="size-3.5 text-fg-muted" />}
                Recomendado {fmtKg(rec.weightKg)} kg
                <span className="font-normal text-fg-muted">
                  {rec.reason === "increase" ? `(subes desde ${fmtKg(rec.fromKg)})` : rec.reason === "deload" ? "(descarga)" : "(mantén y busca más reps)"}
                </span>
              </span>
            )}
            {li.lastSets && (
              <span className="text-fg-muted tnum">
                Última vez{li.lastDate && ` (${formatShortDate(li.lastDate)})`}: {li.lastSets.map((s) => `${s.weightKg !== null ? fmtKg(s.weightKg) : "—"}×${s.reps ?? "—"}`).join(" · ")}
              </span>
            )}
          </div>
        )}
        {li.loaded && !rec && !li.lastSets && (
          <p className="mt-2 rounded bg-surface px-2 py-1.5 text-xs text-fg-muted">
            Primera vez: elige un peso con el que llegues a {item.repsMax} reps{item.rir !== null && ` dejando ${item.rir} en reserva`}.
          </p>
        )}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-t border-border text-2xs text-fg-muted uppercase">
            <th className="w-12 py-1 pl-3 text-left font-medium">Serie</th>
            {li.loaded && <th className="py-1 text-center font-medium">Kg</th>}
            <th className="py-1 text-center font-medium">Reps</th>
            <th className="w-14" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, k) => (
            <tr key={k} className={cn("border-t border-border", r.done && "bg-ok-soft/50")}>
              <td className="pl-3 text-fg-muted tnum">{k + 1}</td>
              {li.loaded && (
                <td className="px-1 py-1.5 text-center">
                  <input
                    inputMode="decimal"
                    value={r.weightKg}
                    onChange={(e) => onChange(k, { weightKg: e.target.value.replace(/[^\d.,]/g, "").slice(0, 6) })}
                    disabled={readOnly}
                    aria-label={`Serie ${k + 1} kg`}
                    className="h-11 w-full max-w-24 rounded border border-border-strong bg-bg text-center text-base tnum focus:border-accent focus:outline-none disabled:border-transparent disabled:bg-transparent"
                  />
                </td>
              )}
              <td className="px-1 py-1.5 text-center">
                <input
                  inputMode="numeric"
                  value={r.reps}
                  placeholder={formatReps(item.repsMin, item.repsMax)}
                  onChange={(e) => onChange(k, { reps: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                  disabled={readOnly}
                  aria-label={`Serie ${k + 1} repeticiones`}
                  className="h-11 w-full max-w-24 rounded border border-border-strong bg-bg text-center text-base tnum placeholder:text-fg-subtle focus:border-accent focus:outline-none disabled:border-transparent disabled:bg-transparent"
                />
              </td>
              <td className="pr-3 text-right">
                <button
                  onClick={() => onToggle(k)}
                  disabled={readOnly}
                  aria-label={r.done ? `Desmarcar serie ${k + 1}` : `Completar serie ${k + 1}`}
                  aria-pressed={r.done}
                  className={cn(
                    "inline-flex size-11 items-center justify-center rounded border",
                    r.done ? "border-ok bg-ok text-white" : "border-border-strong text-fg-subtle",
                  )}
                >
                  <Check className="size-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function RestTimer({ rest, onDone }: { rest: { until: number; total: number }; onDone: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= rest.until) {
        clearInterval(t);
        if ("vibrate" in navigator) navigator.vibrate?.(200);
        done.current();
      }
    }, 250);
    return () => clearInterval(t);
  }, [rest.until]);
  const left = Math.max(0, Math.ceil((rest.until - now) / 1000));
  return (
    <div className="flex items-center gap-3 text-sm">
      <Timer className="size-4 text-fg-muted" />
      <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-surface-2">
        <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${(left / rest.total) * 100}%` }} />
      </div>
      <span className="w-12 text-right font-semibold tnum">
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
      </span>
      <button onClick={onDone} className="text-xs text-fg-muted underline">Saltar</button>
    </div>
  );
}
