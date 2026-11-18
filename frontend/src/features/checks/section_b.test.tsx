import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShellLayout } from "@/components/AppShell";
import { OfflineBanner } from "@/components/OfflineBanner";
import { RequireRole } from "@/components/RequireRole";
import { RateLimitedCard } from "@/components/checks/RateLimitedCard";
import { Modal } from "@/components/ui/Modal";
import i18n from "@/lib/i18n";
import CaseDetail from "@/routes/review/CaseDetail";
import ErrorPage from "@/routes/system/ErrorPage";
import MessageCheck from "@/routes/user/MessageCheck";
import Notifications from "@/routes/user/Notifications";
import PaymentCheck from "@/routes/user/PaymentCheck";

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function mockFetch(routes: Record<string, Handler>) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = (init?.method ?? "GET").toUpperCase();
    const key = `${method} ${url}`;
    const handler = routes[key];
    if (handler) return handler(url, init);
    if (url === "/api/v1/auth/session") return json(200, null);
    if (url.startsWith("/api/v1/notifications")) {
      return json(200, { items: [], unread_count: 0, next_cursor: null });
    }
    if (url === "/api/v1/samples") return json(200, []);
    throw new Error(`Unexpected fetch: ${key}`);
  });
}

function renderWithProviders(ui: React.ReactElement, initialEntries = ["/"]) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Section B: Notifications (S23), Case Claim, S36 Errors, S37 429/Offline, Radix UI", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders S23 Notifications with Radix Tabs and marks items read", async () => {
    let readPayload: unknown = null;
    mockFetch({
      "GET /api/v1/auth/session": () =>
        json(200, {
          id: "u1",
          email: "user@example.com",
          display_name: "Rahim",
          role: "user",
          language: "en",
          onboarding_completed: true,
        }),
      "GET /api/v1/notifications": () =>
        json(200, {
          items: [
            {
              id: "n1",
              type: "case_decided",
              payload: {
                case_id: "c1",
                reference: "PRO-100200",
                status: "confirmed_scam",
              },
              read_at: null,
              created_at: "2026-11-17T10:00:00Z",
            },
          ],
          unread_count: 1,
          next_cursor: null,
        }),
      "POST /api/v1/notifications/read": async (_u, init) => {
        readPayload = JSON.parse(String(init?.body));
        return new Response(null, { status: 204 });
      },
    });

    renderWithProviders(<Notifications />, ["/notifications"]);

    expect(await screen.findByText(/PRO-100200/)).toBeInTheDocument();
    expect(screen.getByTestId("notifications-tab-all")).toBeInTheDocument();
    expect(screen.getByTestId("notifications-tab-unread")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("mark-all-read-btn"));
    await waitFor(() => {
      expect(readPayload).toEqual({ all: true });
    });
  });

  it("renders S36 ErrorPage for 404, 403, and 500 with reference ID and helpline link", () => {
    const { unmount } = renderWithProviders(<ErrorPage code={404} />);
    expect(screen.getByTestId("error-page-404")).toBeInTheDocument();
    expect(screen.getByTestId("error-go-home")).toHaveAttribute("href", "/");
    expect(screen.getByTestId("error-helpline-link")).toHaveAttribute("href", "/already-sent");
    unmount();

    renderWithProviders(<ErrorPage code={500} referenceId="ERR-ABC123" />);
    expect(screen.getByTestId("error-page-500")).toBeInTheDocument();
    expect(screen.getByTestId("error-reference-id")).toHaveTextContent("ERR-ABC123");
    expect(screen.getByTestId("error-helpline-link")).toHaveAttribute("href", "/already-sent");
  });

  it("renders S37 RateLimitedCard on 429 in MessageCheck while preserving typed text", async () => {
    mockFetch({
      "POST /api/v1/check-message": () =>
        json(
          429,
          {
            error: {
              code: "rate_limited",
              message_key: "errors.rate_limited",
              fields: {},
              request_id: "req-429",
              retry_after: 45,
            },
          },
          { "Retry-After": "45" }
        ),
    });

    renderWithProviders(<MessageCheck />, ["/check/message"]);
    const input = screen.getByTestId("message-input") as HTMLTextAreaElement;
    fireEvent.change(input, {
      target: { value: "Send your bKash OTP now or account blocked." },
    });
    fireEvent.click(screen.getByTestId("check-submit-button"));

    expect(await screen.findByTestId("rate-limited-card")).toBeInTheDocument();
    expect(screen.getByTestId("rate-limit-countdown")).toHaveTextContent("45s");
    expect(input.value).toBe("Send your bKash OTP now or account blocked.");
  });

  it("renders S37 global OfflineBanner when navigator.onLine is false", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    renderWithProviders(<OfflineBanner />);
    expect(screen.getByTestId("global-offline-banner")).toBeInTheDocument();
  });

  it("claims a case in S26 CaseDetail via PATCH /api/v1/cases/{id}", async () => {
    let patchedBody: unknown = null;
    const baseCase = {
      id: "case-1",
      reference: "PRO-777888",
      status: "new",
      version: 1,
      assigned_to: null,
      assigned_to_name: null,
      created_at: "2026-11-17T10:00:00Z",
      reporter_consent_at: "2026-11-17T10:00:00Z",
      check: {
        id: "chk-1",
        kind: "message",
        final_level: "High",
        masked_text: "Send OTP [PHONE_1]",
        reasons: ["OTP requested"],
      },
      numbers: [],
      notes: [],
      timeline: [],
    };

    mockFetch({
      "GET /api/v1/auth/session": () =>
        json(200, {
          id: "rev-1",
          email: "rev@example.com",
          display_name: "Reviewer One",
          role: "reviewer",
          language: "en",
          onboarding_completed: true,
        }),
      "GET /api/v1/cases/case-1": () => json(200, baseCase),
      "PATCH /api/v1/cases/case-1": async (_u, init) => {
        patchedBody = JSON.parse(String(init?.body));
        return json(200, {
          ...baseCase,
          status: "in_review",
          version: 2,
          assigned_to: "rev-1",
          assigned_to_name: "Reviewer One",
        });
      },
    });

    renderWithProviders(
      <Routes>
        <Route path="/review/cases/:id" element={<CaseDetail />} />
      </Routes>,
      ["/review/cases/case-1"]
    );

    const claimBtn = await screen.findByTestId("claim-case-btn");
    fireEvent.click(claimBtn);

    await waitFor(() => {
      expect(patchedBody).toEqual({ assigned_to: "rev-1", version: 1 });
    });
    expect(await screen.findByTestId("unassign-case-btn")).toBeInTheDocument();
  });

  it("renders Radix Modal primitive with title and accessible dialog role", () => {
    renderWithProviders(
      <Modal open={true} onOpenChange={() => undefined} title="Confirm Action" testId="radix-modal">
        <p>Modal body</p>
      </Modal>
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Confirm Action")).toBeInTheDocument();
  });

  it("renders RateLimitedCard standalone with verified bKash 16247 call link", () => {
    renderWithProviders(<RateLimitedCard retryAfterSeconds={30} />);
    expect(screen.getByTestId("rate-limited-card")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /16247/ })).toHaveAttribute("href", "tel:16247");
  });

  it("renders PaymentCheck with translated option labels and no duplicated parentheticals in Bangla", async () => {
    await i18n.changeLanguage("bn");
    mockFetch({});
    const { container } = renderWithProviders(<PaymentCheck />, ["/check/payment"]);

    const text = container.textContent ?? "";
    expect(text).not.toContain("payment_check.");
    expect(text).not.toContain("(BDT) (BDT)");
    expect(text).not.toContain("(ঐচ্ছিক) (ঐচ্ছিক)");
    expect(text).not.toContain("PAYMENT FRAUD MODEL");
    expect(screen.getByTestId("recipient-status-known")).toHaveTextContent("পরিচিত");
    expect(screen.getByTestId("channel-chip-phone_call")).toHaveTextContent("ফোন কল");
    expect(screen.getByTestId("rushed-yes-button")).toHaveTextContent("হ্যাঁ, তাড়া দিচ্ছে");
  });

  it("renders 403 inside ShellLayout without nested <main> landmarks", async () => {
    mockFetch({
      "GET /api/v1/auth/session": () =>
        json(200, {
          id: "u-regular",
          email: "user@prohori.test",
          display_name: "Rahim",
          role: "user",
          language: "en",
          theme: "dark",
          onboarding_completed: true,
        }),
    });

    const { container } = renderWithProviders(
      <Routes>
        <Route element={<ShellLayout />}>
          <Route
            path="/review"
            element={
              <RequireRole roles={["reviewer", "admin"]}>
                <div>Secret Review</div>
              </RequireRole>
            }
          />
        </Route>
      </Routes>,
      ["/review"]
    );

    const card = await screen.findByTestId("error-page-403");
    expect(card.tagName).toBe("SECTION");
    expect(container.querySelectorAll("main")).toHaveLength(1);
  });
});
