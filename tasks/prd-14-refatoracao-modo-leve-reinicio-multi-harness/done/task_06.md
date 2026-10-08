# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md`
2. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T06 — Restart on Pi and Oh-My-Pi

> Amended by DEC-HIL-03 (2026-10-07): Pi is automatic (DEC-21); Oh-My-Pi uses the editor-prefill restart (DEC-19) and maps `session_switch` to a session reset (DEC-20). Fixtures from T01: `tests/fixtures/harnesses/pi/{agent-start,agent-end-reset,input-interactive,input-extension,session-start-new}.json`, `tests/fixtures/harnesses/oh-my-pi/{session-stop-reset,input-interactive}.json`.

## Outcome

For each of Pi and Oh-My-Pi: where T01 passed P1-P4, `init --auto-restart` plans `context-brake-restart.js` in its extensions directory, and a valid marker reply opens a new session seeded once, under the same guards and switches as PRD-11. Where T01 did not pass, the harness declares semi-automatic restart: the reset notice names `/new` and the new session resumes through T03.

## Dependencies and boundaries

- Depends on: T01, T03, T04
- Unblocks: T08
- In scope: restart asset, in-process `RestartHost`, guard store, typed-prompt reset, planner entry, capability state and impact text, tests from T01 captures.
- Out of scope: init target check and `AUTO_RESTART_MODE` (T08); doctor (T09).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-02, FR-04, FR-07, FR-08, FR-09, FR-10, FR-12 | `prd.md#functional-requirements` | Automatic or semi-automatic restart on Pi and Oh-My-Pi |
| NFR-01, NFR-02, NFR-05 | `prd.md#non-functional-requirements` | Safety; platforms; opt-in file |
| DEC-07, DEC-10, DEC-15, DEC-16 | `techspec.md#technical-decisions` | Guard state, destination, separate file, facts |
| CMP-10, CMP-11 | `techspec.md#components-and-flow` | Files |
| TC-09, TC-10 | `techspec.md#test-approach` | Tests |

## Context to recover on demand

- Applicable rules: `harness-adapters.md`, `node.md` (in-process I/O), `file-changes.md`, `tests.md`.
- Existing code: `src/infrastructure/harnesses/{pi,oh-my-pi}/{runtime,events,planner,capabilities,adapter}.ts`; `assets/runtime/pi-extension.ts`; `scripts/asset-bundler.ts`; `tests/support/harness-simulator/in-process-driver.ts`.
- Harness reference: Pi and Oh-My-Pi sections as updated by T01; T01 handoff for the destination.

## Work

- [x] T06.1 Read the T01 handoff; for each harness pick automatic or semi-automatic and record it in this handoff.
- [x] T06.2 Automatic path: `assets/runtime/pi-restart.ts` (and Oh-My-Pi) plus `src/infrastructure/harnesses/<h>/restart-host.ts` implementing `RestartHost` with the calls T01 verified; in-memory guard store keyed by project root (or async file per the T01 P5 result); bundle entry; planner entry only with `autoRestart` on.
- [x] T06.3 Simulated-host tests from the T01 captures: valid signal → one new session with one seed; limit; typed prompt resets; env switch and non-interactive stand down; open failure keeps the session (TC-09).
- [x] T06.4 Semi-automatic path: capability state and impact text per DEC-10; TC-10 notice and resume cases.
- [x] T06.5 Update each research section with the implemented behavior, per `harness-adapters.md`.

## Acceptance criteria

- TC-09 (automatic) or TC-10 (semi-automatic) passes for each harness, matching its T01 destination.
- With `autoRestart` absent, no restart file is planned and none is loaded.
- QA-06 returns no hit on the new in-process files.

## Verification

- Unit: guard-store and facts helpers if extracted.
- Integration: `tests/integration/pi-restart.test.ts`, `tests/integration/oh-my-pi-restart.test.ts` or the semi-automatic cases in `semi-auto-restart.test.ts`.
- End-to-end: not applicable (in-process harnesses are not in the e2e smoke set).
- Manual: real-session check at HIL 3 per TechSpec manual acceptance.
- Platforms: all, through CI.
- Commands: `npm run lint`, `npm run typecheck`, `npm run build`, touched suites by path.
- Environment dependency: T01 captures.
- Expected evidence: passing suites; planner output listing the restart file.

## Affected files

- Modify: `src/infrastructure/harnesses/{pi,oh-my-pi}/{planner,capabilities,adapter}.ts`, `scripts/asset-bundler.ts`, `docs/research/harness-integrations.md`.
- Create (automatic only): `assets/runtime/{pi,oh-my-pi}-restart.ts`, `src/infrastructure/harnesses/{pi,oh-my-pi}/restart-host.ts`, integration tests.

## Observability and recovery

- Operational signal: v2 log under `runtime/restart/<harness>/`.
- Recovery: `init --no-auto-restart` removes the restart file.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: Pi automatic restart (`pi/restart.ts`, asset `pi-restart.js`, file `.pi/extensions/context-brake-restart.js`, `auto_restart: supported`): `agent_end` → `handleTurnEnd` → `sendUserMessage("/context-brake-restart", { expandPromptTemplates: true })` → command → `newSession({ withSession })` → mark seeded, then seed. Oh-My-Pi one-Enter restart (`oh-my-pi/restart.ts`, `omp-restart.js`, DEC-19): `session_stop` prefills the empty editor; Enter runs the command → `newSession()` → seed; a busy editor reports `ERROR_RESTART_REJECTED`; the command text does not reset the guard. Shared in-process pieces in `common/in-process-restart-state.ts` (module-level guards, turn start, tool counts, config, env stand-down) and `common/in-process-restart-log.ts` (async v2 log under `runtime/restart/<harness>/`). `common/restart-asset-plan.ts` plans the restart file only with `autoRestart` on and deletes an unmodified one otherwise (conflict when edited). DEC-20: OMP `session_switch` reason new → session reset. Pre-existing defect fixed: OMP `last_assistant_message` is a message object in 18.8.1; the schema now accepts string or message.
- Changed files: src/infrastructure/harnesses/{pi/restart.ts, oh-my-pi/restart.ts, common/in-process-restart-state.ts, common/in-process-restart-log.ts, common/restart-asset-plan.ts} (new); {pi,oh-my-pi}/{planner,adapter,capabilities}.ts, pi/events.ts, oh-my-pi/{events,runtime,schemas}.ts; assets/runtime/{pi-restart,omp-restart}.ts (new); scripts/asset-bundler.ts, scripts/check-package.ts; docs/research/harness-integrations.md; tests: integration/{pi-restart,omp-restart,omp-session-switch,in-process-restart-plan}.test.ts and helpers/pi-restart-world.ts (new), unit/harness-adapters.test.ts (approved capability table), unit/asset-bundler.test.ts (13 assets).
- Checks: typecheck ok; `npx eslint .` "No issues found"; build ok (13 runtime assets); new suites 16 passed; regression over suites touching Pi, OMP, auto_restart, planners, bundler: 420 tests, 1 failure fixed (asset count) then green. Quality profile: no new hits; QA-06 clean on every in-process file; the QA-09 hit at `oh-my-pi/runtime.ts:51` is the baseline false positive.
- Validated state: Windows 11, Node 24.19.0, base a31e183 plus T01-T06 diff.
- Open items: `pi-restart.test.ts` takes about 2.4 s (file I/O per turn); watch it in the T09 budget run. Real-session check of both harnesses stays for HIL 3 (manual acceptance). Capability minimum versions are not gated (Pi 1.0.4 and Oh-My-Pi 18.8.1 are the verified versions in the research doc).

### ADR candidates

None - direct TechSpec implementation or local decision.
