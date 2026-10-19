import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { deriveStage, isAppRoute, isPublicRoute, localDate, routeForStage, type Program, type Screening } from "@/lib/stage";

function noStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (isPublicRoute(path) || !isAppRoute(path)) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return new NextResponse("This page is temporarily unavailable.", { status: 503 });

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

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return redirect("/signin");
  if (!user.email_confirmed_at) return redirect(routeForStage("unverified", path) ?? "/signup/verify");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("onboarding_completed,timezone")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile) return noStore(new NextResponse("This page is temporarily unavailable.", { status: 503 }));

  const [preResult, programResult] = await Promise.all([
    supabase.from("screening_sessions")
      .select("kind,severity,safety_answer,completed_at")
      .eq("user_id", user.id).eq("kind", "pre")
      .order("completed_at", { ascending: false }).limit(1),
    supabase.from("programs")
      .select("status,start_date,post_session_id")
      .eq("user_id", user.id).in("status", ["active", "completed"])
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (preResult.error || programResult.error) return noStore(new NextResponse("This page is temporarily unavailable.", { status: 503 }));

  const screenings: Screening[] = (preResult.data ?? []).map((row) => ({
    kind: row.kind,
    severity: row.severity,
    safetyAnswer: row.safety_answer,
    completedAt: row.completed_at,
  }));
  const row = programResult.data;
  const program: Program | null = row ? {
    status: row.status,
    startDate: row.start_date,
    postSessionId: row.post_session_id,
  } : null;

  try {
    const stage = deriveStage(true, {
      onboardingCompleted: profile.onboarding_completed,
      timezone: profile.timezone,
    }, screenings, program, localDate(new Date(), profile.timezone));
    const destination = routeForStage(stage, path);
    return destination ? redirect(destination) : noStore(response);
  } catch {
    return noStore(new NextResponse("This page is temporarily unavailable.", { status: 503 }));
  }
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
