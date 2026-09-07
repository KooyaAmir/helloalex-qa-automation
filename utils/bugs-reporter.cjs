const fs = require("fs");
const path = require("path");

const FIX_PLANS = {
  "TC-H1": {
    severity: "HIGH",
    fixPlan:
      "Gate the industries CTA label on /api/industries (or use static '200+'). Never animate accessible name from 0.",
  },
  "TC-H2": {
    severity: "HIGH",
    fixPlan:
      "Pick one public 'calls handled' number and sync homepage, pricing, and investors from a single constant/CMS field.",
  },
  "TC-H3": {
    severity: "HIGH",
    fixPlan:
      "Align language/voice counts; label ElevenLabs library vs Hello Alex runtime if numbers legitimately differ.",
  },
  "TC-H4": {
    severity: "HIGH",
    fixPlan:
      "Replace inner-page footer hrefs '#features' / '#how-it-works' with '/#features' and '/#how-it-works'; share one footer component.",
  },
  "TC-H5": {
    severity: "HIGH",
    fixPlan:
      "Add a mobile hamburger/drawer that exposes Features, Industries, and Affiliates below the desktop breakpoint.",
  },
  "TC-H6": {
    severity: "HIGH",
    fixPlan:
      "Show platform fee on plan cards (monthly + annual). Rewrite FAQ so 'no hidden costs / price you see' matches the cards.",
  },
  "TC-M1": {
    severity: "MEDIUM",
    fixPlan:
      "Update card pricing when Annual is selected (e.g. $60 → $42 platform fee), or remove the non-functional toggle.",
  },
  "TC-M2": {
    severity: "MEDIUM",
    fixPlan: "Wire Affiliate Forgot password to a real reset flow; do not ship href='#'.",
  },
  "TC-M4": {
    severity: "MEDIUM",
    fixPlan: "Deduplicate industry names in API/catalog before rendering the directory.",
  },
  "TC-M5": {
    severity: "MEDIUM",
    fixPlan: "Unify primary nav via a shared header component across home and inner pages.",
  },
  "TC-CRAWL": {
    severity: "HIGH",
    fixPlan:
      "SPA routes (/affiliate*, /11labs-eleven-labs) return HTTP 404 without JS. Add host rewrites to index.html or enable SSR so crawlers and shared links work.",
  },
  "TC-LOAD": {
    severity: "HIGH",
    fixPlan:
      "Under ~200 concurrent GET workers the edge returns many HTTP 429s. Tune CDN/WAF rate limits for HTML, cache marketing pages, and alert on 429 rate. Re-test after changes.",
  },
};
function reportSite() {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, "");
  if ((process.env.QA_ENV || "").toLowerCase() === "app-staging") {
    return "https://dev-app.helloalex.ai";
  }
  return "https://dev.helloalex.ai";
}

/** Marketing TC-H/M/S* plus app TC-APP-* (incl. CAMP-TAB-active). */
function extractId(title) {
  const m = String(title || "").match(
    /\b(TC-APP-[A-Z0-9]+(?:-[A-Za-z0-9]+)+|TC-[HMS]\d+)\b/,
  );
  return (m && m[1]) || "UNCATALOGUED";
}

function reproduceCmd(id, project) {
  if ((process.env.QA_ENV || "").toLowerCase() === "app-staging") {
    return `npm run test:app -- -g "${id}"`;
  }
  return `npx playwright test -g "${id}" --project=${project}`;
}

function dedupeBugs(bugs) {
  const map = new Map();
  for (const b of bugs) {
    const key = `${b.id}::${b.title}`;
    if (!map.has(key)) map.set(key, b);
  }
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return [...map.values()].sort(
    (a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9),
  );
}

function renderMarkdown(bugs) {
  const lines = [
    "# Hello Alex - Automated QA Bug Report",
    "",
    `**Generated:** ${new Date().toISOString()}`,
    `**Site:** ${reportSite()}`,
    "**Environment:** staging/test (production hosts blocked; do not set ALLOW_PROD=1)",
    "**Policy:** Proposed fixes are recommendations only. **Do not implement until approved.**",
    "",
    `## Summary: ${bugs.length} failing check(s)`,
    "",
  ];

  if (!bugs.length) {
    lines.push("All automated checks passed in this run.");
    lines.push("");
    return lines.join("\n");
  }

  for (const b of bugs) {
    lines.push(`### ${b.id} — ${b.title}`);
    lines.push("");
    lines.push(`- **Severity:** ${b.severity}`);
    lines.push(`- **Suite:** ${b.suite}`);
    lines.push(`- **Project / viewport:** ${b.project}`);
    lines.push(`- **Status:** \`${b.status}\``);
    lines.push(`- **Reproduce:** \`${b.reproduction}\``);
    lines.push("");
    lines.push("**Error**");
    lines.push("");
    lines.push("```");
    lines.push(String(b.error).slice(0, 2000));
    lines.push("```");
    lines.push("");
    lines.push("**Proposed Fix (needs approval)**");
    lines.push("");
    lines.push(b.fixPlan);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  lines.push("## Approval gate");
  lines.push("");
  lines.push(
    "Reply with the bug IDs you approve (e.g. `approve TC-H4 TC-H5`). Until then, automation will not change the website.",
  );
  lines.push("");
  return lines.join("\n");
}

class BugsReporter {
  constructor() {
    this.bugs = [];
    this.outDir = path.join(process.cwd(), "reports", "latest");
  }

  onBegin() {
    fs.mkdirSync(this.outDir, { recursive: true });
  }

  onTestEnd(test, result) {
    if (result.status === "passed" || result.status === "skipped") return;

    const id = extractId(test.title);
    const known = FIX_PLANS[id];
    const suite = (test.parent && test.parent.title) || path.basename(test.location.file);
    const evidence = (result.attachments || [])
      .filter((a) => a.path)
      .map((a) => a.path);

    let project = "default";
    try {
      project = test.parent.project().name;
    } catch (_) {}

    this.bugs.push({
      id,
      severity: (known && known.severity) || "MEDIUM",
      suite,
      title: test.title,
      project,
      error: (result.errors || []).map((e) => e.message || String(e)).join("\n") || result.status,
      evidence,
      reproduction: reproduceCmd(id, project),
      fixPlan:
        (known && known.fixPlan) ||
        "Triage failure from error + screenshot/trace; propose a targeted frontend fix. Do not apply until approved.",
      status: "pending-human-approval",
    });
  }

  onEnd() {
    const unique = dedupeBugs(this.bugs);
    fs.writeFileSync(
      path.join(this.outDir, "bugs.json"),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          site: reportSite(),
          policy:
            "No site code changes without human approval. Staging only — production hosts are blocked.",
          bugCount: unique.length,
          bugs: unique,
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(path.join(this.outDir, "bugs.md"), renderMarkdown(unique));
  }
}

module.exports = BugsReporter;
module.exports.extractId = extractId;
module.exports.dedupeBugs = dedupeBugs;
module.exports.renderMarkdown = renderMarkdown;
module.exports.reportSite = reportSite;
