import { describe, expect, it } from "vitest";
import { otpStatus } from "./otpState";

describe("signup code state", () => {
  const sentAt = 1_000_000;

  it("allows verification while the two-minute code is live", () => {
    expect(otpStatus(sentAt, 0, sentAt + 30_000)).toEqual({
      secondsLeft: 90,
      canVerify: true,
      canResend: false,
    });
  });

  it("expires exactly at two minutes and opens resend", () => {
    expect(otpStatus(sentAt, 4, sentAt + 120_000)).toEqual({
      secondsLeft: 0,
      canVerify: false,
      canResend: true,
    });
  });

  it("stops verification after five wrong attempts while preserving the cooldown", () => {
    expect(otpStatus(sentAt, 5, sentAt + 80_000)).toEqual({
      secondsLeft: 40,
      canVerify: false,
      canResend: false,
    });
    expect(otpStatus(sentAt, 5, sentAt + 120_000).canResend).toBe(true);
    expect(otpStatus(sentAt + 120_000, 0, sentAt + 120_000).canVerify).toBe(true);
  });
});
