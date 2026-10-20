import "server-only";
import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import type { components } from "@/generated/api";

/** Machine codes, sourced from the contract (contracts/openapi.yaml). */
export type ApiErrorCode = components["schemas"]["Error"]["error"]["code"];
export type ValidationDetail = components["schemas"]["ValidationErrorDetail"];

/**
 * Every non-2xx response is the contract envelope:
 * `{ error: { code, message, details? } }`. Clients switch on `code`;
 * `message` is calm, human copy and may be re-worded without breaking anyone.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: ValidationDetail[] | undefined;

  constructor(code: ApiErrorCode, status: number, message: string, details?: ValidationDetail[]) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  toResponse(headers?: HeadersInit): NextResponse {
    return NextResponse.json(
      {
        error: {
          code: this.code,
          message: this.message,
          ...(this.details ? { details: this.details } : {}),
        },
      },
      { status: this.status, headers: apiHeaders(headers) },
    );
  }
}

/** One constructor per fixed contract response; keeps copy in one place. */
export const errors = {
  validationFailed: (details: ValidationDetail[]) =>
    new ApiError("validation_failed", 422, "Some details need a quick check.", details),
  invalidCredentials: () =>
    new ApiError(
      "invalid_credentials",
      401,
      "We couldn't sign you in with those details, but don't worry, you can try again.",
    ),
  unauthorized: () => new ApiError("invalid_credentials", 401, "Please sign in to continue."),
  emailUnverified: () =>
    new ApiError(
      "email_unverified",
      403,
      "Please confirm your email first; we can send the code again.",
    ),
  invalidCode: () =>
    new ApiError("invalid_code", 401, "That code didn't match; check the digits and try again."),
  codeExpired: () => new ApiError("code_expired", 410, "Code expired. You can ask for a new one."),
  tooManyAttempts: () =>
    new ApiError(
      "too_many_attempts",
      429,
      "For your safety, this code is done; request a fresh one when you're ready.",
    ),
  googleOnly: () => new ApiError("google_only", 409, "This account uses Google sign in."),
  retakeNotAllowed: () =>
    new ApiError(
      "retake_not_allowed",
      409,
      "You recently completed the check-in; the next one unlocks in a few days.",
    ),
  rateLimited: (retryAfterSec: number) =>
    new ApiError("rate_limited", 429, "Too many tries for now; give it a moment and come back.", [
      { field: "retry_after_seconds", message: String(retryAfterSec) },
    ]),
  internal: () =>
    new ApiError(
      "internal_error",
      500,
      "Something didn't work on our side; please try again shortly.",
    ),
};

/** Map any thrown value to a contract-valid response. Never leaks internals. */
export function errorResponse(thrown: unknown, headers?: HeadersInit): NextResponse {
  unstable_rethrow(thrown);
  if (thrown instanceof ApiError) return thrown.toResponse(headers);
  console.error("[api] unhandled error", thrown);
  return errors.internal().toResponse(headers);
}

/**
 * Shared response headers: API bodies are per-user and never cacheable
 * (same posture as the stage-guard proxy), plus caller-supplied extras
 * (typically X-RateLimit-* from server/rateLimit.ts).
 */
export function apiHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("Cache-Control", "private, no-store");
  return headers;
}
