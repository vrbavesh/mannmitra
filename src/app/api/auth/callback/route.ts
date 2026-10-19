import { NextResponse, type NextRequest } from "next/server";
import { verificationClient } from "@/server/authClient";
import { enforceSameEmailRule } from "@/server/googleIdentity";

type Notice = "google_conflict" | "google_cancelled" | "google_failed";

function noStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function backToSignin(request: NextRequest, notice: Notice): NextResponse {
  return noStore(NextResponse.redirect(new URL(`/signin?notice=${notice}`, request.url), 302));
}

/**
 * Google OAuth callback (spec 3.4). Exchanges the PKCE code, then runs the
 * same-email audit. On a conflict the session cookies produced by the exchange
 * are deliberately NOT attached: the browser must never receive a session for
 * a password account reached through Google.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  if (params.get("error")) return backToSignin(request, "google_cancelled");
  const code = params.get("code");
  if (!code) return backToSignin(request, "google_failed");

  try {
    const { client, attachCookies } = verificationClient(request);
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error || !data.user) return attachCookies(backToSignin(request, "google_failed"));

    const outcome = await enforceSameEmailRule(client, data.user);
    // The audit ended the session (best effort). Dropping every pending cookie
    // keeps the promise absolute: no session cookie reaches the browser here.
    if (outcome.blocked) return backToSignin(request, "google_conflict");

    return attachCookies(noStore(NextResponse.redirect(new URL("/home", request.url), 302)));
  } catch (error) {
    console.error(
      "[auth] google callback failed",
      error && typeof error === "object" && "code" in error ? String(error.code) : "unknown",
    );
    return backToSignin(request, "google_failed");
  }
}
