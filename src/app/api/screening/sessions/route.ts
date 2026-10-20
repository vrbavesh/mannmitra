import type { NextRequest } from "next/server";
import { adminClient } from "@/server/authClient";
import { onboardingClient as verifiedClient } from "@/server/onboarding";
import { errorResponse, errors } from "@/server/errors";
import { checkRateLimit } from "@/server/rateLimit";
import { respond, respondRateLimited } from "@/server/respond";
import {
  parseBody,
  screeningSubmitRequestSchema,
  screeningSubmitResponseSchema,
} from "@/server/validate";
import { computeScores } from "@/lib/scoring/computeScores";
import { SCORING_VERSION } from "@/lib/scoring/key";

export async function POST(request: NextRequest) {
  try {
    const { user, attachCookies } = await verifiedClient(request);
    const body = parseBody(
      screeningSubmitRequestSchema,
      await request.json().catch(() => undefined),
    );
    const limit = await checkRateLimit("screening", user.id);
    if (!limit.ok) return attachCookies(respondRateLimited(limit));
    const { risk, ...result } = computeScores(body.answers, body.safety_answer);
    const { data: sessionId, error } = await adminClient().rpc("submit_pretest", {
      p_user_id: user.id,
      p_answers: body.answers,
      p_safety: body.safety_answer,
      p_result: result,
      p_version: SCORING_VERSION,
    });
    if (error?.message === "retake_not_allowed")
      return attachCookies(errors.retakeNotAllowed().toResponse());
    if (error?.message === "screening_unavailable")
      return attachCookies(
        errors
          .validationFailed([
            {
              field: "stage",
              message:
                "This check-in is not available at your current step. Return to your home page to continue.",
            },
          ])
          .toResponse(),
      );
    if (error || !sessionId) throw errors.internal();
    return attachCookies(
      respond(
        screeningSubmitResponseSchema,
        {
          session_id: sessionId,
          kind: "pre",
          scoring_version: SCORING_VERSION,
          result,
          risk,
          stage: risk.triggered ? "blocked" : "awaiting_start",
        },
        { status: 201 },
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
