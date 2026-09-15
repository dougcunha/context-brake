# Stable execution context

Load in this exact order:

1. `tasks/prd-02-telemetria-zonas-e-freio/prd.md`
2. `tasks/prd-02-telemetria-zonas-e-freio/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Configuration and contracts on `zod/mini` with the brake section

## Outcome

`context-brake.config.json` parsing accepts an optional `brake` object with `additionalAllowedCommands` (default `[]`), rejects `telemetry.turnCeiling` different from `telemetry.zones.criticalTurn` with field, received value, and rule, and keeps every existing ordering and path rule. `configurationSchema` and `zonesSchema` run on `zod/mini`, the published config schema is regenerated, and `src/core/contracts/harness.ts` stops exporting classic Zod schemas.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T02, T03
- In scope: `src/core/contracts/configuration.ts`, `src/core/contracts/harness.ts`, `src/core/validation/configuration-validator.ts` (only if the mini migration changes a type), `scripts/generate-schemas.ts` (only if a type import changes), `tests/unit/configuration.test.ts`, `schemas/context-brake.config.schema.json`.
- Out of scope: the runtime engine, assets, doctor, and every command other than configuration parsing.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF11 | `prd.md#principais-funcionalidades` | Validate increasing limits, full coverage, and the turn-ceiling equality |
| CA-05 | `prd.md#critérios-de-aceitação` | Incoherent zone configuration rejected with field and rule |
| CA-23 | `prd.md#critérios-de-aceitação` | `turnCeiling` different from `criticalTurn` rejected with field and rule |
| DEC-02 | `techspec.md#technical-decisions` | Shared schema on `zod/mini`; unused classic exports deleted |
| DEC-03 | `techspec.md#technical-decisions` | `turnCeiling` equality rule |
| CMP-12, CMP-13 | `techspec.md#components-and-flow` | Configuration and Zod-free harness contracts |
| TC-03, TC-31 | `techspec.md#test-approach` | Config validation cases; schema currency and README example |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/javascript-typescript.md` (Zod for external data, literal unions), `.agents/rules/code-standards.md` (named constants, 100-line files, no comments).
- Existing code: `src/core/contracts/configuration.ts` (`INJECTION_MODES`, `zonesSchema`, `configurationSchema`, `DEFAULT_CONFIG`); `src/core/contracts/harness.ts:50-54` (five unused classic schema exports, verified with no callers); `src/core/validation/configuration-validator.ts` (`parseConfiguration`, `InvalidConfigurationError.issues` with `path`/`received`/`rule`); `scripts/generate-schemas.ts` (`z.toJSONSchema` accepts mini schemas).
- Contract or integration: `techspec.md#contracts-and-data` "Configuration" table for the exact field list, validation, and compatibility.
- Harness reference: not applicable.

## Work

- [x] T01.1 Migrate `zonesSchema` and `configurationSchema` to `zod/mini` (`strictObject`, `.check(...)` with `ctx.issues.push({ path, message, input })`), preserving the exact issue paths and rule messages asserted by `tests/unit/configuration.test.ts` (`must be greater than greenMaxPercentage`, `must be less than criticalTurn`, and the canonical path rules).
- [x] T01.2 Add the optional `brake` strict object with `additionalAllowedCommands`: at most 20 unique entries, each trimmed and non-empty, rejecting `;`, `&`, `|`, backtick, `$(`, `<`, `>`, CR, and LF; add the default to `DEFAULT_CONFIG`.
- [x] T01.3 Add the cross-field rule `telemetry.turnCeiling === telemetry.zones.criticalTurn` with message `must equal telemetry.zones.criticalTurn` and issue path `telemetry.turnCeiling`.
- [x] T01.4 Delete `harnessIdSchema`, `capabilityIdSchema`, `capabilityStateSchema`, `detectionEvidenceSchema`, and `versionProbeSchema` from `harness.ts` and drop its `zod` import; confirm no module or test imports them.
- [x] T01.5 Regenerate `schemas/context-brake.config.schema.json` and extend `tests/unit/configuration.test.ts` with the new failure cases, the `brake` default, and a v1 file without `brake`.

## Acceptance criteria

- `parseConfiguration(DEFAULT_CONFIG)` returns the defaults, including `brake.additionalAllowedCommands: []`.
- Each invalid case reports the field path, the received value, and the violated rule; existing issue paths and messages are unchanged.
- A v1 file without `brake` parses with the default; a file whose `turnCeiling` differs from `criticalTurn` fails with `telemetry.turnCeiling`.
- `npm run schemas:check` reports no drift; no module imports the deleted exports.

## Verification

- Unit: `tests/unit/configuration.test.ts` (boundaries, equality rule, allowed-command shape, path rules) and `tests/unit/readme-config-example.test.ts` (README example still validates).
- Integration: not applicable — pure parsing.
- End-to-end: not applicable.
- Manual: none.
- Platforms: not platform-sensitive.
- Commands: `npm run typecheck`, `npm run lint`, `npx vitest run tests/unit/configuration.test.ts tests/unit/schemas.test.ts tests/unit/readme-config-example.test.ts`, `npm run schemas:check`, `npm run coverage`
- Environment dependency: none.
- Expected evidence: updated `schemas/context-brake.config.schema.json`, green configuration suites and `schemas:check`.

## Affected files

- Modify: `src/core/contracts/configuration.ts`, `src/core/contracts/harness.ts`, `tests/unit/configuration.test.ts`, `schemas/context-brake.config.schema.json`
- Create: none

## Observability and recovery

- Operational signal: `schemas:check` fails when the published schema drifts; `parseConfiguration` issues name field, value, and rule.
- Recovery: revert the two contract files and the schema; configurations that violated the new equality rule become valid again, so no migration is needed.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: T01 implemented. `configurationSchema` and `zonesSchema` run on `zod/mini` (`strictObject` + `.check`); `brake.additionalAllowedCommands` (default `[]`, max 20, unique, trimmed, no shell operators) and the `turnCeiling === zones.criticalTurn` rule (`telemetry.turnCeiling`, `must equal telemetry.zones.criticalTurn`) are enforced; `DEFAULT_CONFIG` carries the `brake` default; the five unused classic schema exports and the `zod` import left `harness.ts`; the published config schema was regenerated.
- Changed files:
  - `src/core/contracts/configuration.ts` (mini migration, `brake` schema, equality rule, default)
  - `src/core/contracts/harness.ts` (five schema exports and `zod` import deleted; no export added)
  - `tests/unit/configuration.test.ts` (v1 file without `brake`, equality failure, allowed-command shape/limits/duplicates)
  - `schemas/context-brake.config.schema.json` (regenerated: additive `brake` block with `default` values)
- Checks:
  - `npm run typecheck` — pass.
  - `npm run lint` — pass.
  - `npx vitest run tests/unit/configuration.test.ts tests/unit/schemas.test.ts tests/unit/readme-config-example.test.ts` — 40 tests pass (36 configuration, including all pre-existing cases unchanged).
  - `npm run schemas:check` — pass (no drift in any of the three published schemas).
  - `npm run build` + `npm run coverage` — 95 files / 407 tests pass, exit 0; `All files` 92.7% lines/statements, `src/core/contracts/configuration.ts` 100% lines/statements/functions and 93.33% branches (lines 49-50).
  - `npm run package:smoke` — pass (220 packaged files verified, CLI usage prints).
  - Quality profile QA-01 to QA-07, QA-09 to QA-11, scoped to the three touched `.ts` files: no hits (all commands returned empty; line counts 60/49/92, all ≤ 100; no declaration with 4+ parameters). QA-05 and QA-06 have empty file lists (no runtime/hook files in this diff) and were skipped per the profile. QA-08 (`tests/unit/runtime-bundle-imports.test.ts`) does not exist yet (T08 deliverable) and no runtime bundle is touched by this diff.
- Validated state: working tree on HEAD `b9647e9` plus the four files above; Node v24.19.0, Windows 11, PowerShell 7; no configuration or environment dependency. Pre-existing untracked files (task/techspec set, `.agents/scheduled_tasks.lock`) untouched.
- Open items:
  - Reservation (not a QA hit): `z.toJSONSchema` runs with output semantics, so the regenerated `schemas/context-brake.config.schema.json` lists `brake` and `additionalAllowedCommands` in `required` and carries their `default` values. Input files that omit `brake` still parse (`z._default`), as the new test shows, but editor validation against the published schema will flag the omission. If the project wants the published schema to mirror input semantics, `scripts/generate-schemas.ts` must pass `io: 'input'`; that file is outside this task's scope and needs a caller decision.
  - Confirmed: no module or test imports the five deleted exports (`rg` over `src`, `tests`, `scripts` found only the task file text and the removed definitions); typecheck, lint, and the full suite pass without them.
  - The profile/baseline have no other gaps; `npm run dependencies:check` was not required (no dependency change).

### ADR candidates

None - direct TechSpec implementation or local decision.
