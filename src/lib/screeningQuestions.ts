// Wording follows the supplied specification; the clinical/content launch review remains required.
export const screeningQuestions = [
  "Your daily life felt interesting.",
  "You felt depressed.",
  "You felt loved and wanted.",
  "You felt very nervous.",
  "You felt in firm control of your behavior and emotions.",
  "You felt tense or high-strung.",
  "You felt calm and peaceful.",
  "You felt emotionally stable.",
  "You felt downhearted and blue.",
  "You were able to relax.",
  "You felt restless or fidgety.",
  "You felt moody or brooded about things.",
  "You felt cheerful.",
  "You felt in low spirits.",
  "You felt happy.",
  "You felt you had nothing to look forward to.",
  "You felt so down that nothing could cheer you up.",
  "You felt anxious or worried.",
] as const;
export const frequencyAnswers = [
  "All of the time",
  "Most of the time",
  "A good bit of the time",
  "Some of the time",
  "A little bit of the time",
  "None of the time",
] as const;
export const safetyQuestion =
  "Over the last 2 weeks, how often have you had thoughts that you would be better off dead, or of hurting yourself?";
export const safetyAnswers = [
  "Not at all",
  "Several days",
  "More than half the days",
  "Nearly every day",
] as const;
