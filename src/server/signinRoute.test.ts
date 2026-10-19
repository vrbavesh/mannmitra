import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/signin/route";

const { signInWithPassword, getUserById, maybeSingle, checkRateLimit, userStage } = vi.hoisted(
  () => ({
    signInWithPassword: vi.fn(),
    getUserById: vi.fn(),
    maybeSingle: vi.fn(),
    checkRateLimit: vi.fn(),
    userStage: vi.fn(),
  }),
);

vi.mock("@/server/authClient", () => ({
  adminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
    auth: { admin: { getUserById } },
  }),
  verificationClient: () => ({
    client: { auth: { signInWithPassword } },
    attachCookies: (response: Response) => response,
  }),
}));
vi.mock("@/server/rateLimit", () => ({
  clientIp: () => "203.0.113.9",
  checkRateLimit,
}));
vi.mock("@/server/userStage", () => ({ userStage }));

const post = (identifier: string, password = "calm-river-42") =>
  new NextRequest("http://localhost:3000/api/auth/signin", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
    headers: { "content-type": "application/json" },
  });

describe("sign-in route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimit.mockResolvedValue({
      ok: true,
      remaining: 9,
      limit: 10,
      retryAfterSec: 0,
      resetUnixSec: 1_000_000,
    });
    signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "invalid_credentials" },
    });
  });

  it("returns byte-identical errors for an unknown username and a wrong password", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    getUserById.mockResolvedValue({ data: { user: null }, error: { code: "not_found" } });
    const unknown = await POST(post("unknown_user"));
    const wrong = await POST(post("person@example.com", "wrong-password"));
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(await unknown.text()).toBe(await wrong.text());
    expect(signInWithPassword).toHaveBeenNthCalledWith(1, {
      email: "missing-account@invalid.mannmitra",
      password: "calm-river-42",
    });
    expect(getUserById).toHaveBeenCalledWith("00000000-0000-0000-0000-000000000000");
  });

  it("resolves a username internally and returns the user's stage", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "user-id" }, error: null });
    getUserById.mockResolvedValue({
      data: { user: { email: "person@example.com" } },
      error: null,
    });
    signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-id" }, session: { access_token: "token" } },
      error: null,
    });
    userStage.mockResolvedValue("needs_onboarding");
    const response = await POST(post("river_otter"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ stage: "needs_onboarding" });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "calm-river-42",
    });
  });

  it("returns the unverified code without exposing account data", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "email_not_confirmed" },
    });
    const response = await POST(post("person@example.com"));
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("email_unverified");
  });

  it("stops at the tenth-attempt limiter response", async () => {
    checkRateLimit.mockResolvedValue({
      ok: false,
      remaining: 0,
      limit: 10,
      retryAfterSec: 60,
      resetUnixSec: 1_000_000,
    });
    const response = await POST(post("person@example.com"));
    expect(response.status).toBe(429);
    expect(response.headers.get("x-ratelimit-limit")).toBe("10");
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
