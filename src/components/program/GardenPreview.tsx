const stages = [
  "A seed, ready to begin.",
  "The first green shoot.",
  "Two small leaves.",
  "A taller stem.",
  "More leaves, more light.",
  "Buds forming.",
  "In full bloom.",
];

/** Presentational preview only; Step 15 owns the full garden experience. */
export function GardenPreview({ completedDays }: { completedDays: number }) {
  const stage = Math.max(0, Math.min(6, Math.floor(completedDays / 5)));
  const stemTop = 72 - stage * 7;
  return (
    <section
      aria-labelledby="garden-preview-title"
      className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <h2 id="garden-preview-title" className="text-lg font-semibold tracking-tight">
        Your garden
      </h2>
      <svg viewBox="0 0 120 90" className="mt-2 h-28 w-full text-primary" aria-hidden="true">
        <ellipse cx="60" cy="76" rx="36" ry="7" className="fill-muted" />
        {stage === 0 ? <circle cx="60" cy="70" r="4" fill="currentColor" /> : null}
        {stage >= 1 ? (
          <path
            d={`M60 74 L60 ${stemTop}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        ) : null}
        {stage >= 2 ? (
          <path
            d={`M60 ${stemTop + 14} C50 ${stemTop + 10} 48 ${stemTop + 4} 52 ${stemTop + 2} C57 ${stemTop + 4} 59 ${stemTop + 9} 60 ${stemTop + 14}`}
            fill="currentColor"
            opacity="0.75"
          />
        ) : null}
        {stage >= 4 ? (
          <path
            d={`M60 ${stemTop + 26} C70 ${stemTop + 22} 72 ${stemTop + 16} 68 ${stemTop + 14} C63 ${stemTop + 16} 61 ${stemTop + 21} 60 ${stemTop + 26}`}
            fill="currentColor"
            opacity="0.75"
          />
        ) : null}
        {stage >= 5 ? (
          <path
            d={`M60 ${stemTop + 6} C52 ${stemTop + 4} 52 ${stemTop - 4} 58 ${stemTop - 5} C61 ${stemTop - 1} 61 ${stemTop + 2} 60 ${stemTop + 6}`}
            fill="currentColor"
            opacity="0.6"
          />
        ) : null}
        {stage >= 6 ? (
          <g>
            <circle cx="60" cy={stemTop - 6} r="5" fill="currentColor" />
            <circle cx="60" cy={stemTop - 14} r="4" fill="currentColor" opacity="0.65" />
            <circle cx="52" cy={stemTop - 9} r="4" fill="currentColor" opacity="0.65" />
            <circle cx="68" cy={stemTop - 9} r="4" fill="currentColor" opacity="0.65" />
          </g>
        ) : null}
      </svg>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Stage {stage} of 6. {stages[stage]}
      </p>
      {stage < 6 ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Every completed practice helps it grow.
        </p>
      ) : null}
    </section>
  );
}
