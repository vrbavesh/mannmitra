-- MannMitra initial schema — spec §14, transcribed faithfully.
-- Reconstructed truncations (spec markdown line-wrapped mid-expression), each marked:
--   * username_format check: spec §4 says 3–20 chars, lowercase letters, numbers, underscore
--   * programs.track / severity: enumerated from spec §5/§6
--   * saved_items.kind 4th value: spec comment "Songs, beats, favourite cards" + §7 "strengths list" → 'strength'
--   * risk_events.reason: spec §6 triggers (safety answer, severe score)
-- Deviations documented in blueprint §4 (#5, #6, #7, #11).

create extension if not exists pgcrypto;

-- Profile, one per auth user
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  display_name text,
  gender text check (gender in ('male','female','other')),
  auth_provider text check (auth_provider in ('email','google')),
  onboarding_completed boolean not null default false,
  consent_accepted_at timestamptz,
  timezone text not null default 'Asia/Kolkata',
  cycle_tracking_enabled boolean not null default false,
  reminder_time time,
  created_at timestamptz not null default now(),
  -- spec §4: 3 to 20 characters, lowercase letters, numbers, underscore
  constraint username_format check (username is null or username ~ '^[a-z0-9_]{3,20}$')
);

create unique index profiles_username_key on public.profiles (lower(username));

-- Create the profile row automatically when an auth user is created
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, auth_provider)
  values (new.id,
          new.raw_user_meta_data->>'full_name',
          coalesce(new.raw_app_meta_data->>'provider','email'));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Screening sessions (pre and post)
-- + scoring_version (blueprint deviation #5): stamps which scoring key produced this row
create table public.screening_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('pre','post')),
  safety_answer int not null check (safety_answer between 0 and 3),
  total_score int,
  wellbeing_pct numeric,
  distress_pct numeric,
  anxiety_pct numeric,
  depression_pct numeric,
  negmood_pct numeric,
  severity text check (severity in ('minimal','mild','moderate','severe')),
  scoring_version int not null default 1,
  completed_at timestamptz not null default now()
);

create table public.screening_answers (
  session_id uuid references public.screening_sessions(id) on delete cascade,
  item_no int check (item_no between 1 and 18),
  raw_value int not null check (raw_value between 1 and 6),
  primary key (session_id, item_no)
);

-- The 30-day program
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  track text not null check (track in ('depression','anxiety','negative_thinking')),
  start_date date not null,
  status text not null default 'active'
    check (status in ('active','completed','abandoned')),
  pre_session_id uuid references public.screening_sessions(id),
  post_session_id uuid references public.screening_sessions(id),
  created_at timestamptz not null default now()
);

-- Only one active program per user
create unique index one_active_program on public.programs (user_id) where status = 'active';

-- Task library (same for everyone, read only)
create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  track text not null,
  day_no int not null check (day_no between 1 and 29),
  title text not null,
  description text,
  example_text text,
  component text not null,
  duration_min int,
  config jsonb not null default '{}',
  unique (track, day_no)
);

-- What the user did each day
create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  day_no int not null,
  status text not null default 'locked'
    check (status in ('locked','available','done','missed')),
  mood_before int check (mood_before between 0 and 10),
  mood_after int check (mood_after between 0 and 10),
  payload jsonb not null default '{}',
  completed_at timestamptz,
  unique (program_id, day_no)
);

-- entry_date keeps spec's default, but the write path ALWAYS sets it explicitly
-- from profiles.timezone (blueprint deviation #7) — never rely on the UTC default.
create table public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null,
  entry_date date not null default current_date,
  mood int not null check (mood between 0 and 10),
  created_at timestamptz not null default now()
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  day_no int,
  kind text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table public.thought_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  day_no int,
  situation text,
  thought text,
  feeling_before int check (feeling_before between 0 and 100),
  evidence_for text,
  evidence_against text,
  balanced_thought text,
  feeling_after int check (feeling_after between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.drawings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  day_no int,
  title text,
  storage_path text not null, -- private bucket: drawings/{user_id}/{file}
  created_at timestamptz not null default now()
);

-- Songs, beats, favourite cards, strengths
create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('song','beat','kind_card','strength')),
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table public.risk_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.screening_sessions(id),
  reason text not null check (reason in ('safety_answer','severe_score')),
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  summary jsonb not null,
  pdf_path text,
  generated_at timestamptz not null default now()
);
