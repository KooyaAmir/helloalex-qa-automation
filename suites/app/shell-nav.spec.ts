import { test, expect } from "@playwright/test";
import {
  SIDEBAR_PRIMARY,
  gotoAuthenticatedShell,
  mainRegion,
  sidebar,
  sidebarNav,
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
    const greeting = page.getByRole("heading", { name: /hi\s+/i }).first();
    const dashboard = sidebar(page).getByRole("button", {
      name: "Dashboard",
      exact: true,
    });
    await expect(greeting.or(dashboard).first()).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("button", { name: "Manage Credits", exact: true }),
    ).toBeVisible();
  });

  for (const label of SIDEBAR_PRIMARY) {
    test(`TC-APP-SHELL-02 sidebar opens: ${label}`, async ({ page }) => {
      await gotoAuthenticatedShell(page);
      const nav = sidebarNav(page, label);
      await expect(nav).toBeVisible({ timeout: 15_000 });
      await nav.click();

      const notFound = page.getByText(/client page not found/i);

      await expect
        .poll(async () => !(await notFound.isVisible().catch(() => false)), {
          timeout: 15_000,
        })
        .toBeTruthy();

      await expect(notFound).toBeHidden();
      await expect(mainRegion(page)).toBeVisible({ timeout: 15_000 });
      await expect(sidebar(page)).toBeVisible();
    });
  }
});
