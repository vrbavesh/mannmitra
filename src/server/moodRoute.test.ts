import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/mood/route";

const { getUser, rpc, checkRateLimit } = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  checkRateLimit: vi.fn(),
}));
vi.mock("@/server/authClient", () => ({
  verificationClient: () => ({ client: { auth: { getUser } }, attachCookies: (r: Response) => r }),
  adminClient: () => ({ rpc }),
}));
vi.mock("@/server/rateLimit", () => ({ checkRateLimit }));

const id = "6f0a4b2e-8a3c-4c2b-9c33-1d5f7a9e2b11";
const request = (body: object = { mood: 7, program_id: id }, recovery = false) =>
  new NextRequest("http://localhost/api/mood", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(recovery ? { cookie: "mm-password-recovery=scope" } : {}),
    },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({
    data: { user: { id: "owner", email_confirmed_at: "2026-10-20" } },
    error: null,
  });
  checkRateLimit.mockResolvedValue({ ok: true });
  rpc.mockResolvedValue({
    data: { entry_date: "2026-10-20", mood: 7 },
    error: null,
  });
});

it("saves today's mood through the server function and returns the timezone date", async () => {
  const response = await POST(request());
  expect(response.status).toBe(201);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ entry_date: "2026-10-20", mood: 7 });
  expect(rpc).toHaveBeenCalledWith("record_mood_entry", {
    p_user_id: "owner",
    p_mood: 7,
    p_program_id: id,
  });
});

it("accepts a mood without a program and rejects client dates or owners", async () => {
  expect((await POST(request({ mood: 4 }))).status).toBe(201);
  expect(rpc).toHaveBeenLastCalledWith("record_mood_entry", {
    p_user_id: "owner",
    p_mood: 4,
    p_program_id: null,
  });
  for (const body of [
    { mood: -1 },
    { mood: 11 },
    { mood: 7.5 },
    { mood: "7" },
    {},
    { mood: 7, entry_date: "2026-10-20" },
    { mood: 7, user_id: "other" },
  ])
    expect((await POST(request(body))).status).toBe(422);
  expect(rpc).toHaveBeenCalledTimes(1);
});

it("requires verified identity outside recovery", async () => {
  getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
  expect((await POST(request())).status).toBe(401);
  getUser.mockResolvedValueOnce({ data: { user: { id: "owner" } }, error: null });
  expect((await POST(request())).status).toBe(403);
  expect((await POST(request(undefined, true))).status).toBe(401);
  expect(rpc).not.toHaveBeenCalled();
});

it("maps an unavailable program and hides database failures", async () => {
  rpc.mockResolvedValueOnce({ data: null, error: { message: "program_unavailable" } });
  expect((await POST(request())).status).toBe(409);
  rpc.mockResolvedValueOnce({ data: null, error: { message: "private-database-details" } });
  const failed = await POST(request());
  expect(failed.status).toBe(500);
  expect(await failed.text()).not.toContain("private-database-details");
});

it("honors per-user rate limiting before writing", async () => {
  checkRateLimit.mockResolvedValueOnce({
    ok: false,
    retryAfterSec: 60,
    limit: 30,
    remaining: 0,
    resetUnixSec: 123,
  });
  const response = await POST(request());
  expect(response.status).toBe(429);
  expect(response.headers.get("retry-after")).toBe("60");
  expect(rpc).not.toHaveBeenCalled();
});
