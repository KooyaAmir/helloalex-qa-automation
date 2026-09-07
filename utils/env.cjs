/**
 * Shared env resolution for Playwright + load probes.
 * Profiles: staging-a, staging-b (marketing), app-staging (dev-app).
 */
const fs = require("fs");
const path = require("path");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/** Apply file keys into process.env without clobbering explicit env. */
function applyEnv(vars) {
  for (const [k, v] of Object.entries(vars)) {
    if (process.env[k] === undefined || process.env[k] === "") {
      process.env[k] = v;
    }
  }
}

function resolveBaseUrl() {
  const root = process.cwd();
  const profile = (process.env.QA_ENV || "staging-a").toLowerCase();
  process.env.QA_ENV = profile;

  const local = parseEnvFile(path.join(root, ".env"));
  const fromProfile = parseEnvFile(path.join(root, "envs", `${profile}.env`));

  // Profile first, then .env fills gaps; explicit process.env wins in applyEnv
  applyEnv(fromProfile);
  applyEnv(local);

  const baseURL = (
    process.env.BASE_URL ||
    fromProfile.BASE_URL ||
    local.BASE_URL ||
    (profile === "app-staging"
      ? "https://dev-app.helloalex.ai"
      : "https://dev.helloalex.ai")
  ).replace(/\/$/, "");

  process.env.BASE_URL = baseURL;
  return { profile, baseURL };
}

/** Hostname only — strips protocol, path, port, trailing dot. */
function hostnameOf(baseURL) {
  const raw = String(baseURL || "").trim();
  if (!raw) return "";
  try {
    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(href).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return raw
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "")
      .toLowerCase()
      .replace(/\.$/, "");
  }
}

function isProductionHost(baseURL) {
  const host = hostnameOf(baseURL);
  const isProdMarketing = host === "helloalex.ai" || host === "www.helloalex.ai";
  const isProdApp = host === "app.helloalex.ai" || host === "www.app.helloalex.ai";
  return isProdMarketing || isProdApp;
}

function assertNotProd(baseURL) {
  const isProd = isProductionHost(baseURL);
  const profile = (process.env.QA_ENV || "").toLowerCase();

  // Locked decision: app-staging is never production, even if ALLOW_PROD is set.
  if (isProd && profile === "app-staging") {
    throw new Error(
      [
        "Refusing to run app-staging against PRODUCTION.",
        "QA_ENV=app-staging is locked to https://dev-app.helloalex.ai.",
        "ALLOW_PROD does not override this (PROJECT-DECISIONS / Amir).",
        `Current BASE_URL=${baseURL}`,
      ].join("\n"),
    );
  }

  if (isProd && process.env.ALLOW_PROD !== "1") {
    throw new Error(
      [
        "Refusing to run against PRODUCTION.",
        "Use staging-a / staging-b (marketing) or app-staging (dev-app).",
        "Do not set ALLOW_PROD=1 — this program stays on staging.",
        `Current BASE_URL=${baseURL}`,
      ].join("\n"),
    );
  }
  return isProd;
}

function assertStagingBConfigured(baseURL, profile) {
  if (profile !== "staging-b") return;
  if (
    !baseURL ||
    /REPLACE_WITH_SECOND_STAGING_URL/i.test(baseURL) ||
    /\.example\.com$/i.test(baseURL)
  ) {
    throw new Error(
      [
        "staging-b is not configured yet.",
        "Paste your second staging URL into envs/staging-b.env:",
        "  BASE_URL=https://your-preview-or-staging-url",
        "Then run: npm run test:staging-b",
      ].join("\n"),
    );
  }
}

function assertAppStagingConfigured(baseURL, profile) {
  if (profile !== "app-staging") return;
  if (!/dev-app\.helloalex\.ai/i.test(baseURL) && process.env.ALLOW_APP_ALT !== "1") {
    throw new Error(
      [
        "app-staging expects BASE_URL=https://dev-app.helloalex.ai",
        `Got BASE_URL=${baseURL}`,
        "Set ALLOW_APP_ALT=1 only for an intentional alternate app staging host.",
      ].join("\n"),
    );
  }
  const email = (process.env.QA_APP_EMAIL || "").trim();
  const password = (process.env.QA_APP_PASSWORD || "").trim();
  if (!email || !password) {
    throw new Error(
      [
        "app-staging requires QA_APP_EMAIL and QA_APP_PASSWORD.",
        "Add them to local .env (gitignored) — see .env.example.",
      ].join("\n"),
    );
  }
}

module.exports = {
  resolveBaseUrl,
  hostnameOf,
  isProductionHost,
  assertNotProd,
  assertStagingBConfigured,
  assertAppStagingConfigured,
};
