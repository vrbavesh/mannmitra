import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/password/route";

const {
  getUser,
  getSession,
  updateUser,
  signOut,
  verifyRecoveryScope,
  clearRecoveryCookie,
  userStage,
} = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  verifyRecoveryScope: vi.fn(),
  clearRecoveryCookie: vi.fn(),
  userStage: vi.fn(),
}));

vi.mock("@/server/authClient", () => ({
  verificationClient: () => ({
    client: { auth: { getUser, getSession, updateUser, signOut } },
    attachCookies: (response: Response) => response,
  }),
}));
vi.mock("@/server/recoveryScope", () => ({
  recoveryCookieName: "mm-password-recovery",
  verifyRecoveryScope,
  clearRecoveryCookie,
}));
vi.mock("@/server/userStage", () => ({ userStage }));

const request = (password = "new-calm-password") =>
  new NextRequest("http://localhost:3000/api/auth/password", {
    method: "POST",
    body: JSON.stringify({ password }),
    headers: {
      "content-type": "application/json",
      cookie: "mm-password-recovery=signed",
    },
  });

describe("password update route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "user-id" } }, error: null });
    getSession.mockResolvedValue({
      data: { session: { access_token: "access-token" } },
      error: null,
    });
    verifyRecoveryScope.mockReturnValue(true);
    updateUser.mockResolvedValue({ error: null });
    signOut.mockResolvedValue({ error: null });
    userStage.mockResolvedValue("active");
  });

  it("updates the password, signs out other sessions, and keeps the current stage", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ stage: "active" });
    expect(updateUser).toHaveBeenCalledWith({ password: "new-calm-password" });
    expect(signOut).toHaveBeenCalledWith({ scope: "others" });
    expect(clearRecoveryCookie).toHaveBeenCalledWith(response);
  });

  it("rejects a session without the bound recovery scope", async () => {
    verifyRecoveryScope.mockReturnValue(false);
    const response = await POST(request());
    expect(response.status).toBe(410);
    expect(updateUser).not.toHaveBeenCalled();
    expect(clearRecoveryCookie).toHaveBeenCalled();
  });

  it("rejects short passwords before touching Supabase", async () => {
    const response = await POST(request("short"));
    expect(response.status).toBe(422);
    expect(getUser).not.toHaveBeenCalled();
  });
});
