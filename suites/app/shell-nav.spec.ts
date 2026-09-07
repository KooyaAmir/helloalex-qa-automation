import { test, expect } from "@playwright/test";
import {
  SIDEBAR_PRIMARY,
  gotoAuthenticatedShell,
  openSidebarSection,
  sidebar,
} from "./shell-helpers";

/**
 * Authenticated shell smoke — uses storageState from auth.setup.ts.
 * Spec: specs/app/auth-shell.yaml
 * Reviewer R1/R2: no body tautology; wait for settle; assert main region + nav sidebar.
 *
 * SAFETY (QA-POLICY-APP): Sidebar open only. Do not click Send/Submit on
 * Send Call, Send SMS, Phone Numbers purchase, Billing/checkout, or any
 * control that places calls, sends SMS, buys numbers, or charges a card.
 */

test.describe("app-shell", () => {
  test("TC-APP-SHELL-01 dashboard greeting and balance chrome", async ({
    page,
  }) => {
    await gotoAuthenticatedShell(page);
    await expect(
      sidebar(page).getByRole("button", { name: "Dashboard", exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /hi\s+/i }).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByRole("button", { name: "Manage Credits", exact: true }),
    ).toBeVisible();
  });

  for (const label of SIDEBAR_PRIMARY) {
    test(`TC-APP-SHELL-02 sidebar opens: ${label}`, async ({ page }) => {
      await openSidebarSection(page, label);
    });
  }
});
