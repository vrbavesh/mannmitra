import { NextResponse, type NextRequest } from "next/server";
import { verificationClient } from "@/server/authClient";

function noStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/**
 * Google OAuth start (spec 3.4). The return target is fixed to this origin's
 * callback route so nothing in the request can steer the redirect. The PKCE
 * verifier cookie is attached here and read back by the callback route.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { client, attachCookies } = verificationClient(request);
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: new URL("/api/auth/callback", request.nextUrl.origin).toString(),
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) {
    console.error("[auth] google start failed", error?.code ?? "unknown");
    return noStore(
      NextResponse.redirect(new URL("/signin?notice=google_unavailable", request.url), 302),
    );
  }
  return attachCookies(noStore(NextResponse.redirect(data.url, 302)));
}
