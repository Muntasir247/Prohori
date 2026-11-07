import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const STYLES: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "bg-surface-2 text-text hover:bg-surface disabled:opacity-50 border border-border",
  ghost: "border border-border text-text hover:bg-bg disabled:opacity-50",
  danger:
    "border border-red-500 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  loading = false,
  children,
  disabled,
  className = "",
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${STYLES[variant]} ${className}`}
    >
      {loading ? <span className="animate-pulse">…</span> : children}
    </button>
  );
}
