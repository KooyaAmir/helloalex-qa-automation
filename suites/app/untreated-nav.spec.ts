import { test, expect } from "@playwright/test";
import { mainRegion, openSidebarSection } from "./shell-helpers";

/**
 * Untreated nav smokes — Tasks, Knowledge Base, CRM, SIP Trunks, AI Intelligence.
 * Spec: specs/app/untreated-nav.yaml
 * Decisions: PROJECT-DECISIONS.md
 *
 * SAFETY: Open only. Never Connect/Sync CRM, provision SIP, clone voice,
 * delete KB docs, or other denylisted side effects (QA-POLICY-APP.md).
 */

test.describe("app-untreated-nav", () => {
  test("TC-APP-TASKS-01 Tasks section opens", async ({ page }) => {
    await openSidebarSection(page, "Tasks");
    const main = mainRegion(page);
    const landmark = main
      .getByRole("heading", { name: /tasks?/i })
      .or(main.getByText(/no tasks|create (a )?task|get started.*task/i))
      .or(main.getByPlaceholder(/search tasks/i))
      .first();
    await expect(landmark).toBeVisible({ timeout: 15_000 });
  });

  test("TC-APP-KB-01 Knowledge Base opens", async ({ page }) => {
    await openSidebarSection(page, "Knowledge Base");
    const main = mainRegion(page);
    const landmark = main
      .getByRole("heading", { name: /knowledge bases?/i })
      .or(main.getByText(/no knowledge|add (a )?document|upload|empty/i))
      .or(main.getByPlaceholder(/search/i))
      .first();
    await expect(landmark).toBeVisible({ timeout: 15_000 });
    // SAFETY: do not delete documents.
  });

  test("TC-APP-CRM-01 CRM section opens", async ({ page }) => {
    await openSidebarSection(page, "CRM");
    const main = mainRegion(page);
    const landmark = main
      .getByRole("heading", { name: /crm/i })
      .or(main.getByText(/connect (your )?crm|integrations?|no crm|hubspot|salesforce/i))
      .first();
    await expect(landmark).toBeVisible({ timeout: 15_000 });
    // SAFETY: do not click Connect / Sync that mutates live CRM.
  });

  test("TC-APP-SIP-01 SIP Trunks section opens", async ({ page }) => {
    await openSidebarSection(page, "SIP Trunks");
    const main = mainRegion(page);
    const landmark = main
      .getByRole("heading", { name: /sip trunks?/i })
      .or(main.getByText(/no (sip )?trunks|add trunk|provision|empty/i))
      .first();
    await expect(landmark).toBeVisible({ timeout: 15_000 });
    // SAFETY: do not provision / create trunk.
  });

  test("TC-APP-AI-01 AI Intelligence section opens", async ({ page }) => {
    await openSidebarSection(page, "AI Intelligence");
    const main = mainRegion(page);
    const landmark = main
      .getByRole("heading", { name: /ai intelligence|intelligence/i })
      .or(main.getByText(/insights|no insights|intelligence/i))
      .first();
    await expect(landmark).toBeVisible({ timeout: 15_000 });
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
});
