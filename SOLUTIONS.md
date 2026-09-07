# Solutions & remaining gaps

> Historical marketing-suite notes. Primary QA target is `https://dev-app.helloalex.ai` (not production).

**Site (historical marketing):** https://dev.helloalex.ai  
**Updated:** 2026-07-24  
**Constraint:** This repo cannot patch product UI without the Hello Alex app source. Phase 5 product PRs stay blocked.

---

## What we can / did solve here

| Gap | Solution in this project |
|-----|--------------------------|
| One-at-a-time manual QA | Parallel Playwright suites (`npm test`) |
| Broken / dead links | `suites/link-crawl.spec.ts` → `reports/latest/link-crawl.json` |
| Perf visibility | `suites/perf-smoke.spec.ts` → `reports/latest/perf-homepage.json` |
| “Will 1k users crash it?” | `npm run load:probe` (default 50 VUs) and `npm run load:probe:1k` (scaled probe — not full browser certification) |
| Stripe / checkout risk | `suites/checkout-safe.spec.ts` — opens modals, **never pays** |
| Client dashboard | Login-gate assertion only |
| Video call | Smoke entry UI only; no long LiveAvatar soak |
| Bug tracking | `reports/latest/bugs.md` + fix plans |
| Approved product bugs | Specs in `APPROVED-FIXES.md` (TC-H1/H2/H3/H5) |

---

## Product bugs — fix path

| ID | Status | Solution |
|----|--------|----------|
| TC-H1, H2, H3, H5 | **Approved** | Implement in app repo per `APPROVED-FIXES.md` |
| TC-H6, M1–M5 | Pending your approval | Same pattern once approved + app repo |
| Without app repo | Blocked | Open frontend repo in Cursor → `apply approved fixes` |

---

## Items that need credentials / staging (cannot fully “fix” from public QA)

| Item | Solution |
|------|----------|
| Authenticated dashboard / billing | Provide staging login → add `suites/dashboard.spec.ts` against staging `BASE_URL` |
| Real Stripe charge | Use Stripe **test mode** keys + test card on staging only |
| Create affiliate accounts | Staging affiliate API or disposable inbox; never against prod |
| Video call soak | Staging LiveAvatar budget + time-boxed soak script |
| True 1,000 concurrent **browsers** | k6/Playwright cloud or Artillery with browser scenario on staging; prod probe stays GET-only |

---

## Capacity / 1,000 users

| Probe | Result | Solution |
|-------|--------|----------|
| 50 VU × 20s GET | **PASS** (0 errors, p95 ~563ms) | Baseline OK for light traffic |
| 200 VU × 60s GET | **FAIL** — ~44% **HTTP 429** | Tune WAF/CDN rate limits; cache HTML; monitor 429s. Site did not crash — it **throttled**. True 1k browser sessions still uncertified. |

Artifacts: `reports/latest/load-probe.json`

## SPA HTTP 404 (new)

Affiliate + ElevenLabs paths return **HTTP 404** on plain GET while working in-browser.

**Solution:** Host rewrite all marketing routes → `index.html` (or SSR). Track as go-live blocker for SEO/shares.
