# Stable execution context

Load in this exact order:

1. `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_06/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T23 — Make the default `npm test` gate repeatable by isolating process-heavy test files

## Outcome

`npm test` and `npm run coverage` still run every test, split into two lanes:
- **Parallel lane:** in-memory and filesystem-only test files keep running in parallel.
- **Controlled lane:** every test file that starts child processes (the built CLI, shells, `npm`, version probes, the overhead benchmark, or in-process command dispatch that reaches them) runs there and no longer competes with other process-heavy files.

Consecutive default runs pass without raising timeouts. A regression test fails when a new process-heavy test file is left outside the controlled lane.

## Dependencies and boundaries

- Depends on: —
- Unblocks: re-review of `codereview_06/CR-01`
- In scope:
  - a lane definition in `vitest.config.ts`, using Vitest 3.2.7 `test.projects` or an equivalent serialization policy whose effect is proven by run output;
  - keeping `npm test` (`vitest run`) as the single gate command, with `npm run coverage` covering both lanes;
  - a deterministic unit regression for lane membership;
  - repeated default runs on Windows and in WSL 2.
- Out of scope:
  - raising the global `testTimeout` or any per-file timeout as the correction;
  - the CA-19 thresholds and T19's E2E-09 runner bound;
  - the sampling and 2 s per-sample timeout in `src/infrastructure/diagnostics/overhead-measurer.ts`, where a TechSpec timeout yields `unavailable`;
  - product code, `.github/workflows/ci.yml`, and child termination in `tests/e2e/cli-runner.ts` (record in the Handoff if unhandled spawn errors persist after the lane change);
  - `codereview_06` OI-01 to OI-03, and any rerun of the T16 platform matrix.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_06/CR-01 | `codereview.md#findings` | `vitest.config.ts:5` gives only a 30 s global timeout while process- and benchmark-heavy files run with default file parallelism. One exact `npm test` run failed 11 tests across eight files and emitted a spawn `ENOENT` after timeout cleanup. The same eight files passed 26/26 with `--no-file-parallelism`, and the next unchanged full run passed 218/218. |
| codereview_06/QA-04 | `codereview.md#quality-profile` | Blocking rule: the mandatory suite must be green and repeatable. |
| codereview_05/CR-03 | `codereview_06/codereview.md#previous-findings-re-review-only` | History: T19 fixed E2E-09's runner bound; the remaining suite-level contention, including IT-14 returning zero samples, is carried into codereview_06/CR-01. T19 and its handoff stay unchanged. |
| `.agents/rules/tests.md` | FIRST: Repeatable | Tests must not depend on the developer's machine or run timing. |

## Requirements

- Every test file that starts child processes, directly or indirectly, runs in the controlled lane.
  - The minimum set from current evidence is every `tests/e2e/**/*.test.ts` file, plus `tests/integration/doctor-benchmark.test.ts`, `doctor-manual-removal.test.ts`, `invalid-config.test.ts`, `linked-project-root.test.ts`, `node-process-runner.test.ts`, `package-assets.test.ts`, and `package-contents.test.ts`.
  - Confirm the set by tracing `runInit`, `runDoctor`, `dispatchCommand`, and detection version probes before finalizing it.
- Controlled-lane files do not run in parallel with each other, unless bounded concurrency is proven by the recorded runs to remove the contention. Parallel-lane files keep file parallelism.
- `npm test` remains `vitest run`. `npm run coverage` reports both lanes with the existing 80% thresholds unchanged.
- The global `testTimeout` stays 30,000 ms, and every CA-19 assertion and T19 timeout stays unchanged.
- A deterministic unit regression reads lane membership from the Vitest configuration and fails in either case:
  - a test file containing a process marker matches the parallel lane or no lane (markers: `node:child_process`, `cli-runner`, `shell-runner`, `NodeOverheadMeasurer`, `NodeProcessRunner`, CLI `commands/`, `composition-root`, or `npm pack`);
  - a lane pattern matches no test file.
- The same tests run as before, plus the new regression; none is skipped, excluded, or moved out of `tests/**/*.test.ts`.
- Configuration and tests follow the 100-line file, 30-line function, 3-parameter, named-constant, and no-comment rules.

## Context to recover on demand

- TechSpec: `Testing Approach` (Vitest unit, integration, and E2E suites; 80% thresholds; no machine dependence).
- Report: `codereview_06/codereview.md#executed-validations` — first exact run 11 failed / 207 passed with 661.99 s of test time in 111.24 s wall time; affected set 26/26 serialized in 51.13 s; second exact run 218/218 in 19.30 s.
- Rules and skills: `.agents/rules/tests.md`, `.agents/rules/code-standards.md`, `.agents/rules/javascript-typescript.md`, `.agents/rules/node.md`, `AGENTS.md` (commands and CLI end-to-end policy), `sdd-execute-corrections`.
- Code:
  - `vitest.config.ts:1-14`: single-lane configuration.
  - `package.json`: `test` and `coverage` scripts.
  - `tests/e2e/cli-runner.ts:10-20`: spawned CLI has no timeout or termination.
  - `tests/e2e/shell-runner.ts`: PowerShell, Git Bash, and POSIX shell launches.
  - `src/infrastructure/diagnostics/overhead-measurer.ts:23-44`: sequential process samples with a 2 s timeout.
  - `node_modules/vitest` 3.2.7 types: `projects`, `fileParallelism`, `maxWorkers`.

## Work

- [x] T23.1 Record a Windows baseline of three consecutive default `npm test` runs: wall time, passed/failed counts, failing files, and unhandled errors.
- [x] T23.2 Add the lane-membership regression and show it fails against the current single-lane configuration.
- [x] T23.3 Configure the controlled lane and prove from verbose output or timestamps that controlled-lane files no longer overlap.
- [x] T23.4 Run five consecutive default `npm test` runs and one `npm run coverage` on Windows, then three consecutive default `npm test` runs in WSL 2 (Node 24, PATH without `/mnt` entries, clean copy of the worktree). Record wall time, counts, and unhandled errors for each run.
- [x] T23.5 Run `npm run lint`, `npm run typecheck`, `npm run build`, `npm run schemas:check`, `npm run dependencies:check`, `npm run assets:check`, and `npm run package:smoke`.

## Acceptance criteria

- The lane-membership regression fails against the pre-change configuration and passes after the change.
- All five consecutive Windows runs and all three consecutive WSL 2 runs of `npm test` pass, with 0 skipped tests, no `Test timed out`, and no unhandled errors.
- `npm run coverage` passes every test and meets all four 80% thresholds.
- `testTimeout` is still 30,000 ms, the CA-19 assertions are unchanged, and the `package.json` `test` and `coverage` scripts are unchanged.
- The Handoff records default `npm test` wall time before and after the change.

## Verification

- Unit: the lane-membership regression, failing first and then passing.
- Integration: every integration file runs in its assigned lane within the repeated default runs.
- End-to-end: every E2E file runs the built CLI in the controlled lane within the repeated default runs, per the CLI policy in `AGENTS.md`; E2E-09 keeps its CA-19 assertions.
- Manual: inspect verbose output or timestamps to confirm controlled-lane files do not overlap; owner: executor.
- Platforms: Windows (local) and Linux (WSL 2 Ubuntu, Node 24), consistent with `DEC-01`.
- Environment dependency: WSL 2 Ubuntu with nvm-managed Node 24 exists. `codereview_06` recorded a WSL localhost relay timeout, so if WSL is unavailable, record the command and error and keep the Linux runs pending; do not accept on Windows evidence alone.
- Commands: `npm test` (repeated), `npm run coverage`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run schemas:check`, `npm run dependencies:check`, `npm run assets:check`, `npm run package:smoke`.
- Expected evidence:
  - baseline and post-change run tables with wall time and counts;
  - the failing-then-passing regression;
  - proof of non-overlap in the controlled lane;
  - green gates.

## Affected files

- Modify: `vitest.config.ts`
- Create: a lane-membership unit test under `tests/unit/`, plus a side-effect-free module for the lane patterns only if the configuration cannot be imported safely by the test

## Observability and recovery

- Operational signal: Vitest output names the lane for each file. A process-heavy file added outside the controlled lane fails the lane-membership regression.
- Recovery: revert `vitest.config.ts` and the regression test; product code and user files are unaffected.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Implemented.
  - `vitest.config.ts` defines two Vitest 3.2.7 projects that extend the root config:
    - `parallel` (group order 0): `tests/**/*.test.ts` minus the process lane;
    - `process` (group order 1, `poolOptions.forks.singleFork`): runs after the parallel lane, one file at a time in a single fork.
    - `testTimeout` stays 30,000 ms, the coverage configuration is unchanged, and the `package.json` scripts are unchanged.
  - `tests/test-lanes.ts` holds lane membership: the `tests/e2e/` directory; eight integration files (`doctor-benchmark`, `doctor-manual-removal`, `invalid-config`, `linked-project-root`, `node-process-runner`, `package-assets`, `package-contents`, `safe-removal`); and the process markers.
  - `tests/integration/safe-removal.test.ts` joined the lane beyond the planned minimum after tracing: it imports CLI commands, and in-process commands call `collectHarnessSources`, which calls `adapter.probeVersion` (`src/cli/detection-collector.ts:13-15`).
  - `tests/unit/test-lanes.test.ts` has four tests:
    - every test file with a process marker belongs to the process lane;
    - every lane entry matches an existing test file;
    - the process lane is a single fork ordered after the parallel lane;
    - the parallel lane excludes the process globs, the root has no `include`, and `testTimeout` is 30,000 ms.
  - Defect found in review and fixed before the verification runs: the first configuration kept a root-level `include`, which `extends: true` concatenated into both projects, so a filtered run executed the same tests in both lanes. The root `include` was removed, and the regression test now asserts its absence.
- Changed files:
  - Modified: `vitest.config.ts` (+27 −3).
  - Created: `tests/test-lanes.ts` (39 lines), `tests/unit/test-lanes.test.ts` (66 lines).
- Checks:
  - T23.1 baseline on Windows before the change (HEAD `3347b73`, Node v24.19.0), default `npm test` three times in a row:
    - run 1: 69 s, 2 failed / 216 passed (`e2e-09`, `e2e-linked-project-root`), 2 timeouts;
    - run 2: 67 s, the same two failures;
    - run 3: 67 s, 4 failed / 214 passed (also `package-contents`), 4 timeouts, 1 unhandled error.
  - T23.2 failing first: against the old single-lane config, the two wiring tests failed ("expected undefined to be true") and the two membership tests passed. After the change, 4/4 passed, run once, in the `parallel` lane.
  - Lane resolution (`npx vitest list --filesOnly --project <lane>`): `parallel` 46 files, `process` 18 files, 64 in total; none in both lanes, none in neither.
  - T23.3 non-overlap, from a full run with the JSON reporter (64 files, 222 tests passed, 38 s):
    - 0 overlaps among the 18 process-lane files;
    - the parallel lane ended 773 ms before the process lane started;
    - the process lane spanned 28.8 s and the parallel lane 5.1 s.
  - T23.4 Windows: five consecutive default `npm test` runs took 38, 37, 37, 35, and 34 s. Each passed 64 files and 222 tests, with 0 skipped, 0 timeouts, and 0 unhandled errors. `npm run coverage` passed 222/222 in 36 s: 91.34% statements, 82.79% branches, 96.15% functions, 91.34% lines.
  - T23.4 WSL 2:
    - clean copy of the worktree, with `vitest.config.ts` SHA-256 `bc5e6e0c…` and `tests/test-lanes.ts` SHA-256 `e3cbbb79…` (identical to Windows); Ubuntu 26.04, kernel `6.18.33.2-microsoft-standard-WSL2`, Node v24.21.0, PATH with 0 `/mnt` entries;
    - `npm ci --ignore-scripts` and build passed;
    - three consecutive default `npm test` runs took 22, 20, and 28 s, each 222/222 with 0 timeouts and 0 unhandled errors.
  - T23.5 on Windows: `npm run lint` and `npm run typecheck` passed after the final configuration edit; build, `schemas:check`, `dependencies:check`, `assets:check`, and `package:smoke` (187 files) passed.
  - Default `npm test` wall time on Windows: 67–69 s with failures before the change, 34–38 s green after it.
- Validated state: uncommitted worktree on top of commit `3347b73` with T23 and T24 applied. Windows 11, Node v24.19.0, npm 11.17.0. WSL 2 Ubuntu 26.04, Node v24.21.0, npm 11.19.0.
- Open items:
  - None blocking T23.
  - Child termination in `tests/e2e/cli-runner.ts` was not changed: no spawn `ENOENT` or unhandled error appeared in the 10 post-change full runs (7 on Windows, 3 on WSL).
  - The 2 s per-sample timeout in `overhead-measurer.ts` is unchanged, and IT-14 passed in every post-change run.
  - Node 20 and 22 were not rerun for this test-orchestration change; the T16 matrix rerun was out of scope.
  - A new test file that starts processes must be added to `tests/test-lanes.ts`; otherwise `tests/unit/test-lanes.test.ts` fails.
