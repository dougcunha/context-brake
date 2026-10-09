# Stable execution context

Load in this exact order:

1. `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T02 — The block also lists the runtime state files init writes

## Outcome

After `init` with every optional feature on, no state file that `init` writes under `.context-brake/runtime/` shows in `git status`: the block lists them while they exist or are planned, and drops the lines when they are deleted.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: `planGitIgnoreForInstall` adds the runtime state paths (DEC-HIL-03, PRD FR-01 clarification, TechSpec DEC-01 note); tests.
- Out of scope: `.claude/settings.local.json` (excluded on purpose by FR-03); a `.context-brake/runtime/.gitignore` written by `init`.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-02 | `codereview.md#findings` | `claude-mod-install.json` and `claude-statusline.json` stay visible in `git status` because they are not manifest assets (OBJ-01) |

## Requirements

- The paths added are every non-delete planned change and every existing snapshot whose path starts with `.context-brake/runtime/`, except paths planned for deletion.
- They go through the same resolution, sorting, anchoring, and escaping as the other lines; `.claude/settings.local.json` is never added.
- A second `init` produces the same block (the existing snapshots keep the lines stable).

## Context to recover on demand

- TechSpec: `techspec.md` DEC-01 (amended).
- Rules and skills: `code-standards.md`, `file-changes.md`.
- Code: `src/core/services/gitignore-plan.ts` (`planGitIgnoreForInstall`, `ownedPathsFor`), `src/cli/snapshot-helper.ts` (the snapshot list holds the three state files), `src/infrastructure/harnesses/claude-code/auto-restart-ownership.ts`, `statusline-state.ts`, `statusline-default.ts`.

## Work

- [x] T02.1 `runtimeStatePaths(changes, snapshots)` in `gitignore-plan.ts`; `planGitIgnoreForInstall` appends them to `assetPaths`.
- [x] T02.2 Tests: in `tests/unit/gitignore-plan.test.ts` for the function; in `tests/integration/init-gitignore-lifecycle.test.ts` for the lines after `init --yes --auto-restart`, their removal after `--no-auto-restart`, and no flapping on a second run.

## Acceptance criteria

- After `init --yes --auto-restart` the block contains `/.context-brake/runtime/claude-mod-install.json` and `/.context-brake/runtime/claude-statusline.json`; after `--no-auto-restart` the mod-install line is gone.
- A second run plans no change; `.claude/settings.local.json` is not listed.
- `gitignore-plan.ts` stays at or below 100 lines.

## Verification

- Unit and integration: `npm test -- tests/unit/gitignore-plan.test.ts tests/integration/init-gitignore-lifecycle.test.ts tests/integration/init-gitignore.test.ts`.
- End-to-end: the QA run checks `git status --porcelain -uall` after `init --yes --auto-restart` in a real `git init` folder. Manual: none.
- Platforms: Linux, macOS, Windows.
- Environment dependency: none.
- Commands: the tests above, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Expected evidence: tests citing `OBJ-01`, `FR-01`, `CR-02`.

## Affected files

- Modify: `src/core/services/gitignore-plan.ts`, `tests/unit/gitignore-plan.test.ts`, `tests/integration/init-gitignore-lifecycle.test.ts`

## Observability and recovery

- Operational signal: the block lines. Recovery: revert the change.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: runtimeStatePaths(changes, snapshots) adds every non-delete planned change and every existing snapshot under .context-brake/runtime/ that the plan does not delete; planGitIgnoreForInstall appends them to the asset paths. The block now lists claude-mod-install.json, claude-statusline.json (and the opt-out marker while it exists), drops claude-mod-install.json after --no-auto-restart, and stays stable on a second run. settings.local.json is not listed (DEC-HIL-03).
- Changed files: modified src/core/services/gitignore-plan.ts (93 lines), tests/unit/gitignore-plan.test.ts (2 tests), tests/integration/init-gitignore-lifecycle.test.ts (new case, describe blocks split)
- Checks: npm run lint and typecheck exit 0; npm run coverage exit 0: 258 files, 1456 tests, 94.78% lines, 119.4 s wall (one combined run for the three corrections); quality sweep over the touched files: no hit, no file above 100 lines.
- Validated state: HEAD `5c97f37` plus the uncommitted working tree; Windows 11, Node 24.20.0.
- Open items: The real git status check on the built CLI is repeated by the QA run (TC-11).
