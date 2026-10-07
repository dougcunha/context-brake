# Stable execution context

Load in this exact order:

1. `tasks/prd-12-refatoracao-modo-leve-modo-unico/prd.md`
2. `tasks/prd-12-refatoracao-modo-leve-modo-unico/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T06 — Install and remove without support files

## Outcome

- `init` writes only the config, the manifest, and the harness assets.
- `remove` deletes the manifest assets, the config, and the runtime files ContextBrake owns.
- Neither command reads or writes the protocol file, instruction files, or `.gitignore`.
- The `instructionFiles` key and the `--remove-state`, `--instruction-file`, `--create-instructions`, and `--migrate-legacy` flags no longer exist, and neither do the doctor findings about them.

## Dependencies and boundaries

- Depends on: T03
- Unblocks: T07
- In scope (DEC-04, DEC-10, DEC-11):
  - **Delete services:** `protocol-service`, `instruction-service`, `instruction-markers`, `gitignore-service`, `gitignore-checks`, `gitignore-markers`, `legacy-preview`, `state-removal`. Its runtime part moves into `removal-service`.
  - **`support-files.ts`:** drop the full and light branches. It returns no support-file change.
  - **Ownership and findings:** `CHANGE_OWNERS` drops `protocol`, `instruction_block`, and `ignore_block`. `installation-findings.ts` drops the protocol asset and the conflict findings.
  - **Doctor checks:** `doctor-checks.ts` and `project-file-checks.ts` drop `INSTRUCTION_REFERENCE_MISSING`, `PROTOCOL_FILE_*`, `STATE_FILES_NOT_IGNORED`, `MALFORMED_GITIGNORE_MARKERS`, `LIGHT_MODE_LEFTOVER`, and `LIGHT_MODE_ASSET_KEPT`. They also drop `LEGACY_BLOCK_DETECTED` and the protocol and instruction conflict codes.
  - **Removal:**
    - `removal-service.ts` and `removal-helper.ts` drop the instruction and gitignore removal.
    - `remove` always deletes owned runtime files under `.context-brake/runtime/`.
  - **CLI:**
    - `cli/commands/{init,remove,doctor}.ts` lose the protocol and `.gitignore` snapshot lookups and `emitLegacyPreview`.
    - `snapshot-helper.ts` loses the protocol and instruction paths.
    - The `remove` parser loses `--remove-state`, and `init` loses the instruction flags.
  - **Config keys:** remove `instructionFiles` and `stateStorage` from the config and its defaults. `stateStorage` moved here from T02, because only the support-file, gitignore, and allowlist modules still read it.
  - **Tests:** delete the protocol, instruction, gitignore, legacy-preview, and state-removal tests. Rewrite `removal-service`, `doctor-checks`, `doctor-service`, `removal-conflicts`, `safe-removal`, `directory-pruner`, `change-applier`, `changes-schema`, `e2e-07-08`, and `e2e-10-fixtures`.
- Out of scope:
  - This repository's own blocks and protocol file (T07).
  - README (T07).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-08 | `prd.md#functional-requirements` | No protocol, blocks, gitignore, or state files; no `--remove-state`; `instructionFiles` gone |
| FR-09 | `prd.md#functional-requirements` | Support-file findings gone |
| FR-02 | `prd.md#functional-requirements` | Instruction flags rejected |
| DEC-04, DEC-10, DEC-11 | `techspec.md#technical-decisions` | — |
| CMP-07, CMP-08 | `techspec.md#components-and-flow` | — |
| TC-12, TC-13 | `techspec.md#test-approach` | — |

## Context to recover on demand

- Applicable rules: `file-changes.md`, `cli-output.md`, `tests.md`.
- Existing code:
  - `src/core/services/support-files.ts:28-63`.
  - `src/core/services/removal-service.ts:35-119`.
  - `src/core/services/state-removal.ts:19-24`: runtime deletions to keep.
  - `src/cli/commands/{init.ts:44-62, remove.ts:37-68, doctor.ts:34-49}`.
  - `src/core/contracts/changes.ts:5`.

## Work

- [x] T06.1 Delete the support-file services. Simplify `support-files.ts`, `installation-findings.ts`, and `installation-service.ts`. Remove `instructionFiles` and its flags.
- [x] T06.2 Simplify removal: drop the instruction and gitignore removal and `--remove-state`, and always delete the owned runtime files.
- [x] T06.3 Remove the doctor findings and snapshot lookups for the support files. Regenerate the schemas, including `CHANGE_OWNERS`.
- [x] T06.4 Delete and rewrite the tests. Clean the lanes.
- [x] T06.5 Run lint, typecheck, `schemas:check`, the touched suites, then `npm run coverage`.

## Acceptance criteria

- After `init` in an empty fixture, there is no `docs/context-brake-protocol.md`, no `CONTEXTBRAKE` marker in any file, and no `.gitignore` change (TC-12).
- `remove` deletes the manifest assets, the config, and `.context-brake/runtime/`. `remove --remove-state` fails with `INVALID_ARGUMENTS`.
- `rg -n "protocolFile|instructionFiles|CONTEXTBRAKE:START|ignore_block|instruction_block" src schemas` returns nothing.
- `doctor --json` has none of the removed codes (TC-13).

## Verification

- Unit: `tests/unit/{removal-service,doctor-checks,doctor-service,removal-conflicts,changes-schema,configuration}.test.ts`.
- Integration: `tests/integration/{safe-removal,directory-pruner,change-applier,doctor-manual-removal,doctor-asset-currency,linked-project-root,invalid-config}.test.ts`.
- End-to-end: `tests/e2e/e2e-07-08.test.ts` (TC-12) and `e2e-10-fixtures.ts`.
- Manual: none.
- Platforms: Windows local. The symlinked instruction-file scenario disappears with the feature, and `linked-project-root` still covers the linked root.
- Commands: `npm run lint`, `npm run typecheck`, `npm run schemas:check`, `npm run build`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: pass counts, coverage thresholds met, and the empty `rg` output.

## Affected files

- Delete: `src/core/services/{protocol-service,instruction-service,instruction-markers,gitignore-service,gitignore-checks,gitignore-markers,legacy-preview,state-removal}.ts`.
- Modify:
  - Core services: `src/core/services/{support-files,installation-service,installation-findings,removal-service,removal-helper,doctor-checks,project-file-checks,doctor-service}.ts`.
  - Core contracts: `src/core/contracts/{changes,configuration}.ts`.
  - CLI: `src/cli/commands/{init,remove,doctor}.ts`, `src/cli/{snapshot-helper,init-arguments,argument-parser}.ts`, `src/cli/output/text.ts`.
  - Schemas: `schemas/*.json`.

## Observability and recovery

- Operational signal: `init` and `remove` previews list fewer files.
- Recovery: `git revert` of the task commit.

## Handoff

> Updated by `sdd-execute-task`. **T06 complete.**

- Produced result (FR-02, FR-08, FR-09, DEC-04, DEC-10, DEC-11):
  - **Install.** `init` plans only the config, the manifest, and the harness assets. `InstallationInput` lost `instructionSnapshots`, `protocolSnapshot`, `gitignoreSnapshot`, `createInstructions`, and `migrateLegacy`. `buildManagedAssets` lost its unused `config` parameter. `conflictFindings` stays, because adapter and modified-asset conflicts still need findings.
  - **Remove.** `remove` deletes the manifest assets, the config, the manifest, and every file under `.context-brake/runtime/` (`planRuntimeStateDeletions` moved into `removal-helper.ts` and always runs). It never plans a protocol, instruction-block, or `.gitignore` change.
    - `NodeChangeApplier` option `removeState` became `pruneRuntime`, and the inference from `runtime_state` owners is gone. `remove` passes `true` and `init` never does.
    - `directory-pruner.ts`: emptied runtime directories are still reported when not empty, but `.context-brake/` itself is now kept silently when it holds other files. Otherwise every `remove` with auto-restart warned about the empty `claude-mod` directory tree (pre-existing leftover, not pruned), and prd-14's handoff outside `runtime/` would warn too.
  - **Deleted modules.** `protocol-service`, `instruction-service`, `instruction-markers`, `gitignore-service`, `gitignore-checks`, `gitignore-markers`, `legacy-preview`, and `state-removal`. Also deleted rather than left as no-op functions: `support-files.ts` and `project-file-checks.ts` (the minimal form of "simplify" under DEC-11), and `zone-actions.ts`, whose last `src` importer was `protocol-service`.
  - **Contracts.** `stateStorage` and `instructionFiles` left the config schema and `DEFAULT_CONFIG`, with the now-unused path helpers. `CHANGE_OWNERS` is `config`, `harness_entry`, `runtime_asset`, `manifest`, and `runtime_state`.
  - **Doctor.** `checkInstructionFiles`, `checkProtocolFile`, and `projectFileFindings` are gone, and so are their codes (`INSTRUCTION_REFERENCE_MISSING`, `PROTOCOL_FILE_*`, `LIGHT_MODE_LEFTOVER`, `LIGHT_MODE_ASSET_KEPT`, `LEGACY_BLOCK_DETECTED`, and the gitignore codes). Finding codes are free-form strings in the report schema, so FR-09's "no removed code in the schema" holds by the service deletions. `DoctorInput` lost the three support snapshots.
  - **CLI.**
    - `snapshot-helper.ts` exposes one `collectProjectSnapshots(root)`: config, manifest, and harness paths, with no `.gitignore`, protocol, plan, checkpoint, or instruction path.
    - `init`, `remove`, and `doctor` lost their snapshot lookups, and `init` lost `emitLegacyPreview`.
    - `--instruction-file`, `--create-instructions`, and `--migrate-legacy` left the parser, along with the T03 "no longer available" guard, so `parseArgs` strict mode rejects them as `INVALID_ARGUMENTS`. `remove` lost `--remove-state`.
    - Dead exports were removed: `validateInstructionPaths`, `findingPrintKey`, and the `alreadyPrinted` parameter of `renderInstallText`.
  - **Schemas.** These were regenerated: config (182 lines fewer), doctor report, and install report (owner enum).
- Tests:
  - Deleted: `unit/{gitignore-checks,gitignore-service,init-legacy-preview,instruction-markers,instruction-service,legacy-preview,protocol-commit-switch,protocol-service,protocol-zone-coherence,reference-block-roundtrip,state-removal}`, `integration/{instruction-policy,protocol-content,symlink-junction}`, and `fixtures/instructions/*` (no remaining user). The symlinked instruction-file scenario disappears with the feature. Lane entry pruned (`init-legacy-preview`).
  - Rewritten:
    - `e2e/e2e-07-08` (TC-12): `init` leaves no protocol file, `.gitignore`, or `CLAUDE.md` change. `remove` deletes the hook, the config, and `.context-brake/` with a seeded runtime file, and keeps `task_plan.json`. `remove --remove-state --json` exits 64 with `INVALID_ARGUMENTS`.
    - `unit/removal-service` (TC-12 plan level) and `integration/runtime-state-removal`, which now covers deletion on every `remove`, idempotency, and a stray file kept with exit 0.
    - `integration/safe-removal`: a legacy `CLAUDE.md` block and the protocol file stay byte for byte.
    - `unit/removal-conflicts`: the protocol file is no longer deleted.
    - `unit/doctor-checks` (config only), `integration/doctor-light-mode` (TC-13, with a legacy `AGENTS.md` block and malformed `.gitignore` markers present, and the extended removed-code list), `unit/changes-schema`, and `unit/schemas` (removed owners rejected).
    - `unit/configuration-snapshot` (TC-04): `stateStorage` and `instructionFiles` are rejected by name. `unit/configuration` lost the canonical-path cases.
    - `unit/init-arguments` (TC-06): the instruction flags and `remove --remove-state` are rejected.
    - `unit/telemetry-block{,-budget}` use `zoneAction` from `zone-guidance`. The plan-aware action cases are gone, since `zone-guidance` tests own TC-07. The budget now covers each zone with and without a snapshot command.
  - Mechanical input edits: `integration/{doctor-asset-currency,doctor-benchmark,doctor-manual-removal,doctor-runtime-errors,invalid-config,linked-project-root,init-legacy-turn-limits,change-applier,directory-pruner}` and `unit/{doctor-service,doctor-context-window}`.
- Checks (Windows 11, base `1474f54` plus T01-T06):
  - `npm run lint` clean, `npm run typecheck` clean, `npm run build` passes, and `npm run schemas:check` passes.
  - Touched suites: 31 files and 157 tests passing.
  - Indirectly affected suites: 32 files and 142 tests (auto-restart, statusline, debug, hook preservation, symlinked config, main). These first exposed 4 failures from the `.context-brake/` non-empty warning; after the pruner fix, the 7 affected files pass with 21 tests.
  - The acceptance `rg -n "protocolFile|instructionFiles|CONTEXTBRAKE:START|ignore_block|instruction_block" src schemas` returns nothing.
  - No new `.skip(` was added (4 capability helpers, as before).
  - Quality profile QA-01, QA-02, QA-03, QA-06, QA-07, and QA-08 over the 19 changed `src` files: no hit. QA-04 and QA-05 do not apply. The Terrain baseline QA-07 hit on `installation-service.ts` (102 lines) is resolved at 87 lines.
- Not run here: `npm run coverage`. DEC-PROC-01 places the single full coverage run after T07, before the delegated review, and that overrides T06.5's "then `npm run coverage`".
- Open items for T07:
  - `package.json` `files` and `scripts/check-package.ts` / `tests/integration/package-contents.test.ts` still ship `docs/context-brake-protocol.md`. They go with this repository's protocol file (out of T06 scope).
  - `.agents/rules/file-changes.md` still describes instruction blocks and the `.gitignore` block (DEC-15).
  - The README tests (`readme-light-example`, `readme-config-example`, `docs-auto-restart`) remain red, as listed by T03.
- `tasks.md` hash drift from `approved_sources` comes from the State checkboxes, links, and `Problems and solutions` only. The DAG and traceability tables are unchanged.

### ADR candidates

None - direct TechSpec implementation or local decision.
