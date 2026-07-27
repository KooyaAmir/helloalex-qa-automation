import { test, expect } from "@playwright/test";
import { isStagingHost, stagingSkipReason } from "../utils/staging";

test.describe("content-integrity", () => {
  test("TC-H1 industries CTA never exposes See all 0 + industries", async ({ page }) => {
    const snapshots: string[] = [];

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const hasIndustriesUi = await page.getByText(/industries/i).first().isVisible().catch(() => false);
    if (!hasIndustriesUi && isStagingHost()) {
      test.skip(true, stagingSkipReason("Industries CTA / directory"));
    }

    const deadline = Date.now() + 8_000;
    while (Date.now() < deadline) {
      const texts = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll("a, button, [role='button']"));
        return nodes
          .map((n) => (n.textContent || "").replace(/\s+/g, " ").trim())
          .filter((t) => /industries/i.test(t));
      });
      snapshots.push(...texts);
      await page.waitForTimeout(200);
    }

    if (snapshots.length === 0 && isStagingHost()) {
      test.skip(true, stagingSkipReason("Industries CTA text during load"));
    }

    const bad = snapshots.filter((t) => /see all\s*0\s*\+?\s*industries/i.test(t) || /\b0\s*\+\s*industries/i.test(t));
    expect(
      bad,
      `Industries CTA flashed zero during load. Samples: ${[...new Set(snapshots)].slice(0, 12).join(" | ")}`,
    ).toEqual([]);
  });

  test("TC-M4 Dental Practice appears at most once in industries directory", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const open = page.getByRole("button", { name: /see all.*industries|200\+?\s*industries/i }).first();
    if (await open.isVisible().catch(() => false)) {
      await open.click();
    } else {
      const alt = page.getByText(/all industries|200 of 200/i).first();
      if (await alt.isVisible().catch(() => false)) await alt.click();
      else if (isStagingHost()) {
        test.skip(true, stagingSkipReason("Industries directory expand control"));
      }
    }

    await page.waitForTimeout(1000);
    const count = await page.evaluate(() => {
      const text = document.body.innerText || "";
      const matches = text.match(/Dental Practice/g);
      return matches?.length ?? 0;
    });

    expect(count, `Dental Practice count=${count}`).toBeLessThanOrEqual(1);
  });
});
