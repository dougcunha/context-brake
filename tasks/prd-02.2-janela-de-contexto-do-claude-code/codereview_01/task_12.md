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

- [x] T12.1 With authorization, commit the feature on a branch, push, and open a draft PR.
- [x] T12.2 Collect CI results and p95 values per OS into this handoff.

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

- Produced result: CI run 36256275030 on commit `66e46cf` (branch `feat/prd-02.2-claude-context-window`, draft PR https://github.com/dougcunha/context-brake/pull/2). Ubuntu passes on Node 20/22/24; macOS and Windows fail on all three, only in `tests/integration/statusline-overhead.test.ts` (TC-20). Every other file passes on every job, including `e2e-statusline-shell` (4/4, CR-03) and `statusline-diagnostics-symlink` (3/3), with no skips.
- p95 over baseline, first run of each job (bridge vs user command / PreToolUse / PostToolUse with 200 `statusline` lines; budget 50 / 100 / 100 ms):

  | Job | Bridge | PreToolUse | PostToolUse | Result |
  | --- | --- | --- | --- | --- |
  | ubuntu Node 20 | +47.2 | +71.1 | +72.5 | pass |
  | ubuntu Node 22 | +47.8 | +74.7 | +77.8 | pass |
  | ubuntu Node 24 | +37.1 | +47.1 | +48.8 | pass |
  | macOS Node 20 | +40.2 | **+105.8** | +49.4 | fail |
  | macOS Node 22 | **+68.4** | — | — | fail |
  | macOS Node 24 | +47.9 (2nd run **+50.6**) | +69.6 | +63.9 | fail |
  | Windows Node 20 | **+65.7** | +93.8 | +99.1 | fail |
  | Windows Node 22 | **+64.7** | +91.7 | +87.8 | fail |
  | Windows Node 24 | **+62.4** | +73.0 | +76.8 | fail |

- Cause (measured): the bridge sits in the pipeline as a second Node process, so the user's status line waits for one Node cold start of the bundled bridge. The empty `node -e` baseline on the same runners is 42–57 ms p95 on Windows and 34–85 ms on macOS, so a Node bridge cannot fit 50 ms there; on Linux (baseline 22–30 ms) it fits. Hook overhead with 200 `statusline` lines is close to the 100 ms budget on Windows (+88 to +99 ms) and noisy on macOS (one +105.8 ms outlier; PRD 2.1 hooks without those lines measure +38 to +82 ms in `runtime-overhead` on the same jobs).
- Changed files: none.
- Checks: `gh pr checks 2`; job logs parsed for `[overhead]` lines and assertions.
- Validated state: commit `66e46cf`, GitHub Actions ubuntu/macos/windows-latest, Node 20/22/24, 2026-09-26.
- Open items: NFR-01/OBJ-04 are not met on macOS and Windows. Changing the budget or the bridge design is a contract change, so T12 stays open pending an exception HIL decision (BLK-01 in `checkpoint.json`).
