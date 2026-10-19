import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-evergreen-700 focus-visible:outline-primary",
  secondary:
    "bg-surface text-foreground border border-border hover:bg-muted focus-visible:outline-primary",
  ghost: "bg-transparent text-primary hover:bg-evergreen-50 focus-visible:outline-primary",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-12 px-7 text-base",
};

/**
 * Pill button with press feedback (scale 0.97 @ 120ms — motion budget, §0.2).
 * The transform lives on a ::after-free inner-free base: transform/opacity only,
 * honors the global prefers-reduced-motion kill-switch in globals.css.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className = "", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-control font-semibold
        transition-transform duration-[120ms] ease-out
        active:scale-[0.97] motion-reduce:active:scale-100
        focus-visible:outline-2 focus-visible:outline-offset-2
        disabled:pointer-events-none disabled:opacity-50
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
});
