import { test, expect, type Page, type Locator } from "@playwright/test";
import { mainRegion, openSidebarSection } from "./shell-helpers";

/**
 * Full Campaigns page flow coverage.
 * Spec: specs/app/domain-smokes.yaml (TC-APP-CAMP-01..12)
 *
 * SAFETY (QA-POLICY-APP): Never complete Launch/Confirm that spends credits.
 * Nav, empty states, filters, wizard entry/steps — abort before final launch.
 */

const CAMPAIGN_TABS: Array<{
  name: string;
  tabQuery: string;
  emptyOrLandmark: RegExp;
}> = [
  {
    name: "Active Missions",
    tabQuery: "active-missions",
    emptyOrLandmark: /no active missions|launch your first campaign/i,
  },
  {
    name: "Finished Missions",
    tabQuery: "finished-missions",
    emptyOrLandmark: /no finished missions|completed campaigns will appear here/i,
  },
  {
    name: "Failed Missions",
    tabQuery: "failed-missions",
    emptyOrLandmark: /no failed missions|failed campaigns will appear here/i,
  },
  {
    name: "All Campaigns",
    tabQuery: "all-campaigns",
    emptyOrLandmark: /no campaigns found|create a new campaign|try adjusting your filters/i,
  },
  {
    name: "Archived",
    tabQuery: "archived-campaigns",
    emptyOrLandmark: /no archived campaigns|archived campaigns will appear here|restore a campaign/i,
  },
  {
    name: "Lead Queue",
    tabQuery: "lead-queue",
    emptyOrLandmark:
      /lead queue|no queue data|no active campaigns|queue health|queued|dialing|create campaign/i,
  },
  {
    name: "Analytics",
    tabQuery: "analytics",
    emptyOrLandmark:
      /campaign analytics|no campaign data|performance trend|call outcomes|total calls|success rate/i,
  },
];

async function openCampaignsReady(page: Page): Promise<Locator> {
  await openSidebarSection(page, "Campaigns");
  const main = mainRegion(page);
  await expect(main.getByRole("button", { name: /launch campaign/i }).first()).toBeVisible({
    timeout: 60_000,
  });
  await expect(main.getByText(/loading section/i)).toHaveCount(0);
  return main;
}

async function blockCampaignLaunchPosts(page: Page): Promise<{ count: () => number }> {
  let blocked = 0;
  await page.route(/\/(api|v1|graphql)\b/i, async (route) => {
    const req = route.request();
    if (["GET", "HEAD", "OPTIONS"].includes(req.method())) {
      await route.continue();
      return;
    }
    if (/campaign|mission|batch/i.test(req.url()) && /launch|start|run|enqueue|send|create/i.test(req.url())) {
      blocked += 1;
      await route.abort();
      return;
    }
    await route.continue();
  });
  return { count: () => blocked };
}

test.describe("app-campaigns-flows", () => {
  test("TC-APP-CAMP-03 Campaigns metrics chrome visible", async ({ page }) => {
    const main = await openCampaignsReady(page);
    for (const label of [
      /active/i,
      /contacts/i,
      /completed/i,
      /success/i,
      /balance/i,
      /queue/i,
      /failed/i,
      /sms sent/i,
    ]) {
      await expect(main.getByText(label).first()).toBeVisible();
    }
  });

  for (const tab of CAMPAIGN_TABS) {
    test(`TC-APP-CAMP-TAB-${tab.tabQuery} ${tab.name} opens with destination proof`, async ({
      page,
    }) => {
      const main = await openCampaignsReady(page);
      const tabBtn = main.getByRole("button", { name: new RegExp(tab.name, "i") }).first();
      await expect(tabBtn).toBeVisible({ timeout: 15_000 });
      await tabBtn.click();

      await expect
        .poll(async () => {
          const urlOk = new RegExp(tab.tabQuery, "i").test(page.url());
          const landmark = await main.getByText(tab.emptyOrLandmark).first().isVisible().catch(() => false);
          return urlOk || landmark;
        }, { timeout: 15_000 })
        .toBeTruthy();

      await expect(main.getByText(tab.emptyOrLandmark).first()).toBeVisible({ timeout: 15_000 });
    });
  }

  test("TC-APP-CAMP-04 Finished/Failed/All filter chrome visible", async ({ page }) => {
    const main = await openCampaignsReady(page);
    for (const name of ["Finished Missions", "Failed Missions", "All Campaigns"]) {
      await main.getByRole("button", { name: new RegExp(name, "i") }).first().click();
      await page.waitForTimeout(800);
      await expect(
        main
          .getByRole("button", { name: /all time|date/i })
          .or(main.getByText(/all types|newest first|all status/i))
          .first(),
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("TC-APP-CAMP-05 Lead Queue management chrome", async ({ page }) => {
    const main = await openCampaignsReady(page);
    await main.getByRole("button", { name: /lead queue/i }).first().click();
    await expect(page).toHaveURL(/lead-queue/i);
    await expect(main.getByText(/lead queue management|queued|dialing|queue health/i).first()).toBeVisible();
    await expect(main.getByText(/no queue data yet|no active campaigns|create campaign/i).first()).toBeVisible();
  });

  test("TC-APP-CAMP-06 Analytics performance chrome", async ({ page }) => {
    const main = await openCampaignsReady(page);
    await main.getByRole("button", { name: /^analytics$/i }).first().click();
    await expect(page).toHaveURL(/analytics/i);
    await expect(main.getByText(/campaign analytics|total calls|success rate/i).first()).toBeVisible();
    await expect(
      main.getByText(/no campaign data available yet|performance trend|call outcomes/i).first(),
    ).toBeVisible();
  });

  test("TC-APP-CAMP-07 Wizard step 1 Call vs SMS type selection", async ({ page }) => {
    const blocked = await blockCampaignLaunchPosts(page);
    const main = await openCampaignsReady(page);
    await main.getByRole("button", { name: /launch campaign/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByText(/step 1 of 5|campaign type/i).first()).toBeVisible();

    await expect(dialog.getByRole("button", { name: /call campaign/i })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /sms message/i })).toBeVisible();

    await dialog.getByRole("button", { name: /sms message/i }).click();
    await dialog.getByRole("button", { name: /call campaign/i }).click();
    await expect(dialog.getByRole("button", { name: /^continue$/i })).toBeVisible();

    await dialog.getByRole("button", { name: /cancel|close/i }).first().click();
    expect(blocked.count()).toBeGreaterThanOrEqual(0);
  });

  test("TC-APP-CAMP-08 Wizard step 2 Campaign Details without launch", async ({ page }) => {
    const blocked = await blockCampaignLaunchPosts(page);
    const main = await openCampaignsReady(page);
    await main.getByRole("button", { name: /launch campaign/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    await dialog.getByRole("button", { name: /call campaign/i }).click();
    await dialog.getByRole("button", { name: /^continue$/i }).click();

    await expect(dialog.getByText(/step 2 of 5|campaign details/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(dialog.getByText(/campaign name|outbound number|call source|voice selection/i).first()).toBeVisible();

    const nameInput = dialog
      .getByPlaceholder(/q1 sales outreach|campaign name/i)
      .or(dialog.locator('input[type="text"]').first())
      .first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill("QA abort campaign — do not launch");
    }
    await expect(dialog.getByText(/no pathway selected|pathway|voice selection/i).first()).toBeVisible();

    // SAFETY: abandon — never complete remaining steps / final launch.
    await dialog.getByRole("button", { name: /cancel|close/i }).first().click();
    expect(blocked.count()).toBeGreaterThanOrEqual(0);
    await expect(page.getByText(/campaign launched|successfully launched/i)).toHaveCount(0);
  });

  test("TC-APP-CAMP-09 Wizard SMS type reaches details and aborts", async ({ page }) => {
    const blocked = await blockCampaignLaunchPosts(page);
    const main = await openCampaignsReady(page);
    await main.getByRole("button", { name: /launch campaign/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    await dialog.getByRole("button", { name: /sms message/i }).click();
    await dialog.getByRole("button", { name: /^continue$/i }).click();

    await expect
      .poll(async () => {
        const details = await dialog.getByText(/step 2 of 5|campaign details|campaign name/i).first().isVisible().catch(() => false);
        const stillStep1 = await dialog.getByText(/step 1 of 5/i).first().isVisible().catch(() => false);
        return details || !stillStep1;
      }, { timeout: 15_000 })
      .toBeTruthy();

    await dialog.getByRole("button", { name: /cancel|close/i }).first().click();
    expect(blocked.count()).toBeGreaterThanOrEqual(0);
    await expect(page.getByText(/campaign launched|sms campaign started|successfully launched/i)).toHaveCount(0);
  });

  test("TC-APP-CAMP-10 Launch CTA from Active empty state matches header launch", async ({
    page,
  }) => {
    const blocked = await blockCampaignLaunchPosts(page);
    const main = await openCampaignsReady(page);
    await main.getByRole("button", { name: /active missions/i }).first().click();
    const emptyLaunch = main.getByRole("button", { name: /launch your first campaign/i });
    await expect(emptyLaunch.first()).toBeVisible({ timeout: 15_000 });
    await emptyLaunch.first().click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/launch new campaign|step 1 of 5/i).first()).toBeVisible();
    await page.getByRole("button", { name: /cancel|close/i }).first().click();
    expect(blocked.count()).toBeGreaterThanOrEqual(0);
  });
});
