import { test, expect } from "@playwright/test";
import { isStagingHost, STAGING_HTTP_GAPS, stagingSkipReason } from "../utils/staging";

test.describe("navigation-links", () => {
  test("TC-H4 footer Features and How It Works work from /about", async ({ page }) => {
    await page.goto("/about", { waitUntil: "domcontentloaded" });

    const features = page.locator("footer a", { hasText: /^Features$/i }).first();
    const how = page.locator("footer a", { hasText: /How It Works/i }).first();

    const hasFooter = (await features.isVisible().catch(() => false)) && (await how.isVisible().catch(() => false));
    if (!hasFooter && isStagingHost()) {
      test.skip(true, stagingSkipReason("About footer Features / How It Works links"));
    }

    await expect(features).toBeVisible();
    await expect(how).toBeVisible();

    const featuresHref = ((await features.getAttribute("href")) || "").trim();
    const howHref = ((await how.getAttribute("href")) || "").trim();

    expect(featuresHref, `Features href="${featuresHref}"`).toMatch(/\/#features(?:$|\?)/i);
    expect(howHref, `How It Works href="${howHref}"`).toMatch(/\/#how-it-works(?:$|\?)/i);
  });

  test("TC-M5 homepage and pricing primary nav share Affiliates or document intentional split", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const homeLinks = await page.locator("header a, nav a").allTextContents();
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    const pricingLinks = await page.locator("header a, nav a").allTextContents();

    const norm = (arr: string[]) =>
      arr.map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
    const home = new Set(norm(homeLinks));
    const pricing = new Set(norm(pricingLinks));

    const homeHasAffiliates = [...home].some((t) => /affiliates?/i.test(t));
    const pricingHasAffiliates = [...pricing].some((t) => /affiliates?/i.test(t));

    // On staging, Affiliates may be absent entirely — treat as intentional if both lack it
    if (!homeHasAffiliates && !pricingHasAffiliates && isStagingHost()) {
      return;
    }

    expect(
      homeHasAffiliates === pricingHasAffiliates,
      `Nav drift: home Affiliates=${homeHasAffiliates}, pricing Affiliates=${pricingHasAffiliates}`,
    ).toBeTruthy();
  });

  for (const path of ["/about", "/careers", "/investors", "/affiliate", "/11labs-eleven-labs"]) {
    test(`HTTP OK ${path}`, async ({ page }) => {
      if (isStagingHost() && path in STAGING_HTTP_GAPS) {
        test.skip(true, stagingSkipReason(`${path} is a known staging HTTP gap (${STAGING_HTTP_GAPS[path]})`));
      }
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      const status = res?.status() ?? 0;
      expect(status === 0 || status < 400, `Unexpected status ${status} for ${path}`).toBeTruthy();
      await expect(page.locator("body")).toBeVisible();
    });
  }
});
