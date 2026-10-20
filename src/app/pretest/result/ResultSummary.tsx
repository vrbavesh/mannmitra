import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { assignTrack } from "@/lib/assignTrack";
import { StartProgram } from "./StartProgram";
import type { components } from "@/generated/api";

const tracks = {
  anxiety: {
    title: "Finding calm",
    area: "Anxiety",
    description: "Small grounding practices to make room between a busy mind and your next step.",
  },
  depression: {
    title: "Room for brighter days",
    area: "Low mood",
    description:
      "Gentle activities to reconnect with everyday moments, at a pace that feels manageable.",
  },
  negative_thinking: {
    title: "A kinder inner voice",
    area: "Negative thinking",
    description:
      "Simple practices to notice difficult thought patterns and meet yourself with more kindness.",
  },
};
type Result = components["schemas"]["ScreeningSubmitResponse"]["result"];
export function ResultSummary({
  sessionId,
  score,
  severity,
  areas,
}: {
  sessionId: string;
  score: number;
  severity: Result["severity"];
  areas: Result["areas"];
}) {
  const assignment = assignTrack(areas);
  const track = tracks[assignment.track];
  return (
    <div className="w-full animate-[fade-in_260ms_ease-out_both] motion-reduce:animate-none">
      <header className="mb-8 max-w-2xl space-y-3">
        <p className="text-sm font-semibold text-primary">MannMitra · Your check-in</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
          A little clarity.
          <br />A gentle next step.
        </h1>
        <p className="leading-relaxed text-muted-foreground">
          Thank you for making time for yourself. This is a snapshot of how things have felt lately.
        </p>
      </header>
      <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr]">
        <Card className="flex flex-col items-center p-7 text-center sm:p-9">
          <div className="relative grid size-52 place-items-center rounded-full shadow-[inset_0_2px_10px_rgb(40_124_112/0.12),0_16px_40px_rgb(40_124_112/0.1)]">
            <svg
              viewBox="0 0 200 200"
              className="absolute inset-0 size-full -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="currentColor"
                strokeWidth="9"
                className="text-muted"
              />
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="currentColor"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 565.49} 565.49`}
                className="text-primary"
              />
            </svg>
            <div>
              <p className="font-mono text-4xl font-semibold tracking-tight">{score.toFixed(1)}%</p>
              <p className="mt-2 text-sm text-muted-foreground">Wellbeing score</p>
            </div>
          </div>
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-muted-foreground">
            A starting point for reflection. Your score does not define you.
          </p>
          <p className="mt-auto pt-6 text-xs leading-relaxed text-muted-foreground">
            This is a screening, not a medical diagnosis.
          </p>
        </Card>
        <Card className="space-y-5 p-7 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Your suggested focus
          </p>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">{track.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Focus area: {track.area}</p>
          </div>
          <p className="leading-relaxed text-muted-foreground">{track.description}</p>
          {assignment.bonus && (
            <p className="rounded-card bg-muted p-4 text-sm leading-relaxed">
              Bonus suggestion: {tracks[assignment.bonus].title}. You can explore this alongside
              your main focus.
            </p>
          )}
          {severity === "moderate" && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              You may also find it helpful to speak with a counsellor while you follow the program.
            </p>
          )}
          {severity === "minimal" && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your answers suggest relatively little distress right now. A steady sleep routine,
              gentle movement and time with people you trust can help you care for yourself. The
              program is optional.
            </p>
          )}
          <StartProgram sessionId={sessionId} />
        </Card>
      </div>
      <section className="mt-8" aria-labelledby="program-preview">
        <h2 id="program-preview" className="text-xl font-semibold">
          Thirty days, with room to rest.
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            [
              "01",
              "A little practice",
              "On odd days, a main activity takes about 10 to 15 minutes.",
            ],
            ["02", "Space to breathe", "On even days, a small practice takes just 1 to 3 minutes."],
            ["30", "Time to reflect", "A final check-in helps you look back on what has changed."],
          ].map(([day, title, copy]) => (
            <li key={day} className="rounded-card border border-border bg-surface/60 p-5">
              <span className="font-mono text-sm text-primary">{day}</span>
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p>
            </li>
          ))}
        </ol>
      </section>
      <Link
        href="/crisis"
        className="mt-7 inline-block text-sm font-semibold text-primary underline underline-offset-4"
      >
        Support is always here
      </Link>
    </div>
  );
}
