import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as requestCode } from "@/app/api/auth/otp/request/route";
import { POST as verifyCode } from "@/app/api/auth/otp/verify/route";

const {
  signUp,
  resend,
  signInWithOtp,
  verifyOtp,
  signOut,
  profile,
  checkRateLimit,
  resetRateLimit,
  otpIssuedAt,
  recordOtpIssue,
  createRecoveryScope,
  setRecoveryCookie,
} = vi.hoisted(() => ({
  signUp: vi.fn(),
  resend: vi.fn(),
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
  profile: vi.fn(),
  checkRateLimit: vi.fn(),
  resetRateLimit: vi.fn(),
  otpIssuedAt: vi.fn(),
  recordOtpIssue: vi.fn(),
  createRecoveryScope: vi.fn(),
  setRecoveryCookie: vi.fn(),
}));

vi.mock("@/server/authClient", () => ({
  signupClient: () => ({ auth: { signUp, resend, signInWithOtp } }),
  adminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: profile }) }) }),
  }),
  verificationClient: () => ({
    client: { auth: { verifyOtp, signOut } },
    attachCookies: (response: Response) => response,
  }),
}));
vi.mock("@/server/recoveryScope", () => ({ createRecoveryScope, setRecoveryCookie }));
vi.mock("@/server/rateLimit", () => ({
  clientIp: () => "203.0.113.9",
  checkRateLimit,
  resetRateLimit,
}));
vi.mock("@/server/otpChallenge", () => ({
  otpIdentifier: () => "hashed-email",
  otpIssuedAt,
  recordOtpIssue,
}));

const post = (path: string, body: object) =>
  new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
const allowed = (remaining = 4) => ({
  ok: true,
  remaining,
  limit: 5,
  retryAfterSec: 0,
  resetUnixSec: 1_000_000,
});

describe("signup OTP routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimit.mockResolvedValue(allowed());
    resetRateLimit.mockResolvedValue(undefined);
    recordOtpIssue.mockResolvedValue(undefined);
    otpIssuedAt.mockResolvedValue(Date.now());
    signUp.mockResolvedValue({ error: null });
    resend.mockResolvedValue({ error: null });
    signInWithOtp.mockResolvedValue({ error: null });
    signOut.mockResolvedValue({ error: null });
    profile.mockResolvedValue({
      data: { username: "river_otter", auth_provider: "email" },
      error: null,
    });
    createRecoveryScope.mockReturnValue("signed-recovery-scope");
  });

  it("rate-limits a second request from the same email without touching Supabase", async () => {
    checkRateLimit.mockResolvedValueOnce({
      ok: false,
      remaining: 0,
      limit: 1,
      retryAfterSec: 120,
      resetUnixSec: 1_000_000,
    });
    const response = await requestCode(
      post("/api/auth/otp/request", {
        email: "river@example.com",
        purpose: "signup",
        password: "long-secret-123",
      }),
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("120");
    expect(signUp).not.toHaveBeenCalled();
    expect(resend).not.toHaveBeenCalled();
    expect(recordOtpIssue).not.toHaveBeenCalled();
  });

  it("rate-limits a burst from one IP even when each email is fresh", async () => {
    checkRateLimit.mockResolvedValueOnce(allowed()).mockResolvedValueOnce({
      ok: false,
      remaining: 0,
      limit: 5,
      retryAfterSec: 60,
      resetUnixSec: 1_000_000,
    });
    const response = await requestCode(
      post("/api/auth/otp/request", {
        email: "river@example.com",
        purpose: "signup",
        password: "long-secret-123",
      }),
    );
    expect(response.status).toBe(429);
    expect(signUp).not.toHaveBeenCalled();
  });

  it("returns the same neutral body for new and existing email", async () => {
    const input = { email: "river@example.com", purpose: "signup", password: "long-secret-123" };
    const first = await requestCode(post("/api/auth/otp/request", input));
    signUp.mockResolvedValueOnce({ error: { code: "email_exists" } });
    const second = await requestCode(post("/api/auth/otp/request", input));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await first.text()).toBe(await second.text());
    expect(signUp).toHaveBeenCalledWith({ email: input.email, password: input.password });
  });

  it("resends a new signup code without sending a password", async () => {
    const response = await requestCode(
      post("/api/auth/otp/request", { email: "river@example.com", purpose: "signup" }),
    );
    expect(response.status).toBe(200);
    expect(resend).toHaveBeenCalledWith({ type: "signup", email: "river@example.com" });
    expect(resetRateLimit).toHaveBeenCalledWith("otp_verify", "hashed-email");
  });

  it("rejects a password shorter than eight characters", async () => {
    const response = await requestCode(
      post("/api/auth/otp/request", {
        email: "river@example.com",
        purpose: "signup",
        password: "short",
      }),
    );
    expect(response.status).toBe(422);
    expect(signUp).not.toHaveBeenCalled();
  });

  it("reports an expired challenge without asking Supabase to verify", async () => {
    otpIssuedAt.mockResolvedValue(Date.now() - 121_000);
    const response = await verifyCode(
      post("/api/auth/otp/verify", {
        email: "river@example.com",
        code: "123456",
        purpose: "signup",
      }),
    );
    expect(response.status).toBe(410);
    expect((await response.json()).error.code).toBe("code_expired");
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("lets Supabase decide expiry when the challenge store has no record", async () => {
    otpIssuedAt.mockResolvedValue(null);
    verifyOtp.mockResolvedValue({
      error: { code: "otp_expired" },
      data: { user: null, session: null },
    });
    const response = await verifyCode(
      post("/api/auth/otp/verify", {
        email: "river@example.com",
        code: "123456",
        purpose: "signup",
      }),
    );
    expect(response.status).toBe(410);
    expect(verifyOtp).toHaveBeenCalledOnce();
  });

  it("locks on the fifth wrong code and requires resend", async () => {
    checkRateLimit.mockResolvedValue(allowed(0));
    verifyOtp.mockResolvedValue({
      error: { code: "otp_expired" },
      data: { user: null, session: null },
    });
    const response = await verifyCode(
      post("/api/auth/otp/verify", {
        email: "river@example.com",
        code: "000000",
        purpose: "signup",
      }),
    );
    expect(response.status).toBe(429);
    expect((await response.json()).error.code).toBe("too_many_attempts");
  });

  it("verifies through Supabase and returns the onboarding route", async () => {
    verifyOtp.mockResolvedValue({
      error: null,
      data: {
        user: { email_confirmed_at: new Date().toISOString() },
        session: { access_token: "token" },
      },
    });
    const response = await verifyCode(
      post("/api/auth/otp/verify", {
        email: "river@example.com",
        code: "123456",
        purpose: "signup",
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "verified", redirect: "/onboarding" });
    expect(verifyOtp).toHaveBeenCalledWith({
      email: "river@example.com",
      token: "123456",
      type: "email",
    });
  });

  it("returns the same pre-OTP body for unknown, password, and Google-only accounts", async () => {
    const input = { email: "river@example.com", purpose: "forgot_password" };
    const bodies: string[] = [];
    for (const code of ["user_not_found", null, "provider_google"]) {
      signInWithOtp.mockResolvedValueOnce({ error: code ? { code } : null });
      const response = await requestCode(post("/api/auth/otp/request", input));
      expect(response.status).toBe(200);
      bodies.push(await response.text());
    }
    expect(new Set(bodies)).toEqual(new Set(['{"ok":true}']));
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "river@example.com",
      options: { shouldCreateUser: false },
    });
  });

  it("reveals Google-only status only after a correct forgot-password code", async () => {
    verifyOtp.mockResolvedValue({
      error: null,
      data: {
        user: { id: "user-id", email_confirmed_at: new Date().toISOString() },
        session: { access_token: "token" },
      },
    });
    profile.mockResolvedValue({
      data: { username: "river_otter", auth_provider: "google" },
      error: null,
    });
    const response = await verifyCode(
      post("/api/auth/otp/verify", {
        email: "river@example.com",
        code: "123456",
        purpose: "forgot_password",
      }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("google_only");
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(createRecoveryScope).not.toHaveBeenCalled();
  });

  it("creates a recovery scope after a correct password-account code", async () => {
    verifyOtp.mockResolvedValue({
      error: null,
      data: {
        user: { id: "user-id", email_confirmed_at: new Date().toISOString() },
        session: { access_token: "token" },
      },
    });
    const response = await verifyCode(
      post("/api/auth/otp/verify", {
        email: "river@example.com",
        code: "123456",
        purpose: "forgot_password",
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "verified",
      redirect: "/forgot-password/reset",
    });
    expect(setRecoveryCookie).toHaveBeenCalledWith(response, "signed-recovery-scope");
  });

  it("reveals the username and ends the temporary session", async () => {
    verifyOtp.mockResolvedValue({
      error: null,
      data: {
        user: { id: "user-id", email_confirmed_at: new Date().toISOString() },
        session: { access_token: "token" },
      },
    });
    const response = await verifyCode(
      post("/api/auth/otp/verify", {
        email: "river@example.com",
        code: "123456",
        purpose: "forgot_username",
      }),
    );
    expect(await response.json()).toEqual({
      status: "verified",
      redirect: "/forgot-username",
      revealed_username: "river_otter",
    });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
