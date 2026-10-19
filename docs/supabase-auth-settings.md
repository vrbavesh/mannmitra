# Supabase Auth settings (spec §3.1)

These are dashboard settings, not migrations. The hosted project's state was
checked on 2026-10-19 in Supabase Dashboard → Authentication.

## Email OTP (passwordless sign-in / sign-up)

| Setting                        | Value (spec mandate)                                                    |
| ------------------------------ | ----------------------------------------------------------------------- |
| Secure email change            | enabled, confirmed                                                      |
| Confirm email                  | enabled, confirmed                                                      |
| OTP expiry                     | 120 seconds, configured                                                 |
| OTP length                     | 6 digits, configured                                                    |
| Minimum interval between sends | 2 minutes, enforced by the app; Supabase's setting requires custom SMTP |

## Email template content

The spec mandates that the confirmation email contains `{{ .Token }}`, the
6-digit OTP, rather than only a magic link. The **Confirm sign up** template
must contain the token literal, e.g.:

```
Your MannMitra code is {{ .Token }}. It expires in 2 minutes.
```

Custom SMTP is enabled. The hosted **Confirm sign up** template contains
`{{ .Token }}` and tells the user that the code expires in 2 minutes. The
signup → email → verify → onboarding loop was verified in Step 5.

Step 6 recovery uses Supabase passwordless email OTP, so the hosted **Magic
Link** template must also contain `{{ .Token }}` and the same two-minute
wording. The operator confirmed this hosted template on 2026-10-19. Use only
the user-approved test inbox recorded in `HANDOFF.md`.

## Google provider (Step 7, spec §3.4)

Hosted state re-checked **2026-10-19: ENABLED and verified**. `GET
/auth/v1/settings` returns `"google": true` and `GET
/auth/v1/authorize?provider=google` returns a 302 into `accounts.google.com`
carrying client_id `130150009993-…` with `redirect_uri` =
`https://rgbqzsivegyijacmrfqi.supabase.co/auth/v1/callback`; fetched
anonymously that Google URL answers 302 with no `redirect_uri_mismatch` or
`invalid_client`, so the client and its authorized redirect URI are correct.
Manual linking was verified by probe rather than by reading the toggle: a
temporary confirmed password account was signed in, then `DELETE
/auth/v1/user/identities/{id}` returned `422 single_identity_not_deletable`
(handler reached) instead of `manual_linking_disabled`. Client ID and secret in
`.env.local` remain reference copies only; the app never reads them.

What was configured (all four items done):

1. **Supabase Dashboard → Authentication → Sign In / Providers → Google**:
   enabled, with the OAuth client ID and secret pasted in. (Older dashboards
   exposed these base options under Authentication → Settings; the current
   dashboard moved them onto the Sign In / Providers page.)
2. **Google Cloud Console → OAuth client**: authorized redirect URI
   `https://rgbqzsivegyijacmrfqi.supabase.co/auth/v1/callback` added, and the
   approved test inbox added as a test user if the consent screen is still in
   testing mode.
3. **Supabase Dashboard → Authentication → URL Configuration**: Site URL kept,
   and the app callback `http://localhost:3000/api/auth/callback` allowed in
   addition to the production host. This one cannot be verified from outside —
   GoTrue echoes `redirect_to` verbatim even for a bogus domain, so only a
   completed flow proves the entry took effect.
4. **Supabase Dashboard → Authentication → Sign In / Providers → Allow manual
   linking**: enabled. GoTrue gates `DELETE /user/identities/{id}` behind
   `security.manual_linking_enabled` (`requireManualLinkingEnabled`). Without
   it the same-email audit still blocks the sign-in and ends the session, but
   it cannot remove the Google identity from the password account.

### Same-email rule

Supabase Auth links a verified Google email to an existing account with the
same email **before** the app callback (`models.DetermineAccountLinking`
returns `LinkAccount` for one matching user). The app cannot prevent the merge,
so `GET /api/auth/callback` audits the linked identities afterwards:
`src/server/googleIdentity.ts` removes the Google identity and ends the
session, and the callback route withholds all new session credentials on that path.
It expires existing project auth cookies as well, so a prior browser session
does not survive the rejected sign-in. Unrelated cookies are left alone.
The user lands on `/signin?notice=google_conflict` with the exact spec copy.

The real Google-enabled three-case matrix passed on 2026-10-19. New and
returning Google users reached `/onboarding`, proving the localhost callback
allowlist in completed flows. The password-account collision was rejected,
its Google identity removed, and its session ended. Both temporary accounts
were cleaned up. See [the verification report](verification/step7-google-matrix.md).

## Unverified-account cleanup

`pg_cron` migration `20261019042722_cron_cleanup.sql` deletes `auth.users` rows
with `email_confirmed_at is null` older than 24 hours, hourly. This matches spec
§3.2/§13; profiles cascade-delete via the FK.
