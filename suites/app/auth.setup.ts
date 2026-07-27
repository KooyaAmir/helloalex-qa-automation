import { test as setup } from "@playwright/test";
import {
  appStorageStatePath,
  ensureAuthDir,
  loginAsAppUser,
} from "../../utils/app-auth";

setup("authenticate app user", async ({ page }) => {
  ensureAuthDir();
  await loginAsAppUser(page);
  await page.context().storageState({ path: appStorageStatePath() });
});
