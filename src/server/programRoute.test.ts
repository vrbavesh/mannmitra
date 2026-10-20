import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/programs/route";

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
const request = (body: object = { pre_session_id: id }, recovery = false) =>
  new NextRequest("http://localhost/api/programs", {
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
    data: { program_id: id, track: "anxiety", start_date: "2026-10-21", created: true },
    error: null,
  });
});
it("returns server-selected track/date and a Location on creation, reuses an existing program", async () => {
  const response = await POST(request());
  expect(response.status).toBe(201);
  expect(response.headers.get("location")).toBe("/program");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({
    program_id: id,
    track: "anxiety",
    start_date: "2026-10-21",
    stage: "active",
  });
  expect(rpc).toHaveBeenCalledWith("start_program", { p_user_id: "owner", p_pre_session_id: id });
  rpc.mockResolvedValueOnce({
    data: { program_id: id, track: "anxiety", start_date: "2026-10-21", created: false },
    error: null,
  });
  expect((await POST(request())).status).toBe(200);
});
it("rejects missing sessions, forged owner/track/date and malformed ids", async () => {
  for (const body of [
    {},
    { pre_session_id: "bad" },
    { pre_session_id: id, user_id: "other" },
    { pre_session_id: id, track: "depression" },
    { pre_session_id: id, start_date: "2000-01-01" },
  ])
    expect((await POST(request(body))).status).toBe(422);
  expect(rpc).not.toHaveBeenCalled();
});
it("requires verified identity outside recovery", async () => {
  getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
  expect((await POST(request())).status).toBe(401);
  getUser.mockResolvedValueOnce({ data: { user: { id: "owner" } }, error: null });
  expect((await POST(request())).status).toBe(403);
  expect((await POST(request(undefined, true))).status).toBe(401);
  expect(rpc).not.toHaveBeenCalled();
});
it("maps an ineligible screening to validation and hides database failures", async () => {
  rpc.mockResolvedValueOnce({ data: null, error: { message: "program_unavailable" } });
  expect((await POST(request())).status).toBe(422);
  rpc.mockResolvedValueOnce({ data: null, error: { message: "private-database-details" } });
  const failed = await POST(request());
  expect(failed.status).toBe(500);
  expect(await failed.text()).not.toContain("private-database-details");
});
it("honors shared per-user rate limiting before writing", async () => {
  checkRateLimit.mockResolvedValueOnce({
    ok: false,
    retryAfterSec: 60,
    limit: 10,
    remaining: 0,
    resetUnixSec: 123,
  });
  const response = await POST(request());
  expect(response.status).toBe(429);
  expect(response.headers.get("retry-after")).toBe("60");
  expect(rpc).not.toHaveBeenCalled();
});
