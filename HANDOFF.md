# HANDOFF.md — MannMitra status report

> Rewritten at every step close-out and session hand-off. Committed with the step's closing commit.
> Fresh agent: start from "Next up" + the blueprint's Context Brief for that step.

## Where we are

**Wave A — Step 2 code COMPLETE, verification PENDING (migrations not yet applied to the hosted project). Next: Codex applies migrations, then run `verify:rls`, then Step 3.**

## Done

| Step | Commit | Gate result |
|---|---|---|
| (seed) spec + blueprint | `39c9e78` | — |
| 1 Scaffold + design system + test harness | `fe56c6c` (last of 5 commits) | `npm run verify` green (lint, typegen+tsc, build, 10 unit tests); Playwright smoke green; live render checked in browser; `/ponytail-review`: 4 findings all fixed and re-verified |
| 2 Schema + RLS + triggers + cleanup (code) | `58e4ac6` (last of 2 commits) | `npm run verify` green (lint, tsc, build, 10 unit tests); **`verify:rls` NOT YET RUN** — blocked on migrations being applied to the hosted project |

## In flight

Step 2 verification. Code is committed and locally green. Outstanding:

1. **Codex applies the 4 migrations** in `supabase/migrations/` to the hosted project `rgbqzsivegyijacmrfqi` (operator chose this path; this machine has no Docker/psql and no Supabase CLI login). Order matters:
   - `20261019000001_init_schema.sql` (tables, indexes, `handle_new_user()` trigger)
   - `20261019000002_rls_policies.sql` (RLS + screening write-lock + task_templates read)
   - `20261019000003_storage_drawings.sql` (private `drawings` bucket + per-user folder policy)
   - `20261019000004_cron_cleanup.sql` (pg_cron: delete unverified `auth.users` > 24h)
2. **Then run `npm run verify:rls`** — the suite (`tests/rls/rls.test.ts`) creates two throwaway users, seeds every table via service role, and proves: cross-user blindness on all 11 tables, anon reads nothing, authenticated reads task_templates, screening tables reject client writes (42501), explicit `entry_date` wins over the UTC default, and storage folder isolation.
3. After it passes, commit any fixes + close Step 2 (HANDOFF rewrite + AGENTS.md log line).

## Next up

**Step 3 — Stage-guard middleware + route shells** (blueprint §2; strongest model tier; `/tdd`). After Step 2 verification closes.

## Open blockers (operator, §6)

- [x] Supabase project + keys — DONE (in `.env.local`, gitignored)
- [ ] **Codex applies Step 2 migrations — BLOCKS Step 2 verification** (see In flight)
- [ ] OTP settings + `{{ .Token }}` email template (spec'd in `docs/supabase-auth-settings.md`; needed by Step 5)
- [ ] Google OAuth credentials (Step 7 / Gate G4)
- [ ] Upstash Redis project or approval of Supabase-counter fallback (Step 4)
- [ ] Google Places key or OSM approval (Step 11)
- [ ] Groq key (optional Step 19)
- [ ] `gh` CLI + GitHub remote (push after each phase)
- [ ] Vercel project (first deploy, after Step 8)
- Launch gates G1–G7 (blueprint §7) block public deploy; none started.

## Key decisions

- Direct mode: local git only until `gh`/remote exists; one branch per step, merge after gate.
- **Migrations apply via Codex** (operator decision this session), not via Supabase CLI from this machine: no Docker (no `supabase start`), no `psql`, no CLI access token; the `sb_secret_` key cannot run DDL. `supabase init` still generated `supabase/config.toml` + the numbered migrations dir, so `db push` works whenever a token exists.
- **Spec truncation reconstructions** (spec .md line-wrapped mid-expression): `username_format` = `^[a-z0-9_]{3,20}$` (spec §4); `saved_items.kind` 4th value = `'strength'` (§4 "strengths list" + "set strength"); `risk_events.reason` = `'safety_answer','severe_score'` (§6 gate); programs.track 3rd = `'negative_thinking'`; severity = `'minimal','mild','moderate','severe'`. Flag for review if any later step disagrees.
- `@testing-library/react` version in package.json corrected to installed `^16.3.3` (my hand-written `^16.4.0` didn't exist and broke `npm install`; also synced jsdom/prettier/playwright ranges to lockfile reality).
- `npm install @supabase/supabase-js` added (Step 5+ need it; RLS suite uses it now).
- npm audit: 5 highs all `braces` dev-only lint-chain advisory, accepted (fix = downgrade eslint-config-next, rejected).
- `npm run typecheck` = `next typegen && tsc --noEmit` (Next 16 `LayoutProps` types don't exist pre-build).
- jsdom lacks `HTMLDialogElement.showModal`; stubbed in `vitest.setup.ts`.
- Spec says "Gemini or Groq" (both occurrences edited); plan defaults to Groq.
- Gotchas: PowerShell rejects `&&` (use `;`); `.env.local` anon key had a leading space after `=`, trimmed; `npm test` only picks up `src/**` — RLS suite lives in `tests/rls/` with its own config (`vitest.rls.config.mts`) and `verify:rls` script so CI/offline `verify` never hits the network.
