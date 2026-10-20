import { describe, expect, it } from "vitest";
import { parseDraft } from "./screeningDraft";

describe("screening draft resume", () => {
  it("preserves a selected safety zero instead of treating it as missing", () => {
    const draft = { answers: Array(18).fill(3), safety: 0, step: 18 };
    expect(parseDraft(JSON.stringify(draft))).toEqual(draft);
  });
  it.each([
    null,
    "bad json",
    JSON.stringify({ answers: [3], safety: 0, step: 0 }),
    JSON.stringify({ answers: Array(18).fill(7), safety: null, step: 0 }),
    JSON.stringify({ answers: Array(18).fill(null), safety: null, step: 19 }),
  ])("ignores malformed saved data", (raw) => {
    expect(parseDraft(raw)).toBeNull();
  });
});
