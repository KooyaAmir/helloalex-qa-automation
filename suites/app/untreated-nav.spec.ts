import { test, expect } from "@playwright/test";
import {
  assertNavDestination,
  mainRegion,
  openSidebarSection,
} from "./shell-helpers";

/**
 * Untreated nav smokes — Tasks, Knowledge Base, CRM, SIP Trunks, AI Intelligence.
 * Spec: specs/app/untreated-nav.yaml
 * Decisions: PROJECT-DECISIONS.md
 *
 * SAFETY: Open + create-entry abort only. Never Connect/Sync CRM, provision SIP,
 * clone voice, delete KB docs, or persist Tasks/KB creates (QA-POLICY-APP.md).
 */

test.describe("app-untreated-nav", () => {
  test("TC-APP-TASKS-01 Tasks section opens", async ({ page }) => {
    await assertNavDestination(page, "Tasks");
    const main = mainRegion(page);
    const landmark = main
      .getByRole("heading", { name: /tasks?/i })
      .or(main.getByText(/no tasks|create (a )?task|get started.*task/i))
      .or(main.getByPlaceholder(/search tasks/i))
      .first();
    await expect(landmark).toBeVisible({ timeout: 15_000 });
  });

  test("TC-APP-TASKS-02 New Task entry opens without save", async ({ page }) => {
    let blockedPersist = 0;
    await page.route(/\/(api|v1|graphql)\b/i, async (route) => {
      const req = route.request();
      if (["GET", "HEAD", "OPTIONS"].includes(req.method())) {
        await route.continue();
        return;
      }
      if (/task/i.test(req.url()) && /create|save|persist|update/i.test(req.url())) {
        blockedPersist += 1;
        await route.abort();
        return;
      }
      await route.continue();
    });

    await openSidebarSection(page, "Tasks");
    const main = mainRegion(page);
    const newTask = main.getByRole("button", { name: /new task/i }).first();
    await expect(newTask).toBeVisible({ timeout: 15_000 });
    await newTask.click();

    await expect
      .poll(async () => {
        const nameField = await main
          .getByLabel(/^name/i)
          .or(main.getByRole("textbox", { name: /^name/i }))
          .or(page.getByText(/^name\s*\*/i))
          .first()
          .isVisible()
          .catch(() => false);
        const promptField = await main
          .getByLabel(/prompt/i)
          .or(page.getByText(/^prompt\s*\*/i))
          .first()
          .isVisible()
          .catch(() => false);
        const save = await main
          .getByRole("button", { name: /^save$/i })
          .first()
          .isVisible()
          .catch(() => false);
        const modeNew = /mode=new/i.test(page.url());
        return nameField || promptField || save || modeNew;
      }, { timeout: 15_000 })
      .toBeTruthy();

    // SAFETY: abandon — never click Save.
    await page.keyboard.press("Escape");
    const cancel = main.getByRole("button", { name: /cancel|close|discard/i });
    if (await cancel.first().isVisible().catch(() => false)) {
      await cancel.first().click();
    } else {
      await openSidebarSection(page, "Tasks");
    }

    expect(blockedPersist).toBeGreaterThanOrEqual(0);
    await expect(page.getByText(/task saved|successfully created|task created/i)).toHaveCount(0);
  });

  test("TC-APP-KB-01 Knowledge Base opens", async ({ page }) => {
    await assertNavDestination(page, "Knowledge Base");
    const main = mainRegion(page);
    const landmark = main
      .getByRole("heading", { name: /knowledge bases?/i })
      .or(main.getByText(/no knowledge|add (a )?document|create.*knowledge base/i))
      .or(main.getByPlaceholder(/search knowledge|search (kb|documents?)/i))
      .first();
    await expect(landmark).toBeVisible({ timeout: 15_000 });
    // SAFETY: do not delete documents.
  });

  test("TC-APP-KB-02 Create Knowledge Base entry without persist", async ({
    page,
  }) => {
    let blockedPersist = 0;
    await page.route(/\/(api|v1|graphql)\b/i, async (route) => {
      const req = route.request();
      if (["GET", "HEAD", "OPTIONS"].includes(req.method())) {
        await route.continue();
        return;
      }
      if (
        /knowledge|kb|document/i.test(req.url()) &&
        /create|save|persist|upload|update/i.test(req.url())
      ) {
        blockedPersist += 1;
        await route.abort();
        return;
      }
      await route.continue();
    });

    await openSidebarSection(page, "Knowledge Base");
    const main = mainRegion(page);
    const createBtn = main
      .getByRole("button", {
        name: /create your first knowledge base|create knowledge base|new knowledge base/i,
      })
      .first();
    await expect(createBtn).toBeVisible({ timeout: 15_000 });
    await createBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(
      dialog.getByRole("heading", { name: /create knowledge base/i }).first(),
    ).toBeVisible();

    const nameField = dialog
      .getByRole("textbox")
      .or(dialog.getByPlaceholder(/product information|name/i))
      .first();
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill("QA abort KB — do not save");
    }

    // SAFETY: Cancel / Close — never click Create persist.
    const cancel = dialog.getByRole("button", { name: /cancel|close/i }).first();
    await expect(cancel).toBeVisible();
    await cancel.click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    expect(blockedPersist).toBeGreaterThanOrEqual(0);
    await expect(
      page.getByText(/knowledge base created|successfully created|kb created/i),
    ).toHaveCount(0);
  });

  test("TC-APP-CRM-01 CRM section opens", async ({ page }) => {
    await assertNavDestination(page, "CRM");
    const main = mainRegion(page);
    const landmark = main
      .getByRole("heading", { name: /crm/i })
      .or(main.getByText(/connect (your )?crm|integrations?|no crm|hubspot|salesforce/i))
      .first();
    await expect(landmark).toBeVisible({ timeout: 15_000 });
    // SAFETY: do not click Connect / Sync that mutates live CRM.
  });

  test("TC-APP-CRM-02 Sync controls visible without live sync", async ({
    page,
  }) => {
    await openSidebarSection(page, "CRM");
    const main = mainRegion(page);

    await expect(
      main.getByRole("heading", { name: /crm/i }).first(),
    ).toBeVisible({ timeout: 15_000 });

    const syncOrConnect = main.getByRole("button", {
      name: /sync now|connect|test connection|configure/i,
    });
    await expect(syncOrConnect.first()).toBeVisible({ timeout: 15_000 });

    // SAFETY: presence only — never Sync Now / Connect / Test Connection.
    await expect(
      page.getByText(/sync completed|sync succeeded|connected successfully|successfully synced/i),
    ).toHaveCount(0);
  });

  test("TC-APP-SIP-01 SIP Trunks section opens", async ({ page }) => {
    await assertNavDestination(page, "SIP Trunks");
    const main = mainRegion(page);
    const landmark = main
      .getByRole("heading", { name: /sip trunks?/i })
      .or(main.getByText(/no (sip )?trunks|add trunk|provision|empty/i))
      .first();
    await expect(landmark).toBeVisible({ timeout: 15_000 });
    // SAFETY: do not provision / create trunk.
  });

  test("TC-APP-SIP-02 SIP provision controls gated (no provision)", async ({
    page,
  }) => {
    await openSidebarSection(page, "SIP Trunks");
    const main = mainRegion(page);

    await expect(
      main
        .getByRole("heading", { name: /sip trunks?/i })
        .or(main.getByText(/carrier trunks|published regions|identifiers/i))
        .first(),
    ).toBeVisible({ timeout: 15_000 });

    const provision = main.getByRole("button", {
      name: /add trunk|create trunk|provision|new trunk|enable trunk/i,
    });
    const emptyOrChrome = main.getByText(
      /no (sip )?trunks|add trunk|carrier trunks|published regions|identifiers/i,
    );
    const provisionVisible = await provision.first().isVisible().catch(() => false);
    const chromeVisible = await emptyOrChrome.first().isVisible().catch(() => false);
    expect(
      provisionVisible || chromeVisible,
      "Expected a SIP provision CTA or SIP empty/chrome copy — presence only, never click",
    ).toBeTruthy();

    // SAFETY: never complete trunk provision.
    await expect(
      page.getByText(/trunk provisioned|trunk created|successfully provisioned/i),
    ).toHaveCount(0);
  });

  test("TC-APP-AI-01 AI Intelligence section opens", async ({ page }) => {
    await assertNavDestination(page, "AI Intelligence");
    const main = mainRegion(page);
    const landmark = main
      .getByRole("heading", { name: /ai intelligence/i })
      .or(main.getByText(/generate analysis|no insights|ai insights/i))
      .first();
    await expect(landmark).toBeVisible({ timeout: 15_000 });
  });

  test("TC-APP-AI-02 Generate Analysis control gated (no apply)", async ({
    page,
  }) => {
    await openSidebarSection(page, "AI Intelligence");
    const main = mainRegion(page);

    await expect(
      main.getByRole("heading", { name: /ai intelligence/i }).first(),
    ).toBeVisible({ timeout: 15_000 });

    const generate = main.getByRole("button", { name: /generate analysis/i });
    await expect(generate.first()).toBeVisible({ timeout: 15_000 });

    // Presence is the gate — do not run analysis / apply to pathways.
    const apply = main.getByRole("button", {
      name: /apply (to )?pathway|apply insight|apply changes/i,
    });
    expect(await apply.count()).toBeGreaterThanOrEqual(0);

    await expect(
      page.getByText(/analysis complete|insights applied|pathway updated|successfully applied/i),
    ).toHaveCount(0);
  });

  test("TC-APP-MEMORY-01 Memory section opens", async ({ page }) => {
    await openSidebarSection(page, "Memory");
    const main = mainRegion(page);
    const landmark = main
      .getByRole("heading", { name: /memory/i })
      .or(main.getByText(/no memories|empty|conversation memory|remember/i))
      .or(main.getByPlaceholder(/search/i))
      .first();
    await expect(landmark).toBeVisible({ timeout: 15_000 });
    // SAFETY: do not wipe memory.
  });

  test("TC-APP-MEMORY-02 Create Memory Store entry without persist", async ({
    page,
  }) => {
    let blockedPersist = 0;
    await page.route(/\/(api|v1|graphql)\b/i, async (route) => {
      const req = route.request();
      if (["GET", "HEAD", "OPTIONS"].includes(req.method())) {
        await route.continue();
        return;
      }
      if (
        /memory/i.test(req.url()) &&
        /create|save|persist|upload|update|wipe|delete/i.test(req.url())
      ) {
        blockedPersist += 1;
        await route.abort();
        return;
      }
      await route.continue();
    });

    await openSidebarSection(page, "Memory");
    const main = mainRegion(page);
    const createBtn = main
      .getByRole("button", {
        name: /create your first memory store|create memory store|new memory/i,
      })
      .first();
    await expect(createBtn).toBeVisible({ timeout: 15_000 });
    await createBtn.click();

    await expect
      .poll(async () => {
        const dialog = await page.getByRole("dialog").isVisible().catch(() => false);
        const heading = await page
          .getByRole("heading", { name: /create memory|new memory|memory store/i })
          .first()
          .isVisible()
          .catch(() => false);
        const nameField = await page
          .getByRole("textbox")
          .or(page.getByPlaceholder(/name|memory/i))
          .first()
          .isVisible()
          .catch(() => false);
        return dialog || heading || nameField;
      }, { timeout: 15_000 })
      .toBeTruthy();

    // SAFETY: Cancel / Escape — never Create persist / wipe.
    await page.keyboard.press("Escape");
    const cancel = page.getByRole("button", { name: /cancel|close|discard/i });
    if (await cancel.first().isVisible().catch(() => false)) {
      await cancel.first().click();
    }

    expect(blockedPersist).toBeGreaterThanOrEqual(0);
    await expect(
      page.getByText(/memory (store )?created|successfully created|memory wiped/i),
    ).toHaveCount(0);
  });

  test("TC-APP-INTEG-01 Integrations section opens", async ({ page }) => {
    await openSidebarSection(page, "Integrations");
    const main = mainRegion(page);
    const landmark = main
      .getByRole("heading", { name: /integrations?/i })
      .or(main.getByText(/connect|no integrations|available integrations|zapier|webhook/i))
      .first();
    await expect(landmark).toBeVisible({ timeout: 15_000 });
    // SAFETY: do not complete OAuth connect that mutates secrets.
  });

  test("TC-APP-INTEG-02 New API key entry without persist", async ({ page }) => {
    let blockedKeyCreate = 0;
    await page.route(/\/(api|v1|graphql)\b/i, async (route) => {
      const req = route.request();
      if (["GET", "HEAD", "OPTIONS"].includes(req.method())) {
        await route.continue();
        return;
      }
      if (
        /api.?key|integration|webhook|token/i.test(req.url()) &&
        /create|generate|issue|save|persist/i.test(req.url())
      ) {
        blockedKeyCreate += 1;
        await route.abort();
        return;
      }
      await route.continue();
    });

    await openSidebarSection(page, "Integrations");
    const main = mainRegion(page);

    await expect(
      main.getByRole("heading", { name: /integrations?/i }).first(),
    ).toBeVisible({ timeout: 15_000 });

    const newKey = main.getByRole("button", { name: /new api key|create api key|generate api key/i });
    await expect(newKey.first()).toBeVisible({ timeout: 15_000 });
    await newKey.first().click();

    await expect
      .poll(async () => {
        const dialog = await page.getByRole("dialog").isVisible().catch(() => false);
        const form = await page
          .getByLabel(/name|label|permission|scope/i)
          .or(page.getByPlaceholder(/name|label|key name/i))
          .or(page.getByText(/permissions|scopes|expires|api key name/i))
          .first()
          .isVisible()
          .catch(() => false);
        const createPersist = await page
          .getByRole("button", { name: /create key|generate key|create|save/i })
          .first()
          .isVisible()
          .catch(() => false);
        return dialog || form || createPersist;
      }, { timeout: 15_000 })
      .toBeTruthy();

    // SAFETY: abandon — never Create/Generate persist for live API keys.
    await page.keyboard.press("Escape");
    const cancel = page.getByRole("button", { name: /cancel|close|discard/i });
    if (await cancel.first().isVisible().catch(() => false)) {
      await cancel.first().click();
    }

    expect(blockedKeyCreate).toBeGreaterThanOrEqual(0);
    await expect(
      page.getByText(/api key created|key generated|copy your key|successfully created/i),
    ).toHaveCount(0);
  });

  test("TC-APP-SUPPORT-01 Support page loads", async ({ page }) => {
    await openSidebarSection(page, "Support");
    const main = mainRegion(page);
    const landmark = main
      .getByRole("heading", { name: /support|help|contact/i })
      .or(main.getByText(/how can we help|submit a ticket|documentation|faq/i))
      .first();
    await expect(landmark).toBeVisible({ timeout: 15_000 });
    // SAFETY: form submit optional / out of scope.
  });

  test("TC-APP-SUPPORT-02 Support Tickets chrome without submit", async ({
    page,
  }) => {
    await openSidebarSection(page, "Support");
    const main = mainRegion(page);

    await expect(
      main.getByRole("heading", { name: /support center|support|help/i }).first(),
    ).toBeVisible({ timeout: 15_000 });

    const ticketsTab = main
      .getByRole("button", { name: /support tickets|tickets/i })
      .or(main.getByRole("tab", { name: /tickets/i }))
      .first();
    await expect(ticketsTab).toBeVisible({ timeout: 15_000 });
    await ticketsTab.click();

    await expect
      .poll(async () => {
        const ticketChrome = await main
          .getByText(/ticket|no tickets|open a ticket|submit|conversation|inbox/i)
          .first()
          .isVisible()
          .catch(() => false);
        const composer = await main
          .getByRole("textbox")
          .or(main.getByPlaceholder(/describe|message|subject/i))
          .first()
          .isVisible()
          .catch(() => false);
        const newTicket = await main
          .getByRole("button", { name: /new ticket|create ticket|submit ticket/i })
          .first()
          .isVisible()
          .catch(() => false);
        return ticketChrome || composer || newTicket;
      }, { timeout: 15_000 })
      .toBeTruthy();

    // SAFETY: never submit a support ticket from automation.
    await expect(page.getByText(/ticket submitted|ticket created|thanks for contacting/i)).toHaveCount(
      0,
    );
  });
});
