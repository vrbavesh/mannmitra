import type { NextRequest } from "next/server";
import { errorResponse, errors } from "@/server/errors";
import { onboardingClient } from "@/server/onboarding";
import { checkRateLimit } from "@/server/rateLimit";
import { respond, respondRateLimited } from "@/server/respond";
import { userStage } from "@/server/userStage";
import {
  onboardingProfileSchema,
  onboardingRequestSchema,
  parseBody,
  signinResponseSchema,
} from "@/server/validate";

export async function GET(request: NextRequest) {
  try {
    const { client, user, attachCookies } = await onboardingClient(request);
    const { data: profile, error } = await client
      .from("profiles")
      .select("display_name,timezone")
      .eq("id", user.id)
      .single();
    if (error || !profile) throw errors.internal();
    return attachCookies(
      respond(onboardingProfileSchema, {
        display_name: profile.display_name ?? "",
        timezone: profile.timezone,
        stage: await userStage(client, user.id),
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client, user, attachCookies } = await onboardingClient(request);
    const body = parseBody(onboardingRequestSchema, await request.json().catch(() => undefined));
    const limit = await checkRateLimit("onboarding", user.id);
    if (!limit.ok) return attachCookies(respondRateLimited(limit));
    const { error } = await client
      .from("profiles")
      .update({
        username: body.username,
        display_name: body.display_name.trim(),
        gender: body.gender === "prefer_not_to_say" ? "other" : body.gender,
        consent_accepted_at: new Date().toISOString(),
        reminder_time: body.reminder_time,
        onboarding_completed: true,
      })
      .eq("id", user.id)
      .eq("onboarding_completed", false);
    if (error?.code === "23505") {
      return attachCookies(
        errors
          .validationFailed([
            {
              field: "username",
              message: "That username has just been taken. Please choose another.",
            },
          ])
          .toResponse(),
      );
    }
    if (error) throw errors.internal();
    return attachCookies(
      respond(signinResponseSchema, { stage: await userStage(client, user.id) }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
