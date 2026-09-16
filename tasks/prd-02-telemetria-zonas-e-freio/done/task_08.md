# Stable execution context

Load in this exact order:

1. `tasks/prd-02-telemetria-zonas-e-freio/prd.md`
2. `tasks/prd-02-telemetria-zonas-e-freio/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T08 — Assets, bundle guard, overhead, documentation, and package

## Outcome

Every runtime asset is a thin entry over `src/`, `assets/runtime/process-hook.ts` is gone, and a bundle guard fails if any asset pulls classic Zod, `jsonc-parser`, `semver`, `node:child_process`, or CLI code. Automated measurements show the p95 targets on the real paths (≤ 100 ms per process call, ≤ 15 ms per in-process call). `docs/telemetry-block.md` publishes the versioned contract, the README documents the brake, its limits, the allowlist, the upgrade step, and the per-harness guarantees, and the document ships inside the npm package.

## Dependencies and boundaries

- Depends on: T07
- Unblocks: T09
- In scope: `assets/runtime/*.ts`, `scripts/asset-bundler.ts`, `docs/telemetry-block.md` (new), `README.md`, `docs/research/harness-integrations.md` (header only), `package.json` (`files` and, if needed, nothing else), `tests/unit/{runtime-bundle-imports,asset-bundler,runtime-assets}.test.ts`, `tests/integration/{runtime-overhead,package-contents}.test.ts`.
- Out of scope: protocol text (T02) and the harness research sections (owned by T06 and T07).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| CA-20, overhead objective | `prd.md#critérios-de-aceitação` | p95 per call on both execution models |
| RF15, RF18 | `prd.md#principais-funcionalidades` | Versioned documented block; documented allowlist |
| CA-13 | `prd.md#critérios-de-aceitação` | Budget statement and its measurement |
| DEC-01, DEC-02, DEC-06, DEC-11, DEC-17 | `techspec.md#technical-decisions` | Thin assets, mini-only bundles, block documentation, logs, real-path measurement |
| CMP-24, CMP-25, CMP-17 (consumed), CMP-22 (consumed) | `techspec.md#components-and-flow` | Bundler, docs, package files |
| TC-22, TC-24, TC-31 (README example) | `techspec.md#test-approach` | Overhead, bundle guard, schema and README currency |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/node.md` (heavy dependencies off hook paths), `.agents/rules/code-standards.md` (limits), `.agents/rules/tests.md` (perf suites are integration-level), `.agents/rules/cli-output.md` (English, textual labels), `.agents/rules/file-changes.md` (only owned blocks).
- Existing code: `scripts/asset-bundler.ts:21-40` (nine entries, no metafile); `assets/runtime/process-hook.ts` (deleted here); `src/infrastructure/diagnostics/overhead-measurer.ts:66-80` (unchanged); `tests/unit/asset-bundler.test.ts:9` (nine entries); `tests/unit/runtime-assets.test.ts:12-16` (`runProcessHook` assertion); `tests/integration/package-contents.test.ts:11-26` (`REQUIRED_FILES`); `tests/unit/readme-config-example.test.ts`; `tests/fixtures/benchmark/*.mjs`.
- Contract or integration: `techspec.md#test-approach` TC-22 and TC-24; `techspec.md#technical-decisions` `DEC-02`; `techspec.md#contracts-and-data` for the block, block message, notice, ledger, and log formats the document states; `techspec.md#observability-and-rollout` for the upgrade note.
- Harness reference: `docs/research/harness-integrations.md` header note.

## Work

- [x] T08.1 Confirm every `assets/runtime/*.ts` is a thin entry naming `runProcessHook` or a harness factory, and delete `assets/runtime/process-hook.ts` after no asset imports it.
- [x] T08.2 Expose the esbuild metafile from `bundleAsset` (return `{ text, metafile }`) without breaking `buildRuntimeAssets`, `findStaleAssets`, and `verifyAssets`; rerun `npm run assets:build`.
- [x] T08.3 Create `tests/unit/runtime-bundle-imports.test.ts` asserting no bundle input resolves to classic `zod`, `jsonc-parser`, `semver`, `node:child_process`, or `src/cli/`.
- [x] T08.4 Create `tests/integration/runtime-overhead.test.ts`: process assets on the built post-tool path and the `CRITICAL` pre-tool path with allowlist evaluation in a seeded temporary repository, and in-process `tool_call` handlers with the documented context.
- [x] T08.5 Create `docs/telemetry-block.md`: field order, versioning rule, one example per zone, the block message with the allowlist summary and its failure variant, the reset notice text, and the ledger and log locations with their metadata-only rule.
- [x] T08.6 Update the README (brake behavior, default zones and limits, how to change them, the allowlist and its configuration, the upgrade step with `PROTOCOL_FILE_MISMATCH`, and Antigravity's `allow` replacing the normal permission flow), add `docs/telemetry-block.md` to `package.json` `files` and `REQUIRED_FILES`, and add the 2026-09-15 re-check note to the research header.
- [x] T08.7 Adjust `tests/unit/asset-bundler.test.ts` and `tests/unit/runtime-assets.test.ts` only as the thin entries require, keeping the nine-entry count and the `runProcessHook` assertion valid.

## Acceptance criteria

- `npm run build` produces all nine assets; no asset contains logic beyond a named call and its descriptor.
- The bundle guard fails when a fixture bundle imports classic Zod, `jsonc-parser`, `semver`, `node:child_process`, or `src/cli/`, and passes on the real assets.
- Process p95 ≤ 100 ms and in-process p95 ≤ 15 ms in the measurement suite on the CI platforms; doctor's measurement keeps its informational status and exit-code neutrality.
- The document matches the implemented block and message in field names and order, states the versioning rule, and is listed by `npm pack --dry-run`.
- The README example still validates against the published schema, the support table matches the adapter profiles, and no file ContextBrake does not own is changed.

## Verification

- Unit: `tests/unit/runtime-bundle-imports.test.ts`, `tests/unit/asset-bundler.test.ts`, `tests/unit/runtime-assets.test.ts`, `tests/unit/readme-config-example.test.ts`, `tests/unit/readme-support-table.test.ts`.
- Integration: `tests/integration/runtime-overhead.test.ts` (registered in `PROCESS_LANE_FILES`), `tests/integration/doctor-benchmark.test.ts` (unchanged expectations), `tests/integration/package-contents.test.ts`.
- End-to-end: not applicable.
- Manual: read `docs/telemetry-block.md` against the TechSpec contracts once before closing.
- Platforms: Linux, macOS, Windows; the p95 targets apply on every platform.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npx vitest run runtime-bundle-imports asset-bundler runtime-assets readme-config-example readme-support-table runtime-overhead doctor-benchmark package-contents`, `npm run assets:check`, `npm run schemas:check`, `npm run package:smoke`, `npm run coverage`
- Environment dependency: none; measurements run on unloaded CI runners.
- Expected evidence: a green measurement log with the p95 per harness, the guard suite passing, and the packaged document.

## Affected files

- Delete: `assets/runtime/process-hook.ts`
- Modify: `assets/runtime/*.ts` (thin entries only), `scripts/asset-bundler.ts`, `README.md`, `package.json`, `docs/research/harness-integrations.md` (header only), `tests/unit/{asset-bundler,runtime-assets}.test.ts`, `tests/integration/package-contents.test.ts`, `tests/test-lanes.ts`
- Create: `tests/unit/runtime-bundle-imports.test.ts`, `tests/integration/runtime-overhead.test.ts`, `docs/telemetry-block.md`

## Observability and recovery

- Operational signal: `doctor` continues to print the measured p95 with pass, fail, or unavailable, without changing the exit code; the published document is the contract users and agents read when the block text is questioned.
- Recovery: rebuilding the package restores every asset; the deleted module is only referenced by this package's own bundles; reverting the documentation commit changes no runtime behavior.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: T08 implemented. Runtime assets are thin delegates; `scripts/asset-bundler.ts` returns `{ text, metafile }` from `bundleAsset`; `configuration-validator.ts` migrated to `zod/mini`, eliminating classic Zod from bundles; `tests/unit/runtime-bundle-imports.test.ts` guards all bundles against classic `zod`, `jsonc-parser`, `semver`, `node:child_process`, and `src/cli/`; `tests/integration/runtime-overhead.test.ts` measures post-tool, critical pre-tool with allowlist, and in-process `tool_call` overhead; `docs/telemetry-block.md` defines the v1 block, message, notice, and storage specification; `README.md` documents the brake, limits, allowlist, `PROTOCOL_FILE_MISMATCH` upgrade behavior, and Antigravity auto-approval; `package.json` (`files`) and `tests/integration/package-contents.test.ts` (`REQUIRED_FILES`) package `docs/telemetry-block.md`; `tests/test-lanes.ts` registers the overhead integration suite.
- Changed files: `scripts/asset-bundler.ts`, `src/core/validation/configuration-validator.ts`, `README.md`, `package.json`, `tests/test-lanes.ts`, `tests/integration/package-contents.test.ts`, `docs/telemetry-block.md`, `tests/unit/runtime-bundle-imports.test.ts`, `tests/integration/runtime-overhead.test.ts`, `tasks/prd-02-telemetria-zonas-e-freio/task_08.md`.
- Checks: `npm run build`, `npm run typecheck`, `npm run lint`, `npm run schemas:check`, `npm run dependencies:check`, `npm run assets:check`, `npm run package:smoke`, `npx vitest run runtime-bundle-imports asset-bundler runtime-assets readme-config-example readme-support-table runtime-overhead doctor-benchmark package-contents` (all 40 tests passed), `npm test` (all 143 test files, 694 tests passed), and `npm run coverage` (all 143 test files passed, coverage thresholds >= 80% met).
- Validated state: master branch at ce3c4c5 + local diff; Windows 11, Node.js 24.19.0.
- Open items: none for T08; T09 (simulator, end-to-end brake flow, long-task efficacy) is next.

### ADR candidates

None - direct TechSpec implementation or local decision.
