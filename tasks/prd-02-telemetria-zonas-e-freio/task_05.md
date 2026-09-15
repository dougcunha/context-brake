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

- [ ] T05.1 Implement `runtime-state-reader.ts`: read session lines, block lines, and error lines without failing on missing files or invalid lines; expose the last-24-hours window through the injected clock.
- [ ] T05.2 Implement `brake-session-checks.ts` producing `BRAKE_COOPERATIVE`, `BRAKE_BLOCKS_RECORDED`, and `RUNTIME_ERRORS_RECORDED` with the TechSpec content and severities.
- [ ] T05.3 Extend `DoctorInput` with the runtime reading and wire it from `runDoctor`; keep `DoctorReport` schema v1 and the existing exit-code derivation untouched.
- [ ] T05.4 Add the unit and integration suites with a seeded runtime directory, asserting text and JSON carry the same findings.

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

- Produced result: Pending execution.
- Changed files: Pending execution.
- Checks: Pending execution.
- Validated state: Pending execution (code or diff, configuration, platform, and environment).
- Open items: Pending execution.

### ADR candidates

Pending execution. `sdd-execute-task` replaces this text with structured candidates or `None - direct TechSpec implementation or local decision`.
