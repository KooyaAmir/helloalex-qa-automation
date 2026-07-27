import { test, expect } from "@playwright/test";
import { mainRegion, openSidebarSection } from "./shell-helpers";

/**
 * Billing / Account read-only smokes — uses storageState from auth.setup.ts.
 * Spec: specs/app/domain-smokes.yaml (TC-APP-BILLING-01, TC-APP-BILLING-02)
 *
 * SAFETY (QA-POLICY-APP): Never complete payment, checkout, or card entry.
 * Open Manage Credits only far enough to prove credits UI; abort before charge.
 */

test.describe("app-billing-readonly", () => {
  test("TC-APP-BILLING-01 Billing balance chrome read-only", async ({
    page,
  }) => {
    await openSidebarSection(page, "Billing");

    const manageCredits = page.getByRole("button", {
      name: "Manage Credits",
      exact: true,
    });
    await expect(manageCredits.first()).toBeVisible({ timeout: 15_000 });

    // Independent balance signal — must NOT match Manage Credits / bare "Credits"
    const balanceChrome = mainRegion(page)
      .getByText(
        /\$\s*[\d,]+(?:\.\d{2})?|credits?\s+balance|available\s+credits|current\s+balance|your\s+balance|balance:\s*\$/i,
      )
      .or(page.getByTestId("client-sidebar-credit-balance"))
      .first();
    await expect(balanceChrome).toBeVisible({ timeout: 15_000 });
    await expect(balanceChrome).not.toHaveText(/^manage credits$/i);

    await expect(
      page.getByRole("button", {
        name: /complete purchase|pay now|confirm payment|submit payment/i,
      }),
    ).toHaveCount(0);
  });

  test("TC-APP-BILLING-02 Manage Credits opens without purchase", async ({
    page,
  }) => {
    await openSidebarSection(page, "Billing");

    const manageCredits = page
      .getByRole("button", { name: "Manage Credits", exact: true })
      .first();
    await expect(manageCredits).toBeVisible({ timeout: 15_000 });

    const dialogBefore = await page.getByRole("dialog").isVisible().catch(() => false);
    await manageCredits.click();

    const creditsDialog = page.getByRole("dialog");
    await expect
      .poll(async () => {
        if (await creditsDialog.isVisible().catch(() => false)) return true;
        // Non-dialog panel: pack/top-up copy that was not the sole Billing landing chrome
        const pack = page
          .getByText(/buy\s+credits|credit\s+pack|top\s*up|add\s+credits|purchase\s+credits/i)
          .first();
        return pack.isVisible().catch(() => false);
      }, { timeout: 15_000 })
      .toBeTruthy();

    if (await creditsDialog.isVisible().catch(() => false)) {
      expect(dialogBefore).toBeFalsy();
      await expect(
        creditsDialog
          .getByText(/buy\s+credits|credit\s+pack|top\s*up|\$\s*[\d,]+|credits/i)
          .first(),
      ).toBeVisible();
    }

    // SAFETY: never click Complete purchase / Pay now / card confirm.
  });
});
