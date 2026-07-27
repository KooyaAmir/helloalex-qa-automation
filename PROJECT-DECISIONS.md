# Project decisions (locked 2026-07-24)

Human answers that steer Hello Alex QA automation.

| # | Decision |
|---|----------|
| 1 | **Primary surface:** `dev-app.helloalex.ai` only (marketing suites optional / not the goal) |
| 2 | **Next coverage priority:** untreated nav — Tasks, Knowledge Base, CRM, SIP Trunks, AI Intelligence |
| 3 | **Execution mode:** scheduled nightly runs |
| 4 | **QA user (for now):** `amir@…` via env — rotate when a dedicated QA account exists |
| 5 | **App host:** only `https://dev-app.helloalex.ai` |
| 6 | **Extra denylist:** never touch real CRM sync, SIP provision, voice clone, or similar side effects |
| 7 | **Product repo:** available later — connect when ready; until then QA-only + fix plans |
| 8 | **Failure classes:** report both **product bugs** and **staging drift** |
| 9 | **Orchestration later:** Cursor SDK / Automation loop (not now) |
| 10 | **Promote to CI / trust:** **human only** (you) |
| 11 | **Reporting UI:** Cursor canvas dashboard |
| 12 | **Product fixes:** open PRs in product repo **only** when you approve specific TCs |

## Implications

- Default `npm` scripts and nightly CI should target `QA_ENV=app-staging`.
- Marketing `staging-a/b` remains available but is not the success metric.
- Safety denylist includes CRM connect/sync, SIP provision, voice clone.
- Canvas at workspace `canvases/helloalex-app-qa.canvas.tsx` is the results surface.
- No auto-PRs against product code until you approve a TC by name.
