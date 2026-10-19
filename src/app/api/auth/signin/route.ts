import { NextResponse, type NextRequest } from "next/server";
import { adminClient, verificationClient } from "@/server/authClient";
import { errorResponse, errors } from "@/server/errors";
import { checkRateLimit, clientIp } from "@/server/rateLimit";
import { respond, respondRateLimited } from "@/server/respond";
import { userStage } from "@/server/userStage";
import { parseBody, signinRequestSchema, signinResponseSchema } from "@/server/validate";

async function emailForIdentifier(identifier: string): Promise<string> {
  const normalized = identifier.trim().toLowerCase();
  if (normalized.includes("@")) return normalized;
  if (!/^[a-z0-9_]{3,20}$/.test(normalized)) return "missing-account@invalid.mannmitra";

  const admin = adminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id")
    .eq("username", normalized)
    .maybeSingle();
  if (error) throw errors.internal();
  const { data, error: userError } = await admin.auth.admin.getUserById(
    profile?.id ?? "00000000-0000-0000-0000-000000000000",
  );
  if (profile && userError) throw errors.internal();
  return data.user?.email ?? "missing-account@invalid.mannmitra";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = parseBody(signinRequestSchema, await request.json().catch(() => undefined));
    const limit = await checkRateLimit("signin", clientIp(request.headers));
    if (!limit.ok) return respondRateLimited(limit);

    const email = await emailForIdentifier(body.identifier);
    const { client, attachCookies } = verificationClient(request);
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password: body.password,
    });
    if (error?.code === "email_not_confirmed") return errors.emailUnverified().toResponse();
    if (error || !data.user || !data.session) return errors.invalidCredentials().toResponse();

    return attachCookies(
      respond(signinResponseSchema, { stage: await userStage(client, data.user.id) }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
