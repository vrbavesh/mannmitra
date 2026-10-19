# HANDOFF.md — MannMitra status report

> Rewritten at every step close-out and session hand-off. Committed with the step's closing commit.
> Fresh agent: start from "Next up" + the blueprint's Context Brief for that step.

## Where we are

**Wave A — Step 2 COMPLETE. Five migrations are applied to hosted Supabase project `rgbqzsivegyijacmrfqi`; hosted RLS/Storage verification and the full repository gate are green. Next: Step 3.**

## Done

| Step | Commit | Gate result |
|---|---|---|
| (seed) spec + blueprint | `39c9e78` | — |
| 1 Scaffold + design system + test harness | `fe56c6c` (last of 5 commits) | `npm run verify` green (lint, typegen+tsc, build, 10 unit tests); Playwright smoke green; live render checked in browser; `/ponytail-review`: 4 findings all fixed and re-verified |
| 2 Schema + RLS + triggers + cleanup | `9b436ab` (last of 4 commits) | Five hosted migrations applied; `npm run verify:rls` green (34 tests); `npm run verify` green (lint, typecheck, build, 10 unit tests); Supabase security advisor clean; temporary users/fixtures confirmed removed; `/ponytail-review`: ship |

## In flight

None. Step 3 has not started.

## Next up

**Step 3 — Stage-guard middleware + route shells** (blueprint §2; strongest model tier; `/tdd`). Read the relevant Next.js 16 guides in `node_modules/next/dist/docs/` before implementation.

## Open blockers (operator, §6)

- [x] Supabase project + keys — DONE (in `.env.local`, gitignored)
- [x] Hosted Step 2 migrations + RLS/Storage verification — DONE (`verify:rls`: 34/34)
- [ ] OTP settings + `{{ .Token }}` email template (spec'd in `docs/supabase-auth-settings.md`; needed by Step 5)
- [ ] Google OAuth credentials (Step 7 / Gate G4)
- [ ] Upstash Redis project or approval of Supabase-counter fallback (Step 4)
- [ ] Google Places key or OSM approval (Step 11)
- [ ] Groq key (optional Step 19)
- [x] GitHub remote — DONE (`origin`: `https://github.com/vrbavesh/mannmitra.git`; pushes require explicit user approval)
- [ ] Vercel project (first deploy, after Step 8)
- Launch gates G1–G7 (blueprint §7) block public deploy; none started.

## Key decisions

- GitHub remote `origin` is configured. Commit every completed step after its gate and status close-out; push only with explicit user approval.
- **Hosted migrations applied through the Supabase connector.** Supabase assigned the canonical remote versions, and local filenames were aligned to them so future CLI migration history stays consistent: `20261019042648` through `20261019043230`.
- Current Supabase guidance uses explicit `to authenticated` policies and `(select auth.uid())`; deprecated `auth.role()` was removed before apply. A fifth migration revokes Data API execution of trigger-only `security definer` functions and indexes all foreign keys needed for ownership reads and cascading account deletion. Security advisor is clean; fresh-index “unused” notices are expected on the empty schema.
- The hosted RLS suite now uses unique, self-cleaning task-template fixtures and treats revoked screening writes as the expected `42501` failure. Final cleanup check: zero `rls-*` auth users, profiles, or `__rls_test_*` templates.
- **Spec truncation reconstructions** (spec .md line-wrapped mid-expression): `username_format` = `^[a-z0-9_]{3,20}$` (spec §4); `saved_items.kind` 4th value = `'strength'` (§4 "strengths list" + "set strength"); `risk_events.reason` = `'safety_answer','severe_score'` (§6 gate); programs.track 3rd = `'negative_thinking'`; severity = `'minimal','mild','moderate','severe'`. Flag for review if any later step disagrees.
- `@testing-library/react` version in package.json corrected to installed `^16.3.3` (my hand-written `^16.4.0` didn't exist and broke `npm install`; also synced jsdom/prettier/playwright ranges to lockfile reality).
- `npm install @supabase/supabase-js` added (Step 5+ need it; RLS suite uses it now).
- npm audit: 5 highs all `braces` dev-only lint-chain advisory, accepted (fix = downgrade eslint-config-next, rejected).
- `npm run typecheck` = `next typegen && tsc --noEmit` (Next 16 `LayoutProps` types don't exist pre-build).
- jsdom lacks `HTMLDialogElement.showModal`; stubbed in `vitest.setup.ts`.
- Spec says "Gemini or Groq" (both occurrences edited); plan defaults to Groq.
- Gotchas: PowerShell rejects `&&` (use `;`); `.env.local` anon key had a leading space after `=`, trimmed; `npm test` only picks up `src/**` — RLS suite lives in `tests/rls/` with its own config (`vitest.rls.config.mts`) and `verify:rls` script so CI/offline `verify` never hits the network.
