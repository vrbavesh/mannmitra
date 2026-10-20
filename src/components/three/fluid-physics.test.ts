import { describe, expect, it } from "vitest";
import { rubberBand, spring, stepSpring } from "./fluid-physics";

describe("the source HTML's fluid physics", () => {
  it.each([20, 30, 60, 144])(
    "smooths a sudden scroll target without overshooting at %i fps",
    (fps) => {
      const state = spring(0);
      state.t = 4;
      stepSpring(state, 1 / fps, 0.6, 1);
      expect(state.x).toBeGreaterThan(0);
      expect(state.x).toBeLessThan(2);
      for (let i = 0; i < fps * 2; i++) {
        const previous = state.x;
        stepSpring(state, 1 / fps, 0.6, 1);
        expect(state.x).toBeGreaterThanOrEqual(previous);
        expect(state.x).toBeLessThanOrEqual(4);
      }
      expect(state.x).toBeCloseTo(4, 4);
    },
  );

  it("preserves release velocity, then settles back home", () => {
    const state = spring(1);
    state.t = 0;
    state.v = 5;
    stepSpring(state, 1 / 60, 0.5, 0.8);
    expect(state.x).toBeGreaterThan(1);
    for (let i = 0; i < 180; i++) stepSpring(state, 1 / 60, 0.5, 0.8);
    expect(state.x).toBeCloseTo(0, 6);
    expect(state.v).toBeCloseTo(0, 6);
  });

  it("tracks small drags directly and resists large drags symmetrically", () => {
    expect(rubberBand(0.5)).toBe(0.5);
    expect(rubberBand(1)).toBe(1);
    expect(rubberBand(1.001)).toBeCloseTo(1, 2);
    expect(rubberBand(8)).toBeGreaterThan(1);
    expect(rubberBand(8)).toBeLessThan(2.2);
    expect(rubberBand(-8)).toBe(-rubberBand(8));
  });
});
