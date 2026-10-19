import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveStage, localDate, type Program, type Screening, type Stage } from "@/lib/stage";
import { errors } from "@/server/errors";

export async function userStage(client: SupabaseClient, userId: string): Promise<Stage> {
  const [profileResult, preResult, programResult] = await Promise.all([
    client.from("profiles").select("onboarding_completed,timezone").eq("id", userId).maybeSingle(),
    client
      .from("screening_sessions")
      .select("kind,severity,safety_answer,completed_at")
      .eq("user_id", userId)
      .eq("kind", "pre")
      .order("completed_at", { ascending: false })
      .limit(1),
    client
      .from("programs")
      .select("status,start_date,post_session_id")
      .eq("user_id", userId)
      .in("status", ["active", "completed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const profile = profileResult.data;
  if (profileResult.error || preResult.error || programResult.error || !profile)
    throw errors.internal();

  const screenings: Screening[] = (preResult.data ?? []).map((row) => ({
    kind: row.kind,
    severity: row.severity,
    safetyAnswer: row.safety_answer,
    completedAt: row.completed_at,
  }));
  const row = programResult.data;
  const program: Program | null = row
    ? { status: row.status, startDate: row.start_date, postSessionId: row.post_session_id }
    : null;
  return deriveStage(
    true,
    { onboardingCompleted: profile.onboarding_completed, timezone: profile.timezone },
    screenings,
    program,
    localDate(new Date(), profile.timezone),
  );
}
