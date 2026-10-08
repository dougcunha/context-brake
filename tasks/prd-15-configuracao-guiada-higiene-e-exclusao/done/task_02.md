# Stable execution context

Load in this exact order:

1. `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/prd.md`
2. `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Repair the configuration in init

## Outcome

`init` reads a configuration whose only problem is unrecognized keys, lists the keys it will drop in the config change preview, and (after the usual confirmation) rewrites a valid file that keeps every recognized value. `--dry-run` writes nothing and a second `init` plans no configuration change. Any other validation issue still stops `init` with that issue's message.

## Dependencies and boundaries

- Depends on: T01 (sanitizer and `readTolerant`)
- Unblocks: T05
- In scope: `cli/init-config-state.ts` (tolerant read through T01's `readTolerant`, T05 extends it); the dropped-keys summary in `planConfigChange`; moving `planManifestChange` out of `installation-builder.ts`.
- Out of scope: the sanitizer and the tolerant store read (T01); exclusion (T05); a list of retired keys (rejected, OI-15-01).
- Human decision: DEC-HIL-02 accepted that `init` meets FR-01 through the preview (OI-01, DEC-03).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-02 | `prd.md#functional-requirements` | Preview names the keys, confirmation, dry run, valid result, idempotent |
| FR-01 | `prd.md#functional-requirements` | `init` meets it through the preview (DEC-03, accepted in DEC-HIL-02) |
| NFR-01, NFR-04 | `prd.md#non-functional-requirements` | Plan before write, idempotent; report content |
| DEC-03, DEC-04, DEC-13 | `techspec.md#technical-decisions` | Preview instead of error, rewrite from the parsed object, extraction |
| CMP-07, CMP-13 | `techspec.md#components-and-flow` | Builder + `manifest-change.ts`, `init-config-state.ts` |
| TC-04, TC-05 | `techspec.md#test-approach` | `init` repair; confirmation and JSON |

## Context to recover on demand

- Applicable skills and rules: `code-standards.md` (100-line files, 30-line functions, no comments, guard clauses), `javascript-typescript.md` (zod, immutability, `unknown`), `file-changes.md`, `cli-output.md`, `tests.md`.
- Existing code: `src/infrastructure/storage/project-config-store.ts`; `src/core/validation/configuration-validator.ts`; `src/core/services/installation-builder.ts` (94 lines; `planConfigChange`, `inSchemaOrder`, `configSummary`, `planManifestChange` at the end); `src/cli/commands/init.ts:22-31,36-66` (`loadExistingConfig`, `runInit` is already 33 lines: do not grow it); importers of `planManifestChange`/`planConfigChange`: `src/core/services/installation-service.ts`, `tests/unit/config-legacy-checks.test.ts`, `tests/unit/installation-summary.test.ts`.
- Contract or integration: `techspec.md#contracts-and-data`, `techspec.md#errors-security-and-recovery`.
- Terrain: `techspec.md#terrain-baseline` (builder at 94 lines: extraction is required to stay at or below 100).

## Work

- [x] T02.1 Move `planManifestChange` and `ManifestChangeInput` to `core/services/manifest-change.ts`; update every import.
- [x] T02.2 Add `dropped` to `ConfigChangeInput`; append `; drop unrecognized keys: <paths>` to the config change summary when non-empty.
- [x] T02.3 Add `cli/init-config-state.ts` (`loadInitConfigState(root)` returning `{ config, dropped }`, null config on `ENOENT`); make `init.ts` use it and thread `dropped` through `planInstallation` to `planConfigChange` without growing `runInit` past its current length.
- [x] T02.4 Tests: `tests/integration/init-config-repair.test.ts` (TC-04, TC-05).

## Acceptance criteria

- On a fixture with the five retired keys, `init --dry-run` exits without writing and its preview summary names all five; `init --yes` writes a valid file whose recognized values equal the originals; a second `init --yes` plans no configuration change.
- A nested unrecognized key is removed at its depth; key order follows the schema order.
- `telemtry` (typo) beside a missing `telemetry` is not repaired: `init` fails with the validation message for both issues and writes nothing.
- Without `--yes` on a non-TTY, `init` raises `CONFIRMATION_REQUIRED`; `--json --dry-run` output validates against `installReportSchema` and carries the dropped keys in the summary.
- `installation-builder.ts` and every touched `src/` file ends at or below 100 lines; `runInit` is not longer than before.

## Verification

- Unit: none beyond T01's sanitizer tests.
- Integration: `runInProcessCli` on a temporary directory with the five-key fixture; assert file content before/after, plan content, and idempotency.
- End-to-end: not applicable here (TC-17 in QA).
- Manual: none.
- Platforms: Linux, macOS, Windows (LF output; no path-specific logic).
- Commands: `npm test -- tests/integration/init-config-repair.test.ts tests/unit/config-legacy-checks.test.ts tests/unit/installation-summary.test.ts`, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: tests citing `FR-02`, `TC-04`, `TC-05`; lint, typecheck, coverage green.

## Affected files

- Modify: `src/core/services/installation-builder.ts`, `src/core/services/installation-service.ts` (import and `dropped` pass-through only), `src/cli/commands/init.ts`, `tests/unit/config-legacy-checks.test.ts` and `tests/unit/installation-summary.test.ts` (imports only, if needed)
- Create: `src/core/services/manifest-change.ts`, `src/cli/init-config-state.ts`, `tests/integration/init-config-repair.test.ts`

## Observability and recovery

- Operational signal: the preview summary and the install report.
- Recovery: dropped keys are not migrated (by design); `--dry-run` shows them first. Revert the commit to restore the strict `init`.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `init` reads the configuration tolerantly (`loadInitConfigState` → `ProjectConfigStore.readTolerant`), threads `dropped` through `planInstallation` to `planConfigChange`, and the config change summary appends `; drop unrecognized keys: <paths>`. A dry run writes nothing; `--yes` writes a valid file with recognized values unchanged; a second run plans no configuration change; without `--yes` on a non-TTY it raises `CONFIRMATION_REQUIRED`; a typo that leaves a required key missing is not repaired and fails with both issues. `planManifestChange` moved to `manifest-change.ts`.
- Changed files: modified `src/core/services/installation-builder.ts` (94 → 73 lines), `src/core/services/installation-service.ts` (90 → 93), `src/cli/commands/init.ts` (66 → 56; `runInit` shrank because `loadExistingConfig` was replaced); created `src/core/services/manifest-change.ts`, `src/cli/init-config-state.ts`, `tests/integration/init-config-repair.test.ts`. The sanitizer and `readTolerant` come from T01, so no `project-config-store.ts` change here.
- Checks: `npm run lint` and `npm run typecheck` clean; `npm run coverage`: 223 files, 1190 tests passed, all-files coverage 94.13%; quality-profile sweep (QA-01..QA-07) over the five touched `src/` files returned no hit and no file above 100 lines; the T02 test file passes alone (4 tests) and `init-idempotency`, `config-legacy-checks`, and `installation-summary` stay green.
- Validated state: HEAD `c845728` plus the uncommitted working tree of T01 and T02; Windows 11, Node 24.19.
- Open items: (1) Test budget: one coverage run took 140 s and `npm run test:budget` measured 126.2 s (budget 120 s) while T01's coverage run took 92.7 s; the slowest files are unrelated process-lane shell tests (`statusline-shell` 25.4 s, `codex-hook-command-shells` 18.5 s) and this task's in-process tests add about 1.3 s, so it looks like machine-load variance, but it is not proven; T08 re-measures and any real regression goes to the user. (2) `sdd-orchestrate-tasks` carries the T01 open items for T03/T04 and T06 forward.

### ADR candidates

None - direct TechSpec implementation or local decision.
