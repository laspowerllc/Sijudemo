"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Diálogo modal nativo (<dialog>): foco, Escape y fondo gestionados por el navegador. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={cn("m-auto w-full max-w-md rounded border border-border-strong bg-bg p-0 text-fg backdrop:bg-fg/30", className)}
    >
      {open && (
        <>
          <div className="flex h-10 items-center justify-between border-b border-border px-4">
            <h2 className="text-[13px] font-semibold">{title}</h2>
            <button type="button" onClick={onClose} className="text-fg-muted hover:text-fg" aria-label="Cerrar">
              <X className="size-4" />
            </button>
          </div>
          {children}
        </>
      )}
    </dialog>
  );
}
