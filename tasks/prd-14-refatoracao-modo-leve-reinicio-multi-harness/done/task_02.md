# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md`
2. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Ask for a markdown handoff and detect the reset marker one way

## Outcome

With `autoRestart` on and no `snapshot.command`, the telemetry block at and above the trigger zone asks the agent to write `.context-brake/handoff.md` and end its reply with `[REQUEST_SESSION_RESET]`. Every component that reacts to the marker accepts a reply whose last line ends with it.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T03, T04
- In scope: `restartMode`, `zoneAction` signature and handoff text, `brake-engine` wiring, deletion of `hasResetSignal`, updated tests and in-process fixture expectations.
- Out of scope: delivering the handoff (T03); restart flows (T04-T07).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01, NFR-05 | `prd.md#functional-requirements` | Handoff action only with restart on and no skill |
| FR-12 | `prd.md#functional-requirements` | One detector |
| DEC-01, DEC-08, DEC-18 | `techspec.md#technical-decisions` | Mode derivation, action text, detector, notice text |
| CMP-01, CMP-02, CMP-05 | `techspec.md#components-and-flow` | Files |
| TC-01, TC-11 | `techspec.md#test-approach` | Tests |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `tests.md` (agent-facing text, 60-token budget).
- Existing code: `src/core/services/zone-guidance.ts:13-17`; `reset-notice.ts:3-9`; `brake-engine.ts:46-53`; `tests/integration/runtime-in-process.test.ts:51-56`; `tests/unit/reset-notice.test.ts`.
- Contract: TechSpec "Contracts and data", telemetry action.

## Work

- [x] T02.1 Add `src/core/services/restart-mode.ts` with `restartMode(config)` and unit tests for the three modes.
- [x] T02.2 Change `zoneAction` to take `{ zone, snapshot, mode }`, add the handoff text (with `now` in `CRITICAL`), and update its callers.
- [x] T02.3 Apply DEC-18 to the reset notice text. Replace `hasResetSignal` with `endsWithResetSignal` in `brake-engine.ts`; delete `hasResetSignal` and its tests; add TC-11 unit cases.
- [x] T02.4 Flip the in-process expectations for `pi/message-end.json` and `oh-my-pi/session-stop.json` to "notice".
- [x] T02.5 Assert exact blocks for `RED`/`CRITICAL` in each mode and the 60-token budget (TC-01).

## Acceptance criteria

- TC-01 and TC-11 pass; the handoff text appears only in `handoff` mode at or above the trigger zone.
- A reply with text then the marker on its last line produces the reset notice on Codex, Pi, and Oh-My-Pi.
- Snapshot-mode and off-mode blocks are byte-identical to before.

## Verification

- Unit: `tests/unit/zone-guidance.test.ts`, `tests/unit/restart-mode.test.ts`, `tests/unit/reset-notice.test.ts`.
- Integration: `tests/integration/runtime-in-process.test.ts`.
- End-to-end: not applicable.
- Manual: not applicable.
- Platforms: all, through CI.
- Commands: `npm run lint`, `npm run typecheck`, the touched suites by path.
- Environment dependency: none.
- Expected evidence: passing suites; QA-01 to QA-10 clean on the diff.

## Affected files

- Modify: `src/core/services/zone-guidance.ts`, `reset-notice.ts`, `brake-engine.ts`; `tests/unit/zone-guidance.test.ts`, `tests/unit/reset-notice.test.ts`, `tests/integration/runtime-in-process.test.ts`.
- Create: `src/core/services/restart-mode.ts`, `tests/unit/restart-mode.test.ts`.

## Observability and recovery

- Operational signal: the telemetry block.
- Recovery: revert the task commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `restartMode(config)` (off/snapshot/handoff); `zoneAction(zone, snapshot, mode = "off")` returns `save handoff to .context-brake/handoff.md, end reply with [REQUEST_SESSION_RESET]` in handoff mode at or above the trigger zone, and keeps snapshot and off texts byte-identical; `hasResetSignal` deleted, the brake engine uses `endsWithResetSignal`; the reset notice adds "; it resumes by itself." when the restart mode is not off (DEC-18).
- Changed files: `src/core/services/restart-mode.ts` (new), `zone-guidance.ts`, `reset-notice.ts`, `brake-engine.ts`; tests `tests/unit/restart-mode.test.ts` (new), `zone-guidance.test.ts`, `reset-notice.test.ts`, `runner-reset-signal.test.ts`, `telemetry-block-budget.test.ts`, `tests/integration/runtime-in-process.test.ts`.
- Checks: `npm run typecheck` ok; `npm run lint` "No issues found"; `npm run build` ok; vitest unit suites (zone-guidance, restart-mode, reset-notice, runner-reset-signal, telemetry-block-budget, session-zone, telemetry-block) 75 passed; integration and runtime suites touching the marker (12 files) 71 passed; built in-process test 3 passed with the Pi `message-end.json` and Oh-My-Pi `session-stop.json` fixtures now producing the notice. Quality profile QA-01..QA-10 over the diff: no hits.
- Validated state: Windows 11, Node 24.19.0, base a31e183 plus this diff.
- Open items: deviation from the original DEC-01 text (content list and `now` dropped to stay within the 60-token budget); TechSpec DEC-01 and "Contracts and data" amended accordingly. `zoneAction` takes `mode` as a third positional parameter with default `off` instead of an object, so existing callers stay unchanged.

### ADR candidates

None - direct TechSpec implementation or local decision.
