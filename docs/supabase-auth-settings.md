# Supabase Auth settings (spec §3.1)

These are dashboard settings, not migrations. The hosted project's state was
checked on 2026-10-19 in Supabase Dashboard → Authentication.

## Email OTP (passwordless sign-in / sign-up)

| Setting                        | Value (spec mandate)                                                    |
| ------------------------------ | ----------------------------------------------------------------------- |
| Secure email change            | enabled, confirmed                                                      |
| Confirm email                  | enabled, confirmed                                                      |
| OTP expiry                     | 120 seconds, configured                                                 |
| OTP length                     | 6 digits, pending (currently 8)                                         |
| Minimum interval between sends | 2 minutes, enforced by the app; Supabase's setting requires custom SMTP |

## Email template content

The spec mandates that the confirmation email contains `{{ .Token }}`, the
6-digit OTP, rather than only a magic link. The **Confirm sign up** template
must contain the token literal, e.g.:

```
Your MannMitra code is {{ .Token }}. It expires in 2 minutes.
```

**Current blocker:** this free Supabase project uses default email delivery.
The dashboard disables template editing unless custom SMTP is configured,
a Send Email hook is used, or the organization upgrades to Pro. The default
confirmation email has not been verified to include `{{ .Token }}`. Configure
one delivery option, set the confirmation template, then run the live Step 5
signup → email → verify → onboarding loop. Set the OTP length to 6 digits
once the delivery path is ready.

## Google provider

- Enabled by operator (Step 1 spec §3.1): Google OAuth client ID + secret.
- Same-email policy and real-project test belong to Step 7.

## Unverified-account cleanup

`pg_cron` migration `20261019042722_cron_cleanup.sql` deletes `auth.users` rows
with `email_confirmed_at is null` older than 24 hours, hourly. This matches spec
§3.2/§13; profiles cascade-delete via the FK.
