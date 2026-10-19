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

## Google provider

- Enabled by operator (Step 1 spec §3.1): Google OAuth client ID + secret.
- Same-email policy and real-project test belong to Step 7.

## Unverified-account cleanup

`pg_cron` migration `20261019042722_cron_cleanup.sql` deletes `auth.users` rows
with `email_confirmed_at is null` older than 24 hours, hourly. This matches spec
§3.2/§13; profiles cascade-delete via the FK.
