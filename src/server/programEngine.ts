import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Completion } from "@/lib/engine/dayState";
import { localDate } from "@/lib/stage";
import { errors } from "@/server/errors";

export type Track = "anxiety" | "depression" | "negative_thinking";

export type ProgramRow = {
  id: string;
  track: Track;
  start_date: string;
  status: "active" | "completed" | "abandoned";
  post_session_id: string | null;
};

export type CompletionRow = {
  day_no: number;
  status: string;
  mood_before: number | null;
  mood_after: number | null;
  payload: Record<string, unknown>;
  completed_at: string | null;
};

/** Map a database row to the engine's camelCase input. */
export function toEngineCompletion(row: CompletionRow): Completion {
  return { dayNo: row.day_no, completedAt: row.completed_at };
}

export type TaskTemplate = {
  day_no: number;
  title: string;
  description: string | null;
  example_text: string | null;
  component: string;
  duration_min: number | null;
  config: Record<string, unknown>;
};

export type ProgramContext = {
  displayName: string;
  timezone: string;
  today: string;
  program: ProgramRow | null;
  completions: CompletionRow[];
};

/** Owner-scoped reads for the program screens (RLS keeps every row private). */
export async function loadProgramContext(
  client: SupabaseClient,
  userId: string,
): Promise<ProgramContext> {
  const [profileResult, programResult] = await Promise.all([
    client
      .from("profiles")
      .select("display_name,timezone,onboarding_completed")
      .eq("id", userId)
      .maybeSingle(),
    client
      .from("programs")
      .select("id,track,start_date,status,post_session_id")
      .eq("user_id", userId)
      .in("status", ["active", "completed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (profileResult.error || programResult.error || !profileResult.data) throw errors.internal();

  const row = programResult.data;
  const program: ProgramRow | null = row
    ? {
        id: row.id,
        track: row.track as Track,
        start_date: row.start_date,
        status: row.status,
        post_session_id: row.post_session_id,
      }
    : null;

  let completions: CompletionRow[] = [];
  if (program) {
    const result = await client
      .from("task_completions")
      .select("day_no,status,mood_before,mood_after,payload,completed_at")
      .eq("user_id", userId)
      .eq("program_id", program.id)
      .order("day_no", { ascending: true });
    if (result.error) throw errors.internal();
    completions = result.data ?? [];
  }

  return {
    displayName: profileResult.data.display_name ?? "",
    timezone: profileResult.data.timezone,
    today: localDate(new Date(), profileResult.data.timezone),
    program,
    completions,
  };
}

export async function loadTaskTemplate(
  client: SupabaseClient,
  track: Track,
  dayNo: number,
): Promise<TaskTemplate | null> {
  const { data, error } = await client
    .from("task_templates")
    .select("day_no,title,description,example_text,component,duration_min,config")
    .eq("track", track)
    .eq("day_no", dayNo)
    .maybeSingle();
  if (error) throw errors.internal();
  return data ? { ...data, config: (data.config ?? {}) as Record<string, unknown> } : null;
}

export async function loadCompletion(
  client: SupabaseClient,
  userId: string,
  programId: string,
  dayNo: number,
): Promise<CompletionRow | null> {
  const { data, error } = await client
    .from("task_completions")
    .select("day_no,status,mood_before,mood_after,payload,completed_at")
    .eq("user_id", userId)
    .eq("program_id", programId)
    .eq("day_no", dayNo)
    .maybeSingle();
  if (error) throw errors.internal();
  return data;
}

export async function loadTodayMood(
  client: SupabaseClient,
  userId: string,
  today: string,
): Promise<number | null> {
  const { data, error } = await client
    .from("mood_entries")
    .select("mood")
    .eq("user_id", userId)
    .eq("entry_date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw errors.internal();
  return data?.mood ?? null;
}

/**
 * Lazily create the first row for a day that is being opened. The SQL function
 * re-checks ownership, the active program and the future-day guard.
 */
export async function openProgramDay(
  admin: SupabaseClient,
  userId: string,
  dayNo: number,
): Promise<{
  row: { day_no: number; status: string; completed_at: string | null } | null;
  error: string | null;
}> {
  const { data, error } = await admin.rpc("open_program_day", {
    p_user_id: userId,
    p_day: dayNo,
  });
  if (error || !data) return { row: null, error: error?.message ?? "program_unavailable" };
  return { row: data, error: null };
}

/**
 * Write the derived status back to the cached column. Reads always use the
 * engine, so a failed reconcile is logged and never blocks the screen.
 */
export async function reconcileDayStatus(
  admin: SupabaseClient,
  userId: string,
  programId: string,
  dayNo: number,
  status: string,
): Promise<void> {
  if (status === "locked") return;
  const { error } = await admin
    .from("task_completions")
    .update({ status })
    .eq("user_id", userId)
    .eq("program_id", programId)
    .eq("day_no", dayNo)
    .neq("status", "done");
  if (error) console.error("[engine] task status reconcile failed", error.code);
}
