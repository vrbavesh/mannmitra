-- Wave A audit: client lifecycle writes are forbidden; linked records share an owner.
alter table public.programs add constraint programs_user_id_id_key unique (user_id, id);
alter table public.screening_sessions add constraint screening_sessions_user_id_id_key unique (user_id, id);

alter table public.programs
  drop constraint programs_pre_session_id_fkey,
  drop constraint programs_post_session_id_fkey,
  add constraint programs_pre_session_id_fkey foreign key (user_id, pre_session_id)
    references public.screening_sessions (user_id, id),
  add constraint programs_post_session_id_fkey foreign key (user_id, post_session_id)
    references public.screening_sessions (user_id, id);

alter table public.risk_events
  drop constraint risk_events_session_id_fkey,
  add constraint risk_events_session_id_fkey foreign key (user_id, session_id)
    references public.screening_sessions (user_id, id);

alter table public.task_completions
  drop constraint task_completions_program_id_fkey,
  add constraint task_completions_program_id_fkey foreign key (user_id, program_id)
    references public.programs (user_id, id) on delete cascade;
alter table public.journal_entries
  drop constraint journal_entries_program_id_fkey,
  add constraint journal_entries_program_id_fkey foreign key (user_id, program_id)
    references public.programs (user_id, id) on delete cascade;
alter table public.thought_records
  drop constraint thought_records_program_id_fkey,
  add constraint thought_records_program_id_fkey foreign key (user_id, program_id)
    references public.programs (user_id, id) on delete cascade;
alter table public.drawings
  drop constraint drawings_program_id_fkey,
  add constraint drawings_program_id_fkey foreign key (user_id, program_id)
    references public.programs (user_id, id) on delete cascade;
alter table public.reports
  drop constraint reports_program_id_fkey,
  add constraint reports_program_id_fkey foreign key (user_id, program_id)
    references public.programs (user_id, id) on delete cascade;
-- Keep the mood's owner when a program is deleted; only clear its optional link.
alter table public.mood_entries
  drop constraint mood_entries_program_id_fkey,
  add constraint mood_entries_program_id_fkey foreign key (user_id, program_id)
    references public.programs (user_id, id) on delete set null (program_id);

drop policy "own rows" on public.programs;
drop policy "own rows" on public.reports;
drop policy "own rows" on public.risk_events;
create policy "own programs (select only)" on public.programs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own reports (select only)" on public.reports
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own risk events (select only)" on public.risk_events
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.programs, public.reports, public.risk_events
  from anon, authenticated;
