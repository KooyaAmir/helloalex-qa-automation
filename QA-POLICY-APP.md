# QA Policy — Client App (`dev-app.helloalex.ai`)

Tests detect regressions and write fix plans. They do **not** change production product code unless you explicitly approve a TC for a product PR.

**Primary scope:** `https://dev-app.helloalex.ai` only (`QA_ENV=app-staging`). See `PROJECT-DECISIONS.md`.

## Allowed hosts

| Host | Role |
|------|------|
| `https://dev-app.helloalex.ai` | App staging (**only** app target for now) |

Production app hosts (`app.helloalex.ai`, `helloalex.ai`) are **blocked**. Do **not** set `ALLOW_PROD=1`. `QA_ENV=app-staging` refuses production even if that flag is present. Alternate *staging* app hosts need `ALLOW_APP_ALT=1`.

## Credentials

- Use `QA_APP_EMAIL` / `QA_APP_PASSWORD` from environment or local `.env` only (current: staging user `amir` until dedicated QA account).
- Never commit passwords, storage-state dumps, or auth cookies.
- Rotate password if it was shared in chat.

## Allowed actions

- Navigate, open sidebar sections, assert UI presence
- Login / logout / session checks
- Open forms, fill fields, assert validation — **abort before submit** when submit would spend credits or create paid resources
- Intercept network / mock responses for negative paths

## Blocked actions (Safety Agent denylist)

Do **not** automate clicks that would:

- Place a real outbound call or send SMS/batch
- Buy or provision a phone number (`Request Number` / Buy)
- Charge a card / complete paid checkout
- Delete account, wipe CRM data, mass-delete contacts, or irreversible deletes
- **Connect / sync live CRM** (OAuth connect, force sync that mutates CRM)
- **Provision or mutate SIP trunks**
- **Clone voice** / start paid voice training
- Launch campaigns that spend credits
- Mutate production

If a test needs such a flow, assert the control exists (visible) and **do not** complete the side effect.

## Reporting & promotion

- Failures: classify as **product bug** or **staging drift** (both matter).
- Results surface: Cursor canvas dashboard.
- **Only you** promote suites into trusted nightly / CI.
- Product PRs: only after you approve specific TC IDs.

## Supervision invariant

An agent that **wrote** a suite cannot be the sole **approver** of that suite. Reviewer + Safety must pass; you approve promotion.
