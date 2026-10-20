import { describe, expect, it } from "vitest";
import { gentleStreak } from "./streak";

describe("temporary gentle streak (replaced in Step 15)", () => {
  it("counts consecutive days ending today", () => {
    expect(gentleStreak(["2026-10-20", "2026-10-19", "2026-10-18"], "2026-10-20")).toBe(3);
  });

  it("does not break the streak before today ends", () => {
    expect(gentleStreak(["2026-10-19", "2026-10-18"], "2026-10-20")).toBe(2);
  });

  it("returns zero after a full quiet day and ignores duplicates", () => {
    expect(gentleStreak(["2026-10-18"], "2026-10-20")).toBe(0);
    expect(gentleStreak([], "2026-10-20")).toBe(0);
    expect(gentleStreak(["2026-10-20", "2026-10-20"], "2026-10-20")).toBe(1);
  });
});
