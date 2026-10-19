"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import { pathForStage, type Stage } from "@/lib/stage";

const failure = "We couldn't sign you in with those details, but don't worry, you can try again.";

const notices: Record<string, string> = {
  google_conflict:
    "An account with this email already exists. Please sign in with your email and password.",
  google_cancelled: "Google sign in was paused. You can try again whenever you're ready.",
  google_failed: "We couldn't finish Google sign in just now. Please try again soon.",
  google_unavailable: "Google sign in isn't available right now. You can continue with your email.",
};

export function SigninForm({ notice }: { notice?: string }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(notices[notice ?? ""] ?? "");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim().toLowerCase(), password }),
      });
      const body = await response.json();
      if (response.ok) {
        router.replace(pathForStage(body.stage as Stage));
      } else if (body.error?.code === "email_unverified") {
        if (identifier.includes("@")) {
          sessionStorage.setItem(
            "mm:signup",
            JSON.stringify({
              email: identifier.trim().toLowerCase(),
              sentAt: Date.now() - 120_000,
            }),
          );
        }
        router.push("/signup/verify");
      } else {
        setMessage(response.status === 429 ? "Please wait a little before trying again." : failure);
      }
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
        className="pointer-events-none absolute -right-32 -top-36 -z-10 size-[32rem] rounded-full bg-evergreen-100/60 blur-3xl"
      />
      <div className="mx-auto w-full max-w-md animate-[fade-in_220ms_ease-out_both]">
        <p className="mb-7 text-center text-sm font-semibold tracking-[0.18em] text-evergreen-700 uppercase">
          MannMitra
        </p>
        <Card className="p-7 shadow-raised sm:p-10">
          <h1 className="text-3xl font-bold tracking-tight text-evergreen-900">Welcome back</h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Continue from where you left off.
          </p>
          {message && (
            <p
              role="alert"
              className="mt-5 rounded-card bg-amber-50 p-3 text-sm leading-relaxed text-neutral-700"
            >
              {message}
            </p>
          )}
          <div className="mt-7">
            <GoogleButton />
          </div>
          <OrDivider />
          <form onSubmit={submit} className="space-y-5">
            <Input
              label="Email or username"
              autoComplete="username"
              required
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            <Link
              className="font-semibold text-evergreen-800 underline underline-offset-4 focus-visible:outline-2"
              href="/forgot-password"
            >
              Forgot password?
            </Link>
            <Link
              className="font-semibold text-evergreen-800 underline underline-offset-4 focus-visible:outline-2"
              href="/forgot-username"
            >
              Forgot username?
            </Link>
          </div>
        </Card>
        <p className="mt-7 text-center text-sm text-muted-foreground">
          New to MannMitra?{" "}
          <Link
            href="/signup"
            className="font-semibold text-evergreen-800 underline underline-offset-4 focus-visible:outline-2"
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
