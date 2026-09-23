# T12 — Make all 20 long-task sessions finish clean

## Outcome

Every one of the 20 sessions per full-level harness ends with a valid checkpoint, a prefixed commit, and a clean working tree.

## Dependencies and boundaries

- Depends on: none for the test correction; T11 reconciles T09 after its evidence is produced.
- Unblocks: T11 final T09 reconciliation and re-review.
- In scope: fixture recovery and CA-17 assertion.
- Out of scope: changing product failure policy or removing failure coverage.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_01/CR-03` | `codereview.md#Findings` | A failure profile may leave modified config in a counted session |
| CA-17; TC-17 | `prd.md#Critérios de aceitação`, `techspec.md#Test approach` | Twenty clean sessions per harness |

## Requirements

- Keep `failure_above_ceiling` in the catalog and retain its fail-closed/error-log assertions.
- Restore the fixture's valid configuration after the failure probe, before the final status assertion; ensure the agent's checkpoint and commit remain valid.
- Require empty `git status --porcelain` for every counted session with no profile-specific exception.

## Context to recover on demand

- Rules: `tests.md`, `harness-adapters.md`.
- Code: `tests/support/harness-simulator/agent-profiles.ts`, `session-recorder.ts`, `tests/e2e/e2e-simulated-long-task.test.ts`.
- Original task: `done/task_09.md#Acceptance criteria` and `#Handoff`.

## Work

- [x] T12.1 Add a deterministic recovery step for the intentionally corrupted config after the failure assertion.
- [x] T12.2 Require clean status in all 20 sessions per harness, including `failure_above_ceiling`.
- [x] T12.3 Run the long-task suite and record per-harness counts and the failure-profile result.

## Acceptance criteria

- The test still proves fail-closed behavior above the ceiling and records `INVALID_CONFIG`.
- All counted sessions assert an empty final Git status, valid checkpoint, and `checkpoint:` commit.
- State files remain excluded from commits.

## Verification

- Unit: not applicable.
- Integration: fixture recovery behavior if extracted into a helper.
- End-to-end: rerun `e2e-simulated-long-task` against temporary fixture repositories; all 20 sessions per harness pass.
- Manual: none.
- Platforms: Linux, macOS, Windows; local Windows evidence and existing matrix gap recorded.
- Environment dependency: Git on `PATH` with explicit skip if absent.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`.
- Expected evidence: all session assertions and clean status for the failure profile.

## Affected files

- Modify: `tests/e2e/e2e-simulated-long-task.test.ts`, `tests/support/harness-simulator/agent-profiles.ts` or `session-recorder.ts` only if needed for recovery.
- Create: none expected.

## Observability and recovery

- Operational signal: assertion names harness/profile and final status on failure.
- Recovery: tests clean up their temporary repositories.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Captured the installed fixture configuration before the intentional corruption, asserted `INVALID_CONFIG` after the fail-closed probe, restored the exact captured bytes, and required an empty final `git status --porcelain` for every counted session. The checkpoint validator, prefixed commit, and state-file exclusion assertions remain in place. The suite label cites TC-17 and CA-17.
- Changed files: `tests/e2e/e2e-simulated-long-task.test.ts`.
- Checks: `npm test -- e2e-simulated-long-task -t "session 18" --maxWorkers=4` passed all five failure-profile sessions; `npm run build`, `npm run lint`, `npm run typecheck`, and `git diff --check` passed. `npm run coverage -- --maxWorkers=2` passed the full suite and coverage gate, including all 100 long-task sessions (20 each for Claude Code, Cursor, GitHub Copilot CLI, Pi, and Oh-My-Pi). An earlier four-worker coverage run had four load-sensitive failures outside T12; the affected boot-Git, Codex-root, and runtime-overhead suites passed in isolation before the successful two-worker full run.
- Validated state: Windows 11, Node 24, Git available, built CLI and runtime assets; five of five `failure_above_ceiling` sessions log `INVALID_CONFIG`, retain the denied out-of-allowlist call, and finish with a clean tree.
- Open items: Linux/macOS and Node 20/22 matrix remains the accepted platform evidence limit. T11 must reconcile T09's original handoff and manifest link; `codereview_01` remains REJECTED until independent re-review.
