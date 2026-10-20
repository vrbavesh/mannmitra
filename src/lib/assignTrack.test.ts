import { expect, it } from "vitest";
import { assignTrack } from "./assignTrack";

it("selects highest distress and an inclusive ten-point bonus", () => {
  expect(assignTrack({ anxiety_pct: 70, depression_pct: 60, negmood_pct: 20 })).toEqual({
    track: "anxiety",
    bonus: "depression",
  });
  expect(assignTrack({ anxiety_pct: 59.9, depression_pct: 70, negmood_pct: 20 })).toEqual({
    track: "depression",
    bonus: null,
  });
  expect(assignTrack({ anxiety_pct: 10, depression_pct: 20, negmood_pct: 85 })).toEqual({
    track: "negative_thinking",
    bonus: null,
  });
});
it("resolves ties consistently with the database: anxiety, depression, negative thinking", () => {
  expect(assignTrack({ anxiety_pct: 50, depression_pct: 50, negmood_pct: 50 })).toEqual({
    track: "anxiety",
    bonus: "depression",
  });
  expect(assignTrack({ anxiety_pct: 10, depression_pct: 50, negmood_pct: 50 })).toEqual({
    track: "depression",
    bonus: "negative_thinking",
  });
});
