/** Human-readable times in the profile timezone (never the server's clock zone). */
export function formatLocalDateTime(instant: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(instant);
}

export function formatLocalDay(instant: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
  }).format(instant);
}

export function formatLocalTime(instant: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(instant);
}

export function formatTimeSpent(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} minutes` : `${minutes} min ${rest} s`;
}
