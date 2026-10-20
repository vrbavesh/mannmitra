"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MoodCheck } from "./MoodCheck";
import { TaskBody } from "./TaskRegistry";

type Step = "before" | "task" | "after" | "done";

export interface TaskCardProps {
  dayNo: number;
  title: string;
  description: string | null;
  exampleText: string | null;
  component: string;
  config: Record<string, unknown>;
  duration: string;
  isRestDay: boolean;
}

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Narrow task card shell for Step 12: mood before, the day's component, mood
 * after, then completion. Step 13 hardens and extends this shell.
 */
export function TaskCard({
  dayNo,
  title,
  description,
  exampleText,
  component,
  config,
  duration,
  isRestDay,
}: TaskCardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("before");
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const startedAt = useRef<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (step === "before") return;
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (step !== "task") return;
    const timer = setInterval(() => {
      if (startedAt.current !== null)
        setElapsed(Math.floor((performance.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  function begin() {
    if (moodBefore === null) return;
    startedAt.current = performance.now();
    setElapsed(0);
    setStep("task");
  }

  async function finish() {
    if (moodAfter === null || busy) return;
    setBusy(true);
    setMessage("");
    const timeTaken =
      startedAt.current === null
        ? 0
        : Math.max(0, Math.round((performance.now() - startedAt.current) / 1000));
    try {
      const response = await fetch(`/api/program/days/${dayNo}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood_before: moodBefore ?? 0,
          mood_after: moodAfter,
          time_taken_s: timeTaken,
          payload,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(
          body.error?.message ?? "Today's check-in could not be saved just now. Please try again.",
        );
        return;
      }
      setStep("done");
      router.refresh();
    } catch {
      setMessage("Today's check-in could not be saved just now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "before")
    return (
      <Card className="space-y-5 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Day {dayNo} of 30
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Before we begin, how do you feel?
        </h1>
        <MoodCheck
          name="mood-before"
          value={moodBefore}
          onChange={setMoodBefore}
          legend="Your mood right now"
          hint="This stays private to your account and helps you see change over time."
        />
        <Button size="lg" disabled={moodBefore === null} onClick={begin}>
          Begin today&apos;s practice
        </Button>
      </Card>
    );

  if (step === "task")
    return (
      <Card className="space-y-5 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Day {dayNo} of 30{isRestDay ? " · Rest day" : ""}
          </p>
          <p className="font-mono text-sm text-muted-foreground" aria-label="Time on this practice">
            {formatSeconds(elapsed)}
          </p>
        </div>
        <div className="space-y-2">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-semibold tracking-tight focus:outline-none sm:text-3xl"
          >
            {title}
          </h1>
          {description ? (
            <p className="leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">{duration}</p>
        </div>
        {exampleText ? (
          <p className="rounded-card bg-muted p-4 text-sm leading-relaxed">{exampleText}</p>
        ) : null}
        <TaskBody
          component={component}
          config={config}
          onComplete={(activityPayload) => {
            if (activityPayload) setPayload((current) => ({ ...current, ...activityPayload }));
            setStep("after");
          }}
        />
      </Card>
    );

  if (step === "after")
    return (
      <Card className="space-y-5 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Day {dayNo} of 30
        </p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold tracking-tight focus:outline-none sm:text-3xl"
        >
          And how do you feel now?
        </h1>
        <MoodCheck
          name="mood-after"
          value={moodAfter}
          onChange={setMoodAfter}
          legend="Your mood after the practice"
          hint="A small shift is enough. Nothing has to be different."
        />
        {message ? (
          <p role="alert" className="text-sm text-danger-soft">
            {message}
          </p>
        ) : null}
        <Button size="lg" disabled={moodAfter === null || busy} onClick={() => void finish()}>
          {busy ? "Saving your day..." : `Finish day ${dayNo}`}
        </Button>
      </Card>
    );

  return (
    <Card className="space-y-5 p-6 sm:p-8" aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        Day {dayNo} of 30
      </p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl font-semibold tracking-tight focus:outline-none sm:text-3xl"
      >
        Day {dayNo} is complete.
      </h1>
      <p className="leading-relaxed text-muted-foreground">
        Your before and after check-in are saved. A new practice opens at your local midnight.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/home"
          className="inline-flex h-11 items-center justify-center rounded-control bg-primary px-6 text-sm font-semibold text-primary-foreground transition-transform duration-[120ms] hover:bg-evergreen-700 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:active:scale-100"
        >
          Back to home
        </Link>
        <Link
          href="/program"
          className="inline-flex h-11 items-center justify-center rounded-control border border-border bg-surface px-6 text-sm font-semibold text-foreground transition-transform duration-[120ms] hover:bg-muted active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:active:scale-100"
        >
          See your 30 days
        </Link>
      </div>
    </Card>
  );
}
