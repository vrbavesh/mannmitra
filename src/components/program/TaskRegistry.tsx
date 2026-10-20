"use client";

import { useState, type FC } from "react";
import { Button } from "@/components/ui/Button";
import { MoodCheck } from "./MoodCheck";

/**
 * The call shape agreed here is the one Step 13's `lib/engine/renderTask.tsx`
 * will keep: every task component receives its stored config and calls
 * `onComplete` with an optional payload. Step 13 replaces this narrow registry
 * with the full component map; do not fork the shape.
 */
export type TaskComponentProps = {
  config: Record<string, unknown>;
  onComplete: (payload?: Record<string, unknown>) => void;
};

function MoodCheckTask({ onComplete }: TaskComponentProps) {
  const [mood, setMood] = useState<number | null>(null);
  return (
    <div className="space-y-4">
      <MoodCheck
        name="activity-mood"
        value={mood}
        onChange={setMood}
        legend="Take a moment and notice how you feel"
        hint="There is no right answer. Choose the number that feels closest."
      />
      <Button disabled={mood === null} onClick={() => onComplete({ activity_mood: mood })}>
        Continue
      </Button>
    </div>
  );
}

function TaskLoading({ onComplete }: TaskComponentProps) {
  return (
    <div className="space-y-4">
      <p className="leading-relaxed text-muted-foreground">
        This practice is still being prepared. You can continue and finish today&apos;s check-in.
      </p>
      <Button onClick={() => onComplete()}>Continue</Button>
    </div>
  );
}

export const taskComponents: Record<string, FC<TaskComponentProps>> = {
  mood_check: MoodCheckTask,
};

export function TaskBody({
  component,
  config,
  onComplete,
}: {
  component: string;
  config: Record<string, unknown>;
  onComplete: (payload?: Record<string, unknown>) => void;
}) {
  const Component = taskComponents[component] ?? TaskLoading;
  return <Component config={config} onComplete={onComplete} />;
}
