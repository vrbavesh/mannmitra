export type ScreeningDraft = { answers: (number | null)[]; safety: number | null; step: number };

export function parseDraft(raw: string | null): ScreeningDraft | null {
  try {
    const d = JSON.parse(raw ?? "null");
    if (
      !d ||
      !Array.isArray(d.answers) ||
      d.answers.length !== 18 ||
      !d.answers.every(
        (v: unknown) => v === null || (Number.isInteger(v) && Number(v) >= 1 && Number(v) <= 6),
      ) ||
      !(d.safety === null || (Number.isInteger(d.safety) && d.safety >= 0 && d.safety <= 3)) ||
      !Number.isInteger(d.step) ||
      d.step < 0 ||
      d.step > 18
    )
      return null;
    return { answers: d.answers, safety: d.safety, step: d.step };
  } catch {
    return null;
  }
}
