"use client";

import { useEffect, useRef, type ReactNode } from "react";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Buttons rendered in the footer area. */
  actions?: ReactNode;
}

/**
 * Modal dialog built on the native <dialog> element:
 * focus trap, Escape close, and focus-restore to the opener are native behaviors.
 * Enter/exit is opacity-only (motion budget); reduced-motion gets the instant path.
 */
export function Dialog({ open, onClose, title, children, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // Backdrop click closes; <dialog> handles Escape via 'cancel' → we sync state.
  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(92vw,28rem)] rounded-card border border-border bg-surface
        shadow-raised backdrop:bg-evergreen-950/40 p-0
        motion-safe:animate-[fade-in_150ms_ease-out]"
    >
      {/* Inner wrapper owns the padding: clicks inside the card target this div,
          so only true backdrop clicks reach the <dialog> element and close it. */}
      <div className="flex flex-col gap-4 p-6">
        <h2 id="dialog-title" className="text-lg font-bold text-foreground">
          {title}
        </h2>
        <div className="text-sm text-muted-foreground">{children}</div>
        {actions ? <div className="flex justify-end gap-3 pt-1">{actions}</div> : null}
      </div>
    </dialog>
  );
}
