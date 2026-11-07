/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Colors reference CSS-variable tokens (src/styles/tokens.css) so no hex
      // values live outside the token file — see Doc 02 Section 6 and Phase 02.
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        text: "var(--color-text)",
        muted: "var(--color-text-muted)",
        brand: "var(--color-brand)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        bangla: ["var(--font-bangla)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
