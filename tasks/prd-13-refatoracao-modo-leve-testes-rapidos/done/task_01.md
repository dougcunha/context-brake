# Stable execution context

Load in this exact order:

1. `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/prd.md`
2. `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Move benchmarks to their own script

## Outcome

`runtime-overhead`, `statusline-overhead`, `statusline-previous-overhead`, `doctor-benchmark`, `overhead-measurer`, and `e2e-09` live in `tests/bench/`. They run only under `npm run test:bench`, with their original limits. `release:check` runs `test:bench` after `coverage`. `npm test` lists none of them.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T06
- In scope: `vitest.bench.config.ts`; the moved suites and their helper paths; the default config excludes `tests/bench/**`; the lane lists without the moved files; `test:bench` and the `release:check` order of `techspec.md#contracts-and-data`, without `test:budget` (T06); lane test updates (TC-03).
- Out of scope: changing any limit the benchmarks assert; worker counts (T07).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01, FR-03, OBJ-03 | `prd.md#functional-requirements` | No benchmark in `npm test`; separate script in `release:check` |
| DEC-01, DEC-09 | `techspec.md#technical-decisions` | Bench split; coverage without new exclusions |
| CMP-01, CMP-02, CMP-03, CMP-09 | `techspec.md#components-and-flow` | Configs, lanes, scripts |
| TC-03, TC-04 | `techspec.md#test-approach` | File lists; bench run |

## Context to recover on demand

- Applicable skills and rules: `tests.md`, `code-standards.md`, `javascript-typescript.md`, `node.md`; quality profile QA-01 to QA-07 and the Terrain baseline in `techspec.md#quality-profile`
- Existing code: `vitest.config.ts:lanes`; `tests/test-lanes.ts:SERIAL_LANE_FILES`; `tests/unit/test-lanes.test.ts:43-71`; `package.json` scripts.

## Work

- [x] T01.1 Move the six suites to `tests/bench/` and add `vitest.bench.config.ts` (single fork, global timeout).
- [x] T01.2 Exclude `tests/bench/**` from the default config, drop the moved files from the lane lists, and assert both file lists in `test-lanes.test.ts`.
- [x] T01.3 Add `test:bench` and run it in `release:check` after `coverage`.

## Acceptance criteria

- `npx vitest list` on the default config shows no `tests/bench/` file; on the bench config it shows exactly the six suites.
- `npm run test:bench` passes with the original limits.
- `npm run coverage` still meets the four thresholds, with no `src` file added to the exclusions.

## Verification

- Unit: `tests/unit/test-lanes.test.ts` (TC-03).
- Integration: `npm run test:bench` (TC-04).
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows (local).
- Commands: `npm run build`, `npm run test:bench`, `npx vitest run tests/unit/test-lanes.test.ts`, `npm run lint`, `npm run typecheck`, and one `npm run coverage` for the thresholds.
- Environment dependency: none.
- Expected evidence: both file lists, the bench result, and the coverage totals.

## Affected files

- Modify: `vitest.config.ts`, `tests/test-lanes.ts`, `tests/unit/test-lanes.test.ts`, `package.json`
- Create: `vitest.bench.config.ts`, `tests/bench/` (moved files)

## Observability and recovery

- Operational signal: none beyond the test output.
- Recovery: move the files back and revert the configs.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result (FR-01, FR-03, DEC-01, DEC-09):
  - Six suites moved with `git mv` to `tests/bench/`: `runtime-overhead`, `statusline-overhead`, `statusline-previous-overhead`, `doctor-benchmark`, `overhead-measurer`, and `e2e-09`. Their assertions and limits are unchanged. Only `e2e-09` needed an import fix (`../e2e/cli-runner.js`).
  - `vitest.bench.config.ts` exports `BENCH_DIRECTORY`, `BENCH_FILE_PATTERN`, and `benchConfig()`, and runs one fork with a 30 s timeout. The default config excludes `BENCH_FILE_PATTERN` from the parallel lane, and the lane lists no longer name the moved files. The serial lane keeps only `node-process-runner`.
  - `package.json` gains `test:bench`. `release:check` runs it after `coverage`.
  - The `test-lanes` marker test skips `tests/bench/`, whose suites start processes on purpose. The new `tests/unit/bench-config.test.ts` (TC-03) asserts the bench folder content, the bench config, and that no default lane lists a bench file.
- Changed files: moved `tests/{integration,unit,e2e}/…` → `tests/bench/` (6 files); created `vitest.bench.config.ts`, `tests/unit/bench-config.test.ts`; modified `vitest.config.ts`, `tests/test-lanes.ts`, `tests/unit/test-lanes.test.ts`, `package.json`.
- Checks (Windows 11, Git Bash):
  - `npm run build` passes.
  - `npx vitest list` on the default config shows no `tests/bench` file. On the bench config it shows exactly the six suites.
  - `test-lanes` and `bench-config`: 2 files, 9 tests pass.
  - `npm run test:bench`: 6 files, 16 tests pass in 83 s wall (TC-04).
  - `rtk proxy npx eslint .` and `npm run typecheck` are clean.
  - `npm run coverage`: 192 files, 1,039 tests pass in 251 s wall, down from about 354 s. Coverage is 94.04% statements, 89.15% branches, 95.2% functions, and 94.04% lines. `exclude` is still `[]` (DEC-09).
  - Quality profile over the touched files: no blocking hit. All files are under 100 lines.
- Validated state: base `cca3a29` plus T01; no source (`src/`) change.
- Open items: none.

### ADR candidates

None - direct TechSpec implementation or local decision.
