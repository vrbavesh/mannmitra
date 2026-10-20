import { describe, expect, it } from "vitest";
import { deriveGate } from "./risk";

describe("screening support gate", () => {
  it.each(["minimal", "mild", "moderate"] as const)(
    "allows %s without a safety response",
    (severity) => {
      expect(deriveGate(0, severity, "2026-10-20")).toEqual({
        showSupport: false,
        allowProgram: true,
        retakeAt: null,
      });
    },
  );
  it.each([1, 2, 3])("blocks safety %s even with minimal distress", (safety) => {
    expect(deriveGate(safety, "minimal", "2026-12-25")).toEqual({
      showSupport: true,
      allowProgram: false,
      retakeAt: "2027-01-08",
    });
  });
  it("blocks severe distress with safety zero", () => {
    expect(deriveGate(0, "severe", "2026-10-20")).toEqual({
      showSupport: true,
      allowProgram: false,
      retakeAt: "2026-11-03",
    });
  });
});
