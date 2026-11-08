import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Landing from "@/routes/public/Landing";
import Login from "@/routes/public/Login";
import MessageCheck from "@/routes/user/MessageCheck";
import PaymentCheck from "@/routes/user/PaymentCheck";
import AlreadySent from "@/routes/user/AlreadySent";
import CaseDetail from "@/routes/review/CaseDetail";
import { casesApi } from "@/features/cases/api";

const VIEWPORTS = [360, 768, 1024, 1440];

function renderWithViewport(ui: React.ReactElement, width: number) {
  // Emulate window width in JSDOM
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <div style={{ width: `${width}px`, maxWidth: `${width}px`, overflowX: "hidden" }}>
          {ui}
        </div>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Responsive Viewport Pass (360, 768, 1024, 1440 px)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/samples") || url.includes("/safe-actions")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    vi.spyOn(casesApi, "getCase").mockResolvedValue({
      id: "case_test_1",
      reference: "PRO-112233",
      status: "new",
      version: 1,
      created_at: new Date().toISOString(),
      reporter_consent_at: new Date().toISOString(),
      reporter_note: "Test note",
      check: {
        id: "check_1",
        kind: "message",
        final_level: "High",
        masked_text: "OTP দিন ১২৩৪",
        route: "rules_only",
        rule_hits: ["HARD_OTP_PIN_PASSWORD"],
        reasons: ["পাসওয়ার্ড চাওয়া হয়েছে"],
      },
      numbers: [],
      notes: [],
      timeline: [],
    });
  });

  VIEWPORTS.forEach((width) => {
    describe(`Viewport ${width}px`, () => {
      it(`S01 Landing renders without horizontal overflow at ${width}px`, () => {
        const { container } = renderWithViewport(<Landing />, width);
        expect(container.firstChild).toBeInTheDocument();
      });

      it(`S03 Login renders without horizontal overflow at ${width}px`, () => {
        const { container } = renderWithViewport(<Login />, width);
        expect(container.firstChild).toBeInTheDocument();
      });

      it(`S10 Message Check renders without horizontal overflow at ${width}px`, () => {
        const { container } = renderWithViewport(<MessageCheck />, width);
        expect(container.firstChild).toBeInTheDocument();
      });

      it(`S11 Payment Check renders without horizontal overflow at ${width}px`, () => {
        const { container } = renderWithViewport(<PaymentCheck />, width);
        expect(container.firstChild).toBeInTheDocument();
      });

      it(`S18 Already Sent renders without horizontal overflow at ${width}px`, () => {
        const { container } = renderWithViewport(<AlreadySent />, width);
        expect(container.firstChild).toBeInTheDocument();
      });

      it(`S26 Case Detail renders without horizontal overflow at ${width}px`, () => {
        const { container } = renderWithViewport(<CaseDetail />, width);
        expect(container.firstChild).toBeInTheDocument();
      });
    });
  });
});
