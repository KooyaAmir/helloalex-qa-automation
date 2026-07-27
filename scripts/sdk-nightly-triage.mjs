/**
 * Cursor SDK nightly triage loop (local).
 *
 * After Playwright app-staging runs, optionally asks a Cursor agent to triage
 * reports/latest into TRIAGE-APP.md + COVERAGE notes. Does NOT promote CI,
 * does NOT open product PRs (PROJECT-DECISIONS: human-only promote).
 *
 * Prerequisites:
 *   npm install @cursor/sdk --save-dev
 *   set CURSOR_API_KEY
 *
 * Usage:
 *   npm run test:app
 *   npm run sdk:triage
 *
 * Or one-shot:
 *   npm run nightly:local
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

async function main() {
  const root = process.cwd();
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    console.error(
      "[sdk-nightly] CURSOR_API_KEY missing. Skip agent triage; Playwright-only is fine.",
    );
    process.exit(0);
  }

  let Agent;
  try {
    ({ Agent } = await import("@cursor/sdk"));
  } catch {
    console.error(
      "[sdk-nightly] @cursor/sdk not installed. Run: npm install @cursor/sdk --save-dev",
    );
    process.exit(0);
  }

  const resultsPath = path.join(root, "reports", "latest", "playwright-results.json");
  const bugsPath = path.join(root, "reports", "latest", "bugs.md");
  const resultsHint = fs.existsSync(resultsPath)
    ? fs.readFileSync(resultsPath, "utf8").slice(0, 12_000)
    : "(no playwright-results.json)";
  const bugsHint = fs.existsSync(bugsPath)
    ? fs.readFileSync(bugsPath, "utf8").slice(0, 4_000)
    : "(no bugs.md)";

  const prompt = [
    "You are the Triage Agent for Hello Alex app QA (dev-app.helloalex.ai only).",
    "Read agents/triage.md and PROJECT-DECISIONS.md.",
    "Classify failures as product bug vs staging drift vs flake vs bad test.",
    "Write/overwrite reports/latest/TRIAGE-APP.md with a concise report.",
    "Do NOT change product app code. Do NOT open PRs. Do NOT weaken tests.",
    "Do NOT click denylisted actions (calls/SMS/buy/CRM sync/SIP/voice clone).",
    "",
    "playwright-results.json (truncated):",
    resultsHint,
    "",
    "bugs.md (truncated):",
    bugsHint,
  ].join("\n");

  console.log("[sdk-nightly] Starting local triage agent…");
  const result = await Agent.prompt(prompt, {
    apiKey,
    model: { id: "composer-2.5" },
    local: { cwd: root },
  });

  console.log("[sdk-nightly] status=", result.status);
  if (result.status === "error") process.exit(2);
}

function runPlaywrightThenTriage() {
  const pw = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "test:app"],
    { stdio: "inherit", env: process.env, shell: process.platform === "win32" },
  );
  // Always attempt triage so flakes get classified; exit with Playwright code if set.
  return pw.status ?? 1;
}

const mode = process.argv[2] || "triage";
if (mode === "all") {
  const code = runPlaywrightThenTriage();
  main()
    .then(() => process.exit(code))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
} else {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
