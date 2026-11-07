/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The SPA talks to the backend at the same origin under /api. In dev, Vite
// proxies /api to the FastAPI server on :8000 (mirroring Vercel's /api rewrite
// in production), so the frontend code only ever uses relative URLs.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        // PROHORI_API_PORT lets a second backend run alongside one on :8000.
        target: `http://localhost:${process.env.PROHORI_API_PORT ?? "8000"}`,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    exclude: ["node_modules", "e2e/**"],
  },
});
