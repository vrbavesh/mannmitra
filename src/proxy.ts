import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAppRoute, isPublicRoute, routeForStage } from "@/lib/stage";
import { isFutureProgramDay } from "@/server/dayAccess";
import {
  clearRecoveryCookie,
  recoveryCookieName,
  verifyRecoveryScope,
} from "@/server/recoveryScope";
import { userStage } from "@/server/userStage";

function noStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/** Calm 403 for a program day before its local midnight. */
function futureDayResponse(dayNo: number): NextResponse {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Day ${dayNo} is not open yet</title>
</head>
<body style="margin:0;background:#f7fdfa;color:#195854;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;display:grid;place-items:center;min-height:100vh">
<main style="max-width:34rem;padding:2rem">
<h1 style="font-size:1.6rem;margin:0 0 .75rem">This day is not open yet.</h1>
<p style="line-height:1.65;margin:0 0 1rem">Each practice opens at your local midnight. Your 30 day map shows when day ${dayNo} begins.</p>
<p style="margin:0"><a href="/program" style="color:#287c70;font-weight:600">Back to your 30 days</a></p>
</main>
</body>
</html>`;
  return noStore(
    new NextResponse(html, {
      status: 403,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }),
  );
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const recoveryPath = path === "/forgot-password/reset";
  const recoveryCookie = request.cookies.get(recoveryCookieName)?.value;
  if (!recoveryCookie && recoveryPath) {
    return noStore(NextResponse.redirect(new URL("/forgot-password", request.url)));
  }
  if (!recoveryCookie && (isPublicRoute(path) || !isAppRoute(path))) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    return new NextResponse("This page is temporarily unavailable.", { status: 503 });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const redirect = (destination: string) => {
    const next = NextResponse.redirect(new URL(destination, request.url));
    response.cookies.getAll().forEach((cookie) => next.cookies.set(cookie));
    return noStore(next);
  };

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (recoveryCookie) {
    const { data: sessionData } = await supabase.auth.getSession();
    const valid = Boolean(
      user &&
      sessionData.session &&
      verifyRecoveryScope(recoveryCookie, user.id, sessionData.session.access_token),
    );
    if (valid) {
      if (recoveryPath || path === "/crisis") return noStore(response);
      return redirect("/forgot-password/reset");
    }
    clearRecoveryCookie(response);
    if (recoveryPath) return redirect("/forgot-password");
  }
  if (isPublicRoute(path) || !isAppRoute(path)) return noStore(response);
  if (authError || !user) return redirect("/signin");
  if (!user.email_confirmed_at)
    return redirect(routeForStage("unverified", path) ?? "/signup/verify");

  try {
    const stage = await userStage(supabase, user.id);
    const destination = routeForStage(stage, path);
    if (destination) return redirect(destination);
    const dayMatch = /^\/program\/day\/(\d{1,2})$/.exec(path);
    if (dayMatch && stage === "active") {
      const dayNo = Number(dayMatch[1]);
      if (dayNo >= 1 && dayNo <= 30 && (await isFutureProgramDay(supabase, user.id, dayNo)))
        return futureDayResponse(dayNo);
    }
    return noStore(response);
  } catch {
    return noStore(new NextResponse("This page is temporarily unavailable.", { status: 503 }));
  }
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
