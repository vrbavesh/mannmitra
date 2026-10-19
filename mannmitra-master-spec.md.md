

MannMitra: Master Product and Build Spec (v2)
Mental wellbeing screening and 30-day self-help web app. This is a
screening and self-help tool, not a diagnosis or treatment.

- Errors found in the original document and how they are

fixed
#Problem in originalFix in this spec
1"Resend triggers the
SAME OTP generator"
implied the same code is
reused
Resend creates a new code. The old code stops
working. Timer and attempt counter restart.
2Sign In accepts
Email/UserID, but email
signup never collects a
UserID
Username is collected in /onboarding for
both email and Google users (unique,
lowercase).
## 3"ONBOARDING
(/pretest)" mixed two
different steps
Split into /onboarding (profile) and
## /pretest (screening).
4"If flag is down" never
defined
Flag is profiles.onboarding_completed
(false = go to /onboarding, true = go to
## /home).
5"User not found" reveals
which emails or
usernames exist
One calm message for unknown user and
wrong password (section 3.3).
## 6
/return-404 and
/return-500 as normal
URLs
Use the framework's automatic not-found
and error pages. They appear on any bad
URL or server error.
7Forgot Password had no
route, and Google-only
accounts were not handled
## Added /forgot-password. Google-only
accounts see a message to use Google sign in.
8"Forgot Username Logic"
was empty
Defined in section 3.6 using email OTP.

#Problem in originalFix in this spec
9Google vs email same-
email rule had no
enforcement method
Defined in section 3.4, including a warning
that Supabase may auto-link accounts by
default.
10Screening tool had no
scoring and no self-harm
question
Added scoring (section 5) and a mandatory
safety question.
11Female version tied
directly to onboarding
Gender question has a third option. Menstrual
module sits behind a feature flag and is built
later.
12Home page blankDefined in section 13.
13Unverified signups could
linger
Unverified accounts are blocked everywhere
and auto-deleted after 24 hours.
14Result screen, risk gate,
track assignment, 30-day
program, post-test, report
were missing
Added (sections 6 to 12).
- Stack (free tier)
Next.js (App Router, TypeScript), Tailwind CSS
Landing page: React Three Fiber (three.js) and Framer Motion, with
a lightweight fallback and prefers-reduced-motion support
Supabase: Auth, Postgres with Row Level Security, Storage
(drawings, report PDFs)
Gemini or Groq API: AI chatbot (later phase)
## Hosting: Vercel

- Routes and access rules
RouteWho can open itNotes
## /
Everyone3D landing page, Sign
Up and Sign In buttons
## /privacy, /terms
EveryoneLegal pages (section 15)
not-found, error
AutomaticCalm 404 and 500 pages
## /signup
Logged outEmail + password, or
## Google
## /signup/verify
Signed up, email
not verified
OTP screen
## /signin
Logged outEmail or username +
password, or Google
## /forgot-password,
## /forgot-username
Logged outOTP based
## /onboarding
Verified, not
onboarded
Username, name,
gender, consent
## /pretest
Onboarded, no
pretest
MHI-18 + safety
question
## /pretest/result
After pretestScore, risk gate, track
## /crisis
EveryoneHelplines and hospital
finder
## /home
Active usersToday's task, progress
## /program
Active users30-day map

RouteWho can open itNotes
## /program/day/[n]
Active usersRuns that day's task
## /progress
Active usersCharts, garden, streak
## /posttest
Day 30 reachedSame screening again
/report/[programId]
After posttestReport with PDF
download
## /settings
Active usersProfile, reminders,
export and delete data
Guard logic (middleware)
Each user has one derived stage. The middleware sends them to the only
page allowed for that stage.

StageConditionAllowed pages
unverified
Email not confirmed
## /signup/verify
needs_onboardingonboarding_completed =
false
## /onboarding
needs_pretest
No pretest session
## /pretest
blocked
Pretest severity = severe or
safety flag
## /pretest/result,
## /crisis, /settings
active
Program running
## /home, /program/*,
## /progress, /settings,
## /crisis
needs_posttest
Day 30 reached, no
posttest
## /posttest
completed
Posttest done
## /report/*, /home
## (summary), /settings

- Authentication flows
3.1 Rules for every OTP screen
RuleValue
Code length6 digits
Code validity2 minutes
## Resend
cooldown
2 minutes (button appears when the old code expires)
Wrong attempts5 per code, then the user must resend
Resend behaviorGenerates a new code and cancels the old one
## Server
enforcement
Set the same 2-minute values in Supabase Auth settings. The
screen timer is only for display.
Email template
Must include the code placeholder {{ .Token }},
otherwise users get a link instead of a code
3.2 Sign up with email
- User enters email, password, confirm password (minimum 8
characters).
- App calls Supabase sign up. "Confirm email" is turned on.
- Screen always says: "If this email can be registered, we sent a code."
(Same text whether or not the email already exists.)
- /signup/verify: OTP input with 2-minute timer.
- Correct code: email is verified, redirect to /onboarding.
- Wrong code: error, attempt counted. Expired code: "Code expired",
Resend appears.
- Registration is complete only after verification. Until then the user
can reach nothing else.

- A scheduled database job deletes unverified accounts older than 24
hours.
3.3 Sign in
- User enters email or username, plus password.
- If the input has no "@", a server route finds the email for that
username (service key kept server side), then signs in.
- Success: stage decides the redirect (section 2).
- Failure message (soft white card, calm text, no red): "We couldn't
sign you in with those details, but don't worry, you can try again."
- The same message is used for unknown account and wrong
password.
- If the email exists but is unverified, send the user to
## /signup/verify.
- Add rate limiting on the server route (for example 10 attempts per
10 minutes per IP).
3.4 Google sign up and sign in
First time with Google (new account)
- Google returns the verified email and name.
- Create the account, redirect to /onboarding.
- Name is pre-filled and editable. The user chooses a username. No
password is needed.
Returning Google user
- If onboarding_completed = true, go to /home (or the stage page).
- If false, go to /onboarding.
Same email already registered with email and password
- Do not let them in. Show: "An account with this email already exists.
Please sign in with your email and password."
- This stops two accounts merging and losing data.

- Important: Supabase can automatically link a Google login to an
existing account with the same email. So the rule must be enforced
by code. After the Google callback, check the user's linked
identities. If an email identity exists, sign the user out, remove the
new Google identity (admin API; check Supabase docs for the exact
call), and show the message above.
- Test this case before anything else. It is the riskiest part of auth.
3.5 Forgot password
- /forgot-password: user enters email, taps "Send OTP".
- Screen always says: "If an account exists, we sent a code."
- OTP screen with the rules in section 3.1.
- Correct code creates a temporary session that only allows the next
screen.
- Set new password (minimum 8 characters, confirm). Supabase
stores it hashed. Do not write passwords to your own tables.
- Sign out other devices. The current session continues, so the user
goes straight to their stage page.
- Google-only accounts: show "This account uses Google sign in"
instead of sending a code.
3.6 Forgot username
- /forgot-username: user enters email, taps "Send OTP".
- Same OTP rules as 3.1. Same neutral message.
- After a correct code, show the username on screen, then sign the
temporary session out.
- Button: "Go to sign in".
## 3.7 Sessions
Session stays active until sign out.
Sign out button in /settings and the header.
Changing the password signs out other devices.

## 4. Onboarding (/onboarding)
One screen per step, with a progress bar.
- Username: 3 to 20 characters, lowercase letters, numbers,
underscore, must be unique. Live "available" check.
- Display name (pre-filled for Google users, editable).
- Gender: Male, Female, Other or prefer not to say.
The menstrual module (female users) is built later and hidden
behind a feature flag cycle_tracking_enabled.
- Age confirmation. Decide the target age before launch. If under-18
users are allowed, Indian data protection law may require parental
consent, so check with a lawyer.
- Consent: Terms, Privacy Policy, and "I understand this is not a
medical diagnosis" (all required).
- Optional: daily reminder time.
- Save, set onboarding_completed = true, redirect to /pretest.
## 5. Pre-test (/pretest)
5.1 Screening tool
Mental Health Inventory (MHI-18), as given in the original document:
18 questions, one per screen.
Prompt: "During the past 4 weeks, how much of the time..."
Answers: 1 All of the time, 2 Most of the time, 3 A good bit of the
time, 4 Some of the time, 5 A little bit of the time, 6 None of the time.
Items: 1 interesting daily life, 2 depressed, 3 loved and wanted, 4
very nervous, 5 firm control of behavior and emotions, 6 tense or
high-strung, 7 calm and peaceful, 8 emotionally stable, 9
downhearted and blue, 10 able to relax, 11 restless or fidgety, 12
moody or brooded, 13 cheerful, 14 low spirits, 15 happy, 16 nothing
to look forward to, 17 so down nothing could cheer you up, 18
anxious or worried.

5.2 Mandatory safety question (added)
MHI-18 has no question about self-harm. Add one after item 18:
Over the last 2 weeks, how often have you had thoughts that you
would be better off dead, or of hurting yourself? 0 Not at all, 1 Several
days, 2 More than half the days, 3 Nearly every day
This matches the wording of the public PHQ-9 item 9. Any answer above
0 triggers the risk gate immediately, whatever the score.
## 5.3 Scoring
Step 1: recode so a higher number always means better.
Positive items 1, 3, 5, 7, 8, 10, 13, 15: score = 7 minus the raw answer.
Negative items 2, 4, 6, 9, 11, 12, 14, 16, 17, 18: score = the raw answer.
Step 2: totals.
Total = sum of the 18 recoded scores (18 to 108).
Wellbeing % = (total - 18) / 90 x 100.
Overall distress % = 100 - wellbeing %.
Step 3: problem areas (provisional mapping).
AreaItems
## Anxiety4, 6, 7, 10, 11, 18
## Depression1, 2, 3, 9, 13, 14, 15, 16, 17
Negative mood5, 8, 9, 12, 14, 16
For each area: area distress % = 100 - (area wellbeing %), calculated the
same way over just those items.
Step 4: severity bands (provisional, on overall distress %).

Distress %Severity
Under 30Minimal
30 to 49Mild
50 to 69Moderate
70 or moreSevere
The item-to-area mapping and the band cut-offs above are
placeholders built from the item wording. Before launch, replace
them with the official MHI scoring key and have a qualified mental
health professional review them.
- Risk gate (/pretest/result)
ConditionWhat the app does
Safety answer
above 0
Show the support screen immediately. No program.
Severity = SevereShow the support screen. No program.
## Severity =
## Moderate
Offer the program, with a gentle recommendation to also
see a counsellor.
Severity = MildOffer the program.
Severity = MinimalShow wellness tips and offer the program as optional.
Support screen (calm design, no alarm colors):
Short kind message: your answers suggest you may benefit from
talking to a professional.
Tele-MANAS helpline: 14416 (India). Emergency: 112.

Button: find nearby hospitals and mental health centres (Google
Places or OpenStreetMap, phone numbers shown).
No self-help activities are unlocked.
Store a row in risk_events.
The user can retake the screening only after 14 days. If the safety
answer was above 0, show the support screen again each time they
sign in.
- Track assignment
- Compute distress % for anxiety, depression, negative mood.
- Assign the highest area as the track.
- If the top two are within 10 points, assign the highest and mention
the second as a "bonus" suggestion (no blended plan in version 1).
- Show a result screen: the user's wellbeing %, strongest area, and
what the next 30 days look like.
- Button: "Start my 30 days". This sets start_date to today in the
user's time zone and creates the program.

- 30-day program engine
RuleValue
Length30 days (day 30 = post-test)
Odd days (1, 3 ... 29)Main activity, 10 to 15 minutes
Even days (2, 4 ... 28)Break-day micro task, 1 to 3 minutes
Unlock time
Local midnight of start_date + (day - 1)
No skipping aheadA day's task opens only on its day
Catch-up windowA missed task stays open for 48 hours, then becomes
missed
Late userDay 30 post-test stays available any time after day 30
Long absence (7+
days)
Friendly welcome back, continue from today, no penalty
message
CompletionA task counts as done only after a mood check before
and after
Every task saves: mood before, mood after, time taken, and its own data
(for example drawing, journal text).
- Task library
Digital, interactive tasks only. Days 1 to 9 are final. Days 10 to 30 reuse the
same components and get written next.

Depression track
DayTaskComponent
1Pick your activities: drag 5 from a card deck into a
ranked list
## Drag-and-drop
board
2Water your mood garden and rate moodMood check
## (garden)
3Build a happy playlist of 5 songs and play oneMedia player
4Mood weather: pick the weather and set strengthMood check
## (weather)
5Laugh break: funny clip and laugh ratingMedia player
6Kind card flip: flip 3 cards, save a favouriteCard flip
7Make a beat on an 8-step gridBeat grid
8Good-thing tap: tap emoji tiles for what went wellEmoji picker
9Draw your mood on the canvasArt canvas

Anxiety track
DayTaskComponent
1Box breathing, 5 minutesBreathing pacer
2Calm balloon: hold to inflate, release to floatBreathing pacer (game)
3Belly breathing: in 4, out 6Breathing pacer
4Bubble pop, 1 minuteBubble game
5Scene grounding: tap items in an illustrated
room
Grounding scene
6Squeeze and release: hold to fill, release to
drain
Tension slider
7Muscle relaxation audio with body outlineMedia player with body
outline
8Pick a calm sound and volumeSound mixer
9Worry sort: drag worries into "I can control"
or "I can't"
Drag-and-drop board

Negative thinking track
DayTaskComponent
1Thinking-trap game: match 4 thoughts to trapsDrag-and-drop
board
2Trap spotter: 3 quick sentencesQuick quiz
3Thought record: situation, thought, evidence for
and against, balanced thought
Thought record
form
4Word swap: replace "should", "always", "never" in 5
sentences
Word swap
5Gratitude journal: 3 good things and whyJournal form
6Kind card flip with self-kind sentencesCard flip
7Thought cloud: draw and redraw kinderArt canvas (redraw
mode)
8What went well: tap emoji tilesEmoji picker
9Friend reframe in a chat-style screenJournal form (chat
skin)
Day 10 to 30 outline (to be written next)
Depression: more behavior activation (learn-a-skill mini games,
gratitude, social message drafts, future-self letter, planning).
Anxiety: fear ladder (build and rate steps), worry time, body scan
audio, thought challenge, toolkit.
Negative thinking: more thought records, strengths list, self-
compassion letter, best-possible-self writing, wins jar, belief
experiment tracker.

- Reusable components
ComponentUsed byNotes
Mood check (0 to 10, with garden or
weather skins)
Every taskRequired before
and after
Task card (text, example, timer,
done, celebration)
Every taskShell around the
others
Drag-and-drop boardDepression 1,
anxiety 9, negative
thinking 1
Same engine,
different labels
and bins
Card flipDepression 6,
negative thinking 6
Only card text
changes
Emoji pickerDepression 8,
negative thinking 8
Only tile set
changes
Art canvasDepression 9,
negative thinking 7
Redraw layer is an
option
Media player (audio, YouTube, body
outline option)
Depression 3 and 5,
anxiety 7
Timer built in
Journal form (chat skin option)Negative thinking 5
and 9
Saved to timeline
Breathing pacer (circle, balloon
modes)
Anxiety 1 to 3Anxiety only
Thought record formNegative thinking 3
and later
Reused later by
anxiety

ComponentUsed byNotes
Beat grid, bubble game, grounding
scene, tension slider, quick quiz,
word swap, sound mixer
One track eachKept separate on
purpose
- Progress and dashboard (/progress, shown in part on /home)
Program progress ring: days completed out of 30.
Completion rate: done tasks / due tasks.
Mood chart: daily average of mood before and after.
Task effect list: tasks with the biggest improvement (mood after
minus mood before).
Gentle streak: consecutive days with any completed task. One
missed day does not reset it (one "grace day" per week). Never use
shaming messages.
Mood garden: grows in 6 stages as days complete.
Pretest vs current wellbeing %, shown after the post-test.
- Post-test and report
Post-test (/posttest, opens on day 30)
Same MHI-18 and the same safety question.
If the safety answer is above 0 or severity is severe, show the
support screen first.
Report (/report/[programId])
Generated automatically after the post-test and downloadable as PDF.
- Summary: start and end dates, tasks completed, completion rate.
- Scores: pretest vs post-test wellbeing %, overall and for each area,
with the change.

- Result label per area: improved, no clear change, or worse. A change
of 5 points or more in wellbeing % counts as meaningful
(provisional cut-off).
- Mood trend: average mood first 7 days vs last 7 days.
- Best-working activities: top 3 by mood improvement.
- Next steps: continue with favourite activities, or see a professional if
scores stayed high or got worse.
- Disclaimer: this is a self-help screening tool, not a diagnosis.
- Home page (/home)
Header: logo, crisis help button (always visible), profile menu.
Today's task card (or a "rest day" micro card), with a start button.
Progress ring and gentle streak.
Quick mood check.
Mood garden preview.
Next unlock countdown.
Later phase: AI chatbot and nearby hospital finder.
- Database (Supabase Postgres)
sql

create extension if not exists pgcrypto;
-- Profile, one per auth user
create table profiles (
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
constraint username_format check (username is null or username ~ '^
## );
create unique index profiles_username_key on profiles (lower(username
-- Create the profile row automatically when an auth user is created
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
insert into profiles (id, display_name, auth_provider)
values (new.id,
new.raw_user_meta_data->>'full_name',
coalesce(new.raw_app_meta_data->>'provider','email'));
return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function handle_new_user();
-- Screening sessions (pre and post)
create table screening_sessions (
id uuid primary key default gen_random_uuid(),

user_id uuid not null references profiles(id) on delete cascade,
kind text not null check (kind in ('pre','post')),
safety_answer int not null check (safety_answer between 0 and 3),
total_score int,
wellbeing_pct numeric,
distress_pct numeric,
anxiety_pct numeric,
depression_pct numeric,
negmood_pct numeric,
severity text check (severity in ('minimal','mild','moderate','seve
completed_at timestamptz not null default now()
## );
create table screening_answers (
session_id uuid references screening_sessions(id) on delete cascade
item_no int check (item_no between 1 and 18),
raw_value int not null check (raw_value between 1 and 6),
primary key (session_id, item_no)
## );
-- The 30-day program
create table programs (
id uuid primary key default gen_random_uuid(),
user_id uuid not null references profiles(id) on delete cascade,
track text not null check (track in ('depression','anxiety','negati
start_date date not null,
status text not null default 'active'
check (status in ('active','completed','abandoned')),
pre_session_id uuid references screening_sessions(id),
post_session_id uuid references screening_sessions(id),
created_at timestamptz not null default now()
## );
-- Only one active program per user
create unique index one_active_program on programs (user_id) where st
-- Task library (same for everyone, read only)

create table task_templates (
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
## );
-- What the user did each day
create table task_completions (
id uuid primary key default gen_random_uuid(),
user_id uuid not null references profiles(id) on delete cascade,
program_id uuid not null references programs(id) on delete cascade,
day_no int not null,
status text not null default 'locked'
check (status in ('locked','available','done','missed')),
mood_before int check (mood_before between 0 and 10),
mood_after int check (mood_after between 0 and 10),
payload jsonb not null default '{}',
completed_at timestamptz,
unique (program_id, day_no)
## );
create table mood_entries (
id uuid primary key default gen_random_uuid(),
user_id uuid not null references profiles(id) on delete cascade,
program_id uuid references programs(id) on delete set null,
entry_date date not null default current_date,
mood int not null check (mood between 0 and 10),
created_at timestamptz not null default now()
## );

create table journal_entries (
id uuid primary key default gen_random_uuid(),
user_id uuid not null references profiles(id) on delete cascade,
program_id uuid references programs(id) on delete cascade,
day_no int,
kind text not null,
content text not null,
created_at timestamptz not null default now()
## );
create table thought_records (
id uuid primary key default gen_random_uuid(),
user_id uuid not null references profiles(id) on delete cascade,
program_id uuid references programs(id) on delete cascade,
day_no int,
situation text,
thought text,
feeling_before int check (feeling_before between 0 and 100),
evidence_for text,
evidence_against text,
balanced_thought text,
feeling_after int check (feeling_after between 0 and 100),
created_at timestamptz not null default now()
## );
create table drawings (
id uuid primary key default gen_random_uuid(),
user_id uuid not null references profiles(id) on delete cascade,
program_id uuid references programs(id) on delete cascade,
day_no int,
title text,
storage_path text not null,          -- private bucket: drawings/{u
created_at timestamptz not null default now()
## );

-- Songs, beats, favourite cards
create table saved_items (
id uuid primary key default gen_random_uuid(),
user_id uuid not null references profiles(id) on delete cascade,
kind text not null check (kind in ('song','beat','kind_card','stren
data jsonb not null,
created_at timestamptz not null default now()
## );
create table risk_events (
id uuid primary key default gen_random_uuid(),
user_id uuid not null references profiles(id) on delete cascade,
session_id uuid references screening_sessions(id),
reason text not null check (reason in ('safety_answer','severe_scor
created_at timestamptz not null default now()
## );
create table reports (
id uuid primary key default gen_random_uuid(),
user_id uuid not null references profiles(id) on delete cascade,
program_id uuid not null references programs(id) on delete cascade,
summary jsonb not null,
pdf_path text,
generated_at timestamptz not null default now()
## );
-- Row Level Security: each user sees only their own rows
alter table profiles enable row level security;
create policy "own profile" on profiles
for all using (id = auth.uid()) with check (id = auth.uid());
do $$
declare t text;
begin
foreach t in array array[
## 'screening_sessions','programs','task_completions','mood_entries'

## Notes:
Passwords live only in Supabase's own auth tables, hashed. Never
add a password column to your tables.
Scoring and risk-gate checks should run on the server, not only in
the browser.
The username lookup used at sign in runs on a server route with the
service key. The service key must never reach the browser.
Drawings go in a private storage bucket with a policy limiting each
user to their own folder.
## 'journal_entries','thought_records','drawings','saved_items',
## 'risk_events','reports'
] loop
execute format('alter table %I enable row level security', t);
execute format(
'create policy "own rows" on %I for all using (user_id = auth.u
end loop;
end $$;
alter table screening_answers enable row level security;
create policy "own answers" on screening_answers for all
using (exists (select 1 from screening_sessions s
where s.id = session_id and s.user_id = auth.uid()))
alter table task_templates enable row level security;
create policy "read templates" on task_templates
for select using (auth.role() = 'authenticated');
-- Remove unverified accounts after 24 hours (schedule with pg_cron)
-- delete from auth.users where email_confirmed_at is null and create

- Security, privacy, and legal
Treat all screening answers, journals, and drawings as sensitive
health data.
Row Level Security on every table (section 14). Test it by trying to
read another user's rows.
Never log OTP codes or passwords.
Rate limit sign in, OTP sending, and OTP verification.
Settings page: export my data and delete my account (cascade
delete removes everything).
/privacy must cover: what is collected (email, name, answers,
journals, drawings, mood), why, how long it is kept, who can see it
(only the user), how to delete it, third parties (Supabase, Google
sign in, Gemini or Groq), and a contact address.
/terms must cover: not a medical service or diagnosis, not for
emergencies, helplines, age rule, acceptable use, limitation of
liability, and changes to terms.
Have both pages reviewed by a lawyer who knows Indian data
protection law before launch. A generated draft is a starting point,
not legal clearance.
Plain, calm wording in terms and privacy pages, with short
summaries at the top of each section.

- Build phases
PhaseWork
1Project setup, Supabase project, tables and RLS, middleware stage guard
2Auth: email signup with OTP, sign in, Google with the same-email check,
forgot password, forgot username
3Onboarding, pretest, scoring, risk gate, result screen, crisis page
4Program engine, home page, mood check, task card, days 1 to 9
components
5Progress dashboard, garden, streak
6Post-test and report with PDF
7Days 10 to 30 content
8Landing page 3D design, 404 and 500 pages, privacy and terms
9Chatbot and hospital finder
10Menstrual module (female version), smartwatch ideas
Commit and push to GitHub after each phase.