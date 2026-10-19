# HANDOFF.md — MannMitra status report

> Rewritten at every step close-out and session hand-off. Committed with the step's closing commit.
> Fresh agent: start from "Next up" + the blueprint's Context Brief for that step.

## Where we are

**Wave A — Step 1 (Scaffold, design system, test harness) — in flight.** Git repo seeded with spec + blueprint; Next.js 16 scaffold installed at the repo root; design tokens, primitives, and test harness being built now.

## Done

| Step | Commit | Gate result |
|---|---|---|
| (seed) spec + blueprint | `39c9e78` | — |

## In flight — Step 1

- [x] `git init` + initial commit (spec + blueprint)
- [x] Next.js 16.4.2 + TS + Tailwind v4 + ESLint scaffold at root, deps installed
- [ ] `AGENTS.md` + `HANDOFF.md` (this file), committed
- [ ] Design tokens (evergreen/bone/amber, Plus Jakarta Sans + Geist Mono, light-locked)
- [ ] Base primitives: Button, Input, Card, Progress, Dialog, Toast (Phosphor icons)
- [ ] `prefers-reduced-motion` global fallback, `min-h-[100dvh]` theme root
- [ ] Vitest + RTL + Playwright; `npm run verify` script
- [ ] `.env.example`, `.gitignore` for `.env*`
- [ ] Close-out: `/ponytail-review`, this file rewritten, log line in AGENTS.md

**Gotchas so far:** create-next-app refuses a non-empty dir (scaffolded in a temp subdir, moved up) and rejects package names starting with `_`. Its generated `AGENTS.md` block is re-added by `next dev` — keep it embedded, don't delete. npm reported 5 high-severity audit findings in the fresh install (check before Wave B). npm 11 blocked `unrs-resolver` postinstall (`npm approve-scripts` pending) — revisit if lint misbehaves.

## Next up

1. Finish Step 1 (above), then **Step 2 — Supabase schema + RLS + triggers + cron** (blueprint §2, Step 2 context brief). Blocked on operator action §6.1 (Supabase project + keys in `.env`).

## Open blockers (operator, §6)

- [ ] Supabase project + keys (blocks Step 2)
- [ ] OTP settings + `{{ .Token }}` email template (Step 5)
- [ ] Google OAuth credentials (Step 7 / Gate G4)
- [ ] Upstash Redis project or approval of Supabase-counter fallback (Step 4)
- [ ] `gh` CLI + GitHub remote (push after each phase)
- [ ] Vercel project (first deploy, after Step 8)
- Launch gates G1–G7 in blueprint §7 block any public deploy (none started).

## Key decisions

- Direct mode: local git only until `gh`/remote exists; one branch per step, merge after gate.
- Blueprint revision rounds 1–4 applied (adversarial review + 7 operator changes + AGENTS/HANDOFF files + Groq instead of Gemini). Spec edited to say "Gemini or Groq".
