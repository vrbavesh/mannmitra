import "server-only";
import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

export function otpIdentifier(email: string, purpose: string): string {
  return createHash("sha256").update(`${purpose}:${email.trim().toLowerCase()}`).digest("hex");
}

const keyFor = (identifier: string) => `mm:otp:issued:${identifier}`;

export async function recordOtpIssue(identifier: string, sentAt: number): Promise<void> {
  try {
    await Redis.fromEnv().set(keyFor(identifier), sentAt, { ex: 600 });
  } catch (error) {
    console.error("[otp] challenge store unavailable", error);
  }
}

/** Undefined means the store is unavailable; null means no current challenge. */
export async function otpIssuedAt(identifier: string): Promise<number | null | undefined> {
  try {
    return await Redis.fromEnv().get<number>(keyFor(identifier));
  } catch (error) {
    console.error("[otp] challenge store unavailable", error);
    return undefined;
  }
}
