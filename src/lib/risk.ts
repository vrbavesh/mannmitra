import "server-only";
import type { components } from "@/generated/api";

export function deriveGate(
  safetyAnswer: number,
  severity: components["schemas"]["Severity"],
  screeningDay: string,
) {
  const showSupport = safetyAnswer > 0 || severity === "severe";
  const retake = new Date(`${screeningDay}T00:00:00Z`);
  retake.setUTCDate(retake.getUTCDate() + 14);
  return {
    showSupport,
    allowProgram: !showSupport,
    retakeAt: showSupport ? retake.toISOString().slice(0, 10) : null,
  };
}
