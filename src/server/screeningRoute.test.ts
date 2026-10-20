import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/screening/sessions/route";

const { getUser, rpc, checkRateLimit } = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  checkRateLimit: vi.fn(),
}));
vi.mock("@/server/authClient", () => ({
  verificationClient: () => ({
    client: { auth: { getUser } },
    attachCookies: (response: Response) => response,
  }),
  adminClient: () => ({ rpc }),
}));
vi.mock("@/server/rateLimit", () => ({ checkRateLimit }));
const request = (change: object = {}, cookie?: string) =>
  new NextRequest("http://localhost:3000/api/screening/sessions", {
    method: "POST",
    body: JSON.stringify({ answers: Array(18).fill(3), safety_answer: 0, ...change }),
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
  });

describe("screening submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({
      data: { user: { id: "own-user", email_confirmed_at: "2026-10-20" } },
      error: null,
    });
    rpc.mockResolvedValue({ data: "6f0a4b2e-8a3c-4c2b-9c33-1d5f7a9e2b11", error: null });
    checkRateLimit.mockResolvedValue({ ok: true });
  });

  it("returns server-computed scores, version and next stage", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      session_id: "6f0a4b2e-8a3c-4c2b-9c33-1d5f7a9e2b11",
      kind: "pre",
      scoring_version: 1,
      result: {
        total_score: 62,
        wellbeing_pct: 48.9,
        distress_pct: 51.1,
        areas: { anxiety_pct: 53.3, depression_pct: 51.1, negmood_pct: 53.3 },
        severity: "moderate",
      },
      risk: { triggered: false, reason: null },
      stage: "awaiting_start",
    });
  });

  it("blocks a safety response regardless of the wellbeing score", async () => {
    const response = await POST(
      request({
        answers: [1, 6, 1, 6, 1, 6, 1, 1, 6, 1, 6, 6, 1, 6, 1, 6, 6, 6],
        safety_answer: 1,
      }),
    );
    expect(await response.json()).toMatchObject({
      result: { wellbeing_pct: 100, severity: "minimal" },
      risk: { triggered: true, reason: "safety_answer" },
      stage: "blocked",
    });
  });

  it.each([
    { answers: Array(17).fill(3) },
    { answers: Array(18).fill(7) },
    { answers: Array(18).fill(2.5) },
    { safety_answer: null },
    { safety_answer: 4 },
    { total_score: 100 },
    { user_id: "another-user" },
  ])("rejects invalid or client-computed data %j", async (change) => {
    expect((await POST(request(change))).status).toBe(422);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("requires verified identity outside password recovery", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect((await POST(request())).status).toBe(401);
    getUser.mockResolvedValueOnce({ data: { user: { id: "own-user" } }, error: null });
    expect((await POST(request())).status).toBe(403);
    expect((await POST(request({}, "mm-password-recovery=scope"))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["retake_not_allowed", 409],
    ["screening_unavailable", 422],
    ["private-database-details", 500],
  ] as const)("maps database %s to %s without private details", async (message, status) => {
    rpc.mockResolvedValueOnce({ data: null, error: { message } });
    const response = await POST(request());
    expect(response.status).toBe(status);
    expect(await response.text()).not.toContain("private-database-details");
  });

  it("honors the shared per-user submission limit", async () => {
    checkRateLimit.mockResolvedValueOnce({
      ok: false,
      retryAfterSec: 60,
      remaining: 0,
      limit: 10,
      resetUnixSec: 123,
    });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(rpc).not.toHaveBeenCalled();
  });
});
