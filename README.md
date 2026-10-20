# MannMitra

A mental wellbeing screening and 30-day self-help app for young adults in India.

## Run locally

Install the locked dependencies with `npm ci`, copy `.env.example` to `.env.local`, and configure the Supabase URL, anon key, service role key, and both Upstash values. Keep `.env.local` private. Run `npm run dev` and open http://localhost:3000.

Upstash is required for working application rate limits. No Supabase counter fallback is implemented. Missing keys and Redis outages use the accepted fail-open policy: requests continue and the server logs the failure. Do not deploy with blank Upstash values.

The app normally uses the hosted Supabase project. `supabase/config.toml` configures a separate local Supabase stack: eight-character passwords, required email confirmation, six-digit codes, two-minute expiry and resend interval, and token email templates. Local email is captured in Supabase's local inbox. These files do not change hosted Auth settings; configure those separately.

## Verification

- `npm run verify`: lint, typecheck, production build, unit/contract tests, and the required Playwright browser smoke gate.
- `npm run test:e2e`: entry navigation, rendered control contrast, mobile reduced-motion checks, and public support without JavaScript against the production build. Run `npm run build` first when using this command on its own. Install the Chromium browser once with `npx playwright install chromium` if needed.
- `npm run verify:rls`: separate network-enabled regression suite against the configured Supabase project. Uses temporary synthetic accounts and removes its rows and storage fixtures. Requires a service role key; never use it in browser code.

Run verification commands sequentially because Next.js build and development servers share generated files. Browser artifacts are ignored by Git and lint.

Programs, reports, risk events, and screening rows are read-only to ordinary clients. Planned feature writers must use authorized server operations. Database foreign keys also enforce that program and screening references share the row owner's identity, including when written by the service role.

Commit completed steps locally after verification and review. Push only with explicit user approval. Public deployment remains subject to the project's internal launch review.
