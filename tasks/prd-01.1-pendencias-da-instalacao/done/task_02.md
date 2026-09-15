# Stable execution context

Load in this exact order:

1. `tasks/prd-01.1-pendencias-da-instalacao/prd.md`
2. `tasks/prd-01.1-pendencias-da-instalacao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Manifest records the real package version

## Outcome

`context-brake init` and `remove` read this package's own `package.json` version and record it in `.context-brake/manifest.json` as `packageVersion`, replacing the hardcoded `'1.0.0'` fallback.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T03
- In scope: a new package-metadata reader; wiring it into `installation-builder.ts`'s `planManifestChange` and the `init`/`remove` commands.
- Out of scope: any consumer of `packageVersion` beyond recording it (asset-currency comparison is T03).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-07 | `prd.md#functional-requirements` | Manifest registers the real installing package version |
| DEC-02 | `techspec.md#technical-decisions` | `package-metadata.ts`, required `pkgVer` in `planManifestChange` |
| CMP-02 | `techspec.md#components-and-flow` | Package version reader and wiring |
| TC-02 | `techspec.md#test-approach` | Dist/source resolution, missing file, non-semver, built E2E |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/node.md` (paths and platforms; no `.env`), `.agents/rules/javascript-typescript.md` (dedicated error classes, Zod validation of external data).
- Existing code: `src/core/services/installation-builder.ts:47` (`planManifestChange`, `pkgVer ?? '1.0.0'` fallback); a comparable dist/source path-resolution pattern already exists for `loadRuntimeAsset` (see its caller in any `src/infrastructure/harnesses/*/planner.ts`) — reuse the same candidate-path strategy, do not duplicate a different one; `src/cli/commands/init.ts` (`runInit`) and `src/cli/commands/remove.ts` — neither currently reads or passes a package version.
- Contract or integration: `techspec.md#technical-decisions` DEC-02 for the exact candidate-path strategy (four levels up from dist, three from source) and the `PackageMetadataError` mapping to `UNEXPECTED_ERROR`.
- Harness reference: not applicable.

## Work

- [x] T02.1 Create `src/infrastructure/storage/package-metadata.ts` exporting `readPackageVersion(): Promise<string>`, resolving `package.json` from the dist layout then the source layout, parsing `{ name: 'context-brake', version }` with Zod, and validating `version` with `semver.valid`.
- [x] T02.2 Define `PackageMetadataError extends Error` in the same file, thrown when no candidate resolves, `name` does not match, or `version` is not valid semver.
- [x] T02.3 Remove the `pkgVer ?? '1.0.0'` fallback in `installation-builder.ts`'s `planManifestChange`; require `input.pkgVer`.
- [x] T02.4 Call `readPackageVersion()` once in `init.ts`'s `runInit` and pass the result into `planInstallation`'s `packageVersion` input; do the same in `remove.ts` wherever the manifest is rewritten (clause for `remove.ts` not applicable: removal flow only deletes manifest outright, see Handoff open items).
- [x] T02.5 Map a thrown `PackageMetadataError` to the existing `UNEXPECTED_ERROR` CLI error envelope in both commands.

## Acceptance criteria

- A fresh `init --yes` against the built CLI writes a manifest whose `packageVersion` equals the value in the repository's `package.json`.
- `readPackageVersion()` resolves correctly from both the dist layout (`dist/src/infrastructure/storage/`) and the source layout (`src/infrastructure/storage/`).
- A missing or invalid `package.json`, or a non-semver `version` field, throws `PackageMetadataError` and surfaces as `UNEXPECTED_ERROR`, never a partial or silently wrong manifest.

## Verification

- Unit: `readPackageVersion` against fixture directories for dist layout, source layout, missing file, and non-semver version; each error path returns `PackageMetadataError`.
- Integration: not applicable beyond the unit fixtures (no filesystem port beyond `node:fs/promises`, already covered by unit fixtures).
- End-to-end: built `context-brake init --yes` in a fixture repository; assert the written `.context-brake/manifest.json`'s `packageVersion` equals `package.json`'s `version`.
- Manual: none.
- Platforms: Linux, macOS, Windows (path resolution across separators).
- Commands: `npm run build`, `npm run typecheck`, `npm test -- package-metadata e2e-01-02`
- Environment dependency: none.
- Expected evidence: `tests/unit/package-metadata.test.ts` and the relevant case in `tests/e2e/e2e-01-02.test.ts` pass.

## Affected files

- Modify: `src/core/services/installation-builder.ts`, `src/cli/commands/init.ts`, `src/cli/commands/remove.ts`
- Create: `src/infrastructure/storage/package-metadata.ts`, `tests/unit/package-metadata.test.ts`

## Observability and recovery

- Operational signal: none new; a `PackageMetadataError` surfaces as the existing `UNEXPECTED_ERROR` stderr message.
- Recovery: revert the new file and its callers with git; no manifest migration needed (the field type is unchanged, only its value).

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `init` now records the running package's real `package.json` version in the manifest instead of the hardcoded `'1.0.0'` fallback, via a new `readPackageVersion()` reader with dist/source candidate resolution and Zod+semver validation.
- Changed files: `src/infrastructure/storage/package-metadata.ts` (new), `src/core/services/installation-builder.ts` (`pkgVer` now required, no fallback), `src/core/services/installation-service.ts` (`packageVersion` now required in `InstallationInput`), `src/cli/commands/init.ts` (calls `readPackageVersion()` and passes it through), `tests/unit/package-metadata.test.ts` (new), `tests/e2e/e2e-01-02.test.ts` (new assertion).
- Checks: `npm run build` pass; `npm run typecheck` pass; `npm run lint` pass (0 issues); `npx vitest run package-metadata e2e-01-02` — 2 files, 8 tests pass; full suite `npx vitest run` — 86 files, 359 tests pass (no regression).
- Validated state: code and E2E evidence; `readPackageVersionFrom(baseDir)` unit-tested against fixture temp directories for dist layout (4 levels up), source layout (3 levels up), missing file, non-semver version, and name mismatch — all throw or resolve as specified. Platform: path resolution uses `node:path`, no separator assumptions.
- Open items: `remove.ts` was left unmodified — the removal flow only ever deletes the manifest outright (`removal-service.ts`'s `planCoreDeletions`); there is no code path today where `remove` rewrites the manifest with a new `packageVersion`, so T02.4's "do the same in remove.ts" has no applicable site yet. If a future task adds a partial-removal manifest rewrite, it must call `readPackageVersion()` the same way `init.ts` does.

### ADR candidates

None - direct TechSpec implementation (DEC-02).
