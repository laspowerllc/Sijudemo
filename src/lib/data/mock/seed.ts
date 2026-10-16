import type {
  Client,
  ClientActivity,
  ClientStatus,
  ClientSubscription,
  Member,
  Organization,
  PaymentStatus,
} from "@/lib/types";
import { addDays } from "@/lib/dates";

/**
 * Datos de ejemplo deterministas (misma semilla → mismos datos) relativos
 * a la fecha actual, para poder ver el panel con casos realistas.
 * Se sustituirán por Supabase en la fase de backend.
 */

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  "Lucía", "Martín", "Sofía", "Mateo", "Valentina", "Hugo", "Camila", "Pablo", "Julia", "Álvaro",
  "Daniela", "Andrés", "Paula", "Javier", "Elena", "Tomás", "Irene", "Nicolás", "Marta", "Gabriel",
  "Sara", "Adrián", "Carmen", "Sergio", "Natalia", "Iván", "Alba", "Rubén", "Clara", "Raúl",
  "Noelia", "Óscar", "Rocío", "Emilio", "Ainhoa", "Fernando", "Lorena", "Bruno", "Inés", "Marcos",
  "Aitana", "Héctor",
];
const LAST = [
  "García", "Fernández", "López", "Martínez", "Sánchez", "Pérez", "Gómez", "Ruiz", "Díaz", "Moreno",
  "Álvarez", "Romero", "Navarro", "Torres", "Domínguez", "Vázquez", "Gil", "Serrano", "Molina", "Castro",
];
const GOALS = [
  "Perder 6 kg de grasa manteniendo fuerza",
  "Ganar masa muscular (volumen limpio)",
  "Preparar media maratón sin lesiones",
  "Recomposición corporal",
  "Mejorar fuerza en básicos (SQ/BP/DL)",
  "Volver a entrenar tras el embarazo",
  "Bajar porcentaje graso para verano",
];
const INJURIES = [
  "",
  "",
  "Tendinopatía rotuliana derecha (2023). Evitar saltos.",
  "Hernia L5-S1 controlada. Nada de carga axial pesada.",
  "Hombro izquierdo: impingement. Limitar press por encima de la cabeza.",
  "",
  "Esguince de tobillo recurrente.",
];

export const ORG_ID = "org_1";

export const organization: Organization = {
  id: ORG_ID,
  name: "Méndez Coaching",
  plan: "pro",
  billingStatus: "active",
  trialEndsAt: null,
  graceEndsAt: null,
  currency: "EUR",
  stripeConnectStatus: "active",
};

export const members: Member[] = [
  { id: "mem_owner", orgId: ORG_ID, fullName: "Laura Méndez", email: "laura@mendezcoaching.com", role: "owner" },
  { id: "mem_diego", orgId: ORG_ID, fullName: "Diego Ramos", email: "diego@mendezcoaching.com", role: "assistant" },
  { id: "mem_carla", orgId: ORG_ID, fullName: "Carla Ortiz", email: "carla@mendezcoaching.com", role: "assistant" },
];

/** Organización ajena: sirve para comprobar que nunca aparece en ninguna vista. */
const OTHER_ORG_ID = "org_2";

export interface Seed {
  clients: Client[];
  subscriptions: ClientSubscription[];
  activity: ClientActivity[];
}

export function buildSeed(now: Date): Seed {
  const rand = rng(42);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const iso = (d: Date) => d.toISOString();

  const clients: Client[] = [];
  const subscriptions: ClientSubscription[] = [];
  const activity: ClientActivity[] = [];

  const statuses: ClientStatus[] = [
    ...Array<ClientStatus>(34).fill("active"),
    ...Array<ClientStatus>(3).fill("paused"),
    ...Array<ClientStatus>(3).fill("expired"),
    ...Array<ClientStatus>(2).fill("invited"),
  ];

  statuses.forEach((status, i) => {
    const id = `cli_${String(i + 1).padStart(3, "0")}`;
    const fullName = `${FIRST[i % FIRST.length]} ${pick(LAST)}`;
    const assistant = i % 3 === 0 ? "mem_diego" : i % 3 === 1 ? "mem_carla" : null;
    const checkinWeekday = [1, 1, 5, 0, 3][i % 5];

    clients.push({
      id,
      orgId: ORG_ID,
      fullName,
      email: `${fullName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(" ", ".")}@mail.com`,
      status,
      goal: pick(GOALS),
      injuries: pick(INJURIES),
      notes: i % 4 === 0 ? "Prefiere entrenar por la mañana. Viaja mucho por trabajo." : "",
      assignedMemberIds: assistant ? ["mem_owner", assistant] : ["mem_owner"],
      startedAt: iso(addDays(now, -Math.floor(20 + rand() * 300))),
      timezone: i % 7 === 0 ? "America/Mexico_City" : "Europe/Madrid",
      stepGoal: pick([7000, 8000, 10000, 12000]),
      checkinWeekday,
      sensitiveConsentAt: status === "invited" || i % 9 === 0 ? null : iso(addDays(now, -Math.floor(10 + rand() * 200))),
    });

    // Suscripción del cliente al coach
    if (status !== "invited") {
      let paymentStatus: PaymentStatus = "paid";
      if (status === "expired") paymentStatus = "failed";
      else if (i % 11 === 3) paymentStatus = "failed";
      else if (i % 13 === 5) paymentStatus = "manual";
      const renewsInDays = status === "expired" ? -Math.floor(3 + rand() * 20) : Math.floor(rand() * 30);
      if (paymentStatus === "paid" && renewsInDays <= 3) paymentStatus = "due_soon";
      subscriptions.push({
        clientId: id,
        priceCents: pick([6900, 8900, 8900, 11900, 14900]),
        interval: i % 8 === 0 ? "quarter" : "month",
        renewsAt: iso(addDays(now, renewsInDays)),
        paymentStatus,
      });
    }

    // Actividad: los "perfiles" se reparten para que haya casos de riesgo
    const profile = rand();
    const lastWorkoutDaysAgo = profile < 0.15 ? 8 + Math.floor(rand() * 10) : Math.floor(rand() * 4);
    const adherence = profile < 0.2 ? 0.3 + rand() * 0.25 : 0.65 + rand() * 0.35;
    const dueOn = lastWeekday(now, checkinWeekday);
    const submitted = rand() < (profile < 0.2 ? 0.2 : 0.75);
    const reviewed = submitted && rand() < 0.6;

    activity.push({
      clientId: id,
      lastWorkoutAt: status === "invited" ? null : iso(addDays(now, -lastWorkoutDaysAgo)),
      adherence14d: status === "active" ? Math.min(1, adherence) : null,
      checkinDueOn: iso(dueOn),
      checkinSubmittedAt: status === "active" && submitted ? iso(addDays(dueOn, 0)) : null,
      checkinReviewedAt: status === "active" && reviewed ? iso(addDays(dueOn, 1)) : null,
      stepsToday: status === "active" ? Math.floor(2000 + rand() * 11000) : null,
    });
  });

  // Un cliente de otra organización, que ningún rol de org_1 debe ver.
  clients.push({
    id: "cli_foreign",
    orgId: OTHER_ORG_ID,
    fullName: "Cliente De Otra Org",
    email: "otra@mail.com",
    status: "active",
    goal: "—",
    injuries: "",
    notes: "",
    assignedMemberIds: [],
    startedAt: iso(now),
    timezone: "Europe/Madrid",
    stepGoal: 8000,
    checkinWeekday: 1,
    sensitiveConsentAt: null,
  });
  activity.push({
    clientId: "cli_foreign",
    lastWorkoutAt: null,
    adherence14d: null,
    checkinDueOn: iso(now),
    checkinSubmittedAt: null,
    checkinReviewedAt: null,
    stepsToday: null,
  });

  return { clients, subscriptions, activity };
}

/** Fecha más reciente (hoy incluido) que cae en ese día de la semana. */
function lastWeekday(now: Date, weekday: number): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() - weekday + 7) % 7;
  return addDays(d, -diff);
}
