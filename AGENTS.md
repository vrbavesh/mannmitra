# AGENTS.md — MannMitra go-to guide

MannMitra is a mental wellbeing screening + 30-day self-help web app for young-adult Indian users (MHI-18 pretest, risk gate, program tracks, mood garden, post-test report). Non-clinical, calm, non-alarming by mandate. Built to `mannmitra-master-spec.md.md` following `plans/mannmitra-blueprint-opencode.md` (20 steps, waves A–E).

**Current status lives in `HANDOFF.md`, not here.** This file stays a guide; the progress log at the bottom gets one line per completed step.

## Stack

Next.js 16 (App Router, TypeScript, `src/` dir), Tailwind CSS v4, Supabase (Auth + Postgres/RLS + Storage), Vercel hosting, Vitest + Playwright, Groq for the optional AI chatbot.

## Where things live

- Spec (authoritative): `mannmitra-master-spec.md.md`
- Blueprint (step-by-step plan): `plans/mannmitra-blueprint-opencode.md`
- Status report: `HANDOFF.md`

## Commands

| Command | What it does |
|---|---|
| `npm run verify` | lint + tsc + build + test (must be green before any step is done) |
| `npm run dev` | dev server |
| `npm test` / `npx vitest run` | unit/component tests |
| `npm run lint` / `npx tsc --noEmit` | individually |

## Git workflow

- Commit every completed blueprint step after its verification, review, and status close-out.
- Push only after the user explicitly approves that push.

## Hard invariants (never break these)

1. `service_role` key and secrets never reach client bundles; server-only modules only.
2. Scoring and risk-gate decisions computed server-side; screening tables reject client inserts (RLS).
3. Day bucketing from `profiles.timezone`, never DB UTC `current_date`.
4. No password columns outside Supabase auth; never log OTP codes or passwords.
5. UI copy: calm, no red-alarm auth errors, no shaming streak messages.
6. One accent color, one theme, zero em-dashes in visible copy, WCAG AA on controls.
7. Every animation honors `prefers-reduced-motion`; `transform`/`opacity` only; UI durations < 300ms.

## Parallel-lane file ownership

- Landing lane: `src/app/(marketing)/**`, `src/components/three/**` only. Never edits root layout or `package.json` concurrently.
- Auth lane: `src/app/(auth)/**`, `src/server/routes/**`.
- Content lanes: only their own `seeds/tasks/<track>.ts` + test file.
- All `package.json`/lockfile installs are serialized across every lane (rebase first).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Progress log (append-only, one line per completed step; prune to last 10 past ~40 lines)

- 2026-10-19  Step 1 — Scaffold, design system, test harness — fe56c6c
- 2026-10-19  Step 2 — Schema, RLS, triggers, cleanup (code; verify:rls pending Codex apply) — 58e4ac6
- 2026-10-19  Step 2 — Hosted verification complete; advisor hardening — 9b436ab
