import { describe, expect, it } from "vitest";
import { computeScores, severityForDistress } from "./computeScores";

describe("provisional screening scoring", () => {
  it("scores the blueprint's independently worked all-three fixture", () => {
    expect(computeScores(Array(18).fill(3), 0)).toEqual({
      total_score: 62,
      wellbeing_pct: 48.9,
      distress_pct: 51.1,
      areas: { anxiety_pct: 53.3, depression_pct: 51.1, negmood_pct: 53.3 },
      severity: "moderate",
      risk: { triggered: false, reason: null },
    });
  });

  it("reaches both endpoints with independently listed raw fixtures", () => {
    const minimum = [6, 1, 6, 1, 6, 1, 6, 6, 1, 6, 1, 1, 6, 1, 6, 1, 1, 1];
    const maximum = [1, 6, 1, 6, 1, 6, 1, 1, 6, 1, 6, 6, 1, 6, 1, 6, 6, 6];
    expect(computeScores(minimum, 0)).toMatchObject({
      total_score: 18,
      wellbeing_pct: 0,
      distress_pct: 100,
      severity: "severe",
      risk: { triggered: true, reason: "severe_score" },
    });
    expect(computeScores(maximum, 0)).toMatchObject({
      total_score: 108,
      wellbeing_pct: 100,
      distress_pct: 0,
      areas: { anxiety_pct: 0, depression_pct: 0, negmood_pct: 0 },
      severity: "minimal",
    });
  });

  it.each([
    [29, "minimal"],
    [30, "mild"],
    [49, "mild"],
    [50, "moderate"],
    [69, "moderate"],
    [70, "severe"],
  ] as const)("bands distress %s as %s", (distress, severity) => {
    expect(severityForDistress(distress)).toBe(severity);
  });

  it.each([1, 2, 3])("gates safety answer %s despite the best possible score", (safety) => {
    expect(
      computeScores([1, 6, 1, 6, 1, 6, 1, 1, 6, 1, 6, 6, 1, 6, 1, 6, 6, 6], safety),
    ).toMatchObject({ severity: "minimal", risk: { triggered: true, reason: "safety_answer" } });
  });

  it("rejects malformed values instead of producing a score", () => {
    const sparse = Array(18).fill(3);
    delete sparse[0];
    expect(() => computeScores(sparse, 0)).toThrow();
    expect(() => computeScores(Array(17).fill(3), 0)).toThrow();
    expect(() => computeScores([...Array(17).fill(3), 2.5], 0)).toThrow();
    expect(() => computeScores(Array(18).fill(3), -1)).toThrow();
  });
});
