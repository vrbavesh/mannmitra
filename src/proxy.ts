import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAppRoute, isPublicRoute, routeForStage } from "@/lib/stage";
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
    return destination ? redirect(destination) : noStore(response);
  } catch {
    return noStore(new NextResponse("This page is temporarily unavailable.", { status: 503 }));
  }
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
