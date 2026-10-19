import "server-only";
import type { SupabaseClient, User, UserIdentity } from "@supabase/supabase-js";

export type SameEmailOutcome =
  { blocked: false } | { blocked: true; unlinked: boolean; signedOut: boolean };

function identityFor(
  identities: readonly UserIdentity[] | undefined,
  provider: string,
): UserIdentity | undefined {
  return identities?.find((identity) => identity.provider === provider);
}

/**
 * Spec 3.4 same-email rule, enforced after the Google callback.
 *
 * Supabase Auth links a verified Google email to an existing account BEFORE
 * this app sees the callback (`models.DetermineAccountLinking` returns
 * LinkAccount for a matching email), so the merge cannot be prevented and must
 * be undone here. When the merged account carries a password (email) identity
 * the user is never let in: the new Google identity is removed, the session is
 * ended (best effort), and the caller must not attach session cookies, so no
 * session ever reaches the browser. Failures are logged as codes only — never
 * identities, emails, or tokens (invariant 4).
 */
export async function enforceSameEmailRule(
  client: SupabaseClient,
  user: User,
): Promise<SameEmailOutcome> {
  const identities = user.identities ?? [];
  const google = identityFor(identities, "google");
  const password = identityFor(identities, "email");
  if (!google || !password) return { blocked: false };

  let unlinked = false;
  try {
    const { error } = await client.auth.unlinkIdentity(google);
    unlinked = !error;
    if (error) console.error("[auth] google identity unlink failed", error.code ?? "unknown");
  } catch {
    console.error("[auth] google identity unlink failed", "threw");
  }

  let signedOut = false;
  try {
    const { error } = await client.auth.signOut({ scope: "local" });
    signedOut = !error;
    if (error) console.error("[auth] google collision sign-out failed", error.code ?? "unknown");
  } catch {
    console.error("[auth] google collision sign-out failed", "threw");
  }

  return { blocked: true, unlinked, signedOut };
}
