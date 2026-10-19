import { NextResponse, type NextRequest } from "next/server";
import { signupClient } from "@/server/authClient";
import { errorResponse, errors } from "@/server/errors";
import { otpIdentifier, recordOtpIssue } from "@/server/otpChallenge";
import { checkRateLimit, clientIp, resetRateLimit } from "@/server/rateLimit";
import { respond, respondRateLimited } from "@/server/respond";
import { otpRequestResponseSchema, otpRequestSchema, parseBody } from "@/server/validate";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = parseBody(otpRequestSchema, await request.json().catch(() => undefined));
    if (body.purpose !== "signup") {
      throw errors.validationFailed([
        { field: "purpose", message: "This code flow is not available yet." },
      ]);
    }
    const email = body.email.trim().toLowerCase();
    const identifier = otpIdentifier(email, body.purpose);
    const emailLimit = await checkRateLimit("otp_request_email", identifier);
    if (!emailLimit.ok) return respondRateLimited(emailLimit);
    const ipLimit = await checkRateLimit("otp_request_ip", clientIp(request.headers));
    if (!ipLimit.ok) return respondRateLimited(ipLimit);

    const auth = signupClient();
    const { error } = body.password
      ? await auth.auth.signUp({ email, password: body.password })
      : await auth.auth.resend({ type: "signup", email });
    // Account-existence and provider-send errors share one public response.
    if (error) console.error("[otp] request failed", error.code ?? "unknown");
    await recordOtpIssue(identifier, Date.now());
    await resetRateLimit("otp_verify", identifier);
    return respond(otpRequestResponseSchema, { ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
