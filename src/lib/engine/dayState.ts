/**
 * Thirty-day program engine (spec §7).
 *
 * Derived state is authoritative for reads: `dayStatus()` decides
 * locked/available/done/missed at read time. The stored `task_completions.status`
 * column is only a lazily reconciled cache and never overrides derivation.
 *
 * Every calendar decision happens in the profile timezone. The database's UTC
 * `current_date` is never used (blueprint deviation #7).
 */
import { localDate } from "@/lib/stage";

export const PROGRAM_DAYS = 30;
/** Day 30 is the post-test; task templates only exist for days 1 to 29. */
export const LAST_TASK_DAY = 29;
/** A missed practice stays open for 48 hours from its local-midnight unlock. */
export const CATCH_UP_HOURS = 48;
/** Seven or more days without a completed practice shows the welcome-back state. */
export const WELCOME_BACK_DAYS = 7;

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

export type DayStatus = "locked" | "available" | "done" | "missed";

export type Completion = {
  dayNo: number;
  /** Authoritative done marker. A stale `status` string is ignored on purpose. */
  completedAt: string | null;
  status?: string;
};

export type DayState = {
  dayNo: number;
  status: DayStatus;
  /** Local midnight when this day opened (or will open), as an instant. */
  unlockAt: Date;
};

/** Today's calendar date in the user's timezone. */
export function todayIn(timezone: string, now: Date = new Date()): string {
  return localDate(now, timezone);
}

/** Plain-date arithmetic on `YYYY-MM-DD` strings (timezone independent). */
export function addDays(date: string, days: number): string {
  const instant = new Date(`${date}T00:00:00.000Z`);
  instant.setUTCDate(instant.getUTCDate() + days);
  return instant.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`; both are plain dates. */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / MS_PER_DAY,
  );
}

/** Offset of a timezone at a given instant, in milliseconds east of UTC. */
function zoneOffsetMs(instant: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The UTC instant of local midnight for a plain date in a timezone. */
export function zonedMidnight(date: string, timezone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const utcGuess = Date.UTC(year, month - 1, day);
  const offset = zoneOffsetMs(new Date(utcGuess), timezone);
  let instant = utcGuess - offset;
  // One correction handles DST transitions; a second pass settles offset changes
  // at local midnight (for example New York's fall-back night).
  const corrected = zoneOffsetMs(new Date(instant), timezone);
  if (corrected !== offset) instant = utcGuess - corrected;
  return new Date(instant);
}

/** Local midnight of `start_date + (day - 1)`. */
export function unlockAt(startDate: string, dayNo: number, timezone: string): Date {
  const bounded = Math.min(PROGRAM_DAYS, Math.max(1, Math.trunc(dayNo)));
  return zonedMidnight(addDays(startDate, bounded - 1), timezone);
}

/** Current program day, clamped to 1..30. Before the start it is day 1. */
export function programDay(startDate: string, today: string): number {
  return Math.min(PROGRAM_DAYS, Math.max(1, daysBetween(startDate, today) + 1));
}

export function isRestDay(dayNo: number): boolean {
  return dayNo % 2 === 0 && dayNo < PROGRAM_DAYS;
}

export function durationLabel(dayNo: number): string {
  return isRestDay(dayNo) ? "1 to 3 minutes" : "10 to 15 minutes";
}

/**
 * Derive one day's state. Time-window rules:
 * - before the day's local midnight: locked
 * - after completion: done (only `completedAt` proves completion)
 * - up to 48 hours after unlock: available
 * - later: missed
 * - day 30 is the post-test and never becomes "missed".
 */
export function dayStatus({
  startDate,
  dayNo,
  completion,
  timezone,
  now = new Date(),
  postTestDone = false,
}: {
  startDate: string;
  dayNo: number;
  completion?: Completion;
  timezone: string;
  now?: Date;
  postTestDone?: boolean;
}): DayState {
  const unlock = unlockAt(startDate, dayNo, timezone);
  const state = (status: DayStatus): DayState => ({ dayNo, status, unlockAt: unlock });

  if (dayNo === PROGRAM_DAYS) {
    if (postTestDone) return state("done");
    return state(now.getTime() >= unlock.getTime() ? "available" : "locked");
  }
  if (completion?.completedAt) return state("done");
  if (now.getTime() < unlock.getTime()) return state("locked");
  if (now.getTime() < unlock.getTime() + CATCH_UP_HOURS * MS_PER_HOUR) return state("available");
  return state("missed");
}

export function dayStates({
  startDate,
  completions,
  timezone,
  now = new Date(),
  postTestDone = false,
}: {
  startDate: string;
  completions: readonly Completion[];
  timezone: string;
  now?: Date;
  postTestDone?: boolean;
}): DayState[] {
  const byDay = new Map(completions.map((completion) => [completion.dayNo, completion]));
  return Array.from({ length: PROGRAM_DAYS }, (_, index) =>
    dayStatus({
      startDate,
      dayNo: index + 1,
      completion: byDay.get(index + 1),
      timezone,
      now,
      postTestDone,
    }),
  );
}

/** The next day whose local midnight has not passed yet. */
export function nextUnlock({
  startDate,
  timezone,
  now = new Date(),
}: {
  startDate: string;
  timezone: string;
  now?: Date;
}): { dayNo: number; unlockAt: Date } | null {
  for (let dayNo = 1; dayNo <= PROGRAM_DAYS; dayNo += 1) {
    const at = unlockAt(startDate, dayNo, timezone);
    if (at.getTime() > now.getTime()) return { dayNo, unlockAt: at };
  }
  return null;
}

/** Seven or more days without a completed practice (friendly, never a penalty). */
export function isWelcomeBack({
  startDate,
  today,
  completions,
  timezone,
}: {
  startDate: string;
  today: string;
  completions: readonly Completion[];
  timezone: string;
}): boolean {
  const lastCompleted = completions
    .filter((completion) => completion.completedAt)
    .map((completion) => localDate(new Date(completion.completedAt as string), timezone))
    .sort()
    .at(-1);
  const lastActive = lastCompleted && lastCompleted > startDate ? lastCompleted : startDate;
  return daysBetween(lastActive, today) >= WELCOME_BACK_DAYS;
}
