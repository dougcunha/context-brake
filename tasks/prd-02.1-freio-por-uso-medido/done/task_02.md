# Stable execution context

Load in this exact order:

1. `tasks/prd-02.1-freio-por-uso-medido/prd.md`
2. `tasks/prd-02.1-freio-por-uso-medido/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Telemetry block v2 with plan-aware actions

## Outcome

The telemetry block and the block message use the `v2` prefix and show a turn ceiling only when turn limits are on. `YELLOW` and `RED` blocks carry the no-plan action when the plan file is absent, and the protocol lists both variants.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T05
- In scope (DEC-04, DEC-05, DEC-06):
  - `TELEMETRY_BLOCK_VERSION = 2` and the new turn rendering;
  - `ZONE_ACTIONS` variants, and `planPresent` in the block and the protocol;
  - the `readPlanPresence` engine port and `NodePlanValidationReader.hasPlan()`;
  - composition wiring, which also reaches the in-process adapters through `runtime-composition`;
  - `docs/telemetry-block.md`.
- Out of scope: measurement (T03, T04).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-03 | `prd.md#functional-requirements` | Turn shown, ceiling only with limits |
| FR-08 | `prd.md#functional-requirements` | Plan-aware `YELLOW` and `RED` |
| NFR-04 | `prd.md#non-functional-requirements` | Version bump; 60-token budget |
| DEC-04, DEC-05, DEC-06 | `techspec.md#technical-decisions` | Format, actions, port |
| CMP-05, CMP-06, CMP-07, CMP-08, CMP-12 | `techspec.md#components-and-flow` | Components |
| TC-05–TC-09 | `techspec.md#test-approach` | Tests |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `javascript-typescript.md`, `tests.md`, and `harness-adapters.md` (adapters only transport the text).
- Existing code: `src/core/services/zone-actions.ts`, `telemetry-block.ts`, `block-message.ts`, `brake-engine.ts:44-60`, `src/infrastructure/runtime/plan-validation-reader.ts`, `runtime-composition.ts:53-81`; in-process composition in `src/infrastructure/harnesses/common/in-process-support.ts`.
- Tests: `telemetry-block.test.ts`, `telemetry-block-budget.test.ts`, `brake-engine-lifecycle.test.ts`, `protocol-service.test.ts`, `protocol-zone-coherence.test.ts`, `protocol-content.test.ts`.

## Work

- [x] T02.1 Add `withPlan` and `withoutPlan` variants for `YELLOW` and `RED`, and render both in the protocol rows.
- [x] T02.2 Move the block and the block message to v2, with the optional red-start ceiling.
- [x] T02.3 Add the `readPlanPresence` port, `hasPlan()`, and the wiring; call it only before a `YELLOW` or `RED` injection.
- [x] T02.4 Update `docs/telemetry-block.md` and the regenerated protocol; add tests for TC-05–TC-09.

## Acceptance criteria

- With limits off, the block shows `turn=12`; with limits 59/99, `turn=12/100`. Both the block and the block message use the `[ContextBrake v2]` prefix.
- The longest v2 block, with each action variant, uses at most 60 tokens.
- Without a plan file, `YELLOW` and `RED` blocks use the no-plan text, which contains no instruction to stop starting work. With a valid plan, they use the current texts.
- `hasPlan` returns false for a missing or invalid plan file and true for a valid one. `GREEN` and `CRITICAL` calls never invoke it.

## Verification

- Unit: TC-05, TC-06, TC-07, TC-08.
- Integration: TC-09 with a temporary directory.
- End-to-end: not applicable.
- Platforms: CI matrix.
- Commands: `npm run lint`, `npm run typecheck`, `npm test`.
- Environment dependency: none.
- Expected evidence: passing suites; the protocol file equals the render of the defaults.

## Affected files

- Modify: `src/core/services/zone-actions.ts`, `telemetry-block.ts`, `block-message.ts`, `protocol-service.ts`, `brake-engine.ts`, `session-zone.ts`, `src/infrastructure/runtime/plan-validation-reader.ts`, `runtime-composition.ts`, `docs/telemetry-block.md`, `docs/context-brake-protocol.md`, related tests.

## Observability and recovery

- Operational signal: none new.
- Recovery: revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - Block and block message use `[ContextBrake v2]` (`TELEMETRY_BLOCK_VERSION = 2`, shared `TELEMETRY_BLOCK_PREFIX`); the turn prints `turn=<t>` or `turn=<t>/<red start>` only with turn limits.
  - `ZONE_ACTIONS.YELLOW` and `.RED` have `withPlan` (previous text) and `withoutPlan` variants; `compactZoneAction(zone, planPresent)` picks the block text; protocol rows print "With `<planFile>`: … Without it: …", plus one protocol sentence saying the action depends on the plan file.
  - Port `readPlanPresence` (`PlanPresenceReader`) in `BrakeEngineOptions`, `RuntimePorts`, and `TelemetrySettings`; implemented by `NodePlanValidationReader.hasPlan()`. `readPlanPresenceFor` calls it only for `YELLOW`/`RED`, and a rejected read counts as `false`.
  - The runner path (`renderSessionTelemetry`, now async, used by `wrap-telemetry.ts`) uses the same plan-aware rendering, so in-process and `wrap` blocks stay equal to engine blocks.
- Changed files:
  - Source: `src/core/services/zone-actions.ts`, `telemetry-block.ts`, `block-message.ts`, `brake-engine.ts` (new `telemetryDecision`), `session-zone.ts`, `protocol-service.ts`; `src/infrastructure/runtime/plan-validation-reader.ts`, `runtime-composition.ts`; `src/infrastructure/runner/wrap-telemetry.ts`.
  - Docs: `docs/telemetry-block.md` (v2 format, action table, changes from v1); `docs/context-brake-protocol.md` regenerated from `renderProtocol(DEFAULT_CONFIG)`.
  - New tests: `tests/unit/brake-engine-plan-actions.test.ts` (TC-07), `tests/integration/plan-presence-reader.test.ts` (TC-09 plus composition wiring). Updated: `telemetry-block.test.ts` (TC-05), `telemetry-block-budget.test.ts` (TC-06: every zone × plan variant, turn 99999/100000, budget 60 tokens), `protocol-service.test.ts` (TC-08), `session-zone.test.ts`; the v1→v2 prefix in `brake-engine-pre-tool`, `in-process-runtime`, `runtime-opencode`, `runtime-in-process`, `wrap-command`, `e2e-run-approval-wrap`, and `tests/support/harness-simulator/in-process-driver.ts`; the `readPlanPresence` fixture in `brake-engine-boot`, `brake-engine-lifecycle`, and `claude-runtime-session-key`.
- Checks: `npm run lint` (0 problems); `npm run typecheck`; `npm run build`; `npm run schemas:check`; `npm run coverage` (227 files, 1,446 passed, 3 skipped; statements 94.89%, branches 89.75%, functions 96.51%). Quality profile QA-01 to QA-08 over the touched files: no hits, except one QA-08 regex match at `tests/unit/brake-engine-plan-actions.test.ts:45`, a false positive (one destructured `it.each` object parameter).
- Validated state: working tree on top of `3b94a9c` with the T01 and T02 diffs uncommitted, Windows 11, Node 24, Git Bash.
- Open items:
  - None for T02. The block message keeps the `RED` with-plan action text for `CRITICAL`, as DEC-05 keeps `CRITICAL` unchanged.
  - The `wrap` runner now reads the plan file for `YELLOW`/`RED` blocks. This follows from DEC-06 and adds no new I/O for `GREEN`/`CRITICAL`.

### ADR candidates

None - direct TechSpec implementation or local decision.
