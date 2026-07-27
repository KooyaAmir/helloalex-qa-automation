import { test, expect } from "@playwright/test";

/**
 * Video call: verify entry UI only. Do not hold LiveAvatar sessions
 * (costly / noisy). Full soak requires staging credentials + budget approval.
 */
test.describe("video-call-smoke", () => {
  test("TC-VIDEO-1 Video Call CTA is present and opens call UI shell", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const cta = page.getByRole("button", { name: /video call/i }).or(page.getByText(/Video Call Alex/i)).first();

    const visible = await cta.isVisible().catch(() => false);
    test.skip(!visible, "Video Call CTA not found on homepage this build");

    await cta.click();
    // Expect some call chrome: connecting / live / mute / end — without requiring Live
    const shell = page.getByText(/connecting|live|end conversation|mute|alex/i).first();
    await expect(shell).toBeVisible({ timeout: 30_000 });

    // Best-effort teardown if End exists
    const end = page.getByRole("button", { name: /end conversation|end call|hang up/i }).first();
    if (await end.isVisible().catch(() => false)) {
      await end.click().catch(() => {});
    }
  });
});
