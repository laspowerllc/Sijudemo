import type { Tone } from "@/components/ui/badge";
import type { ClientStatus, PaymentStatus } from "@/lib/types";

export const CLIENT_STATUS_TONE: Record<ClientStatus, Tone> = {
  invited: "info",
  active: "ok",
  paused: "neutral",
  expired: "danger",
};

export const PAYMENT_TONE: Record<PaymentStatus, Tone> = {
  paid: "ok",
  due_soon: "warn",
  failed: "danger",
  manual: "neutral",
  none: "neutral",
};
