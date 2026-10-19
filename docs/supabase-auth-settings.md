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

Hosted state checked 2026-10-19: **disabled**. `GET /auth/v1/settings` returns
`external.google: false` and `GET /auth/v1/authorize?provider=google` returns
`400 Unsupported provider: provider is not enabled`. Client ID and secret in
`.env.local` are only reference copies; the app never reads them.

Operator checklist before the Step 7 live matrix can run:

1. **Supabase Dashboard → Authentication → Providers → Google**: enable it and
   paste the OAuth client ID + secret.
2. **Google Cloud Console → OAuth client**: add the authorized redirect URI
   `https://rgbqzsivegyijacmrfqi.supabase.co/auth/v1/callback`. If the consent
   screen is in testing mode, add the approved test inbox as a test user.
3. **Supabase Dashboard → Authentication → URL Configuration**: keep the Site
   URL in place and allow the app callbacks
   `http://localhost:3000/api/auth/callback` (development) and
   `https://<production-host>/api/auth/callback`.
4. **Supabase Dashboard → Authentication → Settings → Manual linking**:
   enable it. GoTrue gates `DELETE /user/identities/{id}` behind
   `security.manual_linking_enabled` (`requireManualLinkingEnabled`). Without
   it the same-email audit still blocks the sign-in and ends the session, but
   it cannot remove the Google identity from the password account.

### Same-email rule

Supabase Auth links a verified Google email to an existing account with the
same email **before** the app callback (`models.DetermineAccountLinking`
returns `LinkAccount` for one matching user). The app cannot prevent the merge,
so `GET /api/auth/callback` audits the linked identities afterwards:
`src/server/googleIdentity.ts` removes the Google identity and ends the
session, and the callback route never attaches session cookies on that path.
The user lands on `/signin?notice=google_conflict` with the exact spec copy.

## Unverified-account cleanup

`pg_cron` migration `20261019042722_cron_cleanup.sql` deletes `auth.users` rows
with `email_confirmed_at is null` older than 24 hours, hourly. This matches spec
§3.2/§13; profiles cascade-delete via the FK.
