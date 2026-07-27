# SDK nightly loop

Optional post-Playwright triage via Cursor SDK (`PROJECT-DECISIONS.md` #9).

## Setup

```bash
npm install @cursor/sdk --save-dev
# set CURSOR_API_KEY in the environment
```

## Commands

```bash
npm run test:app      # Playwright app-staging
npm run sdk:triage    # Agent triages reports/latest → TRIAGE-APP.md
npm run nightly:local # test:app then sdk:triage
```

## Guards

- Does **not** promote CI (you only).
- Does **not** open product PRs.
- Skips cleanly if `CURSOR_API_KEY` or `@cursor/sdk` is missing.
