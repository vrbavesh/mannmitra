"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MoodCheck } from "./MoodCheck";

export function QuickMood({
  programId,
  initialMood,
}: {
  programId: string;
  initialMood: number | null;
}) {
  const [mood, setMood] = useState<number | null>(initialMood);
  const [saved, setSaved] = useState<number | null>(initialMood);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    if (mood === null || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, program_id: programId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(body.error?.message ?? "Your check-in could not be saved just now.");
        return;
      }
      setSaved(mood);
      setMessage("Saved for today.");
    } catch {
      setMessage("Your check-in could not be saved just now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">How are you feeling right now?</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          A quick check-in for today, whenever you need it.
        </p>
      </div>
      <MoodCheck
        name="quick-mood"
        value={mood}
        onChange={setMood}
        legend="Today's mood"
        hint="This is separate from a day's practice and takes a few seconds."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={mood === null || busy} onClick={() => void save()}>
          {busy ? "Saving..." : saved === null ? "Save my check-in" : "Update today's check-in"}
        </Button>
        {saved !== null ? (
          <p className="font-mono text-sm text-muted-foreground" aria-live="polite">
            {saved}/10
          </p>
        ) : null}
      </div>
      {message ? (
        <p className="text-sm text-danger-soft" role="status">
          {message}
        </p>
      ) : null}
    </Card>
  );
}
