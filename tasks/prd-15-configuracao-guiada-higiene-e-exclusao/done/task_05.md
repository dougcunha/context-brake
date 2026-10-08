# Stable execution context

Load in this exact order:

1. `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/prd.md`
2. `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T05 — Persist the harness exclusion

## Outcome

`init --exclude-harness <id>` removes the id from `activeHarnesses`, records it in the new optional `excludedHarnesses` configuration key, and a plain `init` keeps it off and installs none of its files. `init --harness <id>` clears the exclusion and installs the harness. Naming the same id in both flags stays an argument error.

## Dependencies and boundaries

- Depends on: T02
- Unblocks: T06, T07
- In scope: the `excludedHarnesses` schema field and regenerated JSON schema; `resolveHarnessExclusion`; the exclusion in `init-config-state.ts`, `planInstallation`, and `planConfigChange`; the config-only plan when no harness stays active but the exclusion changed; extracting `planAdapters` into `installation-adapters.ts` (keeps `installation-service.ts` at or below 100 lines).
- Out of scope: deleting the harness artifacts (T06); `doctor` and text lines (T07); the all-excluded finding variant (T06).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-05 | `prd.md#functional-requirements` | Removed from `activeHarnesses`, recorded as excluded (artifact deletion in T06) |
| FR-06 | `prd.md#functional-requirements` | Plain `init` neither activates nor installs an excluded harness |
| FR-07 | `prd.md#functional-requirements` | `--harness` clears; both flags is an argument error |
| NFR-01, NFR-04 | `prd.md#non-functional-requirements` | Idempotency; configuration schema regenerated |
| DEC-07, DEC-08, DEC-10 (config-only plan), DEC-13 | `techspec.md#technical-decisions` | Schema field, resolver, config-only plan, extraction |
| CMP-01, CMP-07, CMP-08, CMP-11, CMP-13 | `techspec.md#components-and-flow` | Schema, builder, resolver, service, `init-config-state.ts` |
| TC-10, TC-12, TC-13, TC-14, TC-15 (only-detected and first-run edges) | `techspec.md#test-approach` | Resolver; schema; plain init; include; edges |

## Context to recover on demand

- Applicable skills and rules: `code-standards.md`, `javascript-typescript.md` (literal unions, immutability), `file-changes.md`, `cli-output.md`, `tests.md`.
- Existing code: `src/core/contracts/configuration.ts:41` (`configurationSchema`, `uniqueCheck`, `DUPLICATE_ENTRIES_RULE`); `src/core/services/installation-builder.ts` (`planConfigChange`, `CONFIG_KEY_ORDER`); `src/core/services/installation-service.ts` (`planAdapters`, `planInstallation`, `emptyResult`); `src/core/services/detection-service.ts` (`excluded` state wins, `assertSelection`); `src/cli/init-arguments.ts:41-46` (`harnessSelection`); `src/cli/argument-validator.ts:20-25`; `src/cli/init-config-state.ts` (from T02); `scripts/generate-schemas.ts`, `scripts/check-schemas.ts`.
- Contract or integration: `techspec.md#contracts-and-data`, `techspec.md#errors-security-and-recovery`.
- Terrain: `techspec.md#terrain-baseline` (service at 90 lines, configuration.ts exports at 10: add no export to it).

## Work

- [x] T05.1 Add `excludedHarnesses` (optional, unique ids) right after `activeHarnesses` in `configurationSchema`; run `npm run schemas:generate`; keep `schemas/context-brake.config.schema.json` current. Omit the key from written files when the list is empty.
- [x] T05.2 Add `core/services/harness-exclusion.ts`: `resolveHarnessExclusion({ configured, include, exclude })` returning `{ excluded, selection }` with `excluded = unique((configured − include) ∪ exclude)` sorted; the selection feeds `detectHarnesses`.
- [x] T05.3 Extend `loadInitConfigState` to return `excluded` and `selection`; make `init.ts` pass them to `planInstallation`; keep `runInit` no longer than before.
- [x] T05.4 `planConfigChange` accepts `excluded`: `activeHarnesses = (current ∪ active) − excluded`, writes `excludedHarnesses` (sorted, omitted when empty); an exclusion in a hand-edited file wins over the active list.
- [x] T05.5 Extract `planAdapters` to `core/services/installation-adapters.ts`; in `planInstallation`, return `emptyResult` only when no harness stays active and the exclusion did not change; otherwise plan a config-only change.
- [x] T05.6 Tests: `tests/unit/harness-exclusion.test.ts` (TC-10), `tests/unit/configuration.test.ts` additions (TC-12), `tests/integration/init-exclusion.test.ts` (TC-13 persistence part, TC-14), edges in `tests/integration/init-exclusion-edges.test.ts` (only detected harness excluded; first run without configuration).

## Acceptance criteria

- `init --exclude-harness opencode --yes` on a project where OpenCode is detected writes `activeHarnesses` without `opencode` and `excludedHarnesses: ["opencode"]`; the OpenCode integration is not planned for install.
- A plain `init --yes` afterwards plans no OpenCode file and no change; a second run plans nothing.
- `init --harness opencode --yes` clears the exclusion, activates and installs OpenCode.
- `--harness X --exclude-harness X` still exits `64` with the existing message.
- `--exclude-harness X` where X is the only detected harness writes the configuration (and no other file), exit status reflects a normal success.
- `npm run schemas:check` passes; duplicates in `excludedHarnesses` fail validation naming the path.
- Touched `src/` files end at or below 100 lines.

## Verification

- Unit: resolver combinations; schema accept/reject.
- Integration: `runInProcessCli` with OpenCode/Claude detection fixtures in a temporary directory (reuse the detection helpers of `tests/integration/init-detection.test.ts`); assert configuration, plan, second-run no-op.
- End-to-end: not applicable here (TC-17 in QA).
- Manual: none.
- Platforms: Linux, macOS, Windows (no path-specific logic).
- Commands: `npm test -- tests/unit/harness-exclusion.test.ts tests/unit/configuration.test.ts tests/integration/init-exclusion.test.ts tests/integration/init-exclusion-edges.test.ts tests/integration/init-detection.test.ts tests/unit/detection-service.test.ts`, `npm run schemas:check`, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: tests citing `FR-05`..`FR-07`, `TC-10`, `TC-12`..`TC-15`; schema check, lint, typecheck, coverage green.

## Affected files

- Modify: `src/core/contracts/configuration.ts`, `schemas/context-brake.config.schema.json` (generated), `src/core/services/installation-builder.ts`, `src/core/services/installation-service.ts`, `src/cli/init-config-state.ts`, `src/cli/commands/init.ts`, `tests/unit/configuration.test.ts`
- Create: `src/core/services/harness-exclusion.ts`, `src/core/services/installation-adapters.ts`, `tests/unit/harness-exclusion.test.ts`, `tests/integration/init-exclusion.test.ts`, `tests/integration/init-exclusion-edges.test.ts`

## Observability and recovery

- Operational signal: the config change summary and the configuration file.
- Recovery: `init --harness <id>` reinstalls; reverting the commit makes an older build reject `excludedHarnesses` as an unrecognized key, which T02 repairs.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: the configuration has an optional `excludedHarnesses` list (unique ids, after `activeHarnesses`; omitted when empty; schema JSON regenerated). `init --exclude-harness <id>` removes the id from `activeHarnesses`, persists it, and installs none of its files; a plain `init` keeps it off (no plan changes, detection state `excluded` in JSON); `init --harness <id>` clears the exclusion and installs it; both flags for one id stay exit 64. When no harness stays active but the exclusion changed, `init` writes the configuration only (no manifest unless one already exists). `resolveHarnessExclusion`, `hasSameHarnesses`, and `applyExclusion` are pure core helpers.
- Changed files: modified `src/core/contracts/configuration.ts`, `schemas/context-brake.config.schema.json` (generated), `src/core/services/installation-builder.ts` (`excluded` input; 76 lines), `src/core/services/installation-service.ts` (76 lines; `excluded` input, config-only plan, no manifest when nothing was installed before), `src/cli/init-config-state.ts` (returns `excluded` and `selection`), `src/cli/commands/init.ts`, `src/cli/init-arguments.ts` (removed the now-unused `harnessSelection`), `tests/unit/configuration.test.ts`; created `src/core/services/harness-exclusion.ts`, `src/core/services/installation-adapters.ts` (`planAdapters` extracted unchanged), `tests/unit/harness-exclusion.test.ts`, `tests/integration/init-exclusion.test.ts`, `tests/integration/init-exclusion-edges.test.ts`.
- Checks: `npm run lint`, `npm run typecheck`, `npm run schemas:check` clean; `npm run coverage`: 230 files, 1231 tests passed, 94.8 s, 94.23%; quality sweep over the eight touched `src/` files returned no hit and no file above 100 lines.
- Validated state: HEAD `c845728` plus the uncommitted working tree of T01..T05; Windows 11, Node 24.19.
- Open items: (1) Deleting the artifacts of an already installed excluded harness is T06 (this task only prevents installation and persists the exclusion). (2) The generic `NO_PROJECT_HARNESS` warning still appears when every detected harness is excluded and nothing changes; T06 adds the all-excluded variant. (3) T06 reminder: `planHarnessRemovals` takes an explicit adapter list and `removal-service.ts` keeps the all-adapters fallback; add the test that a plain `init` plans no harness deletion.

### ADR candidates

None - direct TechSpec implementation or local decision.
