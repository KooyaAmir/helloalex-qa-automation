import { test, expect } from "@playwright/test";
import { isStagingHost, stagingSkipReason } from "../utils/staging";

test.describe("affiliate-auth", () => {
  test("TC-M2 Forgot password is not a no-op", async ({ page }) => {
    if (isStagingHost()) {
      test.skip(true, stagingSkipReason("Affiliate login / forgot password"));
    }

    await page.goto("/affiliate/login", { waitUntil: "domcontentloaded" });
    const forgot = page.getByRole("link", { name: /forgot password/i }).first();
    await expect(forgot).toBeVisible();

    const href = (await forgot.getAttribute("href")) || "";
    expect.soft(href, `Forgot password href="${href}"`).not.toMatch(/#$|^$/);

    const urlBefore = page.url();
    await forgot.click();
    await page.waitForTimeout(800);
    const urlAfter = page.url();

    const dialog = page.getByRole("dialog").or(page.getByText(/reset|recover|email sent/i)).first();
    const navigated = urlAfter !== urlBefore && !urlAfter.endsWith("#");
    const openedUi = await dialog.isVisible().catch(() => false);

    expect(
      navigated || openedUi || (/reset|forgot|recover/i.test(href) && !href.endsWith("#")),
      "Forgot password did not navigate, open a reset UI, or point to a real reset URL",
    ).toBeTruthy();
  });
});
