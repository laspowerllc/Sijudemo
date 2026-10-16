import type { ClientRow } from "@/lib/types";
import { daysBetween } from "@/lib/dates";

export type RiskReason = "no_workouts_7d" | "checkin_missing" | "low_adherence" | "payment_failed";

/** Un cliente está en riesgo si cumple 2 o más señales. */
export const RISK_THRESHOLD = 2;
export const LOW_ADHERENCE = 0.6;

export function riskReasons(row: ClientRow, now: Date): RiskReason[] {
  const { activity, subscription } = row;
  const reasons: RiskReason[] = [];

  if (!activity.lastWorkoutAt || daysBetween(new Date(activity.lastWorkoutAt), now) >= 7) {
    reasons.push("no_workouts_7d");
  }
  if (isCheckinMissing(row, now)) reasons.push("checkin_missing");
  if (activity.adherence14d !== null && activity.adherence14d < LOW_ADHERENCE) {
    reasons.push("low_adherence");
  }
  if (subscription?.paymentStatus === "failed") reasons.push("payment_failed");

  return reasons;
}

export function isAtRisk(row: ClientRow, now: Date): boolean {
  return row.client.status === "active" && riskReasons(row, now).length >= RISK_THRESHOLD;
}

/** El check-in de la semana ya venció (su día ha pasado) y no se ha enviado. */
export function isCheckinMissing(row: ClientRow, now: Date): boolean {
  const { checkinDueOn, checkinSubmittedAt } = row.activity;
  return !checkinSubmittedAt && new Date(checkinDueOn) < startOfDay(now);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
