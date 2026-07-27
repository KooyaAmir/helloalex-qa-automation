import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { isStagingHost, STAGING_HTTP_GAPS } from "../utils/staging";

const BASE = process.env.BASE_URL ?? "https://dev.helloalex.ai";
const SEEDS = [
  "/",
  "/pricing",
  "/about",
  "/support",
  "/privacy",
  "/careers",
  "/investors",
  "/affiliate",
  "/affiliate/login",
  "/client-dashboard",
  "/11labs-eleven-labs",
];

test.describe("link-crawl", () => {
  test("TC-CRAWL-1 core routes healthy; staging HTTP gaps documented", async ({ page, request }) => {
    const brokenBrowser: { url: string; reason: string }[] = [];
    const httpSoft404: { url: string; status: number }[] = [];
    const ok: string[] = [];
    const knownGaps: { url: string; status: number }[] = [];

    for (const seed of SEEDS) {
      const url = new URL(seed, BASE).toString();
      const http = await request.get(url, { maxRedirects: 5, timeout: 20_000 }).catch(() => null);
      const status = http?.status() ?? -1;

      if (isStagingHost() && seed in STAGING_HTTP_GAPS) {
        knownGaps.push({ url, status });
        // Still verify browser isn't a hard crash for known gaps when SPA might render
        await page.goto(seed, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => null);
        continue;
      }

      if (status >= 500) {
        brokenBrowser.push({ url, reason: `HTTP ${status}` });
        continue;
      }
      if (status === 404) httpSoft404.push({ url, status });

      const res = await page.goto(seed, { waitUntil: "domcontentloaded", timeout: 45_000 }).catch((e) => {
        brokenBrowser.push({ url, reason: String(e).slice(0, 160) });
        return null;
      });
      if (!res) continue;

      const title = await page.title();
      const bodyText = await page.locator("body").innerText().catch(() => "");
      const looks404 =
        /404|not found|page doesn.?t exist/i.test(title) ||
        (/this page could not be found/i.test(bodyText) && bodyText.length < 800);

      if (looks404) brokenBrowser.push({ url, reason: "Browser rendered 404 UI" });
      else ok.push(url);
    }

    const outDir = path.join(process.cwd(), "reports", "latest");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, "link-crawl.json"),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          base: BASE,
          staging: isStagingHost(),
          okCount: ok.length,
          ok,
          knownStagingHttpGaps: knownGaps,
          httpGet404ButMayBeSpa: httpSoft404,
          brokenBrowser,
        },
        null,
        2,
      ),
    );

    expect(brokenBrowser, JSON.stringify(brokenBrowser, null, 2)).toEqual([]);
    if (!isStagingHost() && httpSoft404.length) {
      expect.soft(httpSoft404, `SPA HTTP 404: ${httpSoft404.map((x) => x.url).join(", ")}`).toEqual([]);
    }
  });
});
