import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/onboarding/route";
import { GET as checkUsername } from "@/app/api/onboarding/username/route";

const { getUser, from, adminFrom, checkRateLimit, userStage, attachCookies } = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  adminFrom: vi.fn(),
  checkRateLimit: vi.fn(),
  userStage: vi.fn(),
  attachCookies: vi.fn(),
}));
vi.mock("@/server/authClient", () => ({
  verificationClient: () => ({ client: { auth: { getUser }, from }, attachCookies }),
  adminClient: () => ({ from: adminFrom }),
}));
vi.mock("@/server/rateLimit", () => ({ checkRateLimit }));
vi.mock("@/server/userStage", () => ({ userStage }));

const payload = {
  username: "river_otter",
  display_name: " River ",
  gender: "prefer_not_to_say",
  age_confirmed: true,
  terms_accepted: true,
  privacy_accepted: true,
  non_diagnostic_accepted: true,
  reminder_time: null,
};
const request = (body: unknown = payload, cookie?: string) =>
  new NextRequest("http://localhost:3000/api/onboarding", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
  });
const lookup = (username = "river_otter") =>
  new NextRequest(
    `http://localhost:3000/api/onboarding/username?username=${encodeURIComponent(username)}`,
  );

describe("onboarding routes", () => {
  const update = vi.fn();
  const eq = vi.fn();
  const single = vi.fn();
  const maybeSingle = vi.fn();
  let updateResult: { error: { code: string; message?: string } | null };

  beforeEach(() => {
    vi.clearAllMocks();
    updateResult = { error: null };
    getUser.mockResolvedValue({
      data: { user: { id: "own-user", email_confirmed_at: "2026-10-20T00:00:00Z" } },
      error: null,
    });
    attachCookies.mockImplementation((response) => response);
    checkRateLimit.mockResolvedValue({ ok: true });
    userStage.mockResolvedValue("needs_pretest");
    single.mockResolvedValue({
      data: { display_name: "Google Name", timezone: "Asia/Kolkata", onboarding_completed: false },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const query = {
      select: () => query,
      update,
      eq,
      single,
      maybeSingle,
      then: (resolve: (result: typeof updateResult) => unknown) =>
        Promise.resolve(updateResult).then(resolve),
    };
    update.mockReturnValue(query);
    eq.mockReturnValue(query);
    from.mockReturnValue(query);
    adminFrom.mockReturnValue(query);
  });

  it("loads only the user's name and timezone for provider-neutral editable prefill", async () => {
    userStage.mockResolvedValue("needs_onboarding");
    const response = await GET(request());
    expect(await response.json()).toEqual({
      display_name: "Google Name",
      timezone: "Asia/Kolkata",
      stage: "needs_onboarding",
    });
    expect(eq).toHaveBeenCalledWith("id", "own-user");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("saves an owned profile atomically with server consent time and normalized gender", async () => {
    const before = Date.now();
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ stage: "needs_pretest" });
    expect(update).toHaveBeenCalledWith({
      username: "river_otter",
      display_name: "River",
      gender: "other",
      reminder_time: null,
      consent_accepted_at: expect.any(String),
      onboarding_completed: true,
    });
    expect(Date.parse(update.mock.calls[0][0].consent_accepted_at)).toBeGreaterThanOrEqual(before);
    expect(eq.mock.calls).toEqual([
      ["id", "own-user"],
      ["onboarding_completed", false],
    ]);
    expect(attachCookies).toHaveBeenCalledWith(response);
  });

  it.each(["male", "female", "other"])(
    "keeps gender %s and the local reminder preference",
    async (gender) => {
      await POST(request({ ...payload, gender, reminder_time: "09:30" }));
      expect(update.mock.calls[0][0]).toMatchObject({ gender, reminder_time: "09:30" });
      expect(update.mock.calls[0][0]).not.toHaveProperty("cycle_tracking_enabled");
      expect(update.mock.calls[0][0]).not.toHaveProperty("timezone");
    },
  );

  it.each(["age_confirmed", "terms_accepted", "privacy_accepted", "non_diagnostic_accepted"])(
    "rejects false %s before writing",
    async (field) => {
      expect((await POST(request({ ...payload, [field]: false }))).status).toBe(422);
      expect(update).not.toHaveBeenCalled();
    },
  );

  it.each([
    { username: "Upper" },
    { username: "with space" },
    { display_name: " " },
    { reminder_time: "24:00" },
    { id: "someone-else" },
    { consent_accepted_at: "2000-01-01" },
  ])("rejects invalid or injected profile fields %j", async (change) => {
    expect((await POST(request({ ...payload, ...change }))).status).toBe(422);
    expect(update).not.toHaveBeenCalled();
  });

  it.each([GET, POST, checkUsername])(
    "requires verified identity for every operation",
    async (handler) => {
      getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
      expect((await handler(request())).status).toBe(401);
      getUser.mockResolvedValueOnce({ data: { user: { id: "own-user" } }, error: null });
      expect((await handler(request())).status).toBe(403);
      expect(from).not.toHaveBeenCalled();
      expect(adminFrom).not.toHaveBeenCalled();
    },
  );

  it.each([GET, POST, checkUsername])(
    "rejects password-recovery sessions before database access",
    async (handler) => {
      expect((await handler(request(payload, "mm-password-recovery=scoped"))).status).toBe(401);
      expect(getUser).not.toHaveBeenCalled();
      expect(from).not.toHaveBeenCalled();
    },
  );

  it("handles username collisions at save time, even after an available check", async () => {
    expect(await (await checkUsername(lookup())).json()).toEqual({ available: true });
    updateResult = { error: { code: "23505", message: "private database constraint" } };
    const response = await POST(request());
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      error: {
        code: "validation_failed",
        details: [{ field: "username", message: expect.any(String) }],
      },
    });
    expect(userStage).not.toHaveBeenCalled();
  });

  it("returns the current stage on a completed retry, with a conditional write that cannot overwrite it", async () => {
    userStage.mockResolvedValue("active");
    expect(await (await POST(request())).json()).toEqual({ stage: "active" });
    expect(eq).toHaveBeenCalledWith("onboarding_completed", false);
  });

  it("returns only availability and refuses lookups after completion", async () => {
    maybeSingle.mockResolvedValueOnce({ data: { id: "other-user" }, error: null });
    expect(await (await checkUsername(lookup())).json()).toEqual({ available: false });
    single.mockResolvedValueOnce({ data: { onboarding_completed: true }, error: null });
    adminFrom.mockClear();
    expect((await checkUsername(lookup())).status).toBe(422);
    expect(adminFrom).not.toHaveBeenCalled();
  });

  it("refuses invalid lookups before using the admin client", async () => {
    expect((await checkUsername(lookup("Upper"))).status).toBe(422);
    expect(adminFrom).not.toHaveBeenCalled();
  });

  it.each([POST, checkUsername])(
    "honors per-user limits before database access",
    async (handler) => {
      checkRateLimit.mockResolvedValueOnce({
        ok: false,
        retryAfterSec: 10,
        limit: 30,
        remaining: 0,
        resetUnixSec: 123,
      });
      const response = await handler(handler === POST ? request() : lookup());
      expect(response.status).toBe(429);
      expect(response.headers.get("retry-after")).toBe("10");
      expect(from).not.toHaveBeenCalled();
      expect(adminFrom).not.toHaveBeenCalled();
    },
  );

  it("keeps database failures private", async () => {
    updateResult = { error: { code: "08006", message: "private host" } };
    expect(await (await POST(request())).json()).toEqual({
      error: {
        code: "internal_error",
        message: "Something didn't work on our side; please try again shortly.",
      },
    });
  });
});
