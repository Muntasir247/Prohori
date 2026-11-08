// Token colours are CSS variables. Wrapping them in color-mix lets Tailwind
// opacity modifiers (bg-brand/10, border-risk-high/40) work; plain var() drops them.
const v = (name) => `color-mix(in srgb, var(${name}) calc(<alpha-value> * 100%), transparent)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // Theme is driven by data-theme on <html>; `dark:` means "not light".
  darkMode: ["variant", ':root:not([data-theme="light"]) &'],
  theme: {
    extend: {
      colors: {
        bg: v("--color-bg"),
        surface: v("--color-surface"),
        "surface-2": v("--color-surface-2"),
        "surface-3": v("--color-surface-3"),
        glass: v("--color-glass"),
        border: v("--color-border"),
        "border-strong": v("--color-border-strong"),
        text: v("--color-text"),
        "text-2": v("--color-text-2"),
        muted: v("--color-text-muted"),
        faint: v("--color-text-faint"),
        brand: v("--color-brand"),
        "brand-hover": v("--color-brand-hover"),
        "brand-glow": v("--color-brand-glow"),
        accent: v("--color-accent"),
        "accent-hover": v("--color-accent-hover"),
        "on-accent": v("--color-on-accent"),
        "on-risk": v("--color-on-risk"),
        pine: v("--color-pine"),
        "pine-deep": v("--color-pine-deep"),
        "pine-hover": v("--color-pine-hover"),
        bone: v("--color-bone"),
        raat: v("--color-raat"),
        focus: v("--color-focus"),
        "risk-high": v("--color-risk-high"),
        "risk-high-tint": v("--color-risk-high-tint"),
        "risk-medium": v("--color-risk-medium"),
        "risk-medium-tint": v("--color-risk-medium-tint"),
        "risk-low": v("--color-risk-low"),
        "risk-low-tint": v("--color-risk-low-tint"),
        success: v("--color-success"),
        "success-tint": v("--color-success-tint"),
        warning: v("--color-warning"),
        "warning-tint": v("--color-warning-tint"),
        info: v("--color-info"),
        "info-tint": v("--color-info-tint"),
        "chart-1": v("--chart-1"),
        "chart-2": v("--chart-2"),
        "chart-3": v("--chart-3"),
        "chart-4": v("--chart-4"),
        "chart-5": v("--chart-5"),
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        bangla: ["var(--font-bangla)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "16px",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-md)",
        xl: "var(--shadow-md)",
        "2xl": "var(--shadow-modal)",
        modal: "var(--shadow-modal)",
        inner: "none",
        specular: "none",
        "glow-brand": "none",
        "glow-accent": "none",
        "glow-risk": "none",
      },
      zIndex: {
        header: "10",
        sidebar: "20",
        dropdown: "30",
        modal: "40",
        toast: "50",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.23, 1, 0.32, 1)",
        out: "cubic-bezier(0.23, 1, 0.32, 1)",
      },
      transitionDuration: {
        DEFAULT: "120ms",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // Page content entering after navigation: short rise plus fade.
        "page-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Dropdowns and popovers: scale from their origin, never from 0.
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 240ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "page-in": "page-in 220ms cubic-bezier(0.23, 1, 0.32, 1) both",
        // Settings tab panels: frequent, so short and nearly still.
        "panel-in": "page-in 180ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "pop-in": "pop-in 160ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "fade-in": "fade-in 160ms ease-out both",
        // Loading placeholders stay invisible for 150 ms so quick loads never flash.
        "delayed-in": "fade-in 200ms ease-out 150ms both",
        shimmer: "shimmer 1.6s linear infinite",
        // Doc 01: no looping decorative animation. Old names kept as no-ops.
        "pulse-slow": "none",
        breathing: "none",
        radar: "none",
      },
    },
  },
  plugins: [],
};
