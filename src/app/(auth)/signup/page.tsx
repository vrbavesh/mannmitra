"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) {
      setMessage("Those passwords don't match yet. Please check them and try again.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password, purpose: "signup" }),
      });
      if (!response.ok) {
        setMessage(
          response.status === 429
            ? "Please wait a little before asking for another code."
            : "We couldn't send a code just now. Please try again soon.",
        );
        return;
      }
      sessionStorage.setItem(
        "mm:signup",
        JSON.stringify({ email: normalizedEmail, sentAt: Date.now() }),
      );
      router.push("/signup/verify");
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
        className="pointer-events-none absolute -right-28 -top-40 -z-10 size-[32rem] rounded-full bg-evergreen-100/60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-28 -z-10 size-[28rem] rounded-full bg-amber-100/70 blur-3xl"
      />
      <div className="mx-auto grid w-full max-w-5xl gap-12 lg:grid-cols-[1fr_28rem] lg:items-center">
        <section className="max-w-lg animate-[fade-in_220ms_ease-out_both]">
          <p className="text-sm font-semibold tracking-[0.18em] text-evergreen-700 uppercase">
            MannMitra
          </p>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-evergreen-900 sm:text-5xl">
            A little space to feel more like yourself.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-neutral-700">
            Start with a private check-in. We&apos;ll help you find gentle steps for the next 30
            days, at your pace.
          </p>
          <p className="mt-8 border-l-2 border-amber-500 pl-4 text-sm leading-relaxed text-muted-foreground">
            MannMitra offers self-help support and screening. It is not a diagnosis or a replacement
            for professional care.
          </p>
        </section>
        <Card className="animate-[fade-in_220ms_ease-out_both] p-7 shadow-raised sm:p-9">
          <div className="mb-8">
            <p className="text-xs font-semibold tracking-[0.14em] text-evergreen-700 uppercase">
              Step 1 of 2
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-evergreen-900">
              Create your account
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Your answers stay connected to your account, so you can come back anytime.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              helper="At least 8 characters."
            />
            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
            {message && (
              <p role="alert" className="text-sm text-danger-soft">
                {message}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Sending code..." : "Continue with email"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="font-semibold text-evergreen-800 underline underline-offset-4 focus-visible:outline-2"
            >
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
