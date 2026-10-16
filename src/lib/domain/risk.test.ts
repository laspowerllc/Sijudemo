import { describe, expect, it } from "vitest";
import type { ClientRow } from "@/lib/types";
import { isAtRisk, riskReasons } from "./risk";

const now = new Date("2026-10-16T12:00:00");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

function row(over: Partial<ClientRow["activity"]> = {}, payment: "paid" | "failed" = "paid"): ClientRow {
  return {
    client: { id: "c", orgId: "o", fullName: "X", email: "x@x", status: "active", goal: "", injuries: "", notes: "", assignedMemberIds: [], startedAt: daysAgo(60), timezone: "Europe/Madrid", stepGoal: 8000, checkinWeekday: 1, sensitiveConsentAt: null },
    subscription: { clientId: "c", priceCents: 8900, interval: "month", renewsAt: daysAgo(-10), paymentStatus: payment },
    activity: { clientId: "c", lastWorkoutAt: daysAgo(1), adherence14d: 0.9, checkinDueOn: daysAgo(4), checkinSubmittedAt: daysAgo(4), checkinReviewedAt: null, stepsToday: 9000, ...over },
    assignedNames: [],
  };
}

describe("riesgo de abandono", () => {
  it("un cliente al día no está en riesgo", () => {
    expect(riskReasons(row(), now)).toEqual([]);
  });

  it("una sola señal no basta", () => {
    const r = row({ lastWorkoutAt: daysAgo(9) });
    expect(riskReasons(r, now)).toEqual(["no_workouts_7d"]);
    expect(isAtRisk(r, now)).toBe(false);
  });

  it("dos señales o más → en riesgo", () => {
    const r = row({ lastWorkoutAt: daysAgo(9), checkinSubmittedAt: null }, "failed");
    expect(riskReasons(r, now)).toEqual(["no_workouts_7d", "checkin_missing", "payment_failed"]);
    expect(isAtRisk(r, now)).toBe(true);
  });

  it("el check-in del día de hoy aún no cuenta como pendiente", () => {
    expect(riskReasons(row({ checkinDueOn: now.toISOString(), checkinSubmittedAt: null }), now)).toEqual([]);
  });
});
