-- Private drawings bucket + per-user folder policy (spec §14 security notes).
insert into storage.buckets (id, name, public)
values ('drawings', 'drawings', false)
on conflict (id) do nothing;

drop policy if exists "own drawing folder" on storage.objects;
create policy "own drawing folder" on storage.objects
for all to authenticated using (
  bucket_id = 'drawings' and (storage.foldername(name))[1] = (select auth.uid())::text
) with check (
  bucket_id = 'drawings' and (storage.foldername(name))[1] = (select auth.uid())::text
);
