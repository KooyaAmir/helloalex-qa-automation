import { test, expect } from "@playwright/test";

async function scrapeBody(page: import("@playwright/test").Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  return page.locator("body").innerText();
}

test.describe("cross-page-consistency", () => {
  test("TC-H2 call-volume claims are consistent site-wide", async ({ page }) => {
    const { isStagingHost } = await import("../utils/staging");
    const pages = isStagingHost() ? ["/", "/pricing"] : ["/", "/pricing", "/investors"];
    const found = new Set<string>();

    for (const p of pages) {
      const text = await scrapeBody(page, p);
      for (const m of text.matchAll(/\b(\d+(?:\.\d+)?\s*M\+?)\s*(?:\+)?\s*(?:AI\s+)?Calls?\s+Handled/gi)) {
        found.add(m[1].replace(/\s+/g, "").toUpperCase());
      }
      for (const m of text.matchAll(/\b(\d+(?:\.\d+)?M\+?)\b/gi)) {
        // only keep if nearby context mentions calls within 40 chars
        const idx = m.index ?? 0;
        const window = text.slice(Math.max(0, idx - 20), idx + 40);
        if (/calls?/i.test(window) && /handled|AI/i.test(window)) {
          found.add(m[1].toUpperCase());
        }
      }
    }

    expect(
      found.size,
      `Conflicting call metrics: ${[...found].join(", ")}`,
    ).toBeLessThanOrEqual(1);
  });

  test("TC-H3 language count claims do not conflict on homepage", async ({ page }) => {
    const text = await scrapeBody(page, "/");
    const langs = new Set<string>();
    for (const m of text.matchAll(/\b(\d+\+?)\s+Languages?\b/gi)) {
      langs.add(m[1]);
    }
    // also "Speaks 65 languages" style
    for (const m of text.matchAll(/\b(\d+\+?)\s+languages\b/gi)) {
      langs.add(m[1]);
    }

    expect(langs.size, `Conflicting language counts on homepage: ${[...langs].join(", ")}`).toBeLessThanOrEqual(1);
  });

  test("TC-H3 voice library counts are consistent on homepage", async ({ page }) => {
    const home = await scrapeBody(page, "/");
    const voicesHome = new Set<string>();
    for (const m of home.matchAll(/\b(\d+\+?)\s+(?:Professional\s+)?Voices?\b/gi)) {
      voicesHome.add(m[1]);
    }

    const eleven = await scrapeBody(page, "/11labs-eleven-labs");
    const voicesEleven = new Set<string>();
    for (const m of eleven.matchAll(/\b(\d+\+?)\s+voices?\b/gi)) {
      voicesEleven.add(m[1]);
    }

    // Fail if homepage alone conflicts; separately note cross-page if both have claims
    expect(
      voicesHome.size,
      `Homepage voice count conflict: ${[...voicesHome].join(", ")}`,
    ).toBeLessThanOrEqual(1);

    if (voicesHome.size === 1 && voicesEleven.size >= 1) {
      const homeVal = [...voicesHome][0];
      const elevenHasDifferent = [...voicesEleven].some((v) => v !== homeVal);
      expect(
        elevenHasDifferent,
        `Voice counts differ home=${homeVal} vs elevenlabs=${[...voicesEleven].join(",")}. Label scopes or unify.`,
      ).toBeFalsy();
    }
  });
});
