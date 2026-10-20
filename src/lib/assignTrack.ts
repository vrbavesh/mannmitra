import "server-only";
import type { components } from "@/generated/api";

type Track = components["schemas"]["Track"];
type Areas = components["schemas"]["ScreeningSubmitResponse"]["result"]["areas"];

export function assignTrack(areas: Areas) {
  // Stable tie order also used by the transactional program writer.
  const ranked: [Track, number][] = [
    ["anxiety", areas.anxiety_pct],
    ["depression", areas.depression_pct],
    ["negative_thinking", areas.negmood_pct],
  ];
  ranked.sort((a, b) => b[1] - a[1]);
  return { track: ranked[0][0], bonus: ranked[0][1] - ranked[1][1] <= 10 ? ranked[1][0] : null };
}
