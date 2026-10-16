/**
 * Tipos de dominio. Reflejan el esquema de base de datos previsto
 * (snake_case en Postgres → camelCase aquí) para que, al conectar
 * Supabase, solo cambie la capa de datos y no los componentes.
 */

export type Locale = "es";

export type PlatformPlan = "basic" | "medium" | "pro" | "platinium";

/** Estado de facturación de la organización (coach) con la plataforma. */
export type OrgBillingStatus =
  | "trialing" // prueba de 7 días sin tarjeta
  | "active"
  | "past_due" // impago, dentro del periodo de gracia
  | "read_only" // gracia agotada
  | "canceled";

export interface Organization {
  id: string;
  name: string;
  plan: PlatformPlan;
  billingStatus: OrgBillingStatus;
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  currency: "EUR";
  stripeConnectStatus: "not_connected" | "pending" | "active";
}

export type Role = "platform_admin" | "owner" | "assistant" | "client";

export interface Member {
  id: string;
  orgId: string;
  fullName: string;
  email: string;
  role: Extract<Role, "owner" | "assistant">;
}

export interface Session {
  userId: string;
  role: Role;
  fullName: string;
  orgId: string | null;
  memberId: string | null;
  clientId: string | null;
}

/** invited = invitación enviada y aún no aceptada. */
export type ClientStatus = "invited" | "active" | "paused" | "expired";

export interface Client {
  id: string;
  orgId: string;
  fullName: string;
  email: string;
  status: ClientStatus;
  goal: string;
  injuries: string;
  notes: string;
  /** Miembros (coaches) asignados. El propietario ve a todos igualmente. */
  assignedMemberIds: string[];
  startedAt: string;
  timezone: string;
  /** Objetivo de pasos diario fijado por el coach. */
  stepGoal: number;
  /** 0 = domingo … 6 = sábado. Día del check-in semanal. */
  checkinWeekday: number;
  /** Consentimiento explícito RGPD para datos sensibles (fotos, medidas, lesiones). */
  sensitiveConsentAt: string | null;
}

export type PaymentStatus = "paid" | "due_soon" | "failed" | "manual" | "none";

export interface ClientSubscription {
  clientId: string;
  priceCents: number;
  interval: "month" | "quarter";
  /** Próxima renovación (o fecha hasta la que está pagado si es manual). */
  renewsAt: string | null;
  paymentStatus: PaymentStatus;
}

/** Métricas agregadas que el panel necesita por cliente (vista en BD). */
export interface ClientActivity {
  clientId: string;
  lastWorkoutAt: string | null;
  /** Sesiones completadas / programadas en los últimos 14 días (0–1). null si no hay plan. */
  adherence14d: number | null;
  /** Fecha del check-in que toca esta semana. */
  checkinDueOn: string;
  checkinSubmittedAt: string | null;
  checkinReviewedAt: string | null;
  stepsToday: number | null;
}

export interface ClientRow {
  client: Client;
  subscription: ClientSubscription | null;
  activity: ClientActivity;
  assignedNames: string[];
}

/* ───────────── Entrenamiento ───────────── */

export type MuscleGroup =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps" | "quads"
  | "hamstrings" | "glutes" | "calves" | "core" | "full_body" | "cardio";

export type Equipment =
  | "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "kettlebell" | "band" | "other";

export interface Exercise {
  id: string;
  /** null = biblioteca base de la plataforma (solo lectura para los coaches). */
  orgId: string | null;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  /** Enlace de YouTube o Vimeo. */
  videoUrl: string | null;
  instructions: string;
  archivedAt: string | null;
}

/** Un ejercicio dentro de un día de entrenamiento. */
export interface ProgramItem {
  id: string;
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  /** Repeticiones en reserva objetivo (opcional). */
  rir: number | null;
  restSec: number;
  notes: string;
}

export interface ProgramDay {
  id: string;
  name: string;
  items: ProgramItem[];
}

export interface ProgramWeek {
  id: string;
  isDeload: boolean;
  /** % de la carga habitual en semana de descarga (p. ej. 60). */
  deloadPercent: number;
  days: ProgramDay[];
}

/** Plantilla de rutina. Al asignarse se copia (snapshot) en el plan del cliente. */
export interface Program {
  id: string;
  orgId: string;
  name: string;
  description: string;
  weeks: ProgramWeek[];
  updatedAt: string;
  archivedAt: string | null;
}

export interface AssignedPlan {
  id: string;
  orgId: string;
  clientId: string;
  /** Plantilla de origen; el plan guarda su propia copia para poder ajustarse por cliente. */
  sourceProgramId: string | null;
  name: string;
  weeks: ProgramWeek[];
  /** Lunes de la semana 1 (YYYY-MM-DD). */
  startDate: string;
  assignedAt: string;
  archivedAt: string | null;
}

/* ───────────── Nutrición ───────────── */

export type FoodGroup = "protein" | "carbs" | "fat" | "dairy" | "fruit" | "veg";

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Food {
  id: string;
  /** null = alimento base de la plataforma. */
  orgId: string | null;
  name: string;
  group: FoodGroup;
  /** Valores por 100 g (orientativos). */
  per100: Macros;
  /** Peso de una unidad, si se suele medir así (huevo, pieza de fruta…). */
  unitGrams: number | null;
  unitName: string | null;
}

export type Rations = Partial<Record<FoodGroup, number>>;

export interface DietMeal {
  id: string;
  name: string;
  rations: Rations;
}

/** Tipo de día dentro de una dieta (p. ej. "Entreno" y "Descanso"). */
export interface DietDay {
  id: string;
  name: string;
  /** Objetivo diario en gramos; las kcal se derivan (4/4/9). */
  targets: { protein: number; carbs: number; fat: number };
  meals: DietMeal[];
}

export interface Diet {
  id: string;
  orgId: string;
  name: string;
  description: string;
  days: DietDay[];
  updatedAt: string;
  archivedAt: string | null;
}

export interface DishIngredient {
  foodId: string;
  grams: number;
}

/** Plato de la biblioteca del coach (una ración). */
export interface Dish {
  id: string;
  orgId: string;
  name: string;
  ingredients: DishIngredient[];
  instructions: string;
  archivedAt: string | null;
}

export interface AssignedDiet {
  id: string;
  orgId: string;
  clientId: string;
  sourceDietId: string | null;
  name: string;
  days: DietDay[];
  startDate: string;
  assignedAt: string;
  archivedAt: string | null;
}

/* ───────────── Registro de entrenos ───────────── */

export interface LoggedSet {
  /** ProgramItem del plan al que pertenece la serie. */
  itemId: string;
  exerciseId: string;
  setIndex: number;
  weightKg: number | null;
  reps: number | null;
  rir: number | null;
  done: boolean;
}

/** Sesión de entreno registrada por el cliente. Nunca se borra: se archiva. */
export interface WorkoutSession {
  /** Generado en el dispositivo: permite reintentar la sincronización sin duplicar. */
  id: string;
  orgId: string;
  clientId: string;
  planId: string;
  weekIndex: number;
  dayId: string;
  isDeload: boolean;
  startedAt: string;
  completedAt: string | null;
  sets: LoggedSet[];
  archivedAt: string | null;
}
