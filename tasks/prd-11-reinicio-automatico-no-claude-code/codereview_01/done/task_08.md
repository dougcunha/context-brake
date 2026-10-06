# Stable execution context

Load in this exact order:

1. `tasks/prd-11-reinicio-automatico-no-claude-code/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T08 — Keep the mod loader keys when the status line opt-out deletes the local settings

## Outcome

`init --auto-restart --no-statusline-bridge` after `init --statusline-bridge` leaves `.claude/settings.local.json` with the `extraKnownMarketplaces` and `enabledPlugins` mod keys and without the bridge status line, and a following plain `init` changes nothing.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T11 (shared adapter area, run after)
- In scope: the settings branch of `planAutoRestart` when the base plan deletes `.claude/settings.local.json`; planner and built-CLI tests for that flag combination.
- Out of scope: the status line restore logic (`statusline-restore.ts`), other flag combinations already covered by TC-17 to TC-21, OI-01 to OI-05.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-01 | `codereview.md#Findings` | `planAutoRestart` keeps the base delete of the local settings and drops the loader keys when `wanted` is true |
| PRD FR-07, OBJ-03 | `prd.md#Functional requirements` | opt-in install is idempotent; a second `init` changes nothing |
| TechSpec DEC-08 | `techspec.md#Technical decisions` | loader through a directory marketplace plus `enabledPlugins` in `.claude/settings.local.json` |

## Requirements

- When `context.autoRestart === true` and `base` holds a `delete` of `.claude/settings.local.json`, the plan replaces that delete with one change whose content is `withModKeys` applied to an empty settings object, so the file keeps only the mod keys.
- The file exists on disk at plan time, so the change kind is the one the planner already uses for an existing file (pin it in the test); the preview names the mod registration.
- When `wanted` is false, the base delete stays as it is (the restore only deletes a file it reduced to `{}`, so no mod keys are lost).
- No `JSON.parse` on settings text (JSONC, L-08); the planned path stays listed in `STANDARD_HARNESS_PATHS`.
- `auto-restart-planner.ts` stays at or under 100 lines; extract a helper if needed.

## Context to recover on demand

- TechSpec: `techspec.md#Components and flow` (CMP-06), DEC-08.
- Rules and skills: `code-standards.md`, `file-changes.md`, `harness-adapters.md`, `tests.md`.
- Code: `src/infrastructure/harnesses/claude-code/auto-restart-planner.ts:planAutoRestart` (line 76, the early return) and `settingsChange`; `src/infrastructure/harnesses/claude-code/statusline-restore.ts:localRestoration` (emits the delete when the bridge created the file and the restored text is `{}`); `auto-restart-settings.ts:withModKeys`.

## Work

- [x] T08.1 Replace the early return in `planAutoRestart` so that, with `wanted` true, a base delete of the local settings becomes the mod-keys settings change built from an empty settings text; keep the delete when `wanted` is false.
- [x] T08.2 Add a planner case to `tests/integration/auto-restart-planner.test.ts`: base plan with a delete of `.claude/settings.local.json` and `autoRestart: true` yields one non-delete settings change with both mod keys and no `statusLine`.
- [x] T08.3 Add a built-CLI case to `tests/e2e/auto-restart.test.ts` mirroring the review repro: `init --statusline-bridge --yes`, then `init --auto-restart --no-statusline-bridge --yes`, assert loader keys present and no bridge status line, then plain `init --yes` reports no changes.

## Acceptance criteria

- The reviewer's repro (`codereview.md#Executed validations`, scratch repository `repro1`) no longer shows `[delete] .claude/settings.local.json`; the loader keys exist after the second `init`.
- A third `init` with the same flags writes no file (FR-07 idempotency).
- Existing planner, removal, doctor and e2e auto-restart tests still pass.

## Verification

- Unit: not applicable.
- Integration: `tests/integration/auto-restart-planner.test.ts` new case passes; `auto-restart-removal`, `auto-restart-doctor` unchanged and passing.
- End-to-end: `tests/e2e/auto-restart.test.ts` new case against a temporary fixture repository passes.
- Manual: none.
- Platforms: Windows here; Linux and macOS through CI.
- Environment dependency: none.
- Commands: `npm run build`, `npx vitest run tests/integration/auto-restart-planner.test.ts tests/e2e/auto-restart.test.ts`, then `npm run lint`, `npm run typecheck`, `npm run coverage` (background, L-04).
- Expected evidence: passing test names in the handoff; planner line count.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/auto-restart-planner.ts`
- Modify: `tests/integration/auto-restart-planner.test.ts`, `tests/e2e/auto-restart.test.ts`

## Observability and recovery

- Operational signal: `init` plan preview shows the mod registration on `.claude/settings.local.json` instead of a delete; `doctor` reports auto-restart ready.
- Recovery: revert the planner change; `init` without the flag removes the keys.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `planAutoRestart` keeps the base delete of `.claude/settings.local.json` only when auto-restart is off; when it is on, the delete is replaced by an `update` whose content is the mod keys applied to an empty settings object (`isLocalSettingsDeletion` helper). The status line restore deletes only a bridge-created file reduced to `{}`, so no user content is lost.
- Changed files: `src/infrastructure/harnesses/claude-code/auto-restart-planner.ts` (87 lines); `tests/integration/auto-restart-planner.test.ts` (CR-01 case pinning one `update` change, both keys, no `statusLine`, then no further changes); `tests/e2e/auto-restart.test.ts` (built-CLI repro: `init --statusline-bridge`, `init --auto-restart --no-statusline-bridge`, settings hold only `enabledPlugins` and `extraKnownMarketplaces`, plain `init` plans nothing and leaves the tree unchanged).
- Checks: the new integration case fails with the old early return (1 failed, 4 passed) and passes with the fix (5 passed); `npm run build` ok; `npx vitest run tests/e2e/auto-restart.test.ts tests/integration/auto-restart-removal.test.ts tests/integration/auto-restart-doctor.test.ts` 14 passed; `npm run lint` and `npm run typecheck` clean; quality profile blocking patterns (QA-01, QA-02, QA-03, QA-07) over the three files: no hits. Full `npm run coverage` runs once after the last correction task of this round.
- Validated state: worktree on `c7529c5` plus the feature diff and T08; Windows 11, Git Bash.
- Open items: none.
