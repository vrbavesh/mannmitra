import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import {
  clearRecoveryCookie,
  createRecoveryScope,
  recoveryCookieName,
  setRecoveryCookie,
  verifyRecoveryScope,
} from "./recoveryScope";

function accessToken(sessionId: string): string {
  return `header.${Buffer.from(JSON.stringify({ session_id: sessionId })).toString("base64url")}.signature`;
}

describe("password recovery scope", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-secret");
    vi.useRealTimers();
  });

  it("binds a signed scope to one user and one Supabase session", () => {
    const token = createRecoveryScope("user-a", accessToken("session-a"));
    expect(token).toBeTruthy();
    expect(verifyRecoveryScope(token!, "user-a", accessToken("session-a"))).toBe(true);
    expect(verifyRecoveryScope(token!, "user-b", accessToken("session-a"))).toBe(false);
    expect(verifyRecoveryScope(token!, "user-a", accessToken("session-b"))).toBe(false);
    expect(verifyRecoveryScope(`${token}x`, "user-a", accessToken("session-a"))).toBe(false);
  });

  it("expires after ten minutes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-19T10:00:00Z"));
    const token = createRecoveryScope("user-a", accessToken("session-a"));
    vi.advanceTimersByTime(10 * 60 * 1000 + 1);
    expect(verifyRecoveryScope(token!, "user-a", accessToken("session-a"))).toBe(false);
  });

  it("sets and clears an HttpOnly cookie", () => {
    const response = NextResponse.json({ ok: true });
    setRecoveryCookie(response, "signed");
    expect(response.cookies.get(recoveryCookieName)?.value).toBe("signed");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    clearRecoveryCookie(response);
    expect(response.cookies.get(recoveryCookieName)?.value).toBe("");
  });
});
