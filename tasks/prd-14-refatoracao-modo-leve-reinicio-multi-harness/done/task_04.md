# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md`
2. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T04 — Harness-neutral restart core

## Outcome

`src/core` holds the whole restart decision and sequence with no harness name: restart log v2, neutral notices and seed, the handoff freshness gate, and `handleTurnEnd` driven through `RestartHost` and `RestartGuardStore`.

## Dependencies and boundaries

- Depends on: T02
- Unblocks: T05, T06, T07
- In scope: contracts, policy, notices, seed, flow service, unit tests.
- Out of scope: any adapter behavior (T05-T07). The renamed code and log contract require mechanical import and name updates in the Claude mod so the build stays green; its behavior does not change here.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-04 | `prd.md#functional-requirements` | Fresh-handoff gate and skip reason |
| FR-05 | `prd.md#functional-requirements` | No harness names in core restart logic |
| FR-09, NFR-01 | `prd.md` | Guards; errors keep the session |
| DEC-04, DEC-05, DEC-06, DEC-07, DEC-17 | `techspec.md#technical-decisions` | Gate, log v2, flow, guard port, absorbed contract split |
| CMP-06, CMP-07 | `techspec.md#components-and-flow` | Files |
| TC-04, TC-05, TC-06 | `techspec.md#test-approach` | Tests |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `javascript-typescript.md`, `tests.md`.
- Existing code: `src/core/services/auto-restart-policy.ts`, `auto-restart-notices.ts`, `src/core/contracts/auto-restart.ts`; `claude-code/mod/restart-flow.ts:26-64` (sequence to extract), `mod-guards.ts` (state shape).
- Contract: TechSpec "Contracts and data", restart log v2 and reason codes.

## Work

- [x] T04.1 Add `src/core/contracts/restart-log.ts` (v2 schema) and `restart-host.ts` (`RestartHost`, `RestartGuardStore`); keep `auto-restart.ts` for config and reason codes, adding `SKIP_HANDOFF_MISSING`, `SKIP_HANDOFF_STALE`, renaming `ERROR_CLEAR_REJECTED` → `ERROR_RESTART_REJECTED`.
- [x] T04.2 Extend the policy with handoff facts (TC-04).
- [x] T04.3 Make notices and seed neutral; `seedText(resume)` (TC-05 seed cases).
- [x] T04.4 Add `src/core/services/restart-flow.ts` with `handleTurnEnd` and rollback (TC-05).
- [x] T04.5 Add TC-06 neutrality test over the restart contracts, notices, and log schema.

## Acceptance criteria

- TC-04, TC-05, TC-06 pass; no `claude`/`Claude` in the core restart files.
- With a fake host, an open failure logs `ERROR_RESTART_REJECTED` and restores the guard count.

## Verification

- Unit: `tests/unit/auto-restart-policy.test.ts`, `tests/unit/restart-flow.test.ts`, `tests/unit/restart-neutrality.test.ts`, notices tests.
- Integration: not applicable here; T05 proves the Claude adapter.
- End-to-end: not applicable.
- Manual: not applicable.
- Platforms: all, through CI.
- Commands: `npm run lint`, `npm run typecheck`, touched suites by path.
- Environment dependency: none.
- Expected evidence: passing suites; QA-05 and QA-08 clean on `core_files`.

## Affected files

- Modify: `src/core/contracts/auto-restart.ts`, `src/core/services/auto-restart-policy.ts`, `auto-restart-notices.ts`; existing unit tests for them.
- Create: `src/core/contracts/restart-log.ts`, `restart-host.ts`, `src/core/services/restart-flow.ts`, `tests/unit/restart-flow.test.ts`, `tests/unit/restart-neutrality.test.ts`.

## Observability and recovery

- Operational signal: restart log records.
- Recovery: revert the task commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: neutral restart core. `contracts/restart-log.ts` (v2: `harness`, `componentVersion`, `harnessVersion`, `RESTART_LOG_RELATIVE_DIR = .context-brake/runtime/restart`); `contracts/restart-host.ts` (`RestartHost`, `RestartGuardStore`, `OpenSessionRequest { seed, onOpened, onRejected }`, `GuardState`, `StandDownFacts`); `contracts/auto-restart.ts` keeps config and codes (`SKIP_HANDOFF_MISSING`, `SKIP_HANDOFF_STALE`, `ERROR_RESTART_REJECTED`); policy checks stand-down → handoff gate → guards; neutral notices and `seedText(resume)`; `services/restart-guards.ts` (bump, rollback, markSeeded, fold, reset over the store port); `services/restart-flow.ts` `handleTurnEnd(host, { text, settings })` with `reportRestart` (log + notice, internal error on failure). The host launches `openSession` asynchronously and calls `onOpened` (mark seeded) or `onRejected` (rollback + `ERROR_RESTART_REJECTED`), which keeps the Claude clear-then-seed timing and covers DEC-21 for Pi.
- Changed files: src/core/contracts/{auto-restart,restart-log,restart-host}.ts, src/core/services/{auto-restart-policy,auto-restart-notices,restart-guards,restart-flow}.ts; mechanical: src/infrastructure/harnesses/claude-code/mod/{mod-log,restart-facts,restart-flow}.ts, claude-code/auto-restart-diagnostics.ts; tests: unit/{restart-flow,restart-neutrality}.test.ts (new), unit/{auto-restart-policy,auto-restart-notices,auto-restart-contract}.test.ts, fixtures/claude-mod-scene.ts, helpers/auto-restart-doctor-world.ts, integration/{auto-restart-doctor,claude-mod-restart}.test.ts.
- Checks: typecheck ok; `npx eslint .` "No issues found"; build ok; new suites 15 passed; restart/doctor/Claude mod regressions 78 passed. Quality profile over the diff: no hits.
- Validated state: Windows 11, Node 24.19.0, base a31e183 plus T01-T04 diff.
- Open items: `RestartHost` shape differs from the DEC-06 wording (`standDown()`, `turnStartedAt()`, `resumeForSeed()` and the request callbacks instead of `facts()` and `sessionBoot`); same responsibilities. `SKIP_DISABLED_ENV` notice names `CONTEXT_BRAKE_AUTO_RESTART=0 or a harness setting` (the existing notice test requires the variable name). With an unknown turn start the gate accepts any present handoff. The Claude mod still uses its own flow and `runtime/claude-mod` path until T05.

### ADR candidates

None - direct TechSpec implementation or local decision.
