"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { pathForStage, type Stage } from "@/lib/stage";

export default function PasswordResetPage() {
  const router = useRouter();
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
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await response.json();
      if (response.ok) {
        router.replace(pathForStage(body.stage as Stage));
      } else {
        setMessage(
          body.error?.code === "code_expired"
            ? "This reset session has expired. Please request a new code."
            : "We couldn't update your password just now. Please try again soon.",
        );
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
        className="pointer-events-none absolute -right-32 -top-32 -z-10 size-[32rem] rounded-full bg-evergreen-100/60 blur-3xl"
      />
      <div className="mx-auto w-full max-w-md animate-[fade-in_220ms_ease-out_both]">
        <p className="mb-7 text-center text-sm font-semibold tracking-[0.18em] text-evergreen-700 uppercase">
          MannMitra
        </p>
        <Card className="p-7 shadow-raised sm:p-10">
          <h1 className="text-3xl font-bold tracking-tight text-evergreen-900">
            Choose a new password
          </h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Use at least 8 characters. Your other signed-in devices will be signed out.
          </p>
          <form onSubmit={submit} className="mt-7 space-y-5">
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
            {message && (
              <p role="alert" className="rounded-card bg-amber-50 p-3 text-sm text-neutral-700">
                {message}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Updating password..." : "Set new password"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
