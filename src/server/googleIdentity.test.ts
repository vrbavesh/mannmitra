import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient, User, UserIdentity } from "@supabase/supabase-js";
import { enforceSameEmailRule } from "@/server/googleIdentity";

const unlinkIdentity = vi.fn();
const signOut = vi.fn();
const client = { auth: { unlinkIdentity, signOut } } as unknown as SupabaseClient;

function identity(provider: string, id: string) {
  return {
    identity_id: id,
    id,
    user_id: "user-1",
    identity_data: { email: "river@example.com" },
    provider,
    last_sign_in_at: "2026-10-19T00:00:00.000Z",
    created_at: "2026-10-19T00:00:00.000Z",
    updated_at: "2026-10-19T00:00:00.000Z",
  } as UserIdentity;
}

function user(identities: UserIdentity[] | undefined) {
  return { id: "user-1", identities } as User;
}

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  unlinkIdentity.mockReset();
  signOut.mockReset();
  unlinkIdentity.mockResolvedValue({ error: null });
  signOut.mockResolvedValue({ error: null });
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe("enforceSameEmailRule", () => {
  it("allows a brand-new Google user (no email identity)", async () => {
    await expect(enforceSameEmailRule(client, user([identity("google", "g1")]))).resolves.toEqual({
      blocked: false,
    });
    expect(unlinkIdentity).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("allows a returning Google user the same way", async () => {
    await expect(enforceSameEmailRule(client, user([identity("google", "g1")]))).resolves.toEqual({
      blocked: false,
    });
  });

  it("allows an email user who is not in a Google callback", async () => {
    await expect(enforceSameEmailRule(client, user([identity("email", "e1")]))).resolves.toEqual({
      blocked: false,
    });
  });

  it("allows a user without identities rather than crashing", async () => {
    await expect(enforceSameEmailRule(client, user(undefined))).resolves.toEqual({
      blocked: false,
    });
  });

  it("blocks a password account reached through Google, unlinks the Google identity, ends the session", async () => {
    const google = identity("google", "g1");
    const outcome = await enforceSameEmailRule(client, user([identity("email", "e1"), google]));
    expect(outcome).toEqual({ blocked: true, unlinked: true, signedOut: true });
    expect(unlinkIdentity).toHaveBeenCalledWith(google);
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("still blocks and still signs out when the identity unlink fails", async () => {
    unlinkIdentity.mockResolvedValue({ error: { code: "manual_linking_disabled" } });
    const outcome = await enforceSameEmailRule(
      client,
      user([identity("email", "e1"), identity("google", "g1")]),
    );
    expect(outcome).toEqual({ blocked: true, unlinked: false, signedOut: true });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(errorSpy).toHaveBeenCalledWith(
      "[auth] google identity unlink failed",
      "manual_linking_disabled",
    );
  });

  it("reports a failed sign-out without leaking account details", async () => {
    signOut.mockResolvedValue({ error: { code: "session_not_found" } });
    const outcome = await enforceSameEmailRule(
      client,
      user([identity("email", "e1"), identity("google", "g1")]),
    );
    expect(outcome.blocked).toBe(true);
    expect(outcome).toMatchObject({ signedOut: false });
    expect(errorSpy).toHaveBeenCalledWith(
      "[auth] google collision sign-out failed",
      "session_not_found",
    );
  });
});
