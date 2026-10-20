"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { ScreeningSupport } from "@/components/ScreeningSupport";
import { parseDraft, type ScreeningDraft } from "@/lib/screeningDraft";
import {
  frequencyAnswers,
  safetyAnswers,
  safetyQuestion,
  screeningQuestions,
} from "@/lib/screeningQuestions";
import type { components } from "@/generated/api";

export function PretestForm({ draftKey }: { draftKey: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const heading = useRef<HTMLHeadingElement>(null);
  const posting = useRef(false);
  const [draft, setDraft] = useState<ScreeningDraft>({
    answers: Array(18).fill(null),
    safety: null,
    step: 0,
  });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const showSupport = draft.safety !== null && draft.safety > 0;
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const saved = parseDraft(sessionStorage.getItem(draftKey));
        if (saved) setDraft(saved);
      } catch {
        setStorageWarning(
          "Your browser cannot save a draft. Keep this page open until you finish.",
        );
      }
      setReady(true);
    });
  }, [draftKey]);
  useEffect(() => {
    if (ready)
      (showSupport ? document.getElementById("screening-support-title") : heading.current)?.focus();
  }, [draft.step, ready, showSupport]);

  function save(next: ScreeningDraft) {
    setDraft(next);
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(next));
    } catch {
      setStorageWarning("Your browser cannot save a draft. Keep this page open until you finish.");
    }
  }
  async function submit(value = draft) {
    if (
      posting.current ||
      !value.answers.every((answer): answer is number => answer !== null) ||
      value.safety === null
    )
      return;
    posting.current = true;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/screening/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: value.answers,
          safety_answer: value.safety,
        } satisfies components["schemas"]["ScreeningSubmitRequest"]),
      });
      const body = await response.json();
      if (response.ok || body.error?.code === "retake_not_allowed") {
        try {
          sessionStorage.removeItem(draftKey);
        } catch {
          /* The stored session already owns the result. */
        }
        router.replace("/pretest/result");
        router.refresh();
      } else
        setMessage(body.error?.message ?? "Your check-in couldn't be saved. Please try again.");
    } catch {
      setMessage(
        "We couldn't save your check-in just now. Your answers are still here. Please try again.",
      );
    } finally {
      posting.current = false;
      setBusy(false);
    }
  }
  function select(value: number) {
    if (busy) return;
    const next =
      draft.step === 18
        ? { ...draft, safety: value }
        : {
            ...draft,
            answers: draft.answers.map((answer, i) => (i === draft.step ? value : answer)),
          };
    save(next);
    if (draft.step === 18 && value > 0) void submit(next);
  }
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        !ready ||
        busy ||
        (draft.safety !== null && draft.safety > 0) ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      const value = Number(event.key);
      if (
        event.key.length === 1 &&
        /[0-6]/.test(event.key) &&
        (draft.step === 18 ? value <= 3 : value >= 1)
      ) {
        event.preventDefault();
        select(value);
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });
  const selected = draft.step === 18 ? draft.safety : draft.answers[draft.step];
  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected === null || busy) return;
    if (draft.step === 18) void submit();
    else save({ ...draft, step: draft.step + 1 });
  }
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-5 py-10 sm:py-14">
      <Card className="w-full p-6 sm:p-10">
        <p className="mb-6 text-sm font-semibold text-primary">MannMitra</p>
        {!ready ? (
          <p role="status">Getting your check-in ready...</p>
        ) : showSupport ? (
          <ScreeningSupport>
            <p role="status" className="text-sm text-muted-foreground">
              {busy ? "Saving your check-in..." : message}
            </p>
            {!busy && <Button onClick={() => void submit()}>Save check-in</Button>}
          </ScreeningSupport>
        ) : (
          <form onSubmit={next} aria-busy={busy}>
            <Progress
              value={((draft.step + 1) / 19) * 100}
              label={`Question ${draft.step + 1} of 19`}
            />
            <motion.div
              key={draft.step}
              initial={{ opacity: 0, x: reduceMotion ? 0 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={
                reduceMotion ? { duration: 0.1 } : { type: "spring", duration: 0.24, bounce: 0 }
              }
              className="mt-7 min-h-[30rem]"
            >
              {draft.step < 18 && (
                <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                  During the past 4 weeks, how much of the time...
                </p>
              )}
              <h1
                id="screening-question"
                ref={heading}
                tabIndex={-1}
                className="text-2xl font-semibold tracking-tight text-foreground outline-none sm:text-3xl"
              >
                {draft.step === 18 ? safetyQuestion : screeningQuestions[draft.step]}
              </h1>
              <fieldset
                disabled={busy}
                aria-labelledby="screening-question"
                className="mt-6 space-y-2.5"
              >
                {(draft.step === 18 ? safetyAnswers : frequencyAnswers).map((label, i) => {
                  const value = draft.step === 18 ? i : i + 1;
                  return (
                    <label
                      key={label}
                      className="flex min-h-12 cursor-pointer items-center gap-3 rounded-card border border-input-border px-4 py-3 has-checked:border-primary has-checked:bg-muted"
                    >
                      <input
                        type="radio"
                        name="frequency"
                        value={value}
                        aria-label={`${value} ${label}`}
                        checked={selected === value}
                        onChange={() => select(value)}
                        className="size-5 shrink-0 accent-primary"
                      />
                      <span className="font-mono text-sm" aria-hidden="true">
                        {value}
                      </span>
                      <span>{label}</span>
                    </label>
                  );
                })}
              </fieldset>
            </motion.div>
            {message && (
              <p role="alert" className="mt-3 text-sm text-danger-soft">
                {message}
              </p>
            )}
            <div className="mt-6 flex justify-between gap-4">
              <Button
                variant="ghost"
                disabled={draft.step === 0 || busy}
                onClick={() => save({ ...draft, step: draft.step - 1 })}
              >
                Back
              </Button>
              <Button type="submit" disabled={selected === null || busy}>
                {busy ? "Saving..." : draft.step === 18 ? "Finish check-in" : "Continue"}
              </Button>
            </div>
          </form>
        )}
        {storageWarning && (
          <p role="status" className="mt-5 text-sm text-muted-foreground">
            {storageWarning}
          </p>
        )}
        {!showSupport && (
          <p className="mt-6 text-sm text-muted-foreground">
            This is a screening, not a medical diagnosis.
          </p>
        )}
      </Card>
    </main>
  );
}
