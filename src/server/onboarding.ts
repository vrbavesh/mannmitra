import "server-only";
import type { NextRequest } from "next/server";
import { verificationClient } from "@/server/authClient";
import { errors } from "@/server/errors";
import { recoveryCookieName } from "@/server/recoveryScope";

export async function onboardingClient(request: NextRequest) {
  if (request.cookies.has(recoveryCookieName)) throw errors.unauthorized();
  const auth = verificationClient(request);
  const {
    data: { user },
    error,
  } = await auth.client.auth.getUser();
  if (error || !user) throw errors.unauthorized();
  if (!user.email_confirmed_at) throw errors.emailUnverified();
  return { ...auth, user };
}
