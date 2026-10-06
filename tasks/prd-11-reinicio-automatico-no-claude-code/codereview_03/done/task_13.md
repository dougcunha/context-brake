# Stable execution context

Load in this exact order:

1. `tasks/prd-11-reinicio-automatico-no-claude-code/codereview_03/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T13 — Delete the local settings only when ContextBrake created them

## Outcome

`remove --yes` and `init --no-auto-restart`, with the status line bridge on or off, delete `.claude/settings.local.json` only when ContextBrake created it and it is literally `{}` once the mod keys leave. A user-created `{}` or comment-only file survives byte for byte; the codereview_02 CR-01 cases still delete the file ContextBrake created.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: an ownership record for the local settings file written by the mod planner, the `drop` rule in `auto-restart-planner.ts`, and the "empty" test used by it.
- Out of scope: `statusline-restore.ts` behavior (read only, through its state); OI items of codereview_03.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_03/CR-01 | `codereview.md#Findings` | `drop = !wanted && isEmptySettings(text)` ignores who created the file and treats comment-only text as empty |
| codereview_02/CR-01 | `codereview_02/codereview.md#Findings` | must stay fixed for files ContextBrake created |
| PRD FR-09, FR-07; `file-changes.md` | `prd.md#Functional requirements` | `remove` deletes only what ContextBrake created; preserve user bytes |

## Requirements

- Ownership record: a runtime state file `.context-brake/runtime/claude-mod-install.json` (`{ "v": 1, "createdLocalFile": boolean }`, Zod-validated), mirroring the bridge's `claude-statusline.json`. Planned with the mod files when auto-restart is wanted; `createdLocalFile` is true when the previous record says so, when the local settings file is absent before the install, or when the bridge state says the bridge created it. Deleted with the mod on switch-off and on `remove`. Its path joins `STANDARD_HARNESS_PATHS`.
- `drop` (auto-restart off): the file is owned (mod record or bridge state `createdLocalFile`) and the text without the mod keys is `{}` ignoring whitespace. Otherwise plan the `update` without the mod keys.
- `auto-restart-planner.ts` stays at or under 100 lines; the ownership helpers live in their own module.

## Context to recover on demand

- Code: `claude-code/auto-restart-planner.ts` (`settingsChange`, `fileChanges`, `removalChanges`), `auto-restart-settings.ts:isEmptySettings`, `statusline-state.ts:readStatuslineState`, `statusline-restore.ts:31`, `src/cli/snapshot-helper.ts:STANDARD_HARNESS_PATHS`.
- Rules: `code-standards.md`, `file-changes.md`, `javascript-typescript.md` (Zod), `tests.md`.

## Work

- [x] T13.1 Add the ownership module (schema, read, serialize, planned create and delete) and register its path for snapshots.
- [x] T13.2 Plan the record with the install and its deletion with the switch-off and `remove`; use it and the bridge state in `drop`, with a literal `{}` test.
- [x] T13.3 Planner cases: user `{}` and comment-only local files survive `remove --yes` and `init --no-auto-restart` with the bridge on and off; T12 cases still delete the created file.
- [x] T13.4 Built-CLI case: user `{}` local file, `init --auto-restart`, `remove --yes`, the file is unchanged.

## Acceptance criteria

- Reviewer repros s3, s4, s6, s8 keep the user file; s1, s2 still remove the created file.
- No leftover `claude-mod-install.json` after switch-off or `remove`.
- Existing auto-restart, statusline and doctor tests pass.

## Verification

- Integration: `auto-restart-planner`, `auto-restart-removal`, `auto-restart-doctor`, `statusline-install`.
- End-to-end: `tests/e2e/auto-restart.test.ts` new case.
- Manual: none. Platforms: Windows here; CI for Linux and macOS. Environment dependency: none.
- Commands: `npm run build`, focused `npx vitest run`, `npm run lint`, `npm run typecheck`, `npm run coverage` (background).
- Expected evidence: new cases fail before the fix and pass after; full coverage green.

## Affected files

- Create: `src/infrastructure/harnesses/claude-code/auto-restart-ownership.ts`
- Modify: `auto-restart-planner.ts`, `auto-restart-settings.ts`, `src/cli/snapshot-helper.ts`, `tests/integration/auto-restart-planner.test.ts`, `tests/e2e/auto-restart.test.ts`

## Observability and recovery

- Operational signal: `init` and `remove` plans show `claude-mod-install.json` created and deleted.
- Recovery: revert the module and the `drop` change.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: new `auto-restart-ownership.ts` (46 lines) holds `MOD_OWNERSHIP_FILE` (`.context-brake/runtime/claude-mod-install.json`, `{ v: 1, createdLocalFile }`, Zod mini strict). The install plans the record with the mod files; `createdLocalFile` is true when the previous record says so, the local settings file is absent before the install, or the bridge state says it created it. Switch-off and `remove` plan its deletion. `settingsChange` drops the local settings only when `base.owned` (record or bridge state) and `isEmptySettings`, which is now literal `{}` ignoring whitespace, so a comment-only file is never empty. Path added to `STANDARD_HARNESS_PATHS`. Decision record IMPL-T13 in `workflow.md`.
- Changed files: `src/infrastructure/harnesses/claude-code/auto-restart-ownership.ts` (new), `auto-restart-planner.ts` (89 lines), `auto-restart-settings.ts`, `src/cli/snapshot-helper.ts`; `tests/integration/auto-restart-user-settings.test.ts` (new: 8 cases, user `{}` and comment-only files × bridge on/off × `remove` / `--no-auto-restart --no-statusline-bridge`); `tests/integration/auto-restart-planner.test.ts` (T12 cases also assert no ownership record left; 97 lines); `tests/e2e/auto-restart.test.ts` (built CLI: user `{}` file survives install and remove).
- Checks: without the ownership condition the 4 `{}` cases fail (4 failed, 11 passed); with it 15 passed; `auto-restart-removal`, `auto-restart-doctor`, `statusline-install` pass; after `npm run build`, `e2e/auto-restart` 4 passed; ESLint and typecheck exit 0; QA-01/02/03/07 no hits. Integrated check after T13 and T14: `npm run coverage` passed, 321 files, 2050 passed, 3 skipped, 0 failed; all files 96.07% statements, 91.89% branches, 97.07% functions.
- Validated state: worktree on `c7529c5` plus the feature diff, rounds 1-2 corrections, T13 and T14; Windows 11, Git Bash.
- Open items: a kept user file is compared ignoring whitespace: removing the mod keys through the JSONC editor turns `{}` into `{
}` and leaves a blank line before a leading comment (behavior of `withoutModKeys` since T05; byte-exact restoration would need the original text stored).
