# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/qa_01/qa.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T22 — `init --no-auto-restart` succeeds when other runtime state remains

## Outcome

In a project whose `.context-brake/runtime/` holds state besides `restart/`, `init --no-auto-restart` deletes the restart logs, prunes the restart folders that became empty, and exits 0 with status `success`; no "Directory is not empty" outcome is reported for the parent `runtime` directory.

## Dependencies and boundaries

- Depends on: T16 (`codereview_03/done/task_16.md`)
- Unblocks: re-review `codereview_08`, QA `qa_02`
- In scope: `pruneEmptyContextBrakeDirectories` reports a non-empty ancestor only when the caller prunes the whole runtime (`remove`, `pruneRuntime: true`); other callers prune empty ancestors silently. Exit code and status assertions in `init-auto-restart.test.ts`.
- Out of scope: BUG-01 (T23); `remove` behavior, which keeps reporting foreign entries.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| qa_01/BUG-02 | `qa.md#findings` | `init --no-auto-restart` exits 1 with an unexplained `[WARN]` because the pruner reports the non-empty `.context-brake/runtime` parent |

## Requirements

- FR-13 / DEC-14: `init --no-auto-restart` removes the restart logs and keeps other runtime state.
- `cli-output.md`: exit codes are contract; a warning status names a real cause.
- `remove` still reports a ContextBrake directory left non-empty by foreign entries.

## Context to recover on demand

- Code: `src/infrastructure/storage/directory-pruner.ts` (`collectCandidateDirectories`), `src/infrastructure/storage/change-applier.ts:73-74`, `src/cli/commands/remove.ts:59`
- Rules: `file-changes.md`, `cli-output.md`, `tests.md`

## Work

- [x] T22.1 In `collectCandidateDirectories`, mark ancestors of deleted files as reportable only when `pruneRuntime` is on.
- [x] T22.2 In `init-auto-restart.test.ts`, assert exit 0 and status `success` for `--no-auto-restart` with other runtime state, and that the empty `runtime/restart/pi/` folder is gone.

## Acceptance criteria

- The QA reproduction (restart log plus another runtime entry, then `init --yes --json --no-auto-restart`) exits 0 with status `success` and no skipped `.context-brake/runtime` outcome.
- `remove` suites that assert non-empty reporting pass unchanged.

## Verification

- Integration: `tests/integration/init-auto-restart.test.ts` (fails before the change: exit 1); remove and doctor-remove suites.
- End-to-end: QA scenario `probe-warn3` rerun by `qa_02`.
- Commands: `npx vitest run tests/integration/init-auto-restart.test.ts tests/integration/doctor-remove-restart.test.ts` plus the remove suites; `npm run lint`; `npm run typecheck`.

## Affected files

- Modify: `src/infrastructure/storage/directory-pruner.ts`, `tests/integration/init-auto-restart.test.ts`

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `collectCandidateDirectories` marks the ancestors of deleted ContextBrake files as reportable only when `pruneRuntime` is on (`remove`); other callers, such as `init --no-auto-restart`, still prune ancestors that became empty but no longer report a non-empty parent as skipped. `init --no-auto-restart` with other runtime state now exits 0 with status `success` and removes the emptied `runtime/restart/` folders.
- Changed files: src/infrastructure/storage/directory-pruner.ts (one line); tests/integration/init-auto-restart.test.ts (exit 0, status `success`, and `runtime/restart/` gone in the DEC-14 case).
- Checks: the strengthened case failed before the change (exit 1) and passes after it; init-auto-restart 6/6. change-applier, directory-pruner, doctor-remove-restart, init-remove-footprint, remove-invalid-config, and e2e-remove: 6 files, 16 tests green. `npx eslint` over both files exit 0.
- Validated state: worktree on a31e183 plus the feature diff and T10-T22; Windows 11, Node 24.
- Open items: the QA scenario `probe-warn3` is rerun by `qa_02`. This also removes the empty `runtime/restart/<harness>/` folders noted as an optional improvement since codereview_04.
