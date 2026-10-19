import { describe, expect, it, vi } from "vitest";
import { ApiError, apiHeaders, errorResponse, errors } from "@/server/errors";
import {
  otpVerifySchema,
  parseBody,
  signinRequestSchema,
  screeningSubmitRequestSchema,
} from "@/server/validate";
import { clientIp } from "@/server/rateLimit";
import { respond } from "@/server/respond";
import { z } from "zod";

describe("errors", () => {
  it("serializes the contract envelope with code, message and optional details", () => {
    const response = errors
      .validationFailed([{ field: "answers", message: "Expected exactly 18 answers." }])
      .toResponse();
    expect(response.status).toBe(422);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    return response.json().then((body) => {
      expect(body).toEqual({
        error: {
          code: "validation_failed",
          message: "Some details need a quick check.",
          details: [{ field: "answers", message: "Expected exactly 18 answers." }],
        },
      });
    });
  });

  it("omits details when there are none", () => {
    return errors
      .invalidCredentials()
      .toResponse()
      .json()
      .then((body) => {
        expect(body.error.details).toBeUndefined();
        expect(body.error.code).toBe("invalid_credentials");
        expect(body.error.message).toMatch(/don't worry/i);
      });
  });

  it("maps unknown throws to a generic 500 without leaking internals", () => {
    const response = errorResponse(new Error("service_role=secret-that-must-not-leak"));
    expect(response.status).toBe(500);
    return response.json().then((body) => {
      expect(body.error.code).toBe("internal_error");
      expect(JSON.stringify(body)).not.toContain("secret");
    });
  });

  it("passes ApiError through untouched", () => {
    const response = errorResponse(errors.codeExpired());
    expect(response.status).toBe(410);
  });

  it("carries Retry-After and X-RateLimit headers on rate-limit errors", () => {
    const response = errors.rateLimited(42).toResponse({
      "Retry-After": "42",
      "X-RateLimit-Limit": "10",
    });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(response.headers.get("X-RateLimit-Limit")).toBe("10");
  });

  it("always sets no-store on api responses", () => {
    expect(apiHeaders().get("Cache-Control")).toBe("private, no-store");
  });
});

describe("validate: parseBody", () => {
  it("returns parsed data on success", () => {
    expect(
      parseBody(signinRequestSchema, { identifier: "river_otter", password: "hunter22xx" }),
    ).toEqual({
      identifier: "river_otter",
      password: "hunter22xx",
    });
  });

  it("throws a 422 ApiError with dotted field paths", () => {
    try {
      parseBody(screeningSubmitRequestSchema, { answers: [1, 2, 3], safety_answer: 9 });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(422);
      expect(apiError.code).toBe("validation_failed");
      const fields = apiError.details?.map((d) => d.field);
      expect(fields).toContain("answers");
      expect(fields).toContain("safety_answer");
    }
  });

  it("enforces the 6-digit OTP code at the boundary", () => {
    expect(() =>
      parseBody(otpVerifySchema, { email: "a@example.com", code: "12345", purpose: "signup" }),
    ).toThrow(ApiError);
    expect(() =>
      parseBody(otpVerifySchema, { email: "a@example.com", code: "123456", purpose: "signup" }),
    ).not.toThrow();
  });
});

describe("rateLimit: clientIp", () => {
  it("uses the first x-forwarded-for hop", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.9, 198.51.100.7" }))).toBe(
      "203.0.113.9",
    );
  });

  it("falls back to a shared bucket when no header exists", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("respond: serialization boundary", () => {
  it("validates before serializing and passes conforming payloads through", () => {
    const response = respond(z.object({ ok: z.literal(true) }), { ok: true });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("returns a generic 500 when the payload drifts from the contract", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = respond(z.object({ stage: z.enum(["active"]) }), { stage: "bogus" } as never);
    expect(response.status).toBe(500);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
