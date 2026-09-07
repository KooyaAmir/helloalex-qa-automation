# Go-live & capacity status

> Historical marketing-staging snapshot. Primary QA target is now `https://dev-app.helloalex.ai` (not production `helloalex.ai`). See [PROJECT-DECISIONS.md](./PROJECT-DECISIONS.md).

**Generated:** 2026-07-24  
**Site (historical):** https://dev.helloalex.ai

## Short answers

| Question | Answer |
|----------|--------|
| All tests finished? | **Marketing QA + new gap suites: largely yes.** Auth/billing/Stripe charge/affiliate create/video soak still need staging. |
| Ready to go live? | **Not clean.** Ship only as soft launch if HIGH product bugs + SPA HTTP 404s are accepted. |
| Crash at 1,000 users? | **Unlikely to hard-crash static pages**, but a **200-worker / 60s GET probe** already returned **~44% HTTP 429** (rate limit). Burst traffic will be throttled, not served cleanly. |

---

## Evidence this session

### Load probe (public GET `/`, `/pricing`, `/about`, `/support`)

| Probe | Workers | Duration | Requests | Errors | p95 | Verdict |
|-------|---------|----------|----------|--------|-----|---------|
| `npm run load:probe` | 50 | 20s | 2,383 | **0** | 563ms | **PASS** |
| `npm run load:probe:1k` | 200 | 60s | 28,386 | **12,461 (429)** | 818ms | **FAIL** (rate limited) |

**Solution (ops, not app UI):** raise/tune WAF/rate limits for HTML GETs, ensure CDN caches marketing pages, separate API rate limits from static assets, add monitoring on 429 rates. Do **not** interpret 429 as “server crashed” — it is protective throttling that still breaks UX under burst.

### Link crawl

- Browser navigation to affiliate / ElevenLabs routes **renders**.
- Raw HTTP GET to `/affiliate`, `/affiliate/login`, `/affiliate/register`, `/affiliate/terms`, `/11labs-eleven-labs` returns **404** → **no SSR/static fallback** (SEO, social previews, non-JS clients fail).

**Solution (app/hosting):** configure host (Vercel/Netlify/nginx) to serve `index.html` for SPA routes, or enable SSR for those paths.

### Checkout / auth / video / perf

- Starter checkout opens; platform fee visible; **stopped before pay** (PASS).
- Consulting modal opens (PASS).
- Client dashboard login-gated (PASS).
- Video Call CTA opens shell (PASS earlier).
- Perf metrics recorded in `reports/latest/perf-homepage.json` (runner network can inflate FCP).

---

## Product bugs still blocking “ready”

| ID | Status |
|----|--------|
| TC-H1, H2, H3, H5 | Approved — need **app repo** to implement (`APPROVED-FIXES.md`) |
| TC-H6 (+ mediums) | Not approved yet — specs in backlog |
| SPA HTTP 404 | New finding — needs hosting/SSR fix |

---

## What we cannot finish without you

1. **Hello Alex frontend repo** → apply approved UI fixes  
2. **Staging credentials** → dashboard / billing / Stripe test mode / affiliate create  
3. **Ops access** → CDN/WAF rate-limit tuning for real 1k concurrent browsers  

Details: `SOLUTIONS.md`
