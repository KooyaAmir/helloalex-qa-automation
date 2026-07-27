import { test, expect } from "@playwright/test";
import {
  gotoAuthenticatedShell,
  mainRegion,
  openSidebarSection,
} from "./shell-helpers";

/**
 * Dashboard depth smokes — uses storageState from auth.setup.ts.
 * Spec: specs/app/domain-smokes.yaml (TC-APP-DASH-01)
 *
 * SAFETY: Quick Start navigation only. Never complete Make Call / Launch campaign /
 * Request Number / pay flows from dashboard CTAs.
 */

test.describe("app-dashboard-smoke", () => {
  test("TC-APP-DASH-01 Quick Start chrome and Configure phone line nav", async ({
    page,
  }) => {
    await gotoAuthenticatedShell(page);

    const body = page.locator("body");
    await expect(body.getByText(/quick start/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(body.getByText(/configure phone line/i).first()).toBeVisible();
    await expect(body.getByText(/create ai pathway/i).first()).toBeVisible();

    // Navigate via checklist — lands on Phone Numbers; do not Request Number.
    await body.getByText(/configure phone line/i).first().click();

    await expect
      .poll(async () => {
        const onPhone = /phone-numbers/i.test(page.url());
        const heading = await mainRegion(page)
          .getByRole("heading", { name: /^phone numbers$/i })
          .first()
          .isVisible()
          .catch(() => false);
        return onPhone || heading;
      }, { timeout: 15_000 })
      .toBeTruthy();

    await expect(
      page.getByText(/number provisioned|number purchased|order complete/i),
    ).toHaveCount(0);
  });
});
