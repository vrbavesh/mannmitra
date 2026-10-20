import { Suspense } from "react";
import Link from "next/link";
import { forbidden, notFound, redirect } from "next/navigation";
import { adminClient, pageClient } from "@/server/authClient";
import {
  loadCompletion,
  loadProgramContext,
  loadTaskTemplate,
  openProgramDay,
  reconcileDayStatus,
} from "@/server/programEngine";
import {
  PROGRAM_DAYS,
  dayStatus,
  durationLabel,
  isRestDay,
  type Completion,
} from "@/lib/engine/dayState";
import { formatLocalDateTime, formatTimeSpent } from "@/lib/engine/format";
import { AppHeader } from "@/components/app/AppHeader";
import { Card } from "@/components/ui/Card";
import { TaskCard } from "@/components/program/TaskCard";

const quietClasses =
  "inline-flex h-11 items-center justify-center rounded-control border border-border bg-surface px-6 text-sm font-semibold text-foreground transition-transform duration-[120ms] hover:bg-muted active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:active:scale-100";

async function DayScreen({ dayNo }: { dayNo: number }) {
  const client = await pageClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect("/signin");
  if (!user.email_confirmed_at) redirect("/signup/verify");
  const context = await loadProgramContext(client, user.id);
  if (!context.program) redirect("/home");
  const { program, completions, timezone, displayName } = context;
  const existing = completions.find((completion) => completion.day_no === dayNo);
  const completion: Completion | undefined = existing
    ? { dayNo: existing.day_no, completedAt: existing.completed_at }
    : undefined;
  const state = dayStatus({
    startDate: program.start_date,
    dayNo,
    completion,
    timezone,
  });
  if (state.status === "locked") forbidden();

  const admin = adminClient();
  if (state.status !== "done") {
    const opened = await openProgramDay(admin, user.id, dayNo);
    if (opened.error === "program_unavailable") redirect("/home");
    if (opened.error === "day_locked") forbidden();
    if (opened.error) throw new Error("Day unavailable");
    const openedCompletion = opened.row?.completed_at
      ? { dayNo, completedAt: opened.row.completed_at }
      : completion;
    const openedState = dayStatus({
      startDate: program.start_date,
      dayNo,
      completion: openedCompletion,
      timezone,
    });
    if (openedState.status === "locked") forbidden();
    await reconcileDayStatus(admin, user.id, program.id, dayNo, openedState.status);
    if (openedState.status === "done") {
      const saved = await loadCompletion(client, user.id, program.id, dayNo);
      return (
        <CompletedDay
          dayNo={dayNo}
          timezone={timezone}
          displayName={displayName}
          completion={saved}
        />
      );
    }
    if (openedState.status === "missed")
      return (
        <ClosedDay
          dayNo={dayNo}
          unlockAt={openedState.unlockAt}
          timezone={timezone}
          displayName={displayName}
        />
      );
    const template = await loadTaskTemplate(client, program.track, dayNo);
    return (
      <>
        <AppHeader displayName={displayName} />
        <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:py-12">
          <Link
            href="/program"
            className="mb-4 inline-flex h-9 items-center text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Your 30 days
          </Link>
          <TaskCard
            dayNo={dayNo}
            title={template?.title ?? `Day ${dayNo} practice`}
            description={
              template?.description ??
              "Today's activity is still being prepared. A short check-in still counts."
            }
            exampleText={template?.example_text ?? null}
            component={template?.component ?? "task_loading"}
            config={template?.config ?? {}}
            duration={
              template?.duration_min
                ? `About ${template.duration_min} minutes`
                : durationLabel(dayNo)
            }
            isRestDay={isRestDay(dayNo)}
          />
        </main>
      </>
    );
  }

  return (
    <CompletedDay
      dayNo={dayNo}
      timezone={timezone}
      displayName={displayName}
      completion={existing ?? null}
    />
  );
}

function CompletedDay({
  dayNo,
  timezone,
  displayName,
  completion,
}: {
  dayNo: number;
  timezone: string;
  displayName: string;
  completion: {
    mood_before: number | null;
    mood_after: number | null;
    payload: Record<string, unknown>;
    completed_at: string | null;
  } | null;
}) {
  const seconds = Number(completion?.payload?.time_taken_s ?? 0);
  return (
    <>
      <AppHeader displayName={displayName} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:py-12">
        <Card className="space-y-4 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Day {dayNo} of 30
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Day {dayNo} is complete.
          </h1>
          {completion ? (
            <div className="space-y-1 font-mono text-sm text-muted-foreground">
              <p>
                Before {completion.mood_before ?? "?"}/10 · After {completion.mood_after ?? "?"}/10
              </p>
              <p>Time on this practice: {formatTimeSpent(seconds)}</p>
              {completion.completed_at ? (
                <p>Finished {formatLocalDateTime(new Date(completion.completed_at), timezone)}</p>
              ) : null}
            </div>
          ) : (
            <p className="leading-relaxed text-muted-foreground">
              Your before and after check-in for this day are saved.
            </p>
          )}
          <p className="leading-relaxed text-muted-foreground">
            You can revisit this day whenever you like. A new practice opens at your local midnight.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/home"
              className="inline-flex h-11 items-center justify-center rounded-control bg-primary px-6 text-sm font-semibold text-primary-foreground transition-transform duration-[120ms] hover:bg-evergreen-700 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:active:scale-100"
            >
              Back to home
            </Link>
            <Link href="/program" className={quietClasses}>
              See your 30 days
            </Link>
          </div>
        </Card>
      </main>
    </>
  );
}

function ClosedDay({
  dayNo,
  unlockAt,
  timezone,
  displayName,
}: {
  dayNo: number;
  unlockAt: Date;
  timezone: string;
  displayName: string;
}) {
  return (
    <>
      <AppHeader displayName={displayName} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:py-12">
        <Card className="space-y-4 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Day {dayNo} of 30
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            This day&apos;s window has closed.
          </h1>
          <p className="leading-relaxed text-muted-foreground">
            Each practice stays open for 48 hours. There is nothing lost here, and today still has
            its own practice.
          </p>
          <p className="text-sm text-muted-foreground">
            This practice opened {formatLocalDateTime(unlockAt, timezone)} in your local time.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/home" className={quietClasses}>
              Back to home
            </Link>
            <Link href="/program" className={quietClasses}>
              See your 30 days
            </Link>
          </div>
        </Card>
      </main>
    </>
  );
}

async function DayRoute({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const dayNo = Number(n);
  if (!Number.isInteger(dayNo) || dayNo < 1 || dayNo > PROGRAM_DAYS) notFound();
  if (dayNo === PROGRAM_DAYS) redirect("/posttest");
  return <DayScreen dayNo={dayNo} />;
}

export default function DayPage({ params }: { params: Promise<{ n: string }> }) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-5 py-12">
          <Card className="w-full p-8">
            <p className="text-sm font-semibold text-primary">MannMitra</p>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Getting today&apos;s practice ready...
            </p>
          </Card>
        </main>
      }
    >
      <DayRoute params={params} />
    </Suspense>
  );
}
