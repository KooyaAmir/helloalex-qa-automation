import { test, expect } from "@playwright/test";
import { mainRegion, openSidebarSection } from "./shell-helpers";

/**
 * Campaigns + Contacts domain smokes — uses storageState from auth.setup.ts.
 * Spec: specs/app/domain-smokes.yaml (TC-APP-CAMP-01, TC-APP-CONTACTS-01)
 *
 * SAFETY (QA-POLICY-APP): Never launch a campaign that spends credits.
 * Never mass-delete contacts. List / empty-state asserts only.
 */

test.describe("app-campaigns-contacts-smoke", () => {
  test("TC-APP-CAMP-01 Campaigns list or empty state", async ({ page }) => {
    await openSidebarSection(page, "Campaigns");

    const main = mainRegion(page);
    const heading = main.getByRole("heading", { name: /campaigns?/i });
    const empty = main.getByText(
      /no\s+campaigns|create\s+(?:a\s+)?campaign|get\s+started.*campaign|no active campaigns/i,
    );
    const tableWithCampaign = main
      .locator("table, [role='table'], [role='grid']")
      .filter({ hasText: /campaign/i });

    await expect
      .poll(async () => {
        return (
          (await heading.first().isVisible().catch(() => false)) ||
          (await empty.first().isVisible().catch(() => false)) ||
          (await tableWithCampaign.first().isVisible().catch(() => false))
        );
      }, { timeout: 15_000 })
      .toBeTruthy();

    // SAFETY: do not click Launch / Start / Run campaign (spends credits).
  });

  test("TC-APP-CONTACTS-01 Contacts list or empty state", async ({ page }) => {
    await openSidebarSection(page, "Contacts");

    const main = mainRegion(page);
    const heading = main.getByRole("heading", { name: /contacts?/i });
    const empty = main.getByText(
      /no\s+contacts|add\s+(?:a\s+)?contact|import\s+contacts|get\s+started.*contact/i,
    );
    const tableWithContact = main
      .locator("table, [role='table'], [role='grid']")
      .filter({ hasText: /contact|name|phone|email/i });

    await expect
      .poll(async () => {
        return (
          (await heading.first().isVisible().catch(() => false)) ||
          (await empty.first().isVisible().catch(() => false)) ||
          (await tableWithContact.first().isVisible().catch(() => false))
        );
      }, { timeout: 15_000 })
      .toBeTruthy();

    // SAFETY: never click Delete All / bulk delete / mass delete.
  });
});
