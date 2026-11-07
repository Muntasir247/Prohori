/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        text: "var(--color-text)",
        muted: "var(--color-text-muted)",
        brand: "var(--color-brand)",
        pine: "var(--color-pine)",
        accent: "var(--color-accent)",
        "risk-high": "var(--color-risk-high)",
        "risk-high-tint": "var(--color-risk-high-tint)",
        "risk-medium": "var(--color-risk-medium)",
        "risk-medium-tint": "var(--color-risk-medium-tint)",
        "risk-low": "var(--color-risk-low)",
        "risk-low-tint": "var(--color-risk-low-tint)",
        info: "var(--color-info)",
        "info-tint": "var(--color-info-tint)",
        success: "var(--color-success)",
        "success-tint": "var(--color-success-tint)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        bangla: ["var(--font-bangla)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
