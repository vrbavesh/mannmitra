import { afterAll, beforeAll, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnvLocal, requiredEnv } from "./env";
loadEnvLocal();
const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const admin = createClient(url, requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(url, key, { auth: { persistSession: false } });
const ids: string[] = [];
const sessions: string[] = [];
let client: SupabaseClient;
beforeAll(async () => {
  for (let i = 0; i < 4; i++) {
    const email = `s11-rls-${Date.now()}-${i}@example.com`;
    const created = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (created.error || !created.data.user) throw new Error("Program fixture setup failed");
    ids.push(created.data.user.id);
    const profile = await admin
      .from("profiles")
      .update({ onboarding_completed: i !== 3, timezone: "Asia/Kolkata" })
      .eq("id", ids[i]);
    expect(profile.error).toBeNull();
    const saved = await admin
      .from("screening_sessions")
      .insert({
        user_id: ids[i],
        kind: "pre",
        safety_answer: i === 1 ? 1 : 0,
        total_score: 62,
        wellbeing_pct: 48.9,
        distress_pct: 51.1,
        anxiety_pct: 53.3,
        depression_pct: 51.1,
        negmood_pct: 53.3,
        severity: i === 2 ? "severe" : "moderate",
        scoring_version: 1,
      })
      .select("id")
      .single();
    expect(saved.error).toBeNull();
    sessions.push(saved.data!.id);
    if (i === 0) {
      client = createClient(url, key, { auth: { persistSession: false } });
      const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
      expect(link.error).toBeNull();
      expect(
        (
          await client.auth.verifyOtp({
            type: "email",
            token_hash: link.data!.properties!.hashed_token,
          })
        ).error,
      ).toBeNull();
    }
  }
});
afterAll(async () => {
  if (client) await client.auth.signOut();
  for (const id of ids) expect((await admin.auth.admin.deleteUser(id)).error).toBeNull();
  if (ids.length)
    for (const table of ["profiles", "programs", "screening_sessions"]) {
      const remaining = await admin
        .from(table)
        .select("id", { count: "exact", head: true })
        .in(table === "profiles" ? "id" : "user_id", ids);
      expect(remaining.error).toBeNull();
      expect(remaining.count).toBe(0);
    }
});
const params = (index = 0) => ({ p_user_id: ids[index], p_pre_session_id: sessions[index] });
it("denies direct program writer access to anonymous and authenticated clients", async () => {
  expect((await anon.rpc("start_program", params())).error?.code).toBe("42501");
  expect((await client.rpc("start_program", params())).error?.code).toBe("42501");
});
it("rejects another owner's session, safety-positive, severe and incomplete-onboarding cases", async () => {
  expect(
    (await admin.rpc("start_program", { ...params(), p_pre_session_id: sessions[1] })).error
      ?.message,
  ).toBe("program_unavailable");
  for (const i of [1, 2, 3])
    expect((await admin.rpc("start_program", params(i))).error?.message).toBe(
      "program_unavailable",
    );
  expect((await admin.from("programs").select("id").in("user_id", ids)).data).toEqual([]);
});
it("creates exactly one program on competing requests and preserves the local start date on retry", async () => {
  const outcomes = await Promise.all([
    admin.rpc("start_program", params()),
    admin.rpc("start_program", params()),
  ]);
  expect(outcomes.every((r) => !r.error)).toBe(true);
  expect(outcomes.map((r) => r.data.created).sort()).toEqual([false, true]);
  const rows = await client.from("programs").select("id,track,start_date,pre_session_id");
  expect(rows.error).toBeNull();
  expect(rows.data).toHaveLength(1);
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  expect(rows.data![0]).toMatchObject({
    track: "anxiety",
    start_date: day,
    pre_session_id: sessions[0],
  });
  const retry = await admin.rpc("start_program", params());
  expect(retry.data).toMatchObject({
    program_id: rows.data![0].id,
    start_date: day,
    created: false,
  });
  expect(
    (await client.from("programs").insert({ user_id: ids[0], track: "anxiety", start_date: day }))
      .error?.code,
  ).toBe("42501");
});
it("rejects stale and post-test identifiers even if a program is already active", async () => {
  const post = await admin
    .from("screening_sessions")
    .insert({ user_id: ids[0], kind: "post", safety_answer: 0, severity: "minimal" })
    .select("id")
    .single();
  expect(post.error).toBeNull();
  expect(
    (await admin.rpc("start_program", { ...params(), p_pre_session_id: post.data!.id })).error
      ?.message,
  ).toBe("program_unavailable");
  const newer = await admin
    .from("screening_sessions")
    .insert({ user_id: ids[0], kind: "pre", safety_answer: 1, severity: "minimal" });
  expect(newer.error).toBeNull();
  expect((await admin.rpc("start_program", params())).error?.message).toBe("program_unavailable");
});
it("uses other highest tracks and a profile date that can differ from UTC", async () => {
  for (const [i, area, track] of [
    [1, "negmood_pct", "negative_thinking"],
    [2, "depression_pct", "depression"],
  ] as const) {
    expect(
      (
        await admin
          .from("screening_sessions")
          .update({ safety_answer: 0, severity: "mild", [area]: 80 })
          .eq("id", sessions[i])
      ).error,
    ).toBeNull();
    expect(
      (await admin.from("profiles").update({ timezone: "Pacific/Kiritimati" }).eq("id", ids[i]))
        .error,
    ).toBeNull();
    const saved = await admin.rpc("start_program", params(i));
    expect(saved.error).toBeNull();
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Pacific/Kiritimati",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    expect(saved.data).toMatchObject({ track, start_date: day });
  }
});
