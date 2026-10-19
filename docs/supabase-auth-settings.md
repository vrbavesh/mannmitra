# Supabase Auth settings (operator action, spec §3.1)

These are dashboard settings, not migrations. The operator sets them once in
Supabase Dashboard → Authentication → Providers → Email, and Email Templates.

## Email OTP (passwordless sign-in / sign-up)

| Setting                        | Value (spec mandate)    |
| ------------------------------ | ----------------------- |
| Secure email change            | enabled                 |
| Confirm email                  | enabled                 |
| OTP expiry                     | 120 seconds (2 minutes) |
| OTP length                     | 6 digits                |
| Minimum interval between sends | 60 seconds              |

## Email template content

The spec mandates that the login email contains `{{ .Token }}` — the 6-digit OTP,
NOT a magic link. Edit the **Confirm signup** and **Magic Link** templates so the
body includes the token literal, e.g.:

```
Your MannMitra code is {{ .Token }}. It expires in 2 minutes.
```

Do not remove `{{ .ConfirmationURL }}` handling silently; if the operator prefers
link-based flows for Google-only users, that path is unused — MannMitra signs
users in with the code entered on the verify screen (Step 5).

## Google provider

- Enabled by operator (Step 1 spec §3.1): Google OAuth client ID + secret.
- Same-email policy: a Google sign-in with an existing email+password account
  must NOT create a second profile. The `/api/auth/signin` route (Step 5) checks
  `identities` via the service role and either links the session or returns the
  calm "use the code we emailed you" path. Verified by an integration test
  against the real project (blueprint revision #4).

## Unverified-account cleanup

`pg_cron` migration `20261019000004_cron_cleanup.sql` deletes `auth.users` rows
with `email_confirmed_at is null` older than 24 hours, hourly. This matches spec
§3.2/§13; profiles cascade-delete via the FK.
