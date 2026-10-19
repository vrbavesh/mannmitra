import { describe, expect, it } from "vitest";
import { deriveStage, routeForStage, type Screening, type Program } from "./stage";

const today = "2026-10-19";
const profile = { onboardingCompleted: true, timezone: "Asia/Kolkata" };
const clear: Screening = { kind: "pre", severity: "mild", safetyAnswer: 0, completedAt: "2026-10-01T10:00:00Z" };
const severe: Screening = { ...clear, severity: "severe", completedAt: "2026-10-10T10:00:00Z" };
const active: Program = { status: "active", startDate: "2026-10-01", postSessionId: null };

describe("deriveStage", () => {
  it.each([
    ["unverified", false, profile, [clear], active],
    ["needs_onboarding", true, { ...profile, onboardingCompleted: false }, [clear], active],
    ["needs_pretest", true, profile, [], null],
    ["blocked", true, profile, [severe], null],
    ["awaiting_start", true, profile, [clear], null],
    ["active", true, profile, [clear], active],
    ["needs_posttest", true, profile, [clear], { ...active, startDate: "2026-09-20" }],
    ["completed", true, profile, [clear], { ...active, status: "completed", postSessionId: "post-id" }],
  ] as const)("derives %s", (stage, verified, userProfile, screenings, program) => {
    expect(deriveStage(verified, userProfile, screenings, program, today)).toBe(stage);
  });

  it("blocks a safety answer even when severity is mild", () => {
    expect(deriveStage(true, profile, [{ ...severe, severity: "mild", safetyAnswer: 1 }], null, today)).toBe("blocked");
  });

  it("does not treat an unscored screening as a cleared risk gate", () => {
    expect(deriveStage(true, profile, [{ ...clear, severity: null }], null, today)).toBe("needs_pretest");
  });

  it("uses the profile time zone when deciding the retake day", () => {
    const midnightInIndia: Screening = { ...severe, completedAt: "2026-10-04T19:00:00Z" };
    expect(deriveStage(true, profile, [midnightInIndia], null, "2026-10-18")).toBe("blocked");
    expect(deriveStage(true, profile, [midnightInIndia], null, "2026-10-19")).toBe("needs_pretest");
  });

  it("opens the retake on local day 14 and uses the newest pretest afterwards", () => {
    const blocked: Screening = { ...severe, completedAt: "2026-10-05T10:00:00Z" };
    expect(deriveStage(true, profile, [blocked], null, "2026-10-18")).toBe("blocked");
    expect(deriveStage(true, profile, [blocked], null, today)).toBe("needs_pretest");
    expect(deriveStage(true, profile, [blocked, { ...clear, completedAt: "2026-10-19T10:00:00Z" }], null, today)).toBe("awaiting_start");
  });

  it("keeps day 29 active and opens posttest on day 30", () => {
    expect(deriveStage(true, profile, [clear], { ...active, startDate: "2026-09-21" }, today)).toBe("active");
    expect(deriveStage(true, profile, [clear], { ...active, startDate: "2026-09-20" }, today)).toBe("needs_posttest");
  });
});

describe("routeForStage", () => {
  const protectedPaths = [
    "/onboarding", "/pretest", "/pretest/result", "/home", "/program",
    "/program/day/1", "/progress", "/posttest", "/report/program-id", "/settings",
  ];
  const allowedPaths = {
    unverified: [],
    needs_onboarding: ["/onboarding"],
    needs_pretest: ["/pretest"],
    blocked: ["/pretest/result", "/settings"],
    awaiting_start: ["/pretest/result", "/settings"],
    active: ["/home", "/program", "/program/day/1", "/progress", "/settings"],
    needs_posttest: ["/posttest"],
    completed: ["/home", "/report/program-id", "/settings"],
  } as const;

  it.each(Object.entries(allowedPaths) as [keyof typeof allowedPaths, readonly string[]][])(
    "enforces every protected route for %s",
    (stage, allowed) => {
      for (const path of protectedPaths) {
        expect(routeForStage(stage, path) === null, path).toBe(allowed.includes(path));
      }
    },
  );

  const cases = [
    ["unverified", "/signup/verify", "/home"],
    ["needs_onboarding", "/onboarding", "/pretest"],
    ["needs_pretest", "/pretest", "/home"],
    ["blocked", "/pretest/result", "/pretest"],
    ["awaiting_start", "/pretest/result", "/program"],
    ["active", "/program/day/12", "/posttest"],
    ["needs_posttest", "/posttest", "/program"],
    ["completed", "/report/program-id", "/posttest"],
  ] as const;

  it.each(cases)("allows %s at %s and redirects %s", (stage, allowed, denied) => {
    expect(routeForStage(stage, allowed)).toBeNull();
    expect(routeForStage(stage, denied)).not.toBeNull();
  });

  it("keeps public routes available to unverified users", () => {
    for (const path of ["/", "/crisis", "/privacy", "/terms", "/signin", "/signup", "/forgot-password"]) {
      expect(routeForStage("unverified", path)).toBeNull();
    }
    expect(routeForStage("unverified", "/home")).toBe("/signup/verify");
  });

  it("does not interfere with unknown routes so Next.js can show 404", () => {
    expect(routeForStage("active", "/does-not-exist")).toBeNull();
  });
});
