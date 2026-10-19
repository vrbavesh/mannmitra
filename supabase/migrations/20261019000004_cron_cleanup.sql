-- Remove unverified accounts after 24 hours (spec §3.2, §13).
-- pg_cron runs as the scheduling role; auth.users delete cascades to profiles
-- (FK on delete cascade) and everything user-owned.
create extension if not exists pg_cron;

select cron.schedule(
  'delete-unverified-users',
  '43 * * * *', -- hourly at :43, off the top of the hour
  $job$
    delete from auth.users
    where email_confirmed_at is null
      and created_at < now() - interval '24 hours'
  $job$
);
