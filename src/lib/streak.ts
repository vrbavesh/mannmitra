// Temporary gentle-streak helper for Step 12's home screen.
// Step 15 owns the real lib/streak.ts (one grace day per week, shaming-free
// copy) and must replace this file. Do not extend it here.
import { addDays } from "@/lib/engine/dayState";

/**
 * Count back from today (or yesterday, so the day is never marked broken
 * before it ends) across consecutive local dates with a completed practice.
 */
export function gentleStreak(localDates: readonly string[], today: string): number {
  const days = new Set(localDates);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
