#!/usr/bin/env node
/** Rebuild bugs.md from reports/latest/bugs.json */
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { renderMarkdown } = require("../utils/bugs-reporter.cjs");

const dir = path.join(process.cwd(), "reports", "latest");
const jsonPath = path.join(dir, "bugs.json");
if (!fs.existsSync(jsonPath)) {
  console.error("No reports/latest/bugs.json — run npm test first.");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const bugs = Array.isArray(data.bugs) ? data.bugs : [];
if (data.site && !process.env.BASE_URL) {
  process.env.BASE_URL = String(data.site);
}
const mdPath = path.join(dir, "bugs.md");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(mdPath, renderMarkdown(bugs));

console.log(`Rebuilt ${mdPath} from ${bugs.length} bug(s) in ${jsonPath}`);
console.log(`Site: ${data.site || "(unset)"}`);
