import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/program/days/[day]/complete/route";

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

const body = { mood_before: 3, mood_after: 8, time_taken_s: 421 };
const request = (payload: object = body, recovery = false) =>
  new NextRequest("http://localhost/api/program/days/1/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(recovery ? { cookie: "mm-password-recovery=scope" } : {}),
    },
    body: JSON.stringify(payload),
  });
const context = (day = "1") => ({ params: Promise.resolve({ day }) });

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({
    data: { user: { id: "owner", email_confirmed_at: "2026-10-20" } },
    error: null,
  });
  checkRateLimit.mockResolvedValue({ ok: true });
  rpc.mockResolvedValue({
    data: {
      day_no: 1,
      status: "done",
      completed_at: "2026-10-20T09:12:00.123456+00:00",
      days_completed: 1,
    },
    error: null,
  });
});

it("completes a day with both moods, elapsed time and optional payload", async () => {
  const response = await POST(request({ ...body, payload: { note: "calm" } }), context());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({
    day_no: 1,
    status: "done",
    completed_at: "2026-10-20T09:12:00.123Z",
    days_completed: 1,
  });
  expect(rpc).toHaveBeenCalledWith("complete_program_day", {
    p_user_id: "owner",
    p_day: 1,
    p_mood_before: 3,
    p_mood_after: 8,
    p_time_s: 421,
    p_payload: { note: "calm" },
  });
});

it("defaults the payload to an empty object and rejects forged fields", async () => {
  expect((await POST(request(), context("2"))).status).toBe(200);
  expect(rpc).toHaveBeenLastCalledWith("complete_program_day", {
    p_user_id: "owner",
    p_day: 2,
    p_mood_before: 3,
    p_mood_after: 8,
    p_time_s: 421,
    p_payload: {},
  });
  for (const payload of [
    { mood_before: 3, mood_after: 8 },
    { ...body, mood_before: -1 },
    { ...body, mood_after: 11 },
    { ...body, time_taken_s: -1 },
    { ...body, time_taken_s: 86_401 },
    { ...body, status: "done" },
    { ...body, day_no: 4 },
  ])
    expect((await POST(request(payload), context())).status).toBe(422);
  expect(rpc).toHaveBeenCalledTimes(1);
});

it("rejects days outside 1 to 29 before writing", async () => {
  for (const day of ["0", "30", "abc", "1.5", "-1"])
    expect((await POST(request(), context(day))).status).toBe(422);
  expect(rpc).not.toHaveBeenCalled();
});

it("requires verified identity outside recovery", async () => {
  getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
  expect((await POST(request(), context())).status).toBe(401);
  getUser.mockResolvedValueOnce({ data: { user: { id: "owner" } }, error: null });
  expect((await POST(request(), context())).status).toBe(403);
  expect((await POST(request(undefined, true), context())).status).toBe(401);
  expect(rpc).not.toHaveBeenCalled();
});

it("maps locked, closed and unavailable days to calm states", async () => {
  rpc.mockResolvedValueOnce({ data: null, error: { message: "day_locked" } });
  expect((await POST(request(), context())).status).toBe(403);
  rpc.mockResolvedValueOnce({ data: null, error: { message: "day_closed" } });
  expect((await POST(request(), context())).status).toBe(409);
  rpc.mockResolvedValueOnce({ data: null, error: { message: "program_unavailable" } });
  expect((await POST(request(), context())).status).toBe(409);
  rpc.mockResolvedValueOnce({ data: null, error: { message: "private-database-details" } });
  const failed = await POST(request(), context());
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
  const response = await POST(request(), context());
  expect(response.status).toBe(429);
  expect(response.headers.get("retry-after")).toBe("60");
  expect(rpc).not.toHaveBeenCalled();
});
