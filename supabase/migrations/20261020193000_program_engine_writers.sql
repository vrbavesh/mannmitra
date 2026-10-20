-- Step 12: the 30-day program engine writes through service-only functions.
-- Direct client writes to task_completions and mood_entries are revoked so a
-- browser cannot create a completion or choose its own day bucket. Reads stay
-- owner-scoped through RLS. Local dates always come from profiles.timezone.
-- NOTE: window checks mirror src/lib/engine/dayState.ts (local midnight, 48h
-- catch-up). If those constants change, update both.

create function public.open_program_day(p_user_id uuid, p_day integer) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  profile public.profiles%rowtype;
  program_row public.programs%rowtype;
  unlock_ts timestamptz;
  row_out public.task_completions%rowtype;
begin
  if p_day is null or p_day < 1 or p_day > 29 then
    raise exception using errcode = '22023', message = 'invalid_day';
  end if;
  select * into profile from public.profiles where id = p_user_id;
  if not found or not profile.onboarding_completed then
    raise exception using errcode = 'P0001', message = 'program_unavailable';
  end if;
  select * into program_row from public.programs
    where user_id = p_user_id and status = 'active'
    order by created_at desc limit 1;
  if not found then
    raise exception using errcode = 'P0001', message = 'program_unavailable';
  end if;
  unlock_ts := ((program_row.start_date + (p_day - 1))::timestamp) at time zone profile.timezone;
  if now() < unlock_ts then
    raise exception using errcode = 'P0001', message = 'day_locked';
  end if;
  -- Lazy row: a day only gets a completion row when it is actually opened.
  insert into public.task_completions(user_id, program_id, day_no, status)
    values (p_user_id, program_row.id, p_day, 'available')
    on conflict (program_id, day_no) do nothing;
  select * into row_out from public.task_completions
    where program_id = program_row.id and day_no = p_day;
  return jsonb_build_object(
    'day_no', row_out.day_no,
    'status', row_out.status,
    'completed_at', row_out.completed_at
  );
end;
$$;

create function public.complete_program_day(
  p_user_id uuid,
  p_day integer,
  p_mood_before integer,
  p_mood_after integer,
  p_time_s integer,
  p_payload jsonb
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  profile public.profiles%rowtype;
  program_row public.programs%rowtype;
  unlock_ts timestamptz;
  row_out public.task_completions%rowtype;
  done_count integer;
begin
  if p_day is null or p_day < 1 or p_day > 29
    or p_mood_before is null or p_mood_before < 0 or p_mood_before > 10
    or p_mood_after is null or p_mood_after < 0 or p_mood_after > 10
    or p_time_s is null or p_time_s < 0 or p_time_s > 86400
    or p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_completion';
  end if;
  select * into profile from public.profiles where id = p_user_id;
  if not found or not profile.onboarding_completed then
    raise exception using errcode = 'P0001', message = 'program_unavailable';
  end if;
  select * into program_row from public.programs
    where user_id = p_user_id and status = 'active'
    order by created_at desc limit 1;
  if not found then
    raise exception using errcode = 'P0001', message = 'program_unavailable';
  end if;
  unlock_ts := ((program_row.start_date + (p_day - 1))::timestamp) at time zone profile.timezone;
  if now() < unlock_ts then
    raise exception using errcode = 'P0001', message = 'day_locked';
  end if;
  select * into row_out from public.task_completions
    where program_id = program_row.id and day_no = p_day for update;
  if row_out.completed_at is null then
    if now() >= unlock_ts + interval '48 hours' then
      raise exception using errcode = 'P0001', message = 'day_closed';
    end if;
    insert into public.task_completions(
      user_id, program_id, day_no, status, mood_before, mood_after, payload, completed_at
    ) values (
      p_user_id, program_row.id, p_day, 'done', p_mood_before, p_mood_after,
      p_payload || jsonb_build_object('time_taken_s', p_time_s), now()
    )
    on conflict (program_id, day_no) do update
      set status = 'done',
          mood_before = excluded.mood_before,
          mood_after = excluded.mood_after,
          payload = excluded.payload,
          completed_at = excluded.completed_at
      where task_completions.completed_at is null;
    select * into row_out from public.task_completions
      where program_id = program_row.id and day_no = p_day;
  end if;
  select count(*)::integer into done_count from public.task_completions
    where program_id = program_row.id and completed_at is not null;
  return jsonb_build_object(
    'day_no', row_out.day_no,
    'status', 'done',
    'completed_at', row_out.completed_at,
    'days_completed', done_count
  );
end;
$$;

create function public.record_mood_entry(p_user_id uuid, p_mood integer, p_program_id uuid)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  profile public.profiles%rowtype;
  entry_date date;
begin
  if p_mood is null or p_mood < 0 or p_mood > 10 then
    raise exception using errcode = '22023', message = 'invalid_mood';
  end if;
  select * into profile from public.profiles where id = p_user_id;
  if not found or not profile.onboarding_completed then
    raise exception using errcode = 'P0001', message = 'program_unavailable';
  end if;
  if p_program_id is not null and not exists (
    select 1 from public.programs where id = p_program_id and user_id = p_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'program_unavailable';
  end if;
  entry_date := (now() at time zone profile.timezone)::date;
  insert into public.mood_entries(user_id, program_id, entry_date, mood)
    values (p_user_id, p_program_id, entry_date, p_mood);
  return jsonb_build_object('entry_date', entry_date, 'mood', p_mood);
end;
$$;

revoke all on function public.open_program_day(uuid, integer) from public, anon, authenticated;
revoke all on function public.complete_program_day(uuid, integer, integer, integer, integer, jsonb)
  from public, anon, authenticated;
revoke all on function public.record_mood_entry(uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.open_program_day(uuid, integer) to service_role;
grant execute on function public.complete_program_day(uuid, integer, integer, integer, integer, jsonb)
  to service_role;
grant execute on function public.record_mood_entry(uuid, integer, uuid) to service_role;

-- Engine-created rows are server-owned; clients may read only their own.
drop policy "own rows" on public.task_completions;
create policy "own task completions (select only)" on public.task_completions
  for select to authenticated using (user_id = (select auth.uid()));
drop policy "own rows" on public.mood_entries;
create policy "own mood entries (select only)" on public.mood_entries
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.task_completions, public.mood_entries
  from anon, authenticated;

create index mood_entries_user_entry_date_idx
  on public.mood_entries (user_id, entry_date desc);
