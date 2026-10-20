import type { NextRequest } from "next/server";
import { onboardingClient as verifiedClient } from "@/server/onboarding";
import { adminClient } from "@/server/authClient";
import { errorResponse, errors } from "@/server/errors";
import { checkRateLimit } from "@/server/rateLimit";
import { respond, respondRateLimited } from "@/server/respond";
import {
  parseBody,
  programStartRequestSchema,
  programStartResponseSchema,
} from "@/server/validate";

export async function POST(request: NextRequest) {
  try {
    const { user, attachCookies } = await verifiedClient(request);
    const body = parseBody(programStartRequestSchema, await request.json().catch(() => undefined));
    const limit = await checkRateLimit("program", user.id);
    if (!limit.ok) return attachCookies(respondRateLimited(limit));
    const { data, error } = await adminClient().rpc("start_program", {
      p_user_id: user.id,
      p_pre_session_id: body.pre_session_id,
    });
    if (error?.message === "program_unavailable")
      return attachCookies(
        errors
          .validationFailed([
            {
              field: "pre_session_id",
              message:
                "This program cannot start from this check-in. Return to your home page to continue.",
            },
          ])
          .toResponse(),
      );
    if (error || !data) throw errors.internal();
    return attachCookies(
      respond(
        programStartResponseSchema,
        {
          program_id: data.program_id,
          track: data.track,
          start_date: data.start_date,
          stage: "active",
        },
        {
          status: data.created ? 201 : 200,
          headers: data.created ? { Location: "/program" } : undefined,
        },
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
