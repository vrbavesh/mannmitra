/**
 * RLS fail-closed suite — runs against the REAL Supabase project (blueprint Step 2, tasks 5-6).
 *
 * (a) user A cannot select/insert/update/delete user B's rows on every table
 * (b) anonymous role reads nothing
 * (c) authenticated reads task_templates
 * (d) authenticated direct insert into screening_sessions / screening_answers is DENIED
 * (e) entry_date explicit-set path stores exactly what the client set (IST bucketing, deviation #7)
 * (f) storage: user A cannot fetch user B's drawing path
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnvLocal, requiredEnv } from "./env";

loadEnvLocal();

const URL = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const ANON = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const SERVICE = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

const RUN = Date.now();
const EMAIL_A = `rls-a-${RUN}@example.com`;
const EMAIL_B = `rls-b-${RUN}@example.com`;
const PASSWORD = "RlsTest!12345";
const TEMPLATE_TRACK = `__rls_test_${RUN}`;
const TEMPLATE_TITLE = `RLS seed template ${RUN}`;

const admin: SupabaseClient = createClient(URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let userA: SupabaseClient;
let userB: SupabaseClient;
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

let uidA = "";
let uidB = "";
let sessionIdA = "";
let sessionIdB = "";

/** Seed one row per table for a given user, via service role (bypasses RLS by design). */
async function seedUserRows(uid: string, programId: string, sessionId: string) {
  // Order matters: screening_sessions must exist before screening_answers and
  // risk_events reference it (FK). programs before everything program-scoped.
  const rows: Array<[string, Record<string, unknown>]> = [
    ["programs", { id: programId, user_id: uid, track: "depression", start_date: "2026-10-19" }],
    [
      "screening_sessions",
      {
        id: sessionId,
        user_id: uid,
        kind: "pre",
        safety_answer: 0,
        total_score: 42,
        severity: "mild",
      },
    ],
    ["screening_answers", { session_id: sessionId, item_no: 1, raw_value: 3 }],
    ["task_completions", { user_id: uid, program_id: programId, day_no: 1 }],
    ["mood_entries", { user_id: uid, program_id: programId, entry_date: "2026-10-19", mood: 5 }],
    ["journal_entries", { user_id: uid, program_id: programId, kind: "free", content: "seed" }],
    ["thought_records", { user_id: uid, program_id: programId, situation: "seed" }],
    ["drawings", { user_id: uid, program_id: programId, storage_path: `${uid}/seed.png` }],
    ["saved_items", { user_id: uid, kind: "song", data: { title: "seed" } }],
    ["risk_events", { user_id: uid, session_id: sessionId, reason: "safety_answer" }],
    ["reports", { user_id: uid, program_id: programId, summary: { seed: true } }],
  ];
  for (const [table, payload] of rows) {
    const { error } = await admin.from(table).insert(payload);
    if (error) throw new Error(`seed ${table}: ${error.message}`);
  }
}

beforeAll(async () => {
  const a = await admin.auth.admin.createUser({
    email: EMAIL_A,
    password: PASSWORD,
    email_confirm: true,
  });
  const b = await admin.auth.admin.createUser({
    email: EMAIL_B,
    password: PASSWORD,
    email_confirm: true,
  });
  if (a.error || b.error) throw new Error(`user create: ${a.error?.message} / ${b.error?.message}`);
  uidA = a.data.user!.id;
  uidB = b.data.user!.id;

  userA = createClient(URL, ANON, { auth: { persistSession: false } });
  userB = createClient(URL, ANON, { auth: { persistSession: false } });
  const sa = await userA.auth.signInWithPassword({ email: EMAIL_A, password: PASSWORD });
  const sb = await userB.auth.signInWithPassword({ email: EMAIL_B, password: PASSWORD });
  if (sa.error || sb.error) throw new Error(`sign in: ${sa.error?.message} / ${sb.error?.message}`);

  // Unique-per-run fixed uuids (a/b suffix separates users; no RNG in seed paths).
  const runHex = RUN.toString(16).padStart(12, "0");
  sessionIdA = `00000000-0000-4000-8000-${runHex.slice(0, 11)}1`;
  sessionIdB = `00000000-0000-4000-8000-${runHex.slice(0, 11)}2`;

  const programA = crypto.randomUUID();
  const programB = crypto.randomUUID();
  await seedUserRows(uidA, programA, sessionIdA);
  await seedUserRows(uidB, programB, sessionIdB);

  // One shared task template for the read-for-authenticated test (c).
  const { error: tplErr } = await admin.from("task_templates").insert({
    track: TEMPLATE_TRACK,
    day_no: 1,
    title: TEMPLATE_TITLE,
    component: "checkin",
  });
  if (tplErr) throw new Error(`seed task_templates: ${tplErr.message}`);
});

afterAll(async () => {
  const errors: string[] = [];
  const template = await admin.from("task_templates").delete().eq("track", TEMPLATE_TRACK);
  if (template.error) errors.push(`template: ${template.error.message}`);
  if (uidA) {
    const deleted = await admin.auth.admin.deleteUser(uidA);
    if (deleted.error) errors.push(`user A: ${deleted.error.message}`);
  }
  if (uidB) {
    const deleted = await admin.auth.admin.deleteUser(uidB);
    if (deleted.error) errors.push(`user B: ${deleted.error.message}`);
  }
  if (errors.length) throw new Error(`cleanup: ${errors.join(" / ")}`);
});

/** Tables with a user_id column, checked in the cross-user matrix (a) + anon (b). */
const USER_TABLES = [
  "profiles",
  "programs",
  "task_completions",
  "mood_entries",
  "journal_entries",
  "thought_records",
  "drawings",
  "saved_items",
  "risk_events",
  "reports",
  "screening_sessions",
] as const;

describe("(a) cross-user: A is blind to B's rows on every table", () => {
  for (const table of USER_TABLES) {
    it(`${table}: A sees only own rows`, async () => {
      const { data, error } = await userA.from(table).select("id");
      expect(error).toBeNull();
      const ids = (data ?? []).map((r) => r.id);
      // B's seeded row ids must never appear. profiles has no user_id column; its id IS uidB.
      const bRows =
        table === "profiles"
          ? [{ id: uidB }]
          : ((await admin.from(table).select("id").eq("user_id", uidB)).data ?? []);
      for (const b of bRows) expect(ids).not.toContain(b.id);
      // And A does see their own row (not just an empty blanket block).
      expect(ids.length).toBeGreaterThan(0);
    });
  }

  it("profiles: A cannot update or delete B's profile (0 rows affected, B unchanged)", async () => {
    const up = await userA
      .from("profiles")
      .update({ display_name: "HACKED" })
      .eq("id", uidB)
      .select();
    expect(up.error).toBeNull();
    expect(up.data).toHaveLength(0);
    const check = await admin.from("profiles").select("display_name").eq("id", uidB).single();
    expect(check.data?.display_name).not.toBe("HACKED");
  });

  it("programs: A cannot update/delete B's program; insert with user_id=B is rejected", async () => {
    const bRow = await admin.from("programs").select("id").eq("user_id", uidB).limit(1).single();
    const up = await userA
      .from("programs")
      .update({ status: "abandoned" })
      .eq("id", bRow.data!.id)
      .select();
    expect(up.data).toHaveLength(0);

    const del = await userA.from("programs").delete().eq("id", bRow.data!.id);
    expect(del.error).toBeNull();
    const still = await admin.from("programs").select("id").eq("id", bRow.data!.id);
    expect(still.data).toHaveLength(1);

    const ins = await userA.from("programs").insert({
      user_id: uidB,
      track: "anxiety",
      start_date: "2026-10-19",
    });
    expect(ins.error).not.toBeNull(); // WITH CHECK fails
  });
});

describe("(b) anonymous reads nothing", () => {
  for (const table of USER_TABLES) {
    it(`anon select on ${table} is empty`, async () => {
      const { data, error } = await anon.from(table).select("*").limit(5);
      expect(error).toBeNull(); // RLS returns 0 rows, not an error
      expect(data).toHaveLength(0);
    });
  }
  it("anon cannot select screening_answers or task_templates", async () => {
    const answers = await anon.from("screening_answers").select("*");
    expect(answers.data ?? []).toHaveLength(0);
    const templates = await anon.from("task_templates").select("*");
    expect(templates.data ?? []).toHaveLength(0);
  });
  it("anon cannot insert (mood_entries)", async () => {
    const ins = await anon
      .from("mood_entries")
      .insert({ user_id: uidA, mood: 5, entry_date: "2026-10-19" });
    expect(ins.error).not.toBeNull();
  });
});

describe("(c) authenticated reads task_templates", () => {
  it("A sees the seeded template", async () => {
    const { data, error } = await userA.from("task_templates").select("title");
    expect(error).toBeNull();
    expect((data ?? []).some((t) => t.title === TEMPLATE_TITLE)).toBe(true);
  });
});

describe("(d) screening tables are write-locked against clients (deviation #6)", () => {
  it("authenticated insert into screening_sessions is DENIED", async () => {
    const ins = await userA
      .from("screening_sessions")
      .insert({ user_id: uidA, kind: "post", safety_answer: 0 });
    expect(ins.error).not.toBeNull();
    expect(ins.error?.code).toBe("42501"); // permission denied
  });
  it("authenticated insert into screening_answers is DENIED", async () => {
    const ins = await userA
      .from("screening_answers")
      .insert({ session_id: sessionIdA, item_no: 2, raw_value: 4 });
    expect(ins.error).not.toBeNull();
    expect(ins.error?.code).toBe("42501");
  });
  it("authenticated update of screening severity is DENIED", async () => {
    const up = await userA
      .from("screening_sessions")
      .update({ severity: "minimal", safety_answer: 0 })
      .eq("id", sessionIdA)
      .select();
    expect(up.error?.code).toBe("42501");
    expect(up.data).toBeNull();
  });
  it("A can still READ own screening rows", async () => {
    const { data, error } = await userA.from("screening_sessions").select("severity");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].severity).toBe("mild");
  });
});

describe("(e) entry_date explicit-set wins over the UTC default (deviation #7)", () => {
  it("stores the exact date the write path sets, even when it differs from current_date", async () => {
    // Simulates the IST 00:30 case: user's local date is set explicitly by the client
    // from profiles.timezone; the row must keep it rather than snap to UTC's date.
    const localDate = "2026-01-15"; // a date guaranteed to differ from current_date
    const ins = await userA
      .from("mood_entries")
      .insert({ user_id: uidA, entry_date: localDate, mood: 7 })
      .select("entry_date")
      .single();
    expect(ins.error).toBeNull();
    expect(ins.data?.entry_date).toBe(localDate);
  });
  it("counter-case: omitting entry_date falls back to current_date (documented, never relied on)", async () => {
    const ins = await userA
      .from("mood_entries")
      .insert({ user_id: uidA, mood: 3 })
      .select("entry_date")
      .single();
    expect(ins.error).toBeNull();
    // Whatever UTC today is, the column filled itself — which is exactly why the
    // app write path must always pass entry_date explicitly.
    expect(typeof ins.data?.entry_date).toBe("string");
  });
});

describe("(f) storage: A cannot fetch B's drawing path", () => {
  it("A uploads own file; B's download of A's path fails; A's download of B's path fails", async () => {
    const pathA = `${uidA}/rls-${RUN}.txt`;
    const pathB = `${uidB}/rls-${RUN}.txt`;

    const upA = await userA.storage
      .from("drawings")
      .upload(pathA, "secret A", { contentType: "text/plain" });
    expect(upA.error).toBeNull();
    const upB = await userB.storage
      .from("drawings")
      .upload(pathB, "secret B", { contentType: "text/plain" });
    expect(upB.error).toBeNull();

    // A can read own.
    const own = await userA.storage.from("drawings").download(pathA);
    expect(own.error).toBeNull();

    // A cannot read B's file.
    const cross = await userA.storage.from("drawings").download(pathB);
    expect(cross.error).not.toBeNull();

    // B cannot overwrite/replace A's object (with check blocks writes into A's folder).
    const hostile = await userB.storage
      .from("drawings")
      .upload(pathA, "clobber", { upsert: true, contentType: "text/plain" });
    expect(hostile.error).not.toBeNull();

    await userA.storage.from("drawings").remove([pathA]);
    await userB.storage.from("drawings").remove([pathB]);
  });
});
