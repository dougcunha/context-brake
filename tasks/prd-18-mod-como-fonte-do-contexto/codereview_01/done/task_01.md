# Stable execution context

Load in this exact order:

1. `tasks/prd-18-mod-como-fonte-do-contexto/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T01 — Report a reading without a window once, and keep the log from filling

## Outcome

A `usage()` reading that fails or arrives without a window leaves one `ERROR_INTERNAL` record in the mod log, not one per tool call, so FR-09 holds and `doctor` can tell a mod that sees `usage()` without a window from one that is off.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T02
- In scope: `mod/context-reading.ts`, `mod/mod-log.ts` (a read of the last recorded code), and the tests of FR-09.
- Out of scope: the reading file contract, the hook, `doctor`.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-01 | `codereview.md#findings` | A reading without a window is not reported; a test asserts the opposite |

## Requirements

- FR-09: when `usage()` fails or returns no window, the mod writes nothing to the reading file and writes an error code to the runtime log.
- The restart log keeps a bounded number of records (`RESTART_LOG_MAX_RECORDS`); a report on every tool call would push real restart decisions out, so the same condition is reported once until another record follows it.

## Context to recover on demand

- TechSpec: `DEC-04`, `Errors, security, and recovery`.
- Rules and skills: `code-standards.md`, `harness-adapters.md` (failure policy), `ts-tests`.
- Code: `mod/context-reading.ts:publishChanged` and `publishContextReading`; `mod/mod-log.ts` (`recordDecision`, `readLog` is private); `core/services/auto-restart-notices.ts:appendLogRecord`; `tests/integration/claude-mod-reading.test.ts`.

## Work

- [x] T01.1 Export a `lastRecordedCode($)` from `mod/mod-log.ts` that returns the code of the last record or `undefined`.
- [x] T01.2 In `mod/context-reading.ts`, report `ERROR_INTERNAL` for a missing window and for a failure only when the last recorded code is not already `ERROR_INTERNAL`.
- [x] T01.3 Change the missing-window test to expect one `ERROR_INTERNAL`, and add a test that three failing or windowless calls leave one record and that a different record in between allows a new one.

## Acceptance criteria

- A reading without a window writes no reading file and leaves exactly one `ERROR_INTERNAL` record after several calls.
- A rejecting `usage()` behaves the same.
- A restart record written between two failures allows the second failure to be recorded.
- The bundle test and the blocking greps stay clean.

## Verification

- Unit: not applicable.
- Integration: `tests/integration/claude-mod-reading.test.ts` with the scene fixture.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows locally; CI for the others.
- Environment dependency: none.
- Commands: `npm run lint`, `npm run typecheck`, `npm run coverage`
- Expected evidence: passing suite and empty QA-01 to QA-05 greps on the touched files.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/mod/context-reading.ts`, `mod/mod-log.ts`, `tests/integration/claude-mod-reading.test.ts`

## Observability and recovery

- Operational signal: one `ERROR_INTERNAL` in `.context-brake/runtime/restart/claude-code/<sessionId>.json`.
- Recovery: none needed; the record rotates out with the bounded log.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: a reading that fails or arrives without a window now leaves one `ERROR_INTERNAL` record in the mod log, until another record follows it; the missing-window test expects the code, and a new test proves three calls leave one record and a record in between allows another.
- Changed files: `src/infrastructure/harnesses/claude-code/mod/context-reading.ts` (`reportOnce`), `mod/mod-log.ts` (`lastRecordedCode`), `tests/integration/claude-mod-reading.test.ts`.
- Checks: `npm run lint`, `npm run typecheck`, `npm run coverage` (252 files, 1259 tests), `claude plugin validate` on the rebuilt bundle (passed with warnings about the existing handlers); blocking greps empty.
- Validated state: base `63fd5cb` plus the uncommitted diff; Windows.
- Open items: none.
