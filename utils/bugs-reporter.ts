import type {
  FullConfig,
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import fs from "fs";
import path from "path";

type Bug = {
  id: string;
  severity: string;
  suite: string;
  title: string;
  project: string;
  error: string;
  evidence: string[];
  reproduction: string;
  fixPlan: string;
  status: "pending-human-approval";
};

const FIX_PLANS: Record<string, { severity: string; fixPlan: string }> = {
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
};

function extractId(title: string): string {
  const m = title.match(/\b(TC-[HM]\d+|TC-S\d+)\b/);
  return m?.[1] ?? "UNCATALOGUED";
}

class BugsReporter implements Reporter {
  private bugs: Bug[] = [];
  private outDir = path.join(process.cwd(), "reports", "latest");

  onBegin(_config: FullConfig) {
    fs.mkdirSync(this.outDir, { recursive: true });
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === "passed" || result.status === "skipped") return;

    const id = extractId(test.title);
    const known = FIX_PLANS[id];
    const suite = test.parent?.title ?? path.basename(test.location.file);
    const evidence = result.attachments
      .filter((a) => a.path)
      .map((a) => a.path as string);

    this.bugs.push({
      id,
      severity: known?.severity ?? "MEDIUM",
      suite,
      title: test.title,
      project: test.parent?.project()?.name ?? "default",
      error: result.errors.map((e) => e.message ?? String(e)).join("\n") || result.status,
      evidence,
      reproduction: `npx playwright test -g "${id}" --project=${test.parent?.project()?.name ?? "desktop"}`,
      fixPlan:
        known?.fixPlan ??
        "Triage failure from error + screenshot/trace; propose a targeted frontend fix. Do not apply until approved.",
      status: "pending-human-approval",
    });
  }

  onEnd(_result: FullResult) {
    const unique = dedupeBugs(this.bugs);
    fs.writeFileSync(
      path.join(this.outDir, "bugs.json"),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          site: "https://helloalex.ai",
          policy: "No site code changes without human approval.",
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

function dedupeBugs(bugs: Bug[]): Bug[] {
  const map = new Map<string, Bug>();
  for (const b of bugs) {
    const key = `${b.id}::${b.title}`;
    if (!map.has(key)) map.set(key, b);
  }
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return [...map.values()].sort(
    (a, b) => (order[a.severity as keyof typeof order] ?? 9) - (order[b.severity as keyof typeof order] ?? 9),
  );
}

function renderMarkdown(bugs: Bug[]): string {
  const lines: string[] = [
    "# Hello Alex — Automated QA Bug Report",
    "",
    `**Generated:** ${new Date().toISOString()}`,
    "**Site:** https://helloalex.ai",
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
    lines.push(b.error.slice(0, 2000));
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

export default BugsReporter;
