import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { unlockAt } from "@/lib/engine/dayState";

/**
 * Cheap pre-render guard for `/program/day/[n]`: a forged future day returns
 * 403 before React starts streaming. The page repeats the check with the full
 * derived state, this only guarantees the HTTP status.
 */
export async function isFutureProgramDay(
  client: SupabaseClient,
  userId: string,
  dayNo: number,
  now: Date = new Date(),
): Promise<boolean> {
  const [profile, program] = await Promise.all([
    client.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
    client
      .from("programs")
      .select("start_date")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle(),
  ]);
  if (profile.error || program.error) throw new Error("day_gate_unavailable");
  if (!profile.data || !program.data) return false;
  return now.getTime() < unlockAt(program.data.start_date, dayNo, profile.data.timezone).getTime();
}
