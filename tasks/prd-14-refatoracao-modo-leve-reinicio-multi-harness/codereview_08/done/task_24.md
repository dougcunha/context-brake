# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_08/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T24 — A regression test pins when the pruner reports a non-empty directory

## Outcome

`tests/integration/directory-pruner.test.ts` fails if `remove` (`pruneRuntime: true`) stops reporting a ContextBrake directory left non-empty as `skipped`, or if another caller (`init --no-auto-restart`, `pruneRuntime: false`) starts reporting it again.

## Dependencies and boundaries

- Depends on: T22 (`qa_01/done/task_22.md`); DEC-HIL-07
- Unblocks: re-review `codereview_09`, QA `qa_02`
- In scope: two integration cases in `tests/integration/directory-pruner.test.ts`.
- Out of scope: production changes; the `AUTO_RESTART_LAST_SKIP` wording (accepted for HIL 3 by DEC-HIL-07).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_08 reservation 1 (DEC-HIL-07) | `codereview.md#findings` | No suite asserts the `remove` path that reports a non-empty ContextBrake directory as skipped (`directory-pruner.ts:63-64`) |

## Requirements

- `file-changes.md`: `remove` reports what it could not delete; FR-13 / DEC-14: `init --no-auto-restart` keeps other runtime state without a warning.

## Work

- [x] T24.1 Case: deleting `runtime/restart/pi/s1.json` with `runtime/keep.json` present under `NodeChangeApplier({ pruneRuntime: true })` yields a `skipped` outcome for `.context-brake/runtime` with "Directory is not empty".
- [x] T24.2 Case: the same plan under `NodeChangeApplier()` reports success, no skipped outcome, and the emptied `runtime/restart/` is gone.
- [x] T24.3 Mutation checks: reverting the T22 line fails T24.2; ignoring `reportNonEmpty` in favor of never reporting fails T24.1.

## Acceptance criteria

- Both cases pass and each fails under its mutation; no production file changes.

## Verification

- Integration: `npx vitest run tests/integration/directory-pruner.test.ts`; `npm run lint`; `npm run typecheck`; at the end of the round, `npm run build` and `npm run coverage`.

## Affected files

- Modify: `tests/integration/directory-pruner.test.ts`

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: two integration cases apply the same restart-log deletion plan (with `runtime/keep.json` present) through `NodeChangeApplier`: under `pruneRuntime: true` the report contains the `skipped` outcome for `.context-brake/runtime` with "Directory is not empty: 1 remaining entry ContextBrake did not delete."; without it the report is `success` with no skipped outcome, `runtime/restart/` is gone, and `keep.json` stays.
- Changed files: tests/integration/directory-pruner.test.ts (85 lines). No production file changed.
- Checks: 4/4 green. Mutation checks (vitest JSON reporter): reverting the T22 line fails only the silent-prune case; replacing `if (!candidate.reportNonEmpty) return null;` with `return null;` fails only the remove-report case; both restored. `npx eslint` exit 0.
- Validated state: worktree on a31e183 plus the feature diff and T10-T24; Windows 11, Node 24.
- Open items: none.
