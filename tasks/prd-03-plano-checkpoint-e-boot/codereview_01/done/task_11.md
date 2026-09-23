# T11 — Restore the T09 manifest link and evidence state

## Outcome

The T09 manifest link resolves, and T09 is marked complete only after the CA-17 evidence is corrected.

## Dependencies and boundaries

- Depends on: T12.
- Unblocks: final review traceability.
- In scope: manifest link, T09 state, and original task handoff reconciliation.
- Out of scope: changes to the review report or implementation code.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_01/CR-02` | `codereview.md#Findings` | T09 link points to a missing root file |
| T09 | `tasks.md#Tasks`, `#State` | Task file and evidence remain reachable and accurate |

## Requirements

- Link T09 to `done/task_09.md` while it remains there; if the DAG owner reopens T09, link to its actual location and keep state aligned.
- Record the review's incomplete-T09 finding without erasing the previous handoff. Mark completion only after T12's clean-tree evidence.

## Context to recover on demand

- Rules and skills: `sdd-orchestrate-tasks` state reconciliation, `sdd-execute-corrections`.
- Files: `tasks.md`, `done/task_09.md`, `codereview_01/codereview.md`.

## Work

- [x] T11.1 Repair the link and reconcile T09's manifest state with the review finding.
- [x] T11.2 After T12, record current T09 evidence and completion through the DAG owner.

## Acceptance criteria

- Every T01–T09 manifest link resolves to its task file.
- T09 state and handoff do not claim CA-17 proof while the dirty-tree case persists.
- The original T09 obligation is closed only with current clean-tree evidence.

## Verification

- Unit: not applicable.
- Integration: not applicable.
- End-to-end: not applicable; T12 owns CA-17 execution.
- Manual: check all task links and T09's state against its handoff.
- Platforms: all.
- Environment dependency: none.
- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage` at the final code-change gate.
- Expected evidence: valid links and a consistent manifest/handoff.

## Affected files

- Modify: `tasks/prd-03-plano-checkpoint-e-boot/tasks.md`, `done/task_09.md` if evidence changes.
- Create: none.

## Observability and recovery

- Operational signal: manifest link resolves to the intended task.
- Recovery: restore the prior link/state from Git history if mistaken.

## Handoff

- Produced result: Repaired T09's manifest link to `done/task_09.md` and reconciled its original CA-17 claim against CR-03. The manifest records T09's reopening and completion on T12's clean-tree evidence. The original T09 handoff remains intact with a correction note that identifies the earlier gap and current proof.
- Changed files: `tasks.md`, `done/task_09.md`, and this task file.
- Checks: All nine T01–T09 manifest links resolve. `git diff --check` passed. T12's full two-worker coverage run already passed on the unchanged implementation, including 20 sessions per full-level harness; its build, lint, and typecheck also passed.
- Validated state: Windows 11 / Node 24; T12 asserts empty final Git status for every counted session, including all five `failure_above_ceiling` profiles, while retaining checkpoint, commit, and state-file exclusion checks.
- Open items: The immutable first review remains `REJECTED` until an independent re-review. The Linux/macOS and Node 20/22 matrix remains the accepted platform evidence limit.
