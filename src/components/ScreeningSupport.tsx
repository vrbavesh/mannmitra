import type { ReactNode } from "react";

export function ScreeningSupport({ children }: { children?: ReactNode }) {
  return (
    <div className="space-y-5">
      <h1
        id="screening-support-title"
        tabIndex={-1}
        className="text-3xl font-semibold tracking-tight text-foreground outline-none"
      >
        Support is here
      </h1>
      <p className="leading-relaxed text-muted-foreground">
        Your answers suggest you may benefit from talking to a professional. You do not have to
        handle this alone.
      </p>
      <p className="leading-relaxed">
        You can call Tele-MANAS at{" "}
        <a className="font-semibold text-primary underline underline-offset-4" href="tel:14416">
          14416
        </a>{" "}
        for support in India. If you are in immediate danger, call{" "}
        <a className="font-semibold text-primary underline underline-offset-4" href="tel:112">
          112
        </a>
        .
      </p>
      <p className="text-sm text-muted-foreground">This is a screening, not a medical diagnosis.</p>
      {children}
    </div>
  );
}
