import { Suspense } from "react";
import { redirect } from "next/navigation";
import { pageClient } from "@/server/authClient";
import { Card } from "@/components/ui/Card";
import { RouteShell } from "@/components/RouteShell";
import { ScreeningSupport } from "@/components/ScreeningSupport";

async function Result() {
  const client = await pageClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect("/signin");
  const { data: result, error: readError } = await client
    .from("screening_sessions")
    .select("wellbeing_pct,severity,safety_answer")
    .eq("user_id", user.id)
    .eq("kind", "pre")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) throw new Error("Check-in unavailable");
  if (!result || result.severity === null) redirect("/pretest");
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-5 py-12">
      <Card className="w-full p-6 sm:p-10">
        <p className="mb-6 text-sm font-semibold text-primary">MannMitra</p>
        {result.safety_answer > 0 || result.severity === "severe" ? (
          <ScreeningSupport />
        ) : (
          <div className="space-y-5">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Your check-in is saved
            </h1>
            <p className="text-muted-foreground">Thank you for taking this time for yourself.</p>
            <p className="text-lg">
              Your wellbeing score:{" "}
              <span className="font-mono font-semibold">
                {Number(result.wellbeing_pct).toFixed(1)}%
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              This is a screening, not a medical diagnosis.
            </p>
          </div>
        )}
      </Card>
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
