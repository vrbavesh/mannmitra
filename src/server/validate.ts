import "server-only";
import { z } from "zod";
import type { components } from "@/generated/api";
import { errors } from "@/server/errors";
import { usernamePattern } from "@/lib/onboarding";

type Schemas = components["schemas"];

/**
 * Runtime schemas asserted against the generated contract types
 * (`z.ZodType<T>` makes tsc fail if this file and contracts/openapi.yaml
 * ever disagree). Contract-first: change openapi.yaml, regenerate, then
 * fix these — never the other way round.
 */

export const stageSchema: z.ZodType<Schemas["Stage"]> = z.enum([
  "unverified",
  "needs_onboarding",
  "needs_pretest",
  "blocked",
  "awaiting_start",
  "active",
  "needs_posttest",
  "completed",
]);

export const severitySchema: z.ZodType<Schemas["Severity"]> = z.enum([
  "minimal",
  "mild",
  "moderate",
  "severe",
]);

export const otpPurposeSchema = z.enum(["signup", "forgot_password", "forgot_username"]);

export const signinRequestSchema: z.ZodType<Schemas["SigninRequest"]> = z.object({
  identifier: z.string().min(3).max(254),
  password: z.string().min(1).max(128),
});

export const screeningSubmitRequestSchema: z.ZodType<Schemas["ScreeningSubmitRequest"]> = z.object({
  answers: z.array(z.number().int().min(1).max(6)).length(18),
  safety_answer: z.number().int().min(0).max(3),
});

export const otpRequestSchema: z.ZodType<Schemas["OtpRequestRequest"]> = z.object({
  email: z.email().max(254),
  purpose: otpPurposeSchema,
  password: z.string().min(8).max(128).optional(),
});

export const otpVerifySchema: z.ZodType<Schemas["OtpVerifyRequest"]> = z.object({
  email: z.email().max(254),
  code: z.string().regex(/^[0-9]{6}$/),
  purpose: otpPurposeSchema,
});

export const signinResponseSchema: z.ZodType<Schemas["SigninResponse"]> = z.object({
  stage: stageSchema,
});

export const usernameSchema: z.ZodType<Schemas["Username"]> = z.string().regex(usernamePattern);
export const usernameAvailabilitySchema: z.ZodType<Schemas["UsernameAvailability"]> =
  z.strictObject({
    available: z.boolean(),
  });
export const onboardingProfileSchema: z.ZodType<Schemas["OnboardingProfile"]> = z.strictObject({
  display_name: z.string(),
  timezone: z.string(),
  stage: stageSchema,
});
export const onboardingRequestSchema: z.ZodType<Schemas["OnboardingRequest"]> = z.strictObject({
  username: usernameSchema,
  display_name: z.string().min(1).max(80).regex(/\S/),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  age_confirmed: z.literal(true),
  terms_accepted: z.literal(true),
  privacy_accepted: z.literal(true),
  non_diagnostic_accepted: z.literal(true),
  reminder_time: z
    .string()
    .regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)
    .nullable(),
});

export const passwordUpdateSchema: z.ZodType<Schemas["PasswordUpdateRequest"]> = z.object({
  password: z.string().min(8).max(128),
});

export const screeningSubmitResponseSchema: z.ZodType<Schemas["ScreeningSubmitResponse"]> =
  z.object({
    session_id: z.uuid(),
    kind: z.enum(["pre", "post"]),
    scoring_version: z.literal(1),
    result: z.object({
      total_score: z.number().int().min(18).max(108),
      wellbeing_pct: z.number().min(0).max(100),
      distress_pct: z.number().min(0).max(100),
      areas: z.object({
        anxiety_pct: z.number().min(0).max(100),
        depression_pct: z.number().min(0).max(100),
        negmood_pct: z.number().min(0).max(100),
      }),
      severity: severitySchema,
    }),
    risk: z.object({
      triggered: z.boolean(),
      reason: z.enum(["safety_answer", "severe_score"]).nullable(),
    }),
    stage: stageSchema,
  });

export const otpRequestResponseSchema: z.ZodType<Schemas["OtpRequestResponse"]> = z.object({
  ok: z.literal(true),
});

export const otpVerifyResponseSchema: z.ZodType<Schemas["OtpVerifyResponse"]> = z.object({
  status: z.literal("verified"),
  redirect: z.string(),
  revealed_username: z
    .string()
    .regex(/^[a-z0-9_]{3,20}$/)
    .optional(),
});

/**
 * Parse an untrusted request body or throw the contract's 422
 * (`validation_failed` with per-field details). Never returns a partial.
 */
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  throw errors.validationFailed(
    result.error.issues.map((issue) => ({
      field: issue.path.map(String).join(".") || "(body)",
      message: issue.message,
    })),
  );
}
