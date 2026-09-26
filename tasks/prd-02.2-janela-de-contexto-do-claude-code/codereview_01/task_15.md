# Stable execution context

Load in this exact order:

1. `tasks/prd-02.2-janela-de-contexto-do-claude-code/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T15 — Overhead budgets match the measured cost of a Node bridge

## Outcome

PRD NFR-01/OBJ-04, TechSpec DEC-13 and TC-20, and `statusline-overhead.test.ts` use the budgets approved in DEC-HIL-05, and the CI matrix passes TC-20 on Linux, macOS, and Windows.

## Dependencies and boundaries

- Depends on: T12 evidence (CI run 36256275030)
- Unblocks: T12 (closed by a green CI rerun)
- In scope: budget text in PRD and TechSpec; the bridge and hook CI rules in `statusline-overhead.test.ts`.
- Out of scope: bridge design (DEC-02/DEC-03 unchanged); PRD 2.1 hook budget in `runtime-overhead.test.ts` (unchanged, 100 ms).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-04 | `codereview.md#findings` | Budget unproven; CI shows the bridge costs one Node cold start (NFR-01, OBJ-04, TC-20) |
| workflow.md/DEC-HIL-05 | `workflow.md#human-decisions-log` | Approved budget revision |

## Requirements

- Bridge: p95 of the pipeline minus p95 of the user command alone is at most 50 ms plus the p95 of an empty `node -e` measured in the same test (one Node start).
- Hooks with 200 `statusline` lines: p95 minus the empty-Node baseline is at most 120 ms on CI.
- Local rule unchanged in form: `max(target, baseline*3 + 150)`.
- PRD NFR-01 and OBJ-04 state the new budgets and cite DEC-HIL-05; the PRD 2.1 hook budget of 100 ms stays for hooks without the bridge.

## Context to recover on demand

- TechSpec: DEC-13, TC-20
- Code: `tests/integration/statusline-overhead.test.ts` (`BRIDGE_TARGET_MS`, `HOOK_TARGET_MS`, `assertBudget`)
- Evidence: `codereview_01/task_12.md#handoff`

## Work

- [ ] T15.1 Amend PRD NFR-01 and OBJ-04, TechSpec DEC-13 and TC-20.
- [ ] T15.2 Measure one Node start in the bridge case and add it to the bridge target; raise the hook target to 120 ms.
- [ ] T15.3 Push to PR #2 and confirm TC-20 on the CI matrix (evidence goes to T12).

## Acceptance criteria

- TC-20 passes on all nine CI jobs.
- The measured budgets would still fail a bridge that adds more than 50 ms beyond one Node start.

## Verification

- Unit: not applicable.
- Integration: `tests/integration/statusline-overhead.test.ts` locally and on CI.
- End-to-end: not applicable.
- Manual: not applicable.
- Platforms: ubuntu, macos, windows with Node 20, 22, 24.
- Environment dependency: GitHub Actions; push to the existing branch is covered by DEC-HIL-04.
- Commands: `npm run lint`, `npm run typecheck`, `npx vitest run tests/integration/statusline-overhead.test.ts`, `gh pr checks 2`
- Expected evidence: CI run URL with TC-20 green on every job; p95 lines per OS.

## Affected files

- Modify: `tasks/prd-02.2-janela-de-contexto-do-claude-code/prd.md`, `tasks/prd-02.2-janela-de-contexto-do-claude-code/techspec.md`, `tests/integration/statusline-overhead.test.ts`

## Observability and recovery

- Operational signal: `[overhead]` lines in CI logs.
- Recovery: revert the test constants and document text.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Pending execution.
- Changed files: Pending execution.
- Checks: Pending execution.
- Validated state: Pending execution (code or diff, configuration, platform, and environment).
- Open items: Pending execution.
