# Stable execution context

Load in this exact order:

1. `tasks/prd-04-runner-de-reinicio-automatico/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T12 — Session lines record unparseable harness stream lines

## Outcome

Each `sessions.jsonl` line and each `sessions[]` entry of the summary carries `streamParseErrors`: the number of harness stdout lines the launcher could not parse. This is the observability signal the TechSpec names.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T13 (both change `SessionOutcome` in `run-session.ts`)
- In scope:
  - the `runSessionLineSchema` field;
  - `SessionOutcome` and `session-record.ts`;
  - the regenerated `run-summary.schema.json`;
  - tests.
- Out of scope: the progress-line format, which stays unchanged.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-03 | `codereview.md#Findings` | `streamParseErrors` is never recorded (TechSpec "Observability and rollout" and the vendor stream drift risk) |

## Requirements

- `streamParseErrors` is a non-negative integer taken from `HarnessSessionExit.unparsedLines`. It is 0 when the harness never spawned.
- The change is additive: `v` stays 1, and the schemas regenerate deterministically.
- The line still carries no content (DEC-14).

## Context to recover on demand

- TechSpec: DEC-14, DEC-15, "Observability and rollout"
- Rules: `code-standards.md`, `cli-output.md` (published schema)
- Code:
  - `src/core/contracts/run-records.ts`
  - `src/core/services/run-session.ts:14-40`
  - `src/core/services/session-record.ts:19-37`
  - `src/core/contracts/run-ports.ts:26`

## Work

- [x] T12.1 Add `streamParseErrors` to the session line schema and to `SessionOutcome`, carrying `end.exit.unparsedLines`.
- [x] T12.2 Write the field in `session-record.ts`. Regenerate the schemas (`npm run build`) and confirm `npm run schemas:check`.
- [x] T12.3 Add tests:
  - a unit case in `run-session.test.ts` with a fake exit that carries unparsed lines;
  - a field assertion in `e2e-run-summary.test.ts`, where the fake-harness `noise` scenario gives a count above 0.

## Acceptance criteria

- A session with noise lines records the matching count, and a clean session records 0.
- `schemas:check` and `package:smoke` pass.

## Verification

- Unit: `tests/unit/run-session.test.ts`, `tests/unit/run-records.test.ts`
- Integration: not applicable
- End-to-end: `tests/e2e/e2e-run-summary.test.ts` (TC-18)
- Manual: not required
- Platforms: Windows locally; CI for the others
- Environment dependency: none
- Commands:
  - `npm run build`
  - `npm run typecheck`
  - `npm run lint` (only the 14-error baseline is allowed)
  - `npm run schemas:check`
  - `npm run package:smoke`
  - `npm run coverage` (serialized, in the background)
- Expected evidence: the field is present in the JSON summary and in the log

## Affected files

- Modify:
  - `src/core/contracts/run-records.ts`
  - `src/core/services/run-session.ts`
  - `src/core/services/session-record.ts`
  - `schemas/run-summary.schema.json` (generated)
  - the tests named above
  - `tests/helpers/run-world.ts`, `run-fakes.ts`, and `run-records.ts` (fake exit count and current line fixture)

## Observability and recovery

- Operational signal: `streamParseErrors` in `sessions.jsonl`
- Recovery: the field is additive

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: CR-03 corrected. Each new session line and JSON summary session entry writes `streamParseErrors` from `HarnessSessionExit.unparsedLines`; a session that never spawned writes 0. The v1 schema accepts older lines without the field, while validating present values as non-negative integers. No content is added to the record.
- Changed files: `src/core/contracts/run-records.ts`, `src/core/services/run-session.ts`, `src/core/services/session-record.ts`, generated `schemas/run-summary.schema.json`, `tests/unit/run-session.test.ts`, `tests/unit/run-records.test.ts`, `tests/e2e/e2e-run-summary.test.ts`, and `tests/helpers/run-world.ts`, `run-fakes.ts`, `run-records.ts`.
- Checks: `npm run build`, `npm run typecheck`, `npm run schemas:check`, `npm run package:smoke`, and `npm run coverage` passed. The focused Vitest run passed 47 tests across unit and built-CLI suites. `npm run lint` reported only the 14 recorded PRD-03 QA evidence errors; no T12 error. The quality-profile scan over touched code found no new blocking or reservation hits; `git diff --check` passed.
- Validated state: Uncommitted T01–T11 implementation plus T12, Windows with Node v24.19.0. The fake Codex CLI emitted two malformed lines per session; both `sessions.jsonl` entries and both `sessions[]` entries reported 2. Clean Claude Code sessions reported 0. The published summary schema contains the field. No real harness was launched.
- Open items: Linux and macOS execution remains for CI (PI-03). T13 and T14 are eligible; T13 is recommended because it depends on this `SessionOutcome` change.
