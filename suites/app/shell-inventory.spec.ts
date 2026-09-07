import { test, expect } from "@playwright/test";
import {
  SIDEBAR_PRIMARY,
  SIDEBAR_SECONDARY,
  collectSidebarNavLabels,
  gotoAuthenticatedShell,
} from "./shell-helpers";

/**
 * Spec: TC-APP-SHELL-03 — sidebar inventory matches SIDEBAR_PRIMARY + SIDEBAR_SECONDARY.
 * SAFETY: inventory assert only; no send/buy/checkout clicks.
 */

test.describe("app-shell-inventory", () => {
  test("TC-APP-SHELL-03 sidebar inventory matches Spec lists", async ({
    page,
  }) => {
    await gotoAuthenticatedShell(page);

    const expected = [...SIDEBAR_PRIMARY, ...SIDEBAR_SECONDARY];
    const live = await collectSidebarNavLabels(page);
    const liveSet = new Set(live);

    const missing = expected.filter((label) => !liveSet.has(label));
    expect(
      missing,
      `Missing Spec sidebar labels: ${missing.join(", ") || "(none)"}`,
    ).toEqual([]);

    const expectedSet = new Set<string>(expected);
    const extras = live.filter((label) => !expectedSet.has(label));
    expect(
      extras,
      `Spec debt — unexpected sidebar nav labels (reconcile auth-shell.yaml): ${extras.join(", ") || "(none)"}`,
    ).toEqual([]);
  });
});
