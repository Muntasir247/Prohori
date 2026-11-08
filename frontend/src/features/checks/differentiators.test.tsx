import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/lib/i18n";
import SharedResult from "@/routes/public/SharedResult";
import AlreadySent from "@/routes/user/AlreadySent";
import Result from "@/routes/user/Result";
import type { CheckResultResponse, SharedResultResponse } from "./types";

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

function renderDifferentiators(
  initialEntries: string[],
  routes: Record<string, Handler>
) {
  const fetchMock = mockFetch(routes);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const memoryRouter = createMemoryRouter(
    [
      { path: "/result/:id", element: <Result /> },
      { path: "/already-sent", element: <AlreadySent /> },
      { path: "/s/:token", element: <SharedResult /> },
      { path: "/check", element: <div>Check Home Mock</div> },
    ],
    { initialEntries }
  );

  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={memoryRouter} />
    </QueryClientProvider>
  );

  return { ...view, fetchMock };
}

const mockHighCheck: CheckResultResponse = {
  id: "check-diff-high-1",
  final_level: "High",
  response_language: "bn",
  reasons: [
    "জরুরি ভিত্তি দেখিয়ে অর্থ প্রেরণের চাপ দেওয়া হয়েছে।",
    "অপরিচিত নম্বর থেকে পুরস্কার বা লটারির দাবি।",
  ],
  red_flags: ["urgency", "lottery"],
  highlights: [],
  safe_actions: [
    {
      id: "call_bkash_helpline",
      label: "বিকাশ হেল্পলাইনে কল করুন",
      body: "বিকাশের অফিসিয়াল হেল্পলাইন ১৬২৪৭।",
      phone: "16247",
    },
  ],
  is_fallback: false,
  masked_text: "লটারি জিতেছেন এখনই টাকা পাঠান [PHONE_1]",
  caution: "",
  evidence: [],
  trimmed: false,
  created_at: new Date().toISOString(),
  has_reported: false,
};

describe("Phase 10: Differentiators", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Pressure Pause (F32)", () => {
    it("renders countdown on High result, allows skipping by keyboard/click, and sends skipped ack", async () => {
      let pauseAckBody: { outcome: string } | null = null;

      const routes: Record<string, Handler> = {
        "GET /api/v1/checks/check-diff-high-1": () => json(200, mockHighCheck),
        "POST /api/v1/checks/check-diff-high-1/pause-ack": async (_url, init) => {
          const parsed = JSON.parse(String(init?.body));
          pauseAckBody = parsed;
          return json(200, { ok: true, outcome: parsed.outcome });
        },
      };

      renderDifferentiators(["/result/check-diff-high-1"], routes);

      // Verify PressurePause is displayed
      const pauseCard = await screen.findByTestId("pressure-pause");
      expect(pauseCard).toBeInTheDocument();
      expect(screen.getByTestId("pause-countdown")).toHaveTextContent("10s");

      // Verify result remains usable beneath (never-block rule)
      expect(screen.getByTestId("primary-helpline-action")).toBeInTheDocument();

      // Click Skip
      const skipBtn = screen.getByTestId("pause-skip-button");
      fireEvent.click(skipBtn);

      // Verify ack was dispatched with skipped
      await waitFor(() => {
        expect(pauseAckBody).toEqual({ outcome: "skipped" });
      });

      // Pause card is dismissed
      expect(screen.queryByTestId("pressure-pause")).not.toBeInTheDocument();
    });

    it("sends finished ack when countdown timer completes", async () => {
      let pauseAckBody: { outcome: string } | null = null;

      mockFetch({
        "POST /api/v1/checks/check-test-id/pause-ack": async (_url, init) => {
          const parsed = JSON.parse(String(init?.body));
          pauseAckBody = parsed;
          return json(200, { ok: true, outcome: parsed.outcome });
        },
      });

      const { PressurePause } = await import("@/components/checks/PressurePause");
      render(<PressurePause checkId="check-test-id" initialSeconds={1} />);

      expect(screen.getByTestId("pause-countdown")).toHaveTextContent("1s");

      await waitFor(
        () => {
          expect(pauseAckBody).toEqual({ outcome: "finished" });
        },
        { timeout: 2500 }
      );

      expect(screen.queryByTestId("pressure-pause")).not.toBeInTheDocument();
    });
  });

  describe("2. Ask someone you trust (F33)", () => {
    it("creates share link, supports copy and revoke", async () => {
      let revokeCalled = false;

      const routes: Record<string, Handler> = {
        "GET /api/v1/checks/check-diff-high-1": () => json(200, mockHighCheck),
        "POST /api/v1/checks/check-diff-high-1/share": () =>
          json(200, {
            share_url: "/s/token_share_xyz_123",
            token: "token_share_xyz_123",
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          }),
        "DELETE /api/v1/checks/check-diff-high-1/share": () => {
          revokeCalled = true;
          return new Response(null, { status: 204 });
        },
      };

      // Mock navigator.clipboard
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      renderDifferentiators(["/result/check-diff-high-1"], routes);

      const shareBtn = await screen.findByTestId("share-button");
      fireEvent.click(shareBtn);

      // Verify modal opened with URL
      const urlInput = (await screen.findByTestId("share-url-input")) as HTMLInputElement;
      expect(urlInput.value).toContain("/s/token_share_xyz_123");

      // Copy link
      const copyBtn = screen.getByTestId("copy-share-btn");
      fireEvent.click(copyBtn);
      expect(writeTextMock).toHaveBeenCalledWith(urlInput.value);

      // Revoke link
      const revokeBtn = screen.getByTestId("revoke-share-btn");
      fireEvent.click(revokeBtn);

      await waitFor(() => {
        expect(revokeCalled).toBe(true);
      });
    });
  });

  describe("3. Shared Result Reader Page (S21, F33)", () => {
    it("renders masked result without app shell, and leaks NO private data or IDs", async () => {
      const mockSharedPayload: SharedResultResponse = {
        level: "High",
        masked_text: "লটারি কোড দিন [PHONE_1]",
        reasons: ["অননুমোদিত পুরস্কারের বার্তা", "ওটিপি বা গোপন কোড দাবি"],
        scam_type: "Lottery Prize Scam",
        safe_actions: [
          {
            id: "call_helpline",
            label: "Call official helpline",
            body: "Report this message.",
            phone: "16247",
          },
        ],
        expires_at: new Date(Date.now() + 80000000).toISOString(),
      };

      const routes: Record<string, Handler> = {
        "GET /api/v1/shares/valid_share_token_999": () => json(200, mockSharedPayload),
      };

      const { container } = renderDifferentiators(
        ["/s/valid_share_token_999"],
        routes
      );

      // Renders masked result
      await screen.findByText("লটারি কোড দিন [PHONE_1]");
      expect(screen.getByText(/Shared Security Check/i)).toBeInTheDocument();
      expect(screen.getByText(/Expires in 24 hours/i)).toBeInTheDocument();
      expect(screen.getByTestId("shared-helpline-action")).toBeInTheDocument();

      // ZERO-LEAKAGE VERIFICATION in DOM:
      const fullText = container.textContent || "";
      expect(fullText).not.toContain("check-diff-high-1");
      expect(fullText).not.toContain("guest_test_hash");
      expect(fullText).not.toContain("user_id");
      expect(fullText).not.toContain("017");
      expect(fullText).not.toContain("018");
      expect(fullText).not.toContain("019");
    });

    it("renders calm expired state on 410 Gone / invalid token", async () => {
      const routes: Record<string, Handler> = {
        "GET /api/v1/shares/expired_token_111": () =>
          json(410, {
            error: {
              code: "share_expired_or_invalid",
              message_key: "errors.share_expired_or_invalid",
            },
          }),
      };

      renderDifferentiators(["/s/expired_token_111"], routes);

      const expiredCard = await screen.findByTestId("shared-expired-card");
      expect(expiredCard).toBeInTheDocument();
      expect(screen.getByTestId("shared-check-own-btn")).toBeInTheDocument();
    });
  });

  describe("4. Already Sent Money (S18, F34)", () => {
    it("renders reader column with honest line and 4 ordered steps", async () => {
      const routes: Record<string, Handler> = {
        "GET /api/v1/safe-actions?context=after_payment": () =>
          json(200, [
            {
              id: "do_not_pay_recovery",
              label_en: "Do not pay recovery scammers",
              label_bn: "টাকা ফেরত পেতে কাউকে টাকা দেবেন না",
              body_en: "Advance recovery fees are a scam.",
              body_bn: "ফি চাওয়া আরেকটি প্রতারণা।",
              context: "after_payment",
              min_level: "Low",
              is_active: true,
            },
          ]),
      };

      renderDifferentiators(["/already-sent"], routes);

      // 1. Headline
      await screen.findByTestId("already-sent-title");

      // 2. Honest line (mandate: never claim money can be recovered)
      const honestLine = screen.getByTestId("honest-recovery-line");
      expect(honestLine).toHaveTextContent(
        /Recovery is not guaranteed\. Calling quickly gives the best chance\./i
      );

      // 3. Four ordered steps
      expect(screen.getByTestId("step-1-card")).toBeInTheDocument();
      expect(screen.getByTestId("step-2-card")).toBeInTheDocument();
      expect(screen.getByTestId("step-3-card")).toBeInTheDocument();
      expect(screen.getByTestId("step-4-card")).toBeInTheDocument();

      // Provider picker default to bKash (16247)
      const callBtn = screen.getByTestId("step-1-call-btn");
      expect(callBtn).toHaveAttribute("href", "tel:16247");

      // Step 4 direct emergency links
      expect(screen.getByTestId("call-999-btn")).toHaveAttribute("href", "tel:999");
      expect(screen.getByTestId("call-cyber-btn")).toHaveAttribute("href", "tel:01320010148");
    });

    it("pre-selects provider from query param ?provider=nagad and switches hotlines", async () => {
      const routes: Record<string, Handler> = {
        "GET /api/v1/safe-actions?context=after_payment": () => json(200, []),
      };

      renderDifferentiators(["/already-sent?provider=nagad"], routes);

      await screen.findByTestId("already-sent-title");

      // Verify Nagad hotline is selected
      const callBtn = screen.getByTestId("step-1-call-btn");
      expect(callBtn).toHaveAttribute("href", "tel:16167");

      // Click Rocket provider button
      const rocketBtn = screen.getByTestId("provider-picker-rocket");
      fireEvent.click(rocketBtn);

      // Hotline updates to Rocket 16216
      expect(screen.getByTestId("step-1-call-btn")).toHaveAttribute("href", "tel:16216");
    });
  });

  describe("5. Read Aloud (F37)", () => {
    it("hides read aloud button completely when no Bangla voice exists in Bengali mode", async () => {
      await i18n.changeLanguage("bn");

      // Mock speechSynthesis with only English voice
      const cancelMock = vi.fn();
      const speakMock = vi.fn();
      Object.assign(window, {
        speechSynthesis: {
          getVoices: () => [
            { name: "Google US English", lang: "en-US", default: true } as SpeechSynthesisVoice,
          ],
          cancel: cancelMock,
          speak: speakMock,
          onvoiceschanged: null,
        },
      });

      const routes: Record<string, Handler> = {
        "GET /api/v1/checks/check-diff-high-1": () => json(200, mockHighCheck),
      };

      renderDifferentiators(["/result/check-diff-high-1"], routes);

      await screen.findByTestId("primary-helpline-action");

      // Read aloud button must be HIDDEN completely because no bn voice exists
      expect(screen.queryByTestId("read-aloud-button")).not.toBeInTheDocument();
    });

    it("shows read aloud button and speaks when a matching voice is available", async () => {
      await i18n.changeLanguage("bn");

      const cancelMock = vi.fn();
      const speakMock = vi.fn();
      const mockBnVoice = {
        name: "Google Bangla",
        lang: "bn-BD",
        default: true,
      } as SpeechSynthesisVoice;

      class MockUtterance {
        text: string;
        voice: SpeechSynthesisVoice | null = null;
        lang: string = "";
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(text: string) {
          this.text = text;
        }
      }

      Object.assign(window, {
        SpeechSynthesisUtterance: MockUtterance,
        speechSynthesis: {
          getVoices: () => [mockBnVoice],
          cancel: cancelMock,
          speak: speakMock,
          onvoiceschanged: null,
        },
      });

      const routes: Record<string, Handler> = {
        "GET /api/v1/checks/check-diff-high-1": () => json(200, mockHighCheck),
      };

      renderDifferentiators(["/result/check-diff-high-1"], routes);

      const readBtn = await screen.findByTestId("read-aloud-button");
      expect(readBtn).toBeInTheDocument();

      // Click to speak
      fireEvent.click(readBtn);
      expect(speakMock).toHaveBeenCalled();

      // Click again while speaking to stop
      fireEvent.click(readBtn);
      expect(cancelMock).toHaveBeenCalled();
    });
  });
});
