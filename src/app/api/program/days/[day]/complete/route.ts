import type { NextRequest } from "next/server";
import { onboardingClient as verifiedClient } from "@/server/onboarding";
import { adminClient } from "@/server/authClient";
import { errorResponse, errors } from "@/server/errors";
import { checkRateLimit } from "@/server/rateLimit";
import { respond, respondRateLimited } from "@/server/respond";
import {
  parseBody,
  taskCompleteRequestSchema,
  taskCompleteResponseSchema,
} from "@/server/validate";

export async function POST(request: NextRequest, context: { params: Promise<{ day: string }> }) {
  try {
    const { day: dayParam } = await context.params;
    const day = Number(dayParam);
    const { user, attachCookies } = await verifiedClient(request);
    if (!Number.isInteger(day) || day < 1 || day > 29)
      throw errors.validationFailed([{ field: "day", message: "Choose a day between 1 and 29." }]);
    const body = parseBody(taskCompleteRequestSchema, await request.json().catch(() => undefined));
    const limit = await checkRateLimit("task", user.id);
    if (!limit.ok) return attachCookies(respondRateLimited(limit));
    const { data, error } = await adminClient().rpc("complete_program_day", {
      p_user_id: user.id,
      p_day: day,
      p_mood_before: body.mood_before,
      p_mood_after: body.mood_after,
      p_time_s: body.time_taken_s,
      p_payload: body.payload ?? {},
    });
    if (error) {
      if (error.message === "program_unavailable") throw errors.programUnavailable();
      if (error.message === "day_locked") throw errors.dayLocked();
      if (error.message === "day_closed") throw errors.dayClosed();
      if (error.message === "invalid_completion" || error.message === "invalid_day")
        throw errors.validationFailed([
          { field: "(body)", message: "Some details need a quick check." },
        ]);
      throw errors.internal();
    }
    return attachCookies(
      respond(taskCompleteResponseSchema, {
        day_no: data.day_no,
        status: "done",
        completed_at: new Date(data.completed_at).toISOString(),
        days_completed: data.days_completed,
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
