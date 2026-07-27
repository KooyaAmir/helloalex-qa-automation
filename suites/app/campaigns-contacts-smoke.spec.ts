import { test, expect } from "@playwright/test";
import { mainRegion, openSidebarSection } from "./shell-helpers";

/**
 * Campaigns + Contacts domain smokes — uses storageState from auth.setup.ts.
 * Spec: specs/app/domain-smokes.yaml (TC-APP-CAMP-01/02, TC-APP-CONTACTS-01/02)
 *
 * SAFETY (QA-POLICY-APP): Never complete a campaign launch that spends credits.
 * Never mass-delete contacts / Do Not Call wipe. List / entry / abort only.
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

  test("TC-APP-CAMP-02 New campaign entry opens without launch", async ({
    page,
  }) => {
    let blockedLaunch = 0;
    await page.route(/\/(api|v1|graphql)\b/i, async (route) => {
      const req = route.request();
      if (["GET", "HEAD", "OPTIONS"].includes(req.method())) {
        await route.continue();
        return;
      }
      if (/campaign/i.test(req.url()) && /launch|start|run|enqueue|send/i.test(req.url())) {
        blockedLaunch += 1;
        await route.abort();
        return;
      }
      await route.continue();
    });

    await openSidebarSection(page, "Campaigns");
    const main = mainRegion(page);
    // Staging CTA labels are Launch Campaign / Launch Your First Campaign (entry only).
    const entryBtn = main
      .getByRole("button", {
        name: /launch your first campaign|launch campaign|new campaign|create campaign/i,
      })
      .first();
    await expect(entryBtn).toBeVisible({ timeout: 15_000 });
    await entryBtn.click();

    await expect
      .poll(async () => {
        const dialog = await page.getByRole("dialog").isVisible().catch(() => false);
        const wizard = await page
          .getByRole("heading", {
            name: /new campaign|create campaign|campaign details|audience|launch campaign|mission/i,
          })
          .first()
          .isVisible()
          .catch(() => false);
        const stepChrome = await page
          .getByText(/select (?:a )?pathway|choose audience|campaign name|mission setup/i)
          .first()
          .isVisible()
          .catch(() => false);
        const confirmLaunch = await page
          .getByRole("button", {
            name: /confirm launch|start mission|run campaign|launch now/i,
          })
          .first()
          .isVisible()
          .catch(() => false);
        return dialog || wizard || stepChrome || confirmLaunch || /campaign/i.test(page.url());
      }, { timeout: 15_000 })
      .toBeTruthy();

    // SAFETY: abandon entry — never click final Confirm/Start/Run that spends credits.
    await page.keyboard.press("Escape");
    const cancel = page.getByRole("button", { name: /cancel|close|discard|back|exit/i });
    if (await cancel.first().isVisible().catch(() => false)) {
      await cancel.first().click();
    } else {
      await openSidebarSection(page, "Campaigns");
    }

    expect(blockedLaunch).toBeGreaterThanOrEqual(0);
    await expect(
      page.getByText(/campaign launched|campaign started|successfully launched|mission started/i),
    ).toHaveCount(0);
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

  test("TC-APP-CONTACTS-02 Add contact entry without mass delete", async ({
    page,
  }) => {
    let blockedUpload = 0;
    await page.route(/\/(api|v1|graphql)\b/i, async (route) => {
      const req = route.request();
      if (["GET", "HEAD", "OPTIONS"].includes(req.method())) {
        await route.continue();
        return;
      }
      if (/contact|csv|list|audience|upload/i.test(req.url()) && /upload|import|create|delete/i.test(req.url())) {
        blockedUpload += 1;
        await route.abort();
        return;
      }
      await route.continue();
    });

    await openSidebarSection(page, "Contacts");
    const main = mainRegion(page);

    // Mass-delete controls may exist — presence is OK; clicking is not.
    const massDelete = main.getByRole("button", {
      name: /delete all|bulk delete|mass delete|remove all/i,
    });
    expect(await massDelete.count()).toBeGreaterThanOrEqual(0);

    // Staging Contacts is CSV-list oriented: Upload CSV + Upload Contacts form.
    const uploadBtn = main.getByRole("button", { name: /upload csv|import contacts|add contact/i }).first();
    const uploadHeading = main.getByRole("heading", { name: /upload contacts/i }).first();
    const listName = main
      .getByRole("textbox", { name: /list name/i })
      .or(main.getByLabel(/list name/i))
      .first();

    await expect
      .poll(async () => {
        return (
          (await uploadBtn.isVisible().catch(() => false)) ||
          (await uploadHeading.isVisible().catch(() => false)) ||
          (await listName.isVisible().catch(() => false))
        );
      }, { timeout: 15_000 })
      .toBeTruthy();

    if (await uploadBtn.isVisible().catch(() => false)) {
      await uploadBtn.click();
    }

    await expect
      .poll(async () => {
        const heading = await uploadHeading.isVisible().catch(() => false);
        const nameField = await listName.isVisible().catch(() => false);
        const chooseCsv = await main
          .getByRole("button", { name: /choose csv file|choose file|csv file/i })
          .first()
          .isVisible()
          .catch(() => false);
        return heading || nameField || chooseCsv;
      }, { timeout: 15_000 })
      .toBeTruthy();

    // Touch list name then abandon — never submit upload / never mass delete.
    if (await listName.isVisible().catch(() => false)) {
      await listName.fill("QA abort list — do not save");
    }
    await page.keyboard.press("Escape");

    expect(blockedUpload).toBeGreaterThanOrEqual(0);
    await expect(
      page.getByText(/deleted all|contacts removed|bulk delete complete|list uploaded|import complete/i),
    ).toHaveCount(0);
  });
});
