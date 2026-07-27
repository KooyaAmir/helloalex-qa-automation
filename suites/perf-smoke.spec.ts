import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

test.describe("perf-smoke", () => {
  test("TC-PERF-1 homepage records navigation timing (report + soft budgets)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(1500);

    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const paints = performance.getEntriesByType("paint");
      const fcp = paints.find((p) => p.name === "first-contentful-paint")?.startTime;
      return {
        domContentLoaded: nav?.domContentLoadedEventEnd ?? null,
        loadEventEnd: nav?.loadEventEnd ?? null,
        responseStart: nav?.responseStart ?? null,
        fcp: fcp ?? null,
        transferSize: nav?.transferSize ?? null,
      };
    });

    const outDir = path.join(process.cwd(), "reports", "latest");
    fs.mkdirSync(outDir, { recursive: true });

    const hardFail = (metrics.responseStart ?? 0) > 20_000;
    const warn =
      (metrics.fcp ?? 0) > 4000 || (metrics.domContentLoaded ?? 0) > 6000
        ? "WARN — slower than marketing budgets (may be runner network)"
        : "PASS — within budgets";

    fs.writeFileSync(
      path.join(outDir, "perf-homepage.json"),
      JSON.stringify({ generatedAt: new Date().toISOString(), metrics, verdict: hardFail ? "FAIL" : warn }, null, 2),
    );

    expect(metrics.responseStart, "TTFB / responseStart missing").toBeTruthy();
    expect(hardFail, `Extreme TTFB: ${metrics.responseStart}ms`).toBeFalsy();
  });

  test("TC-PERF-2 pricing reaches DOMContentLoaded", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /priced for growth|pricing|starter/i }).first()).toBeVisible();
  });
});
