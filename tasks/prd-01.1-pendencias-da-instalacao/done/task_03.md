# Stable execution context

Load in this exact order:

1. `tasks/prd-01.1-pendencias-da-instalacao/prd.md`
2. `tasks/prd-01.1-pendencias-da-instalacao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — Doctor and init classify managed assets as current, outdated, or modified

## Outcome

`doctor` reports `ASSET_OUTDATED` when a managed runtime asset matches the manifest but not the running package, and `ASSET_MODIFIED` when it diverges from the manifest; `init` refuses to overwrite a modified asset, reporting the existing `MODIFIED_OWNED_ASSET` conflict instead.

## Dependencies and boundaries

- Depends on: T02 (needs `packageVersion` wired into the manifest to give `ASSET_OUTDATED` a meaningful comparison)
- Unblocks: —
- In scope: a new pure classifier; wiring it into `doctor-service.ts` (read-only) and `installation-service.ts` (write-protection).
- Out of scope: any new adapter port — reuse the existing `planInstall(ctx)` to get expected asset content; removal's existing `MODIFIED_OWNED_ASSET` check in `removal-helper.ts` (already correct, untouched).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-08 | `prd.md#functional-requirements` | Compare each managed asset with the manifest and the running package |
| OBJ-04, US-03 | `prd.md#outcomes-and-metrics`, `prd.md#stories-and-journeys` | Visible asset upgrade; `doctor init --yes` remediation |
| DEC-03 | `techspec.md#technical-decisions` | `classifyAssetCurrency`; doctor and init wiring |
| CMP-03 | `techspec.md#components-and-flow` | New `asset-currency.ts`; `doctor-service.ts`, `installation-service.ts` |
| TC-03, TC-04 | `techspec.md#test-approach` | Classifier unit table; doctor/init integration and E2E |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/file-changes.md` ("touch only what ContextBrake owns"; refuse to overwrite what it cannot safely reconcile), `.agents/rules/code-standards.md` (pure function, guard clauses).
- Existing code: `src/core/services/removal-helper.ts:55` (`MODIFIED_OWNED_ASSET` conflict, the code this task reuses on the `init` side); `src/core/services/change-plan-service.ts` (`createChangePlan`, `hashString`) — the classifier runs on hashes already computed by this pipeline; `src/core/services/doctor-service.ts` (`diagnoseHarness`) — the natural place to add asset findings per harness; `src/core/services/installation-service.ts` (`planAdapters`) — the natural place to filter a modified `runtime_asset` change before `createChangePlan` runs.
- Contract or integration: `techspec.md#technical-decisions` DEC-03 for the exact classification order (`expected` first, then `manifest`, else `modified`); `techspec.md#contracts-and-data` for the two new finding codes' exact message templates.
- Harness reference: not applicable — this logic is harness-agnostic; it reuses each adapter's own `planInstall`.

## Work

- [x] T03.1 Create `src/core/services/asset-currency.ts` exporting `classifyAssetCurrency(installedSha, manifestSha, expectedSha): 'current' | 'outdated' | 'modified'` per the order in DEC-03.
- [x] T03.2 In `doctor-service.ts`, for each installed harness with a manifest, call `adapter.planInstall(ctx)`, hash each returned `runtime_asset` change's content as `expectedSha`, read the installed file's hash from the existing snapshot/disk read path, look up `manifestSha` from `InstallationManifest.assets`, and classify; skip the harness entirely if its `planInstall` returned any conflict.
- [x] T03.3 Emit `ASSET_OUTDATED` (warning) for `outdated` and `ASSET_MODIFIED` (warning) for `modified`, using the message templates in `techspec.md#contracts-and-data`; emit nothing for `current` or when no manifest exists.
- [x] T03.4 In `installation-service.ts`'s adapter-planning step, for every planned `runtime_asset` `FileChange`, look up the matching `FileSnapshot` (installed hash) and `previousManifest` entry (manifest hash), hash the planned content (expected hash), and classify; on `modified`, drop that change from the plan and add a `MODIFIED_OWNED_ASSET` conflict for its path instead.
- [x] T03.5 Add unit tests for `classifyAssetCurrency` covering all three outcomes plus the "no manifest" (skip) case.
- [x] T03.6 Add an integration test for `doctor` with a current, an outdated, and a modified fixture asset, and an integration or E2E test for `init --yes` leaving a modified asset's bytes untouched while rewriting an outdated one.

## Acceptance criteria

- `classifyAssetCurrency` returns `current` whenever `installedSha === expectedSha`, regardless of `manifestSha`.
- `doctor` reports `ASSET_OUTDATED` only when installed matches the manifest but not the running package's expected content, and `ASSET_MODIFIED` only when installed diverges from the manifest; neither appears when no manifest exists.
- `init --yes` rewrites an outdated asset to the current package content and reports `MODIFIED_OWNED_ASSET` — never writing — for a modified one, leaving its bytes byte-for-byte unchanged.
- A harness whose `planInstall` returns a conflict produces no asset finding for that harness (a broken vendor file, not an asset problem).

## Verification

- Unit: `classifyAssetCurrency` truth table (`current`/`outdated`/`modified`, plus the "expected wins even with a stale manifest" case).
- Integration: `doctor` against a temporary fixture repository with three manifest entries (current, outdated, modified bytes) and the matching installed files; assert exactly the three expected findings.
- End-to-end: built `init --yes` over a fixture with one outdated and one modified runtime asset; assert the outdated file's bytes match the package and the modified file's bytes are unchanged, with `MODIFIED_OWNED_ASSET` in the JSON report.
- Manual: none.
- Platforms: Linux, macOS, Windows (file reads and hash comparison; no platform-specific behavior expected, verified in CI matrix).
- Commands: `npm run build`, `npm test -- asset-currency doctor-asset-currency e2e-asset-currency`, `npm run coverage`
- Environment dependency: none.
- Expected evidence: `tests/unit/asset-currency.test.ts`, `tests/integration/doctor-asset-currency.test.ts`, `tests/e2e/e2e-asset-currency.test.ts` pass.

## Affected files

- Modify: `src/core/services/doctor-service.ts`, `src/core/services/installation-service.ts`
- Create: `src/core/services/asset-currency.ts`, `tests/unit/asset-currency.test.ts`, `tests/integration/doctor-asset-currency.test.ts`, `tests/e2e/e2e-asset-currency.test.ts`

## Observability and recovery

- Operational signal: `ASSET_OUTDATED` and `ASSET_MODIFIED` findings in `doctor --json`/text; `MODIFIED_OWNED_ASSET` conflicts in `init`'s plan/report.
- Recovery: no destructive action is ever taken by this task — it only adds findings and a write refusal. Reverting the change restores the prior silent-overwrite behavior.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `doctor` now reports `ASSET_OUTDATED` (warning) when an installed runtime asset matches the manifest but not the running package, and `ASSET_MODIFIED` (warning) when it diverges from the manifest; a harness whose `planInstall` returns a conflict is skipped entirely for this check. `init` refuses to overwrite a modified asset, reporting the existing `MODIFIED_OWNED_ASSET` conflict instead and preserving that asset's manifest entry unchanged (so future `doctor` runs keep reporting it correctly), while still rewriting a merely outdated one.
- Changed files: `src/core/services/asset-currency.ts` (new — `classifyAssetCurrency`, `assetCurrencyFindings` for doctor, `protectModifiedAssets` for init), `src/core/services/doctor-service.ts` (wires `assetCurrencyFindings`; `DoctorInput` gains `manifest`, `allSnapshots`, `packageVersion`), `src/core/services/installation-service.ts` (wires `protectModifiedAssets`; preserves the previous manifest's asset entry for a protected path instead of the newly computed one), `src/cli/commands/doctor.ts` (loads and passes `manifest`, `allSnapshots`, `packageVersion` via `readPackageVersion()`), `tests/unit/asset-currency.test.ts` (new), `tests/integration/doctor-asset-currency.test.ts` (new), `tests/e2e/e2e-asset-currency.test.ts` (new), `tests/unit/doctor-service.test.ts` and `tests/integration/doctor-benchmark.test.ts` (updated call sites for the new required `DoctorInput` fields), `tests/test-lanes.ts` (registered the new process-lane integration test).
- Checks: `npm run build`, `npm run typecheck`, `npm run lint` (0 issues) all pass; `npx vitest run asset-currency doctor-asset-currency e2e-asset-currency` — 3 files, 1+1+3 tests pass; full suite `npx vitest run` — 95 files, 387 tests pass (no regression).
- Validated state: integration test installs three real harnesses (claude-code, cursor, github-copilot-cli), leaves claude-code's asset untouched (current), rewrites cursor's hook to stale bytes with a manifest sha matching those stale bytes (outdated), and hand-edits copilot's hook without touching the manifest (modified) — `doctor` reports exactly one `ASSET_OUTDATED` and one `ASSET_MODIFIED`, none for claude-code. E2E test runs the built CLI's `init --yes` twice: after corrupting one asset to "outdated" and hand-editing another to "modified," the second run's JSON report carries `MODIFIED_OWNED_ASSET` for the modified path, that file's bytes are unchanged, and the outdated file's bytes were rewritten.
- Open items: while implementing this task I discovered that `tsconfig.check.json`'s inherited `exclude: ["tests", "scripts"]` from the base `tsconfig.json` silently disables typechecking for everything under `tests/` and `scripts/` despite `tsconfig.check.json`'s own `include` listing them — confirmed by injecting an obvious type error into a test file and observing zero `tsc` errors. This predates this task and is out of this task's scope, but it directly affects **T09** (which is responsible for `tsconfig.check.json`'s typecheck scope and the full-gate proof) — T09 should add `"exclude": []` to `tsconfig.check.json` and then fix any type errors that surface across the whole `tests/`/`scripts/` tree. I proactively fixed the two call sites this task touched (`tests/unit/doctor-service.test.ts`, `tests/integration/doctor-benchmark.test.ts`) to satisfy `DoctorInput`'s new required fields so they don't add to that fallout.

### ADR candidates

None - direct TechSpec implementation (DEC-03).
