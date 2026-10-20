import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnvLocal, requiredEnv } from "./env";

loadEnvLocal();
const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const admin = createClient(url, requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const users: { id: string; client: SupabaseClient }[] = [];
const ids: string[] = [];
const worst = [6, 1, 6, 1, 6, 1, 6, 6, 1, 6, 1, 1, 6, 1, 6, 1, 1, 1];
const result = {
  total_score: 18,
  wellbeing_pct: 0,
  distress_pct: 100,
  areas: { anxiety_pct: 100, depression_pct: 100, negmood_pct: 100 },
  severity: "severe",
};
const params = () => ({
  p_user_id: ids[0],
  p_answers: worst,
  p_safety: 0,
  p_result: result,
  p_version: 1,
});

beforeAll(async () => {
  for (let i = 0; i < 2; i++) {
    const email = `s10-rls-${Date.now()}-${i}@example.com`;
    const created = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (created.error || !created.data.user) throw new Error("Pretest fixture creation failed");
    ids.push(created.data.user.id);
    const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error) throw new Error("Pretest fixture session setup failed");
    const client = createClient(url, anonKey, { auth: { persistSession: false } });
    const session = await client.auth.verifyOtp({
      type: "email",
      token_hash: link.data.properties.hashed_token,
    });
    if (session.error) throw new Error("Pretest fixture sign-in failed");
    users.push({ id: created.data.user.id, client });
    const profile = await admin
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", created.data.user.id);
    if (profile.error) throw new Error("Pretest fixture profile setup failed");
  }
});

afterAll(async () => {
  const failures: string[] = [];
  for (const user of users) await user.client.auth.signOut();
  for (const id of ids) {
    const deleted = await admin.auth.admin.deleteUser(id);
    if (deleted.error) failures.push("fixture account cleanup");
  }
  if (ids.length) {
    for (const table of ["profiles", "screening_sessions", "risk_events"]) {
      const check = await admin
        .from(table)
        .select("id", { count: "exact", head: true })
        .in(table === "profiles" ? "id" : "user_id", ids);
      if (check.error || check.count !== 0) failures.push(`${table} cleanup`);
    }
  }
  expect(failures).toEqual([]);
});

describe("atomic pretest permissions and persistence", () => {
  it("denies the privileged writer to both anonymous and authenticated clients", async () => {
    expect((await anon.rpc("submit_pretest", params())).error?.code).toBe("42501");
    expect((await users[0].client.rpc("submit_pretest", params())).error?.code).toBe("42501");
  });

  it("serializes competing submissions and exposes exactly 18 owned answers", async () => {
    const outcomes = await Promise.all([
      admin.rpc("submit_pretest", params()),
      admin.rpc("submit_pretest", params()),
    ]);
    expect(outcomes.filter((v) => !v.error)).toHaveLength(1);
    expect(outcomes.find((v) => v.error)?.error?.message).toBe("retake_not_allowed");
    const sessions = await users[0].client
      .from("screening_sessions")
      .select("id,scoring_version,safety_answer,total_score,severity");
    expect(sessions.error).toBeNull();
    expect(sessions.data).toHaveLength(1);
    expect(sessions.data![0]).toMatchObject({
      scoring_version: 1,
      total_score: 18,
      severity: "severe",
    });
    const sessionId = sessions.data![0].id;
    const answers = await users[0].client
      .from("screening_answers")
      .select("item_no,raw_value")
      .eq("session_id", sessionId)
      .order("item_no");
    expect(answers.data?.map((answer) => answer.raw_value)).toEqual(worst);
    expect(
      (
        await users[1].client
          .from("screening_answers")
          .select("item_no")
          .eq("session_id", sessionId)
      ).data,
    ).toEqual([]);
    expect(
      (await users[0].client.from("risk_events").select("reason").eq("session_id", sessionId)).data,
    ).toEqual([{ reason: "severe_score" }]);
  });

  it("keeps an invalid write from leaving a partial screening", async () => {
    const failed = await admin.rpc("submit_pretest", {
      ...params(),
      p_user_id: ids[1],
      p_result: { ...result, severity: "invalid-band" },
    });
    expect(failed.error).not.toBeNull();
    expect((await users[1].client.from("screening_sessions").select("id")).data).toEqual([]);
  });

  it("allows a blocked retake on the profile's fourteenth calendar day", async () => {
    const now = new Date();
    const zone = "Pacific/Kiritimati";
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: zone,
        hour: "2-digit",
        hourCycle: "h23",
      }).format(now),
    );
    const previous = new Date(now.getTime() - (13 * 24 + hour + 1) * 3600000);
    const profile = await admin.from("profiles").update({ timezone: zone }).eq("id", ids[0]);
    expect(profile.error).toBeNull();
    const changed = await admin
      .from("screening_sessions")
      .update({ completed_at: previous.toISOString() })
      .eq("user_id", ids[0]);
    expect(changed.error).toBeNull();
    const saved = await admin.rpc("submit_pretest", params());
    expect(saved.error).toBeNull();
    expect((await users[0].client.from("screening_sessions").select("id")).data).toHaveLength(2);
  });
});
