import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "360", width: 360, height: 800 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1440", width: 1440, height: 900 },
] as const;

const ROUTES = [
  "/",
  "/safety",
  "/check",
  "/check/message",
  "/check/payment",
  "/already-sent",
  "/notifications",
  "/does-not-exist-404",
] as const;

test.describe("Doc 02 §13: 4-viewport responsive layout verification (360-1440px)", () => {
  for (const vp of VIEWPORTS) {
    test(`Zero horizontal overflow across core routes at ${vp.name}px`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      await page.route("**/api/v1/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/api/v1/auth/session") return route.fulfill({ json: null });
        if (path === "/api/v1/samples") return route.fulfill({ json: [] });
        if (path === "/api/v1/tips/current") return route.fulfill({ status: 204, body: "" });
        if (path === "/api/v1/safe-actions") return route.fulfill({ json: [] });
        return route.fulfill({ json: {} });
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const routePath of ROUTES) {
        await page.goto(routePath, { waitUntil: "domcontentloaded" });
        await expect(page.locator("body")).toBeVisible();

        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(
          overflow.scrollWidth,
          `Horizontal overflow on ${routePath} at ${vp.name}px (${overflow.scrollWidth} > ${overflow.clientWidth})`
        ).toBeLessThanOrEqual(overflow.clientWidth + 1);
      }

      expect(pageErrors, `Uncaught page errors at ${vp.name}px`).toEqual([]);
    });
  }
});
