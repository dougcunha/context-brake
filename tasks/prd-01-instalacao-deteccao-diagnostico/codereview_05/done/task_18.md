# Stable execution context

Load in this exact order:

1. `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_05/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T18 — Build runtime assets only when the build script runs, never on import

## Outcome

Importing the runtime asset entry list has no side effect. Test files running in parallel no longer rewrite `dist/assets/runtime/*` while other tests pack or copy those files. `npm run assets:check` fails when a built asset differs from a fresh build of its source, instead of silently rebuilding it.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T16
- In scope:
  - Separate the asset entry list and build function in `scripts/build-assets.ts` from the executable build call.
  - Make `scripts/check-assets.ts` compare without writing.
  - Update the import in `tests/integration/package-assets.test.ts` if the entry list moves, and the `assets:build` script in `package.json` only if its entry path changes.
  - Add regression coverage for side-effect-free import and stale-asset detection.
- Out of scope: runtime asset content and esbuild options; the lookup order of `loadRuntimeAsset` in `src/infrastructure/harnesses/common/runtime-assets.ts`; `scripts/generate-schemas.ts` and `schemas:check`; the IT-14 `sampleCount` failure (cause pending under `codereview_05/CR-03`); `.github/workflows/ci.yml`.

## Traceability

OBS-01 and OBS-02 are local observation IDs of this correction plan, not findings of `codereview_05`. They were found on 2026-09-14 while validating the initial commit `8401e7f` on WSL 2 (Ubuntu 26.04, Node 24.21.0). The next review must formalize them.

| Source | Section | Finding covered |
| --- | --- | --- |
| OBS-01 (local to this plan) | WSL sanity run on `8401e7f` | **Symptom:** the full Linux suite failed `tests/integration/package-contents.test.ts` with `npm error code EOF` while reading `dist/assets/runtime/process-hook.mjs`; the file passed 3/3 alone. **Cause:** `tests/integration/package-assets.test.ts:5` imports `scripts/build-assets.ts`, whose line 28 rebuilds every asset on import, rewriting each file in place (line 24), while `package-contents.test.ts:26` runs `npm pack --dry-run` in parallel. **Wider exposure:** `loadRuntimeAsset` reads the same files for every `init` in the suite (`runtime-assets.ts:10-13`). |
| OBS-02 (local to this plan) | WSL sanity run on `8401e7f` | `scripts/check-assets.ts:3` imports the same module, so the assets are rebuilt before they are compared. In a disposable clone, a marker was appended to `dist/assets/runtime/process-hook.mjs`; `npm run assets:check` then exited 0, the marker was gone, and the file hash was back to its original value. `npm run package:smoke` runs the same check. |
| codereview_05 | `Executed validations` | The row "`npm run assets:check` — passed — runtime asset currency" (and the equivalent row in `codereview_04`) is invalidated by OBS-02. |

## Requirements

- Importing the module that exports the asset entry list performs no build and no filesystem write.
- `npm run assets:build`, and therefore `npm run build`, still produces all five runtime assets with byte-identical content to the current build.
- `npm run assets:check`:
  - compares the existing built assets with an in-memory build and writes nothing;
  - on any stale or modified asset, exits non-zero with a message naming that file and the corrective command;
  - on unchanged assets, exits 0.
- `npm run package:smoke` no longer rewrites `dist/assets/runtime/*`.
- No test in `npm test` writes to `dist/assets/runtime/*`.
- Regression tests use temporary copies or injected paths and never modify the repository's `dist/`.
- Scripts and tests stay within 100 lines per file, 30 lines per function, and 3 parameters, with named constants and no comments.

## Context to recover on demand

- TechSpec: `Development Sequencing` item 1 (standalone asset build); `Technical Dependencies` (deterministic esbuild bundling).
- Rules and skills: `.agents/rules/tests.md` (FIRST: Independent, Repeatable), `.agents/rules/code-standards.md`, `.agents/rules/javascript-typescript.md`, `.agents/rules/node.md`, `AGENTS.md` (commands), `sdd-execute-corrections`.
- Code:
  - `scripts/build-assets.ts:4-28`: entry list, build function, top-level build call.
  - `scripts/check-assets.ts:1-24`: import and comparison.
  - `tests/integration/package-assets.test.ts:5`: importer that triggers the rebuild.
  - `tests/integration/package-contents.test.ts:26`: concurrent `npm pack`.
  - `src/infrastructure/harnesses/common/runtime-assets.ts:8-24`: runtime reads of `dist/assets/runtime`.
  - `package.json` scripts: `build`, `assets:build`, `assets:check`, `package:smoke`.

## Work

- [x] T18.1 Add failing regression coverage:
  - importing the asset entry list leaves hashes and modification times of the built assets unchanged;
  - the currency check rejects a modified asset in a temporary location without restoring it.
- [x] T18.2 Separate the entry list and build function from the executable entry point, so import is side-effect free and `npm run assets:build` keeps its output.
- [x] T18.3 Make the currency check side-effect free on import, write nothing, and keep `npm run assets:check` as its executable entry.
- [x] T18.4 In a disposable clone, repeat the OBS-02 marker reproduction: `npm run assets:check` must now fail naming the file, and the marker must remain.
- [x] T18.5 Run the full suite in WSL (Node 24, PATH without `/mnt` entries) and on Windows, then all repository gates.

## Acceptance criteria

- After importing the asset entry list, every `dist/assets/runtime/*` file keeps its SHA-256 hash and modification time.
- With a marker appended to a built asset, `npm run assets:check` exits non-zero, names the file, and leaves the marker in place.
- `npm run build` produces the five runtime assets with the same SHA-256 hashes as before the change.
- `npm run package:smoke` passes without modifying `dist/assets/runtime/*`.
- `npx vitest run --reporter=verbose` passes `package-contents.test.ts` in the full parallel run in WSL and on Windows.

## Verification

- Unit: side-effect-free import of the entry list; stale-asset rejection in a temporary location.
- Integration: `tests/integration/package-assets.test.ts` and `tests/integration/package-contents.test.ts` inside the full parallel suite.
- End-to-end: no E2E behavior changes; the full suite still runs every E2E scenario that copies runtime assets through the built CLI, per the CLI policy in `AGENTS.md`.
- Manual: OBS-02 marker reproduction in a disposable clone, expecting a failing check with the marker intact; owner: executor.
- Platforms: Windows (local) and Linux (WSL 2 Ubuntu, Node 24, PATH without `/mnt` entries); the full matrix is T16.
- Environment dependency: none beyond the existing WSL 2 Ubuntu with nvm-managed Node 20, 22, and 24.
- Commands: `npm run build`, `npm run assets:check`, `npm run package:smoke`, `npm run schemas:check`, `npm run dependencies:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`; in WSL, `npx vitest run --reporter=verbose`.
- Expected evidence: failing-then-passing regression tests, a failing check on the modified asset, identical asset hashes before and after the build, and green full-suite runs on both platforms.

## Affected files

- Modify: `scripts/build-assets.ts`, `scripts/check-assets.ts`, `tests/integration/package-assets.test.ts` (only if the import source changes), `package.json` (only if a script entry path changes)
- Create: a side-effect-free module for the asset entry list and a regression test file, if the chosen design needs them

## Observability and recovery

- Operational signal: `npm run assets:check` reports the stale asset path and the corrective `npm run build` command.
- Recovery: revert the script and test changes; `npm run build` regenerates the assets.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Implemented.
  - The new `scripts/asset-bundler.ts` has no import-time side effects. It exports `ASSET_ENTRIES`, `bundleAsset`, `buildRuntimeAssets(root, entries)`, `findStaleAssets(root, entries)`, and `verifyAssets(root)`, with the same esbuild options as before.
  - `scripts/build-assets.ts` and `scripts/check-assets.ts` are now executable entry points that only call `buildRuntimeAssets()` and `verifyAssets()`; the `package.json` scripts are unchanged.
  - `tests/integration/package-assets.test.ts` imports the entry list from the bundler.
  - The currency check compares the built assets with an in-memory bundle and writes nothing. A missing or modified asset fails with "Built runtime assets are stale: <paths>. Run npm run build.", listing every stale file.
- Changed files:
  - Modified: `scripts/build-assets.ts` (+1 −26), `scripts/check-assets.ts` (+1 −22), `tests/integration/package-assets.test.ts` (+1 −1).
  - Created: `scripts/asset-bundler.ts`, `tests/unit/asset-bundler.test.ts`.
  - `package.json`: unchanged.
- Checks:
  - Failing first. The new test file, pointed at the pre-change `scripts/build-assets.js` in the WSL clone of commit `8401e7f`, failed 3/3: the import changed the modification time of `context-brake-runtime.mjs`, `findStaleAssets is not a function`, and `verifyAssets is not a function`. The probe was removed, and the clone was clean before and after. The pre-change symptoms were also reproduced earlier on 2026-09-14: the Linux full suite failed `package-contents` with `npm error code EOF` (OBS-01), and `assets:check` exited 0 while silently restoring a marked asset (OBS-02).
  - After the change, `tests/unit/asset-bundler.test.ts` passed 3/3 on Windows and on WSL.
  - After `npm run build` on Windows, all five runtime assets have the same SHA-256 as the pre-change baseline: `context-brake-runtime.mjs` c49ff567…, `omp-extension.js` 22e9590a…, `opencode-plugin.js` e68d6497…, `pi-extension.js` ec947af6…, `process-hook.mjs` 596d8532…. `npm run assets:check` exits 0 on them.
  - Marker reproduction in the WSL scratch copy:
    - with a marker appended to `process-hook.mjs`, `npm run assets:check` exited 1 with "Built runtime assets are stale: dist/assets/runtime/process-hook.mjs. Run npm run build.", and the marker remained;
    - after `npm run build`, the marker was gone and the check exited 0.
  - Built asset modification times did not change across three full Windows suites, one full WSL suite, or `npm run package:smoke`.
  - `tests/integration/package-contents.test.ts` passed inside the full parallel suite on WSL (5,767 ms) and in all three Windows runs.
  - Gates:
    - Windows: lint, typecheck, `schemas:check`, `dependencies:check`, `package:smoke` (187 files), coverage 218/218 (91.34 / 82.82 / 96.15 / 91.34).
    - WSL: `npm ci --ignore-scripts`, build, lint, typecheck, full suite 218/218.
- Validated state: uncommitted worktree on top of commit `8401e7f` with T17–T22 applied. Windows 11, Node v24.19.0, npm 11.17.0. WSL 2 Ubuntu 26.04 (kernel `6.18.33.2-microsoft-standard-WSL2`), Node v24.21.0, PATH without `/mnt` entries.
- Open items:
  - OBS-01 and OBS-02 are not findings of any report yet. `codereview_04` and `codereview_05` still cite `npm run assets:check` passing as asset-currency evidence; that evidence is void for the pre-T18 state, and the next review should record it.
  - The IT-14 cause from `codereview_05/CR-03` is still pending; it did not recur in these runs.
