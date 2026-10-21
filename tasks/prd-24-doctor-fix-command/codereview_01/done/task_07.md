# Stable execution context

Load in this exact order:

1. `tasks/prd-24-doctor-fix-command/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T07 — Skipped bridge decision keeps the manifest and the `.gitignore` block

## Outcome

When `fix` skips `STATUSLINE_BRIDGE_INACTIVE` (status line request `'keep'`), the plan keeps the status line bridge script in the manifest assets and in the `.gitignore` marked block, so a skipped decision changes nothing that belongs to the status line.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: the Claude Code install plan for `'keep'` carries the previous manifest's bridge asset forward; tests on the manifest and `.gitignore` for the skip path.
- Out of scope: the `STATUSLINE_BRIDGE_ABSENT` group (open item 1, PRD decision); coverage wall time (open item 2); `.agents/rules/tests.md` (open item 3).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-01 | `codereview.md#findings` | `'keep'` drops the bridge asset from the manifest and the `.gitignore` block |
| DEC-05 | `techspec.md#technical-decisions` | Skip must change nothing |
| FR-05, FR-06, NFR-01 | `prd.md#functional-requirements`, `#non-functional-requirements` | Skipped decision; writes only through the plan |

## Requirements

- With `'keep'`, the planned manifest lists `.claude/hooks/context-brake-statusline.mjs` with the hash the previous manifest recorded, when the previous manifest had it.
- With `'keep'`, the `.gitignore` marked block keeps the bridge line.
- Without a previous manifest entry for the bridge, `'keep'` adds nothing.
- `init` (requests `default`, `install`, `remove`) does not change.

## Context to recover on demand

- TechSpec: DEC-05.
- Rules: `harness-adapters.md`, `file-changes.md`, `tests.md`, `code-standards.md`.
- Code: `src/infrastructure/harnesses/claude-code/planner.ts:31-57` (`planClaudeInstall`), `src/infrastructure/harnesses/claude-code/statusline-planner.ts:23-27`, `src/core/services/installation-adapters.ts:25-26` (assets from `aPlan.assets`), `src/core/contracts/adapter.ts` (`HarnessContext.manifest`).

## Work

- [ ] T07.1 For `'keep'`, return the previous manifest's bridge asset in the Claude Code install plan `assets`.
- [ ] T07.2 Extend `tests/integration/statusline-keep.test.ts` and the `s` case of `tests/integration/fix-interactive.test.ts` with manifest and `.gitignore` assertions; add a `--yes` skip case with unchanged manifest and `.gitignore` hashes.

## Acceptance criteria

- After `fix --yes` on an inactive-bridge fixture, `.context-brake/manifest.json` and `.gitignore` are byte-identical to before, and `STATUSLINE_BRIDGE_INACTIVE` is `SKIPPED`.
- Existing init and status line suites still pass.

## Verification

- Unit: none.
- Integration: `tests/integration/statusline-keep.test.ts`, `tests/integration/fix-interactive.test.ts`, `tests/integration/fix-command.test.ts`, plus the init and status line suites touched by the planner.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows local.
- Environment dependency: none.
- Commands: touched suites by path; `npm run typecheck`; `npm run lint`.
- Expected evidence: passing suites; equal hashes.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/planner.ts` or `statusline-planner.ts`, `tests/integration/statusline-keep.test.ts`, `tests/integration/fix-interactive.test.ts`, `tests/integration/fix-command.test.ts`

## Observability and recovery

- Operational signal: the `fix` Plan card shows no manifest or `.gitignore` change for a skipped bridge decision alone.
- Recovery: revert the task diff.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `planClaudeInstall` returns `assets: keptBridgeAssets(context)`: for the request `'keep'`, the previous manifest's `.claude/hooks/context-brake-statusline.mjs` asset (path and hash); for every other request, an empty list. `installation-adapters.ts` merges `aPlan.assets` into the manifest assets and the `.gitignore` block, so a skipped bridge decision leaves both unchanged. On a TTY, the answer `s` alone now gives an empty plan and no `Apply the plan?` question.
- Changed files: `src/infrastructure/harnesses/claude-code/planner.ts`; tests `tests/integration/fix-command.test.ts` (new describe: `--yes` skip keeps the manifest and `.gitignore` hashes, inside a `.git` folder), `tests/integration/statusline-keep.test.ts` (a planned manifest still lists the bridge), `tests/integration/fix-interactive.test.ts` (the `s` case is its own test: 1 question, all watched hashes unchanged; the harness decision moved to its own describe for the lint function-length rule).
- Checks: the 3 new or changed assertions fail when `keptBridgeAssets` returns `[]` (3 failed) and pass with the fix; 97 suites matching init, statusline, mod, gitignore, asset, claude, planner, fix, auto-restart, install: 551 tests pass; `npm run typecheck` pass; `npm run lint` pass. Quality profile over the touched files: no hit.
- Validated state: worktree on Windows 11, Node 24.20.0, 2026-10-21.
- Open items: none for CR-01. codereview_01 open items 1 to 3 stay with their owners (PRD decision, repository owner).
