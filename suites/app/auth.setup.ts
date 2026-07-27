import { test as setup, expect } from "@playwright/test";
import {
  appStorageStatePath,
  ensureAuthDir,
  loginAsAppUser,
} from "../../utils/app-auth";

setup("authenticate app user", async ({ page }) => {
  ensureAuthDir();
  await loginAsAppUser(page);
  await expect(page.getByRole("button", { name: /^Dashboard$/i })).toBeVisible({
    timeout: 20_000,
  });
  await page.context().storageState({ path: appStorageStatePath() });
});
