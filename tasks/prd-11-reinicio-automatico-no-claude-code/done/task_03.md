# Stable execution context

Load in this exact order:

1. `tasks/prd-11-reinicio-automatico-no-claude-code/prd.md`
2. `tasks/prd-11-reinicio-automatico-no-claude-code/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — Restart policy, notices and config contract

## Outcome

Core decides, with pure functions, whether a turn end becomes a restart or a coded skip, in both modes, and the `autoRestart` configuration block is part of the validated, published schema.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T04, T05
- In scope: `auto-restart-policy.ts`, `auto-restart-notices.ts`, `contracts/auto-restart.ts`, the one-property addition to `configuration.ts`, regenerated `schemas/context-brake.config.schema.json`.
- Out of scope: any `$` access, files, the bundler, CLI flags.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01 to FR-06 | `prd.md#functional-requirements` | Decision rules and gates |
| FR-10, NFR-02 | `prd.md#functional-requirements` | Codes and notices without content |
| DEC-05, DEC-06, DEC-07, DEC-09, DEC-14 | `techspec.md#technical-decisions` | Policy inputs, config block |
| CMP-01, CMP-02, CMP-03 | `techspec.md#components-and-flow` | Core pieces |

## Context to recover on demand

- Applicable skills and rules: `code-standards.md`, `javascript-typescript.md` (Zod, literal unions, exhaustive switch, `assertNever`), `tests.md`.
- Existing code: `src/core/services/reset-notice.ts` (signal match to reuse), `src/core/contracts/configuration.ts:77`, `src/core/contracts/light-mode.ts` (optional-block pattern), `schemas/state-checkpoint.schema.json`.
- Contract or integration: `techspec.md#contracts-and-data` (reason codes, config example).
- Harness reference: fixtures from T01 for the facts shape.

## Work

- [x] T03.1 Define reason codes as one constant union, the facts type (injected `now`, gate, signal, flags, checkpoint state, guard counters) and `decideRestart`.
- [x] T03.2 Implement notices, seed texts (full and light) and the log record shape, with exact-text and token-budget assertions.
- [x] T03.3 Add the Zod `autoRestart` block (default 2, range 1 to 10, strict) and wire it in `configuration.ts`; run `npm run schemas:generate`.
- [x] T03.4 Write TC-01 to TC-08 and TC-24.

## Acceptance criteria

- Every skip code is reachable by exactly one fixture; precedence between codes is fixed and tested (env, runner, non-interactive, signal, checkpoint, guard, no progress).
- Light mode never returns a checkpoint-related code.
- No clock or randomness inside `core`; `now` arrives in facts.
- Existing configuration files stay valid; unknown keys inside `autoRestart` fail.

## Verification

- Unit: TC-01 to TC-08 in `tests/unit/auto-restart-*.test.ts` (policy table, notices, contract).
- Integration: schema currency through `npm run schemas:check`.
- End-to-end: not applicable.
- Manual: not applicable.
- Platforms: all (pure code).
- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run schemas:check`
- Environment dependency: none
- Expected evidence: test counts, coverage at or above 80%, QA-01 to QA-04, QA-08 to QA-11 clean.

## Affected files

- Modify: `src/core/contracts/configuration.ts`, `schemas/context-brake.config.schema.json`
- Create: `src/core/services/auto-restart-policy.ts`, `src/core/services/auto-restart-notices.ts`, `src/core/contracts/auto-restart.ts`, `tests/unit/auto-restart-policy.test.ts`, `tests/unit/auto-restart-notices.test.ts`, `tests/unit/auto-restart-contract.test.ts`

## Observability and recovery

- Operational signal: reason codes consumed by T04 and T06.
- Recovery: the config block is optional; reverting the commit removes it with no migration.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: Core decides restart from pure facts. `decideRestart(facts)` returns restart or a coded skip with a fixed order: no signal (silent), stand-down (environment switch, runner session, non-interactive), checkpoint gate (full mode only; light mode is `signal-only` and never returns a checkpoint code), loop guard, no-progress guard. Notices, the two seed texts (full with the boot sentence, light without), the log record builder with the 50-record cap, and the Zod contracts (`autoRestart` config block default 2, range 1 to 10, strict; per-session mod log) are in place. `configuration.ts` gained one optional property and `schemas/context-brake.config.schema.json` was regenerated (12 added lines, block optional).
- Changed files: New `src/core/contracts/auto-restart.ts` (30 lines), `src/core/services/auto-restart-policy.ts` (43), `src/core/services/auto-restart-notices.ts` (38), `tests/unit/auto-restart-{policy,notices,contract}.test.ts`. Modified `src/core/contracts/configuration.ts` (86 lines, +1 import +1 property), `schemas/context-brake.config.schema.json`.
- Checks: `npm run typecheck` and `npm run lint` clean; `npm run schemas:check` passes; the three new files plus `schemas.test.ts`: 37 tests pass (policy 14, notices 7, contract 11, schemas 5). Full `npm run coverage` run: 309 of 310 files, 1975 passed, 3 skipped, 1 failed: `tests/e2e/e2e-support-limitations.test.ts` doctor case timed out at 30 s under coverage load (then EBUSY on cleanup); it passes alone in 14 s, so it is a pre-existing load-sensitive e2e, not caused by this task. Coverage percentages were not printed because the run had a failure. Quality sweep (QA-01 to QA-04, QA-07 to QA-11) empty on the four touched files; all under 100 lines.
- Validated state: Base `c7529c5` plus the T02 and T03 diffs, Windows 11, Node via npm scripts. Policy order differs from the TechSpec text only in that the silent no-signal check comes first, so a disabled session logs nothing on ordinary turns. Staleness is computed by the glue (T04) and passed in as `CheckpointState`, so core takes no clock.
- Open items: Coverage percentage for the new files not captured; T04 and the next green full run will show it. The load-sensitive e2e should be watched at the next full run.

### ADR candidates

None - direct TechSpec implementation or local decision
