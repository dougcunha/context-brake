# Stable execution context

Load in this exact order:

1. `tasks/prd-02.2-janela-de-contexto-do-claude-code/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T14 — Doctor text line uses an escaped newline like its neighbors

## Outcome

`renderDoctorText` builds the context window line with `\n`, consistent with the surrounding lines, and prints the same text.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T12
- In scope: `src/cli/output/text.ts:151-152`.
- Out of scope: any other output change.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/OI-02 | `codereview.md#optional-improvements` | Template literal ends with a raw newline instead of `\n` |

## Requirements

- Output is byte-identical to today's.

## Context to recover on demand

- Rules and skills: `cli-output.md`, `code-standards.md`
- Code: `src/cli/output/text.ts:150-152`

## Work

- [x] T14.1 Replace the raw newline with `\n`.

## Acceptance criteria

- Doctor text tests pass unchanged.

## Verification

- Unit: existing doctor text tests.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: not applicable.
- Platforms: all (T12).
- Environment dependency: none.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run coverage -- --coverage.reportOnFailure`
- Expected evidence: unchanged test results.

## Affected files

- Modify: `src/cli/output/text.ts`

## Observability and recovery

- Operational signal: not applicable.
- Recovery: revert.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: The doctor context window line ends with an escaped newline like its neighbors; output unchanged.
- Changed files: src/cli/output/text.ts
- Checks: tests/unit/doctor-context-window.test.ts 4/4. Full: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run schemas:check`, `npm run package:smoke` pass; `npx vitest run --coverage --coverage.reportOnFailure` 263/263 files, 1722 passed, 3 skipped, 95.39% statements, 90.83% branches.
- Validated state: HEAD 5917593 plus uncommitted worktree, Windows 11, 2026-09-26.
- Open items: -
