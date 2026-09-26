# Stable execution context

Load in this exact order:

1. `tasks/prd-02.2-janela-de-contexto-do-claude-code/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T12 — Overhead budgets and platforms proven on the CI matrix

## Outcome

The corrected change runs on the CI matrix (Linux, macOS, Windows), and the TC-20 p95 values for the bridge and the hooks are recorded against NFR-01 (bridge at most 50 ms, hooks at most 100 ms over baseline), along with the T10 real-shell cases.

## Dependencies and boundaries

- Depends on: T07, T08, T10, T11, T13, T14
- Unblocks: re-review (codereview_02)
- In scope: running CI on the corrected state, collecting p95 values, and, if a budget fails on CI, diagnosing and reporting the cause.
- Out of scope: changing budgets or the CI rule (a contract change, exception HIL).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-04 | `codereview.md#findings` | Budget unproven; the local run passes only through the local rule (NFR-01, OBJ-04, TC-20) |
| codereview_01/CR-03 | `codereview.md#findings` | Platform evidence for NFR-06 |

## Requirements

- CI runs on a pushed branch with a pull request against `master` (the workflow triggers on `pull_request`); pushing requires user authorization.
- Record per OS the p95 values printed by `statusline-overhead.test.ts` and `runtime-overhead.test.ts`.
- If a CI budget fails, record the measured cause and return to the coordinator; do not relax the rule.

## Context to recover on demand

- TechSpec: DEC-13, TC-20, NFR-01
- Code: `tests/integration/statusline-overhead.test.ts`, `tests/integration/runtime-overhead.test.ts`, `.github/workflows/ci.yml`

## Work

- [ ] T12.1 With authorization, commit the feature on a branch, push, and open a draft PR.
- [ ] T12.2 Collect CI results and p95 values per OS into this handoff.

## Acceptance criteria

- CI green on all matrix jobs, TC-20 within the CI rule, T10 cases passing without skips.

## Verification

- Unit: not applicable.
- Integration: TC-20 and T10 on CI.
- End-to-end: TC-21 on CI.
- Manual: not applicable.
- Platforms: ubuntu, macos, windows with Node 20, 22, 24.
- Environment dependency: GitHub Actions; authorization to push a branch and open a PR (exception HIL).
- Commands: `gh pr checks`, `gh run view --log`
- Expected evidence: CI run URL and a p95 table per OS.

## Affected files

- Modify: none (handoff only), unless the user authorizes a fix after a failure.

## Observability and recovery

- Operational signal: CI job logs.
- Recovery: close the draft PR and delete the branch.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Pending execution.
- Changed files: Pending execution.
- Checks: Pending execution.
- Validated state: Pending execution (code or diff, configuration, platform, and environment).
- Open items: Pending execution.
