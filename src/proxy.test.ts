import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const { getUser, getSession, from, verifyRecoveryScope } = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  from: vi.fn(),
  verifyRecoveryScope: vi.fn(),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser, getSession }, from }),
}));
vi.mock("@/server/recoveryScope", () => ({
  recoveryCookieName: "mm-password-recovery",
  verifyRecoveryScope,
  clearRecoveryCookie: (response: Response) =>
    response.headers.append("set-cookie", "mm-password-recovery=; Max-Age=0"),
}));

const request = (path: string, recovery = false) =>
  new NextRequest(`http://localhost:3000${path}`, {
    headers: recovery ? { cookie: "mm-password-recovery=signed" } : undefined,
  });

describe("stage proxy", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
    getUser.mockReset();
    getSession.mockReset();
    from.mockReset();
    verifyRecoveryScope.mockReset();
  });

  it("sends signed-out visitors from the app to sign in", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await proxy(request("/home"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/signin");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("sends unverified visitors to verification from protected pages", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-id", email_confirmed_at: null } },
      error: null,
    });
    const response = await proxy(request("/home"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/signup/verify");
  });

  it.each([
    [false, "/onboarding"],
    [true, "/pretest"],
  ])("routes onboarding_completed=%s to %s", async (completed, destination) => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-id", email_confirmed_at: "2026-10-01T00:00:00Z" } },
      error: null,
    });
    const query = (result: object) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        limit: () => Object.assign(Promise.resolve(result), chain),
        maybeSingle: () => Promise.resolve(result),
      };
      return chain;
    };
    from.mockImplementation((table: string) =>
      query(
        table === "profiles"
          ? { data: { onboarding_completed: completed, timezone: "Asia/Kolkata" }, error: null }
          : table === "screening_sessions"
            ? { data: [], error: null }
            : { data: null, error: null },
      ),
    );
    const response = await proxy(request("/home"));
    expect(response.headers.get("location")).toBe(`http://localhost:3000${destination}`);
    expect(from).toHaveBeenCalledWith("profiles");
    expect(from).toHaveBeenCalledWith("screening_sessions");
    expect(from).toHaveBeenCalledWith("programs");
  });

  it.each(["/", "/crisis", "/signup/verify"])(
    "keeps %s public without session lookup",
    async (path) => {
      const response = await proxy(request(path));
      expect(response.status).toBe(200);
      expect(getUser).not.toHaveBeenCalled();
    },
  );

  it.each([
    [1, "minimal"],
    [0, "severe"],
  ])(
    "keeps safety %s / severity %s on support at each protected visit",
    async (safety, severity) => {
      getUser.mockResolvedValue({
        data: { user: { id: "owner", email_confirmed_at: "2026-10-20" } },
        error: null,
      });
      from.mockImplementation((table: string) => {
        const result = {
          data:
            table === "profiles"
              ? { onboarding_completed: true, timezone: "Asia/Kolkata" }
              : table === "screening_sessions"
                ? [
                    {
                      kind: "pre",
                      safety_answer: safety,
                      severity,
                      completed_at: new Date().toISOString(),
                    },
                  ]
                : null,
          error: null,
        };
        const chain = {
          select: () => chain,
          eq: () => chain,
          in: () => chain,
          order: () => chain,
          limit: () => Object.assign(Promise.resolve(result), chain),
          maybeSingle: () => Promise.resolve(result),
        };
        return chain;
      });
      for (const path of ["/home", "/program", "/pretest"]) {
        const response = await proxy(request(path));
        expect(response.headers.get("location")).toBe("http://localhost:3000/pretest/result");
        expect(response.headers.get("cache-control")).toBe("private, no-store");
      }
      expect((await proxy(request("/pretest/result"))).status).toBe(200);
    },
  );

  it("returns 403 before rendering a future program day", async () => {
    const futureStart = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
    getUser.mockResolvedValue({
      data: { user: { id: "owner", email_confirmed_at: "2026-10-20" } },
      error: null,
    });
    const query = (result: object) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        limit: () => Object.assign(Promise.resolve(result), chain),
        maybeSingle: () => Promise.resolve(result),
      };
      return chain;
    };
    from.mockImplementation((table: string) =>
      query(
        table === "profiles"
          ? { data: { onboarding_completed: true, timezone: "Asia/Kolkata" }, error: null }
          : table === "screening_sessions"
            ? {
                data: [
                  {
                    kind: "pre",
                    severity: "mild",
                    safety_answer: 0,
                    completed_at: new Date().toISOString(),
                  },
                ],
                error: null,
              }
            : table === "programs"
              ? {
                  data: { status: "active", start_date: futureStart, post_session_id: null },
                  error: null,
                }
              : { data: null, error: null },
      ),
    );
    const response = await proxy(request("/program/day/2"));
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).toContain("not open yet");
  });

  it("lets a currently open program day reach the page", async () => {
    const pastStart = new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10);
    getUser.mockResolvedValue({
      data: { user: { id: "owner", email_confirmed_at: "2026-10-20" } },
      error: null,
    });
    const query = (result: object) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        limit: () => Object.assign(Promise.resolve(result), chain),
        maybeSingle: () => Promise.resolve(result),
      };
      return chain;
    };
    from.mockImplementation((table: string) =>
      query(
        table === "profiles"
          ? { data: { onboarding_completed: true, timezone: "Asia/Kolkata" }, error: null }
          : table === "screening_sessions"
            ? {
                data: [
                  {
                    kind: "pre",
                    severity: "mild",
                    safety_answer: 0,
                    completed_at: new Date().toISOString(),
                  },
                ],
                error: null,
              }
            : table === "programs"
              ? {
                  data: { status: "active", start_date: pastStart, post_session_id: null },
                  error: null,
                }
              : { data: null, error: null },
      ),
    );
    const response = await proxy(request("/program/day/1"));
    expect(response.status).toBe(200);
  });

  it("keeps a temporary recovery session on the reset screen", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-id" } }, error: null });
    getSession.mockResolvedValue({
      data: { session: { access_token: "access-token" } },
      error: null,
    });
    verifyRecoveryScope.mockReturnValue(true);
    const response = await proxy(request("/forgot-password/reset", true));
    expect(response.status).toBe(200);
  });

  it("prevents a temporary recovery session from browsing the app", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-id" } }, error: null });
    getSession.mockResolvedValue({
      data: { session: { access_token: "access-token" } },
      error: null,
    });
    verifyRecoveryScope.mockReturnValue(true);
    const response = await proxy(request("/home", true));
    expect(response.headers.get("location")).toBe("http://localhost:3000/forgot-password/reset");
    expect(from).not.toHaveBeenCalled();
  });

  it("sends direct reset visits back to recovery", async () => {
    const response = await proxy(request("/forgot-password/reset"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/forgot-password");
    expect(getUser).not.toHaveBeenCalled();
  });
});
