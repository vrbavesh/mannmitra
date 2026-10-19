export interface ProgressProps {
  /** 0–100 */
  value: number;
  label?: string;
}

/** Determinate progress bar; Geist Mono numerics live with the label. */
export function Progress({ value, label }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-foreground">{label}</span>
          <span className="font-mono text-sm text-muted-foreground">{clamped}%</span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-control bg-muted"
      >
        <div
          className="h-full rounded-control bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
