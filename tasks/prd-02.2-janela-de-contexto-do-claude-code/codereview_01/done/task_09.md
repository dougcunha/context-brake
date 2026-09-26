# Stable execution context

Load in this exact order:

1. `tasks/prd-02.2-janela-de-contexto-do-claude-code/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T09 — A previous status line command ending in a comment still runs

## Outcome

The installed pipeline closes the subshell on its own line, so a previous command such as `ccstatusline # note` keeps printing the user's status line.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T10
- In scope: `bridgeCommand`, bridge-command recognition, and TC-10.
- Out of scope: PowerShell-only Windows (TechSpec risk); root quoting rules.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-05 | `codereview.md#findings` | `( <previous> )` lets a trailing `#` comment swallow the `)` (FR-02, OBJ-02) |

## Requirements

- The pipeline form is `node "<root>/<bridge>" --pipe | ( <previous>`, a newline, then `)`.
- Existing installs keep working: a command written in the old format is still recognized as the bridge's own (DEC-09 exclusion), and re-running `init --statusline-bridge` rewrites it; `STATUSLINE_BRIDGE_INACTIVE` compares against the state's `installedCommand` and must not fire falsely right after an upgrade that rewrote both.
- The command keeps its newline escaped (`\n`) in `settings.local.json`.

## Context to recover on demand

- TechSpec: DEC-02, DEC-09, DEC-10, TC-10
- Rules and skills: `file-changes.md`, `harness-adapters.md`, `tests.md`
- Code: `src/infrastructure/harnesses/claude-code/statusline-settings.ts:bridgeCommand`, and the bridge-command recognition it feeds

## Work

- [x] T09.1 Change the pipeline format.
- [x] T09.2 Verify bridge-command recognition and state comparison with the old and new formats; rerun `init` idempotency (TC-12).
- [x] T09.3 Add the trailing-comment case to TC-10.

## Acceptance criteria

- `sh -c` on the planned command with previous `echo hi # note` prints `hi` and exits 0 (asserted in T10's real-shell test).
- TC-10 and TC-12 pass.

## Verification

- Unit: TC-10 new case.
- Integration: `statusline-install.test.ts` idempotency.
- End-to-end: covered by T10.
- Manual: not applicable.
- Platforms: POSIX shells and Git Bash (T12).
- Environment dependency: none.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run coverage -- --coverage.reportOnFailure`
- Expected evidence: green TC-10 and TC-12.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/statusline-settings.ts`, `tests/unit/statusline-planner.test.ts`

## Observability and recovery

- Operational signal: `doctor` `contextWindow.bridge: installed`.
- Recovery: re-run `init --statusline-bridge` after a revert.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `bridgeCommand` closes the subshell on its own line: `node "<root>/.claude/hooks/context-brake-statusline.mjs" --pipe | ( <previous>` + newline + `)`, so a trailing `# comment` no longer swallows the `)`. Bridge recognition (`isBridgeStatusline`) matches the script path, so an old single-line command is still recognized; `doctor` compares the local command with the state `installedCommand`, which stay equal until the next `init` rewrites both. TechSpec DEC-02 amended.
- Changed files: `src/infrastructure/harnesses/claude-code/statusline-settings.ts`, `tests/unit/statusline-planner.test.ts` (new CR-05 case; expected commands updated), `tests/integration/statusline-install.test.ts`, `tests/e2e/e2e-statusline-bridge.test.ts` (expected commands), `techspec.md` DEC-02.
- Checks: `sh -c` of `cat >/dev/null | ( echo hi # note` + newline + `)` prints `hi`, exit 0. Targeted suites 5 files 37/37 (planner, install, install-invalid, e2e bridge, diagnostics). Full: `npm run lint` pass, `npm run typecheck` pass, `npm run build` pass, `npx vitest run --coverage --coverage.reportOnFailure` 262/262 files, 1714 passed, 3 skipped, 95.31% statements, 90.76% branches.
- Validated state: HEAD 5917593 plus uncommitted worktree, Windows 11, Git Bash sh, 2026-09-26.
- Open items: The planned command through a real shell for all T10 cases is proven in T10. This repository's own `.agents/settings.local.json` keeps the old single-line command until `init` is rerun.
