import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { errors } from "@/server/errors";

function authConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw errors.internal();
  return { url, key };
}

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw errors.internal();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function signupClient() {
  const { url, key } = authConfig();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function verificationClient(request: NextRequest) {
  const { url, key } = authConfig();
  const pending: Parameters<
    NonNullable<Parameters<typeof createServerClient>[2]["cookies"]["setAll"]>
  >[0] = [];
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        pending.push(...cookies);
      },
    },
  });
  return {
    client,
    attachCookies(response: NextResponse) {
      pending.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      return response;
    },
  };
}
