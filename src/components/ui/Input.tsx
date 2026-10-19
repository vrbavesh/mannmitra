import { forwardRef, useId, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helper?: string;
  error?: string;
}

/**
 * Label-above input with helper + error slots (one pattern for the whole app).
 * Error text is calm amber (danger-soft), never a red alarm (spec §3.3).
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helper, error, id, className = "", ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error
    ? `${inputId}-error`
    : helper
      ? `${inputId}-helper`
      : undefined;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`h-11 w-full rounded-card border bg-surface px-4 text-base
          placeholder:text-neutral-400
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
          disabled:opacity-50
          ${error ? "border-danger-soft" : "border-border"} ${className}`}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-danger-soft">
          {error}
        </p>
      ) : helper ? (
        <p id={`${inputId}-helper`} className="text-sm text-muted-foreground">
          {helper}
        </p>
      ) : null}
    </div>
  );
});
