import "server-only";
import type { components } from "@/generated/api";
import { AREAS, POSITIVE_ITEMS, SEVERITY_BANDS } from "./key";

export function severityForDistress(distress: number) {
  if (!Number.isFinite(distress) || distress < 0 || distress > 100)
    throw new Error("Invalid distress percentage");
  return SEVERITY_BANDS.find((band) => distress < band.below)!.severity;
}

export function computeScores(answers: number[], safetyAnswer: number) {
  if (
    answers.length !== 18 ||
    Array.from(answers).some((v) => !Number.isInteger(v) || v < 1 || v > 6) ||
    !Number.isInteger(safetyAnswer) ||
    safetyAnswer < 0 ||
    safetyAnswer > 3
  )
    throw new Error("Invalid screening answers");
  const scores = answers.map((raw, i) =>
    (POSITIVE_ITEMS as readonly number[]).includes(i + 1) ? 7 - raw : raw,
  );
  const total = scores.reduce((sum, value) => sum + value, 0);
  const round = (value: number) => Math.round(value * 10) / 10;
  const distress = ((108 - total) / 90) * 100;
  const area = (items: readonly number[]) =>
    round(
      100 -
        ((items.reduce((sum, item) => sum + scores[item - 1], 0) - items.length) /
          (5 * items.length)) *
          100,
    );
  const severity = severityForDistress(distress);
  const reason = safetyAnswer > 0 ? "safety_answer" : severity === "severe" ? "severe_score" : null;
  const result: components["schemas"]["ScreeningSubmitResponse"]["result"] = {
    total_score: total,
    wellbeing_pct: round(((total - 18) / 90) * 100),
    distress_pct: round(distress),
    areas: {
      anxiety_pct: area(AREAS.anxiety_pct),
      depression_pct: area(AREAS.depression_pct),
      negmood_pct: area(AREAS.negmood_pct),
    },
    severity,
  };
  return { ...result, risk: { triggered: reason !== null, reason } };
}
