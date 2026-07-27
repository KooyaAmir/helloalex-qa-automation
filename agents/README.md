# Agent swarm — how to run

Approved plan: multi-agent supervised QA for marketing + `dev-app`.

| Role | Prompt | Supervises / supervised by |
|------|--------|----------------------------|
| Orchestrator | `orchestrator.md` | Spawns all; supervised by you (human) |
| Spec | `spec.md` | Orchestrator |
| Builder | `builder.md` | Reviewer |
| Reviewer | `reviewer.md` | Builders; Safety |
| Safety | `safety.md` | Reviewer + Builders |
| Runner | `runner.md` | Triage |
| Triage | `triage.md` | Runner; Builders on bad tests |
| Adversarial | `adversarial.md` | Spec + Orchestrator |

## Invariant

Writer ≠ sole approver.

## Suggested Task spawn order (Phase 1)

1. Orchestrator (this backlog)
2. Spec — extend `specs/app/` if needed
3. Builder Auth+Shell — already scaffolded; fill gaps only
4. Reviewer → Safety on `suites/app/*`
5. Runner — `npm run test:app`
6. Triage → Adversarial
