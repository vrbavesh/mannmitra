import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const getUser = vi.fn();
const from = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser }, from }),
}));

const request = (path: string) => new NextRequest(`http://localhost:3000${path}`);

describe("stage proxy", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
    getUser.mockReset();
    from.mockReset();
  });

  it("sends signed-out visitors from the app to sign in", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await proxy(request("/home"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/signin");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("sends unverified visitors to verification from protected pages", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-id", email_confirmed_at: null } }, error: null });
    const response = await proxy(request("/home"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/signup/verify");
  });

  it("resolves a verified user's stage from profile and screening rows", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-id", email_confirmed_at: "2026-10-01T00:00:00Z" } }, error: null });
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
    from.mockImplementation((table: string) => query(
      table === "profiles" ? { data: { onboarding_completed: true, timezone: "Asia/Kolkata" }, error: null }
        : table === "screening_sessions" ? { data: [], error: null }
          : { data: null, error: null },
    ));
    const response = await proxy(request("/home"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/pretest");
    expect(from).toHaveBeenCalledWith("profiles");
    expect(from).toHaveBeenCalledWith("screening_sessions");
    expect(from).toHaveBeenCalledWith("programs");
  });

  it.each(["/", "/crisis", "/signup/verify"])("keeps %s public without session lookup", async (path) => {
    const response = await proxy(request(path));
    expect(response.status).toBe(200);
    expect(getUser).not.toHaveBeenCalled();
  });
});
