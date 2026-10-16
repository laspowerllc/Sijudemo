"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, PlayCircle } from "lucide-react";
import type { Messages } from "@/i18n";
import type { Equipment, Exercise, MuscleGroup } from "@/lib/types";
import { parseVideoUrl } from "@/lib/domain/training";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Empty } from "@/components/ui/panel";
import { archiveExerciseAction, saveExerciseAction } from "../actions";

type Draft = { id?: string; name: string; muscleGroup: MuscleGroup; equipment: Equipment; videoUrl: string; instructions: string };

const EMPTY: Draft = { name: "", muscleGroup: "chest", equipment: "barbell", videoUrl: "", instructions: "" };

export function ExerciseLibrary({ exercises, m }: { exercises: Exercise[]; m: Messages }) {
  const t = m.training;
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "">("");
  const [editing, setEditing] = useState<{ draft: Draft; readOnly: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return exercises.filter(
      (e) =>
        (!muscle || e.muscleGroup === muscle) &&
        (!query || e.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(query)),
    );
  }, [exercises, q, muscle]);

  const open = (e: Exercise | null) => {
    setError(null);
    if (!e) return setEditing({ draft: EMPTY, readOnly: false });
    setEditing({
      draft: { id: e.id, name: e.name, muscleGroup: e.muscleGroup, equipment: e.equipment, videoUrl: e.videoUrl ?? "", instructions: e.instructions },
      readOnly: e.orgId === null,
    });
  };

  const save = (draft: Draft) =>
    startTransition(async () => {
      const res = await saveExerciseAction(draft);
      if (res.ok) setEditing(null);
      else setError(res.error);
    });

  const archive = (id: string) =>
    startTransition(async () => {
      const res = await archiveExerciseAction(id);
      if (res.ok) setEditing(null);
      else setError(res.error);
    });

  const video = editing?.draft.videoUrl ? parseVideoUrl(editing.draft.videoUrl) : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-2">
        <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchExercise} className="w-64" aria-label={t.searchExercise} />
        <Select value={muscle} onChange={(e) => setMuscle(e.target.value as MuscleGroup | "")} className="w-48" aria-label={t.muscle}>
          <option value="">{t.allMuscles}</option>
          {Object.entries(m.muscles).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <span className="text-xs text-fg-subtle tnum">{filtered.length}</span>
        <Button variant="primary" className="ml-auto" onClick={() => open(null)}>
          <Plus className="size-4" /> {t.newExercise}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Empty>{t.noExercises}</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th className="pl-5">{t.name}</Th>
              <Th>{t.muscle}</Th>
              <Th>{t.equipment}</Th>
              <Th>{t.video}</Th>
              <Th>{t.source}</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <Tr key={e.id} className="cursor-pointer" onClick={() => open(e)}>
                <Td className="pl-5 font-medium">{e.name}</Td>
                <Td className="text-fg-muted">{m.muscles[e.muscleGroup]}</Td>
                <Td className="text-fg-muted">{m.equipment[e.equipment]}</Td>
                <Td>
                  {e.videoUrl ? (
                    <PlayCircle className="size-4 text-accent" aria-label={t.video} />
                  ) : (
                    <span className="text-2xs text-fg-subtle">{t.noVideo}</span>
                  )}
                </Td>
                <Td>{e.orgId ? <Badge tone="accent">{t.own}</Badge> : <Badge>{t.base}</Badge>}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.draft.id ? (editing.readOnly ? editing.draft.name : t.editExercise) : t.newExercise}
        className="max-w-lg"
      >
        {editing && (
          <form
            className="grid grid-cols-2 gap-3 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              save(editing.draft);
            }}
          >
            {editing.readOnly && <p className="col-span-2 rounded bg-surface p-2 text-xs text-fg-muted">{t.baseReadOnly}</p>}
            <fieldset disabled={editing.readOnly || pending} className="col-span-2 grid grid-cols-2 gap-3">
              <Field label={t.name} className="col-span-2">
                <Input
                  value={editing.draft.name}
                  onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, name: e.target.value } })}
                  required
                  minLength={2}
                  maxLength={80}
                  autoFocus
                />
              </Field>
              <Field label={t.muscle}>
                <Select
                  value={editing.draft.muscleGroup}
                  onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, muscleGroup: e.target.value as MuscleGroup } })}
                >
                  {Object.entries(m.muscles).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label={t.equipment}>
                <Select
                  value={editing.draft.equipment}
                  onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, equipment: e.target.value as Equipment } })}
                >
                  {Object.entries(m.equipment).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label={t.videoUrl} className="col-span-2">
                <Input
                  type="url"
                  value={editing.draft.videoUrl}
                  onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, videoUrl: e.target.value } })}
                  placeholder="https://www.youtube.com/watch?v=…"
                  maxLength={300}
                />
              </Field>
              {video && (
                <div className="col-span-2 aspect-video overflow-hidden rounded border border-border bg-surface">
                  <iframe
                    src={video.embedUrl}
                    title={editing.draft.name}
                    className="size-full"
                    allow="encrypted-media; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              )}
              <Field label={t.instructions} className="col-span-2">
                <Textarea
                  value={editing.draft.instructions}
                  onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, instructions: e.target.value } })}
                  maxLength={1000}
                />
              </Field>
            </fieldset>

            {error && <p className="col-span-2 text-xs text-danger">{error}</p>}

            <div className="col-span-2 flex items-center justify-between gap-2 border-t border-border pt-3">
              <div>
                {editing.draft.id && !editing.readOnly && (
                  <Button variant="danger" size="sm" onClick={() => archive(editing.draft.id!)} disabled={pending}>
                    {t.archive}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setEditing(null)}>{m.common.cancel}</Button>
                {editing.readOnly ? (
                  <Button
                    variant="primary"
                    onClick={() => setEditing({ readOnly: false, draft: { ...editing.draft, id: undefined, name: `${editing.draft.name} (propio)` } })}
                  >
                    {t.duplicateToEdit}
                  </Button>
                ) : (
                  <Button type="submit" variant="primary" disabled={pending}>
                    {m.common.save}
                  </Button>
                )}
              </div>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
