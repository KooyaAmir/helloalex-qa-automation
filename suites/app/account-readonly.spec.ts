import { test, expect } from "@playwright/test";
import { mainRegion, openSidebarSection } from "./shell-helpers";

/**
 * Account Settings read-only smoke — uses storageState from auth.setup.ts.
 * Spec: specs/app/domain-smokes.yaml (TC-APP-ACCOUNT-01)
 *
 * SAFETY (QA-POLICY-APP): Never persist profile changes (Save Changes).
 * Landmark / form chrome only.
 */

test.describe("app-account-readonly", () => {
  test("TC-APP-ACCOUNT-01 Account Settings profile chrome read-only", async ({
    page,
  }) => {
    await openSidebarSection(page, "Account Settings");
    const main = mainRegion(page);

    await expect(page).toHaveURL(/\/settings/i);

    const landmark = main
      .getByRole("heading", { name: /account command center|my profile|account|settings/i })
      .first();
    await expect(landmark).toBeVisible({ timeout: 15_000 });

    await expect(
      main
        .getByRole("textbox", { name: /first name/i })
        .or(main.getByPlaceholder(/first name/i))
        .first(),
    ).toBeVisible({ timeout: 15_000 });

    const save = main.getByRole("button", { name: /save changes/i });
    await expect(save.first()).toBeVisible();

    // SAFETY: Save Changes may exist — do not click.
    await expect(page.getByText(/profile saved|changes saved|successfully updated/i)).toHaveCount(0);
  });
});
