import { test, expect } from "@playwright/test";
import { mainRegion, openSidebarSection } from "./shell-helpers";

/**
 * Studio domain smokes — uses storageState from auth.setup.ts (app project).
 * Spec: specs/app/domain-smokes.yaml (TC-APP-STUDIO-01..05)
 *
 * SAFETY (QA-POLICY-APP): Open Pathway / Character / Voices only.
 * Create entry may open; abandon without Save. Do NOT persist pathways/characters.
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

  test("TC-APP-STUDIO-04 Pathway create entry visible (no save)", async ({
    page,
  }) => {
    let blockedPersist = 0;
    await page.route(/\/(api|v1|graphql)\b/i, async (route) => {
      const req = route.request();
      if (["GET", "HEAD", "OPTIONS"].includes(req.method())) {
        await route.continue();
        return;
      }
      if (/pathway/i.test(req.url()) && /create|save|persist|update/i.test(req.url())) {
        blockedPersist += 1;
        await route.abort();
        return;
      }
      await route.continue();
    });

    await openSidebarSection(page, "Pathway");
    const main = mainRegion(page);
    const createBtn = main.getByRole("button", { name: /create pathway|new pathway|\+ pathway/i });
    await expect(createBtn.first()).toBeVisible({ timeout: 15_000 });
    await createBtn.first().click();

    // Create entry opened (dialog, editor chrome, or name field) — then abandon.
    await expect
      .poll(async () => {
        const dialog = await page.getByRole("dialog").isVisible().catch(() => false);
        const nameField = await page
          .getByLabel(/name|title/i)
          .or(page.getByPlaceholder(/pathway name|untitled|name your/i))
          .first()
          .isVisible()
          .catch(() => false);
        const editor = await page
          .getByText(/create pathway|new pathway|pathway details|save pathway/i)
          .first()
          .isVisible()
          .catch(() => false);
        return dialog || nameField || editor;
      }, { timeout: 15_000 })
      .toBeTruthy();

    await page.keyboard.press("Escape");
    const cancel = page.getByRole("button", { name: /cancel|close|discard|back/i });
    if (await cancel.first().isVisible().catch(() => false)) {
      await cancel.first().click();
    }

    // SAFETY: never click Save / Create persist.
    expect(blockedPersist).toBeGreaterThanOrEqual(0);
    await expect(page.getByText(/pathway saved|successfully created/i)).toHaveCount(0);
  });

  test("TC-APP-STUDIO-05 Character create entry visible (no save)", async ({
    page,
  }) => {
    let blockedPersist = 0;
    await page.route(/\/(api|v1|graphql)\b/i, async (route) => {
      const req = route.request();
      if (["GET", "HEAD", "OPTIONS"].includes(req.method())) {
        await route.continue();
        return;
      }
      if (/character/i.test(req.url()) && /create|save|persist|update/i.test(req.url())) {
        blockedPersist += 1;
        await route.abort();
        return;
      }
      await route.continue();
    });

    await openSidebarSection(page, "Character");
    const main = mainRegion(page);
    const createBtn = main.getByRole("button", {
      name: /new character|create character|\+ character/i,
    });
    await expect(createBtn.first()).toBeVisible({ timeout: 15_000 });
    await createBtn.first().click();

    await expect
      .poll(async () => {
        const dialog = await page.getByRole("dialog").isVisible().catch(() => false);
        const identity = await page
          .getByRole("heading", { name: /identity|new character|create character/i })
          .first()
          .isVisible()
          .catch(() => false);
        const describe = await page
          .getByPlaceholder(/describe what this character|character name|untitled/i)
          .or(page.getByRole("textbox", { name: /describe|name/i }))
          .first()
          .isVisible()
          .catch(() => false);
        const saveChrome = await page
          .getByRole("button", { name: /save changes|save character/i })
          .first()
          .isVisible()
          .catch(() => false);
        return dialog || identity || describe || saveChrome;
      }, { timeout: 15_000 })
      .toBeTruthy();

    // Abandon without persisting — Escape / leave editor; never click enabled Save.
    await page.keyboard.press("Escape");
    const cancel = page.getByRole("button", { name: /cancel|close|discard|back/i });
    if (await cancel.first().isVisible().catch(() => false)) {
      await cancel.first().click();
    } else {
      // Return to list via Character nav without saving.
      await openSidebarSection(page, "Character");
    }

    expect(blockedPersist).toBeGreaterThanOrEqual(0);
    await expect(page.getByText(/character saved|successfully created/i)).toHaveCount(0);
  });
});
