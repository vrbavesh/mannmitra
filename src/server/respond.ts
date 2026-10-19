import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { apiHeaders, errors } from "@/server/errors";
import type { RateLimitResult } from "@/server/rateLimit";

/**
 * Contract-first serialization boundary: every custom route builds its JSON
 * through `respond`, which validates the payload against the contract-derived
 * Zod schema before it reaches the wire. A response that drifts from
 * contracts/openapi.yaml fails loudly here (server log, generic 500) instead
 * of silently shipping a broken shape to clients.
 */
export function respond<T>(
  schema: z.ZodType<T>,
  payload: T,
  init: { status?: number; headers?: HeadersInit } = {},
): NextResponse {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    console.error(
      "[api] response failed contract validation",
      parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`),
    );
    return errors.internal().toResponse();
  }
  return NextResponse.json(parsed.data, {
    status: init.status ?? 200,
    headers: apiHeaders(init.headers),
  });
}

/** Contract-valid error response carrying Retry-After and X-RateLimit headers. */
export function respondRateLimited(result: RateLimitResult): NextResponse {
  return errors.rateLimited(result.retryAfterSec).toResponse({
    "Retry-After": String(result.retryAfterSec),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetUnixSec),
  });
}
