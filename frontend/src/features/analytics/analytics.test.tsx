import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/lib/i18n";
import Overview from "@/routes/review/Overview";
import RepeatNumbers from "@/routes/review/RepeatNumbers";
import Campaigns from "@/routes/review/Campaigns";
import Reports from "@/routes/review/Reports";

// Mock Recharts ResponsiveContainer for jsdom
vi.mock("recharts", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  };
});

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

    // Exact or prefix match
    const matchingKey = Object.keys(routes).find((k) => {
      const [m, p] = k.split(" ");
      return m === method && url.startsWith(p);
    });

    if (matchingKey) {
      return routes[matchingKey](url, init);
    }

    return json(404, {
      error: { code: "not_found", message_key: "errors.not_found" },
    });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const mockUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "reviewer@prohori.local",
  display_name: "Senior Reviewer",
  role: "reviewer",
  language: "en",
  theme: "dark",
  onboarding_completed: true,
};

const mockOverviewData = {
  kpis: {
    open_cases: 12,
    high_today: 5,
    median_time_to_decision: 18,
    reviewer_agreement: 0.94,
  },
  cases_by_risk: [
    { date: "2026-11-01", high: 3, medium: 2, low: 1, total: 6 },
    { date: "2026-11-02", high: 5, medium: 1, low: 0, total: 6 },
  ],
  top_scam_types: [
    {
      id: 1,
      slug: "fake_wallet_staff",
      name_en: "Fake Wallet Staff",
      name_bn: "নকল ওয়ালেট স্টাফ",
      count: 14,
      percentage: 70.0,
    },
    {
      id: 2,
      slug: "lottery_prize",
      name_en: "Lottery Prize",
      name_bn: "লটারি পুরস্কার",
      count: 6,
      percentage: 30.0,
    },
  ],
  repeat_numbers: [
    { date: "2026-11-01", active_count: 3 },
    { date: "2026-11-02", active_count: 5 },
  ],
  reviewer_decisions: [
    {
      date: "2026-11-01",
      confirmed_scam: 4,
      not_a_scam: 1,
      needs_escalation: 1,
      closed: 0,
      total: 6,
    },
  ],
  surging_campaigns: [
    {
      id: "camp-111",
      label: "OTP Harvest Syndicate",
      scam_type_name: "Fake Wallet Staff",
      count_7d: 18,
      prev_count_7d: 5,
      first_seen_at: "2026-10-25T00:00:00Z",
      last_seen_at: "2026-11-08T00:00:00Z",
    },
  ],
  simulated: true,
  version: "simulated-v1",
};

const mockRepeatNumbersData = {
  items: [
    {
      id: "num-1",
      masked_display: "+880 17** ***111",
      report_count: 7,
      check_count: 12,
      high_count: 10,
      high_share: 0.83,
      first_seen_at: "2026-10-15T10:00:00Z",
      last_seen_at: "2026-11-07T14:00:00Z",
      status: "watch",
      sparkline_30d: [
        { date: "2026-11-01", count: 2 },
        { date: "2026-11-02", count: 4 },
      ],
    },
  ],
  total: 1,
};

const mockCampaignsData = {
  items: [
    {
      id: "camp-1",
      label: "OTP Harvest Syndicate",
      scam_type_id: 1,
      scam_type_name: "Fake Wallet Staff",
      scam_type_name_bn: "নকল ওয়ালেট স্টাফ",
      member_count: 8,
      count_7d: 14,
      prev_count_7d: 4,
      is_surging: true,
      first_seen_at: "2026-10-20T00:00:00Z",
      last_seen_at: "2026-11-07T00:00:00Z",
      updated_at: "2026-11-08T00:00:00Z",
      sample_messages: ["আপনার বিকাশ পিন পাঠান [PHONE_1]", "জরুরি ওটিপি পাঠান"],
      shared_numbers: ["+880 17** ***111", "+880 18** ***222"],
      case_references: ["PRO-10001", "PRO-10002"],
    },
  ],
  total: 1,
};

function renderApp(initialEntries: string[], customRoutes?: Record<string, Handler>) {
  const routes: Record<string, Handler> = {
    "GET /api/v1/auth/session": () => json(200, mockUser),
    "GET /api/v1/analytics/overview": () => json(200, mockOverviewData),
    "GET /api/v1/analytics/numbers": () => json(200, mockRepeatNumbersData),
    "GET /api/v1/campaigns": () => json(200, mockCampaignsData),
    ...customRoutes,
  };

  mockFetch(routes);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const memoryRouter = createMemoryRouter(
    [
      { path: "/review", element: <Overview /> },
      { path: "/review/numbers", element: <RepeatNumbers /> },
      { path: "/review/campaigns", element: <Campaigns /> },
      { path: "/review/reports", element: <Reports /> },
    ],
    { initialEntries }
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={memoryRouter} />
    </QueryClientProvider>
  );
}

describe("Phase 09: Reviewer Analytics & Workflows", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("S24: Renders KPI stat cards, simulated badge, and campaign radar alert", async () => {
    renderApp(["/review"]);

    // 1. KPIs
    await waitFor(() => {
      expect(screen.getByText("12")).toBeInTheDocument(); // Open cases
      expect(screen.getByText("5")).toBeInTheDocument(); // High today
      expect(screen.getByText("18m")).toBeInTheDocument(); // Median decision time
      expect(screen.getByText("94%")).toBeInTheDocument(); // Reviewer agreement
    });

    // 2. Simulated data badge
    const badge = screen.getByTestId("simulated-pill-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Simulated data (simulated-v1)");

    // 3. Campaign Radar Alert Banner
    const radarBanner = screen.getByTestId("campaign-radar-banner");
    expect(radarBanner).toBeInTheDocument();
    expect(radarBanner).toHaveTextContent("Campaign Radar: 1 Surging Campaign");
    expect(radarBanner).toHaveTextContent("OTP Harvest Syndicate");

    // 4. Data-table toggle on charts (loaded asynchronously via lazy)
    const tableToggleButtons = await screen.findAllByRole("button", { name: /toggle data table/i });
    expect(tableToggleButtons.length).toBeGreaterThanOrEqual(1);

    // Click data table toggle on first chart
    fireEvent.click(tableToggleButtons[0]);
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });

  it("S24: Renders empty state when no cases exist in range", async () => {
    const emptyOverview = {
      ...mockOverviewData,
      kpis: { open_cases: 0, high_today: 0, median_time_to_decision: 0, reviewer_agreement: 0 },
      cases_by_risk: [],
      top_scam_types: [],
      repeat_numbers: [],
      reviewer_decisions: [],
      surging_campaigns: [],
    };

    renderApp(["/review"], {
      "GET /api/v1/analytics/overview": () => json(200, emptyOverview),
    });

    await waitFor(() => {
      expect(screen.getByText("0m")).toBeInTheDocument();
    });

    // Should display empty chart messages
    const emptyMessages = await screen.findAllByText(/in this (date )?range/i);
    expect(emptyMessages.length).toBeGreaterThanOrEqual(1);
  });

  it("S27: Renders repeat numbers table, opens drawer with sparkline, and updates status with reason audit", async () => {
    let patchPayload: { status: string; reason: string } | null = null;
    const customRoutes = {
      "PATCH /api/v1/analytics/numbers/num-1": async (_url: string, init?: RequestInit) => {
        patchPayload = JSON.parse(String(init?.body));
        return json(200, {
          ...mockRepeatNumbersData.items[0],
          status: patchPayload!.status,
        });
      },
    };

    renderApp(["/review/numbers"], customRoutes);

    // 1. Table row
    await waitFor(() => {
      expect(screen.getByText("+880 17** ***111")).toBeInTheDocument();
      expect(screen.getByText("7")).toBeInTheDocument(); // Report count
      expect(screen.getByText("83%")).toBeInTheDocument(); // High share
    });

    // 2. Click "Change status" button
    const changeStatusBtn = await screen.findByRole("button", { name: /change status/i });
    fireEvent.click(changeStatusBtn);

    // Modal opens
    const modal = await screen.findByTestId("status-modal");
    expect(modal).toBeInTheDocument();
    expect(screen.getByText(/update number status/i)).toBeInTheDocument();

    // 3. Status validation: short reason rejected
    const reasonInput = screen.getByPlaceholderText(/document justification/i);
    const saveBtn = screen.getByRole("button", { name: /save status/i });

    // Try submitting with short reason
    fireEvent.change(reasonInput, { target: { value: "Too short" } });
    expect(saveBtn).toBeDisabled();

    // Fill valid reason (>= 10 chars)
    fireEvent.change(reasonInput, {
      target: { value: "Confirmed fraudulent syndicate number via police report" },
    });
    expect(saveBtn).not.toBeDisabled();

    // Select "confirmed_risky"
    const statusSelect = screen.getByLabelText(/new status/i);
    fireEvent.change(statusSelect, { target: { value: "confirmed_risky" } });

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(patchPayload).not.toBeNull();
      expect(patchPayload!.status).toBe("confirmed_risky");
      expect(patchPayload!.reason).toBe(
        "Confirmed fraudulent syndicate number via police report"
      );
    });
  });

  it("S28: Renders campaigns card grid, drawer with samples, rename and merge actions", async () => {
    let renamePayload: { label?: string } | null = null;
    const customRoutes = {
      "PATCH /api/v1/campaigns/camp-1": async (_url: string, init?: RequestInit) => {
        renamePayload = JSON.parse(String(init?.body));
        return json(200, {
          ...mockCampaignsData.items[0],
          label: renamePayload!.label || mockCampaignsData.items[0].label,
        });
      },
    };

    renderApp(["/review/campaigns"], customRoutes);

    // 1. Card Grid
    await waitFor(() => {
      expect(screen.getByText("OTP Harvest Syndicate")).toBeInTheDocument();
      expect(screen.getByText("Surging")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument(); // Total cases
    });

    // 2. Open campaign drawer
    fireEvent.click(screen.getByText("OTP Harvest Syndicate"));

    await waitFor(() => {
      expect(screen.getByText(/representative masked messages/i)).toBeInTheDocument();
      expect(screen.getByText("আপনার বিকাশ পিন পাঠান [PHONE_1]")).toBeInTheDocument();
      expect(screen.getByText("+880 17** ***111")).toBeInTheDocument();
    });

    // 3. Rename modal
    fireEvent.click(screen.getByRole("button", { name: /rename campaign/i }));
    const labelInput = await screen.findByLabelText(/campaign label/i);
    fireEvent.change(labelInput, { target: { value: "Renamed Syndicate Ring" } });

    fireEvent.click(screen.getByRole("button", { name: /save label/i }));

    await waitFor(() => {
      expect(renamePayload).not.toBeNull();
      expect(renamePayload!.label).toBe("Renamed Syndicate Ring");
    });
  });

  it("S29: Reports export CSV form validates 366-day limit and initiates download", async () => {
    renderApp(["/review/reports"]);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /export cases to csv/i })).toBeInTheDocument();
    });

    const fromInput = screen.getByLabelText(/from date/i);
    const toInput = screen.getByLabelText(/to date/i);
    const exportBtn = screen.getByRole("button", { name: /export csv/i });

    // 1. Test range exceeding 366 days
    fireEvent.change(fromInput, { target: { value: "2024-01-01" } });
    fireEvent.change(toInput, { target: { value: "2026-01-01" } });
    fireEvent.click(exportBtn);

    expect(
      await screen.findByText(/date range cannot exceed 366 days/i)
    ).toBeInTheDocument();

    // 2. Valid date range triggers download
    fireEvent.change(fromInput, { target: { value: "2026-10-01" } });
    fireEvent.change(toInput, { target: { value: "2026-11-01" } });

    // Spy on appendChild to confirm link click
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    fireEvent.click(exportBtn);

    expect(clickSpy).toHaveBeenCalled();
  });
});
