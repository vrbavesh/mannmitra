"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { components } from "@/generated/api";

export function StartProgram({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function start() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pre_session_id: sessionId,
        } satisfies components["schemas"]["ProgramStartRequest"]),
      });
      const body = await response.json();
      if (response.ok) {
        router.replace("/home");
        router.refresh();
      } else
        setMessage(
          body.error?.details?.[0]?.message ??
            body.error?.message ??
            "Your program couldn't start just now. Please try again.",
        );
    } catch {
      setMessage(
        "We couldn't start your program just now. Your check-in is saved. Please try again.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <Button size="lg" className="w-full sm:w-auto" disabled={busy} onClick={() => void start()}>
        {busy ? "Starting your program..." : "Start my 30 days"}
      </Button>
      {message && (
        <p role="alert" className="text-sm text-danger-soft">
          {message}
        </p>
      )}
    </div>
  );
}
