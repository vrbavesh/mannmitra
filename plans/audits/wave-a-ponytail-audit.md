# Wave A Ponytail audit

Date: 2026-10-19. Reviewed revision: `6de35c9` on `main`.

Follow-up audit: `8dbad7a`, 2026-10-19. Application code is unchanged. Read-only hosted catalog checks now confirm findings 1–2 against the MannMitra Supabase project; they are not based solely on migration files.

What this repo does: MannMitra is a wellbeing screening and self-help app. Wave A supplies its design primitives, database isolation, stage guard, and API conventions. This audit assumes multiple unrelated users accessing a shared Supabase project through a serverless Next.js deployment.

Scope: Steps 1–4 as they exist in the current repository, including changes to those foundations made during Steps 5–6. This is a retrospective audit, not an assertion that every finding existed at the end of Step 4. No earlier Wave A audit was found in the project records.

## Must fix

1. **Ownership checks do not protect links between records** (`supabase/migrations/20261019042658_rls_policies.sql:22`, `supabase/migrations/20261019042648_init_schema.sql:77`, `:103`, `:172`).
   - **What this is:** Row level security (RLS) decides which rows a signed-in user may read or write. Foreign keys connect programs, screenings, and user content.
   - **Problem:** The policy checks only the new row's `user_id`; the foreign keys check only that the linked ID exists. Given B's program UUID, A can insert a journal with `user_id=A` and `program_id=B`; given B's screening UUID, A can reference it from A's program or risk event. The latter references can prevent B's account deletion because the screening foreign keys use the default no-action deletion rule. The existing tests reject `user_id=B` but never test `user_id=A` with a link to B.
   - **Fix:** Enforce matching owners on every program/session reference using ownership constraints or database checks covering inserts and updates. Add hosted negative tests for mixed-owner references and account deletion; server-owned tables should also lose direct client mutation permissions.
   - **If we skip it:** The data graph can cross account boundaries, and one account can obstruct another account's deletion if a target UUID is known. This does not by itself prove that another user's row contents can be read.

2. **Clients can forge the program state trusted by the stage guard** (`supabase/migrations/20261019042658_rls_policies.sql:15`, `src/lib/stage.ts:62`).
   - **What this is:** The stage guard reads program dates and screening links to decide whether someone is active, ready for a posttest, or finished.
   - **Problem:** Authenticated users have all mutation rights on their own programs. A user with a non-severe pretest can create or update a program with an old `start_date` to immediately reach `needs_posttest`, or set `post_session_id` to their own existing pretest ID to become `completed`. There is no check for a posttest's kind, owner, or relationship to that program. Reports and risk events are also client-writable despite representing calculated or safety history.
   - **Fix:** Make program lifecycle fields, reports, and risk events read-only to ordinary clients. Write them through authorized server operations that check screening kind, ownership, timing, and allowed transitions; add direct-client rejection tests now, with feature writers added in their planned steps.
   - **If we skip it:** Later features inherit bypassable dates and completion states. The severe-pretest branch still blocks severe users; this finding does not claim that changing a program alone bypasses that branch.

3. **Input boundaries and placeholders fail the agreed contrast requirement** (`src/components/ui/Input.tsx:35`, `src/app/globals.css`).
   - **What this is:** Inputs use the shared border and placeholder colors across authentication screens.
   - **Problem:** The `#d5d1c2` input border has only 1.50:1 contrast against the `#fdfdfb` surface and 1.44:1 against the page background, below the 3:1 requirement for a boundary needed to identify the control. Placeholder text `#a0a099` is 2.58:1 against the surface, below 4.5:1 for normal text. The input fill is also almost indistinguishable from the page background.
   - **Fix:** Use darker dedicated input-border and placeholder tokens that meet these ratios. Keep decorative card borders independent; verify default, error, and focus states.
   - **If we skip it:** Users with low vision can struggle to identify fields and read their hints. The foundation cannot be called WCAG AA compliant on controls.

## Should fix

4. **The browser smoke test is stale and excluded from the green gate** (`e2e/smoke.spec.ts:6`, `package.json`).
   - **What this is:** The only Playwright test checks the original scaffold email field and Continue button.
   - **Problem:** The root page now has account links, so the test fails on `getByLabel('Email')` on both its first run and retry. `npm run verify` excludes Playwright, so its success did not catch this regression after the entry-screen fix.
   - **Fix:** Change the smoke test to follow both entry links and assert their destination forms. Run it as a separate required browser gate whenever entry routes or shared controls change.
   - **If we skip it:** A passing standard gate continues to provide no working browser journey evidence.

5. **Local Supabase Auth settings do not reproduce the required behavior** (`supabase/config.toml:183`, `:227`, `:231`, `:235`).
   - **What this is:** The checked-in configuration supplies Auth behavior when the local Supabase stack is started.
   - **Problem:** It permits six-character passwords, disables email confirmation, allows resend after one second, and expires OTPs after one hour. The app requires eight characters, confirmation, a two-minute resend interval, and two-minute expiry. Direct Auth clients bypass application-only validation, and a fresh local stack cannot reproduce the hosted signup gate.
   - **Fix:** Align those local values with the required settings and provide local confirmation/Magic Link templates containing the six-digit token. Verify local Auth behavior separately from hosted dashboard settings.
   - **If we skip it:** Developers test a different security and verification model locally. This finding does not assert that the hosted project's current settings are wrong.

6. **Environment instructions promise a rate-limit fallback that does not exist** (`.env.example:6`, `src/server/rateLimit.ts:85`).
   - **What this is:** The environment example tells an operator to leave Upstash keys empty to use Supabase counters.
   - **Problem:** No counter table or fallback call exists. Empty keys make Redis initialization fail, and the catch permits every request. The accepted fail-open outage policy is documented, but these setup instructions silently turn a missing configuration into permanently disabled application limits.
   - **Fix:** Correct the environment example and setup instructions to require Upstash for working application limits, and clearly describe the accepted outage behavior. Do not implement a second backend unless the project chooses to require it.
   - **If we skip it:** A fresh deployment can appear correctly configured while sign-in and OTP application limits never operate.

7. **Shared controls violate the motion contract** (`src/components/ui/Progress.tsx:27`, `src/components/ui/Button.tsx:40`).
   - **What this is:** Progress and button feedback are shared foundation components.
   - **Problem:** Progress animates `width` over exactly 300ms; buttons animate background and text colors. AGENTS.md requires transform/opacity-only motion and UI durations below 300ms. The global reduced-motion rule does suppress these transitions, so reduced-motion support itself is present.
   - **Fix:** Give the progress fill full width and animate `scaleX` from the left in less than 300ms. Limit button transitions to transform/opacity and make color changes instantaneous.
   - **If we skip it:** Every future consumer inherits motion that fails the project's explicit gate; width animation also performs layout work.

## Verification and limits

- Read the five migrations, RLS test suite, stage logic, proxy and proxy tests, shared UI primitives and tests, API validation/error/response/rate-limit helpers, contract tests, build/test/deploy configuration, README, environment example, and relevant blueprint/spec sections.
- `npm run verify`: passed lint, type generation, TypeScript, production build, and all 151 tests across 16 files.
- `npm run test:e2e`: the one smoke test failed on the missing Email field on both attempts; Playwright error contexts corroborate the rendered account links. The runner stalled after its failures and was interrupted, so this is not a clean completed browser-suite run.
- An initial concurrent verify attempt hit an ESLint directory scan race while Playwright recreated `test-results`; a subsequent standalone verify passed. This runner interaction is recorded rather than represented as an application failure.
- Contrast ratios were calculated from the checked-in sRGB tokens using relative luminance.
- Follow-up: queried hosted `pg_policies`, `pg_constraint`, `information_schema.role_table_grants`, and non-internal public-table triggers through the Supabase connector. Programs, reports, and risk events have authenticated INSERT/UPDATE/DELETE privileges with owner-only ALL policies. References match the single-column foreign keys in the migrations; no public-table ownership triggers exist. This confirms the reported missing protections in the live configuration. No personal row contents were queried.
- Follow-up: Supabase's hosted security advisor returned an empty lint list. This automated check does not clear application ownership/lifecycle rules; the catalog evidence above still applies.
- Follow-up: an assert-based check called the actual `deriveStage` implementation. A same-day non-severe program returned `active`; changing its start date to 2026-09-01 returned `needs_posttest`; setting an existing pretest ID as `postSessionId` returned `completed`.
- No hostile rows were inserted into the hosted project during either audit. The earlier 34-test hosted RLS result remains historical evidence, not a fresh run, and lacks the mixed-owner/lifecycle cases described above. The 151-test verification and stale browser-smoke failure above were run on identical application code in the immediately preceding audit and were not needlessly repeated.
- Known accepted choices, including fail-open rate limiting during an outage and explicit local-date writes for moods, are not counted as new findings. Planned route shells and unbuilt later features are not counted as Wave A defects.

Verdict: Fix first. Wave A's retrospective audit gate is open until findings 1–3 are resolved and the remaining findings are triaged. Do not describe Wave A as audit-passed.

Not checked: A fresh hosted RLS run, malicious writes against real accounts, hosted Auth dashboard settings, sustained concurrency/load, dependency advisory refresh, full keyboard/screen-reader testing, and later feature implementations. Hosted catalog drift was checked for the reported ownership/lifecycle findings. This audit changes no application code or hosted settings.
