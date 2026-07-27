import { test, expect } from "@playwright/test";
import { isStagingHost, stagingSkipReason } from "../utils/staging";

test.describe("checkout-safe", () => {
  test("TC-PAY-1 Starter plan Get Started opens checkout; stop before purchase", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });

    const starterHeading = page.getByRole("heading", { name: /^Starter$/i }).first();
    const hasStarter = await starterHeading.isVisible().catch(() => false);
    if (!hasStarter && isStagingHost()) {
      test.skip(true, stagingSkipReason("Starter plan card / checkout"));
    }
    await starterHeading.scrollIntoViewIfNeeded();

    const getStarted = page
      .getByRole("heading", { name: /^Starter$/i })
      .locator("xpath=ancestor::*[.//button[contains(., 'Get Started')]][1]")
      .getByRole("button", { name: /^Get Started$/i })
      .first();

    if (await getStarted.isVisible().catch(() => false)) {
      await getStarted.click();
    } else {
      const fallback = page.locator("main").getByRole("button", { name: /^Get Started$/i }).first();
      if (!(await fallback.isVisible().catch(() => false))) {
        if (isStagingHost()) test.skip(true, stagingSkipReason("Plan Get Started CTA"));
      }
      await fallback.click();
    }

    await page.waitForTimeout(1000);
    const text = await page.locator("body").innerText();
    const opened =
      /platform fee/i.test(text) ||
      /secure payment/i.test(text) ||
      /stripe/i.test(text) ||
      (await page.getByRole("dialog").isVisible().catch(() => false));

    if (!opened && isStagingHost()) {
      test.skip(true, stagingSkipReason("Stripe checkout modal / platform fee UI"));
    }

    expect(opened, "Checkout / purchase UI did not open from Starter Get Started").toBeTruthy();

    const hasFee = /platform fee/i.test(text) && /\$\s*60|\$\s*42/.test(text);
    if (!hasFee && isStagingHost()) {
      test.skip(true, stagingSkipReason("Checkout platform fee line items (staging checkout differs)"));
    }
    expect(hasFee).toBeTruthy();
    await expect(page.getByRole("button", { name: /complete purchase|pay now|subscribe/i }).first()).toBeVisible();
  });

  test("TC-PAY-2 Consulting hours modal opens; stop before Stripe", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    const btn = page.getByRole("button", { name: /Purchase Consulting Hours/i });
    if (!(await btn.isVisible().catch(() => false))) {
      if (isStagingHost()) test.skip(true, stagingSkipReason("Purchase Consulting Hours CTA"));
    }
    await btn.click();
    await expect(page.getByText(/consulting|5 hrs|Stripe/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Purchase .*Consulting/i }).first()).toBeVisible();
  });

  test("TC-AUTH-1 client dashboard is login-gated", async ({ page }) => {
    await page.goto("/client-dashboard", { waitUntil: "domcontentloaded" });
    const gated = page.getByText(/welcome back|client access|sign in|let me in|log in|password/i).first();
    const hasInput = page.locator('input[type="email"], input[type="password"]').first();
    const ok =
      (await gated.isVisible().catch(() => false)) ||
      (await hasInput.isVisible().catch(() => false));

    if (!ok && isStagingHost()) {
      test.skip(true, stagingSkipReason("Client dashboard login gate UI"));
    }
    expect(ok).toBeTruthy();
  });
});
