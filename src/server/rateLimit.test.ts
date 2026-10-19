import { beforeEach, describe, expect, it, vi } from "vitest";

// Rate limiter behavior with a fake store: success, blocking, and the
// documented fail-open posture when the store itself errors.

const limitMock = vi.fn();
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(
    function Ratelimit(this: { limit: typeof limitMock }) {
      this.limit = limitMock;
    },
    { slidingWindow: (tokens: number, window: string) => ({ tokens, window }) },
  ),
}));
vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => ({}) } }));

describe("rateLimit: checkRateLimit", () => {
  beforeEach(() => {
    limitMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("reports ok with remaining budget on allow", async () => {
    const { checkRateLimit } = await import("@/server/rateLimit");
    limitMock.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    });
    await expect(checkRateLimit("signin", "203.0.113.9")).resolves.toMatchObject({
      ok: true,
      remaining: 9,
      limit: 10,
    });
  });

  it("reports a positive retry-after on block", async () => {
    const { checkRateLimit } = await import("@/server/rateLimit");
    limitMock.mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 120_000,
    });
    const result = await checkRateLimit("signin", "203.0.113.9");
    expect(result.ok).toBe(false);
    expect(result.retryAfterSec).toBeGreaterThan(0);
    // resetUnixSec feeds X-RateLimit-Reset: unix seconds, not milliseconds.
    expect(result.resetUnixSec).toBeGreaterThan(Date.now() / 1000);
  });

  it("fails open and logs loudly when the store errors", async () => {
    const { checkRateLimit } = await import("@/server/rateLimit");
    limitMock.mockRejectedValue(new Error("upstash 503"));
    const result = await checkRateLimit("otp_verify", "a@example.com");
    expect(result.ok).toBe(true);
    expect(console.error).toHaveBeenCalled();
  });
});
