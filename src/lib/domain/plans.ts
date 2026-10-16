import type { PlatformPlan } from "@/lib/types";

export interface PlanLimits {
  /** Clientes activos máximos. null = ilimitado. */
  maxActiveClients: number | null;
  maxAssistants: number;
}

export const PLAN_LIMITS: Record<PlatformPlan, PlanLimits> = {
  basic: { maxActiveClients: 5, maxAssistants: 0 },
  medium: { maxActiveClients: 20, maxAssistants: 1 },
  pro: { maxActiveClients: 50, maxAssistants: 3 },
  platinium: { maxActiveClients: null, maxAssistants: 5 },
};

/** Durante la prueba se aplican los límites de Pro. */
export const TRIAL_PLAN: PlatformPlan = "pro";
export const TRIAL_DAYS = 7;
export const GRACE_DAYS = 7;
