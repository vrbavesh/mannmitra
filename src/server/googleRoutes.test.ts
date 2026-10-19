import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as startGoogle } from "@/app/api/auth/google/route";
import { GET as completeGoogle } from "@/app/api/auth/callback/route";
import type { User, UserIdentity } from "@supabase/supabase-js";

const { signInWithOAuth, exchangeCodeForSession, unlinkIdentity, signOut, attachCookies } =
  vi.hoisted(() => ({
    signInWithOAuth: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    unlinkIdentity: vi.fn(),
    signOut: vi.fn(),
    attachCookies: vi.fn((response: unknown) => response),
  }));

vi.mock("@/server/authClient", () => ({
  verificationClient: () => ({
    client: { auth: { signInWithOAuth, exchangeCodeForSession, unlinkIdentity, signOut } },
    attachCookies,
  }),
}));

function identity(provider: string) {
  return {
    identity_id: `${provider}-id`,
    id: `${provider}-id`,
    user_id: "user-1",
    identity_data: {},
    provider,
    last_sign_in_at: "2026-10-19T00:00:00.000Z",
    created_at: "2026-10-19T00:00:00.000Z",
    updated_at: "2026-10-19T00:00:00.000Z",
  } as UserIdentity;
}

function signedInUser(providers: string[]) {
  return {
    id: "user-1",
    email: "river@example.com",
    email_confirmed_at: "2026-10-19T00:00:00.000Z",
    identities: providers.map(identity),
  } as User;
}

const start = () => new NextRequest("http://localhost:3000/api/auth/google");
const callback = (query = "?code=auth-code") =>
  new NextRequest(`http://localhost:3000/api/auth/callback${query}`);

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  for (const mock of [signInWithOAuth, exchangeCodeForSession, unlinkIdentity, signOut]) {
    mock.mockReset();
  }
  attachCookies.mockClear();
  unlinkIdentity.mockResolvedValue({ error: null });
  signOut.mockResolvedValue({ error: null });
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  errorSpy.mockRestore();
});

describe("GET /api/auth/google", () => {
  it("redirects to the provider and keeps the return target on this origin", async () => {
    signInWithOAuth.mockResolvedValue({
      data: { url: "https://project.supabase.co/auth/v1/authorize?provider=google" },
      error: null,
    });

    const response = await startGoogle(start());

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000/api/auth/callback",
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("provider=google");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(attachCookies).toHaveBeenCalled();
  });

  it("sends the user back to sign in calmly when the provider cannot start", async () => {
    signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { code: "provider_disabled" },
    });

    const response = await startGoogle(start());

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/signin?notice=google_unavailable",
    );
    expect(attachCookies).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("[auth] google start failed", "provider_disabled");
  });
});

describe("GET /api/auth/callback", () => {
  it("treats a provider error as a calm cancellation, without exchanging anything", async () => {
    const response = await completeGoogle(callback("?error=access_denied"));
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/signin?notice=google_cancelled",
    );
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("fails calmly when the code is missing", async () => {
    const response = await completeGoogle(callback(""));
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/signin?notice=google_failed",
    );
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(attachCookies).not.toHaveBeenCalled();
  });

  it("fails calmly when the exchange is rejected", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "flow_state_not_found" },
    });

    const response = await completeGoogle(callback());

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/signin?notice=google_failed",
    );
    expect(attachCookies).toHaveBeenCalled();
    expect(unlinkIdentity).not.toHaveBeenCalled();
  });

  it("lets a brand-new Google user through to onboarding routing", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { user: signedInUser(["google"]), session: { access_token: "token" } },
      error: null,
    });

    const response = await completeGoogle(callback());

    expect(response.headers.get("location")).toBe("http://localhost:3000/home");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(attachCookies).toHaveBeenCalled();
    expect(unlinkIdentity).not.toHaveBeenCalled();
  });

  it("lets a returning Google user through the stage guard", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { user: signedInUser(["google"]), session: { access_token: "token" } },
      error: null,
    });

    const response = await completeGoogle(callback());

    expect(response.headers.get("location")).toBe("http://localhost:3000/home");
  });

  it("blocks a password account reached through Google, unlinks, and issues no session", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { user: signedInUser(["email", "google"]), session: { access_token: "token" } },
      error: null,
    });

    const response = await completeGoogle(callback());

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/signin?notice=google_conflict",
    );
    expect(unlinkIdentity).toHaveBeenCalledWith(expect.objectContaining({ provider: "google" }));
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    // No session cookie may ever reach the browser on this path.
    expect(attachCookies).not.toHaveBeenCalled();
  });

  it("still blocks when the unlink is refused by the project settings", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { user: signedInUser(["email", "google"]), session: { access_token: "token" } },
      error: null,
    });
    unlinkIdentity.mockResolvedValue({ error: { code: "manual_linking_disabled" } });

    const response = await completeGoogle(callback());

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/signin?notice=google_conflict",
    );
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(attachCookies).not.toHaveBeenCalled();
  });

  it("expires existing project session cookies on collision without attaching a new session", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { user: signedInUser(["email", "google"]), session: { access_token: "token" } },
      error: null,
    });
    // A failed server sign-out must not preserve the old browser session.
    signOut.mockResolvedValue({ error: { code: "session_not_found" } });
    const response = await completeGoogle(
      new NextRequest("http://localhost:3000/api/auth/callback?code=auth-code", {
        headers: {
          cookie:
            "sb-project-auth-token.0=old; sb-project-auth-token.1=old; sb-project-auth-token-code-verifier=old; sb-other-auth-token=keep; preference=keep",
        },
      }),
    );
    for (const name of [
      "sb-project-auth-token.0",
      "sb-project-auth-token.1",
      "sb-project-auth-token-code-verifier",
    ]) {
      expect(response.cookies.get(name)?.value).toBe("");
      expect(response.cookies.get(name)?.maxAge).toBe(0);
    }
    expect(response.cookies.get("sb-other-auth-token")).toBeUndefined();
    expect(response.cookies.get("preference")).toBeUndefined();
    expect(attachCookies).not.toHaveBeenCalled();
  });

  it("never attaches a session when the audit throws mid-way", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { user: signedInUser(["email", "google"]), session: { access_token: "token" } },
      error: null,
    });
    unlinkIdentity.mockRejectedValue(new Error("network down"));

    const response = await completeGoogle(callback());

    // The unlink throw is contained inside the audit; the block still holds,
    // the session is still ended, and no cookie is attached.
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/signin?notice=google_conflict",
    );
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(attachCookies).not.toHaveBeenCalled();
  });
});
