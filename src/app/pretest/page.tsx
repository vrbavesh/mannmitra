import { RouteShell } from "@/components/RouteShell";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { pageClient } from "@/server/authClient";
import { SCORING_VERSION } from "@/lib/scoring/key";
import { PretestForm } from "./PretestForm";

async function Questionnaire() {
  const client = await pageClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect("/signin");
  if (!user.email_confirmed_at) redirect("/signup/verify");
  const latest = await client
    .from("screening_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("kind", "pre")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest.error) throw new Error("Check-in unavailable");
  // shortcut: draft lasts for this browser tab; add server drafts if cross-device resume is required.
  return (
    <PretestForm
      draftKey={`mm:pretest:${SCORING_VERSION}:${user.id}:${latest.data?.id ?? "first"}`}
    />
  );
}

export default function PretestPage() {
  return (
    <Suspense
      fallback={
        <RouteShell title="Your first check-in" description="Getting your check-in ready..." />
      }
    >
      <Questionnaire />
    </Suspense>
  );
}
