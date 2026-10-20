"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ToastTone = "neutral" | "success";
interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/**
 * Minimal calm toast: mint surface, teal text, opacity+translate enter.
 * Auto-dismiss 4s; no stacking queue beyond the single latest message (v1).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastState | null>(null);

  const toast = useCallback((message: string, tone: ToastTone = "neutral") => {
    const id = Date.now();
    setCurrent({ id, message, tone });
    setTimeout(() => {
      setCurrent((c) => (c && c.id === id ? null : c));
    }, 4000);
  }, []);

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
      >
        {current ? (
          <div
            key={current.id}
            className={`max-w-md rounded-control border px-5 py-3 text-sm font-medium shadow-raised
              motion-safe:animate-[toast-in_180ms_ease-out]
              ${
                current.tone === "success"
                  ? "border-evergreen-300 bg-evergreen-50 text-evergreen-800"
                  : "border-border bg-surface text-foreground"
              }`}
          >
            {current.message}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
