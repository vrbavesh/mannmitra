"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Counts down to the next local midnight. The server renders the absolute
 * time first so the first paint is useful without JavaScript; the ticking
 * value replaces it after hydration. When the countdown reaches zero the
 * server view refreshes once so the newly open day appears without a reload.
 */
export function NextUnlock({ unlockAt, initialLabel }: { unlockAt: string; initialLabel: string }) {
  const [label, setLabel] = useState(initialLabel);
  const router = useRouter();
  const refreshed = useRef(false);

  useEffect(() => {
    const target = new Date(unlockAt).getTime();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      const remaining = target - Date.now();
      if (remaining <= 0) {
        setLabel("A new practice is ready.");
        if (!refreshed.current) {
          refreshed.current = true;
          router.refresh();
        }
        return;
      }
      const totalSeconds = Math.floor(remaining / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setLabel(
        `Opens in ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
          seconds,
        ).padStart(2, "0")}`,
      );
      timer = setTimeout(tick, 1000);
    };
    tick();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [unlockAt, router]);

  return <p className="font-mono text-sm text-muted-foreground">{label}</p>;
}
