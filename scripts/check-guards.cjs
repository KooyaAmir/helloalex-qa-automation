#!/usr/bin/env node
/**
 * Offline safety + reporter checks. No network, no credentials, no Playwright.
 * Locked: production hosts must never run; app-staging never honors ALLOW_PROD.
 */
const assert = require("assert");
const {
  hostnameOf,
  isProductionHost,
  assertNotProd,
  assertAppStagingConfigured,
} = require("../utils/env.cjs");
const { extractId, reportSite } = require("../utils/bugs-reporter.cjs");

function expectThrow(fn, needle) {
  let thrown;
  try {
    fn();
  } catch (err) {
    thrown = err;
  }
  assert.ok(thrown, "expected function to throw");
  if (needle) {
    assert.match(
      String(thrown.message || thrown),
      needle instanceof RegExp ? needle : new RegExp(needle, "i"),
      `expected error to match ${needle}, got: ${thrown.message}`,
    );
  }
}

const saved = { ...process.env };

function restoreEnv() {
  for (const key of ["QA_ENV", "ALLOW_PROD", "ALLOW_APP_ALT", "BASE_URL", "QA_APP_EMAIL", "QA_APP_PASSWORD"]) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}

try {
  assert.strictEqual(hostnameOf("https://app.helloalex.ai:443/login"), "app.helloalex.ai");
  assert.strictEqual(hostnameOf("https://www.helloalex.ai."), "www.helloalex.ai");
  assert.strictEqual(hostnameOf("https://dev-app.helloalex.ai/"), "dev-app.helloalex.ai");

  const prodUrls = [
    "https://helloalex.ai",
    "https://www.helloalex.ai",
    "https://helloalex.ai/",
    "https://helloalex.ai:443/",
    "https://app.helloalex.ai",
    "https://www.app.helloalex.ai",
    "https://app.helloalex.ai/dashboard",
  ];
  for (const url of prodUrls) {
    assert.strictEqual(isProductionHost(url), true, url);
  }
  assert.strictEqual(isProductionHost("https://dev-app.helloalex.ai"), false);
  assert.strictEqual(isProductionHost("https://dev.helloalex.ai"), false);

  delete process.env.ALLOW_PROD;
  delete process.env.QA_ENV;
  for (const url of prodUrls) {
    expectThrow(() => assertNotProd(url), /PRODUCTION/);
  }

  process.env.QA_ENV = "app-staging";
  process.env.ALLOW_PROD = "1";
  expectThrow(
    () => assertNotProd("https://app.helloalex.ai"),
    /ALLOW_PROD does not override/,
  );
  delete process.env.ALLOW_PROD;
  assert.strictEqual(assertNotProd("https://dev-app.helloalex.ai"), false);

  process.env.QA_ENV = "app-staging";
  process.env.QA_APP_EMAIL = "qa@example.com";
  process.env.QA_APP_PASSWORD = "secret";
  expectThrow(
    () => assertAppStagingConfigured("https://app.helloalex.ai", "app-staging"),
    /dev-app\.helloalex\.ai/,
  );
  expectThrow(
    () => assertAppStagingConfigured("https://helloalex.ai", "app-staging"),
    /dev-app\.helloalex\.ai/,
  );
  assertAppStagingConfigured("https://dev-app.helloalex.ai", "app-staging");

  const ids = {
    "TC-APP-AUTH-01 valid credentials": "TC-APP-AUTH-01",
    "TC-APP-SHELL-04 destination: Dashboard": "TC-APP-SHELL-04",
    "TC-APP-CAMP-TAB-active-missions Active": "TC-APP-CAMP-TAB-active-missions",
    "TC-APP-TASKS-02 New Task": "TC-APP-TASKS-02",
    "content TC-H4 footer": "TC-H4",
    "pricing TC-M1 annual": "TC-M1",
    "unlabeled failure": "UNCATALOGUED",
  };
  for (const [title, expected] of Object.entries(ids)) {
    assert.strictEqual(extractId(title), expected, title);
  }

  process.env.QA_ENV = "app-staging";
  delete process.env.BASE_URL;
  assert.strictEqual(reportSite(), "https://dev-app.helloalex.ai");
  process.env.BASE_URL = "https://dev-app.helloalex.ai/";
  assert.strictEqual(reportSite(), "https://dev-app.helloalex.ai");

  console.log("check-guards: ok (prod denylist + TC-APP extractId + staging site)");
} finally {
  restoreEnv();
}
