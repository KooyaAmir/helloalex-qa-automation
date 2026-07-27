# Approved swarm plan — Phase tracker

Human approved the multi-agent supervised QA plan.

| Phase | Status | Notes |
|-------|--------|--------|
| 0 Foundations | **Complete** | env, auth, policy, agents, auth-shell scaffold |
| 1 Auth + shell green | **GO** | Reviewer patched + SAFE + Triage green; see `reports/latest/ORCHESTRATOR-PHASE1.md` |
| 2 Domain smokes | **GO** | Safety SAFE + Reviewer R1–R5 patched + 56 passed |
| 2b Untreated nav | **Green** | 8 cases incl. Memory / Integrations / Support |
| 2c Studio/Billing depth | **Merged** | STUDIO-04/05 + BILLING-03..05 |
| 2d Campaigns/Contacts abort | **Merged** | CAMP-02 + CONTACTS-02 (PR #3) |
| 2e Account / Phone / Tasks / KB depth | **Merged** | ACCOUNT-01, PHONE-02, TASKS-02, KB-02 (PR #4) |
| 2f Voices / Memory / Support depth | **Merged** | STUDIO-06, MEMORY-02, SUPPORT-02 (PR #4) |
| 2g Batch abort + CRM/SIP gate | **Merged** | CALLS-06, SMS-06, CRM-02, SIP-02 |
| 2h Dashboard / Integrations / AI depth | **Merged** | DASH-01, INTEG-02, AI-02 |
| 2i Campaigns full-flow QA | **Merged** | CAMP-03..10 + all tab destinations |
| 3 Nightly + canvas | **Hardened** | Secrets gate + job summary; canvas coverage refresh |
| 4 SDK loop | **Scaffolded** | Needs `@cursor/sdk` + `CURSOR_API_KEY` |
| 5 Product PRs | **Blocked** | Connect app repo + approve TCs |

See `agents/` for role prompts. Invariant: writer ≠ sole approver.
