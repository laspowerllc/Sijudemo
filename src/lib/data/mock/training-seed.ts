import type { Equipment, Exercise, MuscleGroup, Program, ProgramDay, ProgramItem, ProgramWeek } from "@/lib/types";
import { ORG_ID } from "./seed";

/**
 * Biblioteca base de ejercicios (orgId = null): la ven todos los coaches y no
 * se puede editar, solo duplicar. Sin vídeos: cada coach añade sus enlaces.
 */
const BASE: [string, MuscleGroup, Equipment][] = [
  ["Press banca", "chest", "barbell"],
  ["Press banca inclinado", "chest", "barbell"],
  ["Press inclinado con mancuernas", "chest", "dumbbell"],
  ["Aperturas en polea", "chest", "cable"],
  ["Fondos en paralelas", "chest", "bodyweight"],
  ["Flexiones", "chest", "bodyweight"],
  ["Dominadas", "back", "bodyweight"],
  ["Jalón al pecho", "back", "cable"],
  ["Remo con barra", "back", "barbell"],
  ["Remo con mancuerna a una mano", "back", "dumbbell"],
  ["Remo en polea baja", "back", "cable"],
  ["Peso muerto convencional", "back", "barbell"],
  ["Pullover en polea", "back", "cable"],
  ["Press militar", "shoulders", "barbell"],
  ["Press de hombro con mancuernas", "shoulders", "dumbbell"],
  ["Elevaciones laterales", "shoulders", "dumbbell"],
  ["Face pull", "shoulders", "cable"],
  ["Pájaros con mancuernas", "shoulders", "dumbbell"],
  ["Curl con barra", "biceps", "barbell"],
  ["Curl alterno con mancuernas", "biceps", "dumbbell"],
  ["Curl martillo", "biceps", "dumbbell"],
  ["Curl en polea", "biceps", "cable"],
  ["Extensión de tríceps en polea", "triceps", "cable"],
  ["Press francés", "triceps", "barbell"],
  ["Extensión por encima de la cabeza", "triceps", "dumbbell"],
  ["Sentadilla trasera", "quads", "barbell"],
  ["Sentadilla frontal", "quads", "barbell"],
  ["Sentadilla goblet", "quads", "dumbbell"],
  ["Prensa de piernas", "quads", "machine"],
  ["Zancadas", "quads", "dumbbell"],
  ["Sentadilla búlgara", "quads", "dumbbell"],
  ["Extensión de cuádriceps", "quads", "machine"],
  ["Peso muerto rumano", "hamstrings", "barbell"],
  ["Curl femoral tumbado", "hamstrings", "machine"],
  ["Curl femoral sentado", "hamstrings", "machine"],
  ["Hip thrust", "glutes", "barbell"],
  ["Puente de glúteo", "glutes", "bodyweight"],
  ["Patada de glúteo en polea", "glutes", "cable"],
  ["Abducción de cadera en máquina", "glutes", "machine"],
  ["Elevación de gemelos de pie", "calves", "machine"],
  ["Elevación de gemelos sentado", "calves", "machine"],
  ["Plancha", "core", "bodyweight"],
  ["Rueda abdominal", "core", "other"],
  ["Pallof press", "core", "cable"],
  ["Elevación de piernas colgado", "core", "bodyweight"],
  ["Swing con kettlebell", "full_body", "kettlebell"],
  ["Thruster", "full_body", "barbell"],
  ["Bicicleta estática", "cardio", "machine"],
  ["Cinta inclinada", "cardio", "machine"],
  ["Remo ergómetro", "cardio", "machine"],
];

export function buildExercises(): Exercise[] {
  const base: Exercise[] = BASE.map(([name, muscleGroup, equipment], i) => ({
    id: `ex_${String(i + 1).padStart(3, "0")}`,
    orgId: null,
    name,
    muscleGroup,
    equipment,
    videoUrl: null,
    instructions: "",
    archivedAt: null,
  }));
  const own: Exercise[] = [
    {
      id: "ex_org_001",
      orgId: ORG_ID,
      name: "Sentadilla con pausa (2 s)",
      muscleGroup: "quads",
      equipment: "barbell",
      videoUrl: null,
      instructions: "Pausa de 2 segundos abajo sin perder tensión. Subida explosiva.",
      archivedAt: null,
    },
  ];
  return [...base, ...own];
}

let n = 0;
const uid = (p: string) => `${p}_seed_${++n}`;
const item = (exerciseId: string, sets: number, repsMin: number, repsMax: number, rir: number | null, restSec: number): ProgramItem => ({
  id: uid("it"), exerciseId, sets, repsMin, repsMax, rir, restSec, notes: "",
});

function week(days: () => ProgramDay[], deload = false): ProgramWeek {
  return { id: uid("wk"), isDeload: deload, deloadPercent: 60, days: days() };
}

export function buildPrograms(now: Date): Program[] {
  const upperLower = () => [
    { id: uid("d"), name: "Torso A", items: [item("ex_001", 4, 6, 8, 2, 150), item("ex_009", 4, 8, 10, 2, 120), item("ex_015", 3, 10, 12, 2, 90), item("ex_016", 3, 12, 15, 1, 60), item("ex_023", 3, 10, 12, 1, 60)] },
    { id: uid("d"), name: "Pierna A", items: [item("ex_026", 4, 5, 7, 2, 180), item("ex_033", 3, 8, 10, 2, 120), item("ex_029", 3, 10, 12, 2, 90), item("ex_034", 3, 10, 12, 1, 60), item("ex_040", 4, 12, 15, 1, 45)] },
    { id: uid("d"), name: "Torso B", items: [item("ex_007", 4, 6, 8, 2, 150), item("ex_003", 4, 8, 10, 2, 120), item("ex_011", 3, 10, 12, 2, 90), item("ex_017", 3, 15, 20, 1, 60), item("ex_020", 3, 10, 12, 1, 60)] },
    { id: uid("d"), name: "Pierna B", items: [item("ex_012", 3, 4, 6, 2, 180), item("ex_031", 3, 8, 10, 2, 90), item("ex_036", 3, 8, 12, 2, 90), item("ex_032", 3, 12, 15, 1, 60), item("ex_042", 3, 30, 45, null, 45)] },
  ];
  const fullBody = () => [
    { id: uid("d"), name: "Día 1", items: [item("ex_028", 3, 10, 12, 3, 90), item("ex_006", 3, 8, 12, 3, 60), item("ex_010", 3, 10, 12, 3, 60), item("ex_037", 3, 12, 15, 3, 60)] },
    { id: uid("d"), name: "Día 2", items: [item("ex_029", 3, 10, 12, 3, 90), item("ex_008", 3, 10, 12, 3, 60), item("ex_015", 3, 10, 12, 3, 60), item("ex_042", 3, 20, 30, null, 45)] },
    { id: uid("d"), name: "Día 3", items: [item("ex_030", 3, 10, 12, 3, 90), item("ex_003", 3, 10, 12, 3, 60), item("ex_011", 3, 10, 12, 3, 60), item("ex_046", 3, 15, 20, 3, 60)] },
  ];

  return [
    {
      id: "prg_001",
      orgId: ORG_ID,
      name: "Torso / Pierna 4 días · Intermedio",
      description: "Hipertrofia con básicos. Semana 4 de descarga.",
      weeks: [week(upperLower), week(upperLower), week(upperLower), week(upperLower, true)],
      updatedAt: new Date(now.getTime() - 3 * 86_400_000).toISOString(),
      archivedAt: null,
    },
    {
      id: "prg_002",
      orgId: ORG_ID,
      name: "Full body 3 días · Principiante",
      description: "Técnica y adherencia. Mancuernas y máquinas.",
      weeks: [week(fullBody), week(fullBody), week(fullBody), week(fullBody)],
      updatedAt: new Date(now.getTime() - 12 * 86_400_000).toISOString(),
      archivedAt: null,
    },
  ];
}
