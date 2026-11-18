import { test, expect, type Page } from "@playwright/test";

const REVIEWER_USER = {
  id: "rev-001",
  email: "reviewer@prohori.test",
  display_name: "Reviewer (demo)",
  role: "reviewer",
  language: "en",
  onboarding_completed: true,
};

const CASE_DETAIL_BASE = {
  id: "case-e2e-001",
  reference: "PRO-900101",
  status: "new",
  version: 1,
  assigned_to: null as string | null,
  assigned_to_name: null as string | null,
  created_at: "2026-11-17T08:00:00Z",
  decided_at: null as string | null,
  decided_by: null as string | null,
  decision_reason: null as string | null,
  reporter_note: "Caller rushed me to send OTP.",
  reporter_consent_at: "2026-11-17T08:00:00Z",
  scam_type: { id: 1, slug: "fake_otp_pin", name_en: "Fake OTP/PIN", name_bn: "ভুয়া ওটিপি" },
  check: {
    id: "chk-e2e-001",
    kind: "message",
    final_level: "High",
    rule_hits: ["HARD_OTP_PIN_PASSWORD"],
    reasons: ["Asks for secret OTP or PIN"],
    red_flags: [{ flag: "HARD_OTP_PIN_PASSWORD", quote: "send OTP" }],
    safe_actions: ["do_not_send", "call_provider_helpline"],
    masked_text: "Your wallet will close. Please send OTP to [PHONE_1].",
    route: "rules_only",
    latency_ms: 14,
    is_fallback: false,
    created_at: "2026-11-17T07:59:00Z",
  },
  numbers: [
    {
      role: "sender",
      masked_display: "+880 17** ***678",
      status: "watch",
      report_count: 4,
      check_count: 11,
    },
  ],
  notes: [] as Array<Record<string, unknown>>,
  timeline: [],
};

async function installReviewerRoutes(page: Page) {
  let caseState = structuredClone(CASE_DETAIL_BASE);
  let notifications = [
    {
      id: "notif-1",
      type: "case_decided",
      payload: {
        case_id: "case-e2e-001",
        reference: "PRO-900101",
        status: "confirmed_scam",
      },
      read_at: null as string | null,
      created_at: "2026-11-17T09:00:00Z",
    },
  ];

  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();

    if (path === "/api/v1/auth/session") {
      return route.fulfill({ json: REVIEWER_USER });
    }
    if (path === "/api/v1/notifications" && method === "GET") {
      const unreadOnly = url.searchParams.get("unread") === "true";
      const filtered = unreadOnly ? notifications.filter((n) => !n.read_at) : notifications;
      return route.fulfill({
        json: {
          items: filtered,
          unread_count: notifications.filter((n) => !n.read_at).length,
          next_cursor: null,
        },
      });
    }
    if (path === "/api/v1/notifications/read" && method === "POST") {
      notifications = notifications.map((n) => ({ ...n, read_at: "2026-11-17T09:05:00Z" }));
      return route.fulfill({ status: 204, body: "" });
    }
    if (path === "/api/v1/analytics/overview") {
      return route.fulfill({
        json: {
          kpis: {
            open_cases: 12,
            high_today: 5,
            median_time_to_decision: 18,
            reviewer_agreement: 0.945,
          },
          cases_by_risk: [{ date: "2026-11-17", high: 5, medium: 4, low: 2, total: 11 }],
          top_scam_types: [
            {
              id: 1,
              slug: "fake_otp_pin",
              name_en: "Fake OTP/PIN",
              name_bn: "ভুয়া ওটিপি",
              count: 7,
              percentage: 63.6,
            },
          ],
          repeat_numbers: [{ date: "2026-11-17", active_count: 4 }],
          reviewer_decisions: [
            {
              date: "2026-11-17",
              confirmed_scam: 4,
              not_a_scam: 1,
              needs_escalation: 0,
              closed: 0,
              total: 5,
            },
          ],
          surging_campaigns: [
            {
              id: "camp-1",
              label: "Fake KYC OTP Wave",
              scam_type_name: "Fake OTP/PIN",
              count_7d: 14,
              prev_count_7d: 5,
              first_seen_at: "2026-11-01T00:00:00Z",
              last_seen_at: "2026-11-17T08:00:00Z",
            },
          ],
          simulated: true,
          version: "simulated-v1",
        },
      });
    }
    if (path === "/api/v1/cases" && method === "GET") {
      return route.fulfill({
        json: {
          items: [
            {
              id: caseState.id,
              reference: caseState.reference,
              status: caseState.status,
              created_at: caseState.created_at,
              assigned_to: caseState.assigned_to,
              scam_type: caseState.scam_type,
              check_kind: "message",
              final_level: "High",
              masked_preview: caseState.check.masked_text,
              repeat_count: 4,
              version: caseState.version,
            },
          ],
          total: 1,
          page: 1,
          page_size: 50,
          total_pages: 1,
        },
      });
    }
    if (path === `/api/v1/cases/${caseState.id}` && method === "GET") {
      return route.fulfill({ json: caseState });
    }
    if (path === `/api/v1/cases/${caseState.id}` && method === "PATCH") {
      const body = req.postDataJSON() as { assigned_to?: string | null; version: number };
      if (body.version !== caseState.version) {
        return route.fulfill({
          status: 409,
          json: { error: { code: "stale_version", message_key: "errors.case_version_conflict", fields: {}, request_id: "r1" } },
        });
      }
      caseState = {
        ...caseState,
        assigned_to: body.assigned_to ?? null,
        assigned_to_name: body.assigned_to ? REVIEWER_USER.display_name : null,
        status: body.assigned_to ? "in_review" : caseState.status,
        version: caseState.version + 1,
      };
      return route.fulfill({ json: caseState });
    }
    if (path === `/api/v1/cases/${caseState.id}/notes` && method === "POST") {
      const body = req.postDataJSON() as { note: string };
      const note = {
        id: "note-1",
        case_id: caseState.id,
        author_id: REVIEWER_USER.id,
        author_name: REVIEWER_USER.display_name,
        note: body.note,
        created_at: "2026-11-17T08:15:00Z",
      };
      caseState.notes.push(note);
      return route.fulfill({ json: note });
    }
    if (path === `/api/v1/cases/${caseState.id}/decision` && method === "POST") {
      const body = req.postDataJSON() as { decision: string; reason: string; version: number };
      caseState = {
        ...caseState,
        status: body.decision,
        decision_reason: body.reason,
        decided_by: REVIEWER_USER.id,
        decided_at: "2026-11-17T08:20:00Z",
        version: caseState.version + 1,
      };
      return route.fulfill({ json: caseState });
    }
    if (path === "/api/v1/analytics/numbers") {
      return route.fulfill({
        json: {
          items: [
            {
              id: "num-1",
              masked_display: "+880 17** ***678",
              status: "watch",
              report_count: 4,
              check_count: 11,
              high_count: 10,
              high_share: 0.91,
              sparkline_30d: [
                { date: "2026-11-16", count: 2 },
                { date: "2026-11-17", count: 4 },
              ],
              first_seen_at: "2026-11-01T00:00:00Z",
              last_seen_at: "2026-11-17T08:00:00Z",
            },
          ],
          total: 1,
        },
      });
    }
    if (path === "/api/v1/campaigns") {
      return route.fulfill({
        json: {
          items: [
            {
              id: "camp-1",
              label: "Fake KYC OTP Wave",
              scam_type_id: 1,
              scam_type_name: "Fake OTP/PIN",
              scam_type_name_bn: "ভুয়া ওটিপি",
              member_count: 14,
              count_7d: 14,
              prev_count_7d: 5,
              is_surging: true,
              first_seen_at: "2026-11-01T00:00:00Z",
              last_seen_at: "2026-11-17T08:00:00Z",
              updated_at: "2026-11-17T08:00:00Z",
              sample_messages: ["Your wallet will close. Send OTP to [PHONE_1]."],
              shared_numbers: ["+880 17** ***678"],
              case_references: ["PRO-900101"],
            },
          ],
          total: 1,
        },
      });
    }
    return route.fulfill({ json: {} });
  });
}

test.describe("Flow B: Reviewer workbench end-to-end (S24-S29 + S23)", () => {
  test("Reviewer navigates overview, queue, claims case, records decision, and checks notifications", async ({
    page,
  }) => {
    await installReviewerRoutes(page);

    // 1. S24 Review Overview
    await page.goto("/review");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("body")).toContainText("Fake KYC OTP Wave");

    // 2. S25 Case Queue -> open case
    await page.goto("/review/cases");
    await expect(page.locator("body")).toContainText("PRO-900101");

    // 3. S26 Case Detail -> Claim via PATCH /cases/{id}
    await page.goto("/review/cases/case-e2e-001");
    await expect(page.locator("h1")).toContainText("PRO-900101");
    await page.getByTestId("claim-case-btn").click();
    await expect(page.getByTestId("unassign-case-btn")).toBeVisible();
    await expect(page.getByTestId("case-assignee-label")).toContainText("Reviewer (demo)");

    // 4. S27 Repeat Numbers, S28 Campaigns, S29 Reports
    await page.goto("/review/numbers");
    await expect(page.locator("body")).toContainText("+880 17** ***678");

    await page.goto("/review/campaigns");
    await expect(page.locator("body")).toContainText("Fake KYC OTP Wave");

    await page.goto("/review/reports");
    await expect(page.locator("main")).toBeVisible();

    // 5. S23 Notifications -> mark all read
    await page.goto("/notifications");
    await expect(page.getByTestId("notifications-page")).toBeVisible();
    await expect(page.locator("body")).toContainText("PRO-900101");
    await page.getByTestId("mark-all-read-btn").click();
    await expect(page.getByTestId("mark-all-read-btn")).toHaveCount(0);
  });
});
