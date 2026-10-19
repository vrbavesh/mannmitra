export type Stage =
  | "unverified"
  | "needs_onboarding"
  | "needs_pretest"
  | "blocked"
  | "awaiting_start"
  | "active"
  | "needs_posttest"
  | "completed";

export type Profile = { onboardingCompleted: boolean; timezone: string };
export type Screening = {
  kind: "pre" | "post";
  severity: "minimal" | "mild" | "moderate" | "severe" | null;
  safetyAnswer: number;
  completedAt: string;
};
export type Program = {
  status: "active" | "completed" | "abandoned";
  startDate: string;
  postSessionId: string | null;
};

export function localDate(instant: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function addDays(date: string, days: number): string {
  const instant = new Date(`${date}T00:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + days);
  return instant.toISOString().slice(0, 10);
}

export function deriveStage(
  verified: boolean,
  profile: Profile,
  screenings: readonly Screening[],
  program: Program | null,
  today: string,
): Stage {
  if (!verified) return "unverified";
  if (!profile.onboardingCompleted) return "needs_onboarding";

  const latestPre = screenings
    .filter((screening) => screening.kind === "pre")
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
  if (!latestPre || latestPre.severity === null) return "needs_pretest";

  if (latestPre.safetyAnswer > 0 || latestPre.severity === "severe") {
    const screeningDay = localDate(new Date(latestPre.completedAt), profile.timezone);
    return today < addDays(screeningDay, 14) ? "blocked" : "needs_pretest";
  }

  if (!program || program.status === "abandoned") return "awaiting_start";
  if (program.postSessionId) return "completed";
  if (today >= addDays(program.startDate, 29)) return "needs_posttest";
  return "active";
}

const destination: Record<Stage, string> = {
  unverified: "/signup/verify",
  needs_onboarding: "/onboarding",
  needs_pretest: "/pretest",
  blocked: "/pretest/result",
  awaiting_start: "/pretest/result",
  active: "/home",
  needs_posttest: "/posttest",
  completed: "/home",
};

export function pathForStage(stage: Stage): string {
  return destination[stage];
}

export function isPublicRoute(path: string): boolean {
  return [
    "/",
    "/crisis",
    "/privacy",
    "/terms",
    "/signin",
    "/signup",
    "/signup/verify",
    "/forgot-password",
    "/forgot-username",
  ].includes(path);
}

export function isAppRoute(path: string): boolean {
  return (
    [
      "/onboarding",
      "/pretest",
      "/pretest/result",
      "/home",
      "/program",
      "/progress",
      "/posttest",
      "/settings",
    ].includes(path) ||
    /^\/program\/day\/\d+$/.test(path) ||
    /^\/report\/[^/]+$/.test(path)
  );
}

export function routeForStage(stage: Stage, path: string): string | null {
  if (isPublicRoute(path) || !isAppRoute(path)) return null;
  const allowed =
    (stage === "needs_onboarding" && path === "/onboarding") ||
    (stage === "needs_pretest" && path === "/pretest") ||
    ((stage === "blocked" || stage === "awaiting_start") &&
      (path === "/pretest/result" || path === "/settings")) ||
    (stage === "active" &&
      (["/home", "/program", "/progress", "/settings"].includes(path) ||
        /^\/program\/day\/\d+$/.test(path))) ||
    (stage === "needs_posttest" && path === "/posttest") ||
    (stage === "completed" &&
      (["/home", "/settings"].includes(path) || /^\/report\/[^/]+$/.test(path)));
  return allowed ? null : destination[stage];
}
