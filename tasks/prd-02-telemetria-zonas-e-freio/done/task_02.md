# Stable execution context

Load in this exact order:

1. `tasks/prd-02-telemetria-zonas-e-freio/prd.md`
2. `tasks/prd-02-telemetria-zonas-e-freio/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Zones, usage, telemetry block, injection policy, and protocol coherence

## Outcome

The session classifies exactly at the PRD boundaries, usage resolves as measured or estimated with the right window and source, the telemetry block v1 renders every zone within the token budget, the injection policy decides `threshold_only` and `always`, and the protocol file renders its zone rows from the same configuration and actions — byte-identical for the defaults and naming configured extra commands when present.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T04
- In scope: `src/core/contracts/zones.ts`, `src/core/contracts/runtime.ts`, `src/core/services/{zone-classifier,usage-resolver,zone-actions,telemetry-block,injection-policy}.ts`, `src/core/services/protocol-service.ts`, `docs/context-brake-protocol.md`, `package.json` and `package-lock.json` (`js-tiktoken` devDependency), and the unit suites named below.
- Out of scope: ledger and counters (T03), allowlist and engine (T04), protocol file installation changes (already delivered by PRD-01.1).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF5, RF6, RF7, RF8 | `prd.md#principais-funcionalidades` | Usage resolution and source; window selection (core half of the measured path) |
| RF9, RF10, RF12, RF13, RF15, RF16 | `prd.md#principais-funcionalidades` | Single configuration, classification, block fields, modes, versioned format, red action |
| CA-01, CA-02, CA-03, CA-04, CA-09, CA-10, CA-13, CA-22 | `prd.md#critérios-de-aceitação` | Block and no-block cases, boundaries, protocol coherence, source, budget |
| DEC-03, DEC-05, DEC-06, DEC-07 | `techspec.md#technical-decisions` | Integer percentage, estimate formula, block v1 with shared actions, injection policy |
| CMP-01, CMP-02, CMP-04, CMP-05, CMP-07, CMP-14 | `techspec.md#components-and-flow` | Contracts, classifier, resolver, block, protocol renderer |
| TC-01, TC-02, TC-05, TC-06, TC-07, TC-11 (core half), TC-28 | `techspec.md#test-approach` | Boundaries, coherence, injection, block strings and budget, resolver arithmetic |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/javascript-typescript.md` (literal unions with exhaustive `switch`, no `any`), `.agents/rules/code-standards.md` (no magic numbers; zone limits from configuration), `.agents/rules/node.md` (heavy imports lazy on hook paths), `.agents/rules/tests.md` (zone boundaries are a required scenario).
- Existing code: `src/core/contracts/configuration.ts` (`zones`, `telemetry`, `INJECTION_MODES`); `src/core/services/protocol-service.ts:4-36` (`renderZoneRows`, `renderProtocol`); `tests/unit/protocol-service.test.ts:37-50` pins the packaged protocol byte-for-byte; `tests/unit/readme-config-example.test.ts` validates the README example.
- Contract or integration: `techspec.md#contracts-and-data` "Zone classification" and "Telemetry block v1" for the exact formulas, field order, and action texts.
- Harness reference: not applicable.

## Work

- [x] T02.1 Create `src/core/contracts/zones.ts` (`ZONES`, `Zone`, `USAGE_SOURCES`, `UsageReading`, `ZoneInput`) and `src/core/contracts/runtime.ts` (`SessionKey`, `ToolCall`, `RuntimeEvent` union including `pre_invocation`, `RuntimeDecision` union, `BrakeMode`, `RuntimeDescriptor`), no Zod.
- [x] T02.2 Implement `zone-classifier.ts`: `usagePercentage` as `floor(used × 100 / window)` and `classifyZone` from the highest zone down, with `≥ 100%` as `CRITICAL`.
- [x] T02.3 Implement `usage-resolver.ts`: measured reading when the adapter supplies one, otherwise `baselineTokens + ceil(observedCharacters / 4) + turns × tokensPerTurn` with per-harness constants from the descriptor; window from the reading when measured, else `telemetry.contextWindowCeiling`.
- [x] T02.4 Implement `zone-actions.ts` (one record per zone with the protocol sentence and the compact block action), `telemetry-block.ts` (v1 line, exact field order), and `injection-policy.ts` (`threshold_only` and `always`).
- [x] T02.5 Rewire `protocol-service.ts` to render the zone rows from `zone-actions.ts`, appending `brake.additionalAllowedCommands` to the `CRITICAL` row only when the list is non-empty; regenerate `docs/context-brake-protocol.md` so the default text stays byte-identical.
- [x] T02.6 Add `js-tiktoken` as a devDependency, add the named unit suites, and assert ≤ 50 tokens (`o200k_base`) and ≤ 220 characters for worst-case blocks in every zone.

## Acceptance criteria

- Boundaries classify exactly as the TechSpec table: 49%/7 `GREEN`, 50% or 8 `YELLOW`, 65% or 10 `YELLOW`, 66% or 11 `RED`, 74% `RED`, 75% or 12 `CRITICAL`; combined conditions take the highest zone.
- The block contains turn/ceiling, usage/window with percentage, source, zone, and the zone action, in the fixed field order; a `GREEN` session below the threshold receives none in `threshold_only`, and `always` injects every time.
- `renderProtocol(DEFAULT_CONFIG)` is byte-identical to `docs/context-brake-protocol.md`; a configuration with extra allowed commands shows them in the `CRITICAL` row.
- The budget suite passes for every zone with worst-case values.

## Verification

- Unit: `tests/unit/zone-classifier.test.ts`, `tests/unit/protocol-zone-coherence.test.ts`, `tests/unit/injection-policy.test.ts`, `tests/unit/telemetry-block.test.ts`, `tests/unit/telemetry-block-budget.test.ts`, `tests/unit/usage-resolver.test.ts`, and the updated `tests/unit/protocol-service.test.ts`.
- Integration: not applicable — pure core over injected values.
- End-to-end: not applicable.
- Manual: none.
- Platforms: not platform-sensitive.
- Commands: `npm run typecheck`, `npm run lint`, `npx vitest run tests/unit/zone-classifier.test.ts tests/unit/protocol-zone-coherence.test.ts tests/unit/injection-policy.test.ts tests/unit/telemetry-block.test.ts tests/unit/telemetry-block-budget.test.ts tests/unit/usage-resolver.test.ts tests/unit/protocol-service.test.ts`, `npm run dependencies:check`, `npm run coverage`
- Environment dependency: none; `js-tiktoken` must pass `npm run dependencies:check` (no install scripts).
- Expected evidence: green suites, the regenerated protocol, and the updated lock file.

## Affected files

- Modify: `src/core/services/protocol-service.ts`, `docs/context-brake-protocol.md`, `package.json`, `package-lock.json`, `tests/unit/protocol-service.test.ts`
- Create: `src/core/contracts/zones.ts`, `src/core/contracts/runtime.ts`, `src/core/services/{zone-classifier,usage-resolver,zone-actions,telemetry-block,injection-policy}.ts`, `tests/unit/{zone-classifier,protocol-zone-coherence,injection-policy,telemetry-block,telemetry-block-budget,usage-resolver}.test.ts`

## Observability and recovery

- Operational signal: the block is the agent-facing signal; the protocol is the human-readable contract; `PROTOCOL_FILE_MISMATCH` in `doctor` shows when an installed protocol predates the configured extra commands.
- Recovery: revert the renderer and the packaged protocol together; the block version stays v1 until the first release.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: T02 implemented. `zones.ts` and `runtime.ts` contracts exist (no Zod); `zone-classifier.ts` implements `floor(used × 100 / window)` and highest-zone-first classification (49/7 GREEN, 50 or 8 YELLOW, 65/10 YELLOW, 66 or 11 RED, 74 RED, 75 or 12 CRITICAL, 130% CRITICAL); `usage-resolver.ts` resolves measured Pi/Oh-My-Pi readings or `baseline + ceil(chars/4) + turns × perTurn` with config/measured window; `zone-actions.ts` holds one compact action and one protocol sentence per zone; `telemetry-block.ts` renders the v1 line in the fixed field order; `injection-policy.ts` decides `threshold_only` (non-GREEN or usage ≥ threshold) and `always`; `protocol-service.ts` renders the zone rows from `zone-actions.ts` and appends `brake.additionalAllowedCommands` inline in the CRITICAL row only when non-empty. `docs/context-brake-protocol.md` needed no edit: the renderer reproduces it byte-for-byte (verified by the pinned test and an empty `git diff`).
- Changed files:
  - `src/core/contracts/zones.ts`, `src/core/contracts/runtime.ts` (new contracts; `RuntimeDescriptor` exposes `estimation` constants and `newSessionCommand` for the adapter tasks)
  - `src/core/services/zone-classifier.ts`, `usage-resolver.ts`, `zone-actions.ts`, `telemetry-block.ts`, `injection-policy.ts` (new)
  - `src/core/services/protocol-service.ts` (zone rows from `zone-actions.ts`; extra commands in the CRITICAL row)
  - `tests/unit/zone-classifier.test.ts`, `protocol-zone-coherence.test.ts`, `injection-policy.test.ts`, `telemetry-block.test.ts`, `telemetry-block-budget.test.ts`, `usage-resolver.test.ts` (new), `tests/unit/protocol-service.test.ts` (extra-commands assertions)
  - `package.json`, `package-lock.json` (`js-tiktoken` devDependency)
  - `docs/context-brake-protocol.md` unchanged (byte-identical)
- Checks:
  - `npm run typecheck` — pass.
  - `npm run lint` — pass.
  - `npx vitest run tests/unit/zone-classifier.test.ts tests/unit/protocol-zone-coherence.test.ts tests/unit/injection-policy.test.ts tests/unit/telemetry-block.test.ts tests/unit/telemetry-block-budget.test.ts tests/unit/usage-resolver.test.ts tests/unit/protocol-service.test.ts` — 49 tests pass.
  - `npm run dependencies:check` — pass: 3 runtime dependency packages, no install scripts; `js-tiktoken` is a devDependency.
  - `npm run coverage` — 101 files / 449 tests pass, exit 0; `All files` 92.81% statements/lines; new modules: `zones.ts` 100%, `runtime.ts` 0% (types only, no executable code), `zone-classifier.ts` 100%, `usage-resolver.ts` 100%, `zone-actions.ts` 100%, `telemetry-block.ts` 100% lines/statements (50% branch on `usedTokens ?? 0` covered by the null-usage test), `injection-policy.ts` 100%, `protocol-service.ts` 94.59% (16-17 are the pre-existing update branch).
  - `npm run schemas:check`, `npm run assets:check`, `npm run package:smoke` — pass (220 packaged files).
  - Budget evidence: worst-case blocks (turn 999, 1,000,000-token window, 9,999,999 used) measured with `js-tiktoken` `o200k_base`: GREEN 34, YELLOW 47, RED 50, CRITICAL 42 tokens; longest 190 characters — all ≤ 50 tokens and ≤ 220 characters.
  - Quality profile QA-01 to QA-11, scoped to the eight source files and the seven suites: QA-01, 02, 03, 04, 07, 09 empty; QA-05 and QA-06 have empty file lists (no runtime assets or hook paths in this diff) and were skipped per the profile; QA-08 (`tests/unit/runtime-bundle-imports.test.ts`) does not exist yet (T08 deliverable) and no bundle is touched. QA-10 has one reservation hit: `tests/unit/protocol-zone-coherence.test.ts:23` `throw new Error('Missing protocol row ...')` — a precondition guard in a test helper, not a fixable user failure. QA-11 empty (max file 74 lines; no declaration with 4+ parameters).
- Validated state: working tree on HEAD `b9647e9` plus the T01 diff (configuration/schema) and this diff; Node v24.19.0, Windows 11, PowerShell 7; no external service, harness, or clock; `docs/context-brake-protocol.md` byte-identical (empty diff). Pre-existing untracked files untouched.
- Open items:
  - Reservation: `RuntimeDescriptor` in `runtime.ts` carries only `harness`, `estimation`, and `newSessionCommand`; CMP-02 still assigns it the capability definitions, which the adapter tasks (T06/T07) will add in `capabilities.ts` without changing this task's callers.
  - Reservation: `protocol-service.ts` appends configured extra commands inline as additional list items in the CRITICAL sentence (`..., and \`npm run typecheck\``) rather than as a trailing sentence; the default row is unchanged and the byte-for-byte test holds. The exact wording for the non-default case is not fixed by the TechSpec.
  - Note: `tests/unit/protocol-zone-coherence.test.ts` reads the GREEN threshold from the "Usage below X%" text and the YELLOW/RED/CRITICAL boundaries from the configuration; it asserts the printed boundaries match the classifier at the boundary and one below for the defaults and two custom configurations (percentages), plus the critical turn boundary.
  - No ADR candidate; no architectural or scope deviation.

### ADR candidates

None - direct TechSpec implementation or local decision.
