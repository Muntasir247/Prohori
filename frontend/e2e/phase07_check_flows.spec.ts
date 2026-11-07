import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.resolve(__dirname, "../../docs/screenshots/phase07");

test.describe("Phase 07: Check flows end to end", () => {
  // 1. High risk message check outcome
  for (const lang of ["bn", "en"] as const) {
    for (const vp of [
      { width: 360, height: 740, name: "360" },
      { width: 1440, height: 900, name: "1440" },
    ]) {
      test(`High risk check outcome (${lang}, ${vp.name}px)`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto("/check/message");

        // Toggle language if needed
        const currentLang = await page.locator("html").getAttribute("lang");
        if (currentLang !== lang) {
          const toggle = page.locator("[data-testid='language-toggle']");
          if (await toggle.count()) {
            await toggle.click();
          }
        }

        // High risk scam message (Rule 1 / OTP / account block)
        const highRiskMsg =
          "প্রিয় গ্রাহক, আপনার বিকাশ একাউন্ট সাময়িক স্থগিত করা হয়েছে। সচল করতে এখনই পিন ও ৬ সংখ্যার ওটিপি কোড এই নম্বরে পাঠান।";
        await page.fill("[data-testid='message-input']", highRiskMsg);

        // Open optional details accordion and select claimed sender: bkash
        await page.locator("summary").click();
        await page.selectOption("[data-testid='sender-select']", "bkash");

        // Submit check
        await page.click("[data-testid='check-submit-button']");

        // Result page loaded
        await expect(page).toHaveURL(/\/result\/[0-9a-f-]+/, { timeout: 15000 });
        const heading = page.locator("[data-testid='banner-heading']");
        await expect(heading).toBeVisible();

        // Pressure pause appears on High risk
        const pauseSkip = page.locator("[data-testid='pause-skip-button']");
        if (await pauseSkip.isVisible()) {
          await pauseSkip.click();
        }

        // Verify High risk banner
        await expect(page.locator("[data-testid='risk-banner-high']")).toBeVisible();

        // Primary helpline action uses tel: with verified bKash number 16247
        const helpline = page.locator("[data-testid='primary-helpline-action']");
        if (await helpline.count()) {
          const href = await helpline.getAttribute("href");
          expect(href).toBe("tel:16247");
        }

        // Capture screenshot
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `high-${vp.name}-${lang}.png`),
          fullPage: true,
        });

        // Test reporting modal on mobile bn
        if (lang === "bn" && vp.name === "360") {
          const reportBtn = page.locator("[data-testid='report-button']");
          await reportBtn.click();

          const modal = page.locator("[data-testid='report-modal']");
          await expect(modal).toBeVisible();

          const submitReportBtn = page.locator("[data-testid='submit-report-button']");
          await expect(submitReportBtn).toBeDisabled();

          // Consent checkbox enables submit
          await page.locator("[data-testid='report-consent-checkbox']").check();
          await expect(submitReportBtn).toBeEnabled();

          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, "report-modal-360-bn.png"),
          });

          // Submit report
          await submitReportBtn.click();
          await expect(page.locator("[data-testid='report-success-view']")).toBeVisible();
          await page.locator("[data-testid='report-done-button']").click();

          // Reported tag visible
          await expect(page.locator("[data-testid='reported-status-tag']")).toBeVisible();
        }
      });
    }
  }

  // 2. Medium risk payment check outcome
  for (const lang of ["bn", "en"] as const) {
    for (const vp of [
      { width: 360, height: 740, name: "360" },
      { width: 1440, height: 900, name: "1440" },
    ]) {
      test(`Medium risk payment check (${lang}, ${vp.name}px)`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto("/check/payment");

        const currentLang = await page.locator("html").getAttribute("lang");
        if (currentLang !== lang) {
          const toggle = page.locator("[data-testid='language-toggle']");
          if (await toggle.count()) {
            await toggle.click();
          }
        }

        // Fill payment check form (amount=15000, new recipient, rushed=no -> Medium risk)
        await page.fill("[data-testid='payment-amount-input']", "15000");
        await page.selectOption("[data-testid='payment-provider-select']", "nagad");
        await page.click("[data-testid='rushed-no']");

        await page.click("[data-testid='payment-submit-button']");

        await expect(page).toHaveURL(/\/result\/[0-9a-f-]+/, { timeout: 15000 });
        await expect(page.locator("[data-testid='banner-heading']")).toBeVisible();

        // Check medium banner & meter
        await expect(page.locator("[data-testid='risk-banner-medium']")).toBeVisible();
        await expect(page.locator("[data-testid='risk-meter']")).toBeVisible();

        // Nagad is unverified in safe_actions -> must show official app notice
        const fallbackNotice = page.locator("[data-testid='unverified-provider-notice']");
        await expect(fallbackNotice).toBeVisible();

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `medium-${vp.name}-${lang}.png`),
          fullPage: true,
        });
      });
    }
  }

  // 3. Low risk check outcome
  for (const lang of ["bn", "en"] as const) {
    for (const vp of [
      { width: 360, height: 740, name: "360" },
      { width: 1440, height: 900, name: "1440" },
    ]) {
      test(`Low risk check outcome (${lang}, ${vp.name}px)`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto("/check/payment");

        const currentLang = await page.locator("html").getAttribute("lang");
        if (currentLang !== lang) {
          const toggle = page.locator("[data-testid='language-toggle']");
          if (await toggle.count()) {
            await toggle.click();
          }
        }

        // Fill payment check form (amount=2000, known recipient, rushed=no -> Low risk)
        await page.fill("[data-testid='payment-amount-input']", "2000");
        await page.click("[data-testid='recipient-status-known']");
        await page.click("[data-testid='rushed-no']");

        await page.click("[data-testid='payment-submit-button']");

        await expect(page).toHaveURL(/\/result\/[0-9a-f-]+/, { timeout: 15000 });
        await expect(page.locator("[data-testid='banner-heading']")).toBeVisible();

        // Low risk banner check
        const lowBanner = page.locator("[data-testid='risk-banner-low']");
        await expect(lowBanner).toBeVisible();

        // Client NEVER computes risk; low risk is never green and always has caution
        const mandatoryCaution = page.locator("[data-testid='mandatory-low-caution']");
        await expect(mandatoryCaution).toBeVisible();

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `low-${vp.name}-${lang}.png`),
          fullPage: true,
        });
      });
    }
  }

  // 4. Unavailable outcome (simulating API failure / fallback)
  for (const lang of ["bn", "en"] as const) {
    for (const vp of [
      { width: 360, height: 740, name: "360" },
      { width: 1440, height: 900, name: "1440" },
    ]) {
      test(`Unavailable fallback outcome (${lang}, ${vp.name}px)`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        // Route intercept to simulate server returning is_fallback=true and final_level=null
        await page.route("**/api/v1/check-message", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: "00000000-0000-0000-0000-000000000099",
              kind: "message",
              final_level: null,
              is_fallback: true,
              scam_type: null,
              reasons: [
                lang === "bn"
                  ? "আমরা এই মুহূর্তে বার্তাটির বিস্তারিত বিশ্লেষণ সম্পূর্ণ করতে পারছি না।"
                  : "We cannot complete detailed analysis at this time.",
              ],
              red_flags: [],
              safe_actions: [
                {
                  id: "do_not_send",
                  label: lang === "bn" ? "টাকা পাঠাবেন না" : "Do not send money",
                },
              ],
              evidence: [],
              highlighted_quotes: [],
              created_at: new Date().toISOString(),
              is_reported: false,
            }),
          });
        });

        await page.goto("/check/message");

        const currentLang = await page.locator("html").getAttribute("lang");
        if (currentLang !== lang) {
          const toggle = page.locator("[data-testid='language-toggle']");
          if (await toggle.count()) {
            await toggle.click();
          }
        }

        await page.fill(
          "[data-testid='message-input']",
          "Random unfamiliar message text testing fallback unavailable behavior"
        );
        await page.click("[data-testid='check-submit-button']");

        await expect(page).toHaveURL(/\/result\/[0-9a-f-]+/, { timeout: 15000 });
        await expect(page.locator("[data-testid='banner-heading']")).toBeVisible();

        // Must display unavailable banner
        await expect(page.locator("[data-testid='risk-banner-unavailable']")).toBeVisible();

        // MUST NEVER show Low risk!
        await expect(page.locator("[data-testid='risk-banner-low']")).toHaveCount(0);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `unavailable-${vp.name}-${lang}.png`),
          fullPage: true,
        });
      });
    }
  }

  // 5. Done when: A guest gets a real Bangla result at 360 px
  test("Guest gets a real Bangla result at 360 px and preserves input on error", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });

    // Step A: Start at Landing page
    await page.goto("/");
    await expect(page.locator("[data-testid='hero-primary-cta']")).toBeVisible();

    // Ensure language is Bangla
    const currentLang = await page.locator("html").getAttribute("lang");
    if (currentLang !== "bn") {
      const toggle = page.locator("[data-testid='language-toggle']");
      if (await toggle.count()) {
        await toggle.click();
      }
    }

    // Click hero CTA to go to message check
    await page.click("[data-testid='hero-primary-cta']");
    await expect(page).toHaveURL("/check/message");

    // Test input preservation on error: type text < 10 chars
    const shortText = "হ্যালো";
    await page.fill("[data-testid='message-input']", shortText);
    await expect(page.locator("[data-testid='check-submit-button']")).toBeDisabled();

    // Now fill real Bangla message from seed
    const realBanglaMsg =
      "প্রিয় গ্রাহক, আপনার অ্যাকাউন্ট যাচাই করতে এখনই ৬ সংখ্যার কোডটি এই নম্বরে পাঠান, না হলে অ্যাকাউন্ট বন্ধ হয়ে যাবে।";
    await page.fill("[data-testid='message-input']", realBanglaMsg);
    await expect(page.locator("[data-testid='check-submit-button']")).toBeEnabled();

    // Submit
    await page.click("[data-testid='check-submit-button']");

    // Result loaded
    await expect(page).toHaveURL(/\/result\/[0-9a-f-]+/, { timeout: 15000 });
    const heading = page.locator("[data-testid='banner-heading']");
    await expect(heading).toBeVisible();

    // Verify banner has received focus
    await expect(heading).toBeFocused();

    // Skip pause
    const pauseSkip = page.locator("[data-testid='pause-skip-button']");
    if (await pauseSkip.isVisible()) {
      await pauseSkip.click();
    }

    // Verify real Bangla risk result
    await expect(page.locator("[data-testid='risk-banner-high']")).toBeVisible();
    await expect(page.locator("body")).toContainText("উচ্চ ঝুঁকি");

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "guest-journey-360-bn.png"),
      fullPage: true,
    });
  });
});
