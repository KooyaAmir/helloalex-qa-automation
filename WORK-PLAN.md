# Hello Alex QA Automation — Work Plan

**Target:** https://helloalex.ai  
**Rule:** Detect + document bugs with fix plans. **Do not change site code until a human approves.**

## Agents

- [Architecture plan](0191ca18-32e7-4812-b57f-c0ef9c11568c) — Playwright stack, parallel suites, reporting
- [Coverage map](b84ece40-3159-4f44-a80f-161c2658bb43) — HIGH/MED regression IDs + smoke canaries

## Stack

Playwright + TypeScript, `fullyParallel: true`, multi-project viewports (desktop 1440 / mobile 390 / tablet 768). Soft assertions where possible so one run lists all violations.

## Parallel suites

| Suite | Encodes |
|-------|---------|
| `smoke-health` | Pages load, CTAs, affiliate login shell |
| `content-integrity` | TC-H1 industries `0 +`, TC-M4 duplicate Dental |
| `navigation-links` | TC-H4 footer hashes, page reachability |
| `responsive-nav` | TC-H5 mobile hamburger / missing nav |
| `pricing-transparency` | TC-H6 platform fee, FAQ, TC-M1 annual toggle |
| `cross-page-consistency` | TC-H2 / TC-H3 conflicting metrics |
| `affiliate-auth` | TC-M2 forgot password |

## Commands

```bash
npm test          # run all suites in parallel
npm run bugs      # rebuild bugs.md from last JSON (if needed)
```

## Outputs

- `reports/latest/bugs.md` — human report + **Proposed Fix (needs approval)**
- `reports/latest/bugs.json` — machine-readable, `status: pending-human-approval`
- `playwright-report/` — HTML traces

## Out of scope

- Real Stripe charges, creating live accounts, live video-call sessions
- Applying site fixes without explicit approval
