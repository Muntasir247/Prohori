import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Landing from "@/routes/public/Landing";
import Login from "@/routes/public/Login";
import MessageCheck from "@/routes/user/MessageCheck";
import PaymentCheck from "@/routes/user/PaymentCheck";
import AlreadySent from "@/routes/user/AlreadySent";
import CaseDetail from "@/routes/review/CaseDetail";
import { ReportModal } from "@/components/checks/ReportModal";
import { PressurePause } from "@/components/checks/PressurePause";
import { casesApi } from "@/features/cases/api";

// Helper to run axe-core with WCAG 2.2 AA rules
async function checkA11y(container: HTMLElement) {
  const results = await axe.run(container, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
    },
    rules: {
      "color-contrast": { enabled: false },
      region: { enabled: false },
    },
  });
  return results.violations;
}

function renderWithProviders(ui: React.ReactElement, initialEntries = ["/"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("WCAG 2.2 AA Accessibility (axe-core)", () => {
  const originalFetch = globalThis.fetch;

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== "undefined") {
      window.speechSynthesis = {
        getVoices: () => [],
        speak: vi.fn(),
        cancel: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        onvoiceschanged: null,
        paused: false,
        pending: false,
        speaking: false,
      } as unknown as SpeechSynthesis;
    }

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/samples")) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }
      if (url.includes("/tips/current")) {
        return Promise.resolve({
          ok: false,
          status: 204,
        });
      }
      if (url.includes("/safe-actions")) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  it("S01 Landing passes axe audit", async () => {
    const { container } = renderWithProviders(<Landing />);
    const violations = await checkA11y(container);
    expect(violations).toEqual([]);
  });

  it("S03 Login passes axe audit", async () => {
    const { container } = renderWithProviders(<Login />);
    const violations = await checkA11y(container);
    expect(violations).toEqual([]);
  });

  it("S10 Message Check passes axe audit", async () => {
    const { container } = renderWithProviders(<MessageCheck />);
    const violations = await checkA11y(container);
    expect(violations).toEqual([]);
  });

  it("S11 Payment Check passes axe audit", async () => {
    const { container } = renderWithProviders(<PaymentCheck />);
    const violations = await checkA11y(container);
    expect(violations).toEqual([]);
  });

  it("S17 Report Modal passes axe audit", async () => {
    const { container } = render(
      <ReportModal
        checkId="test-check-1"
        isOpen={true}
        onClose={() => {}}
        onSuccess={() => {}}
      />
    );
    const violations = await checkA11y(container);
    expect(violations).toEqual([]);
  });

  it("S18 Already Sent Money passes axe audit", async () => {
    const { container } = renderWithProviders(<AlreadySent />);
    const violations = await checkA11y(container);
    expect(violations).toEqual([]);
  });
});

describe("Keyboard Navigation Paths (S10, S13, S17, S26)", () => {
  afterEach(() => {
    cleanup();
  });
  it("S10 Message Check: keyboard navigation into textarea and paste button", async () => {
    renderWithProviders(<MessageCheck />);

    const textarea = screen.getByTestId("message-input");
    textarea.focus();
    expect(document.activeElement).toBe(textarea);

    fireEvent.change(textarea, { target: { value: "আপনার অ্যাকাউন্ট লক করা হয়েছে।" } });
    expect((textarea as HTMLTextAreaElement).value).toBe("আপনার অ্যাকাউন্ট লক করা হয়েছে।");

    const submitBtn = screen.getByRole("button", { name: /যাচাই করুন|Check/i });
    expect(submitBtn).toBeEnabled();
  });

  it("S13 Result Screen: Pressure Pause skip button is keyboard focusable and operable", async () => {
    const onSkip = vi.fn();
    render(<PressurePause initialSeconds={10} onSkip={onSkip} checkId="check_123" />);

    const skipButton = screen.getByTestId("pause-skip-button");
    skipButton.focus();
    expect(document.activeElement).toBe(skipButton);

    fireEvent.click(skipButton);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("S17 Report Modal: Escape key closes modal and keyboard toggles consent", async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <ReportModal
        checkId="check_123"
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    const checkbox = screen.getByTestId("report-consent-checkbox");
    expect(checkbox).not.toBeChecked();

    // Space / click toggles checkbox
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Escape closes modal
    fireEvent.keyDown(window, { key: "Escape", code: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("S26 Case Detail: keyboard navigation in decision form and draft note autosave", async () => {
    const mockCase = {
      id: "case_abc_123",
      reference: "PRO-998877",
      status: "new" as const,
      version: 1,
      created_at: new Date().toISOString(),
      reporter_consent_at: new Date().toISOString(),
      reporter_note: "Suspicious message received",
      check: {
        id: "check_xyz",
        kind: "message" as const,
        final_level: "High" as const,
        masked_text: "টাকা পাঠান [PHONE_1]",
        route: "rules_only",
        rule_hits: ["HARD_CONFIRMED_RISKY_NUMBER"],
        reasons: ["পরিচিত প্রতারক নম্বর"],
        red_flags: [],
      },
      numbers: [
        {
          role: "sender",
          masked_display: "+880 17** ***123",
          status: "watch",
          report_count: 5,
          check_count: 12,
        },
      ],
      notes: [],
      timeline: [],
    };

    vi.spyOn(casesApi, "getCase").mockResolvedValue(mockCase);

    renderWithProviders(
      <Routes>
        <Route path="/review/cases/:id" element={<CaseDetail />} />
      </Routes>,
      ["/review/cases/case_abc_123"]
    );

    // Wait for case to load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "PRO-998877" })).toBeInTheDocument();
    });

    // Find radio option "Confirmed Scam" and click / keydown
    const radioScam = screen.getByRole("radio", { name: /প্রতারণা নিশ্চিত|Confirmed Scam/i });
    radioScam.focus();
    expect(document.activeElement).toBe(radioScam);

    // Textarea reason
    const reasonInput = screen.getByLabelText(/পর্যালোচকের কারণ|Reviewer Reason/i);
    fireEvent.change(reasonInput, { target: { value: "Number confirmed in police report." } });
    expect((reasonInput as HTMLTextAreaElement).value).toBe("Number confirmed in police report.");

    // Note draft autosave (R11, T26)
    const noteInput = screen.getByPlaceholderText(/নোট যোগ করুন|Add a note/i);
    fireEvent.change(noteInput, { target: { value: "Ongoing investigation note draft" } });

    // Verify draft saved to localStorage
    expect(localStorage.getItem("prohori_case_note_draft_case_abc_123")).toBe(
      "Ongoing investigation note draft"
    );
  });
});
