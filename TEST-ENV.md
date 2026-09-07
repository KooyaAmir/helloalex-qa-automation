# Staging environments

| Profile | URL | Command |
|---------|-----|---------|
| **app-staging** (default `npm test`) | `https://dev-app.helloalex.ai` | `npm test` / `npm run test:app` |
| **staging-a** (optional marketing) | `https://dev.helloalex.ai` | `npm run test:staging-a` |
| **staging-b** | second marketing URL (`envs/staging-b.env`) | `npm run test:staging-b` |

Production (`helloalex.ai` / `app.helloalex.ai`) is **blocked**. Do **not** set `ALLOW_PROD=1`. `QA_ENV=app-staging` never targets production even if that flag is present.

## App auth (required for `test:app`)

Add to local `.env` (gitignored):

```env
QA_APP_EMAIL=you@example.com
QA_APP_PASSWORD=replace-me
```

Session is saved under `.auth/app-user.json` (gitignored).

Policy: [QA-POLICY-APP.md](./QA-POLICY-APP.md). Agent roles: [agents/README.md](./agents/README.md).

## Wire your second marketing URL

1. Edit `envs/staging-b.env`:

```env
QA_ENV=staging-b
BASE_URL=https://your-second-staging-url.here
```

2. Run:

```bash
npm run test:staging-b
npm run load:probe:b
```

## Notes

- Reports still land in `reports/latest/` (last run wins).
- Load probe is marketing-only (not app-staging) until Safety expands policy.
- If staging-b is still the placeholder URL, runs fail fast with a clear message.
