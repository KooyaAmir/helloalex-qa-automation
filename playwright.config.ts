import { defineConfig, devices } from "@playwright/test";
import path from "path";
import {
  resolveBaseUrl,
  assertNotProd,
  assertStagingBConfigured,
  assertAppStagingConfigured,
} from "./utils/env.cjs";

const { profile, baseURL: BASE_URL } = resolveBaseUrl();
assertStagingBConfigured(BASE_URL, profile);
assertAppStagingConfigured(BASE_URL, profile);
const isProd = assertNotProd(BASE_URL);
const isApp = profile === "app-staging";
const storageState = path.join(process.cwd(), ".auth", "app-user.json");

console.log(
  `[playwright] QA_ENV=${profile} BASE_URL=${BASE_URL}${isProd ? " (PRODUCTION)" : ""}`,
);

const marketingProjects = [
  {
    name: "desktop",
    testIgnore: [/\/app\//],
    use: {
      browserName: "chromium" as const,
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      hasTouch: false,
    },
  },
  {
    name: "mobile",
    testIgnore: [/\/app\//],
    use: {
      ...devices["Pixel 5"],
      browserName: "chromium" as const,
      viewport: { width: 390, height: 844 },
    },
    testMatch: /responsive-nav|smoke-health|pricing-transparency|content-integrity/,
  },
  {
    name: "tablet",
    testIgnore: [/\/app\//],
    use: {
      browserName: "chromium" as const,
      viewport: { width: 768, height: 1024 },
      isMobile: false,
      hasTouch: true,
    },
    testMatch: /responsive-nav|content-integrity/,
  },
];

const appProjects = [
  {
    name: "setup",
    testMatch: /app\/auth\.setup\.ts/,
  },
  {
    name: "app",
    dependencies: ["setup"],
    testMatch: /app\/.*\.spec\.ts/,
    use: {
      browserName: "chromium" as const,
      viewport: { width: 1440, height: 900 },
      storageState,
    },
  },
];

export default defineConfig({
  testDir: "./suites",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : isApp ? 3 : 6,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["json", { outputFile: "reports/latest/playwright-results.json" }],
    ["./utils/bugs-reporter.cjs"],
  ],
  use: {
    baseURL: BASE_URL,
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
  },
  metadata: {
    baseURL: BASE_URL,
    qaEnv: profile,
    environment: isProd ? "production" : profile,
  },
  projects: isApp ? appProjects : marketingProjects,
  outputDir: path.join("test-results"),
});
