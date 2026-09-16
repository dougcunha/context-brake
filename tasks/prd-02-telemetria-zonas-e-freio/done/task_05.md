# Stable execution context

Load in this exact order:

1. `tasks/prd-02-telemetria-zonas-e-freio/prd.md`
2. `tasks/prd-02-telemetria-zonas-e-freio/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T05 — Doctor reads runtime state and reports cooperative brakes, blocks, and errors

## Outcome

`doctor` reads the session ledgers, block log, and error log from `.context-brake/runtime/` and adds three findings: one `BRAKE_COOPERATIVE` warning per harness with recorded cooperative sessions (naming up to five recent session IDs and the reason), one `BRAKE_BLOCKS_RECORDED` informational finding with the count and path, and one `RUNTIME_ERRORS_RECORDED` warning for errors from the last 24 hours. The published `DoctorReport` schema and exit codes stay unchanged.

## Dependencies and boundaries

- Depends on: T04
- Unblocks: T09
- In scope: `src/infrastructure/runtime/runtime-state-reader.ts`, `src/core/services/brake-session-checks.ts`, `src/core/services/doctor-service.ts`, `src/cli/commands/doctor.ts`, and the suites named below.
- Out of scope: writing any runtime file (doctor stays read-only), the overhead measurement (unchanged), and the E2E brake flow (T09).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF20, RF21 | `prd.md#principais-funcionalidades` | Local block record surfaced; cooperative brake exposed in diagnosis |
| CA-17, CA-18 | `prd.md#critérios-de-aceitação` | Codex cooperative reason; block record contents |
| DEC-10, DEC-11 | `techspec.md#technical-decisions` | Session mode and reason; findings and their severities |
| CMP-11 (checks), CMP-16 (reader), CMP-23 | `techspec.md#components-and-flow` | Session checks, state reader, doctor wiring |
| TC-19 | `techspec.md#test-approach` | Cooperative finding with session IDs and reason, text and JSON parity |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/cli-output.md` (text and JSON parity, exit codes), `.agents/rules/code-standards.md` (limits), `.agents/rules/tests.md` (doctor formatting needs less depth than the brake paths).
- Existing code: `src/core/services/doctor-service.ts` (`DoctorInput`, `diagnoseProject`, `unverifiedFloorFinding`); `src/cli/commands/doctor.ts` (wiring, snapshots, measurer); `src/core/contracts/diagnostics.ts` (`DoctorReport`, finding schema); `src/core/services/report-service.ts` (`buildDoctorReport`).
- Contract or integration: `techspec.md#contracts-and-data` "Doctor findings" for the exact codes, severities, scopes, and remediation text; "Block log and error log v1" for the fields.
- Harness reference: not applicable.

## Work

- [x] T05.1 Implement `runtime-state-reader.ts`: read session lines, block lines, and error lines without failing on missing files or invalid lines; expose the last-24-hours window through the injected clock.
- [x] T05.2 Implement `brake-session-checks.ts` producing `BRAKE_COOPERATIVE`, `BRAKE_BLOCKS_RECORDED`, and `RUNTIME_ERRORS_RECORDED` with the TechSpec content and severities.
- [x] T05.3 Extend `DoctorInput` with the runtime reading and wire it from `runDoctor`; keep `DoctorReport` schema v1 and the existing exit-code derivation untouched.
- [x] T05.4 Add the unit and integration suites with a seeded runtime directory, asserting text and JSON carry the same findings.

## Acceptance criteria

- A ledger whose `session` line is `cooperative` with the Codex hosted-tools reason yields one `BRAKE_COOPERATIVE` warning for `codex-cli` naming the recent session IDs; a Claude Code `enforced` ledger yields none.
- The block finding has severity `ok` and the exact path; the error finding counts only records from the last 24 hours and names their codes.
- With no runtime directory, doctor emits none of the three findings and behaves exactly as before.
- `doctor --json` validates against the published schema and carries the same findings as the text output.

## Verification

- Unit: `tests/unit/brake-session-checks.test.ts` (finding content, severities, five-session cap, 24-hour window with a fake clock).
- Integration: `tests/integration/doctor-brake-sessions.test.ts` (seeded `.context-brake/runtime/` in a temporary repository; text and JSON parity).
- End-to-end: not applicable — the built-CLI flow is T09.
- Manual: none.
- Platforms: not platform-sensitive beyond file reads; exercised by the standard CI matrix.
- Commands: `npm run typecheck`, `npm run lint`, `npx vitest run tests/unit/brake-session-checks.test.ts tests/integration/doctor-brake-sessions.test.ts tests/unit/doctor-service.test.ts`, `npm run schemas:check`, `npm run coverage`
- Environment dependency: none.
- Expected evidence: green suites and unchanged `schemas/doctor-report.schema.json`.

## Affected files

- Modify: `src/core/services/doctor-service.ts`, `src/cli/commands/doctor.ts`, `tests/unit/doctor-service.test.ts`
- Create: `src/infrastructure/runtime/runtime-state-reader.ts`, `src/core/services/brake-session-checks.ts`, `tests/unit/brake-session-checks.test.ts`, `tests/integration/doctor-brake-sessions.test.ts`

## Observability and recovery

- Operational signal: the three findings are the user-visible state of the brake in the field.
- Recovery: removing `.context-brake/runtime/` clears the session and log findings; no configuration change is involved.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: T05 implemented. `NodeRuntimeStateReader` reads the ledger `session` lines, `blocks.jsonl`, and `errors.jsonl` under `.context-brake/runtime/`, tolerates missing files and invalid lines, returns `null` when the runtime directory itself is absent, and windows error records to the last 24 hours through the injected `Clock` (`selectRecentErrors`, the shared core rule). `brakeSessionFindings` emits one `BRAKE_COOPERATIVE` warning per harness with recorded cooperative sessions (up to five most recent session IDs; `impact` carries the most recent recorded `brakeReason`), the `BRAKE_BLOCKS_RECORDED` ok finding with the count and `.context-brake/runtime/blocks.jsonl`, and the `RUNTIME_ERRORS_RECORDED` warning with the last-24-hour count and distinct codes. `DoctorInput` gained the optional reading and `runDoctor` wires it with `systemClock`. `DoctorReport`, its published schema, and the exit-code derivation are untouched, and doctor stays read-only.
- Changed files:
  - Core: `src/core/services/brake-session-checks.ts` (new), `src/core/services/doctor-service.ts` (optional reading + findings wiring)
  - Infrastructure: `src/infrastructure/runtime/runtime-state-reader.ts` (new)
  - CLI: `src/cli/commands/doctor.ts` (`runDoctor` wiring)
  - Tests: `tests/unit/brake-session-checks.test.ts` (new), `tests/integration/doctor-brake-sessions.test.ts` (new), `tests/unit/doctor-service.test.ts` (T05 wiring test; blank lines and one local constant compacted to keep the 100-line rule, no assertions removed)
- Checks:
  - `npm run typecheck` — pass. `npm run lint` — pass (initial failures: `runDoctor` and two test callbacks over 30 lines plus the 100-line file limit; fixed by inlining the reader call, splitting the describes, and compacting `doctor-service.test.ts`).
  - `npx vitest run tests/unit/brake-session-checks.test.ts tests/integration/doctor-brake-sessions.test.ts tests/unit/doctor-service.test.ts` — 3 files / 14 tests pass.
  - `npm run build` — pass; `npm run schemas:check` — pass (the generated config schema is unchanged and no schema file appears in the diff; `DoctorReport` v1 is not a published file).
  - `npm run coverage` — 122 files / 575 tests pass, exit 0; `All files` 93.51% statements/lines. New modules: `brake-session-checks.ts` 100% lines/95.23% branch (line 45 is the defensive `?? null` for an empty cooperative list), `runtime-state-reader.ts` 95.89% lines (39 and 46-47 are the non-ENOENT rethrow paths, the same shape `node-session-ledger.ts` leaves uncovered), `doctor-service.ts` 89.85% (unchanged coverage profile).
  - Acceptance evidence: codex-cli cooperative ledger with the hosted-tools reason yields one warning naming the three session IDs while the Claude Code `enforced` ledger yields none and Antigravity yields its own warning (TC-19, CA-17); block finding `ok` with the exact path and count 2 despite an injected invalid line (CA-18, RF20); error finding counts only the recent `INVALID_CONFIG` record and excludes the 25-hour-old `UNEXPECTED` one (DEC-11); the 24-hour boundary is pinned with a fake clock (exactly 24 hours stays, one millisecond older is dropped); text and JSON render the same findings and the JSON parses with `doctorReportSchema` (TC-19 parity); with no runtime directory doctor emits none of the three findings and stays healthy with exit code 0.
  - Quality profile QA-01 to QA-11, scoped to the 7 diff files: QA-01, 02, 03, 04, 07, 09, 10, 11 (parameters and line counts) empty; every diff file is at most 100 lines and no declaration has 4+ parameters. QA-05 and QA-06 have empty scopes in this diff (no in-process-loading file and no hook-response file), so their commands are skipped; QA-08's bundle guard arrives with T08 and no bundle is touched.
- Validated state: working tree on HEAD `dfe94b5` plus this T05 diff; Node v24.19.0, Windows 11, PowerShell 7; injected `Clock` (fake clocks in both suites); no network and no real harness. The integration suite seeds through the real T03/T04 writers (`NodeSessionLedger`, `NodeBlockLog`, `NodeRuntimeErrorLog`) on a temporary filesystem. No built-CLI flow is claimed: the end-to-end lane is T09.
- Open items:
  - Interpretation note (reviewer): the `BRAKE_BLOCKS_RECORDED` ok finding is emitted for any readable runtime directory, including a zero count; only a missing runtime directory suppresses all three findings, per the acceptance criterion. Pinned by `tests/unit/brake-session-checks.test.ts` and `tests/unit/doctor-service.test.ts`.
  - Interpretation note: the `BRAKE_COOPERATIVE` message names up to five most recent session IDs without restating the total; `impact` holds the most recent cooperative session's recorded reason, per the TechSpec findings table.
  - Design note: `RuntimeStateReading.errors` is already windowed by the reader (`selectRecentErrors` with the injected `Clock`), so `brakeSessionFindings` stays clock-free and unit-testable; the same helper is covered directly at the boundary in the unit suite.
  - No lane or manifest change: `tests/integration/doctor-brake-sessions.test.ts` carries no process marker, so `tests/test-lanes.ts` is untouched; no `tasks.md` edit and no task move were made (caller's responsibility).
  - No ADR candidate; no architectural deviation.

### ADR candidates

None - direct TechSpec implementation or local decision.
