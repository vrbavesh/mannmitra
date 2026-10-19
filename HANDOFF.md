# HANDOFF.md — MannMitra status report

> Rewritten at every step close-out and session hand-off. Committed with the step's closing commit.
> Fresh agent: start from "Next up" + the blueprint's Context Brief for that step.

## Where we are

**Wave B — Step 6 COMPLETE. Step 7 CODE COMPLETE and locally verified; the Supabase dashboard configuration is now DONE and independently verified (Google provider live, Google client accepted, manual linking enabled). The real same-email matrix (Launch Gate G4) has NOT run: nothing has ever been signed in through Google. Exactly one hosted account exists, seeded as the prepared case (c) collision target (id `11167e6f-03fa-4578-afb6-8cd6dfc02de3`, `email` identity only). Wave A retrospective audit remediation is complete: all seven findings resolved, hosted ownership/lifecycle migration applied, Ponytail diff review: Ship. Last verification is green (lint, typecheck, build, 172 unit/contract tests, 3 production browser checks); hosted RLS passes 58 tests. Nothing is pushed: local `main` is 6 commits ahead of `origin/main`.**

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

**Step 7 implementation done; dashboard configured and verified; the live matrix is the only thing left (2026-10-19).** Working on `main`; nothing pushed; HEAD `663ac50`. Built per spec §3.4 and the blueprint:

- `GET /api/auth/google` starts Supabase Google OAuth with PKCE (`skipBrowserRedirect`, fixed `redirectTo` = this origin's `/api/auth/callback`, `prompt=select_account`). Live check: 302 to the Supabase authorize URL with the right `provider`, `redirect_to`, `code_challenge`, and three PKCE verifier cookies; `Cache-Control: private, no-store`.
- `GET /api/auth/callback` exchanges the code, then runs the same-email audit. Conflict path = unlink the Google identity, end the session, and attach NO cookies (the browser never receives a session); user lands on `/signin?notice=google_conflict` with the exact spec copy. Cancellation (`?error=`) and failed exchanges land on `/signin` with calm notices. Live checks: all three failure paths returned 302 with zero cookies.
- `src/server/googleIdentity.ts` holds the rule; `src/components/auth/GoogleButton.tsx` + `SigninForm.tsx` + `/signup` render the provider button and the calm notices.
- Contract: two new redirect-only paths in `contracts/openapi.yaml`; generated types refreshed and prettier-formatted (the `generate:api-types` script now formats its output).
- Dashboard checklist in `docs/supabase-auth-settings.md` (all four items now marked done): enable the provider, add the Google redirect URI, allow the app callback URLs, and **enable manual linking** (GoTrue gates `DELETE /user/identities/{id}` behind `security.manual_linking_enabled`).

Dashboard configuration — COMPLETE and verified from outside the dashboard (2026-10-19):

- Provider live: `GET /auth/v1/settings` returns `"google": true` (`email` also true; anonymous sign-ins and phone off; `mailer_autoconfirm: false`, so confirm-email is still required).
- Client pair registered: `GET /auth/v1/authorize?provider=google` returns 302 into `accounts.google.com` carrying client_id `130150009993-…` and `redirect_uri=https://rgbqzsivegyijacmrfqi.supabase.co/auth/v1/callback`; fetched anonymously, that Google URL returns 302 with no `redirect_uri_mismatch` or `invalid_client` — so the Google Cloud client **and** its authorized redirect URI are correct.
- Manual linking enabled: proved by probe rather than by reading a toggle. A temporary confirmed password account was created, signed in through the password grant, then `DELETE /auth/v1/user/identities/{id}` with that session returned **422 `single_identity_not_deletable`**. Reaching handler validation means `requireManualLinkingEnabled` passed; a project with manual linking off answers `manual_linking_disabled` instead. The temporary account was deleted and the list returned to 0.
- **Not** verifiable from outside: the `http://localhost:3000/api/auth/callback` entry in URL Configuration. GoTrue echoes `redirect_to` verbatim even for a bogus external domain, so authorization-time reflection proves nothing here; only a completed flow shows whether the value survives to the callback. If the localhost entry is missing, Google returns to the Site URL instead of the localhost callback and case (a) fails visibly.

Research that shaped the design (verified against upstream source, not memory):

- Automatic same-email linking happens in Supabase Auth _before_ the app callback (`models.DetermineAccountLinking` → `LinkAccount` for one matching user), so the merge cannot be prevented and must be undone. The installed SDK has no Admin unlink; the only route is `supabase.auth.unlinkIdentity`, which needs a signed-in session with 2+ identities and manual linking enabled.
- When an _unconfirmed_ email account is reached by Google, GoTrue clears the password and removes the email identity (`RemoveUnconfirmedIdentities` sets `EncryptedPassword = nil`), so there is no password account left to block; the identity check correctly allows it.
- Hosted precondition verified with a temporary admin-created account: password accounts carry exactly one `email` identity and `app_metadata.provider = "email"` (account deleted, 0 left).

Still open: the real matrix itself. The prepared hosted state and the exact run order are in "Next up"; the case (c) collision target is already seeded and waiting.

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

## Live verification evidence (Step 7, matrix still pending)

Local dev server against the hosted project, approved inbox only (`nathankneegrow@gmail.com`), 2026-10-19:

- Provider probe: `GET /auth/v1/settings` → `"google": true`; `GET /auth/v1/authorize?provider=google` → 302 into Google with client_id `130150009993-…` and Supabase's own `redirect_uri`. An anonymous fetch of that Google URL returns 302 with no client or redirect error.
- Manual-linking probe: temp confirmed password account → password-grant sign-in → `DELETE /auth/v1/user/identities/{id}` → `422 single_identity_not_deletable` (gate passed). Temp account deleted; list back to 0.
- Startup precondition probe: `POST /auth/v1/admin/users` with `email_confirm: true` yields exactly one `email` identity and `app_metadata.providers = ["email"]`, which is the shape case (c) needs. (The admin list endpoint omits `identities`, so read each user by id — `GET /auth/v1/admin/users/{id}` — to see them.)
- `GET /api/auth/google` → 302; `provider=google`, `redirect_to=http://localhost:3000/api/auth/callback`, `code_challenge` present, `prompt=select_account`, three `sb-*-code-verifier` cookies, `private, no-store`.
- `GET /api/auth/callback?error=access_denied` → 302 `/signin?notice=google_cancelled`, no cookies.
- `GET /api/auth/callback` (no code) → 302 `/signin?notice=google_failed`, no cookies.
- `GET /api/auth/callback?code=not-a-real-code` → 302 `/signin?notice=google_failed`, no cookies.
- `/signin?notice=google_conflict` renders the exact spec copy in a calm amber card, above the Google button and the email form; `/signin` is a dynamic route (`instant = false`) because the notice arrives in the query string.
- Hosted identity shape: an admin-created confirmed password account exposes exactly one `email` identity and `app_metadata.provider = "email"`; that account was deleted, 0 remaining.
- Seeded case (c) target, verified present right before this handoff: `11167e6f-03fa-4578-afb6-8cd6dfc02de3`, `nathankneegrow@gmail.com`, identities `email` only (`17bd4010-2fb0-4cb8-8f40-a62064fa1410`), `email_confirmed_at` set, `last_sign_in_at` null — i.e. nobody has signed in through Google yet, so the matrix below is genuinely unrun.
- `npm run verify`: lint, typecheck, build, 172 tests, 3 browser checks green. Ponytail diff review: ship after (1) making the "session ended" wording honest (best effort, no cookie ever reaches the browser) and (2) logging the start-route failure code instead of failing silently.

## Next up

**Codex: run the 3-case matrix, then close Step 7.** Dashboard config is done and verified (see "In flight"); the hosted project is clean apart from the seeded case (c) target. Gate G4 needs real Google credentials; a provider-disabled fallback is not acceptable proof.

Prepared state: exactly one hosted account exists — id `11167e6f-03fa-4578-afb6-8cd6dfc02de3`, `nathankneegrow@gmail.com`, identity `email` only, `email_confirmed_at` set, never signed in. It is the case (c) collision target. A dev server was started on `http://localhost:3000` from this repo (run `npm run dev` if it is no longer up). The browser profile has no Google session, so the first flow asks for the password once; later flows are one click.

Run in this order — case (c) first, so there is only one pause:

1. **Case (c) — same-email conflict.** Nothing is signed in. Open `http://localhost:3000/signin`, click Continue with Google, choose `nathankneegrow@gmail.com`.
   - Pass: lands on `/signin?notice=google_conflict` with the exact spec copy ("An account with this email already exists. Please sign in with your email and password."), **and** `http://localhost:3000/home` afterwards bounces back to `/signin` — proof that no session cookie was ever attached.
   - Verify in hosted data: the seeded account still exists with **only** the `email` identity; the auto-linked `google` identity must be gone.
   - If it lands anywhere else, or `/home` lets the user in, stop and fix `src/server/googleIdentity.ts` / `src/app/api/auth/callback/route.ts` before running anything else.
2. **Delete the seeded account and confirm the user list is empty.** This step is the trap: while a password account exists for that email, Google auto-links and the app correctly blocks, so case (a) can never create a new user. `DELETE /auth/v1/admin/users/11167e6f-03fa-4578-afb6-8cd6dfc02de3` with the service-role key.
3. **Case (a) — new user.** From `/signin`, Continue with Google again.
   - Pass: lands on `/onboarding`. (Onboarding is still the Step 3 placeholder, so that is the correct destination; the real form arrives in a later step.)
   - Verify: exactly 1 user, a `google` identity **only**, `email_confirmed_at` set, fresh `created_at`.
4. **Case (b) — returning user.** There is no sign-out UI yet, so drop the session by hand: on `http://localhost:3000`, open DevTools → Console and run
   `document.cookie.split(';').forEach(c => { const n = c.split('=')[0].trim(); document.cookie = n + '=; Max-Age=0; path=/'; }); location.href = '/signin';`
   (or DevTools → Application → Storage → Clear site data), then Continue with Google again.
   - Pass: lands on `/onboarding` again. Because onboarding is still a placeholder the URL is *identical* to case (a), so the URL proves nothing on its own — the proof is hosted data: still exactly **1** user, the **same id** as case (a), `last_sign_in_at` moved, and **no second account** created.
5. **Cleanup and close-out.** Delete every temporary account; confirm 0 remain. Stop the dev server, then re-run `npm run verify` (lint, typecheck, build, 172 tests, 3 browser checks). Rewrite this HANDOFF as the Step 7 close-out with the matrix results, append the AGENTS.md progress line, correct the Google section of `docs/supabase-auth-settings.md` (it is already updated to "enabled" as of this handoff), and commit. Push only with explicit user approval — that push would carry `663ac50` plus the 5 earlier unpushed commits.

Helper scripts used for the probes above live in the approved temp dir (`step7-state.ps1`, `step7-config-probe3.ps1`, `step7-seed-casec.ps1`) and must never be committed.

## Open blockers (operator, §6)

- [x] Supabase project + keys — DONE (in `.env.local`, gitignored)
- [x] Hosted Step 2 migrations + audit remediation + RLS/Storage verification — DONE (six migrations; `verify:rls`: 58/58)
- [x] Upstash Redis keys — DONE (in `.env.local`, gitignored; Step 4 rate limiting uses them)
- [x] OTP settings + Confirm sign up `{{ .Token }}` template — DONE (custom SMTP enabled; 120-second expiry; 6 digits; hosted template saved; live-verified in Step 5)
- [x] Magic Link recovery template contains `{{ .Token }}` — DONE (operator confirmed 2026-10-19)
- [x] Real-email OTP delivery smoke test — DONE (Step 5; mint verified the code path, SMTP send returned no provider errors; operator may still eyeball the inbox for the delivered message)
- [x] Google OAuth dashboard config (Step 7) — DONE (verified 2026-10-19 from outside the dashboard: `settings.google: true`; authorize 302 into Google carrying client_id `130150009993-…` and Supabase's `redirect_uri`; manual linking proved enabled by the unlink probe). The URL Configuration entry for `http://localhost:3000/api/auth/callback` stays unproved until one real flow completes.
- [ ] Gate G4 same-email matrix (Step 7 close-out) — prepared and deliberately unrun; exact run order, expected results, and the seeded case (c) target are in "Next up".
- [ ] Google Places key or OSM approval (Step 11)
- [ ] Groq key (optional Step 19)
- [x] GitHub remote — DONE (`origin`: `https://github.com/vrbavesh/mannmitra.git`; pushes require explicit user approval)
- [ ] Vercel project (first deploy, after Step 8)
- [ ] Step 18 Auth hardening: latest hosted advisor flags leaked-password protection disabled; review [Supabase's setting](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Launch gates G1–G7 (blueprint §7) block public deploy; none started.

## Key decisions

- **Step 7: Google sign-in uses PKCE through Supabase Auth with an app-side same-email audit.** Supabase links a verified Google email to an existing account before the app sees the callback, so `GET /api/auth/callback` audits identities afterwards: with both a `google` and an `email` identity it unlinks the Google identity, ends the session (best effort), and attaches no cookies, so no session ever reaches the browser. The user lands on `/signin?notice=google_conflict` with the exact spec copy. Failures are logged as codes only. `GET /api/auth/google` fixes the return target to this origin's callback; nothing in the request can steer it.
- **Step 7: Google users skip the unverified stage naturally.** GoTrue confirms the account when the provider email is verified, so the Step 3 proxy's `email_confirmed_at` gate already routes them by stage (`needs_onboarding` → `/onboarding`, otherwise the stage page). New Google users get `display_name` from `raw_user_meta_data.full_name` and `auth_provider = 'google'` from the existing trigger; the onboarding name prefill belongs to Step 8.
- **Step 7: `/signin` is dynamic.** It reads `?notice=` for the calm Google notices (`instant = false`), so the conflict copy is server-rendered instead of set in an effect (which the React Compiler lint rejects).
- **Step 7: `npm run generate:api-types` now prettier-formats its output.** The committed `src/generated/api.ts` was 2-space formatted, so a raw regeneration produced a 1,300-line noise diff; the script ends with `prettier --write` to keep the diff honest.
- **Step 7: manual linking was verified by probing the endpoint, not by reading the dashboard toggle.** `DELETE /auth/v1/user/identities/{id}` with a real session answered `422 single_identity_not_deletable`, which means the request cleared `requireManualLinkingEnabled`; a project with manual linking off answers `manual_linking_disabled` instead. Reuse this probe whenever that setting's state is in doubt, since no settings endpoint exposes it.
- **Step 7: case (c) has to run before cases (a)/(b), and its target account has to be deleted in between.** Supabase auto-links a verified Google email to any matching password account, so while that account exists a Google sign-in is *always* a conflict — case (a) cannot produce a new user until it is gone. Getting this order wrong looks like a case (a) failure but is correct behaviour.

- **Wave A audit remediation, 2026-10-19:** composite ownership foreign keys cover every program/session reference. Programs, reports, and risk events are read-only to ordinary clients. Steps 11/12/16 must implement their writers through authenticated server operations with ownership, screening-kind, timing, and stage checks; do not re-enable direct client lifecycle mutations. Mood program deletion clears only `program_id`, preserving `user_id`. Hosted migration `20261019123332` is recorded locally with the connector's canonical version.
- **Wave A test gate:** `npm run verify` now includes three Playwright checks against the production build. Browser artifacts are excluded from lint. The hosted RLS suite remains a separate network-enabled command (58 tests), with storage cleanup and cascade assertions. Local Supabase Auth settings/templates were statically checked; no local Docker/CLI is installed for an email runtime test.
- **Step 6: Recovery is passwordless email OTP with account creation disabled.** Request responses are byte-identical for unknown, password, and Google-only accounts. Provider state is read only after a correct OTP. Google-only accounts are signed out and receive the mandated calm message.
- **Step 6: Password recovery scope is a signed HttpOnly cookie bound to the Supabase user and exact session ID.** It lasts ten minutes. The proxy admits only `/forgot-password/reset` plus the always-available `/crisis` route; other pages redirect back to reset. Password change uses Supabase Auth, signs out other sessions with `scope: "others"`, keeps the current session, clears the recovery cookie, and routes by stage.
- **Step 6: Username resolution stays inside `POST /api/auth/signin`.** The service-role client maps the normalized username to the auth email. Unknown and known usernames take the same profile and Admin API lookup sequence, then unknown-account and wrong-password failures return the exact same 401 body. There is still no public username lookup route.
- **Step 5: Signup uses server-side Supabase Auth calls.** No password is persisted in browser storage; only email and sent time live in `sessionStorage` for the verify screen. Both new and existing account responses are byte-identical neutral bodies (anti-enumeration). Upstash hashes email+purpose (sha256) for challenge keys — no raw email in Redis — enforces the two-minute request cooldown (1/2 min per email+purpose, 5/10 min per IP) and five verification attempts (5/2 min), and resets the attempt counter on resend. The verify route attaches Supabase session cookies via `@supabase/ssr`'s pending-cookie pattern so the Step 3 proxy admits the session to `/onboarding`. A missing challenge-store record falls back to Supabase's OTP decision; store errors fail open with a loud log (availability over perfect limiting, user-approved).
- **Step 5: OTP code semantics verified against GoTrue source.** `verifyOtp({type: "email"})` matches a fresh confirmation token (`ConfirmationToken`/`ConfirmationSentAt`) and rewrites to the signup-verification path, confirming the user and issuing a session. Both the emailed code and an admin-minted code flow through the same path; the route's `email_confirmed_at` + session gate holds either way. Challenge window is 120s from `recordOtpIssue`; verify rejects stale challenges with `code_expired` before hitting Supabase.
- **Step 4/6/7: OpenAPI 3.1 contract is the single source of truth.** `contracts/openapi.yaml` defines seven routes (`POST /api/auth/signin`, `/api/auth/password`, `/api/screening/sessions`, `/api/auth/otp/request`, `/api/auth/otp/verify`, plus the redirect-only `GET /api/auth/google` and `GET /api/auth/callback` from Step 7), one error envelope `{error:{code,message,details?}}` with 10 machine codes, and per-status code pins via `allOf`+`const` so a wrong code on the wrong status fails machine validation. `npm run generate:api-types` (pinned `openapi-typescript@7.13.0`) produces `src/generated/api.ts`; the script is committed. Contract tests validate fixtures against the YAML itself with Ajv 2020 (OpenAPI 3.1 = JSON Schema 2020-12), including a self-check that every embedded example matches its schema.
- **Step 4: Zod schemas asserted against generated types.** `src/server/validate.ts` uses `z.ZodType<T>` annotations so tsc fails if the schemas and the contract ever disagree. Request parsing throws the contract's 422 (`validation_failed`) with per-field dotted paths. `src/server/respond.ts` is the serialization boundary: every future route builds JSON through `respond()`, which validates against the contract-derived Zod schema before it reaches the wire.
- **Step 4: Rate limiting backend is Upstash Redis** (sliding-window via `@upstash/ratelimit`), keys in `.env.local` required for working limits. No Supabase counter fallback is implemented. Limits: sign-in 10/10 min per IP; OTP request 1/2 min per email+purpose + 5/10 min per IP; OTP verify 5/2 min per email+purpose. Accepted failure posture: fail open on missing keys/store errors with a loud server log; setup instructions now make this explicit. `clientIp` relies on the platform (Vercel) setting `x-forwarded-for`.
- **Step 4: `server-only` import guard** on all `src/server/*` modules (invariant #1: service key and secrets never reach client bundles). Vitest aliases `server-only` to an empty stub so tests can import server modules directly.
- Step 3 uses Next.js 16 `src/proxy.ts`, the current name for middleware. It reads a verified Supabase user, then profile, latest pretest, and latest program under RLS; the stage decision uses the profile time zone. `@supabase/ssr` refreshes auth cookies. The `awaiting_start` stage follows the blueprint's documented spec-gap fix. A screening with null severity stays at `needs_pretest`; protected page responses are private and uncached. Route shells contain no user data and will be replaced in their feature steps. API routes are excluded from the proxy and must verify identity and authorization themselves in Step 4 onward.
- GitHub remote `origin` is configured. Commit every completed step after its gate and status close-out; push only with explicit user approval.
- **Hosted migrations applied through the Supabase connector.** Supabase assigned the canonical remote versions, and local filenames were aligned to them so future CLI migration history stays consistent: `20261019042648` through `20261019043230`.
- Current Supabase guidance uses explicit `to authenticated` policies and `(select auth.uid())`; deprecated `auth.role()` was removed before apply. A fifth migration revokes Data API execution of trigger-only `security definer` functions and indexes foreign keys. The sixth enforces linked ownership and protects lifecycle mutations. The latest security advisor flags leaked-password protection disabled (recorded above); fresh-index “unused” performance notices are expected on the empty schema.
- The hosted RLS suite now uses unique, self-cleaning task-template fixtures and treats revoked screening writes as the expected `42501` failure. Final cleanup check: zero `rls-*` auth users, profiles, or `__rls_test_*` templates.
- **Spec truncation reconstructions** (spec .md line-wrapped mid-expression): `username_format` = `^[a-z0-9_]{3,20}$` (spec §4); `saved_items.kind` 4th value = `'strength'` (§4 "strengths list" + "set strength"); `risk_events.reason` = `'safety_answer','severe_score'` (§6 gate); programs.track 3rd = `'negative_thinking'`; severity = `'minimal','mild','moderate','severe'`. Flag for review if any later step disagrees.
- `@testing-library/react` version in package.json corrected to installed `^16.3.3` (my hand-written `^16.4.0` didn't exist and broke `npm install`; also synced jsdom/prettier/playwright ranges to lockfile reality).
- `npm install @supabase/supabase-js` added (Step 5+ need it; RLS suite uses it now).
- npm audit: 5 highs all `braces` dev-only lint-chain advisory, accepted (fix = downgrade eslint-config-next, rejected).
- `npm run typecheck` = `next typegen && tsc --noEmit` (Next 16 `LayoutProps` types don't exist pre-build).
- jsdom lacks `HTMLDialogElement.showModal`; stubbed in `vitest.setup.ts`.
- Spec says "Gemini or Groq" (both occurrences edited); plan defaults to Groq.
- Gotchas: PowerShell rejects `&&` (use `;`); `.env.local` anon key had a leading space after `=`, trimmed; `npm test` picks up `src/**` and `tests/contract/**` — RLS suite lives in `tests/rls/` with its own config (`vitest.rls.config.mts`) and `verify:rls` script so CI/offline `verify` never hits the network.
