import type { NextRequest } from "next/server";
import { adminClient } from "@/server/authClient";
import { errorResponse, errors } from "@/server/errors";
import { onboardingClient } from "@/server/onboarding";
import { checkRateLimit } from "@/server/rateLimit";
import { respond, respondRateLimited } from "@/server/respond";
import { parseBody, usernameSchema, usernameAvailabilitySchema } from "@/server/validate";

export async function GET(request: NextRequest) {
  try {
    const { client, user, attachCookies } = await onboardingClient(request);
    const username = parseBody(usernameSchema, request.nextUrl.searchParams.get("username"));
    const limit = await checkRateLimit("username", user.id);
    if (!limit.ok) return attachCookies(respondRateLimited(limit));
    const { data: profile, error } = await client
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();
    if (error || !profile) throw errors.internal();
    if (profile.onboarding_completed) {
      return attachCookies(
        errors
          .validationFailed([
            {
              field: "username",
              message: "Your setup is already complete. Continue to your home page.",
            },
          ])
          .toResponse(),
      );
    }
    // RLS hides other profiles; the server-only lookup returns only availability.
    const { data: match, error: lookupError } = await adminClient()
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (lookupError) throw errors.internal();
    return attachCookies(
      respond(usernameAvailabilitySchema, { available: !match || match.id === user.id }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
