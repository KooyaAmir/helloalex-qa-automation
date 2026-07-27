import type { Page } from "@playwright/test";
import fs from "fs";
import path from "path";

/** Resolved after `resolveBaseUrl()` / run-env loads profile + `.env`. */
export function requireAppCredentials(): { email: string; password: string } {
  const email = (process.env.QA_APP_EMAIL || "").trim();
  const password = (process.env.QA_APP_PASSWORD || "").trim();
  if (!email || !password) {
    throw new Error(
      [
        "App auth credentials missing.",
        "Set QA_APP_EMAIL and QA_APP_PASSWORD in .env (gitignored) or the environment.",
        "See envs/app-staging.env and TEST-ENV.md.",
      ].join("\n"),
    );
  }
  return { email, password };
}

export function appStorageStatePath(): string {
  return path.join(process.cwd(), ".auth", "app-user.json");
}

export function ensureAuthDir(): void {
  const dir = path.join(process.cwd(), ".auth");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Sign in on the client app login page.
 * Leaves the page on the post-login dashboard when successful.
 */
export async function loginAsAppUser(page: Page): Promise<void> {
  const { email, password } = requireAppCredentials();
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("textbox", { name: /email/i }).fill(email);
  await page.getByRole("textbox", { name: /password/i }).fill(password);
  const submit = page.getByRole("button", { name: /let me in/i });
  await submit.click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 30_000,
  });
}
