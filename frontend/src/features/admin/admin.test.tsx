import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/lib/i18n";
import AdminApiKeys from "@/routes/admin/ApiKeys";
import AdminAuditLog from "@/routes/admin/AuditLog";
import AdminKnowledge from "@/routes/admin/Knowledge";
import AdminQuality from "@/routes/admin/Quality";
import AdminSafeActions from "@/routes/admin/SafeActions";
import AdminUsers from "@/routes/admin/Users";

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

const mockAdminUser = {
  id: "00000000-0000-0000-0000-000000000099",
  email: "admin@prohori.local",
  display_name: "Super Admin",
  role: "admin",
  language: "en",
  is_verified: true,
  is_active: true,
};

function renderRoute(initialEntry: string, element: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  const router = createMemoryRouter(
    [
      {
        path: initialEntry,
        element,
      },
    ],
    { initialEntries: [initialEntry] },
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("Phase 11: Admin Screens and Partner API", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("S30 Knowledge Base: renders list, adds pattern, and publishes to update chunks", async () => {
    let published = false;
    mockFetch({
      "GET /api/v1/auth/me": () => json(200, mockAdminUser),
      "GET /api/v1/admin/knowledge": () =>
        json(200, [
          {
            id: "11111111-1111-1111-1111-111111111111",
            code: "KB-LOT-01",
            title: "Fake Lottery SMS with bKash PIN Phishing",
            scam_type_id: 1,
            scam_type_name: "Fake Lottery / Prize",
            language: "bn",
            source_url: "https://police.gov.bd/alerts/lottery",
            body: "আপনার লটারি 50000 টাকা জিততে যোগাযোগ করুন",
            status: published ? "Published" : "Draft",
            created_at: "2026-11-01T10:00:00Z",
            updated_at: "2026-11-01T10:00:00Z",
            chunk_count: published ? 3 : 0,
          },
        ]),
      "POST /api/v1/admin/knowledge/11111111-1111-1111-1111-111111111111/publish": () => {
        published = true;
        return json(200, {
          ok: true,
          document_id: "11111111-1111-1111-1111-111111111111",
          chunks_published: 3,
          status: "Published",
        });
      },
    });

    renderRoute("/admin/knowledge", <AdminKnowledge />);

    // Renders title and pattern
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Knowledge Base/i })).toBeInTheDocument();
      expect(screen.getByText("KB-LOT-01")).toBeInTheDocument();
      expect(screen.getByText(/Fake Lottery SMS with bKash PIN Phishing/i)).toBeInTheDocument();
    });

    // Check draft status before publish (option + table cell)
    expect(screen.getAllByText("Draft").length).toBeGreaterThanOrEqual(1);

    // Click Publish button
    const publishBtn = screen.getByRole("button", { name: /Publish/i });
    fireEvent.click(publishBtn);

    // After publish, status transitions to Published with chunks
    await waitFor(() => {
      expect(screen.getAllByText("Published").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("3 chunks")).toBeInTheDocument();
    });
  });

  it("S31 Safe Actions: enforces verification constraint on helplines and shows 90-day warning", async () => {
    mockFetch({
      "GET /api/v1/auth/me": () => json(200, mockAdminUser),
      "GET /api/v1/admin/safe-actions": () =>
        json(200, [
          {
            id: "call_bkash_helpline",
            label_en: "Call official bKash helpline",
            label_bn: "বিকাশ হেল্পলাইনে কল করুন",
            context: "before_payment",
            min_level: "Medium",
            provider: "bkash",
            phone: "16247",
            source_url: "https://www.bkash.com/contact",
            verified_at: "2026-05-01", // Older than 90 days
            is_active: true,
            sort_order: 10,
            needs_reverification: true,
          },
          {
            id: "call_unverified_nagad",
            label_en: "Call Nagad support",
            label_bn: "নগদ সাপোর্টে কল করুন",
            context: "before_payment",
            min_level: "High",
            provider: "nagad",
            phone: "16167",
            source_url: null,
            verified_at: null,
            is_active: false,
            sort_order: 20,
            needs_reverification: false,
          },
        ]),
    });

    renderRoute("/admin/safe-actions", <AdminSafeActions />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Safe Actions & Helplines/i })).toBeInTheDocument();
      expect(screen.getByText("call_bkash_helpline")).toBeInTheDocument();
    });

    // Verify 90-day re-verification warning banner is shown
    expect(screen.getByText(/Re-verification Required/i)).toBeInTheDocument();
    expect(screen.getByText(/>90d/i)).toBeInTheDocument();

    // Try adding a helpline with a phone and active=true without source URL -> blocked client-side
    const addBtn = screen.getByRole("button", { name: /New Safe Action/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "New Safe Action" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/e.g. call_bkash_helpline/i), {
      target: { value: "call_rocket_helpline" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Call bKash helpline/i), {
      target: { value: "Call Rocket" },
    });
    fireEvent.change(screen.getByPlaceholderText(/বিকাশ হেল্পলাইন/i), {
      target: { value: "রকেট হেল্পলাইন" },
    });
    fireEvent.change(screen.getByPlaceholderText(/16247 or 017/i), {
      target: { value: "16216" },
    });

    // Toggle active checkbox to true
    const activeCheckbox = screen.getByRole("checkbox");
    fireEvent.click(activeCheckbox);

    // Submit form without source_url and verified_at
    const submitBtn = screen.getByRole("button", { name: /Create Action/i });
    fireEvent.click(submitBtn);

    // Expect client validation error preventing unverified activation
    await waitFor(() => {
      expect(
        screen.getByText(/cannot be active without a verified source URL and verification date/i),
      ).toBeInTheDocument();
    });
  });

  it("S32 Quality: displays KPIs, notice, and handles 409 eval_gate_failed on prompt activation", async () => {
    mockFetch({
      "GET /api/v1/auth/me": () => json(200, mockAdminUser),
      "GET /api/v1/admin/quality": () =>
        json(200, {
          kpi_precision: 0.94,
          kpi_recall: 0.88,
          kpi_genuine_high_rate: 0.02,
          kpi_unsafe_flags: 0,
          notice: "Measured on simulated data only (simulated-v1)",
          prompt_versions: [
            {
              id: 1,
              name: "v1.2.0-baseline",
              version: "1.2.0",
              body_sha256: "abc123def456",
              is_active: true,
              created_at: "2026-11-01T00:00:00Z",
            },
            {
              id: 2,
              name: "v1.3.0-experimental",
              version: "1.3.0",
              body_sha256: "fedcba654321",
              is_active: false,
              created_at: "2026-11-05T00:00:00Z",
            },
          ],
          eval_runs: [
            {
              id: 10,
              prompt_version_id: 2,
              prompt_version_name: "v1.3.0-experimental",
              prompt_version: "1.3.0",
              dataset_version: "v1-benchmark",
              item_count: 50,
              high_precision: 0.82, // Below target 0.90!
              high_recall: 0.80,
              genuine_high_rate: 0.05,
              unsafe_flags: 1, // Unsafe!
              report: {},
              created_at: "2026-11-06T00:00:00Z",
            },
          ],
          route_mix: [
            { route: "message", count: 80, percentage: 80.0 },
            { route: "payment", count: 20, percentage: 20.0 },
          ],
          total_checks: 100,
          total_input_tokens: 50000,
          total_output_tokens: 15000,
          total_cache_read_tokens: 35000,
          cache_hit_rate: 0.7,
        }),
      "POST /api/v1/admin/prompts/2/activate": () =>
        json(409, {
          error: {
            code: "eval_gate_failed",
            message_key: "errors.eval_gate_failed",
          },
        }),
    });

    renderRoute("/admin/quality", <AdminQuality />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Quality & Evaluation Harness/i })).toBeInTheDocument();
      expect(screen.getByText("94.0%")).toBeInTheDocument();
      expect(screen.getByText("Measured on simulated data only (simulated-v1)")).toBeInTheDocument();
    });

    // Try activating v1.3.0-experimental which fails the eval gate
    const activateBtn = screen.getByRole("button", { name: /Activate Version/i });
    fireEvent.click(activateBtn);

    // Expect 409 gate failure alert dialog
    await waitFor(() => {
      expect(screen.getByText(/Prompt Activation Blocked \(409 eval_gate_failed\)/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Section 10.7 quality targets not met or unsafe flags > 0/i),
      ).toBeInTheDocument();
    });
  });

  it("S33 Users: invites staff with 48h link and displays last admin protection alert", async () => {
    mockFetch({
      "GET /api/v1/auth/me": () => json(200, mockAdminUser),
      "GET /api/v1/admin/users": () =>
        json(200, [
          {
            id: mockAdminUser.id,
            email: mockAdminUser.email,
            display_name: mockAdminUser.display_name,
            role: "admin",
            is_active: true,
            created_at: "2026-10-01T00:00:00Z",
          },
        ]),
      "POST /api/v1/admin/users/invite": () =>
        json(200, {
          email: "newreviewer@prohori.org",
          role: "reviewer",
          invite_url: "https://prohori.org/accept-invite?token=invite_test_secret_123",
          expires_at: "2026-11-10T12:00:00Z",
        }),
      "PATCH /api/v1/admin/users/00000000-0000-0000-0000-000000000099": () =>
        json(409, {
          error: {
            code: "last_admin",
            message_key: "errors.last_admin",
          },
        }),
    });

    renderRoute("/admin/users", <AdminUsers />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /User & Role Management/i })).toBeInTheDocument();
      expect(screen.getByText(mockAdminUser.email)).toBeInTheDocument();
    });

    // Test invite reviewer
    const inviteBtn = screen.getByRole("button", { name: /Invite Reviewer \/ Admin/i });
    fireEvent.click(inviteBtn);

    fireEvent.change(screen.getByPlaceholderText(/reviewer@example.com/i), {
      target: { value: "newreviewer@prohori.org" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Generate Invite Link/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invitation Link Generated/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/accept-invite\?token=invite_test_secret_123/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Done/i }));

    // Test last admin demote protection
    const changeRoleBtn = screen.getByRole("button", { name: /Change Role/i });
    fireEvent.click(changeRoleBtn);

    await waitFor(() => {
      expect(screen.getByText(/Select New Role/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "reviewer" } });
    fireEvent.click(screen.getByRole("button", { name: /Update Role/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Protection rule: Cannot demote or deactivate the last remaining administrator/i),
      ).toBeInTheDocument();
    });
  });

  it("S34 API Keys: creates key, shows raw key once with copy button, and displays placeholder curl", async () => {
    mockFetch({
      "GET /api/v1/auth/me": () => json(200, mockAdminUser),
      "GET /api/v1/admin/api-keys": () =>
        json(200, [
          {
            id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            name: "Nagad Anti-Fraud Client",
            key_prefix: "prh_live_",
            scopes: ["checks:write", "cases:read"],
            rate_limit_per_min: 120,
            last_used_at: "2026-11-08T09:00:00Z",
            revoked_at: null,
            created_at: "2026-11-01T00:00:00Z",
            is_active: true,
          },
        ]),
      "POST /api/v1/admin/api-keys": () =>
        json(200, {
          id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          name: "bKash Core Gateway",
          key_prefix: "prh_live_",
          scopes: ["checks:write"],
          rate_limit_per_min: 60,
          created_at: "2026-11-08T12:00:00Z",
          raw_key: "prh_live_9f83ac124b89e7104d5e9a2b847c11f0",
          notice: "Copy this key now. It will never be shown again.",
        }),
    });

    renderRoute("/admin/api-keys", <AdminApiKeys />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Partner API Keys/i })).toBeInTheDocument();
      expect(screen.getByText("Nagad Anti-Fraud Client")).toBeInTheDocument();
      // Verifies placeholder curl example (never real key)
      expect(screen.getByText(/prh_live_REPLACE_WITH_YOUR_KEY/i)).toBeInTheDocument();
    });

    // Create a new key
    const createBtn = screen.getByRole("button", { name: /Create API Key/i });
    fireEvent.click(createBtn);

    fireEvent.change(screen.getByPlaceholderText(/bKash Fraud Prevention Gateway/i), {
      target: { value: "bKash Core Gateway" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Generate Key/i }));

    // Key shown once modal appears with raw key and copy button
    await waitFor(() => {
      expect(screen.getByText("Partner API Key Generated")).toBeInTheDocument();
      expect(screen.getByText("Save This Key Now")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("prh_live_9f83ac124b89e7104d5e9a2b847c11f0"),
      ).toBeInTheDocument();
    });
  });

  it("S35 Audit Log: strictly read-only, renders events, and inspects before/after diff drawer", async () => {
    mockFetch({
      "GET /api/v1/auth/me": () => json(200, mockAdminUser),
      "GET /api/v1/admin/audit": () =>
        json(200, {
          items: [
            {
              id: 501,
              actor_id: "00000000-0000-0000-0000-000000000099",
              actor_role: "admin",
              action: "publish",
              entity_type: "kb_document",
              entity_id: "11111111-1111-1111-1111-111111111111",
              before: { status: "Draft", chunk_count: 0 },
              after: { status: "Published", chunk_count: 3 },
              request_id: "req_audit_test_99",
              created_at: "2026-11-08T11:45:00Z",
            },
          ],
          total: 1,
          page: 1,
          page_size: 25,
        }),
    });

    renderRoute("/admin/audit", <AdminAuditLog />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /System Audit Log/i })).toBeInTheDocument();
      expect(screen.getByText(/Append-only \/ Immutable/i)).toBeInTheDocument();
      expect(screen.getByText("publish")).toBeInTheDocument();
    });

    // Verify there are no edit or delete controls anywhere in the table
    expect(screen.queryByRole("button", { name: /Edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete/i })).not.toBeInTheDocument();

    // Click View Diff
    const diffBtn = screen.getByRole("button", { name: /View Diff/i });
    fireEvent.click(diffBtn);

    await waitFor(() => {
      expect(screen.getByText("State Before")).toBeInTheDocument();
      expect(screen.getByText("State After")).toBeInTheDocument();
      expect(screen.getByText(/"chunk_count": 3/i)).toBeInTheDocument();
    });
  });
});
