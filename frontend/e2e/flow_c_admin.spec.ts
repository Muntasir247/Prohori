import { test, expect, type Page } from "@playwright/test";

const ADMIN_USER = {
  id: "adm-001",
  email: "admin@prohori.test",
  display_name: "Admin (demo)",
  role: "admin",
  language: "en",
  onboarding_completed: true,
};

const NORMAL_USER = {
  id: "usr-001",
  email: "user@prohori.test",
  display_name: "Rahim (demo user)",
  role: "user",
  language: "en",
  onboarding_completed: true,
};

async function installAdminRoutes(page: Page, user: typeof ADMIN_USER | typeof NORMAL_USER) {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path === "/api/v1/auth/session") return route.fulfill({ json: user });
    if (path === "/api/v1/notifications") {
      return route.fulfill({ json: { items: [], unread_count: 0, next_cursor: null } });
    }
    if (path === "/api/v1/admin/knowledge") {
      return route.fulfill({
        json: [
          {
            id: "kb-1",
            code: "PAT-001",
            title: "Fake bKash OTP Call",
            scam_type_id: 1,
            language: "bn",
            source_url: "https://www.bkash.com/en/help/contact-us",
            body: "Scammers impersonate wallet staff and ask for 6-digit OTP.",
            status: "published",
            chunk_count: 2,
            updated_at: "2026-11-17T00:00:00Z",
          },
        ],
      });
    }
    if (path === "/api/v1/admin/safe-actions") {
      return route.fulfill({
        json: [
          {
            id: "call_bkash_helpline",
            label_en: "Call the bKash helpline (16247)",
            label_bn: "বিকাশ হেল্পলাইনে কল করুন (১৬২৪৭)",
            body_en: "Official bKash helpline.",
            body_bn: "বিকাশের অফিসিয়াল হেল্পলাইন।",
            context: "both",
            min_level: "Low",
            provider: "bkash",
            phone: "16247",
            source_url: "https://www.bkash.com/en/help/contact-us",
            verified_at: "2025-11-08",
            is_active: true,
            needs_reverification: true,
          },
        ],
      });
    }
    if (path === "/api/v1/admin/quality") {
      return route.fulfill({
        json: {
          dataset_notice: "Measured on simulated data only (simulated-v1)",
          latest_eval: {
            id: 1,
            prompt_version_id: 1,
            dataset_version: "simulated-v1",
            item_count: 60,
            high_precision: 1.0,
            high_recall: 0.9667,
            genuine_high_rate: 0.0,
            unsafe_flags: 0,
            created_at: "2026-11-08T08:06:21Z",
          },
          eval_runs: [],
          prompts: [
            {
              id: 1,
              name: "p2_analysis",
              version: "v1",
              is_active: true,
              created_at: "2026-11-08T00:00:00Z",
            },
          ],
          route_mix: { message: 320, payment: 180 },
          token_metrics: {
            input_tokens: 120000,
            output_tokens: 24000,
            cache_read_tokens: 80000,
            cache_hit_rate: 0.667,
          },
        },
      });
    }
    if (path === "/api/v1/admin/users") {
      return route.fulfill({
        json: [
          {
            id: ADMIN_USER.id,
            email: ADMIN_USER.email,
            display_name: ADMIN_USER.display_name,
            role: "admin",
            is_active: true,
            last_active_at: "2026-11-17T08:00:00Z",
          },
        ],
      });
    }
    if (path === "/api/v1/admin/api-keys" && method === "GET") {
      return route.fulfill({
        json: [
          {
            id: "key-1",
            name: "Partner Sandbox Key",
            key_prefix: "prh_test_abc",
            scopes: ["checks:write", "cases:read"],
            rate_limit_per_min: 60,
            last_used_at: null,
            revoked_at: null,
            created_at: "2026-11-10T00:00:00Z",
          },
        ],
      });
    }
    if (path === "/api/v1/admin/audit") {
      return route.fulfill({
        json: {
          items: [
            {
              id: 101,
              actor_id: ADMIN_USER.id,
              actor_role: "admin",
              action: "kb.publish",
              entity_type: "kb_document",
              entity_id: "kb-1",
              before: { status: "draft" },
              after: { status: "published" },
              request_id: "req-audit-1",
              created_at: "2026-11-17T07:00:00Z",
            },
          ],
          total: 1,
          page: 1,
          page_size: 20,
        },
      });
    }
    return route.fulfill({ json: {} });
  });
}

test.describe("Flow C: Admin workbench & RBAC (S30-S36)", () => {
  test("Standard user attempting /admin receives S36 403 error page with helpline link", async ({
    page,
  }) => {
    await installAdminRoutes(page, NORMAL_USER);
    await page.goto("/admin/knowledge");
    await expect(page.getByTestId("error-page-403")).toBeVisible();
    await expect(page.getByTestId("error-go-home")).toHaveAttribute("href", "/");
    await expect(page.getByTestId("error-helpline-link")).toHaveAttribute("href", "/already-sent");
  });

  test("Admin accesses all S30-S35 management screens cleanly", async ({ page }) => {
    await installAdminRoutes(page, ADMIN_USER);

    await page.goto("/admin/knowledge");
    await expect(page.locator("body")).toContainText("PAT-001");

    await page.goto("/admin/safe-actions");
    await expect(page.locator("body")).toContainText("16247");

    await page.goto("/admin/quality");
    await expect(page.locator("body")).toContainText(/simulated/i);

    await page.goto("/admin/users");
    await expect(page.locator("body")).toContainText("admin@prohori.test");

    await page.goto("/admin/api-keys");
    await expect(page.locator("body")).toContainText("Partner Sandbox Key");

    await page.goto("/admin/audit");
    await expect(page.locator("body")).toContainText("kb.publish");
  });
});
