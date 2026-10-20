# MannMitra — Construction Blueprint

**Objective:** Build MannMitra, a mental wellbeing screening + 30-day self-help web app, exactly to `C:\Mannmitra\mannmitra-master-spec.md.md` (v2), with a spectacular, motion-rich, 3D-accented frontend.

**Mode:** Direct mode. git present (2.52), `gh` CLI absent, no remote yet. Each step = one branch, with one logical commit per sub-deliverable (component, route group, seed file), merged to `main` only after the step's quality gate. GitHub push is deferred until a remote/`gh` exists (operator step, noted in §6).

**Cold-start rule:** Every step below is self-contained. A fresh agent can execute any step using only that step's Context Brief plus the spec file path — and should first read repo-root `HANDOFF.md` (current state, blockers, gotchas) and `AGENTS.md` (conventions, invariants, commands) rather than relying on conversation history (§0.3).

---

## 0. Global invariants (verify after EVERY step)

- `npm run build && npm run lint && npx tsc --noEmit && npm test` all green.
- Supabase `service_role` key and any secrets never reach client bundles (`grep` for them in `src/` excluding `server-only` imports).
- RLS still enabled on every table from spec §14; a cross-user read test still fails closed.
- Scoring and risk-gate decisions computed server-side, never only in the browser (spec §14 notes) — and the database itself must reject client-forged scores (see Step 2, documented deviation from spec §14's literal policy loop).
- Any day-bucketing (mood entries, charts, streaks) computed from `profiles.timezone` in the write path — never the DB's UTC `current_date`.
- No password columns outside Supabase auth; OTP codes and passwords never logged.
- UI copy: calm, no red-alarm styling for auth errors, no shaming streak messages (spec §3.3, §11).
- Frontend changes pass the design-taste-frontend Pre-Flight Check: zero em-dashes in visible copy, one locked accent color, one theme (no mid-page theme flips), `prefers-reduced-motion` honored on every animation, WCAG AA contrast on buttons/forms.
- Motion rules from `/animate` + `/emil-design-eng`: purpose-named animations only, `transform`/`opacity` only, enter = ease-out strong curve, UI durations < 300ms, springs for gestures, no `window.addEventListener('scroll')`.
- **Step close-out is not done until `HANDOFF.md` is rewritten to the new state and a one-line entry is appended to the `AGENTS.md` progress log** (§0.3). A step whose diff merged but whose status files are stale is an incomplete step.

## 0.1 Skill wiring (who governs what)

| Concern | Skill |
|---|---|
| Plan structure, step format, mutation protocol | `/blueprint` |
| Endpoint shape, status codes, pagination, errors | `/api-design` |
| One authoritative contract artifact, consumer/provider verification | `/contract-first` |
| Server architecture, repo/service layer, caching, rate limit, logging | `/backend-patterns` |
| Landing/visual direction, pre-flight anti-slop gate | `/design-taste-frontend` |
| Fluid interaction, springs, interruptibility | `/apple-design` |
| Easing, durations, component animation decisions | `/emil-design-eng`, `/animate` |
| Overall craft floor, polish/audit commands | `/impeccable` |
| State, data fetching, error boundaries, memoization | `/frontend-patterns` |
| Quality bar after each step | `/ponytail` → `/ponytail-review` (diff), `/ponytail-audit` (repo), `/ponytail-help` (stuck) |
| Skill routing, TDD, multi-session coordination | `/ask-matt` → `/tdd`, `/chief-of-staff` |

## 0.2 Design direction (declared up front, per design-taste-frontend §0)

> **Reading this as:** a consumer wellbeing app in *Operate* mode (calm, fast, task-first screens) with one *Persuade/Experience* surface (the 3D landing), for young-adult Indian users, with a warm non-clinical language, leaning toward custom Tailwind v4 tokens + Motion (motion/react) + React Three Fiber on the landing only.

- **Dials:** Landing — VARIANCE 7, MOTION 6, DENSITY 3. App screens — VARIANCE 4, MOTION 4, DENSITY 4 (Operate restraint; delight reserved for rare moments: result reveal, garden growth, task completion).
- **Palette:** Forest family — deep evergreen primary `#14532d`-range, bone background, single amber accent. Green ties to the Mood Garden metaphor. No AI-purple, no beige+brass default. One accent locked app-wide.
- **Type:** Plus Jakarta Sans (display + body), Geist Mono for numeric data (scores, countdowns). No serif. No Inter as default.
- **Theme:** Light-locked at app root (wellness/trust); landing may use its own evergreen-dark hero but the page itself stays one theme — no section flips.
- **Motion budget:** Hero 3D gets the spectacle (R3F scene, pointer parallax, scroll-linked camera, spring entrances). App UI gets purposeful micro-motion only (press feedback `scale(0.97)` @120ms, card flips in 3D, breathing pacer springs, staggered list reveals ≤80ms delays). Everything gated by `prefers-reduced-motion` with a static fallback (spec also requires a lightweight landing fallback).
- **3D policy:** React Three Fiber only on `/` (spec §Stack) plus small in-app 3D accents where cheap and motivated (card flip, garden growth uses 2D/SVG + springs first). Never 3D on task-critical paths (perf + accessibility).

---

## 0.3 Project status files (`AGENTS.md` + `HANDOFF.md`)

Two files live at the repo root from Step 1 onward. They are the ONLY status surface — no chat history, no plan file, or third document carries state.

**`AGENTS.md` — the slim go-to guide (target: one screen, never grows with progress).**
- What MannMitra is (3 lines), the stack, where the spec and blueprint live, the commands that matter (`npm run verify`, `npm run dev`, `npm run db:migrate`, `npm run launch:check`), the hard invariants a contributor must not break (server-side scoring, service key server-only, calm copy, one accent, reduced-motion), and the file-ownership map for parallel lanes.
- Plus a **progress log at the bottom**: one line per completed step — `YYYY-MM-DD  Step N — <name> — <commit sha>`. Append-only, one line each. When the log exceeds ~40 lines it gets pruned to the last 10 entries and a pointer to `HANDOFF.md` (the guide must stay a guide, not a diary).
- NEVER put current-status detail (what's half-done, what's blocked, next action) in `AGENTS.md` — that belongs in `HANDOFF.md`.

**`HANDOFF.md` — the current status report (rewritten, not appended).**
- Sections: **Where we are** (current wave/step + one-paragraph state), **Done** (table: step, merged commit, gate result), **In flight** (step, branch, what's finished, what's left, gotchas discovered mid-step), **Next up** (the next step's number + its blueprint section pointer), **Open blockers** (operator actions/launch gates outstanding, from §6/§7), **Key decisions** (short list of any deviations made on the fly, each with date + reason).
- **Rewritten at the close of every step** (and at any session hand-off mid-step): the agent finishing a step updates In-flight → Done, moves Next up forward, and refreshes blockers. A fresh agent must be able to start the next step using ONLY `HANDOFF.md` + the blueprint's context brief — if it can't, the handoff is incomplete.
- Committed to git with the step's closing commit so status and code land atomically (`docs(handoff): step N complete`).

**Rule of thumb:** `AGENTS.md` answers "how do I work in this repo?", `HANDOFF.md` answers "where is the project right now and what happens next?"

## 1. Dependency graph and parallel waves

```
Wave A (serial foundation)
  1 Scaffold + design system + test harness
  2 Supabase schema + RLS + triggers + cron
  3 Stage-guard middleware + route shells + calm 404/500
  4 API contract (OpenAPI) + server-route conventions + rate limiting

Wave B (5 → 6 → 7 serial auth; 8 fully parallel)
  5 Email signup + OTP verify
  6 Sign-in (email/username) + forgot password/username
  7 Google sign-in + same-email enforcement   [strongest model — riskiest logic]
  8 Landing page 3D + motion                  [parallel lane: depends only on 1]

Wave C (serial)
  9  Onboarding flow
  10 Pretest MHI-18 + safety question + scoring engine   [strongest + TDD]
  11 Risk gate + result + track assignment + crisis page

Wave D (12 → 13 → {14a|14b|14c}; 15 after 12)
  12 Program engine + /home + mood check + task card shell
  13 Task component library (reusable components)
  14 Days 1–9 content — three PARALLEL lanes: 14a depression, 14b anxiety, 14c negative thinking
  15 Progress dashboard + mood garden + streak   [after 12; can overlap 14]

Wave E
  16 Posttest + report + PDF        (after 12, 15)
  17 Days 10–30 content — three PARALLEL lanes (after 13)
  18 Settings + export/delete + privacy/terms + security hardening pass

Optional later phases (spec §phases 9–10)
  19 AI chatbot (Groq) — hospital finder already built in Step 11
  20 Menstrual module behind cycle_tracking_enabled flag
```

**Parallel lanes** (no shared files/outputs): 8 ∥ 5–7; 14a/14b/14c; 17's three lanes; 15 ∥ 14. **File ownership rules (enforced to keep lanes conflict-free):**
- Step 8 owns only `app/(marketing)/**` and `components/three/**`. It NEVER edits `app/layout.tsx` or `package.json` concurrently with another lane: all package installs (including `three`, `@react-three/fiber`, chart libs, seed-script deps) are **serialized** — rebase before touching `package.json`/lockfile; one install commit at a time across the whole plan.
- Root-layout/metadata edits serialize the same way (Step 8 stages its layout changes for merge after its parallel neighbors rebase).
- Content lanes (14a/b/c, 17a/b/c) each own ONLY `seeds/tasks/<track>.ts` + their own test file. The shared seed runner, `db:seed:tasks` script, and `lib/engine/renderTask.tsx` are built BEFORE lanes open (Step 13), never inside a lane.
- Landing lane (8) touches only `app/(marketing)` + `components/three`; auth touches `app/(auth)` + `server/routes`.

**Model tiers:** Strongest tier for steps 2, 3, 4, 7, 10 (schema/RLS, stage machine, contract, identity merge risk, scoring). Default tier for the rest; content-seeding lanes (14, 17) and legal copy (18) run on default or cheaper tiers.

---

## 2. Steps

> Each step: **Goal → Context brief → Tasks → Depends/Parallel → Verification → Exit criteria → Rollback.**
> **Ponytail gate:** no step is "done" until `/ponytail-review` on its diff passes (all *Must fix* items resolved). After each Wave completes, run `/ponytail-audit` on the repo. Stuck on process → `/ponytail-help`.
> **Close-out gate (§0.3):** before calling any step done, append its one-line entry to the `AGENTS.md` progress log and rewrite `HANDOFF.md` (Done/In-flight/Next up/blockers) in the closing commit. Reviewers verify this in `/ponytail-review`.

---

### Step 1 — Scaffold, design system, test harness

**Goal:** A running Next.js app with the design tokens, base components, and test/CI harness every later step builds on.

**Context brief:** Greenfield at `C:\Mannmitra` (only the spec file exists). Stack per spec §Stack: Next.js App Router + TypeScript, Tailwind CSS v4, hosted target Vercel. No `gh` CLI — local git only. Design direction fixed in §0.2 of this plan (tokens: evergreen/bone/amber, Plus Jakarta Sans, light-locked theme). Read spec §Stack, §Routes (to know which shells exist), §0 of this plan.

**Tasks:**
1. `git init`, initial commit of spec + this blueprint.
2. Create `AGENTS.md` + `HANDOFF.md` per §0.3 (slim guide + initial status report: wave A, step 1 in flight, nothing done, blockers = the §6 operator actions not yet done). The `HANDOFF.md` "Next up" section points at Step 1 completion, then Step 2.
3. Create Next.js (App Router, TS) app; Tailwind v4 (no legacy `tailwindcss` postcss plugin); ESLint + Prettier.
4. `next/font` for Plus Jakarta Sans + Geist Mono. Define CSS-variable tokens: color scale (evergreen/bone/amber + neutrals), radius scale (one system: soft 12–16px cards, pill buttons — documented), type scale, spacing.
5. Base primitives: `Button` (with `:active` scale(0.97)/120ms, WCAG AA contrast checked), `Input` (label-above, helper + error slots), `Card`, `Progress`, `Dialog` (focus trap + restore), `Toast`. Icons: `@phosphor-icons/react`, stroke width standardized.
6. Theme root: light-locked, `min-h-[100dvh]` layout, `prefers-reduced-motion` global fallback.
7. Test harness: Vitest + React Testing Library; Playwright configured (smoke only for now). `npm run verify` script = lint + tsc + build + test.
8. `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY` placeholder — Gemini replaced by Groq per revision round 4, §deviation #15). `.gitignore` covers `.env*`.
9. Close-out per §0.3: `HANDOFF.md` rewritten (step 1 → Done, Step 2 → Next up), `AGENTS.md` log line appended, both committed with the step's final commit.

**Depends:** —. **Parallel:** everything later can start after this. **Tier:** default.

**Verification:** `npm run verify` green; `npm run dev` renders a page using `Button`/`Input`; `grep -r "SERVICE_ROLE" src/` returns nothing outside server-only modules.

**Exit criteria:** verify green + `/ponytail-review` passes on the diff.

**Rollback:** single commit — `git revert`.

---

### Step 2 — Database schema, RLS, triggers, cleanup job

**Goal:** Spec §14 tables exist as versioned migrations with RLS proven to fail closed.

**Context brief:** Supabase (Auth, Postgres + RLS, Storage). Schema is given verbatim in spec §14 — transcribe faithfully: `profiles` (with `username_format` check + unique lower index), `handle_new_user()` trigger, `screening_sessions`, `screening_answers`, `programs` (+ `one_active_program` partial unique index), `task_templates` (`day_no` 1–29), `task_completions` (unique per program+day, status enum locked/available/done/missed), `mood_entries`, `journal_entries`, `thought_records`, `drawings`, `saved_items`, `risk_events`, `reports`. RLS: own-rows policies via the `do $$` loop, `screening_answers` via session ownership, `task_templates` read-for-authenticated. Storage: private `drawings` bucket, policy scoped to `user_id` folder. pg_cron: delete unverified `auth.users` older than 24h (spec §3.2, §13).

**Tasks:**
1. `supabase init`; write numbered migrations reproducing spec §14 exactly (fix the truncated lines in the spec from the table definitions above — constraints must match intent: enums via `check`, indexes as written).
2. **Documented deviations from spec §14's literal policy loop (integrity + timezone fixes):**
   - **Screening tables are write-locked against clients:** `screening_sessions` and `screening_answers` get own-rows `select` policies, but `insert`/`update`/`delete` are revoked from `authenticated` — rows only ever written by the server scoring route (Step 10) via the service role. Otherwise any client can forge `severity='minimal', safety_answer=0` with the anon key and walk past the risk gate (review finding M5).
   - **`mood_entries.entry_date` is always set explicitly by the server/client write path from `profiles.timezone`** — never rely on the column default `current_date` (DB is UTC; IST users checking in 00:00–05:30 IST would bucket to yesterday, corrupting charts, streaks, and the report's first-7-vs-last-7 trend — review finding M6).
   - **New column `screening_sessions.scoring_version int not null default 1`** (additive to spec §14 — review change #5): the server scoring route stamps every session with the scoring key version it used (§5.3's mapping/bands are provisional and WILL be replaced pre-launch per spec), so old sessions remain interpretable when the official MHI key lands. Migration: add column with default 1; `lib/scoring/key.ts` exports `SCORING_VERSION`; route writes it; report/pipeline reads filter or label by version. No backfill needed (default covers existing rows).
3. Apply locally (`supabase start` + `supabase db push` or `db reset`). Add `npm run verify:rls` script (documented prerequisite: Supabase CLI + Docker running locally) separate from `npm run verify`.
4. Document Supabase Auth settings the spec mandates (§3.1): OTP 6 digits, 2-minute expiry, email template containing `{{ .Token }}`.
5. RLS test suite (Vitest + local client, or pgTAP): (a) user A cannot `select/insert/update/delete` user B's rows on every table; (b) anonymous role reads nothing; (c) authenticated reads `task_templates`; (d) **authenticated direct `insert` into `screening_sessions` / `screening_answers` is DENIED**; (e) `entry_date` explicit-set path stores the user's local date (IST 00:30 case).
6. Storage policy test: user A cannot fetch user B's drawing path.

**Depends:** 1. **Parallel:** —. **Tier:** strongest (schema correctness is expensive to change later).

**Verification:** migrations apply clean from scratch (`supabase db reset`); RLS tests all green; `npm run verify` green.

**Exit criteria:** RLS suite green + `/ponytail-review` passes.

**Rollback:** `git revert` + `supabase db reset` (no production data yet).

---

### Step 3 — Stage-guard middleware, route shells, calm error pages

**Goal:** One derived user stage per request; every route stubbed and gated exactly per spec §2.

**Context brief:** Spec §2 defines the single source of stage truth: `unverified` (email not confirmed) → `/signup/verify`; `needs_onboarding` (`onboarding_completed=false`) → `/onboarding`; `needs_pretest` (no pretest session) → `/pretest`; `blocked` (pretest severity=severe OR safety flag) → `/pretest/result`, `/crisis`, `/settings`; `active` (program running) → `/home`, `/program`, `/program/day/[n]`, `/progress`, `/settings`, `/crisis`; `needs_posttest` (day 30 reached, no posttest) → `/posttest`; `completed` → `/report/*`, `/home` (summary), `/settings`.

**Documented spec gap:** the spec's 7 stages have no state for a Mild/Moderate/Minimal user who finished pretest but has not yet pressed "Start my 30 days" — they match none of the 7 (a session exists, not severe, no program). Without adding a stage, `deriveStage()` dead-ends at the product's primary conversion moment (`/pretest/result` CTA). **Fix: add an 8th stage `awaiting_start`** (pretest exists, not blocked, no program) → allowed pages `/pretest/result`, `/crisis`, `/settings`. Logged as a spec deviation in §4.

Use the framework's built-in not-found/error pages (spec fix #6) styled calm — no red alarm screens. `/crisis`, `/`, `/privacy`, `/terms` are open to everyone, including unverified users (public allowlist always wins; stage redirects apply only to app pages).

**Tasks:**
1. `lib/stage.ts`: pure `deriveStage(profile, screenings, program, today)` — **TDD first** (table-driven cases for all **8** stages, incl. blocked-by-safety, `awaiting_start`, needs_posttest edge: day 30 reached, and the **blocked retake transition**: `today < retakeAt` → `/pretest` denied; `today >= retakeAt` → stage becomes `needs_pretest` so `/pretest` is reachable; post-retake non-severe result → `awaiting_start`).
2. `middleware.ts`: session resolve → stage → redirect to the only allowed page(s); public allowlist (`/`, `/signup*`, `/signin`, `/forgot-*`, `/privacy`, `/terms`, `/crisis`, `_next`, assets) — public pages reachable by unverified users, app pages are not.
3. Route shells for every row of spec §Routes (including `/program` and `/program/day/[n]`) with correct auth gating headers.
4. `not-found.tsx` + `error.tsx`: calm bone-background pages, plain copy, link to `/home` or `/signin`.
5. Tests: stage matrix (8 stages × allowed/blocked routes), "unverified user cannot reach `/home`", "unverified user CAN open `/` and `/crisis`", blocked day 0 vs day 15 `/pretest` access.

**Depends:** 2 (needs schema/session shape). **Parallel:** —. **Tier:** strongest.

**Verification:** `npm run verify`; middleware tests green; manual: hitting `/home` signed-out → `/signin`; `/signup/verify` while unverified is reachable.

**Exit criteria:** stage-matrix tests green + `/ponytail-review` passes.

**Rollback:** `git revert` (middleware is additive).

---

### Step 4 — API contract + server-route conventions + rate limiting

**Wave A audit execution note (2026-10-19):** Upstash is the selected and required backend for working limits. No automatic Supabase counter fallback was implemented; missing keys or Redis errors take the explicitly accepted fail-open path. The counter-table design below is an alternative backend only, not a deployment feature. `npm run verify` now includes the production browser smoke gate.

**Goal:** One authoritative OpenAPI artifact for all custom server routes; generated consumer types; shared validation/error/rate-limit conventions. (contract-first + api-design + backend-patterns)

**Context brief:** Most reads/writes go through the Supabase client under RLS. Custom server routes exist where the spec requires server-side power: username→email resolution folded **inside** `POST /api/auth/signin` (service key, server-only, no public lookup endpoint — §3.3), OTP verification orchestration (§3.1), server-side scoring (§14 note), and hospital finder (now Step 11 scope). contract-first rule: change the contract BEFORE implementation; one artifact, no duplicated shapes.

**Tasks:**
1. `contracts/openapi.yaml` (v1): 
   - `POST /api/auth/signin` — email-or-username + password, uniform failure message per §3.3. **Username→email resolution is an internal function inside this route** (`server/resolveUsername.ts`, service key, never exposed): there is NO `/api/auth/resolve-username` endpoint or any other public username-lookup route (enumeration surface kept at zero — review change #2).
   - `POST /api/screening/sessions` (submit answers → server computes scores + severity, returns result + stage; response includes `scoring_version` — review change #5)
   - `POST /api/auth/otp/request`, `POST /api/auth/otp/verify` (6-digit, 2-min, 5-attempt rules in contract description)
   - Error envelope per api-design: `{error:{code,message,details?}}` with semantic status codes (400/401/403/404/409/422/429).
2. `npm run generate:api-types` → `src/generated/api.ts` (openapi-typescript, pinned). Script committed.
3. Shared server modules: `server/rateLimit.ts` — **Upstash Redis sliding-window counter** (`@upstash/ratelimit`, free tier; `UPSTASH_REDIS_REST_URL`/`TOKEN` in env, server-only) so limits survive serverless instance restarts and work across Vercel edge instances. **Fallback if Upstash is unavailable:** a Supabase-backed counter table (key, window_start, count) written via the service role with an atomic `rpc` increment — NOT an in-memory Map (in-memory resets per lambda and doesn't hold under deploy — review change #1). Same limits either way: sign-in 10 attempts/10 min per IP (spec §3.3), OTP request + verify limits per §3.1. Pick one backend at Step 4 and record the choice in the module header. Plus `server/validate.ts` (Zod, mapping issues → 422 `details[]`), `server/errors.ts`.
4. Zod schemas derived from (or asserting against) generated types; response runtime validation at serialization boundary for one representative route (contract-first provider verification).
5. Contract test: fixtures for each route's success + each documented error validate against the OpenAPI artifact.

**Depends:** 1 (routes exist to mount on). **Parallel:** — **Tier:** strongest.

**Verification:** `npm run verify` + contract tests green; `openapi.yaml` lints (`npx @redocly/cli lint` optional).

**Exit criteria:** contract tests green + `/ponytail-review` passes.

**Rollback:** `git revert`; regenerate types.

---

### Step 5 — Email sign-up + OTP verification

**Goal:** Spec §3.2 working end-to-end with §3.1 OTP rules enforced server-side.

**Context brief:** §3.1 rules: 6 digits, 2-min validity, resend cooldown 2 min (button appears when old code expires), 5 wrong attempts per code then resend, resend cancels old code, server values in Supabase Auth settings (screen timer is display only). §3.2 flow: email + password + confirm (min 8) → Supabase sign up with email confirmation on → **always** show "If this email can be registered, we sent a code." (same text whether or not email exists) → `/signup/verify` OTP screen → correct code verifies → redirect `/onboarding`; wrong = attempt counted, expired = "Code expired" + Resend. Unverified users reach nothing else (enforced by Step 3). pg_cron cleanup already handles 24h deletion (Step 2).

**Tasks:**
1. `/signup` form (validation: email format, password ≥8, confirm match) + neutral post-submit message state.
2. `/signup/verify`: 6-digit OTP input, display timer 2:00, resend button gated to expiry, attempt counter, calm inline errors (no red), TDD on the attempt/expiry state machine.
3. Server route `POST /api/auth/otp/request` + `/verify` wrapping Supabase with rate limiting (Step 4 contract).
4. Tests: neutral message identical for existing vs new email; expired-code path; 5-attempt lockout → resend.

**Depends:** 3, 4. **Parallel:** 8 (landing) may run alongside. **Tier:** default.

**Verification:** `npm run verify`; manual loop: signup → OTP email (or console-captured code in dev) → verified → middleware sends to `/onboarding`.

**Exit criteria:** tests green + `/ponytail-review` passes.

**Rollback:** `git revert`.

---

### Step 6 — Sign-in (email/username), forgot password, forgot username

**Goal:** Spec §3.3, §3.5, §3.6 complete.

**Context brief:** §3.3: input without `@` → the signin route internally resolves username→email via `server/resolveUsername.ts` (service key, server-only, **no public lookup endpoint** — see Step 4) then signs in; stage decides redirect (§2); failure uses ONE calm message for unknown account and wrong password: "We couldn't sign you in with those details, but don't worry, you can try again." Unverified email → `/signup/verify`. Rate limit 10/10min/IP (Upstash/Supabase counter from Step 4). §3.5 `/forgot-password`: email → neutral message "If an account exists, we sent a code." → OTP (§3.1 rules) → **only after a CORRECT OTP** does the server check the account's provider: Google-only accounts then see "This account uses Google sign in" (instead of the set-password screen); password accounts proceed to set new password (min 8 + confirm). Revealing the provider state pre-OTP would leak which emails exist — keep the pre-OTP screen byte-identical for every address (review change #7). Temp session allows only the next screen; after password change: sign out other devices, current session proceeds to stage page. §3.6 `/forgot-username`: same OTP flow → show username → sign out temp session → "Go to sign in".

**Tasks:**
1. `POST /api/auth/signin` per contract (internal username resolution, uniform error, rate limit, unverified redirect).
2. `/signin` UI with the exact calm failure copy.
3. `/forgot-password` request + OTP + set-password screens; server asserts temp-session scope (only the next screen reachable); provider check runs **post-OTP-verification** — pre-OTP response is identical for: unknown email, password account, and Google-only account; correct OTP for a Google-only account shows "This account uses Google sign in" and stops (never the set-password screen).
4. `/forgot-username` request + OTP + reveal + sign-out.
5. Tests: same message for unknown vs wrong-password; username path resolves internally (assert NO route exposes `resolve-username` — contract + route-table test); forgot-password pre-OTP response byte-identical across unknown/password/Google-only accounts (anti-enumeration), Google-only revealed only after OTP verify; rate limit trips at 10; temp session cannot browse elsewhere.

**Depends:** 5 (shared OTP components/routes). **Parallel:** — **Tier:** default.

**Verification:** `npm run verify`; manual: username sign-in, forgot flows, rate-limit 429 after 10 tries.

**Exit criteria:** tests green + `/ponytail-review` passes.

**Rollback:** `git revert`.

---

### Step 7 — Google sign-in + same-email enforcement

**Goal:** Spec §3.4 exactly, with the riskiest auth case tested before anything else.

**Context brief:** §3.4: first Google login creates account → `/onboarding` (name pre-filled, username chosen later, no password). Returning Google user: `onboarding_completed` decides `/home` vs `/onboarding`. Same email already registered with password → **deny**: "An account with this email already exists. Please sign in with your email and password." Supabase auto-links before the callback, so enforcement is CODE: inspect linked identities, remove the new Google identity using the supported session-bound `unlinkIdentity`, sign out, withhold new session credentials, expire prior project auth cookies, and show the message. The installed SDK has no Admin unlink method; manual linking must be enabled for the supported unlink endpoint. Spec: "Test this case before anything else."

**Tasks:**
1. Google OAuth configure + callback route; profile auto-create already handled by `handle_new_user` trigger (verify `auth_provider='google'` + display_name populated).
2. Identity audit hook after callback: detect password identity on the same user → session-bound Google identity unlink → sign out → error screen with exact copy. Handle the race (auto-link already merged): remove the Google identity, keep password data intact, and never accept the merged login. Clear old project browser cookies without attaching newly minted session credentials, even if unlink/sign-out fails. Keep unrelated cookies intact.
3. Tests FIRST for the same-email matrix: (a) new Google email → onboard; (b) returning Google → stage redirect; (c) password account + Google same email → blocked message + no session. **Run case (c) first against the REAL Supabase project, using real Google authentication and the actual unlink endpoint.** Then delete that temporary password fixture before testing (a)/(b) with the same approved inbox. Primary verification may use the real browser PKCE flow or `signInWithIdToken` with genuine Google-issued tokens. The earlier proposed provider-disabled simulation is removed: disabled providers reject ID-token sign-in, and Admin `createUser` cannot construct Google identity objects. Mock-only checks never satisfy Gate G4. Record mode `google:enabled`, stable user ID for returning users, advanced hosted sign-in time, correct destinations, and cleanup. The completed Step 7 evidence is in `docs/verification/step7-google-matrix.md`.
4. Middleware stage read for Google users (email is pre-verified → skips `unverified`).

**Depends:** 6. **Parallel:** — **Tier:** strongest.

**Verification:** `npm run verify`; same-email matrix green **against the real Supabase project** with Google enabled (real browser PKCE or genuine ID-token flow). Evidence identifies the mode.

**Exit criteria:** real Google-enabled matrix green on the hosted project + `/ponytail-review` passes. No provider-disabled simulation may stand in for this gate.

**Rollback:** `git revert`; re-enable auto-link config if changed.

---

### Step 8 — Landing page: 3D spectacle + motion  *(parallel lane with 5–7)*

**Goal:** Spec `/` route: 3D landing with Sign Up / Sign In, built to the design direction with reduced-motion fallback.

**User-selected reference (2026-10-20):** `plans/MannMitra – Fluid Glass.html` replaces the earlier creative examples below. Preserve its mint fluid orb, system typography, five sections, CTA wording and compact visible navigation. Product truth, accessibility and fallback requirements still apply. Step 8 uses a CSS still rather than an SVG asset; no external raster artwork is needed for this procedural design. See `docs/design/landing.md` and `docs/verification/step8-fluid-glass.md` for the delivered adaptations and checks.

**Context brief:** Stack names React Three Fiber + Framer Motion (use `motion/react`) with lightweight fallback + `prefers-reduced-motion` (spec §Stack). design-taste-frontend governs layout/copy; `apple-design` governs gesture/spring feel; `/animate` gate: hero entry = delight-tier, purpose = hierarchy + storytelling. Dials: VARIANCE 7 / MOTION 6 / DENSITY 3.

**Tasks:**
1. Design read locked (§0.2). Hero: asymmetric split — headline ≤2 lines, subtext ≤20 words, CTAs: "Sign Up" (primary, pill) + "Sign In" (ghost). Max 4 text elements in hero; CTA labels identical app-wide (no duplicate intent).
2. R3F scene (lazy-loaded, client leaf `'use client'`): evergreen abstract scene (e.g. slowly growing/frond motif or soft floating leaf forms with pointer parallax, spring-damped camera). Cap DPR, pause rAF when offscreen/hidden.
3. Fallback: static gradient + SVG still for reduced-motion, no-WebGL, and low-power (feature-detect `WebGLRenderingContext`; content readable before JS).
4. Motion: hero entrance stagger (ease-out strong curve, ≤300ms UI / longer ok for hero), scroll-reveal on sections via `whileInView` (once), max one marquee (or none), no scroll hijack.
5. Sections (4+ layout families): hero → "how it works" (3-step, but NOT three equal cards — use asymmetric rhythm) → 30-day program preview (real component previews or generated imagery — NO div-fake-screenshots, NO invented metrics) → "Is this for me?" short reassurance block (plain copy: screening + self-help, not a diagnosis — quotes to crisis line, no fake testimonials, no fake logos) → CTA band → footer with `/privacy`, `/terms`, `/crisis` link. Real imagery: generate section images if an image-gen tool exists, else `picsum.photos/seed/...`.
6. Responsive: nav single line at desktop (≤80px), hamburger under lg; hero fits viewport at 1280 + 375 widths.
7. Run full design-taste-frontend Pre-Flight (§14) — every box honest.

**Depends:** 1 only. **Parallel:** 5, 6, 7 (touches `app/(marketing)`, `components/three` only). **Tier:** default (strongest optional for the R3F scene if it stalls).

**Verification:** `npm run verify`; Playwright smoke: landing loads, WebGL fallback path renders, reduced-motion emulated → no animation; Lighthouse pass (LCP <2.5s with fallback image priority).

**Exit criteria:** Pre-Flight 100% + `/ponytail-review` passes.

**Rollback:** `git revert` (isolated lane, zero coupling).

---

### Step 9 — Onboarding flow

**Goal:** Spec §4 complete: one screen per step, progress bar, save → `/pretest`.

**Context brief:** §4 order: Username (3–20, `^[a-z0-9_]+$`, unique, LIVE availability check) → Display name (Google pre-fill editable) → Gender (UI: Male / Female / Other / Prefer not to say; schema check allows only `male|female|other`, so "Other" and "Prefer not to say" both store `'other'` — documented mapping; menstrual module NOT here — behind future flag `cycle_tracking_enabled`) → Age confirmation (`MIN_AGE` constant + `// TODO: legal review` — **decision is Launch Gate G3 (§7), blocking before public launch**, not a soft operator note) → Consent (Terms, Privacy, "not a medical diagnosis" — all required, timestamped to `consent_accepted_at`) → Optional reminder time → Save sets `onboarding_completed=true` → redirect `/pretest`.

**Tasks:**
1. Step state machine + progress bar (transform/opacity transitions, no layout jank).
2. Username field: debounce + server availability route (add to OpenAPI contract FIRST — contract-first protocol), neutral "taken" state.
3. Consent checkboxes with links to `/terms`, `/privacy`.
4. Tests: username format rejects uppercase/spaces; blocked progression without consent; save flips stage (middleware test).

**Depends:** 7 (Google users land here). **Parallel:** — **Tier:** default.

**Verification:** `npm run verify`; manual full run for both email and Google users.

**Exit criteria:** tests green + `/ponytail-review` passes.

**Rollback:** `git revert`.

---

### Step 10 — Pretest (MHI-18 + safety question) + scoring engine

**Goal:** Spec §5 exact: 18 items one per screen, mandatory safety item, server-side scoring, severity bands.

**Context brief:** §5.1 prompt "During the past 4 weeks, how much of the time..." answers 1–6 (`1 All … 6 None`), 18 items as listed. §5.2 safety item after item 18 (PHQ-9 item 9 wording), 0–3 scale, **any answer >0 → risk gate immediately regardless of score**. §5.3 scoring: positive items {1,3,5,7,8,10,13,15} recode `7-raw`; negative {2,4,6,9,11,12,14,16,17,18} keep raw; total 18–108; `wellbeing% = (total-18)/90*100`; distress% = 100−wellbeing; areas: Anxiety {4,6,7,10,11,18}, Depression {1,2,3,9,13,14,15,16,17}, Negative mood {5,8,9,12,14,16} (area computed same way over those items); bands on distress%: <30 minimal, 30–49 mild, 50–69 moderate, ≥70 severe. Spec flags mapping/bands as provisional — put them in one `scoring/key.ts` with the "replace before launch" comment **and `SCORING_VERSION = 1`; replacing them is Launch Gate G1 (§7), which bumps the version to 2**. Scoring runs on server (§14).

**Tasks:**
1. **TDD (ask-matt → /tdd):** `lib/scoring/key.ts` + `computeScores()` pure function — unit tests from hand-computed fixtures written independently of the implementation: all raw = 3 → positive items (8) recode to 4 → 8×4 + 10×3 = 62 → wellbeing = (62−18)/90 = 48.9% → distress 51.1% → Moderate; total range fixture (all positives raw 6 = recoded 1, all negatives raw 1 → total 18 → wellbeing 0%); **area formula stated explicitly**: for an area with n items, `area wellbeing% = (areaΣ − n) / (5n) × 100` (n = 6 anxiety, 9 depression, 6 negative mood) — test against hand-computed area fixtures; band boundary tests at 29/30/49/50/69/70; safety>0 forces gate regardless of totals.
2. `POST /api/screening/sessions` (contract already defined): validates answers (1–6, 18 items, safety 0–3), computes scores, inserts `screening_sessions` + `screening_answers` **via service role** (client inserts denied per Step 2 deviation) **stamping `scoring_version = SCORING_VERSION` from `lib/scoring/key.ts`**, returns result + `scoring_version` + stage. Test: authenticated client direct insert is denied; stored `scoring_version` matches the key that produced the score.
3. UI: one-question-per-screen with keyboard (1–6 keys), progress 18+1, back navigation, calm card aesthetic, spring transitions between questions (reduced-motion → cross-fade only).
4. Persist draft answers (survive refresh) — resume on reload.

**Depends:** 9. **Parallel:** — **Tier:** strongest.

**Verification:** `npm run verify`; scoring unit suite green incl. band boundaries; RLS: user A's answers invisible to B.

**Exit criteria:** scoring tests green + `/ponytail-review` passes.

**Rollback:** `git revert` (scoring key changes are data — revert carefully once sessions exist).

---

### Step 11 — Risk gate, result screen, track assignment, crisis page

**Goal:** Spec §6: support screen, risk_events, track assignment, "Start my 30 days", **plus the hospital finder (moved here from Step 19 — review change #3)**.

**Context brief:** §6 risk gate matrix: safety>0 → support screen immediately, no program; Severe → support, no program; Moderate → offer program + gentle "also see a counsellor" nudge; Mild → offer program; Minimal → wellness tips + optional program. Support screen: calm design, no alarm colors; kind message; Tele-MANAS **14416**, Emergency **112**; button "find nearby hospitals and mental health centres" — **hospital finder is IN SCOPE for this step** (moved from Step 19 per review change #3): real search over Google Places (preferred, operator key) or OpenStreetMap Nominatim/Overpass (no-key fallback), results show name + address + **phone number**, geolocation via browser API with manual city fallback, loading/empty/error states, no key in client bundle (server route only, add to OpenAPI contract first). No self-help activities are unlocked for blocked users; insert `risk_events` row; retake only after 14 days; safety>0 → support screen every sign-in. Track assignment: highest area distress %; top two within 10 points → assign highest + mention second as "bonus" (no blended plan v1). Result screen: wellbeing %, strongest area, what the next 30 days look like; CTA "Start my 30 days" → sets `start_date` = today in USER timezone, creates program. `/crisis` open to all: helplines + the same finder.

**Tasks:**
1. **TDD** `deriveGate(safetyAnswer, severity)` → `{showSupport, allowProgram, retakeAt}` matrix tests per §6 table.
2. **TDD** `assignTrack(areas)` incl. within-10 bonus rule.
3. `/pretest/result` UI: reveal animation (delight-tier, one-time, reduced-motion → static), score dial, track card, CTA.
4. Support screen component (reused by blocked stage + `/crisis`).
5. **Hospital finder (in scope — review change #3):**
   - Contract-first: `GET /api/places/nearby?lat=&lng=&q=` added to `contracts/openapi.yaml` BEFORE the route (Google Places server-side with `GOOGLE_PLACES_API_KEY`; OpenStreetMap Nominatim/Overpass fallback when no key — provider picked at implementation, recorded in the route header). Key server-only; response cached briefly (60s) per api-design conventions.
   - UI component `HospitalFinder`: "Find nearby hospitals and mental health centres" button → browser geolocation (permission-denied → manual city/search input fallback) → results list with name, address, **tap-to-call phone number**, distance; loading skeleton, empty state, error/retry; calm design, no alarm colors; usable at 375px.
   - Mounted in the support screen (blocked stage) and on `/crisis`.
   - Tests: route contract fixtures (success + provider-error + no-key fallback), UI states (denied permission, empty results, provider 5xx → retry).
6. `/crisis` page: helplines (14416, 112) always visible + mounted finder (same component).
7. Retake-lock enforcement server-side (14-day rule) + middleware blocked-stage behavior test.
8. **Wave A audit requirement:** programs and risk events are client read-only. Create them through authenticated server operations, updating the OpenAPI contract first. Check screening owner/kind, risk gate, and dates server-side. Composite database foreign keys enforce ownership; never restore direct client lifecycle writes. Apply the same server-only rule to report/program completion writes in Step 16.

**Depends:** 10, 4 (contract). **Parallel:** — **Tier:** default (gate logic tested per above).

**Verification:** `npm run verify` + contract tests for `/api/places/nearby`; gate/track unit tests; manual: safety answer 1 → blocked stage, no program rows possible; Moderate → program created with today's date in Asia/Kolkata; finder returns named centres with phone numbers (real provider run), and works with geolocation denied (manual fallback).

**Exit criteria:** tests green + `/ponytail-review` passes.

**Rollback:** `git revert`.

---

### Step 12 — Program engine + /home + mood check + task card shell

**Goal:** Spec §7 engine rules operational; `/home` per §13.

**Context brief:** §7: 30 days, day 30 = post-test; odd days main activity 10–15 min; even days micro task 1–3 min; unlock at local midnight of `start_date + (day-1)`; no skipping ahead; missed task stays open 48h then `missed`; day-30 post-test available anytime after day 30; 7+ day absence → friendly welcome back, continue from today, NO penalty message; completion requires mood check before AND after; every task saves mood_before, mood_after, **time taken** (no dedicated column — store elapsed seconds inside `task_completions.payload.json` as `time_taken_s`), own payload. Derived state is authoritative for reads: `dayState()` computes locked/available/done/missed at read time; the stored `status` column is written lazily on access/complete (reconcile) — tests confirm a stale column never overrides derivation. `programs.status='abandoned'` is unused in v1 (decision recorded, no writer).

Routes owned here (spec routes table): **`/program`** — 30-day map of day tiles (locked/available/done/missed states, next-unlock hints, rest-day styling on even days); **`/program/day/[n]`** — runs that day's task: task card shell → mood_before → day's component (via `renderTask` from Step 13) → mood_after → `completeTask()`. `/home` (§13): header (logo, always-visible crisis button, profile menu), today's task card or rest-day micro card + start button, progress ring + gentle streak (streak fn owned by Step 15 — import, do not duplicate), quick mood check, garden preview, next-unlock countdown.

**Tasks:**
1. **TDD** `lib/engine/dayState.ts`: `unlockAt(start, day)`, `dayStatus(completion, now)` → locked/available/done/missed incl. 48h window, day-30 special case, timezone-safe (date math in user's tz, `Asia/Kolkata` default from profile).
2. **TDD** `completeTask()`: rejects without mood_before+mood_after; writes `time_taken_s` + payload; upserts `task_completions`; sets `entry_date`-style day buckets from `profiles.timezone` (never DB UTC — Step 2 deviation).
3. Program creation service (from Step 11 CTA): **decision — lazy rows**: `task_completions` rows created on first access per day (no pre-seeded dead rows); engine derives state from `start_date` regardless.
4. `/program` 30-day map page (states from `dayState`, keyboard-accessible tiles, locked tiles show unlock time in mono).
5. `/program/day/[n]` route: guards day availability server-side (no skipping ahead — server 403s future days even if URL forged), composes shell → moods → component → complete. **Dependency note:** no `task_templates` rows exist yet (seeded in Step 14) and the full component registry lands in Step 13 — so Step 12 renders through a minimal local registry that resolves `MoodCheck` (its own component) and shows a graceful "task loading" fallback for unknown components; Step 13 replaces it with the full `renderTask` `componentMap` in the same call shape (typed contract agreed in Step 12's test, so no forward break). Welcome-back state after 7+ days absence (friendly copy, no penalty).
6. `/home` UI: header, today card, progress ring (spring count-up), streak display (import from Step 15's `lib/streak.ts` — Step 15 owns the fn; if Step 15 hasn't landed yet, Step 12 imports a stub with `// replaced in Step 15` and the Step 15 gate verifies removal), countdown to next unlock (mono font), quick mood check (writes `mood_entries` with explicit user-tz `entry_date`).
7. Minimal `MoodCheck` + `TaskCard` components live HERE (narrow versions covering exactly these flows) — Step 13 hardens and extends them (single owner per artifact, no circularity).

**Depends:** 11. **Parallel:** 15 can start after this. **Tier:** default. *Pre-planned split (one-PR rule):* if the branch grows past one PR, split per mutation protocol into **12a** (engine TDD + `/program/day/[n]`) and **12b** (`/program` map + `/home`) — never ship an untested engine.

**Verification:** `npm run verify`; engine tests incl. 48h boundary (fake timers) and tz cases (IST 00:30 mood write → correct local `entry_date`); forged future-day URL → 403; manual: start program → `/program` shows day 1 available, day 3 locked → day route: moods before/after → ring moves on `/home`.

**Exit criteria:** engine + route tests green + `/ponytail-review` passes.

**Rollback:** `git revert`.

---

### Step 13 — Task component library

**Goal:** All reusable components from spec §11 table built, documented, and unit-tested — content plugs in next.

**Context brief:** Components: Mood check (0–10, garden/weather skins), Task card shell, Drag-and-drop board (ONE engine; Depression 1 / Anxiety 9 / Negative thinking 1 with different labels+bins), Card flip (text-only config diff), Emoji picker (tile-set config), Art canvas (optional redraw layer), Media player (audio/YouTube + timer + optional body outline), Journal form (optional chat skin), Breathing pacer (circle + balloon modes), Thought record form, plus **seven** one-offs: Beat grid, Bubble game, Grounding scene, Tension slider, Quick quiz, Word swap, Sound mixer. Interaction design: apple-design (springs, interruptible gestures, pointer capture for drags, velocity handoff for flicks), animate gate per component (celebration = rare/delight OK; task-critical UI = fast/functional), emulate/inspect via impeccable polish lens.

**Tasks:**
1. `components/tasks/` folder + storybook-lite demo route (`/dev/tasks`, auth-gated) rendering every component with sample config — the visual QA surface.
2. **Harden and extend the `MoodCheck` + `TaskCard` created in Step 12** (single ownership — Step 12 built the narrow versions; this step adds garden/weather skins, celebration state, timer) then build in dependency order: drag-drop board (pointer-capture, keyboard-accessible alternative for a11y) → card flip (3D `preserve-3d`, origin-aware) → emoji → journal (+chat skin) → breathing pacer (spring-driven circle, 4-in/6-out config, reduced-motion = static ring + text cue) → media player (built-in timer) → thought record → art canvas (pointer events, undo, redraw layer; upload to private bucket with folder-scoped path) → the seven one-offs.
3. **`lib/engine/renderTask.tsx`** (shared, built HERE before any content lane opens): `componentMap: Record<component, React.FC<{config, onComplete}>>` covering all library components with typed config props + unit test that every `task_templates.component` value named in spec §7 resolves to a component. Content lanes (14, 17) never create this file — they only add seed data + tests.
4. **Seed runner** (shared, built HERE): `seeds/tasks/` loader + `npm run db:seed:tasks` idempotent upsert (track, day_no) + `package.json` script — lanes only contribute `seeds/tasks/<track>.ts` data files.
5. Drag-and-drop: get right once — grab offset respected, `setPointerCapture`, cancel-by-drag-away, drop = spring settle (apple-design §2/§10).
6. Per-component tests: render + core interaction (flip toggles, mood submits, canvas saves payload shape `jsonb` per `task_completions.payload`, incl. `time_taken_s`).
7. A11y pass: every game has a non-pointer path or an explicit skip; focus rings AA.

*Pre-planned split (one-PR rule):* **13a** (mood check + task card + drag-drop + card flip) / **13b** (journal, pacer, media, thought record, canvas, emoji) / **13c** (seven one-offs + `renderTask` + seed runner + demo route + a11y) — one commit per component, gated at the step level.

**Depends:** 12 (shell contracts). **Parallel:** 15 (dashboard) concurrently — different folders. **Tier:** default; strongest review on drag-drop + canvas.

**Verification:** `npm run verify`; component tests green; `/dev/tasks` manual pass at 375 + 1280; reduced-motion spot check.

**Exit criteria:** all components render on demo route + `/ponytail-review` passes (review the drag-drop and canvas diffs especially).

**Rollback:** `git revert` per component commit (commit granularly: one commit per component).

---

### Step 14 — Days 1–9 content (three parallel lanes)

**Goal:** Spec §7 task library days 1–9 seeded for all three tracks, runnable through the engine.

**Context brief:** Task tables verbatim from spec §7 (Depression days 1–9, Anxiety days 1–9, Negative thinking days 1–9). `task_templates` unique (track, day_no), `component` field selects from Step 13's library, `config jsonb` drives labels/bins/skins. **Prerequisites already exist before lanes open (built in Step 13):** shared seed runner + `db:seed:tasks` script + `lib/engine/renderTask.tsx`. Lanes share nothing — **three agents in parallel**, one per lane, each owning ONLY `seeds/tasks/<track>.ts` and its test file (no `package.json`, no lockfile, no shared runner edits).

**Tasks (per lane):**
1. Write `seeds/tasks/<track>.ts` rows for days 1–9 matching spec exactly (titles, descriptions, example_text, component name, duration_min, config) — data only.
2. Lane test: render day N template through `renderTask` (Step 13) with sample config → correct component appears; every `component` string in the lane resolves (fails fast if Step 13's map misses one).
3. **Even/odd rule check:** even days = 1–3 min micro tasks (mood check variants), odd = 10–15 min main — flag any spec row that violates it rather than silently "fixing" the spec.
4. Lane commits: one per track file, rebased onto `main` (lockfile rule: lanes never touch `package.json`).

**Depends:** 13. **Parallel:** 14a ∥ 14b ∥ 14c; whole step parallel with 15. **Tier:** default (cheap lanes).

**Verification:** seed runs on clean DB; per-lane render tests; engine integration: `start program → day 1 task renders`.

**Exit criteria:** all three lanes merged + `/ponytail-review` on the combined diff + lane conflicts resolved.

**Rollback:** `git revert` per lane merge.

---

### Step 15 — Progress dashboard, mood chart, garden, streak

**Goal:** Spec §11 `/progress` (+ partial data for `/home`).

**Context brief:** §11: progress ring days/30; completion rate = done/due; mood chart = daily avg of mood before & after; task-effect list = biggest (after − before) improvements; gentle streak (consecutive days w/ any completed task; one grace day per week; NEVER shaming); mood garden grows in 6 stages as days complete; pretest vs current wellbeing% shown only AFTER posttest. Charts: hand-rolled SVG or a light lib (recharts acceptable; must pass a11y + reduced-motion → static paths).

**Tasks:**
1. **TDD** streak fn — Step 15 is the SINGLE owner of `lib/streak.ts` (grace-day semantics: 1 missed day/week doesn't reset; import from here on `/home`) + completion-rate (done/due from **derived** day states, not the stored `status` column) + task-effect ranking.
2. Data hooks (`frontend-patterns`): `useQuery`-style with loading skeletons, error state, empty state ("no moods yet" composed, not blank).
3. `/progress` UI: ring (animated draw on view, reduced-motion static), mood chart (SVG line, tooltip; buckets by user-tz `entry_date` — test crossing UTC midnight: IST 00:30 entry lands on local date), effect list (top 5), garden SVG (6 stages, growth transition on stage change = state-indication purpose), streak chip.
4. Garden preview on `/home` reuses stage component.

**Depends:** 12. **Parallel:** 14. **Tier:** default.

**Verification:** `npm run verify`; streak tests incl. grace-day boundaries (fake clock); manual: complete 2 days → chart shows 2 points.

**Exit criteria:** tests green + `/ponytail-review` passes.

**Rollback:** `git revert`.

---

### Step 16 — Posttest + report + PDF

**Goal:** Spec §12 complete.

**Context brief:** Posttest (`/posttest`, opens day 30 per engine): same MHI-18 + safety question; safety>0 or severe → support screen first (reuse Step 11). Report `/report/[programId]` auto-generated after posttest, PDF downloadable. Contents: summary (start/end dates, tasks completed, completion rate); scores pre vs post wellbeing% overall + per area + change; result label per area (improved / no clear change / worse; ≥5 points wellbeing change = meaningful, provisional); mood trend (avg first 7 vs last 7 days); best-working activities (top 3 by mood improvement); next steps (continue favourites, or see a professional if scores stayed high/worse); disclaimer (self-help screening, not a diagnosis).

**Tasks:**
1. Engine: `needs_posttest` on/after day 30 (extend Step 3 tests).
2. Reuse Step 10 pretest flow with `kind='post'` (verify session uniqueness rules).
3. **TDD** `lib/report/build.ts`: labels at 4/5/6-point deltas (boundary), mood-trend split, top-3 ranking ties, area comparisons; fixture-driven from stored sessions.
4. `POST /api/reports` → `reports.summary` jsonb; PDF: `@react-pdf/renderer` (Vercel-free-tier friendly) generated on demand → private Storage path `reports/{uid}/...` → signed download URL. Regeneration idempotent.
5. `/report/[programId]` UI: pre/post dial comparison (animated delta, static under reduced-motion), area label chips, mood trend sparkline, next steps, disclaimer visible (not footer-fine-print).
6. Program status → `completed` on posttest.

**Depends:** 12, 15. **Parallel:** — **Tier:** default; strongest on the report math tests.

**Verification:** `npm run verify`; report unit tests; manual: force day-30 state (test clock) → posttest → report renders → PDF downloads; RLS: other user's report 404s.

**Exit criteria:** report tests green + `/ponytail-review` passes.

**Rollback:** `git revert`.

---

### Step 17 — Days 10–30 content (three parallel lanes)

**Goal:** Spec §7 "to be written next" outline filled: Depression (behavioral activation, gratitude, social message drafts, future-self letter, planning), Anxiety (fear ladder, worry time, body scan audio, thought challenge, toolkit), Negative thinking (more thought records, strengths list, self-compassion letter, best-possible-self, wins jar, belief experiment tracker). Day 30 = posttest (no template; `task_templates.day_no ≤ 29` per schema).

**Context brief:** Same lane mechanics as Step 14; reuse Step 13 components (no new components unless a lane genuinely needs one — flag for review rather than spawning one-offs freely, per ponytail "does it need to exist").

**Tasks:** per lane — `seeds/tasks/<track>.ts` days 10–29, config through existing `componentMap`, per-lane render tests, seed idempotency, odd/even duration rule check.

**Depends:** 13 (14 not strictly required, but merge after 14 to avoid seed conflicts). **Parallel:** three lanes. **Tier:** default.

**Verification:** full seed on clean DB → days 1–29 all present for 3 tracks; integration: engine walks day 10 template.

**Exit criteria:** lanes merged + `/ponytail-review` on combined diff + full-program walkthrough test green.

**Rollback:** `git revert` per lane.

---

### Step 18 — Settings, data export/delete, legal pages, security hardening pass

**Goal:** Spec §13 `/settings` + §14 privacy/legal + closing security checklist.

**Context brief:** Settings: profile edit, reminder time, sign out, **export my data**, **delete my account** (cascade removes everything — RLS + FKs already cascade). `/privacy` must cover: what's collected (email, name, answers, journals, drawings, mood), why, retention, who sees it (only the user), how to delete, third parties (Supabase, Google, Groq), contact address. `/terms`: not a medical service/diagnosis, not for emergencies, helplines, age rule, acceptable use, liability limits, changes to terms. Both: plain calm wording, short summary at top of each section, **Indian-lawyer review is Launch Gate G2 (§7) — blocking before launch** (note in file header; a generated draft is not clearance, per spec). Security checklist (spec §14): RLS cross-read test re-run, rate limits on signin/OTP confirmed (Upstash/Supabase counter, not in-memory), no OTP/password in logs, service key server-only, storage policy test, security-review skill pass.

**Tasks:**
1. `/settings` UI + sign-out in header/profile menu (spec §3.7).
2. Export: server route gathers all user tables (+ drawings **and report PDFs** via signed URLs) → JSON/zip download. **Add to OpenAPI contract first** (contract-first protocol).
3. Delete: typed confirm → Admin API user delete → cascades rows; **explicitly purge Storage objects in BOTH private buckets — `drawings/{uid}/**` and `reports/{uid}/**`** (FK cascade does NOT cover storage — this gap was flagged in review). Test deletion of each path.
4. `/privacy` + `/terms` pages (summaries on top of sections, no em-dashes, calm type).
5. Security pass: run security-reviewer subagent on auth + server routes; fix Must-fix items; re-run full RLS suite (`verify:rls`).

*Pre-planned split (one-PR rule):* **18a** (settings UI + export) / **18b** (delete account + storage purge, both buckets) / **18c** (privacy + terms + security pass).

**Depends:** 12 (settings reachable for active users) — best done after 16 so all data types exist. **Parallel:** — **Tier:** default + security review.

**Verification:** `npm run verify` + `verify:rls`; export contains every table's rows for the user only; delete removes user + rows + both storage prefixes (test each); RLS suite green; legal pages render with anchors.

**Exit criteria:** `/ponytail-audit` on the whole repo passes + security-review Must-fix items resolved + `/ponytail-review` on diff + **hosted-project RLS smoke test** (operator-assisted, post-deploy): cross-user read of a real hosted row fails (review m8).

**Rollback:** `git revert` per sub-step; never partially revert delete-account logic — revert 18b whole.

---

### Step 19 (optional, spec phase 9) — AI chatbot

**Goal:** AI chatbot on **Groq** (later phase per spec; spec named Gemini — replaced per revision round 4). *(The hospital finder moved to Step 11 — review change #3.)*

**Tasks:** contract-first for `/api/chat` — server-side **Groq** (`GROQ_API_KEY` server-only, OpenAI-compatible chat completions endpoint with `stream: true`; pick one current Llama model, e.g. `llama-3.3-70b-versatile`, pin it in `server/chat/model.ts`); crisis-aware system prompt (never give medical advice, always surface 14416/112); chat UI with streaming (SSE), error + rate-limited states (same Upstash/Supabase counter). Groq's low latency suits SSE streaming; still handle 429s from Groq's rate limits with a calm retry message. Security review on prompt-injection surface before merge.

**Depends:** 11, 18 (security patterns). **Tier:** default + security review.

**Verification:** `npm run verify` + contract tests; crisis red-team cases (prompt "I want to hurt myself" → surfaces 14416/112 and refuses advice); rate-limit state test.

**Exit criteria:** red-team cases green + security-review Must-fix resolved + `/ponytail-review` passes.

**Rollback:** `git revert`.

---

### Step 20 (optional, spec phase 10) — Menstrual module

**Goal:** Female-version features behind `cycle_tracking_enabled` flag (already in `profiles` schema), per spec fix #11 — built later, never tied directly to onboarding. Spec's "**smartwatch ideas**" are explicitly **out of scope** for this plan (no design exists in the spec; recorded here so coverage is honest, not silent).

**Tasks (sketch — to be detailed when scheduled, per mutation protocol):** settings toggle writing `cycle_tracking_enabled`; cycle-aware task adjustments behind the flag (flag off = zero behavior change — test both states); no onboarding coupling (re-test stage guard).

**Depends:** 12+. **Parallel:** — **Tier:** default. **Status: PLANNED / OUT OF SCOPE FOR v1** — listed so the blueprint covers the full spec; not gated into waves A–E.

**Verification (when scheduled):** flag-off regression suite green; flag-on feature tests; `npm run verify`.

**Exit criteria (when scheduled):** `/ponytail-review` passes; default-off invariant test green.

**Rollback:** `git revert` (flag-gated — safe to revert without data migration).

---

## 3. Quality gates (mandatory cadence)

| When | Command | Pass condition |
|---|---|---|
| After every step | `/ponytail-review` on the step diff | No *Must fix* findings open |
| After every step (close-out, §0.3) | `HANDOFF.md` rewritten + `AGENTS.md` log line appended, in the closing commit | HANDOFF answers "where are we / what's next"; AGENTS.md still fits one screen |
| After each Wave (A–E) | `/ponytail-audit` on the repo | No *Must fix*; findings triaged |
| Frontend steps (1, 5–9, 11–13, 15–18) | design-taste-frontend Pre-Flight §14 | Every box honestly ticked |
| Logic-heavy steps (3, 10, 11, 12, 15, 16) | `/tdd` red-green cycle | Tests written first, fail then pass |
| After step 18 | security-reviewer pass | Must-fix resolved |
| Before any public deploy | `npm run launch:check` — all launch gates §7 (G1–G7) | Every gate has evidence recorded in `plans/launch-gates.md` |
| Stuck on process | `/ponytail-help` | — |
| Multi-session coordination across waves | `/chief-of-staff` (via `/ask-matt` routing) | Context pointers, no duplicated briefs |

**Adversarial plan review (blueprint phase 4):** DONE — read-only strongest-model review against the blueprint checklist ran on this plan (completeness vs spec, dependency correctness, anti-patterns: no step too big to be one PR, no forward references, no circular deps, every spec section mapped). Verdict was FIX-FIRST with 2 critical + 8 major findings; **all critical (missing `awaiting_start` stage, missing `/program` route coverage) and all major (mood-check ownership, missing `renderTask`, lane file-ownership, oversized steps, client-forgeable screening rows, UTC day bucketing, missing step 19/20 gates, blocked-retake transition) findings have been applied to this document.** Remaining minors were applied where cheap (score fixture, component count, time-taken payload, area formula, streak ownership, gender mapping, storage buckets, gate-table rows) or deferred to execution via the mutation protocol (§5).

**Revision round 2 (operator-requested, applied):** (1) in-memory rate limiter → Upstash Redis with Supabase-counter fallback (Step 4); (2) public `resolve-username` endpoint removed — resolution internal to `/api/auth/signin` (Steps 4, 6); (3) hospital finder moved from Step 19 into Step 11 scope (Steps 11, 19); (4) Google same-email matrix runs against a real Supabase project, Google-disabled simulation as the labeled fallback, real Google-enabled run = Launch Gate G4 (Step 7); (5) `screening_sessions.scoring_version` column added (Steps 2, 10); (6) clinical/legal/age items moved from operator actions to blocking launch gates G1–G3 in new §7 (§6, §7, Steps 9, 10, 18); (7) forgot-password reveals Google-only notice only after OTP verification (Step 6).

**Revision round 3 (operator-requested, applied):** repo-root `AGENTS.md` + `HANDOFF.md` mandated from Step 1 (new §0.3): AGENTS.md = slim go-to guide with append-only step log (pruned past ~40 lines); HANDOFF.md = status report rewritten at every step close-out and session hand-off, committed atomically with the closing commit. Wired into: global invariants (§0), cold-start rule, step template close-out gate, Step 1 tasks (create + first close-out), quality-gates table, and the mutation protocol (§5).

**Revision round 4 (operator-requested, applied):** Gemini → **Groq** everywhere — `GROQ_API_KEY` in `.env.example` (Step 1), privacy-policy third-party list (Step 18), chatbot implementation (Step 19: Groq chat completions, SSE streaming, pinned model in `server/chat/model.ts`), wave graph label, deviation #15. Operator action: Groq API key from console.groq.com (free tier) added to §6 setup. Follow-up operator edit: the spec file itself now reads "Gemini or Groq" at both occurrences (§Stack stack list, §15 privacy third-parties sentence), so the spec permits either provider and this plan's Groq default conforms without a spec conflict.

---

## 4. Spec coverage map (every spec section → step)

| Spec section | Step(s) |
|---|---|
| §1 fixes table | threaded through respective steps (OTP resend=5, stages=3, soft errors=6, 404/500=3) |
| §2 Routes + stage guard | 3 (shells incl. `/program`, `/program/day/[n]`), gates enforced throughout |
| §3.1–3.7 Auth | 4, 5, 6, 7 |
| §4 Onboarding | 9 |
| §5 Pretest + scoring | 10 |
| §6 Risk gate + tracks | 11 |
| §7 Program engine + task library + routes `/program`, `/program/day/[n]` + days 1–9 / 10–30 | 12, 13, 14, 17 |
| §11 Progress | 15 |
| §12 Posttest + report | 16 |
| §13 Home + settings | 12, 18 |
| §14 Database + RLS + security | 2, 18 |
| §15 Privacy + terms | 18 |
| §phases 1–10 | Steps 1–20 (phase 10 + smartwatch ideas explicitly out of scope for v1, Step 20) |
| Stack (3D landing) | 8 |

**Documented deviations from spec (complete list):**
1. Landing page built in Wave B parallel instead of phase 8 — independent files (`app/(marketing)`, `components/three`), derisks visual direction early.
2. 404/500 pages land in Step 3 (phase 8 in spec's order) — they're framework error routes owned by the middleware step.
3. Privacy/terms land in Step 18 (phase 8 in spec's order) — they need export/delete context and sit with the security pass.
4. Hospital finder **fully built in Step 11** (spec put it in phase 9; moved earlier because the support screen depends on it — no placeholder step anymore; Step 19 is chatbot-only).
5. **8th stage `awaiting_start` added** to the spec's 7-stage table (spec gap: post-pretest, pre-program state had no stage — Step 3).
6. **Screening INSERT/UPDATE restricted to service role** (spec §14's literal own-rows `for all` policy would let clients forge scores past the risk gate — Step 2).
7. **`mood_entries.entry_date` always set from `profiles.timezone`**, never DB `current_date` (UTC bucketing bug — Step 2).
8. `task_completions.status` is derived-authoritative on read, lazily reconciled on write (spec doesn't define a writer — Step 12).
9. `time_taken` stored in `payload.time_taken_s` (no schema column in spec — Step 12).
10. Spec phase 10 "smartwatch ideas" out of scope (no design in spec) — Step 20.
11. **`scoring_version int not null default 1` added to `screening_sessions`** (additive to §14 schema; protects against the spec's own provisional scoring key being swapped pre-launch — Step 2/10).
12. **No public `resolve-username` endpoint** — username→email resolution is an internal function inside `POST /api/auth/signin` (spec never required a public lookup; closes an enumeration surface — Step 4/6).
13. **Rate limiting uses Upstash Redis, never in-memory** — Upstash is required for working limits. The Supabase counter-table design is an unimplemented alternative; outages/missing keys use the accepted fail-open policy (clarified by the Wave A audit).
14. **Forgot-password reveals "This account uses Google sign in" only AFTER OTP verification** — spec §3.5 implied showing it at request time, which would leak which emails exist (Step 6).
15. **Chatbot defaults to Groq** — spec §Stack and §15 privacy wording edited to "Gemini or Groq API" (operator edit, both occurrences) so either provider is allowed: `GROQ_API_KEY`, OpenAI-compatible streaming completions, pinned Llama model — lower latency for SSE, simpler server-only key handling. Same crisis-prompt and security requirements unchanged (Steps 1, 18, 19).
16. **Wave A audit, 2026-10-19:** programs, reports, and risk events are read-only to clients, with server-only lifecycle writers. All program/session references enforce matching owners using composite foreign keys. This extends the original screening protection to prevent forged lifecycle state and cross-account links.

---

## 5. Mutation protocol

Steps may be split, inserted, skipped, reordered, or abandoned with an audit line appended to this file: `## MUTATION <date> <step> <action> <reason>`. Rules: never delete a step (mark `ABANDONED`); splitting requires new steps to keep each ≤ one PR; skipping requires the dependent steps' context briefs to be updated so no forward reference breaks. Every mutation also updates `HANDOFF.md` (Next up / blockers) and the `AGENTS.md` log in the same change — the status files never describe a step list that no longer exists.

---

## 6. Operator actions required (setup — cannot be agent-done)

Infrastructure/credentials only. Clinical, legal, and age-policy decisions are NOT here — they are blocking **launch gates** in §7.

1. Create Supabase project + paste URL/anon/service keys into `.env` (Step 2 start).
2. Configure Supabase Auth OTP settings + `{{ .Token }}` email template (Step 5).
3. Google OAuth credentials + authorized redirect URI (Step 7). Needed for the Google-enabled same-email matrix run (Gate G4); until then Step 7 merges on the Google-disabled fallback only.
4. Create an Upstash Redis project (free tier) + paste REST URL/token into `.env` — or approve the Supabase-counter fallback (Step 4).
5. Google Places API key (or approve the OpenStreetMap no-key fallback) for the hospital finder (Step 11).
6. Groq API key (free tier, console.groq.com) for the chatbot — only needed if the optional Step 19 ships.
7. Install `gh` + create GitHub remote, then push (spec: "commit and push after each phase") — until then, local commits per step only.
8. Vercel project + env vars before first deploy (after Step 8 makes sense).
9. Deploy Supabase Auth email template check + real-email OTP delivery smoke test (Step 5 verification needs a real inbox once).

---

## 7. Launch gates (BLOCKING — nothing ships publicly until every gate is checked)

These replace the old "operator action" framing for clinical/legal/age items: they are **release criteria**, verified and signed off, not optional to-dos. Each gate needs an evidence artifact (link, sign-off note, or committed file) recorded in `plans/launch-gates.md` before deploy.

| Gate | What must happen | Evidence required | Ties to |
|---|---|---|---|
| **G1 — Scoring key** | Replace the provisional MHI item-to-area mapping and severity band cut-offs with the official MHI scoring key, reviewed and signed off by a qualified mental-health professional. Bump `scoring_version` to 2 in the same migration (the whole reason the column exists). | Signed-off key doc + `scoring_version` migration + updated unit fixtures passing | Step 10 / §5.3 of spec |
| **G2 — Legal review** | `/privacy` and `/terms` reviewed by a lawyer versed in Indian data-protection law (DPDP Act). A generated draft is a starting point, not clearance. | Lawyer sign-off note (date, reviewer) + any resulting diffs merged | Steps 18, §15 of spec |
| **G3 — Age policy** | Decide the target age (`MIN_AGE`), and if under-18 users are allowed, obtain parental-consent guidance under Indian law. The `// TODO: legal review` constant in onboarding is replaced by the decided value. | Decided `MIN_AGE` committed + guidance note, or explicit 18+ decision | Step 9, §4 of spec |
| **G4 — Google same-email, real run** | The same-email enforcement matrix runs against the real Supabase project with **Google sign-in enabled** (primary path, not the google-disabled fallback). Case (c): password account + Google same email → blocked, no merged session. | CI/local run log showing mode `google:enabled` + matrix green | Step 7, §3.4 of spec |
| **G5 — Hosted RLS smoke** | Cross-user read against the **hosted** Supabase project fails closed on every table (local suite alone is not enough), plus authenticated client cannot insert into screening tables. | Hosted test run log attached | Steps 2, 18 |
| **G6 — Crisis path review** | Support screen + `/crisis` + hospital finder verified with real provider results (phone numbers tappable), helplines 14416/112 correct, finder fallback (OSM) also exercised. | Manual sign-off checklist in `plans/launch-gates.md` | Step 11, §6 of spec |
| **G7 — Security pass** | security-reviewer Must-fix items resolved (auth, OTP, service-key exposure, rate limiting live on hosted deploy). | Review report + fixes merged | Step 18, §14 of spec |

**Enforcement:** the pre-launch checklist is a single command (`npm run launch:check`) that asserts the mechanical parts (G1 version > 1 recorded, MIN_AGE committed ≠ placeholder, google:enabled log exists, hosted RLS log exists) and prints the manual gates (G2, G6, G7 sign-offs) for operator confirmation. Deploy scripts refuse to run the production publish step while any gate is unchecked.
