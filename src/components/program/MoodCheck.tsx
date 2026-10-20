"use client";

const moodLabels = [
  "Very low",
  "Low",
  "A little low",
  "Below okay",
  "Okay",
  "Steady",
  "Fairly good",
  "Good",
  "Really good",
  "Very good",
  "Great",
];

export interface MoodCheckProps {
  name: string;
  value: number | null;
  onChange: (mood: number) => void;
  legend: string;
  hint?: string;
  disabled?: boolean;
}

/**
 * Narrow mood check for Step 12 (0 to 10). Native radios keep arrow-key
 * navigation and screen-reader semantics; Step 13 adds the garden and weather
 * skins on top of this contract.
 */
export function MoodCheck({ name, value, onChange, legend, hint, disabled }: MoodCheckProps) {
  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-base font-semibold text-foreground">{legend}</legend>
      {hint ? <p className="text-sm leading-relaxed text-muted-foreground">{hint}</p> : null}
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
        {moodLabels.map((label, mood) => (
          <label key={mood} className="flex">
            <input
              type="radio"
              name={name}
              value={mood}
              checked={value === mood}
              onChange={() => onChange(mood)}
              aria-label={`${mood} out of 10, ${label}`}
              className="peer sr-only"
            />
            <span
              className="grid h-11 w-full cursor-pointer place-items-center rounded-control border border-border
                bg-surface font-mono text-sm text-foreground
                hover:bg-muted peer-checked:border-primary peer-checked:bg-primary
                peer-checked:text-primary-foreground peer-focus-visible:outline-2
                peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary
                peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
            >
              {mood}
            </span>
          </label>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0, very low</span>
        <span>10, really good</span>
      </div>
    </fieldset>
  );
}
