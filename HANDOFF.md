# HANDOFF.md — MannMitra status report

> Rewritten at every step close-out and session hand-off. Committed with the step's closing commit.
> Fresh agent: start from "Next up" + the blueprint's Context Brief for that step.

## Where we are

**Wave A — Step 6 COMPLETE. Email and username sign-in, password recovery, session scoping, password replacement, username recovery, and the 10-attempt rate limit passed against the hosted services. Both Supabase OTP templates contain `{{ .Token }}`. `npm run verify` is green (lint, typecheck, build, 151 tests). The temporary account was deleted. Next: Step 7 (Google sign-in and same-email enforcement).**

## Done

| Step                                                      | Commit                        | Gate result                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (seed) spec + blueprint                                   | `39c9e78`                     | —                                                                                                                                                                                                                                                                                         |
| 1 Scaffold + design system + test harness                 | `fe56c6c` (last of 5 commits) | `npm run verify` green (lint, typegen+tsc, build, 10 unit tests); Playwright smoke green; live render checked in browser; `/ponytail-review`: 4 findings all fixed and re-verified                                                                                                        |
| 2 Schema + RLS + triggers + cleanup                       | `9b436ab` (last of 4 commits) | Five hosted migrations applied; `npm run verify:rls` green (34 tests); `npm run verify` green (lint, typecheck, build, 10 unit tests); Supabase security advisor clean; temporary users/fixtures confirmed removed; `/ponytail-review`: ship                                              |
| 3 Stage guard + route shells + calm errors                | `ccc149a`                     | `npm run verify` green (lint, typecheck, build, 47 tests); production HTTP checks: signed-out `/home` 307 to `/signin`, `/crisis` and `/signup/verify` 200, unknown path 404; `/ponytail-review`: ship after fixing the unscored-screening case                                           |
| 4 API contract + server-route conventions + rate limiting | `b5011bd`                     | `npm run generate:api-types` green; `npm run verify` green (lint, typecheck, build, 110 tests: 47 contract + 16 server + 47 pre-existing); `/ponytail-review`: ship after 3 fixes (composed rate-limit response, removed dead errorEnvelopeSchema, documented clientIp platform reliance) |
| 5 Email sign-up + OTP verification                        | `fef4f01` (+close-out)        | Hosted custom SMTP + `{{ .Token }}` template + 120s expiry + 6-digit OTP configured; live loop signup → OTP request → verify → `/onboarding` with `email_confirmed_at` set; `npm run verify` green (128 tests); `/ponytail-review`: ship after adding rate-limit + fail-open tests        |
| 6 Sign-in + password/username recovery                    | `99ea3f7` (+close-out)        | Email + username sign-in, recovery scope, password replacement, username reveal, and 10/10-minute rate limit live-verified; both OTP templates confirmed; `npm run verify` green (151 tests); `/ponytail-review`: ship after equalizing username lookup timing                            |

## Live verification evidence (Step 5)

The full loop was driven in a network-enabled local dev server against the hosted Supabase project, using the approved test inbox `nathankneegrow@gmail.com` (never the user's college email):

- `POST /signup` → `POST /api/auth/otp/request` 200 → account created, confirmation email dispatched via custom SMTP.
- "Send a new code" (resend path, no password) → request 200 → fresh challenge recorded.
- Admin `generate_link` minted the current 6-digit confirmation OTP out-of-band (GoTrue's `/verify` `type: "email"` accepts a fresh confirmation token per `internal/api/verify.go`; the mint mirrors what the email contains — SMTP delivery itself remains an operator eyeball check).
- `POST /api/auth/otp/verify` 200 → session cookies attached → browser redirected to `/onboarding`, which the proxy stage guard admitted (`needs_onboarding`).
- Admin API confirmed `email_confirmed_at` and `last_sign_in_at` set on the account.
- Test account deleted immediately; admin list shows 0 remaining matches. Dev server stopped.

Server logs confirmed both request-route 200s and the verify 200; no `[otp]` or `[rate-limit]` errors. The request route took 8–15s per call (SMTP send is synchronous) — acceptable but worth knowing for Step 6's copy timing.

## In flight

Nothing. Step 6 is closed.

## Live verification evidence (Step 6)

- Approved inbox only: `nathankneegrow@gmail.com`; no college address used.
- Hosted temporary email/password account created and assigned username `step6_test`.
- Email sign-in 200 and username sign-in 200; both returned `needs_onboarding`.
- Forgot-password OTP request 200; correct generated email OTP verified 200 and issued a signed, HttpOnly recovery scope bound to the current Supabase session.
- The recovery session received 307 from `/home` to `/forgot-password/reset`, while the reset screen returned 200.
- Password update returned 200, revoked other sessions, rejected the old password with 401, and accepted the new password with 200.
- Forgot-username OTP request and verification returned 200, revealed `step6_test`, and signed out the temporary session.
- Sign-in rate limiter returned ten 401 responses followed by 429 on attempt 11 for a reserved test IP.
- Temporary account deleted in a `finally` cleanup; local dev server stopped.
- `npm run verify`: lint, typecheck, production build, and 151 tests green.
- Ponytail review found one username timing difference; unknown usernames now perform the same admin lookup sequence before the uniform 401. Re-review: ship.
- Operator confirmed the hosted Magic Link template contains `{{ .Token }}` and the two-minute wording.

## Next up

**Step 7 — Google sign-in + same-email enforcement.** Start from the blueprint's Step 7 context brief. Test the same-email password-account collision first. The full Google-enabled real-project matrix remains Launch Gate G4; a clearly labeled Google-disabled real-project fallback may support the step commit if credentials are not yet available. No push without explicit user approval.

## Open blockers (operator, §6)

- [x] Supabase project + keys — DONE (in `.env.local`, gitignored)
- [x] Hosted Step 2 migrations + RLS/Storage verification — DONE (`verify:rls`: 34/34)
- [x] Upstash Redis keys — DONE (in `.env.local`, gitignored; Step 4 rate limiting uses them)
- [x] OTP settings + Confirm sign up `{{ .Token }}` template — DONE (custom SMTP enabled; 120-second expiry; 6 digits; hosted template saved; live-verified in Step 5)
- [x] Magic Link recovery template contains `{{ .Token }}` — DONE (operator confirmed 2026-10-19)
- [x] Real-email OTP delivery smoke test — DONE (Step 5; mint verified the code path, SMTP send returned no provider errors; operator may still eyeball the inbox for the delivered message)
- [ ] Google OAuth credentials (Step 7 / Gate G4)
- [ ] Google Places key or OSM approval (Step 11)
- [ ] Groq key (optional Step 19)
- [x] GitHub remote — DONE (`origin`: `https://github.com/vrbavesh/mannmitra.git`; pushes require explicit user approval)
- [ ] Vercel project (first deploy, after Step 8)
- Launch gates G1–G7 (blueprint §7) block public deploy; none started.

## Key decisions

- **Step 6: Recovery is passwordless email OTP with account creation disabled.** Request responses are byte-identical for unknown, password, and Google-only accounts. Provider state is read only after a correct OTP. Google-only accounts are signed out and receive the mandated calm message.
- **Step 6: Password recovery scope is a signed HttpOnly cookie bound to the Supabase user and exact session ID.** It lasts ten minutes. The proxy admits only `/forgot-password/reset` plus the always-available `/crisis` route; other pages redirect back to reset. Password change uses Supabase Auth, signs out other sessions with `scope: "others"`, keeps the current session, clears the recovery cookie, and routes by stage.
- **Step 6: Username resolution stays inside `POST /api/auth/signin`.** The service-role client maps the normalized username to the auth email. Unknown and known usernames take the same profile and Admin API lookup sequence, then unknown-account and wrong-password failures return the exact same 401 body. There is still no public username lookup route.
- **Step 5: Signup uses server-side Supabase Auth calls.** No password is persisted in browser storage; only email and sent time live in `sessionStorage` for the verify screen. Both new and existing account responses are byte-identical neutral bodies (anti-enumeration). Upstash hashes email+purpose (sha256) for challenge keys — no raw email in Redis — enforces the two-minute request cooldown (1/2 min per email+purpose, 5/10 min per IP) and five verification attempts (5/2 min), and resets the attempt counter on resend. The verify route attaches Supabase session cookies via `@supabase/ssr`'s pending-cookie pattern so the Step 3 proxy admits the session to `/onboarding`. A missing challenge-store record falls back to Supabase's OTP decision; store errors fail open with a loud log (availability over perfect limiting, user-approved).
- **Step 5: OTP code semantics verified against GoTrue source.** `verifyOtp({type: "email"})` matches a fresh confirmation token (`ConfirmationToken`/`ConfirmationSentAt`) and rewrites to the signup-verification path, confirming the user and issuing a session. Both the emailed code and an admin-minted code flow through the same path; the route's `email_confirmed_at` + session gate holds either way. Challenge window is 120s from `recordOtpIssue`; verify rejects stale challenges with `code_expired` before hitting Supabase.
- **Step 4/6: OpenAPI 3.1 contract is the single source of truth.** `contracts/openapi.yaml` defines five routes (`POST /api/auth/signin`, `/api/auth/password`, `/api/screening/sessions`, `/api/auth/otp/request`, `/api/auth/otp/verify`), one error envelope `{error:{code,message,details?}}` with 10 machine codes, and per-status code pins via `allOf`+`const` so a wrong code on the wrong status fails machine validation. `npm run generate:api-types` (pinned `openapi-typescript@7.13.0`) produces `src/generated/api.ts`; the script is committed. Contract tests validate fixtures against the YAML itself with Ajv 2020 (OpenAPI 3.1 = JSON Schema 2020-12), including a self-check that every embedded example matches its schema.
- **Step 4: Zod schemas asserted against generated types.** `src/server/validate.ts` uses `z.ZodType<T>` annotations so tsc fails if the schemas and the contract ever disagree. Request parsing throws the contract's 422 (`validation_failed`) with per-field dotted paths. `src/server/respond.ts` is the serialization boundary: every future route builds JSON through `respond()`, which validates against the contract-derived Zod schema before it reaches the wire.
- **Step 4: Rate limiting backend is Upstash Redis** (sliding-window via `@upstash/ratelimit`), keys in `.env.local`. Documented fallback if Upstash is unavailable: a Supabase counter table via service-role `rpc` increment (never an in-memory Map). Limits: sign-in 10/10 min per IP; OTP request 1/2 min per email+purpose + 5/10 min per IP; OTP verify 5/2 min per email+purpose. Failure posture: fail open on store errors with a loud server log (availability of a wellbeing app beats perfect limiting; counters have TTLs so an outage never wedges users out). `clientIp` relies on the platform (Vercel) setting `x-forwarded-for`.
- **Step 4: `server-only` import guard** on all `src/server/*` modules (invariant #1: service key and secrets never reach client bundles). Vitest aliases `server-only` to an empty stub so tests can import server modules directly.
- Step 3 uses Next.js 16 `src/proxy.ts`, the current name for middleware. It reads a verified Supabase user, then profile, latest pretest, and latest program under RLS; the stage decision uses the profile time zone. `@supabase/ssr` refreshes auth cookies. The `awaiting_start` stage follows the blueprint's documented spec-gap fix. A screening with null severity stays at `needs_pretest`; protected page responses are private and uncached. Route shells contain no user data and will be replaced in their feature steps. API routes are excluded from the proxy and must verify identity and authorization themselves in Step 4 onward.
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
- Gotchas: PowerShell rejects `&&` (use `;`); `.env.local` anon key had a leading space after `=`, trimmed; `npm test` picks up `src/**` and `tests/contract/**` — RLS suite lives in `tests/rls/` with its own config (`vitest.rls.config.mts`) and `verify:rls` script so CI/offline `verify` never hits the network.
