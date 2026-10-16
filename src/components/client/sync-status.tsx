"use client";

import { useEffect, useSyncExternalStore } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { flush, pendingCount, subscribe } from "@/lib/offline/outbox";

const getOnline = () => navigator.onLine;

/** Aviso de entrenos pendientes de sincronizar / sin conexión. Reintenta solo. */
export function SyncStatus() {
  const pending = useSyncExternalStore(subscribe, pendingCount, () => 0);
  const online = useSyncExternalStore(subscribe, getOnline, () => true);

  useEffect(() => {
    if (online && pending > 0) void flush();
  }, [online, pending]);

  if (online && pending === 0) return null;
  return (
    <div className="mx-4 mb-2 flex items-center gap-2 rounded border border-border bg-bg px-3 py-2 text-xs text-fg-muted">
      {online ? <RefreshCw className="size-3.5 animate-spin" /> : <CloudOff className="size-3.5" />}
      {online
        ? `Sincronizando ${pending} entreno(s)…`
        : pending > 0
          ? `Sin conexión · ${pending} entreno(s) se enviarán al recuperarla`
          : "Sin conexión · puedes seguir registrando tu entreno"}
    </div>
  );
}
