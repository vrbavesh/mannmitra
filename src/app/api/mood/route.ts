import type { NextRequest } from "next/server";
import { onboardingClient as verifiedClient } from "@/server/onboarding";
import { adminClient } from "@/server/authClient";
import { errorResponse, errors } from "@/server/errors";
import { checkRateLimit } from "@/server/rateLimit";
import { respond, respondRateLimited } from "@/server/respond";
import { moodEntryRequestSchema, moodEntryResponseSchema, parseBody } from "@/server/validate";

/** Quick mood check. The server, never the browser, chooses today's date. */
export async function POST(request: NextRequest) {
  try {
    const { user, attachCookies } = await verifiedClient(request);
    const body = parseBody(moodEntryRequestSchema, await request.json().catch(() => undefined));
    const limit = await checkRateLimit("mood", user.id);
    if (!limit.ok) return attachCookies(respondRateLimited(limit));
    const { data, error } = await adminClient().rpc("record_mood_entry", {
      p_user_id: user.id,
      p_mood: body.mood,
      p_program_id: body.program_id ?? null,
    });
    if (error) {
      if (error.message === "program_unavailable") throw errors.programUnavailable();
      if (error.message === "invalid_mood")
        throw errors.validationFailed([{ field: "mood", message: "Choose a mood from 0 to 10." }]);
      throw errors.internal();
    }
    return attachCookies(
      respond(
        moodEntryResponseSchema,
        { entry_date: data.entry_date, mood: data.mood },
        {
          status: 201,
        },
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
