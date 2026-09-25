# Stable execution context

Load in this exact order:

1. `tasks/prd-02.1-freio-por-uso-medido/prd.md`
2. `tasks/prd-02.1-freio-por-uso-medido/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Usage-only critical zone and optional turn limits

## Outcome

With the default configuration, the zone depends only on context usage, and no number of tool calls reaches `CRITICAL`. Optional turn limits can raise the zone to `YELLOW` or `RED`, never higher. Legacy configs remain valid, and the protocol conditions match the classifier.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T02, T05
- In scope:
  - configuration schema (DEC-02);
  - classifier and `turnLimits` helper (DEC-01);
  - protocol zone conditions, with turn clauses only when limits are on;
  - `DEFAULT_CONFIG`;
  - regenerated `schemas/context-brake.config.schema.json` and `docs/context-brake-protocol.md`;
  - mechanical adaptation of callers that read `turnCeiling`, so they compile. The block keeps the v1 text until T02, with the optional red-start turn or no ceiling.
- Out of scope: block v2 format and plan-aware actions (T02); `doctor` and `init` migration (T05).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | `CRITICAL` only by usage |
| FR-02 | `prd.md#functional-requirements` | Optional turn limits up to `RED` |
| OBJ-01 | `prd.md#outcomes-and-metrics` | 200 calls without a block |
| DEC-01, DEC-02, DEC-13 | `techspec.md#technical-decisions` | Classifier and schema |
| CMP-01, CMP-02, CMP-07 | `techspec.md#components-and-flow` | Components |
| TC-01–TC-04 | `techspec.md#test-approach` | Tests |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `javascript-typescript.md`, `tests.md`.
- Existing code: `src/core/contracts/configuration.ts:47-56` (schema rules), `src/core/services/zone-classifier.ts`, `src/core/services/protocol-service.ts:10-28`, `scripts/generate-schemas.ts`.
- Tests to adapt: `tests/unit/zone-classifier.test.ts`, `configuration.test.ts`, `protocol-zone-coherence.test.ts`, `protocol-service.test.ts`, `brake-engine-pre-tool.test.ts`, and `readme-config-example.test.ts`. The README example may keep legacy fields, but it must still validate.

## Work

- [ ] T01.1 Make `greenMaxTurn` and `yellowMaxTurn` an optional pair and `criticalTurn` and `turnCeiling` optional deprecated fields; drop all four from `DEFAULT_CONFIG`.
- [ ] T01.2 Rewrite `classifyZone` per DEC-01, with a `turnLimits` helper.
- [ ] T01.3 Render protocol conditions from usage, adding turn clauses only when limits are on; regenerate the protocol doc and the config schema.
- [ ] T01.4 Adapt callers of `turnCeiling` and update tests for TC-01–TC-04.

## Acceptance criteria

- Defaults: 74% with 500 turns is `RED`, not `CRITICAL`; 75% with 1 turn is `CRITICAL`.
- Limits 59/99: 60 turns at 10% is `YELLOW`; 100 and 10,000 turns are `RED`.
- A config with only one field of the pair, or with `greenMaxTurn >= yellowMaxTurn`, is rejected with path and rule. A PRD-02 legacy config (7/10/12, `turnCeiling` 12) is accepted.
- With defaults, the engine processes 200 pre-tool and post-tool events at 30% usage with 0 denies and no injected block.

## Verification

- Unit: TC-01, TC-02, TC-03, and protocol coherence at the boundaries.
- Integration: TC-04 through the engine with port fakes.
- End-to-end: not applicable.
- Platforms: CI matrix.
- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run schemas:check`.
- Environment dependency: none.
- Expected evidence: passing suites; regenerated schema and protocol, with no `schemas:check` drift.

## Affected files

- Modify: `src/core/contracts/configuration.ts`, `src/core/services/zone-classifier.ts`, `protocol-service.ts`, `telemetry-block.ts`, `block-message.ts`, `brake-engine.ts`, `session-zone.ts`, `schemas/context-brake.config.schema.json`, `docs/context-brake-protocol.md`, related tests.

## Observability and recovery

- Operational signal: none new.
- Recovery: revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - `CRITICAL` depends only on usage.
  - Turn limits are an optional `greenMaxTurn`/`yellowMaxTurn` pair that can raise the zone to `YELLOW` or `RED` at most.
  - `criticalTurn` and `turnCeiling` are optional deprecated fields, accepted and ignored.
  - `DEFAULT_CONFIG` has no turn fields.
  - The protocol prints usage conditions, plus turn clauses only when limits are on.
  - The block and block message print `turn=<t>` or `turn=<t>/<red start>` (still v1 until T02).
- Changed files:
  - Source: `src/core/contracts/configuration.ts`, `src/core/services/zone-classifier.ts` (new `turnLimits` and `redStartTurn`), `protocol-service.ts`, `telemetry-block.ts` (new `renderTurn`), `block-message.ts`, `brake-engine.ts`, `session-zone.ts`.
  - Generated: `schemas/context-brake.config.schema.json`, `docs/context-brake-protocol.md`.
  - Tests migrated from turn-driven to usage-driven `CRITICAL`: `tests/helpers/runtime-seed.ts` (new `seedCriticalSession`), 10 runtime suites switched to it, `tests/support/harness-simulator/{scenarios,in-process-driver,agent-profiles}.ts` (seed just below 75%; in-process seed by tokens; `brakeWorkFlow` now usage-driven), `tests/e2e/e2e-brake.test.ts`, `e2e-simulated-long-task.test.ts`, `e2e-run-approval-wrap.test.ts`, and unit suites for the classifier, config, protocol, block, engine, session zone, and in-process.
  - New tests: TC-01 and TC-02 (`zone-classifier.test.ts`), TC-03 (`configuration.test.ts`), TC-04 (`brake-engine-pre-tool.test.ts`, 200 calls without a deny or a block).
- Checks: `npm run build`; `npm run lint` (0 problems); `npm run typecheck`; `npm run schemas:check`; `npx vitest run tests/unit tests/integration` (1,206 passed, 2 skipped); `npx vitest run tests/e2e` (212 passed, 1 skipped); `npm run coverage` (225 files, 1,418 passed, 3 skipped; statements 94.87%, branches 89.72%, functions 96.48%). Quality profile over the diff: no blocking hits.
- Validated state: working tree on top of `3b94a9c`, Windows 11, Node 24.19.0, Git Bash.
- Open items:
  - Reservation QA-08 (raw lines above 100, while eslint `max-lines` passes): `tests/e2e/e2e-simulated-long-task.test.ts` (103, unchanged from HEAD) and `tests/e2e/e2e-brake.test.ts` (106, the same as HEAD).
  - The repository's own `context-brake.config.json` keeps the legacy fields; it gets normalized by T05 (`init --yes`).
  - `.agents/rules/code-standards.md` still uses `zones.criticalTurn` in its "magic numbers" example; T05 updates that doc.

### ADR candidates

None - direct TechSpec implementation (DEC-01, DEC-02).
