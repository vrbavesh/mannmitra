-- Row Level Security — spec §14 with blueprint deviations #6 and #11 applied.
-- Fail-closed posture: RLS enabled on every table; no policy → no access.

alter table public.profiles enable row level security;

create policy "own profile" on public.profiles
for all to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Spec's own-rows loop, minus screening_sessions (handled below per deviation #6).
do $$
declare t text;
begin
  foreach t in array array[
    'programs','task_completions','mood_entries',
    'journal_entries','thought_records','drawings','saved_items',
    'risk_events','reports'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "own rows" on %I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;

-- Deviation #6 (review finding M5): screening tables are READ-ONLY for clients.
-- Select own rows; no insert/update/delete policies exist, so client writes are
-- denied (no permissive policy = deny), and the table-level revoke below makes it
-- doubly sure. Rows are written only by the server scoring route (Step 10) via
-- the service role, which bypasses RLS — prevents forging severity past the risk gate.
alter table public.screening_sessions enable row level security;
create policy "own sessions (select only)" on public.screening_sessions
for select to authenticated
using (user_id = (select auth.uid()));

alter table public.screening_answers enable row level security;
create policy "own answers (select only)" on public.screening_answers
for select to authenticated
using (exists (
  select 1 from public.screening_sessions s
  where s.id = session_id and s.user_id = (select auth.uid())
));

revoke insert, update, delete on public.screening_sessions, public.screening_answers
from anon, authenticated;

-- Task library: read only, authenticated users (spec §14).
alter table public.task_templates enable row level security;
create policy "read templates" on public.task_templates
for select to authenticated using (true);
