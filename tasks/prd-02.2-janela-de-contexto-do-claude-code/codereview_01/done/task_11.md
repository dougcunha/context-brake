# Stable execution context

Load in this exact order:

1. `tasks/prd-02.2-janela-de-contexto-do-claude-code/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T11 — `init --statusline-bridge` does not succeed silently without Claude Code

## Outcome

When `--statusline-bridge` or `--no-statusline-bridge` is given and Claude Code is not among the active harnesses after detection, `init` fails with a clear argument error instead of finishing with no bridge and no message.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T12
- In scope: validation after detection in `runInit`, and its test.
- Out of scope: the existing explicit-exclusion check in `init-arguments.ts`.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-06 | `codereview.md#findings` | Flag ignored when Claude Code is not detected (DEC-08) |

## Requirements

- Same error text and exit code as the explicit-exclusion case (`CliArgumentError`); no file is written.
- `--dry-run` reports the same error.
- When Claude Code is detected, behavior is unchanged.

## Context to recover on demand

- TechSpec: DEC-08, TC-15
- Rules and skills: `cli-output.md`, `tests.md`
- Code: `src/cli/commands/init.ts` (around `buildHarnessContext`); `src/cli/init-arguments.ts:statuslineBridgeRequest`

## Work

- [x] T11.1 Check the request against the detected harness set in `runInit` before planning.
- [x] T11.2 Add a TC-15 case with a fixture repository without Claude Code.

## Acceptance criteria

- `init --statusline-bridge --yes` in a repository with only another harness exits with the argument error and changes nothing.

## Verification

- Unit: the suite where TC-15 lives.
- Integration: existing init suites.
- End-to-end: not applicable.
- Manual: not applicable.
- Platforms: all (T12).
- Environment dependency: none.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run coverage -- --coverage.reportOnFailure`
- Expected evidence: new case green; no changed files in the fixture.

## Affected files

- Modify: `src/cli/commands/init.ts`, the TC-15 test file

## Observability and recovery

- Operational signal: CLI error message.
- Recovery: revert.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `init --statusline-bridge` or `--no-statusline-bridge` now fails with `INVALID_ARGUMENTS` (exit 64, same message as the explicit-exclusion case) when detection finds no `claude-code` in the project, in apply and `--dry-run` modes, before any write. The guard `assertStatuslineBridgeTarget` lives in `init-arguments.ts` and runs right after `planInstallation` in `runInit`.
- Changed files: `src/cli/init-arguments.ts` (guard, shared message constant; 62 lines), `src/cli/commands/init.ts` (guard call; `ParsedInitArgs` now imported from `init-arguments.ts`; still 100 lines, `runInit` under 30), `tests/unit/init-arguments.test.ts` (2 cases), `tests/integration/statusline-install.test.ts` (repository without Claude Code, apply and dry run, directory stays empty).
- Checks: Targeted: 14/14. Full: `npm run build`, `npm run lint`, `npm run typecheck` pass; `npx vitest run --coverage --coverage.reportOnFailure` 263/263 files, 1721 passed, 3 skipped, 95.39% statements, 90.81% branches.
- Validated state: HEAD 5917593 plus uncommitted worktree, Windows 11, 2026-09-26.
- Open items: —
