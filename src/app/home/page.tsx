import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { pageClient } from "@/server/authClient";
import {
  loadProgramContext,
  loadTaskTemplate,
  loadTodayMood,
  toEngineCompletion,
} from "@/server/programEngine";
import {
  LAST_TASK_DAY,
  dayStates,
  durationLabel,
  isRestDay,
  isWelcomeBack,
  nextUnlock,
  programDay,
} from "@/lib/engine/dayState";
import { formatLocalDateTime } from "@/lib/engine/format";
import { gentleStreak } from "@/lib/streak";
import { localDate } from "@/lib/stage";
import { AppHeader } from "@/components/app/AppHeader";
import { Card } from "@/components/ui/Card";
import { GardenPreview } from "@/components/program/GardenPreview";
import { NextUnlock } from "@/components/program/NextUnlock";
import { ProgressRing } from "@/components/program/ProgressRing";
import { QuickMood } from "@/components/program/QuickMood";

const startClasses =
  "inline-flex h-11 items-center justify-center rounded-control bg-primary px-6 text-sm font-semibold text-primary-foreground transition-transform duration-[120ms] hover:bg-evergreen-700 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:active:scale-100";
const quietClasses =
  "inline-flex h-11 items-center justify-center rounded-control border border-border bg-surface px-6 text-sm font-semibold text-foreground transition-transform duration-[120ms] hover:bg-muted active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:active:scale-100";

async function HomeScreen() {
  const client = await pageClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect("/signin");
  if (!user.email_confirmed_at) redirect("/signup/verify");

  const context = await loadProgramContext(client, user.id);
  if (!context.program) redirect("/pretest/result");
  const { program, completions, timezone, today, displayName } = context;

  if (program.post_session_id) {
    return (
      <>
        <AppHeader displayName={displayName} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:py-14">
          <Card className="space-y-4 p-7 sm:p-10">
            <p className="text-sm font-semibold text-primary">MannMitra · Your 30 days</p>
            <h1 className="text-3xl font-semibold tracking-tight">Your 30 days are complete.</h1>
            <p className="leading-relaxed text-muted-foreground">
              Thank you for making this time for yourself. Your final check-in is saved, and your
              report brings the last weeks together.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href={`/report/${program.id}`} className={startClasses}>
                See your report
              </Link>
              <Link href="/crisis" className={quietClasses}>
                Support is always here
              </Link>
            </div>
          </Card>
        </main>
      </>
    );
  }

  const todayDay = programDay(program.start_date, today);
  const engineCompletions = completions.map(toEngineCompletion);
  const states = dayStates({
    startDate: program.start_date,
    completions: engineCompletions,
    timezone,
    postTestDone: Boolean(program.post_session_id),
  });
  const todayState = states[todayDay - 1];
  const doneDays = states.filter((state) => state.status === "done" && state.dayNo <= 29).length;
  const template =
    todayDay <= LAST_TASK_DAY ? await loadTaskTemplate(client, program.track, todayDay) : null;
  const moodToday = await loadTodayMood(client, user.id, today);
  const completionDates = completions
    .filter((completion) => completion.completed_at)
    .map((completion) => localDate(new Date(completion.completed_at as string), timezone));
  const streak = gentleStreak(completionDates, today);
  const welcomeBack = isWelcomeBack({
    startDate: program.start_date,
    today,
    completions: engineCompletions,
    timezone,
  });
  const next = nextUnlock({ startDate: program.start_date, timezone });
  const todayCompletion = completions.find((completion) => completion.day_no === todayDay);
  const restDay = isRestDay(todayDay);
  const practiceTitle = template?.title ?? "Today's practice";
  const practiceCopy =
    template?.description ??
    "A small practice for today. Take it at your own pace, and stop whenever you need.";

  return (
    <>
      <AppHeader displayName={displayName} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:py-12">
        <header className="mb-7 space-y-2">
          <p className="text-sm font-semibold text-primary">
            {displayName.trim() ? `Hello, ${displayName.trim()}` : "Hello"}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            A gentle check-in for today.
          </h1>
          <p className="max-w-2xl leading-relaxed text-muted-foreground">
            Day {todayDay} of 30. There is no race here, only your own pace.
          </p>
        </header>

        {welcomeBack ? (
          <Card className="mb-6 border-primary/40 bg-muted/60 p-5" role="status">
            <p className="font-semibold">Welcome back.</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              However long it has been, today is a fine place to continue. Nothing is lost.
            </p>
          </Card>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-5">
            <Card className="space-y-5 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Day {todayDay} of 30 · {restDay ? "Rest day" : "Main practice"}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {template?.duration_min
                    ? `About ${template.duration_min} min`
                    : durationLabel(todayDay)}
                </p>
              </div>
              {todayState.status === "available" ? (
                <>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                      {practiceTitle}
                    </h2>
                    <p className="leading-relaxed text-muted-foreground">{practiceCopy}</p>
                  </div>
                  <Link href={`/program/day/${todayDay}`} className={startClasses}>
                    Start today&apos;s practice
                  </Link>
                </>
              ) : null}
              {todayState.status === "done" ? (
                <>
                  <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Today&apos;s practice is complete.
                  </h2>
                  <p className="leading-relaxed text-muted-foreground">
                    A new practice opens at your local midnight. Until then, rest is part of the
                    program.
                  </p>
                  {todayCompletion ? (
                    <p className="font-mono text-sm text-muted-foreground">
                      Before {todayCompletion.mood_before ?? "?"}/10 · After{" "}
                      {todayCompletion.mood_after ?? "?"}/10
                    </p>
                  ) : null}
                  <Link href={`/program/day/${todayDay}`} className={quietClasses}>
                    Review today
                  </Link>
                </>
              ) : null}
              {todayState.status === "missed" ? (
                <>
                  <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Today&apos;s window has closed.
                  </h2>
                  <p className="leading-relaxed text-muted-foreground">
                    Each practice stays open for 48 hours. Your 30 day map shows any practice still
                    within its catch-up window, and the next one is never far away.
                  </p>
                  <Link href="/program" className={quietClasses}>
                    Open your 30 day map
                  </Link>
                </>
              ) : null}
              {todayState.status === "locked" ? (
                <>
                  <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Today&apos;s practice is not open yet.
                  </h2>
                  <p className="leading-relaxed text-muted-foreground">
                    It opens at {formatLocalDateTime(todayState.unlockAt, timezone)} in your local
                    time.
                  </p>
                  <Link href="/program" className={quietClasses}>
                    Open your 30 day map
                  </Link>
                </>
              ) : null}
            </Card>

            <QuickMood programId={program.id} initialMood={moodToday} />
          </div>

          <div className="space-y-5">
            <Card className="flex flex-col items-center gap-3 p-6 text-center">
              <ProgressRing completed={doneDays} total={30} />
              <p className="text-sm leading-relaxed text-muted-foreground">
                {doneDays === 0
                  ? "Your first completed day starts the ring."
                  : "Every completed practice adds to your progress."}
              </p>
            </Card>
            <Card className="space-y-2 p-5 sm:p-6">
              <h2 className="text-lg font-semibold tracking-tight">Your gentle streak</h2>
              <p className="font-mono text-2xl">
                {streak} {streak === 1 ? "day" : "days"}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {streak > 0
                  ? "Small steps, day by day. This is never a score."
                  : "A fresh start, whenever you begin. This is never a score."}
              </p>
            </Card>
            <Card className="space-y-2 p-5 sm:p-6">
              <h2 className="text-lg font-semibold tracking-tight">Next practice</h2>
              {next ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Day {next.dayNo} opens at {formatLocalDateTime(next.unlockAt, timezone)}
                  </p>
                  <NextUnlock
                    unlockAt={next.unlockAt.toISOString()}
                    initialLabel={`Opens at ${formatLocalDateTime(next.unlockAt, timezone)}`}
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your final check-in is open whenever you are ready.
                </p>
              )}
            </Card>
            <GardenPreview completedDays={doneDays} />
          </div>
        </div>
      </main>
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-5 py-12">
          <Card className="w-full p-8">
            <p className="text-sm font-semibold text-primary">MannMitra</p>
            <p className="mt-2 leading-relaxed text-muted-foreground">Getting your day ready...</p>
          </Card>
        </main>
      }
    >
      <HomeScreen />
    </Suspense>
  );
}
