import { test } from "@playwright/test";
import {
  SIDEBAR_PRIMARY,
  SIDEBAR_SECONDARY,
  assertNavDestination,
} from "./shell-helpers";

/**
 * Spec: TC-APP-SHELL-04 / TC-APP-SHELL-05 — nav open proves destination.
 * Stronger than SHELL-02 (no body/404-only soft pass).
 *
 * SAFETY (QA-POLICY-APP): Sidebar open only. Do not click Send/Place Call,
 * Send SMS, Buy number, Pay/Checkout, or any side-effect control.
 */

test.describe("app-shell-destination", () => {
  for (const label of SIDEBAR_PRIMARY) {
    test(`TC-APP-SHELL-04 destination: ${label}`, async ({ page }) => {
      await assertNavDestination(page, label);
    });
  }

  for (const label of SIDEBAR_SECONDARY) {
    test(`TC-APP-SHELL-05 secondary destination: ${label}`, async ({
      page,
    }) => {
      await assertNavDestination(page, label);
    });
  }
});
