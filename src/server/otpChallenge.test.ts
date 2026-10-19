import { beforeEach, describe, expect, it, vi } from "vitest";

const { set, get } = vi.hoisted(() => ({ set: vi.fn(), get: vi.fn() }));
vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => ({ set, get }) } }));

import { otpIdentifier, otpIssuedAt, recordOtpIssue } from "@/server/otpChallenge";

describe("otpChallenge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("hashes purpose and trimmed lowercased email into a 64-hex identifier", () => {
    const identifier = otpIdentifier("  River@Example.COM ", "signup");
    expect(identifier).toBe(otpIdentifier("river@example.com", "signup"));
    expect(identifier).toMatch(/^[0-9a-f]{64}$/);
    expect(identifier).not.toContain("river");
  });

  it("stores the issue time with a bounded lifetime", async () => {
    await recordOtpIssue("abc", 1_000);
    expect(set).toHaveBeenCalledWith("mm:otp:issued:abc", 1_000, { ex: 600 });
  });

  it("reads back the stored issue time", async () => {
    get.mockResolvedValueOnce(1_000);
    await expect(otpIssuedAt("abc")).resolves.toBe(1_000);
  });

  it("distinguishes no challenge from an unavailable store", async () => {
    get.mockResolvedValueOnce(null);
    await expect(otpIssuedAt("abc")).resolves.toBeNull();
  });

  it("fails open loudly when the store is unavailable", async () => {
    set.mockRejectedValueOnce(new Error("store down"));
    await expect(recordOtpIssue("abc", 1_000)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledOnce();

    get.mockRejectedValueOnce(new Error("store down"));
    await expect(otpIssuedAt("abc")).resolves.toBeUndefined();
  });
});
