import { describe, expect, it } from "vitest";
import {
  addDays,
  dayStates,
  dayStatus,
  daysBetween,
  durationLabel,
  isRestDay,
  isWelcomeBack,
  nextUnlock,
  programDay,
  todayIn,
  unlockAt,
  zonedMidnight,
} from "./dayState";

const IST = "Asia/Kolkata";
const START = "2026-10-20";

describe("timezone-safe date math", () => {
  it("resolves local midnight instead of assuming UTC", () => {
    // IST is UTC+5:30, so 20 Oct 00:00 local is 19 Oct 18:30 UTC.
    expect(zonedMidnight("2026-10-20", IST).toISOString()).toBe("2026-10-19T18:30:00.000Z");
    expect(unlockAt(START, 1, IST).toISOString()).toBe("2026-10-19T18:30:00.000Z");
    expect(unlockAt(START, 2, IST).toISOString()).toBe("2026-10-20T18:30:00.000Z");
  });

  it("handles a UTC+14 zone", () => {
    expect(zonedMidnight("2026-10-20", "Pacific/Kiritimati").toISOString()).toBe(
      "2026-10-19T10:00:00.000Z",
    );
  });

  it("crosses a daylight-saving change", () => {
    // New York falls back on 1 Nov 2026: day 1 is EDT, day 2 is EST.
    expect(zonedMidnight("2026-11-01", "America/New_York").toISOString()).toBe(
      "2026-11-01T04:00:00.000Z",
    );
    expect(zonedMidnight("2026-11-02", "America/New_York").toISOString()).toBe(
      "2026-11-02T05:00:00.000Z",
    );
  });

  it("maps an instant to the user's calendar date (IST after midnight)", () => {
    // 20 Oct 00:30 IST is still 19 Oct 19:00 UTC.
    expect(todayIn(IST, new Date("2026-10-19T19:00:00.000Z"))).toBe("2026-10-20");
    expect(todayIn("UTC", new Date("2026-10-19T19:00:00.000Z"))).toBe("2026-10-19");
  });

  it("does plain-date arithmetic and day differences", () => {
    expect(addDays("2026-10-20", 9)).toBe("2026-10-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-10-20", "2026-10-27")).toBe(7);
    expect(daysBetween("2026-10-27", "2026-10-20")).toBe(-7);
  });
});

describe("program day and day labels", () => {
  it("clamps the current day to 1..30", () => {
    expect(programDay(START, "2026-10-19")).toBe(1);
    expect(programDay(START, "2026-10-20")).toBe(1);
    expect(programDay(START, "2026-10-26")).toBe(7);
    expect(programDay(START, "2026-12-30")).toBe(30);
  });

  it("marks even days as shorter rest days", () => {
    expect(isRestDay(2)).toBe(true);
    expect(isRestDay(28)).toBe(true);
    expect(isRestDay(30)).toBe(false);
    expect(isRestDay(1)).toBe(false);
    expect(durationLabel(1)).toBe("10 to 15 minutes");
    expect(durationLabel(2)).toBe("1 to 3 minutes");
  });
});

describe("dayStatus", () => {
  const at = (iso: string) => new Date(iso);

  it("locks a day until its local midnight", () => {
    const now = at("2026-10-20T18:29:59.000Z");
    expect(dayStatus({ startDate: START, dayNo: 2, timezone: IST, now }).status).toBe("locked");
    expect(
      dayStatus({ startDate: START, dayNo: 2, timezone: IST, now: at("2026-10-20T18:30:00.000Z") })
        .status,
    ).toBe("available");
  });

  it("stays available for exactly 48 hours, then becomes missed", () => {
    const unlock = at("2026-10-19T18:30:00.000Z");
    expect(
      dayStatus({
        startDate: START,
        dayNo: 1,
        timezone: IST,
        now: new Date(unlock.getTime() + 48 * 3_600_000 - 1),
      }).status,
    ).toBe("available");
    expect(
      dayStatus({
        startDate: START,
        dayNo: 1,
        timezone: IST,
        now: new Date(unlock.getTime() + 48 * 3_600_000),
      }).status,
    ).toBe("missed");
  });

  it("keeps day 30 open as the post-test without a missed window", () => {
    const unlock = at("2026-11-18T18:30:00.000Z");
    expect(dayStatus({ startDate: START, dayNo: 30, timezone: IST, now: unlock }).status).toBe(
      "available",
    );
    expect(
      dayStatus({
        startDate: START,
        dayNo: 30,
        timezone: IST,
        now: new Date(unlock.getTime() + 30 * 24 * 3_600_000),
      }).status,
    ).toBe("available");
    expect(
      dayStatus({
        startDate: START,
        dayNo: 30,
        timezone: IST,
        now: new Date(unlock.getTime() + 3_600_000),
        postTestDone: true,
      }).status,
    ).toBe("done");
  });

  it("trusts completed_at and ignores a stale stored status", () => {
    const completion = { dayNo: 1, completedAt: null, status: "done" };
    expect(
      dayStatus({
        startDate: START,
        dayNo: 1,
        completion,
        timezone: IST,
        now: at("2026-10-20T19:00:00.000Z"),
      }).status,
    ).toBe("available");
    expect(
      dayStatus({
        startDate: START,
        dayNo: 1,
        completion: { dayNo: 1, completedAt: "2026-10-20T05:00:00.000Z", status: "locked" },
        timezone: IST,
        now: at("2026-10-20T19:00:00.000Z"),
      }).status,
    ).toBe("done");
  });

  it("derives all thirty tiles and the next unlock", () => {
    const states = dayStates({
      startDate: START,
      completions: [{ dayNo: 1, completedAt: "2026-10-20T05:00:00.000Z" }],
      timezone: IST,
      now: at("2026-10-20T19:00:00.000Z"),
    });
    expect(states).toHaveLength(30);
    expect(states[0].status).toBe("done");
    expect(states[1].status).toBe("available");
    expect(states[2].status).toBe("locked");
    expect(states[29].status).toBe("locked");

    const next = nextUnlock({ startDate: START, timezone: IST, now: at("2026-10-20T19:00:00Z") });
    expect(next?.dayNo).toBe(3);
    expect(next?.unlockAt.toISOString()).toBe("2026-10-21T18:30:00.000Z");
    expect(
      nextUnlock({ startDate: START, timezone: IST, now: at("2026-12-30T00:00:00Z") }),
    ).toBeNull();
  });
});

describe("welcome-back state", () => {
  it("starts after seven quiet days and never for recent activity", () => {
    const base = { startDate: START, timezone: IST };
    expect(
      isWelcomeBack({
        ...base,
        today: "2026-10-27",
        completions: [],
      }),
    ).toBe(true);
    expect(
      isWelcomeBack({
        ...base,
        today: "2026-10-26",
        completions: [],
      }),
    ).toBe(false);
    expect(
      isWelcomeBack({
        ...base,
        today: "2026-10-27",
        completions: [{ dayNo: 1, completedAt: "2026-10-25T05:00:00.000Z" }],
      }),
    ).toBe(false);
    expect(
      isWelcomeBack({
        ...base,
        today: "2026-10-27",
        completions: [{ dayNo: 1, completedAt: "2026-10-18T05:00:00.000Z" }],
      }),
    ).toBe(true);
  });
});
