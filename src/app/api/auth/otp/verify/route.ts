import { NextResponse, type NextRequest } from "next/server";
import { verificationClient } from "@/server/authClient";
import { errorResponse, errors } from "@/server/errors";
import { otpIdentifier, otpIssuedAt } from "@/server/otpChallenge";
import { checkRateLimit } from "@/server/rateLimit";
import { respond } from "@/server/respond";
import { otpVerifyResponseSchema, otpVerifySchema, parseBody } from "@/server/validate";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = parseBody(otpVerifySchema, await request.json().catch(() => undefined));
    if (body.purpose !== "signup") {
      throw errors.validationFailed([
        { field: "purpose", message: "This code flow is not available yet." },
      ]);
    }
    const email = body.email.trim().toLowerCase();
    const identifier = otpIdentifier(email, body.purpose);
    const issuedAt = await otpIssuedAt(identifier);
    if (issuedAt !== null && issuedAt !== undefined && Date.now() - issuedAt >= 120_000) {
      return errors.codeExpired().toResponse();
    }
    const limit = await checkRateLimit("otp_verify", identifier);
    if (!limit.ok)
      return errors.tooManyAttempts().toResponse({ "Retry-After": String(limit.retryAfterSec) });

    const { client, attachCookies } = verificationClient(request);
    const { data, error } = await client.auth.verifyOtp({ email, token: body.code, type: "email" });
    if (error) {
      if (limit.remaining === 0)
        return errors
          .tooManyAttempts()
          .toResponse({ "Retry-After": String(limit.retryAfterSec || 1) });
      if (issuedAt == null && error.code === "otp_expired")
        return errors.codeExpired().toResponse();
      return errors.invalidCode().toResponse();
    }
    if (!data.user?.email_confirmed_at || !data.session) throw errors.internal();
    return attachCookies(
      respond(otpVerifyResponseSchema, { status: "verified", redirect: "/onboarding" }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
