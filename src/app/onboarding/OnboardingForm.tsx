"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { components } from "@/generated/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Progress } from "@/components/ui/Progress";
import { MIN_AGE, usernamePattern } from "@/lib/onboarding";
import { pathForStage } from "@/lib/stage";

type Schemas = components["schemas"];
const steps = [
  ["A name for your space", "Choose a username you can use to sign in."],
  ["What should we call you?", "Choose a name that feels like you."],
  ["A little about you", "Choose the option you feel comfortable sharing."],
  ["Before we begin", "Please confirm that you meet the age requirement."],
  ["Your choice to continue", "Take a moment to read and agree to each statement."],
  ["A little time for you", "You can choose a daily reminder time, or leave it blank."],
] as const;

export function OnboardingForm() {
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [gender, setGender] = useState<Schemas["OnboardingRequest"]["gender"] | "">("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [nonDiagnostic, setNonDiagnostic] = useState(false);
  const [reminder, setReminder] = useState("");
  const [availability, setAvailability] = useState({ username: "", available: false, message: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/onboarding", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message);
        const profile: Schemas["OnboardingProfile"] = body;
        if (profile.stage !== "needs_onboarding") {
          router.replace(pathForStage(profile.stage));
          return;
        }
        if (controller.signal.aborted) return;
        setDisplayName(profile.display_name);
        setTimezone(profile.timezone);
        setReady(true);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setMessage("We couldn't load your details. Please reload this page to try again.");
      });
    return () => controller.abort();
  }, [router]);

  useEffect(() => {
    if (step !== 0 || !ready || !usernamePattern.test(username)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/onboarding/username?username=${encodeURIComponent(username)}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );
        const body = await response.json();
        if (controller.signal.aborted) return;
        setAvailability({
          username,
          available: response.ok && body.available,
          message: response.ok
            ? body.available
              ? "That username is available."
              : "That username is taken. Try another."
            : (body.error?.message ?? "We couldn't check just now. Try again shortly."),
        });
      } catch {
        if (!controller.signal.aborted)
          setAvailability({
            username,
            available: false,
            message: "We couldn't check just now. Edit your username to try again.",
          });
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [username, step, ready]);

  useEffect(() => {
    if (ready) heading.current?.focus();
  }, [step, ready]);

  const available = availability.username === username && availability.available;
  const canContinue = [
    usernamePattern.test(username) && available,
    displayName.trim().length > 0 && displayName.length <= 80,
    Boolean(gender),
    ageConfirmed,
    terms && privacy && nonDiagnostic,
    !reminder || /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(reminder),
  ][step];
  const usernameMessage =
    !username || !usernamePattern.test(username)
      ? "Use 3 to 20 lowercase letters, numbers or underscores."
      : availability.username === username
        ? availability.message
        : "Checking availability...";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinue || busy) return;
    setMessage("");
    if (step < steps.length - 1) {
      setStep(step + 1);
      return;
    }
    if (!gender || !ageConfirmed || !terms || !privacy || !nonDiagnostic) return;
    const payload: Schemas["OnboardingRequest"] = {
      username,
      display_name: displayName.trim(),
      gender,
      age_confirmed: ageConfirmed,
      terms_accepted: terms,
      privacy_accepted: privacy,
      non_diagnostic_accepted: nonDiagnostic,
      reminder_time: reminder || null,
    };
    setBusy(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (response.ok) {
        const result: Schemas["SigninResponse"] = body;
        router.replace(pathForStage(result.stage));
        router.refresh();
      } else {
        const usernameError = body.error?.details?.find(
          (detail: { field: string }) => detail.field === "username",
        );
        if (usernameError) {
          setAvailability({ username, available: false, message: usernameError.message });
          setStep(0);
        }
        setMessage(body.error?.message ?? "Your details couldn't be saved. Please try again.");
      }
    } catch {
      setMessage(
        "We couldn't save your details just now. Your choices are still here, so you can try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 items-center px-5 py-10 sm:py-16">
      <Card className="w-full p-6 sm:p-10">
        <p className="mb-6 text-sm font-semibold tracking-wide text-primary">MannMitra</p>
        <Progress
          value={ready ? ((step + 1) / steps.length) * 100 : 0}
          label={`Getting to know you${ready ? `, step ${step + 1} of ${steps.length}` : ""}`}
        />
        {!ready ? (
          <p role="status" className="mt-8 text-muted-foreground">
            {message || "Getting your space ready..."}
          </p>
        ) : (
          <form onSubmit={submit} className="mt-8" aria-busy={busy}>
            <div key={step} className="min-h-[26rem] motion-safe:animate-[fade-in_200ms_ease-out]">
              <h1
                ref={heading}
                tabIndex={-1}
                className="text-3xl font-semibold tracking-tight text-primary outline-none"
              >
                {steps[step][0]}
              </h1>
              <p className="mt-3 leading-relaxed text-muted-foreground">{steps[step][1]}</p>
              <fieldset disabled={busy} className="mt-7 space-y-4">
                <legend className="sr-only">{steps[step][0]}</legend>
                {step === 0 && (
                  <>
                    <Input
                      label="Username"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={20}
                      aria-describedby="username-status"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                    />
                    <p id="username-status" role="status" className="text-sm text-muted-foreground">
                      {usernameMessage}
                    </p>
                  </>
                )}
                {step === 1 && (
                  <Input
                    label="Display name"
                    autoComplete="nickname"
                    maxLength={80}
                    helper="You can use up to 80 characters."
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                )}
                {step === 2 &&
                  (
                    [
                      ["male", "Male"],
                      ["female", "Female"],
                      ["other", "Other"],
                      ["prefer_not_to_say", "Prefer not to say"],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-card border border-input-border px-4 py-3 has-checked:border-primary has-checked:bg-muted"
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={value}
                        checked={gender === value}
                        onChange={() => setGender(value)}
                        className="size-5 accent-primary"
                      />
                      {label}
                    </label>
                  ))}
                {step === 3 && (
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 py-3">
                    <input
                      type="checkbox"
                      checked={ageConfirmed}
                      onChange={(event) => setAgeConfirmed(event.target.checked)}
                      className="mt-0.5 size-5 shrink-0 accent-primary"
                    />
                    <span>I confirm that I am {MIN_AGE} or older.</span>
                  </label>
                )}
                {step === 4 && (
                  <>
                    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-3">
                      <input
                        type="checkbox"
                        checked={terms}
                        onChange={(event) => setTerms(event.target.checked)}
                        className="mt-0.5 size-5 shrink-0 accent-primary"
                      />
                      <span>
                        I agree to the{" "}
                        <Link
                          href="/terms"
                          target="_blank"
                          rel="noopener"
                          className="text-primary underline underline-offset-4"
                        >
                          Terms (opens in a new tab)
                        </Link>
                        .
                      </span>
                    </label>
                    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-3">
                      <input
                        type="checkbox"
                        checked={privacy}
                        onChange={(event) => setPrivacy(event.target.checked)}
                        className="mt-0.5 size-5 shrink-0 accent-primary"
                      />
                      <span>
                        I agree to the{" "}
                        <Link
                          href="/privacy"
                          target="_blank"
                          rel="noopener"
                          className="text-primary underline underline-offset-4"
                        >
                          Privacy Policy (opens in a new tab)
                        </Link>
                        .
                      </span>
                    </label>
                    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-3">
                      <input
                        type="checkbox"
                        checked={nonDiagnostic}
                        onChange={(event) => setNonDiagnostic(event.target.checked)}
                        className="mt-0.5 size-5 shrink-0 accent-primary"
                      />
                      <span>I understand this is not a medical diagnosis.</span>
                    </label>
                  </>
                )}
                {step === 5 && (
                  <Input
                    label="Reminder time (optional)"
                    type="time"
                    value={reminder}
                    onChange={(event) => setReminder(event.target.value)}
                    helper={`Local time in ${timezone}. Leave blank for no daily reminder.`}
                  />
                )}
              </fieldset>
            </div>
            {message && (
              <p role="alert" className="mt-4 text-sm text-danger-soft">
                {message}
              </p>
            )}
            <div className="mt-8 flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="ghost"
                disabled={step === 0 || busy}
                onClick={() => {
                  setMessage("");
                  setStep(step - 1);
                }}
              >
                Back
              </Button>
              <Button type="submit" disabled={!canContinue || busy}>
                {busy ? "Saving..." : step === 5 ? "Save and continue" : "Continue"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </main>
  );
}
