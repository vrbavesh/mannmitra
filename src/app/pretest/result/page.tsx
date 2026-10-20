import { Suspense } from "react";
import { redirect } from "next/navigation";
import { pageClient } from "@/server/authClient";
import { Card } from "@/components/ui/Card";
import { RouteShell } from "@/components/RouteShell";
import { ScreeningSupport } from "@/components/ScreeningSupport";
import { deriveGate } from "@/lib/risk";
import { localDate } from "@/lib/stage";
import { ResultSummary } from "./ResultSummary";

async function Result() {
  const client = await pageClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect("/signin");
  if (!user.email_confirmed_at) redirect("/signup/verify");
  const [saved, profile] = await Promise.all([
    client
      .from("screening_sessions")
      .select(
        "id,wellbeing_pct,anxiety_pct,depression_pct,negmood_pct,severity,safety_answer,completed_at",
      )
      .eq("user_id", user.id)
      .eq("kind", "pre")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client.from("profiles").select("timezone").eq("id", user.id).single(),
  ]);
  if (saved.error || profile.error || !profile.data) throw new Error("Check-in unavailable");
  const result = saved.data;
  if (!result || result.severity === null) redirect("/pretest");
  const gate = deriveGate(
    result.safety_answer,
    result.severity,
    localDate(new Date(result.completed_at), profile.data.timezone),
  );
  if (gate.showSupport)
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-5 py-12">
        <Card className="w-full p-7 sm:p-10">
          <p className="mb-6 text-sm font-semibold text-primary">MannMitra</p>
          <ScreeningSupport>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You can take another check-in from{" "}
              <span className="font-semibold">
                {new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "UTC" }).format(
                  new Date(gate.retakeAt! + "T00:00:00Z"),
                )}
              </span>{" "}
              in your local calendar.
            </p>
          </ScreeningSupport>
        </Card>
      </main>
    );
  if (
    [result.wellbeing_pct, result.anxiety_pct, result.depression_pct, result.negmood_pct].some(
      (value) => value === null,
    )
  )
    throw new Error("Check-in unavailable");
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:py-14">
      <ResultSummary
        sessionId={result.id}
        score={Number(result.wellbeing_pct)}
        severity={result.severity}
        areas={{
          anxiety_pct: Number(result.anxiety_pct),
          depression_pct: Number(result.depression_pct),
          negmood_pct: Number(result.negmood_pct),
        }}
      />
    </main>
  );
}

export default function PretestResultPage() {
  return (
    <Suspense
      fallback={
        <RouteShell title="Your check-in" description="Getting your saved check-in ready..." />
      }
    >
      <Result />
    </Suspense>
  );
}
