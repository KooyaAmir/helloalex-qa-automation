import { test, expect } from "@playwright/test";
import { mainRegion, openSidebarSection } from "./shell-helpers";

/**
 * Studio domain smokes — uses storageState from auth.setup.ts (app project).
 * Spec: specs/app/domain-smokes.yaml (TC-APP-STUDIO-01..03)
 *
 * SAFETY (QA-POLICY-APP): Open Pathway / Character / Voices only.
 * Do NOT save or create pathways or characters.
 */

test.describe("app-studio", () => {
  test("TC-APP-STUDIO-01 Pathway section opens", async ({ page }) => {
    await openSidebarSection(page, "Pathway");

    const main = mainRegion(page);
    const pathwayLandmark = main
      .getByRole("heading", { name: /pathway studio/i })
      .or(main.getByPlaceholder(/search pathways/i))
      .or(main.getByText(/showing\s+\d+\s+of\s+\d+\s+pathways/i))
      .or(main.getByRole("button", { name: /create pathway/i }))
      .first();

    await expect(pathwayLandmark).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/pathways/i);
  });

  test("TC-APP-STUDIO-02 Character section opens", async ({ page }) => {
    await openSidebarSection(page, "Character");

    const main = mainRegion(page);
    const characterLandmark = main
      .getByRole("heading", { name: /^characters?$/i })
      .or(
        main.getByText(
          /reusable ai personas|no characters|create your first character/i,
        ),
      )
      .or(main.getByRole("button", { name: /new character/i }))
      .first();

    await expect(characterLandmark).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/character/i);
  });

  test("TC-APP-STUDIO-03 Voices section opens", async ({ page }) => {
    await openSidebarSection(page, "Voices");

    const main = mainRegion(page);
    const voicesLandmark = main
      .getByRole("heading", { name: /^voices$/i })
      .or(main.getByText(/showing\s+\d+\s+of\s+\d+\s+voices/i))
      .or(main.getByRole("button", { name: /curated library/i }))
      .or(main.getByRole("tab", { name: /curated library|my voices|favorites/i }))
      .or(main.getByPlaceholder(/search by name or description/i))
      .or(main.getByText(/no voices|empty/i))
      .first();

    await expect(voicesLandmark).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/voices/i);
  });
});
