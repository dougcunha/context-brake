# Stable execution context

Load in this exact order:

1. `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_05/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T19 — Bound the E2E-09 quick-start test by its CA-19 limits instead of the global runner timeout

## Outcome

The E2E-09 quick-start workflow test fails only when the workflow exceeds its CA-19 bounds: five seconds for the core command and two minutes for the workflow. It no longer times out at the 30-second global runner limit under normal parallel suite load.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T16
- In scope: a per-test runner timeout for the E2E-09 workflow case, derived from `MAX_USER_WORKFLOW_MS` plus a named margin; repeated full-suite runs recording E2E-09 durations.
- Out of scope:
  - the global `testTimeout` in `vitest.config.ts` and every other test's timeout;
  - the CA-19 time limits themselves;
  - the JSON and text `doctor` runs added by T12, which T12 and CA-17 require;
  - the sample count, per-sample timeout, and discard policy in `src/infrastructure/diagnostics/overhead-measurer.ts`;
  - `.github/workflows/ci.yml`.
- Pending, not planned: the IT-14 failure from `codereview_05/CR-03` (`sampleCount` 0 instead of 20 under suite load). Its cause is recorded as pending. Eight paired runs of IT-14 with `tests/integration/package-assets.test.ts` all passed, so it is not attributed to OBS-01 (T18). It needs its own evidence before any correction is planned.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_05/CR-03 (E2E-09 part) | `codereview.md#findings` | E2E-09 timed out at `Test timed out in 30000ms` (`tests/e2e/e2e-09.test.ts:59`) in two of three full runs, and passed at 28,605 ms in the third; alone it takes 6,729 ms. The test asserts a 120,000 ms workflow bound (`e2e-09.test.ts:10,28,41`) but inherits `testTimeout: 30000` (`vitest.config.ts:5`), so the runner timeout decides the result. |
| PRD | CA-19 | A user following the README reaches an error-free diagnosis within two minutes. |
| TechSpec | `End-to-End Tests` E2E-09 | The scripted workflow completes well below two minutes, and core work excluding the benchmark is asserted separately below five seconds. |

## Requirements

- The E2E-09 workflow test declares a runner timeout greater than `MAX_USER_WORKFLOW_MS`, derived from named constants, so the CA-19 assertion is the effective bound.
- `MAX_CORE_COMMAND_MS` (5,000) and `MAX_USER_WORKFLOW_MS` (120,000) and their assertions stay unchanged.
- The JSON schema validation, `warnings`/exit 1 expectation, zero error findings, `VERSION_FLOOR_UNVERIFIED` checks, and text-output identity check stay unchanged.
- The core dry-run test and every other test keep their current timeouts.
- The file stays within the size, function, and no-comment rules.

## Context to recover on demand

- TechSpec: `End-to-End Tests` E2E-09; `Monitoring and Observability` (core work measured separately from the benchmark).
- Rules and skills: `.agents/rules/tests.md`, `.agents/rules/code-standards.md` (named constants), `.agents/rules/javascript-typescript.md`, `AGENTS.md` (CLI end-to-end policy), `sdd-execute-corrections`.
- Code:
  - `tests/e2e/e2e-09.test.ts:9-10,20-42,59-61`: constants, workflow, test declaration.
  - `vitest.config.ts:5`: global timeout.
  - `src/infrastructure/diagnostics/overhead-measurer.ts:23-44`: sequential process samples that lengthen each `doctor` run.

## Work

- [x] T19.1 Record E2E-09 workflow durations from a verbose full-suite run on Windows as the baseline.
- [x] T19.2 Give the workflow test a runner timeout derived from `MAX_USER_WORKFLOW_MS` and a named margin.
- [x] T19.3 Run `npx vitest run --reporter=verbose` three consecutive times on Windows and once in WSL (Node 24, PATH without `/mnt` entries); record the E2E-09 durations and results.
- [x] T19.4 If IT-14 fails during T19.3, record its exact failure message and duration in the Handoff open items without changing the measurer.
- [x] T19.5 Run lint, typecheck, tests, and coverage.

## Acceptance criteria

- The E2E-09 workflow test declares a timeout above 120,000 ms, derived from named constants.
- Three consecutive full Windows runs and one full WSL run pass E2E-09, with no `Test timed out in 30000ms`.
- The CA-19 time assertions and all T12 doctor assertions are unchanged.
- No other test file and no global Vitest setting changes.

## Verification

- Unit: not applicable.
- Integration: not applicable.
- End-to-end: E2E-09 against the built CLI in a temporary fixture repository, inside full parallel suite runs, per the CLI policy in `AGENTS.md`.
- Manual: not applicable.
- Platforms: Windows (local) and Linux (WSL 2 Ubuntu, Node 24); the full matrix is T16.
- Environment dependency: none beyond the existing WSL 2 Ubuntu with nvm-managed Node.
- Commands: `npm run build`, `npx vitest run --reporter=verbose` (three times on Windows, once in WSL), `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`.
- Expected evidence: baseline and post-change E2E-09 durations, four green full-suite runs, and all gates green.

## Affected files

- Modify: `tests/e2e/e2e-09.test.ts`
- Create: —

## Observability and recovery

- Operational signal: verbose Vitest output shows each E2E-09 workflow duration; a failure reports the violated CA-19 bound, not a runner timeout.
- Recovery: revert `tests/e2e/e2e-09.test.ts`.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Implemented. The E2E-09 workflow test declares `WORKFLOW_TEST_TIMEOUT_MS = MAX_USER_WORKFLOW_MS + WORKFLOW_TIMEOUT_MARGIN_MS` (120,000 + 30,000 = 150,000 ms) as its runner timeout, so the CA-19 two-minute assertion decides failure. The CA-19 limits, the T12 doctor assertions, the dry-run test, every other test, and `vitest.config.ts` are unchanged.
- Changed files: `tests/e2e/e2e-09.test.ts` (3 lines added, 1 removed).
- Checks:
  - Baseline (reused from `codereview_05`, same code before this task, Windows): "Test timed out in 30000ms" in 2 of 3 full runs, 28,605 ms in the passing run, 6,729 ms in isolation.
  - After, three consecutive full `npx vitest run --reporter=verbose` runs on Windows: E2E-09 passed at 44,677 ms, 32,466 ms, and 38,963 ms. Each exceeded the former 30,000 ms runner limit and stayed under the 120,000 ms CA-19 bound.
  - After, one full WSL run: E2E-09 passed at 16,511 ms.
  - T19.4: IT-14 passed in all four runs (19,440 / 11,120 / 13,635 / 6,051 ms), so no IT-14 failure was recorded.
  - Gates: Windows lint and typecheck passed; coverage 218/218 (91.34 / 82.82 / 96.15 / 91.34). WSL build, lint, and typecheck passed; full suite 218/218.
- Validated state: uncommitted worktree on top of commit `8401e7f` with T17–T22 applied. Windows 11, Node v24.19.0; this host ran slower than during `codereview_05` (lint 23 s instead of 7 s). WSL 2 Ubuntu 26.04, Node v24.21.0, PATH without `/mnt` entries.
- Open items:
  - **HIL decision, outside T19's scope.** The same load-dependent cause affects other benchmark-running E2E tests that still inherit the global 30,000 ms timeout:
    - `tests/e2e/e2e-linked-project-root.test.ts` failed Windows full run 1 with "Test timed out in 30000ms" (33,017 ms), then passed at 23,552 and 25,131 ms;
    - `tests/e2e/e2e-07-08.test.ts` E2E-08 passed at 28,712 / 19,681 / 25,379 ms.
    Extending the correction to them requires authorization and a new finding or task.
  - **Pending, unchanged:** the IT-14 cause from `codereview_05/CR-03`. It did not recur in this task's runs, so there is still no evidence of its cause.
