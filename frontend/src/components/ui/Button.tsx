import type { ButtonHTMLAttributes, ReactNode } from "react";

// Doc 01 §7 Button. One primary (Lantern) per view. "calm" is the Bone fill
// used on risk result screens, where Lantern must never appear.
type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent" | "calm";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent font-semibold border border-transparent hover:bg-accent-hover",
  accent:
    "bg-accent text-on-accent font-semibold border border-transparent hover:bg-accent-hover",
  calm: "bg-bone text-raat font-semibold border border-transparent hover:bg-bone/90",
  secondary:
    "bg-surface-2 text-text font-medium border border-border hover:border-border-strong hover:bg-surface-3",
  ghost:
    "bg-transparent text-text-2 font-medium border border-transparent hover:text-text hover:bg-surface-2",
  danger:
    "bg-risk-high-tint text-risk-high font-semibold border border-risk-high/40 hover:border-risk-high",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm gap-2 rounded-md",
  md: "min-h-11 px-4 text-[15px] gap-2 rounded-md",
  lg: "min-h-[52px] px-6 text-base gap-2 rounded-md",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  disabled,
  className = "",
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`group relative inline-flex select-none items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,transform] duration-[120ms] ease-out active:translate-y-px disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-2 disabled:text-faint ${
        VARIANTS[variant]
      } ${SIZES[size]} ${className}`}
    >
      {/* Loading keeps the label in place so the button never changes width */}
      <span className={`inline-flex items-center gap-2 ${loading ? "invisible" : ""}`}>
        <span className="inline-flex items-center gap-2">{children}</span>
        {icon && (
          <span
            aria-hidden
            className="inline-flex shrink-0 items-center justify-center transition-transform duration-[120ms] group-hover:translate-x-0.5"
          >
            {icon}
          </span>
        )}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </span>
      )}
    </button>
  );
}
