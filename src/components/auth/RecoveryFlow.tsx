"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { otpStatus } from "@/lib/otpState";

type Purpose = "forgot_password" | "forgot_username";

export function RecoveryFlow({ purpose }: { purpose: Purpose }) {
  const router = useRouter();
  const isPassword = purpose === "forgot_password";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [username, setUsername] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    queueMicrotask(() => setNow(Date.now()));
    return () => window.clearInterval(interval);
  }, []);

  const status =
    sentAt === null
      ? { secondsLeft: 0, canVerify: false, canResend: true }
      : otpStatus(sentAt, wrongAttempts, now);

  async function requestCode() {
    if (!email.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), purpose }),
      });
      if (!response.ok) {
        setMessage(
          response.status === 429
            ? "Please wait a little before asking for another code."
            : "We couldn't send a code just now. Please try again soon.",
        );
        return;
      }
      setSentAt(Date.now());
      setWrongAttempts(0);
      setCode("");
      setMessage("If an account exists, we sent a code.");
    } catch {
      setMessage("We couldn't connect just now. Please try again soon.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!status.canVerify || code.length !== 6) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code, purpose }),
      });
      const body = await response.json();
      if (response.ok) {
        if (isPassword) router.replace(body.redirect);
        else setUsername(body.revealed_username ?? "");
        return;
      }
      if (body.error?.code === "google_only") {
        setMessage("This account uses Google sign in.");
        setSentAt(null);
      } else if (body.error?.code === "code_expired") {
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

  return (
    <main className="relative isolate flex min-h-[100dvh] flex-1 items-center overflow-hidden px-5 py-12 sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 -z-10 size-[32rem] rounded-full bg-evergreen-100/60 blur-3xl"
      />
      <div className="mx-auto w-full max-w-md animate-[fade-in_220ms_ease-out_both]">
        <p className="mb-7 text-center text-sm font-semibold tracking-[0.18em] text-evergreen-700 uppercase">
          MannMitra
        </p>
        <Card className="p-7 shadow-raised sm:p-10">
          <h1 className="text-3xl font-bold tracking-tight text-evergreen-900">
            {isPassword ? "Reset your password" : "Find your username"}
          </h1>
          {username !== null ? (
            <div className="mt-6">
              <p className="text-sm text-muted-foreground">Your username is</p>
              <p className="mt-2 rounded-card bg-evergreen-50 p-4 text-center font-mono text-xl font-semibold text-evergreen-900">
                {username || "You have not chosen a username yet"}
              </p>
              <Link
                href="/signin"
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-control bg-primary px-7 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Go to sign in
              </Link>
            </div>
          ) : sentAt === null ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void requestCode();
              }}
              className="mt-7 space-y-5"
            >
              <p className="leading-relaxed text-muted-foreground">
                Enter the email connected to your account.
              </p>
              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              {message && (
                <p role="alert" className="rounded-card bg-amber-50 p-3 text-sm text-neutral-700">
                  {message}
                </p>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "Sending code..." : "Send OTP"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-7 space-y-5">
              <p className="leading-relaxed text-neutral-700">
                If an account exists, we sent a code.
              </p>
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
                  {status.secondsLeft > 0
                    ? `Code available for ${Math.floor(status.secondsLeft / 60)}:${String(status.secondsLeft % 60).padStart(2, "0")}`
                    : "Code expired"}
                </span>
                <span>
                  {wrongAttempts > 0 ? `${Math.max(0, 5 - wrongAttempts)} tries left` : ""}
                </span>
              </div>
              {message && (
                <p role="alert" className="rounded-card bg-amber-50 p-3 text-sm text-neutral-700">
                  {message}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={busy || !status.canVerify || code.length !== 6}
              >
                {busy ? "Checking..." : "Verify code"}
              </Button>
              <button
                type="button"
                onClick={() => void requestCode()}
                disabled={busy || !status.canResend}
                className="w-full text-sm font-semibold text-evergreen-800 underline underline-offset-4 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send a new code
              </button>
            </form>
          )}
        </Card>
        <p className="mt-7 text-center text-sm text-muted-foreground">
          <Link
            href="/signin"
            className="font-semibold text-evergreen-800 underline underline-offset-4 focus-visible:outline-2"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
