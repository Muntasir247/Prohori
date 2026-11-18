import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@/lib/i18n";

import Landing from "./Landing";

function renderLanding() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Landing screen (S01)", () => {
  it("renders hero and primary action buttons", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/v1/auth/session")) {
        return new Response(JSON.stringify(null), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderLanding();

    expect(screen.getByTestId("hero-primary-cta")).toBeInTheDocument();
    expect(screen.getByTestId("hero-secondary-cta")).toBeInTheDocument();
    expect(screen.getByTestId("landing-check-button")).toHaveAttribute("href", "/login");
  });

  it("renders sample chips when samples are returned", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/v1/auth/session")) {
        return new Response(JSON.stringify(null), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify([
          {
            id: "lottery_1",
            label_bn: "লটারি বিজয়ী বার্তা",
            label_en: "Lottery winner SMS",
            body: "অভিনন্দন আপনি লটারি জিতেছেন",
            expected_risk: "High",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    renderLanding();

    await waitFor(() =>
      expect(screen.getByTestId("landing-sample-chip")).toBeInTheDocument(),
    );
  });

  it("links header account button to /check when signed in as a user", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/v1/auth/session")) {
        return new Response(
          JSON.stringify({
            id: "u-1",
            email: "user@prohori.test",
            display_name: "Rahim",
            role: "user",
            language: "bn",
            theme: "dark",
            onboarding_completed: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderLanding();

    await waitFor(() =>
      expect(screen.getByTestId("landing-check-button")).toHaveAttribute("href", "/check"),
    );
  });
});
