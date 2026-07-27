#!/usr/bin/env node
/**
 * Run Playwright (or load probe) against a named env profile.
 *
 *   node scripts/run-env.cjs staging-a
 *   node scripts/run-env.cjs staging-b -- --project=desktop
 *   node scripts/run-env.cjs app-staging
 *   node scripts/run-env.cjs staging-b load
 */
const { spawnSync } = require("child_process");
const path = require("path");
const {
  resolveBaseUrl,
  assertNotProd,
  assertStagingBConfigured,
  assertAppStagingConfigured,
} = require("../utils/env.cjs");

const profile = (process.argv[2] || "staging-a").toLowerCase();
const rest = process.argv.slice(3);
const isLoad = rest[0] === "load" || rest[0] === "load:1k";

process.env.QA_ENV = profile;

const { baseURL } = resolveBaseUrl();
assertStagingBConfigured(baseURL, profile);
assertAppStagingConfigured(baseURL, profile);
assertNotProd(baseURL);

if (isLoad && profile === "app-staging") {
  console.error(
    "[run-env] Load probe is marketing-only for now (QA-POLICY-APP). Use staging-a/b.",
  );
  process.exit(1);
}

console.log(`[run-env] QA_ENV=${profile} BASE_URL=${baseURL}`);

let cmd;
let args;
if (isLoad) {
  const script =
    rest[0] === "load:1k" ? "scripts/load-probe-1k.mjs" : "scripts/load-probe.mjs";
  cmd = process.execPath;
  args = [path.join(process.cwd(), script)];
} else {
  const pwArgs = rest[0] === "--" ? rest.slice(1) : rest;
  cmd = process.platform === "win32" ? "npx.cmd" : "npx";
  args = ["playwright", "test", ...pwArgs];
}

const result = spawnSync(cmd, args, {
  stdio: "inherit",
  env: { ...process.env, QA_ENV: profile, BASE_URL: baseURL },
  // shell only needed to resolve npx.cmd on Windows; node script paths must not use shell
  shell: !isLoad && process.platform === "win32",
  windowsVerbatimArguments: false,
});

process.exit(result.status ?? 1);
