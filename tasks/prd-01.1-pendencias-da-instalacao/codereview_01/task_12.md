# Stable execution context

Load in this exact order:

1. `tasks/prd-01.1-pendencias-da-instalacao/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T12 — Prune empty runtime directory on remove --remove-state

## Outcome

When `context-brake remove --remove-state` is executed and `.context-brake/runtime/` exists but holds no files (or only empty subdirectories), the empty runtime directory and `.context-brake/` (if otherwise empty) are pruned, fulfilling FR-09.

## Dependencies and boundaries

- Depends on: T10
- Unblocks: —
- In scope: Update `src/cli/commands/remove.ts`, `src/infrastructure/storage/change-applier.ts`, and `src/infrastructure/storage/directory-pruner.ts` so that when `removeState` is true, `.context-brake/runtime` is included as a candidate for pruning even if no files were deleted. Add an integration test verifying that an already-empty `.context-brake/runtime` directory is deleted when `--remove-state` is invoked.
- Out of scope: Removal without `--remove-state` (must continue preserving `.context-brake/runtime`).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-03 | `codereview.md#findings` | `remove --remove-state` leaves empty `.context-brake/runtime/` unpruned when it contains no files |

## Requirements

- FR-09: Delete runtime execution state when `--remove-state` is specified and prune emptied directories.
- Default `remove` (without `--remove-state`) must continue to preserve `.context-brake/runtime/` and not report spurious errors or warnings.
- Stray files or non-empty directories not managed by ContextBrake must not be deleted and must be reported as `skipped` (exit code 1).

## Context to recover on demand

- TechSpec: `technical-decisions#DEC-04`
- Rules and skills: `.agents/rules/file-changes.md`, `.agents/rules/cli-output.md`
- Code: `src/infrastructure/storage/directory-pruner.ts`, `src/infrastructure/storage/change-applier.ts`, `src/cli/commands/remove.ts`, `tests/integration/runtime-state-removal.test.ts`

## Work

- [x] T12.1 Pass `removeState` explicitly to `NodeChangeApplier` (via constructor options `{ removeState: args.removeState }`) so pruning knows `--remove-state` was active even when no file deletions were planned.
- [x] T12.2 In `directory-pruner.ts`'s `collectCandidateDirectories`, when `input.removeState` is true, include `.context-brake/runtime` and empty subdirectories in candidates.
- [x] T12.3 Add integration test in `tests/integration/directory-pruner.test.ts` asserting that `removeState: true` on an already-empty `.context-brake/runtime/sessions` directory prunes the empty runtime directories and `.context-brake`.

## Acceptance criteria

- Running `remove --remove-state` when `.context-brake/runtime/` has no files removes `.context-brake/runtime` and `.context-brake` (when empty).
- Running `remove` without `--remove-state` preserves `.context-brake/runtime/`.
- All existing tests in `directory-pruner.test.ts` and `runtime-state-removal.test.ts` pass without regressions.

## Verification

- Unit: not applicable beyond integration.
- Integration: `npx vitest run tests/integration/runtime-state-removal.test.ts tests/integration/directory-pruner.test.ts`
- End-to-end: `npm run package:smoke`
- Manual: none.
- Platforms: Linux, macOS, Windows.
- Environment dependency: none.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npx vitest run tests/integration/runtime-state-removal.test.ts tests/integration/directory-pruner.test.ts`
- Expected evidence: Test suite passes with new scenario covered; exit codes match FR-09 specifications.

## Affected files

- Modify: `src/cli/commands/remove.ts`, `src/infrastructure/storage/change-applier.ts`, `src/infrastructure/storage/directory-pruner.ts`, `tests/integration/directory-pruner.test.ts`

## Observability and recovery

- Operational signal: `ApplyOutcome` includes applied prune outcome for `.context-brake/runtime`.
- Recovery: Revert modified files with git.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Pruning empty `.context-brake/runtime` directories and empty parents when `--remove-state` is provided now functions even when no files existed, fully resolving CR-03.
- Changed files: `src/cli/commands/remove.ts`, `src/infrastructure/storage/change-applier.ts`, `src/infrastructure/storage/directory-pruner.ts`, `tests/integration/directory-pruner.test.ts`.
- Checks: `npm run typecheck` (pass), `npm run lint` (0 issues), `npx vitest run tests/integration/runtime-state-removal.test.ts tests/integration/directory-pruner.test.ts` (6/6 pass), `npm run package:smoke` (pass).
- Validated state: Integration test proves already-empty runtime tree is pruned without warnings or exit code regressions.
- Open items: None.
