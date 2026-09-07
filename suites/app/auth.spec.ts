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
    await expect(
      page.getByRole("button", { name: "Manage Credits", exact: true }),
    ).toBeVisible();
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
    await expect(
      page.getByRole("complementary").getByRole("button", { name: "Dashboard", exact: true }),
    ).toHaveCount(0);
  });

  test("TC-APP-AUTH-04 empty credentials blocked on login", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const email = page.getByRole("textbox", { name: /email/i });
    const password = page.getByRole("textbox", { name: /password/i });
    await email.fill("");
    await password.fill("");

    const submit = page.getByRole("button", { name: /let me in/i });
    const disabled = await submit.isDisabled().catch(() => false);
    if (!disabled) {
      await submit.click();
    }

    await expect(page).toHaveURL(/\/login/i);
    await expect(
      page.getByRole("complementary").getByRole("button", { name: "Dashboard", exact: true }),
    ).toHaveCount(0);

    const invalidEmail = await email.evaluate(
      (el) => (el as HTMLInputElement).validity?.valid === false,
    ).catch(() => false);
    const invalidPassword = await password.evaluate(
      (el) => (el as HTMLInputElement).validity?.valid === false,
    ).catch(() => false);
    const alertOrToast = await page
      .getByRole("alert")
      .or(page.getByText(/required|enter.*(email|password)|email.*required|password.*required/i))
      .first()
      .isVisible()
      .catch(() => false);
    expect(
      disabled || invalidEmail || invalidPassword || alertOrToast,
      "Expected disabled submit, HTML5 validation, or alert/toast — staying on /login alone is not enough",
    ).toBeTruthy();
  });

  test("TC-APP-AUTH-05 session required for /", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect
      .poll(async () => {
        if (page.url().includes("/login")) return true;
        if (
          await page
            .getByRole("heading", { name: /welcome back/i })
            .isVisible()
            .catch(() => false)
        ) {
          return true;
        }
        if (
          await page
            .getByText(/unable to verify your session|sign in|log in to continue/i)
            .first()
            .isVisible()
            .catch(() => false)
        ) {
          return true;
        }
        return false;
      }, { timeout: 45_000 })
      .toBeTruthy();

    // Must not land on authenticated shell with cleared storage.
    await expect(
      page.getByRole("complementary").getByRole("button", { name: "Dashboard", exact: true }),
    ).toHaveCount(0);
  });

  test("TC-APP-AUTH-06 invalid email format stays on login", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const email = page.getByRole("textbox", { name: /email/i });
    const password = page.getByRole("textbox", { name: /password/i });
    await email.fill("not-an-email");
    await password.fill("somepassword123");

    const submit = page.getByRole("button", { name: /let me in/i });
    const disabled = await submit.isDisabled().catch(() => false);
    if (!disabled) {
      await submit.click();
    }

    await expect(page).toHaveURL(/\/login/i, { timeout: 12_000 });

    const htmlInvalid = await email.evaluate(
      (el) => (el as HTMLInputElement).validity?.typeMismatch === true
        || (el as HTMLInputElement).validity?.valid === false,
    ).catch(() => false);
    const alertOrToast = await page
      .getByRole("alert")
      .or(page.getByText(/invalid email|enter a valid email|email.*invalid/i))
      .first()
      .isVisible()
      .catch(() => false);

    expect(
      disabled || htmlInvalid || alertOrToast,
      "Expected disabled submit, HTML5/type mismatch, or alert/toast — staying on /login alone is not enough",
    ).toBeTruthy();
  });
});
