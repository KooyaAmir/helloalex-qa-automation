/**
 * Lightweight concurrency probe — staging only by default.
 * Prefer: npm run load:probe / load:probe:b (sets QA_ENV via run-env).
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  resolveBaseUrl,
  assertNotProd,
  assertStagingBConfigured,
} = require("../utils/env.cjs");

const { profile, baseURL: BASE } = resolveBaseUrl();
assertStagingBConfigured(BASE, profile);
assertNotProd(BASE);

const USERS = Number(process.env.USERS || 50);
const DURATION_S = Number(process.env.DURATION_S || 20);
const PATHS = (process.env.PATHS || "/,/pricing,/about,/support").split(",");

const started = Date.now();
const deadline = started + DURATION_S * 1000;
let ok = 0;
let fail = 0;
const statuses = {};
const latencies = [];

async function oneHit(p) {
  const t0 = Date.now();
  try {
    const res = await fetch(new URL(p, BASE), {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "helloalex-qa-load-probe/1.0" },
    });
    const ms = Date.now() - t0;
    latencies.push(ms);
    const s = String(res.status);
    statuses[s] = (statuses[s] || 0) + 1;
    if (res.status >= 400) fail++;
    else ok++;
  } catch {
    fail++;
    statuses.error = (statuses.error || 0) + 1;
    latencies.push(Date.now() - t0);
  }
}

async function worker() {
  while (Date.now() < deadline) {
    const p = PATHS[Math.floor(Math.random() * PATHS.length)];
    await oneHit(p);
  }
}

function pct(arr, p) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

console.log(`Load probe: QA_ENV=${profile} ${USERS} workers × ${DURATION_S}s → ${BASE}`);
await Promise.all(Array.from({ length: USERS }, () => worker()));

const total = ok + fail;
const report = {
  generatedAt: new Date().toISOString(),
  qaEnv: profile,
  environment: profile,
  base: BASE,
  users: USERS,
  durationSec: DURATION_S,
  total,
  ok,
  fail,
  errorRate: total ? fail / total : 0,
  p50ms: pct(latencies, 50),
  p95ms: pct(latencies, 95),
  p99ms: pct(latencies, 99),
  statuses,
  verdict:
    fail / Math.max(total, 1) > 0.05
      ? "FAIL — error rate > 5%"
      : pct(latencies, 95) > 5000
        ? "WARN — p95 > 5s"
        : "PASS — within probe thresholds (not a full browser certification)",
};

const outDir = path.join(process.cwd(), "reports", "latest");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "load-probe.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (String(report.verdict).startsWith("FAIL")) process.exit(1);
