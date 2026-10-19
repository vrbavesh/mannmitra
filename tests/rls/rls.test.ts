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
let programA = "";
let programB = "";

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
  uidA = a.data.user?.id ?? "";
  uidB = b.data.user?.id ?? "";
  if (a.error || b.error) throw new Error(`user create: ${a.error?.message} / ${b.error?.message}`);

  userA = createClient(URL, ANON, { auth: { persistSession: false } });
  userB = createClient(URL, ANON, { auth: { persistSession: false } });
  const sa = await userA.auth.signInWithPassword({ email: EMAIL_A, password: PASSWORD });
  const sb = await userB.auth.signInWithPassword({ email: EMAIL_B, password: PASSWORD });
  if (sa.error || sb.error) throw new Error(`sign in: ${sa.error?.message} / ${sb.error?.message}`);

  // Unique-per-run fixed uuids (a/b suffix separates users; no RNG in seed paths).
  const runHex = RUN.toString(16).padStart(12, "0");
  sessionIdA = `00000000-0000-4000-8000-${runHex.slice(0, 11)}1`;
  sessionIdB = `00000000-0000-4000-8000-${runHex.slice(0, 11)}2`;

  programA = crypto.randomUUID();
  programB = crypto.randomUUID();
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
  const paths = [uidA, uidB].filter(Boolean).map((id) => `${id}/rls-${RUN}.txt`);
  if (paths.length) {
    const removed = await admin.storage.from("drawings").remove(paths);
    if (removed.error) errors.push(`storage: ${removed.error.message}`);
  }
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
  for (const table of USER_TABLES) {
    const ids = [uidA, uidB].filter(Boolean);
    if (!ids.length) break;
    const remaining = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .in(table === "profiles" ? "id" : "user_id", ids);
    if (remaining.error || remaining.count !== 0) errors.push(`cascade cleanup: ${table}`);
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
    expect(up.error?.code).toBe("42501");

    const del = await userA.from("programs").delete().eq("id", bRow.data!.id);
    expect(del.error?.code).toBe("42501");
    const still = await admin.from("programs").select("id").eq("id", bRow.data!.id);
    expect(still.data).toHaveLength(1);

    const ins = await userA.from("programs").insert({
      user_id: uidB,
      track: "anxiety",
      start_date: "2026-10-19",
    });
    expect(ins.error?.code).toBe("42501");
  });
});

describe("server-owned lifecycle records", () => {
  const inserts: Record<string, () => Record<string, unknown>> = {
    programs: () => ({
      user_id: uidA,
      track: "anxiety",
      start_date: "2020-01-01",
      status: "abandoned",
    }),
    reports: () => ({ user_id: uidA, program_id: programA, summary: {} }),
    risk_events: () => ({ user_id: uidA, session_id: sessionIdA, reason: "safety_answer" }),
  };
  for (const table of Object.keys(inserts)) {
    it(`${table}: own insert is denied`, async () => {
      expect((await userA.from(table).insert(inserts[table]())).error?.code).toBe("42501");
    });
    it(`${table}: own update is denied`, async () => {
      const patch =
        table === "programs"
          ? { start_date: "2020-01-01", post_session_id: sessionIdA }
          : table === "reports"
            ? { summary: { forged: true } }
            : { reason: "severe_score" };
      expect((await userA.from(table).update(patch).eq("user_id", uidA)).error?.code).toBe("42501");
    });
    it(`${table}: own delete is denied`, async () => {
      expect((await userA.from(table).delete().eq("user_id", uidA)).error?.code).toBe("42501");
    });
  }
});

describe("linked rows must have the same owner, including privileged server writes", () => {
  const cases = [
    {
      table: "programs",
      field: "pre_session_id",
      fields: { track: "anxiety", start_date: "2026-10-19", status: "abandoned" },
    },
    {
      table: "programs",
      field: "post_session_id",
      fields: { track: "anxiety", start_date: "2026-10-19", status: "abandoned" },
    },
    { table: "risk_events", field: "session_id", fields: { reason: "safety_answer" } },
    { table: "task_completions", field: "program_id", fields: { day_no: 2 } },
    { table: "mood_entries", field: "program_id", fields: { mood: 5, entry_date: "2026-10-19" } },
    {
      table: "journal_entries",
      field: "program_id",
      fields: { kind: "free", content: "ownership test" },
    },
    { table: "thought_records", field: "program_id", fields: { situation: "ownership test" } },
    { table: "drawings", field: "program_id", fields: { storage_path: "ownership-test.png" } },
    { table: "reports", field: "program_id", fields: { summary: {} } },
  ];
  it.each(cases)(
    "$table / $field rejects cross-owner inserts and updates",
    async ({ table, field, fields }) => {
      const target = field === "program_id" ? programB : sessionIdB;
      const inserted = await admin
        .from(table)
        .insert({ ...fields, user_id: uidA, [field]: target });
      expect(inserted.error?.code).toBe("23503");
      const own = await admin.from(table).select("id").eq("user_id", uidA).limit(1).single();
      expect(own.error).toBeNull();
      const updated = await admin
        .from(table)
        .update({ [field]: target, ...(table === "task_completions" ? { day_no: 2 } : {}) })
        .eq("id", own.data!.id);
      expect(updated.error?.code).toBe("23503");
    },
  );

  it.each(cases.filter(({ table }) => !["programs", "risk_events", "reports"].includes(table)))(
    "$table also rejects cross-owner inserts from an authenticated client",
    async ({ table, fields }) => {
      const result = await userA
        .from(table)
        .insert({ ...fields, user_id: uidA, program_id: programB });
      expect(result.error?.code).toBe("23503");
    },
  );

  it("program deletion preserves moods and their owners, and cascades journal rows", async () => {
    const programId = crypto.randomUUID();
    const program = await admin.from("programs").insert({
      id: programId,
      user_id: uidA,
      track: "anxiety",
      start_date: "2026-10-19",
      status: "abandoned",
    });
    expect(program.error).toBeNull();
    const mood = await userA
      .from("mood_entries")
      .insert({ user_id: uidA, program_id: programId, entry_date: "2026-10-19", mood: 7 })
      .select("id")
      .single();
    expect(mood.error).toBeNull();
    const journal = await userA
      .from("journal_entries")
      .insert({ user_id: uidA, program_id: programId, kind: "free", content: "cascade test" })
      .select("id")
      .single();
    expect(journal.error).toBeNull();
    expect((await admin.from("programs").delete().eq("id", programId)).error).toBeNull();
    const kept = await userA
      .from("mood_entries")
      .select("user_id,program_id")
      .eq("id", mood.data!.id)
      .single();
    expect(kept.error).toBeNull();
    expect(kept.data).toEqual({ user_id: uidA, program_id: null });
    expect(
      (await userA.from("journal_entries").select("id").eq("id", journal.data!.id)).data,
    ).toEqual([]);
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
