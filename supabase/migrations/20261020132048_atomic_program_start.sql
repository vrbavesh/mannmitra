-- Service-only writer: shared profile lock also serializes against pretest submission.
create function public.start_program(p_user_id uuid, p_pre_session_id uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  profile public.profiles%rowtype;
  screening public.screening_sessions%rowtype;
  program public.programs%rowtype;
  chosen_track text;
begin
  select * into profile from public.profiles where id = p_user_id for update;
  if not found or not profile.onboarding_completed then
    raise exception using errcode = 'P0001', message = 'program_unavailable';
  end if;
  select * into screening from public.screening_sessions
    where user_id = p_user_id and kind = 'pre' order by completed_at desc limit 1;
  if not found or screening.id is distinct from p_pre_session_id
    or screening.severity is null or screening.severity = 'severe' or screening.safety_answer <> 0
    or screening.wellbeing_pct is null or screening.anxiety_pct is null
    or screening.depression_pct is null or screening.negmood_pct is null then
    raise exception using errcode = 'P0001', message = 'program_unavailable';
  end if;
  select * into program from public.programs where user_id = p_user_id and status in ('active', 'completed')
    order by created_at desc limit 1;
  if found then
    if program.status = 'active' and program.pre_session_id = p_pre_session_id then
      return jsonb_build_object('program_id', program.id, 'track', program.track, 'start_date', program.start_date, 'created', false);
    end if;
    raise exception using errcode = 'P0001', message = 'program_unavailable';
  end if;
  -- Same stable tie order as assignTrack: anxiety, depression, negative_thinking.
  select name into chosen_track from (values
    ('anxiety', screening.anxiety_pct, 0), ('depression', screening.depression_pct, 1),
    ('negative_thinking', screening.negmood_pct, 2)
  ) as areas(name, distress, priority) order by distress desc, priority limit 1;
  insert into public.programs(user_id, track, start_date, pre_session_id)
    values(p_user_id, chosen_track, (now() at time zone profile.timezone)::date, screening.id)
    returning * into program;
  return jsonb_build_object('program_id', program.id, 'track', program.track, 'start_date', program.start_date, 'created', true);
end;
$$;
revoke all on function public.start_program(uuid, uuid) from public, anon, authenticated;
grant execute on function public.start_program(uuid, uuid) to service_role;
