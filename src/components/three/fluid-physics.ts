// Ported from plans/MannMitra – Fluid Glass.html: response in seconds, damping ratio.
export type Spring = { x: number; v: number; t: number };

export const spring = (value: number): Spring => ({ x: value, v: 0, t: value });

export function stepSpring(state: Spring, dt: number, response: number, damping: number) {
  const w = 6.2832 / response;
  const h = dt / 2;
  for (let i = 0; i < 2; i++) {
    state.v += (-w * w * (state.x - state.t) - 2 * damping * w * state.v) * h;
    state.x += state.v * h;
  }
}

export function rubberBand(offset: number) {
  const a = Math.abs(offset);
  const excess = Math.max(a - 1, 0);
  return Math.sign(offset) * (Math.min(a, 1) + (excess * 0.66) / (1.2 + 0.55 * excess));
}
