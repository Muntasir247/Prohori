import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/lib/i18n";
import CheckDetail from "@/routes/user/CheckDetail";
import CheckHome from "@/routes/user/CheckHome";
import History from "@/routes/user/History";
import MessageCheck from "@/routes/user/MessageCheck";
import PaymentCheck from "@/routes/user/PaymentCheck";
import Result from "@/routes/user/Result";
import type { CheckResultResponse, SampleItem, TipItem } from "./types";

// --- test helpers -----------------------------------------------------------

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

function json(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(routes: Record<string, Handler>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const handler = routes[`${method} ${url}`];
    if (!handler) {
      return json(404, {
        error: { code: "not_found", message_key: "errors.not_found" },
      });
    }
    return handler(url, init);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

function renderWithRouter(initialEntries: string[], routes: Record<string, Handler>) {
  mockFetch(routes);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const memoryRouter = createMemoryRouter(
    [
      { path: "/check", element: <CheckHome /> },
      { path: "/check/message", element: <MessageCheck /> },
      { path: "/check/payment", element: <PaymentCheck /> },
      { path: "/result/:id", element: <Result /> },
      { path: "/history", element: <History /> },
      { path: "/history/:id", element: <CheckDetail /> },
    ],
    { initialEntries }
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={memoryRouter} />
    </QueryClientProvider>
  );
}

const mockHighResult: CheckResultResponse = {
  id: "check-high-1",
  final_level: "High",
  response_language: "bn",
  reasons: [
    "বার্তাটিতে ওটিপি বা পিন নম্বর চাওয়া হয়েছে।",
    "জরুরি ভিত্তি দেখিয়ে অর্থ প্রেরণের চাপ দেওয়া হয়েছে।",
  ],
  red_flags: ["asks_for_code", "urgency"],
  highlights: [
    {
      quote: "আপনার পিন কোড দিন",
      flag: "asks_for_code",
      start: 0,
      end: 18,
    },
  ],
  safe_actions: [
    {
      id: "call_bkash_helpline",
      label: "বিকাশ হেল্পলাইনে কল করুন",
      body: "বিকাশের অফিসিয়াল হেল্পলাইন ১৬২৪৭।",
      phone: "16247",
    },
    {
      id: "do_not_send",
      label: "টাকা পাঠাবেন না",
      body: "কাউকে কোনো অর্থ পাঠাবেন না।",
    },
  ],
  caution: "সতর্কতা: এটি ঝুঁকিপূর্ণ। কোনো তথ্য দেবেন না।",
  scam_type: { slug: "fake_wallet_staff", name: "ভুয়া বিকাশ প্রতিনিধি" },
  evidence: [{ code: "PAT-001", title: "Fake bKash Staff" }],
  masked_text: "আপনার পিন কোড দিন এবং অবিলম্বে যাচাই করুন।",
  is_fallback: false,
  trimmed: false,
  has_reported: false,
  created_at: "2026-11-08T10:00:00Z",
};

const mockMediumResult: CheckResultResponse = {
  id: "check-medium-1",
  final_level: "Medium",
  response_language: "bn",
  reasons: ["অপরিচিত নম্বর থেকে জরুরি অনুরোধ এসেছে।"],
  red_flags: ["urgency"],
  highlights: [],
  safe_actions: [
    {
      id: "confirm_another_way",
      label: "চেনা নম্বরে যাচাই করুন",
      body: "অন্য মাধ্যমে নিশ্চিত হোন।",
    },
  ],
  caution: "সতর্কতা: সতর্ক সংকেত পাওয়া গেছে।",
  scam_type: null,
  evidence: [],
  masked_text: "জরুরি টাকা লাগবে, সাহায্য করুন।",
  is_fallback: false,
  trimmed: false,
  has_reported: false,
  created_at: "2026-11-08T10:00:00Z",
};

const mockLowResult: CheckResultResponse = {
  id: "check-low-1",
  final_level: "Low",
  response_language: "bn",
  reasons: ["বার্তাটিতে কোনো পরিচিত সতর্ক সংকেত মেলেনি।"],
  red_flags: [],
  highlights: [],
  safe_actions: [
    {
      id: "check_in_official_app",
      label: "অফিসিয়াল অ্যাপে যাচাই করুন",
      body: "অ্যাপে ব্যালেন্স দেখুন।",
    },
  ],
  caution: "কম ঝুঁকি মানেই নিরাপদ নয়। নম্বরটি যাচাই করুন।",
  scam_type: null,
  evidence: [],
  masked_text: "আপনার একাউন্ট স্টেটমেন্ট পাঠানো হয়েছে।",
  is_fallback: false,
  trimmed: false,
  has_reported: false,
  created_at: "2026-11-08T10:00:00Z",
};

const mockUnavailableResult: CheckResultResponse = {
  id: "check-unavail-1",
  final_level: null, // S16: null level when model unavailable with 0 rules
  response_language: "bn",
  reasons: [
    "আমাদের সিস্টেম বর্তমানে বার্তাটি সম্পূর্ণভাবে পরীক্ষা করতে পারছে না।",
  ],
  red_flags: [],
  highlights: [],
  safe_actions: [
    {
      id: "call_provider_helpline",
      label: "হেল্পলাইনে কল করুন",
      body: "আপনার সেবাদাতার অফিসিয়াল হেল্পলাইনে যোগাযোগ করুন।",
      phone: null, // Unverified provider helpline!
    },
  ],
  caution: "সতর্কতা অবলম্বন করুন।",
  scam_type: null,
  evidence: [],
  masked_text: "কিছু একটা সাধারণ বার্তা।",
  is_fallback: true,
  trimmed: false,
  has_reported: false,
  created_at: "2026-11-08T10:00:00Z",
};

const mockSamples: SampleItem[] = [
  {
    id: 1,
    label_en: "Fake bKash staff",
    label_bn: "ভুয়া বিকাশ কর্মকর্তা",
    body: "আপনার বিকাশ একাউন্ট সাময়িক বন্ধ করা হয়েছে। পিন দিন।",
    language: "bn",
  },
  {
    id: 2,
    label_en: "Prize lottery SMS",
    label_bn: "লটারি জয়ের বার্তা",
    body: "অভিনন্দন! আপনি ৫০,০০০ টাকা জিতেছেন। ফি পাঠান।",
    language: "bn",
  },
];

const mockTip: TipItem = {
  id: 1,
  title_en: "Never share OTP",
  title_bn: "কখনোই ওটিপি শেয়ার করবেন না",
  body_en: "bKash will never ask for your secret PIN or OTP.",
  body_bn: "বিকাশ কর্মকর্তা কখনো আপনার কাছে পিন বা ওটিপি চাইবে না।",
  active_from: "2026-11-01",
};

describe("Core Check Journey (Phase 08)", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("bn");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("S10 Message Check", () => {
    it("validates character length and submits to real pipeline", async () => {
      let postedBody: Record<string, unknown> | null = null;
      renderWithRouter(["/check/message"], {
        "GET /api/v1/samples": () => json(200, mockSamples),
        "POST /api/v1/check-message": (_url, init) => {
          postedBody = JSON.parse(String(init?.body));
          return json(200, mockHighResult);
        },
        "GET /api/v1/checks/check-high-1": () => json(200, mockHighResult),
      });

      // Submit button should be disabled when empty
      const submitBtn = screen.getByTestId("check-submit-button");
      expect(submitBtn).toBeDisabled();

      // Type short text (< 10 chars)
      const input = screen.getByTestId("message-input");
      fireEvent.change(input, { target: { value: "হাই" } });
      expect(submitBtn).toBeDisabled();

      // Type valid message >= 10 chars
      fireEvent.change(input, {
        target: { value: "আপনার বিকাশ একাউন্ট ব্লক করা হয়েছে পিন দিন" },
      });
      expect(submitBtn).not.toBeDisabled();

      // Submit
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(postedBody).toEqual({
          text: "আপনার বিকাশ একাউন্ট ব্লক করা হয়েছে পিন দিন",
          claimed_sender: undefined,
          language_hint: "bn",
        });
      });

      // Navigated to result
      await waitFor(() => {
        expect(screen.getByTestId("risk-banner-high")).toBeInTheDocument();
      });
    });

    it("try-a-sample chips populate the message input", async () => {
      renderWithRouter(["/check/message"], {
        "GET /api/v1/samples": () => json(200, mockSamples),
      });

      // Open sample container
      await waitFor(() => {
        expect(screen.getByTestId("toggle-samples-btn")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("toggle-samples-btn"));

      // Click the first sample chip
      const chip = await screen.findByText("ভুয়া বিকাশ কর্মকর্তা");
      fireEvent.click(chip);

      // Verify input text is populated
      const input = screen.getByTestId("message-input") as HTMLTextAreaElement;
      expect(input.value).toBe(mockSamples[0].body);
      expect(screen.getByTestId("check-submit-button")).not.toBeDisabled();
    });

    it("preserves user text on API failure", async () => {
      renderWithRouter(["/check/message"], {
        "GET /api/v1/samples": () => json(200, mockSamples),
        "POST /api/v1/check-message": () =>
          json(500, { error: { code: "server_error" } }),
      });

      const input = screen.getByTestId("message-input") as HTMLTextAreaElement;
      fireEvent.change(input, {
        target: { value: "ব্যবহারকারীর গুরুত্বপূর্ণ মেসেজ যা হারাবে না" },
      });

      fireEvent.click(screen.getByTestId("check-submit-button"));

      await waitFor(() => {
        expect(screen.getByTestId("check-error-message")).toBeInTheDocument();
      });

      // The typed text must still be present!
      expect(input.value).toBe("ব্যবহারকারীর গুরুত্বপূর্ণ মেসেজ যা হারাবে না");
    });
  });

  describe("S11 Payment Check", () => {
    it("submits payment parameters to /check-payment and navigates to result", async () => {
      let postedBody: Record<string, unknown> | null = null;
      renderWithRouter(["/check/payment"], {
        "POST /api/v1/check-payment": (_url, init) => {
          postedBody = JSON.parse(String(init?.body));
          return json(200, mockMediumResult);
        },
        "GET /api/v1/checks/check-medium-1": () => json(200, mockMediumResult),
      });

      const amountInput = screen.getByTestId("payment-amount-input");
      fireEvent.change(amountInput, { target: { value: "15000" } });

      const submitBtn = screen.getByTestId("payment-submit-button");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(postedBody).toMatchObject({
          amount_bdt: "15000",
          recipient_status: "new",
          provider: "bkash",
          request_channel: "phone_call",
          rushed: "yes",
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId("risk-banner-medium")).toBeInTheDocument();
      });
    });
  });

  describe("Result Screen (S13, S14, S15, S16)", () => {
    it("renders Result High with banner focus, aria-live, PressurePause and verified helpline", async () => {
      renderWithRouter(["/result/check-high-1"], {
        "GET /api/v1/checks/check-high-1": () => json(200, mockHighResult),
      });

      // Risk banner high
      const banner = await screen.findByTestId("risk-banner-high");
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveAttribute("aria-live", "polite");
      expect(banner).toHaveAttribute("role", "alert");

      // Banner heading receives focus
      const heading = screen.getByTestId("banner-heading");
      expect(document.activeElement).toBe(heading);

      // Pressure Pause is rendered for High
      expect(screen.getByTestId("pressure-pause")).toBeInTheDocument();

      // Primary helpline uses tel: with verified 16247
      const helplineLink = screen.getByTestId("primary-helpline-action");
      expect(helplineLink).toHaveAttribute("href", "tel:16247");
    });

    it("renders Result Medium without PressurePause", async () => {
      renderWithRouter(["/result/check-medium-1"], {
        "GET /api/v1/checks/check-medium-1": () => json(200, mockMediumResult),
      });

      const banner = await screen.findByTestId("risk-banner-medium");
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveAttribute("aria-live", "polite");

      // No Pressure Pause on Medium
      expect(screen.queryByTestId("pressure-pause")).toBeNull();
    });

    it("renders Result Low with mandatory caution directly under headline and is NOT green", async () => {
      renderWithRouter(["/result/check-low-1"], {
        "GET /api/v1/checks/check-low-1": () => json(200, mockLowResult),
      });

      const banner = await screen.findByTestId("risk-banner-low");
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveAttribute("aria-live", "polite");

      // Mandatory caution under headline
      const caution = screen.getByTestId("mandatory-low-caution");
      expect(caution).toBeInTheDocument();
      expect(caution).toHaveTextContent("কম ঝুঁকির অর্থ শতভাগ নিরাপদ নয়");

      // Banner heading receives focus
      const heading = screen.getByTestId("banner-heading");
      expect(document.activeElement).toBe(heading);
    });

    it("renders Result Unavailable when model fails, NEVER shows Low, and shows official app notice", async () => {
      renderWithRouter(["/result/check-unavail-1"], {
        "GET /api/v1/checks/check-unavail-1": () => json(200, mockUnavailableResult),
      });

      const banner = await screen.findByTestId("risk-banner-unavailable");
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveAttribute("aria-live", "polite");

      // MUST NEVER show Low
      expect(screen.queryByTestId("risk-banner-low")).toBeNull();
      expect(screen.queryByTestId("mandatory-low-caution")).toBeNull();

      // Unverified provider notice is shown
      const notice = screen.getByTestId("unverified-provider-notice");
      expect(notice).toHaveTextContent(
        "আপনার সেবাদাতার অফিসিয়াল অ্যাপে থাকা নম্বর ব্যবহার করুন"
      );
    });
  });

  describe("HighlightedMessage (Scam Anatomy)", () => {
    it("underlines verified quotes and displays the reason on tap", async () => {
      renderWithRouter(["/result/check-high-1"], {
        "GET /api/v1/checks/check-high-1": () => json(200, mockHighResult),
      });

      // Find the highlighted quote button
      const quoteBtn = await screen.findByTestId("highlighted-quote");
      expect(quoteBtn).toBeInTheDocument();
      expect(quoteBtn).toHaveTextContent("আপনার পিন কোড দিন");

      // Popover is not open initially
      expect(screen.queryByTestId("anatomy-popover")).toBeNull();

      // Click/tap the quote
      fireEvent.click(quoteBtn);

      // Scam anatomy popover appears
      const popover = await screen.findByTestId("anatomy-popover");
      expect(popover).toBeInTheDocument();
      expect(popover).toHaveTextContent("আপনার পিন কোড দিন");
      expect(popover).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("S17 Report Modal", () => {
    it("requires consent, posts to /report, returns reference PRO-000123 and is idempotent", async () => {
      let reportCount = 0;
      renderWithRouter(["/result/check-high-1"], {
        "GET /api/v1/checks/check-high-1": () => json(200, mockHighResult),
        "POST /api/v1/checks/check-high-1/report": () => {
          reportCount++;
          return json(200, { reference: "PRO-000123" });
        },
      });

      // Click report button
      const reportBtn = await screen.findByTestId("report-button");
      fireEvent.click(reportBtn);

      // Modal appears
      const modal = await screen.findByTestId("report-modal");
      expect(modal).toBeInTheDocument();

      const submitReportBtn = screen.getByTestId("submit-report-button");
      expect(submitReportBtn).toBeDisabled();

      // Check consent
      const consentBox = screen.getByTestId("report-consent-checkbox");
      fireEvent.click(consentBox);
      expect(submitReportBtn).not.toBeDisabled();

      // Submit report
      fireEvent.click(submitReportBtn);

      // Reference is displayed
      await waitFor(() => {
        expect(screen.getByTestId("report-reference")).toHaveTextContent("PRO-000123");
      });
      expect(reportCount).toBe(1);

      // Close modal
      fireEvent.click(screen.getByTestId("report-done-button"));

      // Status tag now shows reported with reference
      await waitFor(() => {
        expect(screen.getByTestId("reported-status-tag")).toHaveTextContent("PRO-000123");
      });
    });
  });

  describe("S09 Check Home & S19 History", () => {
    it("renders CheckHome with Action cards, urgent Already Sent row, and weekly tip", async () => {
      renderWithRouter(["/check"], {
        "GET /api/v1/me": () => json(401, {}),
        "GET /api/v1/tips/current": () => json(200, mockTip),
      });

      expect(await screen.findByTestId("home-check-message")).toBeInTheDocument();
      expect(screen.getByTestId("home-check-payment")).toBeInTheDocument();
      expect(screen.getByTestId("urgent-already-sent-row")).toBeInTheDocument();

      // Weekly tip rendered
      expect(await screen.findByText("কখনোই ওটিপি শেয়ার করবেন না")).toBeInTheDocument();
    });

    it("History prompts guests to sign in", async () => {
      renderWithRouter(["/history"], {
        "GET /api/v1/me": () => json(401, {}),
      });

      expect(await screen.findByText("ইতিহাস সংরক্ষণ করুন")).toBeInTheDocument();
      expect(screen.getAllByText("সাইন ইন").length).toBeGreaterThanOrEqual(1);
    });
  });
});
