import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";

export const recoveryCookieName = "mm-password-recovery";
const lifetimeSeconds = 10 * 60;

type RecoveryScope = { userId: string; sessionId: string; expiresAt: number };

function secret(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

function sessionId(accessToken: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString()) as {
      session_id?: unknown;
    };
    return typeof payload.session_id === "string" ? payload.session_id : null;
  } catch {
    return null;
  }
}

function signature(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function createRecoveryScope(userId: string, accessToken: string): string | null {
  const key = secret();
  const currentSessionId = sessionId(accessToken);
  if (!key || !currentSessionId) return null;
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      sessionId: currentSessionId,
      expiresAt: Date.now() + lifetimeSeconds * 1000,
    }),
  ).toString("base64url");
  return `${payload}.${signature(payload, key)}`;
}

export function verifyRecoveryScope(
  token: string | undefined,
  userId: string,
  accessToken: string,
): boolean {
  const key = secret();
  const currentSessionId = sessionId(accessToken);
  if (!token || !key || !currentSessionId) return false;
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return false;
  const expected = Buffer.from(signature(payload, key));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
  try {
    const scope = JSON.parse(Buffer.from(payload, "base64url").toString()) as RecoveryScope;
    return (
      scope.userId === userId &&
      scope.sessionId === currentSessionId &&
      scope.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

export function setRecoveryCookie(response: NextResponse, token: string): void {
  response.cookies.set(recoveryCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: lifetimeSeconds,
  });
}

export function clearRecoveryCookie(response: NextResponse): void {
  response.cookies.set(recoveryCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
