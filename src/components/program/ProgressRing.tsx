/**
 * Program progress ring. Values render at their final position: the screen is
 * a calm status read, not an entrance animation, so there is no motion to
 * reduce and no paint animation outside the transform/opacity budget.
 */
export function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const circumference = 2 * Math.PI * 52;
  const ratio = total > 0 ? Math.min(1, Math.max(0, completed / total)) : 0;

  return (
    <div
      className="relative grid size-36 place-items-center"
      role="img"
      aria-label={`${completed} of ${total} days complete`}
    >
      <svg
        viewBox="0 0 120 120"
        className="absolute inset-0 size-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted"
        />
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${ratio * circumference} ${circumference}`}
          className="text-primary"
        />
      </svg>
      <div className="text-center">
        <p className="font-mono text-3xl font-semibold tracking-tight">{completed}</p>
        <p className="mt-1 text-xs text-muted-foreground">of {total} days</p>
      </div>
    </div>
  );
}
