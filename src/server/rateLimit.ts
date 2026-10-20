import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Shared rate limiting for custom server routes.
 *
 * Backend (Step 4 choice, per blueprint): **Upstash Redis** via
 * `@upstash/ratelimit` sliding-window counters, using the REST URL + token in
 * `.env.local` (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`).
 * Upstash keys are required for working limits. There is no second backend;
 * missing keys or Redis outages take the fail-open path below.
 *
 * Limits (spec): sign-in 10 attempts / 10 min per IP (§3.3); OTP request
 * 1 per 2 min per email+purpose (resend cooldown, §3.1) plus 5 / 10 min per
 * IP; OTP verify 5 per 2 min per email+purpose (5 wrong attempts per code,
 * §3.1). Every key gets a TTL via the window itself.
 *
 * Failure posture: if the store errors, we **fail open** (allow the request)
 * and log loudly. Availability of a wellbeing app beats perfect limiting;
 * counters also have TTLs, so a store outage never wedges users out.
 */

const PREFIX = "mm:rl";

export type LimitName =
  | "signin"
  | "otp_request_email"
  | "otp_request_ip"
  | "otp_verify"
  | "username"
  | "onboarding"
  | "screening";

const LIMITS: Record<LimitName, { tokens: number; window: `${number} ${"s" | "m" | "h" | "d"}` }> =
  {
    signin: { tokens: 10, window: "10 m" },
    otp_request_email: { tokens: 1, window: "2 m" },
    otp_request_ip: { tokens: 5, window: "10 m" },
    otp_verify: { tokens: 5, window: "2 m" },
    username: { tokens: 30, window: "1 m" },
    onboarding: { tokens: 10, window: "10 m" },
    screening: { tokens: 10, window: "10 m" },
  };

export type RateLimitResult = {
  ok: boolean;
  /** Seconds until the next attempt is allowed; only meaningful when ok is false. */
  retryAfterSec: number;
  /** Unix seconds when the window resets, for the X-RateLimit-Reset header. */
  resetUnixSec: number;
  limit: number;
  remaining: number;
};

type Limiter = Pick<Ratelimit, "limit" | "resetUsedTokens">;

const limiters = new Map<LimitName, Limiter>();

function getLimiter(name: LimitName): Limiter {
  let limiter = limiters.get(name);
  if (!limiter) {
    const { tokens, window } = LIMITS[name];
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix: `${PREFIX}:${name}`,
      analytics: false,
    });
    limiters.set(name, limiter);
  }
  return limiter;
}

/**
 * First hop of x-forwarded-for; "unknown" buckets every hop without one.
 * Relies on the host platform (Vercel) setting this header from the real
 * connection, so a client cannot rotate fake IPs to dodge per-IP limits.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || "unknown";
}

/**
 * Consume one token for `identifier` under `name`. Never throws: store
 * failures fail open with a loud server log (see posture note above).
 */
export async function checkRateLimit(
  name: LimitName,
  identifier: string,
): Promise<RateLimitResult> {
  const { tokens } = LIMITS[name];
  try {
    const result = await getLimiter(name).limit(identifier);
    const resetUnixSec = Math.ceil(result.reset / 1000);
    const retryAfterSec =
      result.reset > 0 ? Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)) : 60;
    return {
      ok: result.success,
      retryAfterSec: result.success ? 0 : retryAfterSec,
      resetUnixSec,
      limit: result.limit ?? tokens,
      remaining: result.remaining ?? 0,
    };
  } catch (error) {
    console.error(`[rate-limit] store unavailable for "${name}"; failing open`, error);
    return {
      ok: true,
      retryAfterSec: 0,
      resetUnixSec: Math.ceil(Date.now() / 1000),
      limit: tokens,
      remaining: tokens,
    };
  }
}

export async function resetRateLimit(name: LimitName, identifier: string): Promise<void> {
  try {
    await getLimiter(name).resetUsedTokens(identifier);
  } catch (error) {
    console.error(`[rate-limit] could not reset "${name}"`, error);
  }
}
