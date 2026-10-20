# Step 8: Fluid Glass landing verification

Date: 2026-10-20. Reference: the user's unchanged `plans/MannMitra – Fluid Glass.html`. Implementation: `src/app/(marketing)/page.tsx`, its CSS module, and `src/components/three/`.

## Delivered

- Preserved the mint field, system typography, glass navigation, spacious five-section sequence, account actions, fluid shader orb, flattened orbiting pebbles and spring-return mouse drag.
- Corrected the reference's program claims to the specification: screening assigns a track; odd days have main practices, even days have short activities, and day 30 is the final screening. Added privacy, terms and support links.
- Static artwork and content render before JavaScript. Reduced motion, data saving, limited device capability, failed initialization and lost WebGL retain a readable landing. Rendering pauses while hidden/offscreen. No scene dependencies or CDN scripts are added to authentication screens.
- Scope is documented in `docs/design/landing.md`, PRODUCT.md, DESIGN.md and `.impeccable/design.json`. The new mint surface does not change the existing application/auth palette.

## Required gate

Final `npm run verify` passed:

- ESLint and generated Next route types/TypeScript.
- Production build, including static `/`.
- **176 unit/contract tests across 20 files.** New lifecycle checks cover hidden/offscreen rendering, reduced-motion teardown, device limits and observer cleanup.
- **8 production browser checks.** Entry links reach signup/sign-in; existing auth control contrast remains correct; mobile navigation works; no-JavaScript content/navigation work; unavailable WebGL falls back; switching reduced motion unloads a running scene; real mouse drag captures/releases the pointer; lost WebGL restores the still; data saving avoids the canvas. Drag is part of the live reduced-motion check.

Desktop 1280×800 and mobile 375×812 were rendered with working software WebGL and compared against the reference. No page errors or horizontal overflow were recorded. The mobile preview deliberately shows all thirty days in a grid. Chromium full-page captures omit fixed background painting below the first viewport; individual hero/program viewport captures were used to verify the actual mint background.

## Performance

Lighthouse mobile navigation audit against the local production build, with normal enhanced rendering:

| Check                    | Result                           |
| ------------------------ | -------------------------------- |
| Largest contentful paint | **2.34s**, below the 2.5s target |
| Accessibility            | **100**                          |
| Best practices           | **100**                          |
| Performance              | **87**                           |
| Cumulative layout shift  | **0**                            |

See `step8-lighthouse.json` for exact values and emulation settings. The first run measured 2.73s. The optional renderer now waits for load/idle, the already-visible hero is not reanimated after hydration, the reveal uses Motion's small native-animation entry, and unused application fonts are no longer globally preloaded on the system-font landing. Existing app font declarations and swap behavior remain in place. This is a local lab measurement, not production field data.

## Reviews

**Ponytail change review: Ship.** Connected callers, static navigation, new dependencies, fallback/lifecycle logic, pointer cleanup, source styling and the shared CSS loader/font settings were reviewed. The production checks caught and now guard the CSS module failure caused by the pre-existing blanket Tailwind loader rule. No auth contract or database change was required.

**Impeccable mechanical detector:** one run, zero findings. Independent finish review first requested restoration of companion shape and orbit; a verdict pass requested removing their extra X/Z rotations and matching source brightness. Final verdict: **ship for the scored companion fixes**, no direct regressions. The reviewer assessed captures and source; runtime interactions were exercised separately by the browser gate.

**Design preflight:** applicable checks passed for responsive composition, readable copy, visible account actions, keyboard focus, one light theme, authentic program preview, purposeful motion, and loading/error/reduced-motion fallbacks. The user's source controls typography, headline wrapping and compact navigation; no invented imagery, metrics, testimonials, hamburger or additional design system was introduced.

**Wave B Ponytail audit:** completed in `plans/audits/wave-b-ponytail-audit.md`. No additional must-fix finding was confirmed in the connected auth code reviewed. Existing launch restrictions remain recorded in HANDOFF.md.

## Evidence

These are screenshots of the local production implementation, captured with Playwright Chromium on the date above. They are verification evidence, not artwork delivered to the runtime.

- `step8-fluid-glass-desktop.jpg`: 1280×800, enhanced scene.
- `step8-fluid-glass-mobile.jpg`: 375×812, enhanced scene.
- `step8-fluid-glass-fallback.jpg`: 375×812, actual reduced-motion emulation, no canvas. The media query and absence of canvas were asserted before capture.

No generated/downloaded raster art ships. Procedural geometry/shaders adapt the supplied HTML. Temporary full-size captures and raw Lighthouse reports live in ignored `.impeccable/review/`.

**Not checked:** physical phone battery/GPU behavior, Safari/Firefox, a deployed origin, or a new live Supabase/Google matrix. The existing hosted RLS and real Google evidence remain unchanged. Nothing pushed.

## Interaction correction after user feedback

The user identified runtime differences in the first TSX adaptation that static visual review did not catch. These are corrected by porting the original HTML interaction code, without replacing the page design or adding dependencies:

- The orb shows `grab` on hover and `grabbing` while held. Pointer capture, cancellation, lost capture, blur and unmount clear the grabbing state.
- The source's two-substep spring integrator now controls home position/scale, drag return and press scale. Home response is 0.6s instead of the source's 0.5s, slightly slower as requested. Rotation returns to the source's 0.06 radians/second baseline; release spin decays at its original rate. Grab offsets, rubber-band resistance, eight-sample history, 80ms release-velocity cutoff and velocity-based stretch come from the supplied HTML.
- Day hover uses the source's 90px distance falloff, 9px peak lift, 1.3 peak scale and 140ms transition. Neighbouring cells rise symmetrically. The mobile grid limits it to the current row; pointer leave and reduced motion reset every cell.
- Existing fallback, lazy loading, content, account navigation and program-day corrections are preserved.

Final `npm run verify` after this correction: **182 unit/contract tests across 21 files and 9 production browser checks**, plus lint, types and build. Physics tests cover smooth bounded settling at 20/30/60/144fps, velocity-preserving release, and rubber-band resistance. Browser checks assert both cursor states, pointer capture/release, the rise/fall across five neighbouring cells, pointer-leave reset and reduced-motion suppression. The reduced-motion assertion handles JavaScript's equivalent positive/negative zero values.

The live in-app preview was refreshed and its orb drag and day hover were exercised. `step8-day-hover-correction.png` records the real preview at 699×654, with day 5 raised most and days 4/6 raised less. This is a browser screenshot, not generated artwork.

**Ponytail correction review: Ship.** Checked the source formulas, changed scene/render callers, scoped CSS, event cleanup, current-row behavior and regression tests. No extra page rebuild or dependency was needed. The earlier Lighthouse result is historical; it was not rerun for this interaction correction. Physical touch-device feel and deployed-origin behavior remain unchecked.
