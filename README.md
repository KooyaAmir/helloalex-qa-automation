# Hello Alex QA Automation

Parallel Playwright suites for the Hello Alex **client app** on staging.

**Primary scope:** `https://dev-app.helloalex.ai` (`npm test` / `npm run test:app`). See [PROJECT-DECISIONS.md](./PROJECT-DECISIONS.md).

**Policy:** Detect regressions + write fix plans. No product PRs unless you approve specific TCs. Production hosts (`helloalex.ai` / `app.helloalex.ai`) are **blocked**. Do **not** set `ALLOW_PROD=1`.

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
# Required: QA_APP_EMAIL + QA_APP_PASSWORD
```

## Run

```bash
npm test                 # app-staging (dev-app)
npm run test:app         # same
npm run check:guards     # offline prod-denylist + reporter ID checks
npm run test:marketing   # optional marketing staging-a
```

Nightly: [.github/workflows/qa-app-nightly.yml](./.github/workflows/qa-app-nightly.yml) — add `QA_APP_EMAIL` / `QA_APP_PASSWORD` Actions secrets; **you** promote what is trusted.

See [TEST-ENV.md](./TEST-ENV.md), [QA-POLICY-APP.md](./QA-POLICY-APP.md), [agents/README.md](./agents/README.md).

## Outputs

| Path | Purpose |
|------|---------|
| `reports/latest/` | Bugs, triage, safety, orchestrator merges |
| `playwright-report/` | HTML report / traces |
| Cursor canvas | Live results dashboard beside chat |
