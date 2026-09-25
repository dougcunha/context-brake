# Stable execution context

Load in this exact order:

1. `tasks/prd-02.1-freio-por-uso-medido/prd.md`
2. `tasks/prd-02.1-freio-por-uso-medido/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T05 — Legacy migration, capability, and documentation

## Outcome

`doctor` flags legacy turn limits, and `init --yes` removes them idempotently. Claude Code's `context_usage` shows as `unknown`, sourced from the transcript. The README, the research, and the docs describe usage-driven zones.

## Dependencies and boundaries

- Depends on: T01, T02, T04
- Unblocks: —
- In scope (DEC-03, DEC-12):
  - the `LEGACY_TURN_LIMITS` finding;
  - `planConfigChange` normalization;
  - the Claude Code capability;
  - README: config section, upgrade note, and `contextWindowCeiling` explained as a budget;
  - the Claude Code section of `docs/research/harness-integrations.md`.
- Out of scope: new CLI commands; capabilities of other harnesses.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-07 | `prd.md#functional-requirements` | Window documented as budget |
| FR-09 | `prd.md#functional-requirements` | Legacy config migration |
| FR-10 | `prd.md#functional-requirements` | Documentation and capability |
| US-04 | `prd.md#stories-and-journeys` | Upgrade path |
| DEC-03, DEC-12 | `techspec.md#technical-decisions` | Migration and capability |
| CMP-09, CMP-11, CMP-13 | `techspec.md#components-and-flow` | Components |
| TC-19–TC-23 | `techspec.md#test-approach` | Tests and gates |

## Context to recover on demand

- Applicable rules: `file-changes.md`, `cli-output.md`, `harness-adapters.md`, `tests.md`.
- Existing code: `src/core/services/doctor-checks.ts` (98 lines; the new check goes to a sibling file if it would pass 100), `installation-builder.ts:13-36`, `src/infrastructure/harnesses/claude-code/capabilities.ts`, `README.md:59,150-180`.
- Harness reference: `docs/research/harness-integrations.md#claude-code`.
- Tests: `doctor-checks.test.ts`, `init` integration suites, `readme-config-example.test.ts`, support and capability suites.

## Work

- [x] T05.1 Add the `LEGACY_TURN_LIMITS` check with its two message variants.
- [x] T05.2 Normalize the telemetry section in `planConfigChange`, idempotently.
- [x] T05.3 Set the Claude Code `context_usage` capability to `unknown`, with its impact text.
- [x] T05.4 Update the README, the research section (fields, the 2026-09-25 check, and that the format is undocumented), and any remaining docs; run all gates (TC-23).

## Acceptance criteria

- `doctor` shows the retired-defaults warning for 7/10/12, the ignored-fields warning for 20/30/40, and nothing for a normalized config.
- On a legacy 7/10/12 config, `init --yes` removes the four turn fields and keeps the other keys. A second run plans no change, and `--dry-run` writes nothing.
- `doctor` shows Claude Code context usage as `unknown`, with the transcript impact text, and the support level is unchanged.
- The README example validates, and all gates pass with coverage of at least 80%.

## Verification

- Unit: TC-19, TC-21, TC-22.
- Integration: TC-20.
- End-to-end: not applicable beyond T04.
- Manual: the TechSpec manual acceptance in a real Claude Code session (owner: user), run at QA.
- Platforms: CI matrix.
- Commands: `npm run lint`, `npm run typecheck`, `npm run coverage`, `npm run schemas:check`, `npm run package:smoke`.
- Environment dependency: none.
- Expected evidence: passing suites and gates.

## Affected files

- Modify: `src/core/services/doctor-checks.ts` (or create `src/core/services/config-legacy-checks.ts`), `src/core/services/installation-builder.ts`, `src/infrastructure/harnesses/claude-code/capabilities.ts`, `README.md`, `docs/research/harness-integrations.md`, related tests.

## Observability and recovery

- Operational signal: the `LEGACY_TURN_LIMITS` finding in `doctor`.
- Recovery: revert the commit; users restore the turn fields manually if they downgrade.

## Handoff

- Produced result: `LEGACY_TURN_LIMITS` warning in `doctor` (retired-defaults variant for 7/10/12, ignored-fields variant otherwise, no finding without `criticalTurn`/`turnCeiling`); `planConfigChange` normalizes telemetry through `normalizeTurnLimits` (always drops `turnCeiling` and `criticalTurn`, drops `greenMaxTurn`/`yellowMaxTurn` only at 7/10, keeps key order); Claude Code `context_usage` is `unknown` with the DEC-12 impact text, support level stays `full`; README (zones by usage with plan/no-plan actions, optional turn limits, `contextWindowCeiling` as budget, upgrade note, Claude harness row, config example without turn fields), `docs/telemetry-block.md` (measured source includes the Claude transcript), Claude Code research section (transcript `usage` fields, 2026-09-25 check, undocumented, summary table and design consequence). O-01: the repository's `context-brake.config.json` is normalized and the `.agents/rules/code-standards.md` examples no longer use `turnCeiling`/`criticalTurn`.
- Changed files: new `src/core/services/config-legacy-checks.ts` (`doctor-checks.ts` stays at 99 lines: one import, one line-neutral change); `src/core/services/installation-builder.ts`; `src/infrastructure/harnesses/claude-code/capabilities.ts`; new `tests/unit/config-legacy-checks.test.ts` (TC-19 plus normalization and plan idempotency); new `tests/integration/init-legacy-turn-limits.test.ts` (TC-20: `--dry-run` writes nothing, `init --yes` removes the four fields and keeps other keys, second run unchanged, `doctor` before/after); `tests/unit/harness-adapters.test.ts` (TC-21); `README.md`; `docs/telemetry-block.md`; `docs/research/harness-integrations.md`; `context-brake.config.json`; `.agents/rules/code-standards.md`.
- Checks: `npm run lint` pass; `npm run typecheck` pass; `npm run build` pass; `npm run schemas:check` pass; `npm run coverage` exit 0, 244 files, 1586 passed, 3 skipped, lines 95.43%, branches 90.33%; `npm run package:smoke` exit 0. TC-22 (`readme-config-example.test.ts`, `protocol-service.test.ts`) pass inside the coverage run. Quality profile QA-01..QA-08 over the touched TypeScript files: no hits.
- Validated state: T01–T05 uncommitted worktree on HEAD `5492604`, Windows 11, Node from the repository toolchain, 2026-09-25.
- Open items: manual acceptance in a real Claude Code session (owner: user) runs at QA per the TechSpec. The CI matrix (Linux, macOS) is not run locally.

### ADR candidates

None - direct TechSpec implementation or local decision.
