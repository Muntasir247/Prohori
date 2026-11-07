import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@/lib/i18n";

import Landing from "./Landing";

function renderLanding() {
  // A fresh client per render with retries off, so the error path settles
  // immediately instead of waiting on retry backoff.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <Landing />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Landing health card", () => {
  it("shows connected when /api/v1/health returns ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ status: "ok", database: "up", version: "0.1.0" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    renderLanding();

    await waitFor(() =>
      expect(screen.getByTestId("health-status")).toBeInTheDocument(),
    );
    expect(screen.getByText("0.1.0")).toBeInTheDocument();
  });

  it("shows the down state when health fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "internal_error",
            message_key: "errors.internal_error",
            fields: {},
            request_id: "x",
          },
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      ),
    );

    renderLanding();

    await waitFor(() =>
      expect(screen.getByTestId("health-status")).toBeInTheDocument(),
    );
  });
});
