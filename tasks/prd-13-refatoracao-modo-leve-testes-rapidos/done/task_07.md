# Stable execution context

Load in this exact order:

1. `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/prd.md`
2. `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T07 — Workers, rules, and recorded budget

## Outcome

The worker counts come from measurement. `.agents/rules/tests.md` and `AGENTS.md` describe the budget, the in-process default, the reasons a test may start a process, the smoke set, and the new scripts. The recorded runs show `npm test` and `npm run coverage` within 120 s on Windows PowerShell, three times in a row without a flake.

## Dependencies and boundaries

- Depends on: T05, T06
- Unblocks: —
- In scope: `MAX_WORKERS` and a process-lane `maxForks` cap as named constants (DEC-06); the rules and commands text (DEC-08); the recorded TC-01, TC-02, and TC-08 runs; the TC-11 text.
- Out of scope: new test strategies. If the budget still fails after DEC-06, record the slowest files and stop for an exception HIL.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01, FR-02, FR-07, NFR-01, NFR-02, NFR-05 | `prd.md` | Budget, coverage, rules, stability |
| DEC-06, DEC-08 | `techspec.md#technical-decisions` | Workers; text |
| TC-01, TC-02, TC-08, TC-11 | `techspec.md#test-approach` | Recorded runs; text |

## Context to recover on demand

- Applicable skills and rules: `tests.md`, `code-standards.md`, `javascript-typescript.md`, `node.md`; quality profile QA-01 to QA-07 and the Terrain baseline in `techspec.md#quality-profile`
- Existing code: `vitest.config.ts`; Vitest 3.2.7 `maxWorkers` and `poolOptions.forks.maxForks`.

## Work

- [x] T07.1 Measure `npm run test:budget` at the current setting, then at higher global and process-lane values, and keep the lowest setting that meets NFR-01 and NFR-05.
- [x] T07.2 Update `.agents/rules/tests.md` and the `AGENTS.md` Commands and Project constraints sections.
- [x] T07.3 Record three `npm run test:budget` runs and one timed `npm run coverage` under PowerShell.

## Acceptance criteria

- Three consecutive `npm run test:budget` runs pass, each in 120 s or less, with no retry.
- `npm run coverage` passes in 120 s or less with the four thresholds at 80% or more.
- The text covers each FR-07 item.

## Verification

- Unit: `tests/unit/test-lanes.test.ts` for the lane constants.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: the recorded runs (owner: coordinator, Windows PowerShell).
- Platforms: Windows PowerShell; Git Bash numbers supplementary.
- Commands: `npm run build`, `npm run test:budget` three times, `npm run coverage`, `npm run lint`, `npm run typecheck`.
- Environment dependency: a Windows PowerShell session.
- Expected evidence: the three budget reports, the coverage totals and wall time, and the chosen constants with their measurements.

## Affected files

- Modify: `vitest.config.ts`, `tests/unit/test-lanes.test.ts`, `.agents/rules/tests.md`, `AGENTS.md`

## Observability and recovery

- Operational signal: none beyond the test output.
- Recovery: restore the previous worker constants.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result (FR-01, FR-02, FR-07, NFR-01, NFR-02, NFR-05, DEC-06, DEC-08):
  - **Workers (DEC-06).** `MAX_WORKERS = 6` (was 2). `npm run test:budget` wall time by global worker count, measured back to back:

    | Workers | Wall |
    | --- | --- |
    | 2 | 117.1 s (T05) |
    | 4 | 77.9 s |
    | 6 | 72.1 s |
    | 8 | 84.2 s (contention) |

    Six is the fastest measured value.
  - **Deviation from DEC-06.** Vitest 3.2.7 does not accept `poolOptions.forks.maxForks` per project: `npm run typecheck` reports that a project's forks options are only `isolate` and `singleFork`. The process lane therefore has no cap of its own, and only the global `maxWorkers` applies. The 4/2, 6/3, and 8/4 runs above effectively measured 4, 6, and 8 workers. The lane test asserts `maxWorkers` 6 and no `singleFork` on the process lane.
  - **Choice of 6 over 4.** DEC-06 says to keep the lowest setting that meets NFR-01 and NFR-05. 4 workers also met the 120 s budget once, but 6 is closer to the 60 s target, and it passed the three-run stability check below. A reviewer may prefer 4.
  - **Flake fixed.** `claude-mod-restart` › "reports a rejected seed without throwing" read the mod log right away, while the `ERROR_INTERNAL` record is written asynchronously. It failed once under 6 workers with coverage. It now waits with `waitForCodes(scene, 2)`, like its sibling test. No retry and no timeout change.
  - **Budget diagnostics.** `scripts/test-budget.ts` now lists each failed test (`  failed: <file> > <full name>`) after `TEST_RUN_FAILED`. A run that failed under load could not be traced, because the report was already deleted. A unit test covers the new lines (7 tests now).
  - **Text (DEC-08).**
    - `.agents/rules/tests.md`: the e2e layer is a smoke set; a benchmarks layer is added; a new "Time Budget and Processes" section covers the 120 s budget (target 60 s), `test:budget`, the in-process helpers, the reasons a test may start a process plus the `PROCESS_LANE_FILES` listing, benchmarks in `tests/bench/`, and "no timeout or retry to hide a slow or flaky test".
    - `AGENTS.md`: the test layout names the smoke set and `tests/bench/`; Project constraints says tests run in process by default; Commands lists `test:bench` and `test:budget`.
    - `.claude` is a junction to `.agents`, so the rule is mirrored.
- Changed files: `vitest.config.ts`, `tests/unit/test-lanes.test.ts`, `tests/integration/claude-mod-restart.test.ts`, `scripts/test-budget.ts`, `tests/unit/test-budget.test.ts`, `.agents/rules/tests.md`, `AGENTS.md`.
- Checks:
  - **Recorded runs on the final state** (Windows 11, PowerShell, after `npm run build`, 6 workers). Three consecutive `npm run test:budget` runs: 93.7 s, 86.0 s, and 89.3 s, exit 0 each (TC-01, TC-08).
  - The `npm run coverage` timed in PowerShell passed: 199 files and 1,054 tests in 110.6 s and 113.3 s. Coverage is 93.5% statements, 90.12% branches, 94.03% functions, and 93.5% lines (TC-02). `exclude` is still `[]`.
  - **Variance under load.** Earlier PowerShell sets on the same code took 78.7, 79.1, and 76.9 s. A later set ran while four other Claude Code sessions and TokenHound were using CPU, and took 154.8 s (over budget), 158.1 s (`TEST_RUN_FAILED`; the failing test is unknown), and 113.4 s. No test process was left running between sets.
  - `rtk proxy npx eslint .` and `npm run typecheck` are clean. `test-lanes`, `bench-config`, `e2e-smoke-set`, `test-budget`, and `claude-mod-restart` pass.
- Validated state: base `cca3a29` plus T01-T07; Windows 11 (PowerShell for the recorded runs, Git Bash for the rest).
- Open items:
  - The budget margin depends on machine load. Under heavy concurrent load, runs exceeded 120 s (PRD assumption: a slower or busier machine may exceed it; the check reports the time).
  - One failure under load is unidentified. If it recurs, the budget output now names it.
  - Linux and macOS are not run locally.

### ADR candidates

None - direct TechSpec implementation or local decision. The DEC-06 deviation (no per-project fork cap in Vitest 3.2.7) is recorded above and in `tasks.md#Problems and solutions`.
