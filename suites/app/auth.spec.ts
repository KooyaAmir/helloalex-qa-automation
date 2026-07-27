import { test, expect } from "@playwright/test";
import { loginAsAppUser } from "../../utils/app-auth";

/**
 * Auth flows that must not reuse shared storageState.
 * Spec: specs/app/auth-shell.yaml
 */
test.describe("app-auth", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("TC-APP-AUTH-01 valid credentials reach dashboard", async ({ page }) => {
    await loginAsAppUser(page);
    await expect(page).not.toHaveURL(/\/login/i);
    await expect(
      page.getByRole("complementary").getByRole("button", { name: "Dashboard", exact: true }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("TC-APP-AUTH-02 invalid password stays on login", async ({ page }) => {
    const email = (process.env.QA_APP_EMAIL || "").trim();
    test.skip(!email, "QA_APP_EMAIL required");

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByRole("textbox", { name: /email/i }).fill(email);
    await page.getByRole("textbox", { name: /password/i }).fill("definitely-wrong-password-zzz");
    await page.getByRole("button", { name: /let me in/i }).click();

    await expect
      .poll(async () => {
        const stillLogin = page.url().includes("/login");
        const errVisible = await page
          .getByText(
            /invalid (email|password)|incorrect password|wrong password|authentication failed|login failed/i,
          )
          .first()
          .isVisible()
          .catch(() => false);
        return stillLogin || errVisible;
      }, { timeout: 12_000 })
      .toBeTruthy();
  });

  test("TC-APP-AUTH-03 sign out returns to login", async ({ page }) => {
    await loginAsAppUser(page);
    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForURL(/\/login/i, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });
});
