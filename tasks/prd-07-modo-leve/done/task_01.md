# Stable execution context

Load in this exact order:

1. `tasks/prd-07-modo-leve/prd.md`
2. `tasks/prd-07-modo-leve/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Contrato de configuração do modo leve

## Outcome

`context-brake.config.json` accepts an optional `lightMode` section with one field, `triggerZone` (default `RED`), validated with the field path in errors. Any other field is rejected. A core merge turns `--light`, `--no-light`, and `--snapshot-trigger` into a `keep`, `set`, or `remove` update. Configs without the section parse and serialize exactly as before.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T02, T03, T04
- In scope:
  - moving `SNAPSHOT_TRIGGER_ZONES` to `zones.ts`, re-exported from `configuration.ts`;
  - `src/core/contracts/light-mode.ts` (`lightModeSchema`, `LightModeConfig`);
  - the optional `lightMode` key in `configurationSchema`;
  - `src/core/services/light-mode-merge.ts`;
  - regenerating `schemas/context-brake.config.schema.json`.
- Out of scope: any consumer of the section (engine, CLI, `doctor`), and the `'light'` value of `CHECKPOINT_MODES` (T02).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Optional section as the explicit switch |
| FR-04 | `prd.md#functional-requirements` | Trigger zone only; no command field |
| FR-10 | `prd.md#functional-requirements` | Merge errors for invalid values |
| NFR-01 | `prd.md#non-functional-requirements` | Byte-identical config without the section |
| DEC-01, DEC-02, DEC-07 | `techspec.md#technical-decisions` | Section shape, no new exported declaration in `configuration.ts`, merge semantics |
| CMP-01, CMP-05 | `techspec.md#components-and-flow` | Contracts and merge |

## Context to recover on demand

- Applicable rules: `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`.
- Existing code:
  - `src/core/contracts/configuration.ts`: `SNAPSHOT_TRIGGER_ZONES`, `delegatedSnapshotSchema`; `src/core/contracts/zones.ts`.
  - `src/core/services/delegated-snapshot-merge.ts`: the model for the merge and its error messages.
  - `scripts/generate-schemas.ts`.
- Contract: `techspec.md#contracts-and-data` (`lightMode` field table).

## Work

- [x] T01.1 Move `SNAPSHOT_TRIGGER_ZONES` to `src/core/contracts/zones.ts` and re-export it from `configuration.ts` with `export { … } from`, so existing importers keep working and `configuration.ts` gains no exported declaration.
- [x] T01.2 Create `src/core/contracts/light-mode.ts` with `lightModeSchema` (a strict object whose only field is `triggerZone`, default `RED`) and `LightModeConfig`. Add `lightMode: z.optional(lightModeSchema)` to `configurationSchema`. Leave `DEFAULT_CONFIG` unchanged.
- [x] T01.3 Create `src/core/services/light-mode-merge.ts` with:
  - flags `{ light, noLight, triggerZone? }`;
  - `LightModeUpdate`, which is `keep`, `set`, or `remove`;
  - `mergeLightMode(current, flags)`: `--light` with `--no-light` is an error, and an invalid value reports the `lightMode.<field>` path;
  - `applyLightMode(config, update)`.
- [x] T01.4 Regenerate the schemas (`npm run schemas:generate`) and confirm `npm run schemas:check` passes.
- [x] T01.5 Add unit tests: TC-01 in `tests/unit/light-mode-config.test.ts` and TC-06 in `tests/unit/light-mode-merge.test.ts`.

## Acceptance criteria

- A config without `lightMode` parses to the same object as today, and `JSON.stringify(DEFAULT_CONFIG)` is unchanged.
- `{ "lightMode": {} }` parses to `{ triggerZone: 'RED' }`.
- Each invalid value is rejected with its field path:
  - an unknown `triggerZone`;
  - any extra field, such as `snapshotCommand`.
- The existing delegated-snapshot config tests pass unchanged.
- `configuration.ts` has at most 10 exported declarations, measured with the terrain baseline command.

## Verification

- Unit: TC-01, TC-06.
- Integration: not applicable.
- End-to-end: not applicable.
- Platforms: CI matrix.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`.
- Environment dependency: none.
- Expected evidence: test counts and a green schema check.

## Affected files

- Modify: `src/core/contracts/configuration.ts`, `schemas/context-brake.config.schema.json`
- Modify also: `src/core/contracts/zones.ts`
- Create: `src/core/contracts/light-mode.ts`, `src/core/services/light-mode-merge.ts`, `tests/unit/light-mode-config.test.ts`, `tests/unit/light-mode-merge.test.ts`

## Observability and recovery

- Operational signal: config validation errors carry the `lightMode.<field>` path.
- Recovery: revert the commit. The section is optional.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - `lightMode` is an optional top-level config section. It is a strict object whose only field is `triggerZone` (`YELLOW` or `RED`, default `RED`).
  - `src/core/services/light-mode-merge.ts` provides `mergeLightMode`, `applyLightMode`, and `isLightModeInEffect`. They turn `--light`, `--no-light`, and `--snapshot-trigger` into a `keep`, `set`, or `remove` update.
  - `SNAPSHOT_TRIGGER_ZONES` moved to `zones.ts`, and `configuration.ts` re-exports it.
- Changed files:
  - Modified: `src/core/contracts/zones.ts`, `src/core/contracts/configuration.ts`, `schemas/context-brake.config.schema.json`.
  - New: `src/core/contracts/light-mode.ts`, `src/core/services/light-mode-merge.ts`, `tests/unit/light-mode-config.test.ts` (7 tests), `tests/unit/light-mode-merge.test.ts` (12 tests).
- Checks:
  - `npm run typecheck`, `npm run lint`, and `npm run schemas:check` pass after `npm run schemas:generate`.
  - Targeted run: 4 files and 74 tests pass, including the unchanged `delegated-snapshot-config` and `configuration` suites.
  - Full `npm run coverage`: 1,686 passed, 3 skipped, 1 failed. The failure is `tests/e2e/e2e-support-limitations.test.ts` (PRD-01): a 30-second timeout under load, then EBUSY on cleanup. Run alone, it passes 2/2. It is a pre-existing load flake, and this task did not touch it.
- Validated state: working tree at `c3fb6a8` plus this diff, on Windows 11 with Node 24. `configuration.ts` now has 9 exported declarations instead of 10.
- Quality profile: QA-01 to QA-09 have no hits in the touched files.
- Open items: none.

### ADR candidates

None - direct TechSpec implementation or local decision.
