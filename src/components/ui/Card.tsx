import type { HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
}

/** Soft 16px card, bone surface, forest-tinted shadow. */
export function Card({ raised = false, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-card border border-border bg-surface ${
        raised ? "shadow-raised" : "shadow-card"
      } ${className}`}
      {...props}
    />
  );
}
