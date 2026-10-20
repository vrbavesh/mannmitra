import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { createServerClient } = vi.hoisted(() => ({ createServerClient: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient }));
const { connection, getAll } = vi.hoisted(() => ({ connection: vi.fn(), getAll: vi.fn() }));
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  connection,
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll }) }));

import { pageClient, verificationClient } from "@/server/authClient";

it("waits for a real request before the auth SDK reads its expiry clock", async () => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  createServerClient.mockImplementation(() => {
    expect(connection).toHaveBeenCalledOnce();
    return { auth: {} };
  });
  await pageClient();
});

describe("verificationClient", () => {
  it("puts Supabase verification cookies on the route response", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    createServerClient.mockImplementation((_url, _key, options) => {
      options.cookies.setAll([
        { name: "sb-test-auth-token", value: "session", options: { httpOnly: true, path: "/" } },
      ]);
      return { auth: {} };
    });

    const { attachCookies } = verificationClient(
      new NextRequest("http://localhost:3000/api/auth/otp/verify"),
    );
    const response = attachCookies(NextResponse.json({ status: "verified" }));
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe("session");
    expect(response.headers.get("set-cookie")?.toLowerCase()).toContain("httponly");
  });
});
