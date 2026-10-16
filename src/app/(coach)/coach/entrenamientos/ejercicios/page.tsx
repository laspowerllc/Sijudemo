import { notFound } from "next/navigation";
import { getMessages } from "@/i18n";
import { getSession } from "@/lib/data";
import { listExercises } from "@/lib/data/training";
import { PageHeader } from "@/components/ui/page-header";
import { TrainingTabs } from "@/components/coach/training-tabs";
import { ExerciseLibrary } from "./exercise-library";

export const metadata = { title: "Ejercicios · Siju" };

export default async function ExercisesPage() {
  const session = await getSession();
  if (session.role !== "owner") notFound();
  const exercises = await listExercises(session);
  const m = getMessages();
  return (
    <>
      <PageHeader title={m.training.title} meta={`${exercises.length} ${m.training.exercises.toLowerCase()}`} />
      <TrainingTabs m={m} active="exercises" />
      <ExerciseLibrary exercises={exercises} m={m} />
    </>
  );
}
