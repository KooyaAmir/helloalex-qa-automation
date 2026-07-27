import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Shared Auth+Shell sidebar helpers.
 * Spec: specs/app/auth-shell.yaml
 *
 * SAFETY (QA-POLICY-APP): Nav open only. Never click Send/Place Call, Send SMS,
 * Buy number, Pay/Checkout, or any control that spends credits / mutates paid resources.
 */

export const SIDEBAR_PRIMARY = [
  "Dashboard",
  "Send Call",
  "Call History",
  "Send SMS",
  "Character",
  "Pathway",
  "Campaigns",
  "Contacts",
  "Phone Numbers",
  "Account Settings",
  "Billing",
  "Support",
] as const;

export const SIDEBAR_SECONDARY = [
  "Batch Call",
  "Batch SMS",
  "SMS History",
  "Tasks",
  "Voices",
  "Knowledge Base",
  "Memory",
  "CRM",
  "Integrations",
  "SIP Trunks",
  "AI Intelligence",
] as const;

export type SidebarLabel =
  | (typeof SIDEBAR_PRIMARY)[number]
  | (typeof SIDEBAR_SECONDARY)[number];

/** Primary app nav — not secondary rails (e.g. launch-summary-rail). */
export function sidebar(page: Page): Locator {
  return page.getByRole("complementary").filter({
    has: page.getByRole("button", { name: "Dashboard", exact: true }),
  });
}

export function sidebarNav(page: Page, label: string): Locator {
  const slug = label.toLowerCase().replace(/\s+/g, "-");
  return sidebar(page)
    .locator(`[data-nav="nav-${slug}"]`)
    .or(sidebar(page).getByRole("button", { name: label, exact: true }))
    .first();
}

export function mainRegion(page: Page): Locator {
  return page
    .getByTestId("client-workspace-page")
    .or(page.locator("main, [role='main']"))
    .first();
}

/**
 * Open authenticated shell and recover from staging "Unable to verify your session".
 * Parallel workers share storageState and occasionally hit this gate.
 */
export async function gotoAuthenticatedShell(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(async () => {
    const retry = page.getByRole("button", { name: /^Retry$/i });
    if (await retry.isVisible().catch(() => false)) {
      await retry.click();
    }
    const sessionGate = page.getByText(/unable to verify your session/i);
    if (await sessionGate.isVisible().catch(() => false)) {
      await page.reload({ waitUntil: "domcontentloaded" });
    }
    await expect(sidebar(page)).toBeVisible({ timeout: 8_000 });
  }).toPass({ timeout: 45_000 });
}

/** Heading / empty-state aliases when page title ≠ sidebar label. */
function destinationHeadingPattern(label: string): RegExp {
  const aliases: Record<string, string> = {
    "Call History": "Calls|Call History",
    "Knowledge Base": "Knowledge Bases?",
    "AI Intelligence": "AI Intelligence",
    "Account Settings": "Account|Settings",
    "Phone Numbers": "Phone Numbers?",
    "SIP Trunks": "SIP Trunks?",
  };
  return new RegExp(aliases[label] ?? escapeRegExp(label), "i");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Collect sidebar nav labels (data-tour buttons, else all nav buttons minus chrome).
 * Extras must surface for SHELL-03 — do not soft-pass by only collecting Spec-expected labels.
 */
const SIDEBAR_CHROME_DENYLIST = new Set(
  [
    "Manage Credits",
    "New Pathway",
    "New Task",
    "Clone Voice",
    "Sign out",
    "Account menu",
    "Open Phone Numbers",
    "Start Calling",
    "New Campaign",
    "Make Call",
    "View Analytics",
    "Configure phone line",
    "Create AI pathway",
    "Make your first call",
    "Launch a campaign",
  ].map((s) => s.toLowerCase()),
);

export async function collectSidebarNavLabels(page: Page): Promise<string[]> {
  const nav = sidebar(page);
  await expect(nav).toBeVisible({ timeout: 20_000 });

  const tourButtons = nav.locator("button[data-tour]");
  const tourCount = await tourButtons.count();
  if (tourCount > 0) {
    const labels: string[] = [];
    for (let i = 0; i < tourCount; i++) {
      const text = (await tourButtons.nth(i).innerText()).trim().replace(/\s+/g, " ");
      if (text) labels.push(text);
    }
    return labels;
  }

  // Fallback: all complementary buttons, minus chrome denylist (SHELL-03 extras must still fail)
  const buttons = nav.getByRole("button");
  const count = await buttons.count();
  const labels: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = (await buttons.nth(i).innerText()).trim().replace(/\s+/g, " ");
    if (!text) continue;
    if (SIDEBAR_CHROME_DENYLIST.has(text.toLowerCase())) continue;
    // Skip pure icon/avatar buttons with no useful label
    if (text.length > 40) continue;
    labels.push(text);
  }
  return labels;
}

/**
 * Open a sidebar section from authenticated shell (session-gate aware).
 * Nav open only — callers must not click denylisted submit/buy/pay CTAs.
 */
export async function openSidebarSection(
  page: Page,
  label: string,
): Promise<void> {
  await gotoAuthenticatedShell(page);
  const nav = sidebarNav(page, label);
  await expect(nav).toBeVisible({ timeout: 20_000 });
  await nav.scrollIntoViewIfNeeded();
  await nav.click();

  const notFound = page.getByText(/client page not found/i);
  await expect
    .poll(async () => !(await notFound.isVisible().catch(() => false)), {
      timeout: 15_000,
    })
    .toBeTruthy();
  await expect(notFound).toBeHidden();
  await expect(mainRegion(page)).toBeVisible({ timeout: 15_000 });
  await expect(sidebar(page)).toBeVisible();
}


/**
 * Destination-proof after a sidebar open (SHELL-04 / SHELL-05).
 * Requires at least one of: selected aria-current, URL change, unique main heading.
 * Forbids body-only / 404-text-only passes.
 */
export async function assertNavDestination(
  page: Page,
  label: string,
): Promise<void> {
  await gotoAuthenticatedShell(page);

  const nav = sidebarNav(page, label);
  await expect(nav).toBeVisible({ timeout: 20_000 });
  await nav.scrollIntoViewIfNeeded();

  const beforeUrl = page.url();
  await nav.click();

  const notFound = page.getByText(/client page not found/i);
  await expect
    .poll(async () => !(await notFound.isVisible().catch(() => false)), {
      timeout: 15_000,
    })
    .toBeTruthy();
  await expect(notFound).toBeHidden();
  await expect(mainRegion(page)).toBeVisible({ timeout: 15_000 });
  await expect(sidebar(page)).toBeVisible();

  await expect
    .poll(
      async () => {
        const selected =
          (await nav.getAttribute("aria-current").catch(() => null)) === "page";
        const urlChanged = page.url() !== beforeUrl;
        const headingVisible = await mainRegion(page)
          .getByRole("heading", { name: destinationHeadingPattern(label) })
          .first()
          .isVisible()
          .catch(() => false);
        return selected || urlChanged || headingVisible;
      },
      { timeout: 15_000 },
    )
    .toBeTruthy();
}
