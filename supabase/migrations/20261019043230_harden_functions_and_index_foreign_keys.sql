-- Keep trigger-only SECURITY DEFINER functions out of the Data API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Present on hosted Supabase projects; absent from some local stacks.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

-- Cover foreign keys used by ownership reads and cascading account deletion.
create index drawings_program_id_idx on public.drawings (program_id);
create index drawings_user_id_idx on public.drawings (user_id);
create index journal_entries_program_id_idx on public.journal_entries (program_id);
create index journal_entries_user_id_idx on public.journal_entries (user_id);
create index mood_entries_program_id_idx on public.mood_entries (program_id);
create index mood_entries_user_id_idx on public.mood_entries (user_id);
create index programs_post_session_id_idx on public.programs (post_session_id);
create index programs_pre_session_id_idx on public.programs (pre_session_id);
create index reports_program_id_idx on public.reports (program_id);
create index reports_user_id_idx on public.reports (user_id);
create index risk_events_session_id_idx on public.risk_events (session_id);
create index risk_events_user_id_idx on public.risk_events (user_id);
create index saved_items_user_id_idx on public.saved_items (user_id);
create index screening_sessions_user_id_idx on public.screening_sessions (user_id);
create index task_completions_user_id_idx on public.task_completions (user_id);
create index thought_records_program_id_idx on public.thought_records (program_id);
create index thought_records_user_id_idx on public.thought_records (user_id);
