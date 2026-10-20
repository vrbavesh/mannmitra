import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { pageClient } from "@/server/authClient";
import { loadProgramContext, toEngineCompletion } from "@/server/programEngine";
import {
  PROGRAM_DAYS,
  dayStates,
  isRestDay,
  nextUnlock,
  programDay,
  type DayState,
} from "@/lib/engine/dayState";
import { formatLocalDateTime, formatLocalDay, formatLocalTime } from "@/lib/engine/format";
import { AppHeader } from "@/components/app/AppHeader";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { NextUnlock } from "@/components/program/NextUnlock";

const tileBase =
  "flex h-full min-h-24 flex-col justify-between rounded-card border p-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-3";

function tileClasses(state: DayState): string {
  if (state.status === "available")
    return `${tileBase} border-primary bg-primary text-primary-foreground hover:bg-evergreen-700`;
  if (state.status === "done")
    return `${tileBase} border-primary/40 bg-evergreen-100 text-evergreen-800`;
  if (state.status === "missed")
    return `${tileBase} border-border bg-muted/60 text-muted-foreground`;
  return `${tileBase} border-border bg-surface text-muted-foreground`;
}

function DayTile({
  state,
  timezone,
  todayDay,
}: {
  state: DayState;
  timezone: string;
  todayDay: number;
}) {
  const isPostTest = state.dayNo === PROGRAM_DAYS;
  const label = isPostTest
    ? "Final check-in"
    : state.status === "done"
      ? "Done"
      : state.status === "available"
        ? state.dayNo === todayDay
          ? "Today"
          : "Open"
        : state.status === "missed"
          ? "Closed"
          : "Locked";
  const accessibleTime = formatLocalDateTime(state.unlockAt, timezone);
  const body = (
    <>
      <div className="flex items-baseline justify-between gap-1">
        <span className="font-mono text-sm font-semibold">{state.dayNo}</span>
        {!isPostTest && isRestDay(state.dayNo) ? (
          <span className="text-[0.6rem] uppercase tracking-wide">Rest</span>
        ) : null}
      </div>
      <span className="text-xs font-semibold">{label}</span>
      {state.status === "locked" ? (
        <span className="font-mono text-[0.65rem] leading-tight">
          {formatLocalDay(state.unlockAt, timezone)}
          <br />
          {formatLocalTime(state.unlockAt, timezone)}
        </span>
      ) : (
        <span className="text-[0.65rem] leading-tight opacity-80">
          {isPostTest ? "After day 30" : isRestDay(state.dayNo) ? "1 to 3 min" : "10 to 15 min"}
        </span>
      )}
    </>
  );

  if (state.status === "available" || state.status === "done") {
    const href = isPostTest ? "/posttest" : `/program/day/${state.dayNo}`;
    return (
      <Link href={href} className={tileClasses(state)} aria-label={`Day ${state.dayNo}, ${label}`}>
        {body}
      </Link>
    );
  }
  return (
    <div
      className={tileClasses(state)}
      aria-label={`Day ${state.dayNo}, ${label}, opens ${accessibleTime}`}
    >
      {body}
    </div>
  );
}

async function ProgramMap() {
  const client = await pageClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect("/signin");
  if (!user.email_confirmed_at) redirect("/signup/verify");
  const context = await loadProgramContext(client, user.id);
  if (!context.program) redirect("/home");
  const { program, completions, timezone, today, displayName } = context;
  const todayDay = programDay(program.start_date, today);
  const states = dayStates({
    startDate: program.start_date,
    completions: completions.map(toEngineCompletion),
    timezone,
    postTestDone: Boolean(program.post_session_id),
  });
  const doneDays = states.filter((state) => state.status === "done" && state.dayNo <= 29).length;
  const next = nextUnlock({ startDate: program.start_date, timezone });

  return (
    <>
      <AppHeader displayName={displayName} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:py-12">
        <header className="mb-6 space-y-2">
          <p className="text-sm font-semibold text-primary">Day {todayDay} of 30</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your 30 days</h1>
          <p className="max-w-2xl leading-relaxed text-muted-foreground">
            Practices open at your local midnight and stay open for 48 hours. Rest days are short on
            purpose.
          </p>
        </header>
        <Card className="space-y-5 p-5 sm:p-7">
          <Progress value={(doneDays / 30) * 100} label={`${doneDays} of 30 days complete`} />
          <ol className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-10">
            {states.map((state) => (
              <li key={state.dayNo}>
                <DayTile state={state} timezone={timezone} todayDay={todayDay} />
              </li>
            ))}
          </ol>
        </Card>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Card className="space-y-2 p-5">
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
                Every practice has opened. Your final check-in is available whenever you are ready.
              </p>
            )}
          </Card>
          <Card className="space-y-2 p-5">
            <h2 className="text-lg font-semibold tracking-tight">Reading the map</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Open practices can be started. Done practices stay here to review. A closed practice
              has passed its 48 hour window, and there is always another day ahead.
            </p>
            <Link
              href="/home"
              className="inline-flex h-9 items-center text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Back to home
            </Link>
          </Card>
        </div>
      </main>
    </>
  );
}

export default function ProgramPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-5 py-12">
          <Card className="w-full p-8">
            <p className="text-sm font-semibold text-primary">MannMitra</p>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Getting your 30 days ready...
            </p>
          </Card>
        </main>
      }
    >
      <ProgramMap />
    </Suspense>
  );
}
