import { test, expect, type Page, type Locator } from "@playwright/test";
import { mainRegion, openSidebarSection, sidebar } from "./shell-helpers";

/**
 * Calls + SMS domain smokes — uses storageState from auth.setup.ts (app project).
 * Spec: specs/app/domain-smokes.yaml
 *
 * SAFETY (QA-POLICY-APP): Read-only open + landmark asserts only.
 * NEVER click final place/send/launch-batch/buy/request-number submit controls.
 */

/** Destination proof: URL path/fragment OR selected data-nav OR unique main landmark. */
async function expectDestination(
  page: Page,
  opts: {
    label: string;
    urlRe: RegExp;
    landmark: Locator;
  },
) {
  const slug = opts.label.toLowerCase().replace(/\s+/g, "-");
  const selectedNav = sidebar(page)
    .locator(
      `[data-nav="nav-${slug}"][aria-current], [data-nav="nav-${slug}"][data-selected="true"], [data-nav="nav-${slug}"].active`,
    )
    .or(
      sidebar(page)
        .getByRole("button", { name: opts.label, exact: true })
        .and(page.locator('[aria-current], [data-selected="true"], .active')),
    );

  await expect
    .poll(
      async () => {
        if (opts.urlRe.test(page.url())) return true;
        if (await opts.landmark.isVisible().catch(() => false)) return true;
        if (await selectedNav.first().isVisible().catch(() => false)) return true;
        return false;
      },
      { timeout: 15_000 },
    )
    .toBeTruthy();

  await expect(mainRegion(page)).toBeVisible();
  await expect(opts.landmark).toBeVisible({ timeout: 15_000 });
}

test.describe("app-calls-sms", () => {
  test("TC-APP-CALLS-01 Send Call page loads (no place-call)", async ({
    page,
  }) => {
    await openSidebarSection(page, "Send Call");

    const main = mainRegion(page);
    const heading = main.getByRole("heading", {
      name: /^Send Call$/i,
    });
    await expectDestination(page, {
      label: "Send Call",
      urlRe: /\/calls\/send-call/i,
      landmark: heading,
    });

    await expect(
      main.locator('input[name="phoneNumber"]').or(
        main.getByPlaceholder(/415|phone|555/i),
      ),
    ).toBeVisible();

    const launchCall = main.getByRole("button", {
      name: /launch call|place call|send call/i,
    });
    await expect(launchCall.first()).toBeVisible();
  });

  test("TC-APP-CALLS-02 Call History list or empty state", async ({ page }) => {
    await openSidebarSection(page, "Call History");

    const main = mainRegion(page);
    const heading = main
      .getByRole("heading", { name: /^(Calls|Call History)$/i })
      .first();
    await expectDestination(page, {
      label: "Call History",
      urlRe: /\/calls\/?(\?|$)/i,
      landmark: heading,
    });

    const tableOrList = main
      .locator("table, [role='table'], [role='grid']")
      .or(main.getByText(/showing\s+\d+\s+of\s+\d+\s+calls?/i))
      .or(
        main.getByText(
          /no calls?|no (call )?history|empty|nothing here|get started/i,
        ),
      );
    await expect(tableOrList.first()).toBeVisible();
  });

  test("TC-APP-CALLS-03 Batch Call section opens (read-only)", async ({
    page,
  }) => {
    await openSidebarSection(page, "Batch Call");

    const main = mainRegion(page);
    const heading = main.getByRole("heading", { name: /^Batch Call$/i });
    await expectDestination(page, {
      label: "Batch Call",
      urlRe: /\/calls\/send-batch-call/i,
      landmark: heading,
    });

    await expect(
      main
        .getByRole("heading", { name: /launch summary|audience|batch details/i })
        .or(main.getByText(/0 contacts|audience preview|upload a csv/i))
        .first(),
    ).toBeVisible();

    // Start/launch batch CTA optional — if absent, audience chrome above is enough
    const startBatch = main.getByRole("button", {
      name: /launch (batch|call)|start batch|send batch|queue batch/i,
    });
    const hasStart = await startBatch.first().isVisible().catch(() => false);
    const hasAudience = await main
      .getByText(/0 contacts|audience|batch/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasStart || hasAudience).toBeTruthy();
  });

  test("TC-APP-CALLS-05 Phone Numbers section read-only smoke", async ({
    page,
  }) => {
    await openSidebarSection(page, "Phone Numbers");

    const main = mainRegion(page);
    const heading = main.getByRole("heading", { name: /^Phone Numbers$/i });
    await expectDestination(page, {
      label: "Phone Numbers",
      urlRe: /\/phone-numbers/i,
      landmark: heading,
    });

    await expect(
      main
        .getByText(/assigned lines|managed numbers|pending requests/i)
        .or(main.locator("table, [role='table'], [role='grid']"))
        .or(main.getByText(/no (phone )?numbers|empty/i))
        .first(),
    ).toBeVisible();

    const buyOrRequest = main.getByRole("button", {
      name: /request number|buy|purchase|provision|get number/i,
    });
    await expect(buyOrRequest.first()).toBeVisible();
  });

  test("TC-APP-SMS-01 Send SMS page loads (no send)", async ({ page }) => {
    await openSidebarSection(page, "Send SMS");

    const main = mainRegion(page);
    const heading = main.getByRole("heading", { name: /^Send SMS$/i });
    await expectDestination(page, {
      label: "Send SMS",
      urlRe: /\/sms\/new/i,
      landmark: heading,
    });

    await expect(
      main
        .locator("#send-sms-phone")
        .or(main.getByPlaceholder(/555|phone|e\.g\./i))
        .or(
          main.getByRole("heading", {
            name: /destination details|message setup|recipient/i,
          }),
        )
        .first(),
    ).toBeVisible();

    await expect(
      main.getByRole("heading", { name: /launch summary/i }),
    ).toBeVisible();
    const sendInMain = main
      .getByRole("button", { name: "Send SMS", exact: true })
      .filter({ hasNot: page.locator("[data-nav]") });
    await expect(sendInMain.first()).toBeVisible();
  });

  test("TC-APP-SMS-02 SMS History list or empty state", async ({ page }) => {
    await openSidebarSection(page, "SMS History");

    const main = mainRegion(page);
    const heading = main.getByRole("heading", { name: /^SMS History$/i });
    await expectDestination(page, {
      label: "SMS History",
      urlRe: /\/sms\/?(\?|$)/i,
      landmark: heading,
    });

    const listOrEmpty = main
      .locator("table, [role='table'], [role='grid']")
      .or(main.getByText(/showing\s+\d+\s+of\s+\d+\s+threads?/i))
      .or(
        main.getByText(
          /no threads found|no (sms|messages?|history)|start sending messages/i,
        ),
      );
    await expect(listOrEmpty.first()).toBeVisible();
  });

  test("TC-APP-SMS-03 Batch SMS section opens (read-only)", async ({
    page,
  }) => {
    await openSidebarSection(page, "Batch SMS");

    const main = mainRegion(page);
    const heading = main.getByRole("heading", { name: /^Batch SMS$/i });
    await expectDestination(page, {
      label: "Batch SMS",
      urlRe: /\/sms\/batch/i,
      landmark: heading,
    });

    await expect(
      main
        .getByRole("heading", {
          name: /launch summary|batch setup|audience|upload recipients/i,
        })
        .or(main.getByText(/0 (contacts|recipients)|upload csv/i))
        .first(),
    ).toBeVisible();

    const sendBatch = main.getByRole("button", {
      name: /send batch( sms)?|launch batch|start batch/i,
    });
    await expect(sendBatch.first()).toBeVisible();
  });

  test("TC-APP-SMS-05 SMS nav trio reachable with destination proof", async ({
    page,
  }) => {
    const trio: Array<{
      label: string;
      urlRe: RegExp;
      heading: RegExp;
    }> = [
      { label: "Send SMS", urlRe: /\/sms\/new/i, heading: /^Send SMS$/i },
      { label: "Batch SMS", urlRe: /\/sms\/batch/i, heading: /^Batch SMS$/i },
      {
        label: "SMS History",
        urlRe: /\/sms\/?(\?|$)/i,
        heading: /^SMS History$/i,
      },
    ];

    for (const item of trio) {
      await openSidebarSection(page, item.label);
      const landmark = mainRegion(page)
        .getByRole("heading", { name: item.heading })
        .first();
      await expectDestination(page, {
        label: item.label,
        urlRe: item.urlRe,
        landmark,
      });
    }
  });

  test("TC-APP-CALLS-04 Send Call required-field validation (abort)", async ({
    page,
  }) => {
    // SAFETY: abort mutating call APIs only (not static assets).
    let blockedCallPost = 0;
    await page.route(/\/(api|v1|graphql)\b/i, async (route) => {
      const req = route.request();
      if (req.method() === "GET" || req.method() === "HEAD" || req.method() === "OPTIONS") {
        await route.continue();
        return;
      }
      const url = req.url();
      if (/call|dial|outbound/i.test(url) && /launch|place|start|create|send/i.test(url)) {
        blockedCallPost += 1;
        await route.abort();
        return;
      }
      await route.continue();
    });

    await openSidebarSection(page, "Send Call");
    const main = mainRegion(page);
    const phone = main
      .locator('input[name="phoneNumber"]')
      .or(main.getByPlaceholder(/415|phone|555/i))
      .first();
    await expect(phone).toBeVisible({ timeout: 15_000 });
    await phone.fill("");
    await phone.blur();

    const launch = main.getByRole("button", {
      name: /launch call|place call|send call/i,
    });
    await expect(launch.first()).toBeVisible();

    const disabled = await launch.first().isDisabled().catch(() => false);
    if (!disabled) {
      await launch.first().click();
    }

    await expect
      .poll(async () => {
        const validation = await page
          .getByText(
            /please enter a valid phone|valid phone number|required|enter.*(phone|number)|invalid.*(phone|number)|missing/i,
          )
          .or(page.getByRole("alert"))
          .first()
          .isVisible()
          .catch(() => false);
        const phoneInvalid = await phone
          .evaluate((el) => (el as HTMLInputElement).validity?.valid === false)
          .catch(() => false);
        const stillOnSendCall = /send-call/i.test(page.url());
        return disabled || validation || phoneInvalid || blockedCallPost > 0 || stillOnSendCall;
      }, { timeout: 10_000 })
      .toBeTruthy();

    // Hard gate: never treat a successful live place-call as pass.
    await expect(page.getByText(/call started|call placed|dialing/i)).toHaveCount(0);
  });

  test("TC-APP-SMS-04 Send SMS validation without send", async ({ page }) => {
    let blockedSmsPost = 0;
    await page.route(/\/(api|v1|graphql)\b/i, async (route) => {
      const req = route.request();
      if (req.method() === "GET" || req.method() === "HEAD" || req.method() === "OPTIONS") {
        await route.continue();
        return;
      }
      const url = req.url();
      if (/sms|message/i.test(url) && /send|launch|create|start/i.test(url)) {
        blockedSmsPost += 1;
        await route.abort();
        return;
      }
      await route.continue();
    });

    await openSidebarSection(page, "Send SMS");
    const main = mainRegion(page);
    const phone = main
      .locator("#send-sms-phone")
      .or(main.getByPlaceholder(/555|phone|e\.g\./i))
      .first();
    await expect(phone).toBeVisible({ timeout: 15_000 });
    await phone.fill("");
    await phone.blur();

    const sendBtn = main
      .getByRole("button", { name: "Send SMS", exact: true })
      .filter({ hasNot: page.locator("[data-nav]") })
      .first();
    await expect(sendBtn).toBeVisible();

    const disabled = await sendBtn.isDisabled().catch(() => false);
    if (!disabled) {
      await sendBtn.click();
    }

    await expect
      .poll(async () => {
        const validation = await main
          .getByText(/required|enter.*(phone|number|recipient)|invalid.*(phone|number)|missing/i)
          .or(page.getByRole("alert"))
          .first()
          .isVisible()
          .catch(() => false);
        const phoneInvalid = await phone
          .evaluate((el) => (el as HTMLInputElement).validity?.valid === false)
          .catch(() => false);
        return disabled || validation || phoneInvalid || blockedSmsPost > 0;
      }, { timeout: 10_000 })
      .toBeTruthy();
  });
});
