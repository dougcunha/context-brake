# Stable execution context

Load in this exact order:

1. `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/prd.md`
2. `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T06 — Delete the artifacts of an excluded harness

## Outcome

Excluding a harness that was installed adds the deletion of its hook registrations, assets, and manifest entries to the `init` plan, using the same code `remove` uses per harness. The preview lists the deletions and the write needs confirmation. A removal conflict keeps the harness active for a retry; a project with only excluded harnesses gets an explanatory warning.

## Dependencies and boundaries

- Depends on: T05
- Unblocks: T07
- In scope: extracting `planHarnessRemovals` from `removal-service.ts`; calling it from `planInstallation` for installed-and-excluded harnesses; conflict retention in `activeHarnesses`; `no-harness-finding.ts` (the `init` side) with the all-excluded variant.
- Out of scope: `doctor` and the text lines (T07); changing what `remove` deletes.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-05 | `prd.md#functional-requirements` | Plans the deletion of hook registrations, assets, and manifest entries; preview and confirmation |
| FR-06 | `prd.md#functional-requirements` | Later runs plan nothing for an already removed harness |
| NFR-01 | `prd.md#non-functional-requirements` | Plan before write, idempotent |
| DEC-09, DEC-10 (finding variant), DEC-13 | `techspec.md#technical-decisions` | Shared removal, conflict retention, finding file, extraction |
| CMP-09, CMP-10, CMP-11 | `techspec.md#components-and-flow` | `harness-removal.ts`, `removal-service.ts`, installation service |
| TC-11, TC-15 | `techspec.md#test-approach` | Deletion; conflict, modified asset, all-excluded |

## Context to recover on demand

- Applicable skills and rules: `code-standards.md`, `file-changes.md` (refuse unparseable files), `harness-adapters.md`, `tests.md`.
- Existing code: `src/core/services/removal-service.ts` (`planAdapterRemovals`, `planRemoval`, 80 lines); `removal-helper.ts` (`planAssetDeletions`, `createRemovalFinding`); `installation-service.ts` and `installation-adapters.ts` (T05); `installation-builder.ts` (`planConfigChange`); adapter `planRemove` implementations (`claude-code/planner.ts:61-76`, `codex-cli/planner.ts:63-82`, `opencode/planner.ts`); `change-plan-service.ts` (changes with equal sha are dropped; duplicate targets with equal content are merged).
- Contract or integration: `techspec.md#technical-decisions` DEC-09, DEC-10.
- Tests to mirror: `tests/integration/remove-invalid-config.test.ts`, `init-remove-footprint.test.ts`, `init-idempotency.test.ts`.

## Work

- [x] T06.1 Extract `planAdapterRemovals` into `core/services/harness-removal.ts` as `planHarnessRemovals`; `removal-service.ts` uses it with unchanged behavior (existing remove tests are the characterization).
- [x] T06.2 In `planInstallation`, compute `installed = config.activeHarnesses ∪ previousManifest.entries[].harness`; for each excluded harness in `installed`, merge `planHarnessRemovals` changes, conflicts, and findings into the plan; restrict asset deletions to that harness's `assetPaths` using the manifest.
- [x] T06.3 On a removal conflict, keep that harness in `activeHarnesses` this run (via the `retained` input of `planConfigChange`) so the next `init` retries; the conflict surfaces as the existing finding.
- [x] T06.4 Add `core/services/no-harness-finding.ts` (init side now, doctor in T07): when some detection is `excluded`, the `NO_PROJECT_HARNESS` warning reads `All detected harnesses are excluded by configuration.` with remediation `Include one with --harness <id>.`; otherwise the existing text.
- [x] T06.5 Tests: `tests/integration/init-exclusion.test.ts` additions (TC-11) and `init-exclusion-edges.test.ts` (TC-15: removal conflict then retry, modified asset kept, all-excluded plain run).

## Acceptance criteria

- With OpenCode installed, `init --exclude-harness opencode --dry-run` lists the OpenCode asset and entry deletions and writes nothing; `--yes` removes them, drops the manifest entry and asset, and leaves other harnesses' files untouched.
- A run after that plans nothing for OpenCode (the hook files are gone and OpenCode is neither active nor in the manifest).
- If the excluded harness's file is unparseable, `init` reports `INVALID_HARNESS_CONFIG`, leaves that file untouched, keeps the harness in `activeHarnesses`, and a later run after the file is fixed removes it and clears it from the active list.
- A user-modified runtime asset of the excluded harness is handled as `remove` handles it (not silently deleted; reported).
- A plain `init` where every detected harness is excluded and nothing changes returns the all-excluded warning, not the generic one.
- `remove` behavior and its existing tests are unchanged; touched `src/` files end at or below 100 lines.

## Verification

- Unit: `planHarnessRemovals` through the existing `remove` suites; finding text variants.
- Integration: `runInProcessCli` on temporary directories with an installed OpenCode (and a second harness) via a prior `init`; byte checks on the untouched harness; conflict scenario by corrupting the harness file.
- End-to-end: not applicable here (TC-17 in QA).
- Manual: none.
- Platforms: Linux, macOS, Windows.
- Commands: `npm test -- tests/integration/init-exclusion.test.ts tests/integration/init-exclusion-edges.test.ts tests/integration/remove-invalid-config.test.ts tests/integration/init-remove-footprint.test.ts tests/integration/init-idempotency.test.ts`, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: tests citing `FR-05`, `TC-11`, `TC-15`; existing remove/idempotency tests green; lint, typecheck, coverage green.

## Affected files

- Modify: `src/core/services/removal-service.ts`, `src/core/services/installation-service.ts`, `src/core/services/installation-adapters.ts`, `src/core/services/installation-builder.ts`, `tests/integration/init-exclusion.test.ts`, `tests/integration/init-exclusion-edges.test.ts`
- Create: `src/core/services/harness-removal.ts`, `src/core/services/no-harness-finding.ts`

## Observability and recovery

- Operational signal: the planned deletions in the preview; `INVALID_HARNESS_CONFIG` and the all-excluded warning in findings.
- Recovery: `init --harness <id>` reinstalls the harness.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: excluding a harness that was installed (in `activeHarnesses` or the manifest) adds its removal to the `init` plan through `planHarnessRemovals`, the loop extracted from `removal-service.ts` and shared with `remove`. The dry run lists the deletions (hook asset, harness config update, config update); `--yes` deletes them, drops the harness from the manifest, and leaves other harnesses byte-identical; later runs plan nothing for it; a plain `init` plans no deletion. A removal conflict (unparseable harness file, or a runtime asset the user modified) keeps the harness in `activeHarnesses` for a retry and is reported; after the file is fixed the next `init` removes it. When every detected harness is excluded and nothing changes, `init` warns `All detected harnesses are excluded by configuration.` (exit 1).
- Changed files: created `src/core/services/harness-removal.ts` (explicit adapter list; optional `protection` for modified assets, used by `init` only), `src/core/services/no-harness-finding.ts` (`init` side), `tests/integration/init-exclusion-removal.test.ts`, `tests/integration/init-exclusion-conflicts.test.ts`; modified `src/core/services/removal-service.ts` (80 → 63 lines; keeps the all-adapters fallback), `src/core/services/installation-service.ts` (82 lines; `planExcludedRemovals`, removals merged into changes/conflicts/findings/harnesses), `src/core/services/installation-builder.ts` (`retained` input).
- Checks: `npm run lint`, `npm run typecheck` clean; `npm run coverage`: 232 files, 1238 tests passed, 98 s, 94.25%; existing `remove`, `init-remove-footprint`, `init-idempotency`, `remove-invalid-config` suites unchanged and green; quality sweep over the five touched `src/` files returned no hit and no file above 100 lines.
- Validated state: HEAD `c845728` plus the uncommitted working tree of T01..T06; Windows 11, Node 24.19.
- Open items: (1) Pre-existing quirk found while probing, not changed: `remove` reports `MODIFIED_OWNED_ASSET` ("will not be removed") for a user-modified runtime asset yet the adapter's own delete still removes the file. The new exclusion path protects modified assets (`file-changes.md`); `remove` keeps its old behavior to stay out of scope. Suggest a separate fix. (2) `doctor` and the text lines for excluded harnesses are T07; the `no-harness-finding.ts` helper is ready for `doctor-service.ts`.

### ADR candidates

None - direct TechSpec implementation or local decision.
