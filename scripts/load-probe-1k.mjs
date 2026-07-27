#!/usr/bin/env node
process.env.USERS = process.env.USERS || "200";
process.env.DURATION_S = process.env.DURATION_S || "60";
await import("./load-probe.mjs");
