# Stable execution context

Load in this exact order:

1. `tasks/prd-02.2-janela-de-contexto-do-claude-code/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T13 — Doctor reads the last window from the main-session ledger

## Outcome

`doctor` reports `contextWindow.source: statusline` and the last recorded window even when a subagent ran more recently than the main session.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T12
- In scope: ledger selection in `statusline-context-window.ts` and its test.
- Out of scope: ledger format; the bridge runtime.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/OI-01 | `codereview.md#optional-improvements` | The newest Claude ledger may belong to a subagent, which never receives `statusline` lines (DEC-10) |

## Requirements

- Choose the most recently modified Claude Code ledger that contains a `statusline` line; when none has one, keep today's result (`contextWindowCeiling`, `null`).
- Reading stays bounded: stop at the first ledger, newest first, that has a `statusline` line.

## Context to recover on demand

- TechSpec: DEC-10, TC-17
- Rules and skills: `harness-adapters.md`, `tests.md`
- Code: `src/infrastructure/harnesses/claude-code/statusline-context-window.ts:37-46`; `src/infrastructure/harnesses/claude-code/runtime.ts:19` (ledger key); `statusline-payload.ts:29`

## Work

- [x] T13.1 Select the newest ledger with a `statusline` line.
- [x] T13.2 Add a TC-17 case with a newer subagent ledger without `statusline` lines.

## Acceptance criteria

- With a main ledger holding a 1,000,000 window and a newer subagent ledger, `doctor` reports `statusline` and `1000000`.

## Verification

- Unit: `tests/unit/statusline-context-window.test.ts` new case.
- Integration: existing doctor suites.
- End-to-end: not applicable.
- Manual: not applicable.
- Platforms: all (T12).
- Environment dependency: none.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run coverage -- --coverage.reportOnFailure`
- Expected evidence: new case green.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/statusline-context-window.ts`, `tests/unit/statusline-context-window.test.ts`

## Observability and recovery

- Operational signal: `doctor` `contextWindow` section.
- Recovery: revert.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: doctor reads the last window from the newest Claude Code ledger that has a statusline window, scanning ledgers newest first, so a more recent subagent ledger no longer hides it. With no window in any ledger it still reports contextWindowCeiling and null.
- Changed files: src/infrastructure/harnesses/claude-code/statusline-context-window.ts (48 lines), tests/unit/statusline-context-window.test.ts (the old newest-ledger-without-window case now expects the older window; new all-empty case).
- Checks: Unit 5/5. Full: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run schemas:check`, `npm run package:smoke` pass; `npx vitest run --coverage --coverage.reportOnFailure` 263/263 files, 1722 passed, 3 skipped, 95.39% statements, 90.83% branches.
- Validated state: HEAD 5917593 plus uncommitted worktree, Windows 11, 2026-09-26.
- Open items: Reads stop at the first ledger with a window; the worst case reads every Claude ledger once per doctor run.
