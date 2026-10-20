# Wave B Ponytail audit

Date: 2026-10-20. Scope: completed Steps 5–8, connected foundation, and landing change review. Assumed load: public static landing visits and concurrent authenticated users across multiple Vercel instances, using hosted Supabase and shared Upstash counters.

## What this repo does

MannMitra provides non-clinical wellbeing screening and a thirty-day self-help program. The delivered slice covers its foundation, email signup and recovery, Google account rules, and public landing page. Later program, screening and legal-content routes remain planned shells.

## Review findings and resolution

1. **CSS modules lost their class exports.** The existing Turbopack Tailwind loader matched every CSS file and emitted the new module as global CSS. This left the landing unstyled and its fallback at zero height. The loader now excludes `*.module.css`. Production no-JavaScript, mobile and fallback checks caught the failure and pass after the fix.
2. **Decorative drag cleanup could restart a spring on unmount.** Releasing pointer capture before removing the lost-capture handler could start another animation during cleanup. Listeners now detach first and all springs stop afterwards. Browser checks exercise real mouse capture/release; lifecycle tests cover reduced-motion teardown and observer cleanup.
3. **Reference companions lost their shape and independent motion.** The independent visual review identified coarse, upright companions replacing the source's flattened pebbles. The scene restores detail-1 geometry, flattened proportions, separate orbit/parallax, source orientation and untonemapped mint material. Final visual verdict is recorded with Step 8 verification evidence.

## Connected flows checked

- Followed email signup/resend → request counters → upstream OTP verification → response cookies and onboarding entry. Read request/verification schemas, server-only clients, challenge storage and the related tests. Account-existence/provider-send errors retain the same public response.
- Followed email/username password sign-in → verified user → server stage derivation. Read password recovery's signed, expiring, session-bound scope and revocation of other sessions; username recovery signs out after revealing the username.
- Followed fixed-origin Google PKCE initiation → exchange → same-email rejection → unlink/signout → cookie cleanup. Examined cancellation/failure paths and existing regression tests. The real-provider matrix is in `docs/verification/step7-google-matrix.md`.
- Read proxy route classification, public support access, recovery-only routing, verified identity and private/no-store responses. Stage dates use the profile's timezone. Sampled the ownership/lifecycle migration and compared it with the closed Wave A audit.
- Landing has no account reads, data writes or secrets. HTML content and account links are server-rendered. Scene imports are lazy; rendering stops while hidden/offscreen; low-power, data-saving, reduced-motion and failed/lost WebGL use a static fallback. UI feedback uses transform/opacity below 300ms.
- Checked changed callers, production navigation tests, dependency additions, README/config, contract validation and the final production verification result documented in Step 8 evidence.

## Accepted limitations, already tracked

- Redis failure remains the previously accepted fail-open policy. Counter correctness assumes the host supplies trusted client IP headers. This audit does not change that policy.
- Five high npm audit entries remain in the development-only lint dependency chain, as documented previously; no new production dependency advisory was reported by installation.
- Hosted leaked-password protection, production OAuth verification, legal/age decisions and other launch gates stay open in HANDOFF.md. This is a development-wave audit, not public-launch approval.

## Verdict

The landing code issues found during review are resolved and covered by checks. No additional must-fix finding was confirmed in the connected authentication code reviewed. See `docs/verification/step8-fluid-glass.md` for the final gate, performance and visual-review results.

**Not checked:** no new hosted OTP/Google matrix, RLS execution, deployed-origin test, hardware battery measurement, physical phone or Safari/Firefox run. Prior live evidence was read; later-wave feature shells were not treated as finished functionality.
