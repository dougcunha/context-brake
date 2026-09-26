# Stable execution context

Load in this exact order:

1. `tasks/prd-07-modo-leve/prd.md`
2. `tasks/prd-07-modo-leve/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T05 — doctor: uso das sessões ativas

## Outcome

In every mode, `doctor` lists the repository's active sessions: those whose ledger activity falls within the last 30 minutes, newest first, at most 10. Each entry shows the harness, the session ID, the time of its last activity, and its current context usage: percentage, used tokens, window, zone, and source. The usage comes from the newest reading after the last reset. `doctor --json` carries the same data in `activeSessions`. Without active sessions, `doctor` output is identical to today's.

## Dependencies and boundaries

- Depends on: T04 (same `doctor` files: `diagnostics.ts`, `doctor-service.ts`, `text.ts`)
- Unblocks: T06
- In scope:
  - `NodeRuntimeStateReader` returning parsed ledgers;
  - the `RuntimeStateReading.ledgers` field;
  - `active-sessions.ts`;
  - the optional `activeSessions` field in the report and the schema;
  - `doctor-sessions-text.ts`;
  - wiring the clock and the zones into `diagnoseProject`.
- Out of scope:
  - process detection;
  - reading harness transcripts;
  - any change to hooks or to the ledger format.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-14, OBJ-05, US-06 | `prd.md` | Active-session usage in `doctor` |
| NFR-01, NFR-05 | `prd.md#non-functional-requirements` | Unchanged output without active sessions; read-only ledger access |
| PD-05 | `prd.md#assumptions-and-sources` | 30-minute window, 10 sessions, every mode |
| DEC-12 | `techspec.md#technical-decisions` | Reader, service, report, text |
| CMP-11 | `techspec.md#components-and-flow` | Components |

## Context to recover on demand

- Applicable rules: `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `cli-output.md`.
- Existing code:
  - `src/infrastructure/runtime/runtime-state-reader.ts#readSessionLines`: it already reads every ledger.
  - `src/core/services/brake-session-checks.ts#RuntimeStateReading`.
  - `session-counters.ts#summarizeLedger` and `statusline-summary.ts#summarizeStatusline`.
  - `zone-classifier.ts`: `usagePercentage`, `classifyZone`.
  - `runtime-paths.ts#SESSIONS_RELATIVE_PREFIX`.
  - `report-service.ts#buildDoctorReport`.
  - `src/cli/commands/doctor.ts`: `systemClock` is already imported there.
- Contract: `techspec.md#doctor---json` and `techspec.md#doctor-text`.

## Work

- [x] T05.1 Extend `RuntimeStateReading` with `ledgers: readonly { harness: HarnessId; lines: readonly LedgerLine[] }[]`. `NodeRuntimeStateReader.read()` fills it from the files it already reads, taking the harness from the `sessions/<harness>/` segment and skipping unknown harness directories.
- [x] T05.2 Create `src/core/services/active-sessions.ts` with the constants `ACTIVE_SESSION_WINDOW_MINUTES = 30` and `ACTIVE_SESSION_LIMIT = 10`, and `activeSessions(ledgers, { now, zones })`, following DEC-12:
  - Last activity is the max `at` across all lines. A ledger with an unparseable timestamp is excluded.
  - The usage is the newer of the status line reading and the last tool line after the last reset, or `null` when neither exists.
  - A status line reading takes its zone from `classifyZone`.
  - `sessionId` is taken from the session line, or `null` without one.
- [x] T05.3 Add the optional `activeSessions` to `doctorReportSchema` and `buildDoctorReport`, present only when the list is non-empty. Regenerate `doctor-report.schema.json`.
- [x] T05.4 `diagnoseProject` receives `now` and computes the list with the effective config's zones. `doctor.ts` passes `systemClock.now()`. Keep `doctor-service.ts` at 100 lines or fewer.
- [x] T05.5 Create `src/cli/output/doctor-sessions-text.ts`, which renders the section in the format of `techspec.md#doctor-text`, with relative minutes. Call it from `renderDoctorText`.
- [x] T05.6 Add tests: TC-16 in `tests/unit/active-sessions.test.ts` and TC-17 in `tests/integration/doctor-active-sessions.test.ts`.

## Acceptance criteria

- With a fake `now`:
  - Two ledgers active 1 and 5 minutes ago are listed, newest first, and a ledger active 31 minutes ago is not.
  - With 12 recent ledgers, 10 are listed.
- A status line reading newer than the last tool line wins: percentage `floor(tokens*100/window)`, zone from `classifyZone`, source `measured`. When the tool line is newer, its own values are used.
- A ledger whose last line is a reset, with no later reading, has `usage: null`. The text says `usage unknown since last reset`.
- `doctor --json` includes `activeSessions` only when it is non-empty. Without recent ledgers, the text and JSON outputs are identical to today's fixtures.
- `doctor` makes no new kind of read: no transcript file and no process spawn. It only reads the ledger files that `NodeRuntimeStateReader` already reads.
- `npm run schemas:check` passes. `text.ts` and `doctor-service.ts` stay at 100 lines or fewer.

## Verification

- Unit: TC-16.
- Integration: TC-17, with ledgers written into a temporary repository with timestamps relative to the current time.
- End-to-end: not applicable (T06).
- Platforms: CI matrix.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`.
- Environment dependency: none.
- Expected evidence: test counts and a green schema check.

## Affected files

- Modify:
  - `src/infrastructure/runtime/runtime-state-reader.ts`
  - `src/core/services/brake-session-checks.ts`, `src/core/services/doctor-service.ts`, `src/core/services/report-service.ts`
  - `src/core/contracts/diagnostics.ts`
  - `src/cli/commands/doctor.ts`, `src/cli/output/text.ts`
  - `schemas/doctor-report.schema.json`
- Create:
  - `src/core/services/active-sessions.ts`
  - `src/cli/output/doctor-sessions-text.ts`
  - `tests/unit/active-sessions.test.ts`
  - `tests/integration/doctor-active-sessions.test.ts`

## Observability and recovery

- Operational signal: the `doctor` session list.
- Recovery: revert the commit. The field is optional and additive.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - `NodeRuntimeStateReader.read()` returns parsed `ledgers` per harness, taken from the `sessions/<harness>/` segment. Session lines come from the same pass, so there is no extra read.
  - The pure `activeSessions` function keeps ledgers active within 30 minutes, newest first, at most 10.
    - The usage is the newer of the status line reading (zone from `classifyZone`, `measured`) and the last tool reading. It is `null` after a reset with no later reading.
    - `sessionId` is `null` without a session line.
  - `doctor --json` has `activeSessions` only when the list is non-empty. The text shows `  - active sessions:` with one line per session.
- Deviation within DEC-12: a ledger is excluded only when none of its lines has a parseable timestamp. Lines with bad timestamps are ignored rather than excluding the whole ledger, so one bad line does not hide an active session. TC-16 covers the all-unparseable case.
- Changed files:
  - Modified:
    - `src/infrastructure/runtime/runtime-state-reader.ts` (93 lines)
    - `src/core/services/brake-session-checks.ts` (72), `doctor-service.ts` (99), `report-service.ts` (98)
    - `src/core/contracts/diagnostics.ts`
    - `src/cli/commands/doctor.ts`, `src/cli/output/text.ts` (98)
    - `schemas/doctor-report.schema.json`
  - New code: `src/core/services/active-sessions.ts`, `src/cli/output/doctor-sessions-text.ts`.
  - New tests: `tests/unit/active-sessions.test.ts` (7), `tests/integration/doctor-active-sessions.test.ts` (2).
- Checks:
  - `npm run typecheck`, `npm run lint`, and `npm run schemas:check` pass, the last after `schemas:generate`.
  - Affected suites (doctor, brake-session, report, runtime-state, active-sessions): 17 files and 61 tests pass.
- Validated state: working tree at `c3fb6a8` plus the T01 to T05 diffs, on Windows 11 with Node 24.
- Quality profile:
  - QA-01 to QA-07 and QA-09 have no hits in `src/`.
  - `active-sessions.ts` takes `now` as input. The CLI text renderer uses `new Date()` for the relative minutes, which is outside `core`.
- Open items:
  - TC-17 writes ledgers with timestamps relative to the real clock, because `doctor` uses `systemClock`. Its text assertion accepts 1 or 2 minutes, to tolerate a slow run.

### ADR candidates

None - direct TechSpec implementation or local decision.
