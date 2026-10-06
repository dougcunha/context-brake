# Stable execution context

Load in this exact order:

1. `tasks/prd-11-reinicio-automatico-no-claude-code/codereview_02/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T12 — Delete the local settings that become empty when the mod keys leave a bridge-restored file

## Outcome

With the status line bridge on, `init --auto-restart` followed by `remove --yes`, or by `init --no-auto-restart --no-statusline-bridge`, leaves no `.claude/settings.local.json` when the install created it, so the repository matches its pre-install state.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: the `drop` condition of `settingsChange` in `auto-restart-planner.ts`; planner and built-CLI cases that start without `.claude/settings.local.json`.
- Out of scope: `statusline-restore.ts`; OI-01 to OI-05 of codereview_02; the accepted T05 behavior that a user-created file reduced to `{}` is also deleted.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_02/CR-01 | `codereview.md#Findings` | `drop` requires `base.existing === undefined`, so a bridge-restore `update` reduced to `{}` is written instead of deleted |
| PRD FR-09, FR-07, OBJ-03 | `prd.md#Functional requirements` | `remove` deletes only what `init` wrote and restores the repository |
| TechSpec Rollback | `techspec.md#Observability and rollout` | removal returns the repository to its pre-install state |

## Requirements

- When auto-restart is off and the settings text without the mod keys is empty, plan a `delete` of `.claude/settings.local.json` whether or not the base plan already holds an `update` for it.
- When the text without the mod keys still has other keys, keep the current `update` (user content and the bridge restore survive byte for byte).
- `auto-restart-planner.ts` stays at or under 100 lines.

## Context to recover on demand

- TechSpec: CMP-06, DEC-08.
- Rules and skills: `code-standards.md`, `file-changes.md`, `tests.md`.
- Code: `src/infrastructure/harnesses/claude-code/auto-restart-planner.ts:settingsChange` (`drop`, line 62); `statusline-restore.ts:localRestoration`; `tests/integration/auto-restart-planner.test.ts`; `tests/e2e/auto-restart.test.ts`.

## Work

- [x] T12.1 Drop the `base.existing === undefined` condition from `drop` in `settingsChange`.
- [x] T12.2 Add planner cases without a pre-existing local settings file: `init --auto-restart` then `remove --yes`, and `init --auto-restart` then `init --no-auto-restart --no-statusline-bridge`; both leave no local settings file.
- [x] T12.3 Add a built-CLI case: no local settings file, `init --yes --auto-restart`, then `remove --yes`; the tree equals the starting tree except the base hooks file.

## Acceptance criteria

- The reviewer's repros `r2` and `r3` leave no `.claude/settings.local.json`.
- Existing planner, removal, doctor and e2e auto-restart tests still pass, including the user-content cases (TC-20) and codereview_01 CR-01 cases.

## Verification

- Unit: not applicable.
- Integration: `tests/integration/auto-restart-planner.test.ts`, `auto-restart-removal.test.ts`.
- End-to-end: `tests/e2e/auto-restart.test.ts` new case against a temporary fixture repository.
- Manual: none.
- Platforms: Windows here; Linux and macOS through CI.
- Environment dependency: none.
- Commands: `npm run build`, focused `npx vitest run` of the files above, `npm run lint`, `npm run typecheck`, `npm run coverage` (background).
- Expected evidence: the new cases fail before the fix and pass after; full coverage green.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/auto-restart-planner.ts`, `tests/integration/auto-restart-planner.test.ts`, `tests/e2e/auto-restart.test.ts`

## Observability and recovery

- Operational signal: the `remove` plan shows `[delete] .claude/settings.local.json`.
- Recovery: revert the `drop` change.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: in `settingsChange`, `drop` is now `!wanted && isEmptySettings(text)`, so a bridge-restore `update` that is empty once the mod keys leave becomes a `delete`, with its own preview ("Delete the local settings left empty") instead of the bridge summary. Text with other keys keeps the `update`.
- Changed files: `src/infrastructure/harnesses/claude-code/auto-restart-planner.ts` (87 lines); `tests/integration/auto-restart-planner.test.ts` (it.each: `remove --yes` and `--no-auto-restart --no-statusline-bridge` after `init --auto-restart` with no prior local settings file); `tests/e2e/auto-restart.test.ts` (built CLI: no local settings file, `init --auto-restart`, `remove --yes`, tree restored).
- Checks: both new planner cases failed before the fix (2 failed, 5 passed) and pass after; `auto-restart-planner`, `auto-restart-removal`, `auto-restart-doctor`, `statusline-install` 25 passed; after `npm run build`, `e2e/auto-restart` 3 passed; ESLint and typecheck exit 0. `npm run coverage`: 320 files, 2041 passed, 3 skipped, 0 failed; all files 96.07% statements, 91.85% branches, 97.06% functions.
- Validated state: worktree on `c7529c5` plus the feature diff, round 1 corrections and T12; Windows 11, Git Bash.
- Open items: none.
