# Stable execution context

Load in this exact order:

1. `tasks/prd-01.1-pendencias-da-instalacao/prd.md`
2. `tasks/prd-01.1-pendencias-da-instalacao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T04 — `remove --remove-state` deletes runtime state and prunes empty directories

## Outcome

`context-brake remove --remove-state` also deletes every file under `.context-brake/runtime/` (the PRD-02 runtime-state directory), and `remove`, with or without the flag, prunes any ContextBrake directory left empty by applied deletes.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: listing and planning deletion of runtime-state files; post-apply empty-directory pruning under `.context-brake/`.
- Out of scope: plan/checkpoint file deletion (already implemented in `state-removal.ts`); any change to what PRD-02 itself writes there.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-09 | `prd.md#functional-requirements` | Delete runtime execution state only with `--remove-state` |
| US-06 | `prd.md#stories-and-journeys` | Control over when local runtime state is erased |
| DEC-04 | `techspec.md#technical-decisions` | `runtime-state-files.ts`; `runtime_state` owner; directory pruning |
| CMP-04, CMP-10 | `techspec.md#components-and-flow` | New file lister; `change-applier.ts` pruning; `CHANGE_OWNERS` addition |
| TC-05 | `techspec.md#test-approach` | With/without flag, absent directory, changed-file race, stray file |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/file-changes.md` ("remove deletes only what ContextBrake created"; plan before writing; write safely), `.agents/rules/node.md` (async I/O, paths built with `node:path`).
- Existing code: `src/core/services/state-removal.ts` (existing `planStateDeletions`, plan/checkpoint only — extend alongside, do not replace); `src/infrastructure/storage/change-applier.ts` (`NodeChangeApplier.apply`, currently deletes files only, never a directory); `tasks/prd-02-telemetria-zonas-e-freio/techspec.md:148,158,232` confirms `.context-brake/runtime/` as the only path PRD-02 writes to — this task assumes that path without redefining it (PRD's own `Assumptions and sources` note).
- Contract or integration: `techspec.md#technical-decisions` DEC-04 for the pruning algorithm (deepest first, stop at first non-empty or symlinked directory, report `skipped` with reason); `techspec.md#contracts-and-data` for the `runtime_state` addition to `CHANGE_OWNERS`.
- Harness reference: not applicable.

## Work

- [x] T04.1 Add `'runtime_state'` to `CHANGE_OWNERS` in `src/core/contracts/changes.ts`; regenerate `schemas/install-report.schema.json` via `npm run schemas:generate`.
- [x] T04.2 Create `src/infrastructure/storage/runtime-state-files.ts` exporting an async `listRuntimeStateFiles(root): Promise<string[]>` using `readdir(..., { recursive: true })` over `<root>/.context-brake/runtime/`, returning POSIX-relative paths; return `[]` when the directory does not exist.
- [x] T04.3 In `remove.ts`, when `--remove-state` is set, snapshot every listed runtime-state file (reuse the existing snapshot pipeline) and pass them into an extended `state-removal.ts` (or a sibling function) that plans one `delete` `PlannedChange` per file with `owner: 'runtime_state'`.
- [x] T04.4 In `NodeChangeApplier.apply`, after the existing per-file loop, walk every directory under `<root>/.context-brake/` bottom-up; `rmdir` (non-recursive) each directory that is empty and not a symlink, stopping the walk at the first directory that is not empty; report a directory that could not be removed as a `skipped` `ApplyOutcome` with the reason, never as `failed`.
- [x] T04.5 Add unit tests for `listRuntimeStateFiles` (nested files, missing directory) and for the extended removal planning (with/without `--remove-state`).
- [x] T04.6 Add an integration test for the full `remove --remove-state` flow: nested runtime files, a file changed after preview, and a stray user-created file left inside `.context-brake/`.

## Acceptance criteria

- Default `remove` (no `--remove-state`) never lists or deletes anything under `.context-brake/runtime/`, but still removes `.context-brake/` itself once it is otherwise empty (today's existing behavior, unchanged).
- `remove --remove-state --yes` deletes every file under `.context-brake/runtime/` and prunes every ContextBrake directory left empty afterward.
- A runtime-state file that changed between preview and apply fails with the existing `FILE_CHANGED_SINCE_PREVIEW` code, and its directory is not pruned.
- A directory holding a file ContextBrake did not plan to delete (a stray user file) is left in place and reported as a `skipped` outcome, never silently removed and never a hard failure.
- Repeating `remove --remove-state --yes` when nothing remains plans and changes nothing.

## Verification

- Unit: `listRuntimeStateFiles` against a fixture tree with nested files and against a missing directory; `state-removal` planning with and without `removeState`.
- Integration: real temporary directory with nested runtime files under `.context-brake/runtime/`; run `remove` (default, keeps files) then `remove --remove-state --yes` (deletes files, prunes directories); a separate fixture proves the changed-file race and the stray-file case.
- End-to-end: not required beyond the integration coverage — the built-CLI safe-removal scenario (existing `E2E-07`-equivalent) already exercises `remove`; extend its fixture to include a runtime-state file if it does not already.
- Manual: none.
- Platforms: Linux, macOS, Windows (PowerShell and Git Bash) — directory removal and symlink handling differ across these; verify at least the nested-delete-and-prune path on all three via CI.
- Commands: `npm run build`, `npm test -- state-removal safe-removal`, `npm run coverage`
- Environment dependency: none.
- Expected evidence: `tests/unit/state-removal.test.ts` and `tests/integration/safe-removal.test.ts` pass on the CI matrix (Linux, macOS, Windows × Node 20/22/24).

## Affected files

- Modify: `src/core/contracts/changes.ts`, `schemas/install-report.schema.json`, `src/core/services/state-removal.ts`, `src/core/services/removal-service.ts`, `src/infrastructure/storage/change-applier.ts`, `src/cli/commands/remove.ts`, `tests/integration/safe-removal.test.ts`
- Create: `src/infrastructure/storage/runtime-state-files.ts`, `tests/unit/runtime-state-files.test.ts`, `tests/unit/state-removal.test.ts`

## Observability and recovery

- Operational signal: `ApplyOutcome` entries for each deleted runtime file and each pruned or `skipped` directory, visible in `remove --json`'s `outcomes` array.
- Recovery: deleting runtime state is intentionally irreversible (it is disposable telemetry/session data by PRD-02's own design); nothing here deletes plan, checkpoint, or harness configuration. Reverting the code change restores today's behavior of leaving runtime files and the empty `.context-brake/` directory in place.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `remove --remove-state` now deletes every file under `.context-brake/runtime/` (new `runtime_state` change owner), and `NodeChangeApplier` prunes any ContextBrake directory left empty by applied deletes, both by default (`remove` alone can now remove an emptied `.context-brake/`) and after `--remove-state` clears `.context-brake/runtime/`. A stray file blocking pruning is reported as a `skipped` outcome, never removed and never a hard failure; a runtime file that changed since preview still fails with `FILE_CHANGED_SINCE_PREVIEW` and its directory is correctly left unpruned.
- Changed files: `src/core/contracts/changes.ts` (`runtime_state` owner), `schemas/install-report.schema.json` (regenerated), `src/infrastructure/storage/runtime-state-files.ts` (new), `src/infrastructure/storage/directory-pruner.ts` (new), `src/infrastructure/storage/change-applier.ts` (wires pruning after the per-file loop), `src/core/services/state-removal.ts` (`planRuntimeStateDeletions`), `src/core/services/removal-service.ts` (wires it in), `src/cli/commands/remove.ts` (lists + snapshots runtime files when `--remove-state`), `tests/unit/runtime-state-files.test.ts` (new), `tests/unit/state-removal.test.ts` (new), `tests/integration/runtime-state-removal.test.ts` (new — kept separate from `safe-removal.test.ts` to stay under the 30-line-per-function/lint file-size limits; `safe-removal.test.ts` itself is unchanged), `tests/integration/directory-pruner.test.ts` (new, changed-file-race case), `tests/test-lanes.ts` (registered the new process-lane file).
- Checks: `npm run build`, `npm run typecheck`, `npm run lint` (0 issues), `npm run schemas:check` all pass; `npx vitest run` — 90 files, 370 tests pass (no regression).
- Validated state: integration-level evidence over real temporary directories on Windows (this session's platform) for: no-flag preservation, full `--remove-state` deletion + pruning, stray-file skip (exit code 1, file untouched), idempotent re-run (exit code 0, nothing left to do), and the changed-file-since-preview race (fails that one file, leaves its directory). Directory pruning distinguishes the `.context-brake` root (lenient — a lingering `runtime/` directory without `--remove-state` is expected, not reported) from directories actually targeted for full clearing (strict — any leftover there is reported `skipped`), so default `remove` never regresses to a spurious warning/exit-code-1 when PRD-02 runtime state exists.
- Open items: an edge case is not covered — if `--remove-state` runs while `.context-brake/runtime/` exists but is already fully empty (no files, e.g. only empty subdirectories), that directory is never visited by the pruner (it only walks ancestors of files it actually deleted), so it and `.context-brake/` could linger. This did not occur in any fixture and is a pre-existing-shape gap, not a regression; flagging for `sdd-review-code` to decide if it needs a follow-up task.

### ADR candidates

None - direct TechSpec implementation (DEC-04).
