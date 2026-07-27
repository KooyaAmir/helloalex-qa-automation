#!/usr/bin/env node
/** Rebuild bugs.md from bugs.json if needed */
import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "reports", "latest");
const jsonPath = path.join(dir, "bugs.json");
if (!fs.existsSync(jsonPath)) {
  console.error("No reports/latest/bugs.json — run npm test first.");
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
console.log(`Loaded ${data.bugCount} bugs from ${jsonPath}`);
console.log("bugs.md is written by the Playwright bugs reporter on each test run.");
