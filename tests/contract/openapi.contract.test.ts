import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { ValidateFunction } from "ajv";

// Contract tests: fixtures validate against contracts/openapi.yaml itself
// (the single authoritative artifact), not against our TypeScript types.
// OpenAPI 3.1 schemas are JSON Schema 2020-12, so Ajv2020 compiles them.

const DOC_ID = "mannmitra-openapi";
const doc = parse(
  readFileSync(path.resolve(import.meta.dirname, "../../contracts/openapi.yaml"), "utf8"),
) as Record<string, unknown>;

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema({ ...doc, $id: DOC_ID });

function schemaAt(pointer: string): ValidateFunction {
  // pointer like "/components/schemas/SigninResponse" (no leading #)
  const validator = ajv.getSchema(`${DOC_ID}#${pointer}`);
  if (!validator) throw new Error(`No schema at ${pointer}`);
  return validator;
}

/** Compile any (sub)schema from the doc, re-rooting internal $refs to the doc. */
const compiled = new Map<string, ValidateFunction>();
function compileMediaSchema(schemaObj: unknown): ValidateFunction {
  const key = JSON.stringify(schemaObj);
  const hit = compiled.get(key);
  if (hit) return hit;
  const rebased = JSON.parse(key.replaceAll("#/components/", `${DOC_ID}#/components/`));
  const validator = ajv.compile(rebased);
  compiled.set(key, validator);
  return validator;
}

type Media = {
  schema?: { $ref?: string };
  example?: unknown;
  examples?: Record<string, { value: unknown }>;
};
type RawResponse = {
  $ref?: string;
  content?: Record<string, Media>;
  headers?: Record<string, unknown>;
};
type Operation = { responses: Record<string, RawResponse> };

const paths = doc.paths as Record<string, Record<string, Operation>>;

/** Follow a `$ref` into components/responses so headers and examples resolve. */
function resolveResponse(raw: RawResponse): RawResponse {
  if (!raw.$ref) return raw;
  const resolved = (doc.components as { responses: Record<string, RawResponse> }).responses[
    raw.$ref.split("/").pop() as string
  ];
  if (!resolved) throw new Error(`Unresolvable response $ref: ${raw.$ref}`);
  return resolved;
}

function responseSchema(pathKey: string, method: string, status: string): ValidateFunction {
  const raw = paths[pathKey][method].responses[status];
  if (!raw) throw new Error(`No response ${status} for ${method.toUpperCase()} ${pathKey}`);
  const media = resolveResponse(raw).content?.["application/json"];
  if (!media?.schema)
    throw new Error(`No JSON schema for ${method.toUpperCase()} ${pathKey} ${status}`);
  return compileMediaSchema(media.schema);
}

const RATE_LIMITED_429 = {
  error: {
    code: "rate_limited",
    message: "Too many tries for now; give it a moment and come back.",
  },
};
const INTERNAL_500 = {
  error: {
    code: "internal_error",
    message: "Something didn't work on our side; please try again shortly.",
  },
};
const VALIDATION_422 = {
  error: {
    code: "validation_failed",
    message: "Some details need a quick check.",
    details: [{ field: "answers", message: "Expected exactly 18 answers." }],
  },
};

describe("contract: route surface", () => {
  it("documents exactly the custom server routes", () => {
    expect(Object.keys(doc.paths as object).sort()).toEqual([
      "/api/auth/otp/request",
      "/api/auth/otp/verify",
      "/api/auth/password",
      "/api/auth/signin",
      "/api/screening/sessions",
    ]);
  });

  it("exposes no username-lookup route (enumeration surface stays zero)", () => {
    const paths = Object.keys(doc.paths as object);
    expect(paths.filter((p) => /resolve|lookup|username/i.test(p))).toEqual([]);
  });
});

describe("contract: POST /api/auth/signin fixtures", () => {
  const p = "/api/auth/signin";

  it("accepts the success body", () => {
    expect(responseSchema(p, "post", "200")({ stage: "active" })).toBe(true);
  });

  it("rejects an unknown stage", () => {
    expect(responseSchema(p, "post", "200")({ stage: "nope" })).toBe(false);
  });

  it("accepts uniform 401 for unknown account and wrong password", () => {
    const validate = responseSchema(p, "post", "401");
    expect(
      validate({
        error: {
          code: "invalid_credentials",
          message:
            "We couldn't sign you in with those details, but don't worry, you can try again.",
        },
      }),
    ).toBe(true);
  });

  it("accepts 403 email_unverified and rejects other 403 codes", () => {
    const validate = responseSchema(p, "post", "403");
    expect(
      validate({
        error: {
          code: "email_unverified",
          message: "Please confirm your email first; we can send the code again.",
        },
      }),
    ).toBe(true);
    expect(validate({ error: { code: "rate_limited", message: "x" } })).toBe(false);
  });

  it("accepts 422 with per-field details and rejects a body without them", () => {
    expect(responseSchema(p, "post", "422")(VALIDATION_422)).toBe(true);
    expect(
      responseSchema(
        p,
        "post",
        "422",
      )({ error: { code: "validation_failed", message: "Some details need a quick check." } }),
    ).toBe(false);
  });

  it("accepts 429 and 500 envelope fixtures", () => {
    expect(responseSchema(p, "post", "429")(RATE_LIMITED_429)).toBe(true);
    expect(responseSchema(p, "post", "500")(INTERNAL_500)).toBe(true);
  });

  it("accepts a well-formed request and rejects a short identifier", () => {
    const validate = schemaAt("/components/schemas/SigninRequest");
    expect(validate({ identifier: "river_otter", password: "correct horse battery" })).toBe(true);
    expect(validate({ identifier: "ab", password: "x" })).toBe(false);
  });
});

describe("contract: POST /api/auth/password fixtures", () => {
  const p = "/api/auth/password";

  it("accepts a strong password and stage response", () => {
    expect(
      schemaAt("/components/schemas/PasswordUpdateRequest")({ password: "calm-river-42" }),
    ).toBe(true);
    expect(responseSchema(p, "post", "200")({ stage: "needs_onboarding" })).toBe(true);
  });

  it("rejects a short password", () => {
    expect(schemaAt("/components/schemas/PasswordUpdateRequest")({ password: "short" })).toBe(
      false,
    );
  });
});

describe("contract: POST /api/screening/sessions fixtures", () => {
  const p = "/api/screening/sessions";
  const success = {
    session_id: "6f0a4b2e-8a3c-4c2b-9c33-1d5f7a9e2b11",
    kind: "pre",
    scoring_version: 1,
    result: {
      total_score: 61,
      wellbeing_pct: 47.8,
      distress_pct: 52.2,
      areas: { anxiety_pct: 55.0, depression_pct: 48.9, negmood_pct: 53.3 },
      severity: "moderate",
    },
    risk: { triggered: false, reason: null },
    stage: "awaiting_start",
  };

  it("accepts the scored success body", () => {
    expect(responseSchema(p, "post", "201")(success)).toBe(true);
  });

  it("rejects a scoring_version bump without a contract change", () => {
    expect(responseSchema(p, "post", "201")({ ...success, scoring_version: 2 })).toBe(false);
  });

  it("accepts a triggered risk gate with a reason", () => {
    expect(
      responseSchema(
        p,
        "post",
        "201",
      )({ ...success, risk: { triggered: true, reason: "safety_answer" } }),
    ).toBe(true);
  });

  it("accepts 401/409/422/429/500 fixtures", () => {
    expect(
      responseSchema(
        p,
        "post",
        "401",
      )({ error: { code: "invalid_credentials", message: "Please sign in to continue." } }),
    ).toBe(true);
    expect(
      responseSchema(
        p,
        "post",
        "409",
      )({
        error: {
          code: "retake_not_allowed",
          message: "You recently completed the check-in; the next one unlocks in a few days.",
        },
      }),
    ).toBe(true);
    expect(responseSchema(p, "post", "422")(VALIDATION_422)).toBe(true);
    expect(responseSchema(p, "post", "429")(RATE_LIMITED_429)).toBe(true);
    expect(responseSchema(p, "post", "500")(INTERNAL_500)).toBe(true);
  });

  it("accepts a valid 18-answer request and rejects out-of-range answers", () => {
    const validate = schemaAt("/components/schemas/ScreeningSubmitRequest");
    expect(validate({ answers: Array(18).fill(3), safety_answer: 0 })).toBe(true);
    expect(validate({ answers: Array(17).fill(3), safety_answer: 0 })).toBe(false);
    expect(validate({ answers: [...Array(17).fill(3), 7], safety_answer: 0 })).toBe(false);
    expect(validate({ answers: Array(18).fill(3), safety_answer: 4 })).toBe(false);
  });
});

describe("contract: POST /api/auth/otp/request fixtures", () => {
  const p = "/api/auth/otp/request";

  it("accepts the neutral 200 body", () => {
    expect(responseSchema(p, "post", "200")({ ok: true })).toBe(true);
    expect(responseSchema(p, "post", "200")({ ok: false })).toBe(false);
  });

  it("accepts 422/429/500 fixtures", () => {
    expect(responseSchema(p, "post", "422")(VALIDATION_422)).toBe(true);
    expect(responseSchema(p, "post", "429")(RATE_LIMITED_429)).toBe(true);
    expect(responseSchema(p, "post", "500")(INTERNAL_500)).toBe(true);
  });

  it("validates the purpose enum and email format", () => {
    const validate = schemaAt("/components/schemas/OtpRequestRequest");
    expect(validate({ email: "a@example.com", purpose: "forgot_username" })).toBe(true);
    expect(validate({ email: "a@example.com", purpose: "signup", password: "safe-pass-123" })).toBe(
      true,
    );
    expect(validate({ email: "a@example.com", purpose: "signup", password: "short" })).toBe(false);
    expect(validate({ email: "a@example.com", purpose: "steal_passwords" })).toBe(false);
    expect(validate({ email: "not-an-email", purpose: "signup" })).toBe(false);
  });
});

describe("contract: POST /api/auth/otp/verify fixtures", () => {
  const p = "/api/auth/otp/verify";

  it("accepts signup and forgot_username success bodies", () => {
    const validate = responseSchema(p, "post", "200");
    expect(validate({ status: "verified", redirect: "/onboarding" })).toBe(true);
    expect(
      validate({
        status: "verified",
        redirect: "/forgot-username",
        revealed_username: "river_otter",
      }),
    ).toBe(true);
    expect(validate({ status: "pending", redirect: "/onboarding" })).toBe(false);
  });

  it("rejects a revealed_username outside the 3-20 char rule", () => {
    expect(
      responseSchema(
        p,
        "post",
        "200",
      )({ status: "verified", redirect: "/forgot-username", revealed_username: "x" }),
    ).toBe(false);
  });

  it("accepts 401/409/410/422/429/500 fixtures with their exact codes", () => {
    expect(
      responseSchema(
        p,
        "post",
        "401",
      )({
        error: {
          code: "invalid_code",
          message: "That code didn't match; check the digits and try again.",
        },
      }),
    ).toBe(true);
    expect(
      responseSchema(
        p,
        "post",
        "409",
      )({ error: { code: "google_only", message: "This account uses Google sign in." } }),
    ).toBe(true);
    expect(
      responseSchema(
        p,
        "post",
        "410",
      )({ error: { code: "code_expired", message: "Code expired. You can ask for a new one." } }),
    ).toBe(true);
    expect(responseSchema(p, "post", "422")(VALIDATION_422)).toBe(true);
    // 429 here means 5 wrong attempts on one code, so it carries its own code.
    expect(
      responseSchema(
        p,
        "post",
        "429",
      )({
        error: {
          code: "too_many_attempts",
          message: "For your safety, this code is done; request a fresh one when you're ready.",
        },
      }),
    ).toBe(true);
    expect(responseSchema(p, "post", "429")(RATE_LIMITED_429)).toBe(false);
    expect(responseSchema(p, "post", "500")(INTERNAL_500)).toBe(true);
  });

  it("enforces the 6-digit code pattern in the request", () => {
    const validate = schemaAt("/components/schemas/OtpVerifyRequest");
    expect(validate({ email: "a@example.com", code: "048291", purpose: "signup" })).toBe(true);
    expect(validate({ email: "a@example.com", code: "48291", purpose: "signup" })).toBe(false);
    expect(validate({ email: "a@example.com", code: "04829a", purpose: "signup" })).toBe(false);
  });
});

describe("contract: rate-limit responses", () => {
  it("documents Retry-After and X-RateLimit-* headers on 429", () => {
    const headers =
      resolveResponse(paths["/api/auth/signin"]["post"].responses["429"]).headers ?? {};
    expect(Object.keys(headers).sort()).toEqual([
      "Retry-After",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ]);
  });
});

describe("contract: every embedded example matches its schema", () => {
  // Self-check the document: every response example / example-set in the YAML
  // (inline or via components/responses) must validate against its schema.
  const cases: Array<{ label: string; schemaObj: unknown; value: unknown }> = [];
  for (const [pathKey, item] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(item)) {
      for (const [status, raw] of Object.entries(op.responses)) {
        const media = resolveResponse(raw).content?.["application/json"];
        if (!media?.schema) continue;
        const label = `${method.toUpperCase()} ${pathKey} ${status}`;
        if (media.example !== undefined) {
          cases.push({ label: `${label} example`, schemaObj: media.schema, value: media.example });
        }
        for (const [name, ex] of Object.entries(media.examples ?? {})) {
          cases.push({
            label: `${label} examples.${name}`,
            schemaObj: media.schema,
            value: ex.value,
          });
        }
      }
    }
  }

  it("finds embedded examples to check", () => {
    expect(cases.length).toBeGreaterThan(10);
  });

  it.each(cases)("$label validates", ({ schemaObj, value }) => {
    expect(compileMediaSchema(schemaObj)(value)).toBe(true);
  });
});
