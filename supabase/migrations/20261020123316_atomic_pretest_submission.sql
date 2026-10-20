-- Atomic pretest writer, callable only by the verified server's service-role client.
create function public.submit_pretest(
  p_user_id uuid, p_answers integer[], p_safety integer, p_result jsonb, p_version integer
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  profile public.profiles%rowtype;
  previous public.screening_sessions%rowtype;
  session_id uuid;
  today date;
  reason text;
begin
  select * into profile from public.profiles where id = p_user_id for update;
  if not found or not profile.onboarding_completed then
    raise exception using errcode = 'P0001', message = 'screening_unavailable';
  end if;
  if coalesce(array_length(p_answers, 1), 0) <> 18
    or exists (select 1 from unnest(p_answers) v where v is null or v < 1 or v > 6)
    or p_safety is null or p_safety < 0 or p_safety > 3 or p_version is null or p_version < 1 then
    raise exception using errcode = '22023', message = 'invalid_screening';
  end if;
  today := (now() at time zone profile.timezone)::date;
  select * into previous from public.screening_sessions
    where user_id = p_user_id and kind = 'pre' order by completed_at desc limit 1;
  if previous.severity is not null then
    if today < (previous.completed_at at time zone profile.timezone)::date + 14 then
      raise exception using errcode = 'P0001', message = 'retake_not_allowed';
    end if;
    if previous.safety_answer = 0 and previous.severity <> 'severe' then
      raise exception using errcode = 'P0001', message = 'screening_unavailable';
    end if;
  end if;
  if exists (select 1 from public.programs where user_id = p_user_id and status in ('active','completed')) then
    raise exception using errcode = 'P0001', message = 'screening_unavailable';
  end if;
  insert into public.screening_sessions (
    user_id, kind, safety_answer, total_score, wellbeing_pct, distress_pct,
    anxiety_pct, depression_pct, negmood_pct, severity, scoring_version
  ) values (
    p_user_id, 'pre', p_safety, (p_result->>'total_score')::integer,
    (p_result->>'wellbeing_pct')::numeric, (p_result->>'distress_pct')::numeric,
    (p_result->'areas'->>'anxiety_pct')::numeric, (p_result->'areas'->>'depression_pct')::numeric,
    (p_result->'areas'->>'negmood_pct')::numeric, p_result->>'severity', p_version
  ) returning id into session_id;
  insert into public.screening_answers (session_id, item_no, raw_value)
    select session_id, ordinality, value from unnest(p_answers) with ordinality as a(value, ordinality);
  reason := case when p_safety > 0 then 'safety_answer'
    when p_result->>'severity' = 'severe' then 'severe_score' else null end;
  if reason is not null then
    insert into public.risk_events (user_id, session_id, reason) values (p_user_id, session_id, reason);
  end if;
  return session_id;
end;
$$;
revoke all on function public.submit_pretest(uuid, integer[], integer, jsonb, integer) from public, anon, authenticated;
grant execute on function public.submit_pretest(uuid, integer[], integer, jsonb, integer) to service_role;
create index screening_sessions_user_kind_completed_idx on public.screening_sessions (user_id, kind, completed_at desc);
