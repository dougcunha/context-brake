# Stable execution context

Load in this exact order:

1. `tasks/prd-04-runner-de-reinicio-automatico/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T13 — A session's final zone and token estimate come from a final ledger reading

## Outcome

When a session ends, the runner reads the ledger once more before it builds the outcome. A session that ends within 1 s of its last hook then records the zone and estimate from that hook, instead of `null` or a stale value.

## Dependencies and boundaries

- Depends on: T12 (same `SessionOutcome` and `run-session.ts` region)
- Unblocks: —
- In scope:
  - a final read in the `LedgerWatch` port and its `NodeLedgerWatcher` implementation;
  - `runSession` awaits that read;
  - the port fakes and tests.
- Out of scope: the 1 s polling interval and the critical-grace logic.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-04 | `codereview.md#Findings` | No final ledger reading at session end (DEC-06, PRD UX "zona final", RF17) |

## Requirements

- The final read runs after the harness exits, and before `finalZone()` and `tokens()` are read.
- A read failure keeps the last reading and never fails the session.
- A poll still in flight when the final read starts must not overwrite it: await the poll or discard its result.
- `core` still imports no infrastructure (QA-05).

## Context to recover on demand

- TechSpec: DEC-06, TC-10
- Rules: `javascript-typescript.md`, `tests.md`
- Code:
  - `src/core/contracts/run-ports.ts:80-83` (`LedgerWatch`)
  - `src/infrastructure/runner/node-ledger-watcher.ts:25-64`
  - `src/core/services/session-watch.ts:64-66`
  - `src/core/services/run-session.ts:36-39`
  - `tests/helpers/run-fakes.ts`

## Work

- [x] T13.1 Change the port to perform one last read and then stop, either as `stop(): Promise<LedgerReading>` or as a new `finish()`.
- [x] T13.2 Implement it in `NodeLedgerWatcher`, with an integration test in which a ledger line written after the last poll appears in the final reading.
- [x] T13.3 Await the final read in `SessionWatch.close` and `runSession`, and update the fakes.
- [x] T13.4 In TC-20 (`e2e-run-steps.test.ts`), assert a non-null `finalZone` for every session (T09 handoff, open item 2).

## Acceptance criteria

- Short sessions in the fake-harness end-to-end runs record a non-null `finalZone`.
- The TC-10 critical-ceiling behavior is unchanged.

## Verification

- Unit: `tests/unit/run-session.test.ts`
- Integration: `tests/integration/node-ledger-watcher.test.ts`
- End-to-end:
  - `tests/e2e/e2e-run-steps.test.ts` (TC-20)
  - `e2e-run-autonomy.test.ts` (TC-23), which must stay 20/20
- Manual: not required
- Platforms: Windows locally; CI for the others
- Environment dependency: none
- Commands:
  - `npm run build`
  - `npm run typecheck`
  - `npm run lint` (only the 14-error baseline is allowed)
  - `npm run coverage` (serialized, in the background)
- Expected evidence: the `finalZone` assertions are green

## Affected files

- Modify:
  - `src/core/contracts/run-ports.ts`
  - `src/infrastructure/runner/node-ledger-watcher.ts`
  - `src/core/services/session-watch.ts`
  - `src/core/services/run-session.ts`
  - `tests/helpers/run-fakes.ts`
  - the tests named above
- Create:
  - `tests/integration/node-ledger-watcher-race.test.ts`

## Observability and recovery

- Operational signal: `zone` in the progress line, and `finalZone` in `sessions.jsonl`
- Recovery: revert to polling only

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: CR-04 corrected. `LedgerWatch.stop()` awaits any in-flight poll, discards a stale result, reads the ledger once more, and returns the final reading. `SessionWatch.close()` and `runSession()` await it before recording the zone and token estimate. A final read failure keeps the previous reading and does not fail the session. Poll interval and critical-grace rules are unchanged.
- Changed files: `src/core/contracts/run-ports.ts`, `src/infrastructure/runner/node-ledger-watcher.ts`, `src/core/services/session-watch.ts`, `src/core/services/run-session.ts`, `tests/helpers/run-world.ts`, `tests/helpers/run-fakes.ts`, `tests/integration/node-ledger-watcher.test.ts`, new `tests/integration/node-ledger-watcher-race.test.ts`, `tests/unit/run-session.test.ts`, and `tests/e2e/e2e-run-steps.test.ts`.
- Checks: `npm run build`, `npm run typecheck`, and `npm run coverage` passed. The focused Vitest run passed 26 tests across the watcher, session, and built-CLI suites. The full coverage run includes TC-23's 20/20 autonomy assertion. `npm run lint` reported only the 14 recorded PRD-03 QA evidence errors; no T13 error. Targeted ESLint and `git diff --check` passed. QA-05 remains clear; QA-06 still has only the previously reported test-double hit.
- Validated state: Uncommitted T01–T12 implementation plus T13, Windows with Node v24.19.0. The real ledger integration case shows a hook line written after the last poll in the final reading. A controlled race test shows the in-flight poll is discarded before the final read. The unit case shows the final zone and estimated tokens in `SessionOutcome`; TC-20 shows every short fake-harness session has a non-null `finalZone` on Claude Code and Codex CLI. No real harness was launched.
- Open items: Linux and macOS execution remains for CI (PI-03). T14 is the final eligible correction; the re-review then needs a session that authored none of the corrections.
