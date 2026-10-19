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
    if (outcome.blocked) {
      const response = backToSignin(request, "google_conflict");
      // Drop minted credentials, but also expire a previous browser session.
      const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
      const storageKey = `sb-${project}-auth-token`;
      for (const { name } of request.cookies.getAll()) {
        if (
          name.startsWith(storageKey) &&
          /^(?:-code-verifier)?(?:\.\d+)?$/.test(name.slice(storageKey.length))
        ) {
          response.cookies.set(name, "", { path: "/", maxAge: 0 });
        }
      }
      return response;
    }

    return attachCookies(noStore(NextResponse.redirect(new URL("/home", request.url), 302)));
  } catch (error) {
    console.error(
      "[auth] google callback failed",
      error && typeof error === "object" && "code" in error ? String(error.code) : "unknown",
    );
    return backToSignin(request, "google_failed");
  }
}
