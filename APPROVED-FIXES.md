# Approved fixes — awaiting application

**Approved by user:** 2026-07-24  
**IDs:** `TC-H1` · `TC-H2` · `TC-H3` · `TC-H5`  
**Status:** Specs ready · **blocked on Hello Alex app repository** (this workspace is QA automation only)

Not approved (do not change yet): TC-H4, TC-H6, TC-M1, TC-M2, TC-M4, TC-M5, …

---

## TC-H1 — Industries CTA flashes `See all 0+ industries`

### Problem
On `/`, the industries CTA accessible name / label briefly shows **“See all 0+ industries”** while `/api/industries` loads (~1s), then becomes **“See all 200+ industries”**.

### Root cause (observed)
Count is initialized to `0` and animated/bound into the button label before the API resolves.

### Implementation
1. Find the homepage Industries CTA component (search for `See all`, `industries`, or the industries counter).
2. Choose one:
   - **Preferred:** Don’t put the live count in the CTA until data is ready — show a static label `See all 200+ industries` (or skeleton without “0”).
   - **Alt:** Keep the count but only mount/update the label after `industries.length > 0` (or after fetch success). Never render `0` into the accessible name.
3. Do **not** animate the accessible name from 0 → N. If you animate, animate a decorative element only, not `aria-label` / button text used by AT.

### Acceptance
`npx playwright test -g "TC-H1"` passes on desktop + mobile + tablet.  
No snapshot of button text matches `/0\+?\s*industries/i` during the first 8s after navigation.

---

## TC-H2 — Conflicting call-volume metrics

### Problem
Public “calls handled” claims disagree:

| Location | Claim |
|----------|--------|
| Homepage / pricing | **2.4M** / **2.4M+** |
| Investors | **4.5M+** |

### Implementation
1. Create a single source of truth, e.g. `content/metrics.ts` or CMS fields:

```ts
export const PUBLIC_METRICS = {
  callsHandledDisplay: "2.4M+", // OR "4.5M+" — pick one real number
} as const;
```

2. Replace hard-coded strings on homepage, pricing trust strip, and investors (hero + timeline) with that constant.
3. Document the chosen number and last verification date in a comment or CMS note.

### Acceptance
`npx playwright test -g "TC-H2"` — at most one distinct calls-handled figure site-wide among `/`, `/pricing`, `/investors`.

---

## TC-H3 — Conflicting language / voice counts

### Problem
- Homepage shows both **40+** and **65+** languages (and scrapes may also see **12**).
- Voices: homepage **900+** vs ElevenLabs page **1000+**.

### Implementation
1. Decide product truth:
   - **Runtime / Hello Alex supported languages:** one number (e.g. `65`).
   - **Voice library (ElevenLabs):** may differ — must be labeled as such.
2. Shared constants, e.g.:

```ts
export const PUBLIC_METRICS = {
  languagesSupported: "65+",
  professionalVoicesHelloAlex: "900+",
  elevenLabsVoicesInLibrary: "1000+", // only on /11labs-eleven-labs, labeled
};
```

3. Homepage: use **one** language figure everywhere (feature tabs + trust row). Remove the other or qualify it (“40+ call languages” vs “65+ UI languages” only if both are true and clearly labeled).
4. ElevenLabs page: keep `1000+` only with copy like “in the ElevenLabs library”, not as “Hello Alex has 1000+ voices” if the product surface is 900+.

### Acceptance
`npx playwright test -g "TC-H3"` — homepage language counts ≤ 1 distinct value; voice claims either match or are scoped so the test (or an updated scoped assertion) passes.

---

## TC-H5 — Mobile header missing Features / Industries / Affiliates

### Problem
At ~390×844, header shows Logo · Pricing · Get started. Features / Industries / Affiliates are not reachable; automation found no complete menu exposing **Industries**.

### Implementation
1. Find the marketing site header used on `/`.
2. Below the desktop breakpoint (match existing Tailwind/CSS breakpoint, often `md`/`lg`):
   - Add an accessible control: `aria-label="Open menu"` / `aria-expanded`.
   - Drawer/sheet must include at least: **Features**, **Industries**, **Affiliates**, **Pricing**, **Get started** (plus any other primary home links).
3. Ensure links are real `<a href="...">` (or buttons that navigate), visible when the menu is open.
4. Desktop behavior unchanged (≥768 or current tablet breakpoint that already works).

### Acceptance
`npx playwright test -g "TC-H5" --project=mobile` passes: either links visible, or hamburger opens and all three names are visible.

---

## Backlog (not yet approved for code change — specs ready)

### TC-H6 — Platform fee + FAQ
Show `$60`/`$42` platform fee on plan cards; rewrite “no hidden costs / price you see” FAQ.

### TC-M1 — Annual toggle
Update card prices when Annual selected, or remove toggle.

### TC-M2 — Affiliate forgot password
Replace `href="#"` with real reset flow.

### TC-M4 — Duplicate Dental Practice
Deduplicate industries API/catalog.

### TC-M5 — Nav drift
Shared header: Affiliates (and peers) on all marketing pages.

---

## How to apply (unblock)

1. Open / clone the **Hello Alex frontend** repo in Cursor (or send the path / GitHub URL).
2. Say: `apply approved fixes TC-H1 TC-H2 TC-H3 TC-H5`
3. After merge, re-run:

```bash
cd C:\Users\burge\Downloads\helloalex-qa-automation
npm test -- -g "TC-H1|TC-H2|TC-H3|TC-H5"
```
