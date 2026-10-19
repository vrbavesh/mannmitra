# HANDOFF.md — MannMitra status report

> Rewritten at every step close-out and session hand-off. Committed with the step's closing commit.
> Fresh agent: start from "Next up" + the blueprint's Context Brief for that step.

## Where we are

**Wave A — Step 1 COMPLETE (scaffold, design system, test harness). Next: Step 2 (Supabase schema + RLS), which needs the operator's Supabase project first.**

## Done

| Step | Commit | Gate result |
|---|---|---|
| (seed) spec + blueprint | `39c9e78` | — |
| 1 Scaffold + design system + test harness | `fe56c6c` (last of 5 commits) | `npm run verify` green (lint, typegen+tsc, build, 10 unit tests); Playwright smoke green; live render checked in browser; `/ponytail-review`: 4 findings (artifacts in git, Dialog padding-close, 120ms press, Progress clamp test) all fixed and re-verified |

## In flight

None. Step 1 closed.

## Next up

**Step 2 — Database schema, RLS, triggers, cleanup job** (blueprint §2, Step 2 context brief; strongest model tier). Transcribe spec §14 tables as numbered Supabase migrations, apply the documented deviations (screening tables write-locked to service role, `mood_entries.entry_date` from `profiles.timezone`, `scoring_version` column), RLS fail-closed tests, pg_cron cleanup job.

**Blocked until operator action §6.1:** Supabase project created + `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` copied from `.env.example` into `.env`. Migrations can be written before that, but `verify:rls` against a live project cannot run.

## Open blockers (operator, §6)

- [ ] **Supabase project + keys — BLOCKS Step 2 verification** (§6.1)
- [ ] OTP settings + `{{ .Token }}` email template (Step 5)
- [ ] Google OAuth credentials (Step 7 / Gate G4)
- [ ] Upstash Redis project or approval of Supabase-counter fallback (Step 4)
- [ ] Google Places key or OSM approval (Step 11)
- [ ] Groq key (optional Step 19)
- [ ] `gh` CLI + GitHub remote (push after each phase)
- [ ] Vercel project (first deploy, after Step 8)
- Launch gates G1–G7 (blueprint §7) block public deploy; none started.

## Key decisions

- Direct mode: local git only until `gh`/remote exists; one branch per step, merge after gate.
- `@types/node` bumped `^20` → `^24` to satisfy vitest 5 peer range (machine runs Node 24).
- **npm audit: 5 high findings are all `braces` stack-DoS inside the dev-only lint chain (`eslint-config-next → fast-glob → micromatch → braces`).** Only "fix" is downgrading eslint-config-next to v14 (rejected); advisory range is `*` so overrides can't help. Accepted: lint tooling, never shipped.
- `npm run typecheck` runs `next typegen` first — Next 16 route/layout types (`LayoutProps`) don't exist before a build.
- jsdom lacks `HTMLDialogElement.showModal`; stubbed in `vitest.setup.ts`. Native focus-trap/restore behavior stays browser-owned (verify manually or in later e2e).
- Spec edited by operator to "Gemini or Groq" (both occurrences); plan defaults to Groq.
- Gotchas for next time: PowerShell here rejects `&&` (use `;`); create-next-app refuses non-empty dirs and `_`-prefixed names; its generated AGENTS.md block is re-added by `next dev` (keep it embedded).
