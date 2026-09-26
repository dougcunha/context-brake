# Stable execution context

Load in this exact order:

1. `tasks/prd-02.2-janela-de-contexto-do-claude-code/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T10 — The installed status line command is proven through a real shell

## Outcome

An integration test runs the exact `statusLine.command` planned by `init` through `sh -c` (Git Bash on Windows), for roots and previous commands that stress quoting, and asserts the user's output and exit code are preserved.

## Dependencies and boundaries

- Depends on: T09
- Unblocks: T12
- In scope: new integration test and its lane registration.
- Out of scope: PowerShell-only Windows (unsupported by design; the README documents it).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-03 | `codereview.md#findings` | No test runs the planned command in a shell (NFR-06, DEC-02) |
| codereview_01/CR-05 | `codereview.md#findings` | Regression check for the trailing-comment case |

## Requirements

- Cases: repository root with spaces and accents; previous command with single and double quotes; previous command with a trailing `# comment`; no previous command.
- Each case asserts stdout byte-equal to the previous command run alone, the same exit code, and a `statusline` line in the ledger.
- On Windows the test uses Git Bash's `sh`; when no POSIX shell is found, it skips with a reason instead of passing silently.
- Registered in `tests/test-lanes.ts` as a process test.

## Context to recover on demand

- TechSpec: DEC-02, NFR-06 platforms, TC-11, TC-21
- Rules and skills: `tests.md`, `node.md`
- Code: `tests/helpers/built-hook.ts:runStatuslinePipeline` (no shell today); `tests/helpers/statusline-world.ts`; `tests/test-lanes.ts`

## Work

- [x] T10.1 Add a helper that runs a command string through `sh -c` with stdin.
- [x] T10.2 Write the cases above against the built bridge, planning the command through the Claude planner.
- [x] T10.3 Register the lane.

## Acceptance criteria

- All cases pass locally on Windows Git Bash and in the CI matrix (T12).

## Verification

- Unit: not applicable.
- Integration: new `tests/integration/statusline-shell.test.ts`.
- End-to-end: not applicable.
- Manual: not applicable.
- Platforms: Linux, macOS, Windows Git Bash.
- Environment dependency: POSIX shell on PATH (present on CI runners).
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run coverage -- --coverage.reportOnFailure`
- Expected evidence: the cases pass, none skipped on CI.

## Affected files

- Create: `tests/integration/statusline-shell.test.ts`
- Modify: `tests/helpers/built-hook.ts` (if the helper lives there), `tests/test-lanes.ts`

## Observability and recovery

- Operational signal: not applicable.
- Recovery: not applicable (test only).

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: New end-to-end test runs the status line command through `sh -c`: the command `init --statusline-bridge` wrote (built CLI) on a root `Meus Projetos/ação` with a previous user command containing single and double quotes, plus commands from `bridgeCommand` for a previous command ending in `# note`, a failing previous command (exit 3 with partial output), and no previous command. Each asserts byte-equal stdout and equal exit code against the previous command alone, and the first asserts a `statusline` ledger line for the fixture session. Without a POSIX shell the cases skip with a reason locally and fail on CI.
- Changed files: new `tests/e2e/e2e-statusline-shell.test.ts` (process lane through `tests/e2e/`, so `tests/test-lanes.ts` needs no entry), new `tests/helpers/posix-shell.ts` (`findPosixShell`, `runInShell`).
- Checks: `npx vitest run tests/e2e/e2e-statusline-shell.test.ts` 4/4 with Git Bash `/usr/bin/sh`, none skipped. Mutation: restoring the old `( <previous> )` format fails the trailing-comment case (1 failed, 3 passed); source restored and rerun green. `tests/unit/test-lanes.test.ts` 4/4. `npm run lint` and `npm run typecheck` pass. Full suite after T11 (shared run): `npm run build` pass, `npx vitest run --coverage --coverage.reportOnFailure` 263/263 files, 1721 passed, 3 skipped, 95.39% statements, 90.81% branches.
- Validated state: HEAD 5917593 plus uncommitted worktree, Windows 11, Git Bash, 2026-09-26.
- Open items: Linux and macOS evidence comes from the CI run in T12.
