"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { otpStatus } from "@/lib/otpState";

export default function VerifySignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const saved = sessionStorage.getItem("mm:signup");
      if (saved) {
        try {
          const pending = JSON.parse(saved) as { email: string; sentAt: number };
          if (typeof pending.email === "string" && Number.isFinite(pending.sentAt)) {
            setEmail(pending.email);
            setSentAt(pending.sentAt);
          }
        } catch {
          /* The email can still be entered below. */
        }
      }
      setNow(Date.now());
    });
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const status =
    sentAt === null
      ? { secondsLeft: 0, canVerify: false, canResend: true }
      : otpStatus(sentAt, wrongAttempts, now);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!status.canVerify || code.length !== 6) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code, purpose: "signup" }),
      });
      if (response.ok) {
        sessionStorage.removeItem("mm:signup");
        router.replace("/onboarding");
        return;
      }
      const body = await response.json();
      if (body.error?.code === "code_expired") {
        setSentAt(Date.now() - 120_000);
        setMessage("Code expired. You can ask for a new one.");
      } else if (body.error?.code === "too_many_attempts") {
        setWrongAttempts(5);
        setMessage("This code is done. You can ask for a new one when the timer ends.");
      } else if (body.error?.code === "invalid_code") {
        setWrongAttempts((count) => Math.min(5, count + 1));
        setMessage("That code didn't match. Please check the digits and try again.");
      } else {
        setMessage("We couldn't check that code just now. Please try again soon.");
      }
      setCode("");
    } catch {
      setMessage("We couldn't connect just now. Please try again soon.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!status.canResend || !email.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), purpose: "signup" }),
      });
      if (!response.ok) {
        setMessage(
          response.status === 429
            ? "Please wait a little before asking for another code."
            : "We couldn't send a code just now. Please try again soon.",
        );
        return;
      }
      const nextSentAt = Date.now();
      sessionStorage.setItem(
        "mm:signup",
        JSON.stringify({ email: email.trim().toLowerCase(), sentAt: nextSentAt }),
      );
      setSentAt(nextSentAt);
      setWrongAttempts(0);
      setCode("");
      setMessage("If this email can be registered, we sent a new code.");
    } catch {
      setMessage("We couldn't connect just now. Please try again soon.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-[100dvh] flex-1 items-center overflow-hidden px-5 py-12 sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 -z-10 size-[32rem] rounded-full bg-evergreen-100/60 blur-3xl"
      />
      <div className="mx-auto w-full max-w-lg animate-[fade-in_220ms_ease-out_both]">
        <p className="mb-7 text-center text-sm font-semibold tracking-[0.18em] text-evergreen-700 uppercase">
          MannMitra
        </p>
        <Card className="p-7 shadow-raised sm:p-10">
          <p className="text-xs font-semibold tracking-[0.14em] text-evergreen-700 uppercase">
            Step 2 of 2
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-evergreen-900">
            Check your email
          </h1>
          <p className="mt-4 leading-relaxed text-neutral-700">
            If this email can be registered, we sent a code.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Enter the six digits here. The code is available for two minutes.
          </p>
          <form onSubmit={verify} className="mt-7 space-y-5">
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Input
              label="Six-digit code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              required
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center font-mono text-xl tracking-[0.3em]"
            />
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                {sentAt === null
                  ? "Enter your email to request a code"
                  : status.secondsLeft > 0
                    ? `Code available for ${Math.floor(status.secondsLeft / 60)}:${String(status.secondsLeft % 60).padStart(2, "0")}`
                    : "Code expired"}
              </span>
              <span>{wrongAttempts > 0 ? `${Math.max(0, 5 - wrongAttempts)} tries left` : ""}</span>
            </div>
            {message && (
              <p role="alert" className="text-sm text-danger-soft">
                {message}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={busy || !status.canVerify || code.length !== 6}
            >
              {busy ? "Checking..." : "Verify email"}
            </Button>
          </form>
          <div className="mt-6 border-t border-border pt-6 text-center">
            <button
              type="button"
              onClick={resend}
              disabled={busy || !status.canResend || !email.trim()}
              className="text-sm font-semibold text-evergreen-800 underline underline-offset-4 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sentAt === null ? "Send a code" : "Send a new code"}
            </button>
          </div>
        </Card>
        <p className="mt-7 text-center text-sm text-muted-foreground">
          Need to start over?{" "}
          <Link
            href="/signup"
            className="font-semibold text-evergreen-800 underline underline-offset-4 focus-visible:outline-2"
          >
            Back to sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
