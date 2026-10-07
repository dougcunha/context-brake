# Stable execution context

Load in this exact order:

1. `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/prd.md`
2. `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T05 — Limit process-starting tests

## Outcome

Only the tests in `techspec.md#tests-allowed-to-start-a-process-fr-05-dec-04` start a child process, and `PROCESS_LANE_FILES` equals that list. The `runtime-*` harness suites run hooks through `runProcessHook` with an in-memory context.

## Dependencies and boundaries

- Depends on: T03, T04
- Unblocks: T07
- In scope: converting `runtime-antigravity`, `runtime-codex`, `runtime-copilot`, `runtime-cursor`, `runtime-failure-policy`, `runtime-invalid-config`, and any other unlisted process test to in-process; `PROCESS_LANE_FILES`, `SERIAL_LANE_FILES`, and `PROCESS_MARKERS` per DEC-04 and DEC-05; lane tests (TC-06).
- Out of scope: worker counts (T07).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-05, NFR-04 | `prd.md` | Process tests limited to the listed cases |
| DEC-04, DEC-05 | `techspec.md#technical-decisions` | Process list; markers |
| TC-06 | `techspec.md#test-approach` | Lane test |

## Context to recover on demand

- Applicable skills and rules: `tests.md`, `code-standards.md`, `javascript-typescript.md`, `node.md`; quality profile QA-01 to QA-07 and the Terrain baseline in `techspec.md#quality-profile`, `harness-adapters.md`
- Existing code: `src/infrastructure/runtime/process-hook-host.ts:ProcessHookContext`; `tests/helpers/built-hook.ts`; `tests/test-lanes.ts`.

## Work

- [x] T05.1 Convert the unlisted process suites to in-process hook runs.
- [x] T05.2 Set the lane lists and markers, and assert in `test-lanes.test.ts` that the process lane equals the list.

## Acceptance criteria

- `rg -l "node:child_process|runInstalledHook|runBuiltCli|shell-runner|npm pack" tests` lists only allowed files and their helpers.
- The lane tests pass.

## Verification

- Unit: `tests/unit/test-lanes.test.ts` (TC-06).
- Integration: the converted suites.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows (local).
- Commands: `npm run build`, `npx vitest run <touched suites>`, `npm run lint`, `npm run typecheck`.
- Environment dependency: none.
- Expected evidence: the `rg` result and passing suites.

## Affected files

- Modify: `tests/test-lanes.ts`, `tests/unit/test-lanes.test.ts`, the converted `tests/integration/runtime-*` suites

## Observability and recovery

- Operational signal: none beyond the test output.
- Recovery: revert the lane lists and suites.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result (FR-05, NFR-04, DEC-04, DEC-05):
  - `runtime-antigravity`, `runtime-codex`, `runtime-copilot`, `runtime-cursor`, `runtime-failure-policy`, and `runtime-invalid-config` run the harness adapters in process through `bindHookInProcess`/`runBoundHook`, added to `tests/helpers/in-process-hook.ts`, instead of copying and spawning the built hook. The assertions are unchanged. The built hooks keep one round trip each in `tests/e2e/e2e-hook-round-trips.test.ts` (T04).
  - The harness simulator no longer starts `git`. A simulated shell call only needs its simulated output, because the hook never sees the real command result. `executeSimulatedCall` returns for shell calls, and `initializeRepository` is removed together with the git gate and commits in `brake-lifecycle`.
  - `PROCESS_LANE_FILES` holds exactly the 12 files below. `PROCESS_MARKERS` drops `'/cli/commands/'` and `'composition-root'` (DEC-05). The new TC-06 test in `test-lanes.test.ts` asserts the list.
  - Final list:
    - TechSpec DEC-04: `cli-shells`, `codex-hook-command-shells`, `node-process-runner`, `package-assets`, `package-contents`, `runtime-host-process`, `runtime-parallel-turns`, `statusline-bridge`, `statusline-bridge-previous`, `statusline-shell`.
    - Additions recorded in T04, for the same reasons: `codex-hook-root` (shell quoting) and `statusline-bridge-lifecycle` (bridge through the user shell).
  - Not in the lane but starting one small process each: `tests/unit/git-capability.test.ts` and `tests/unit/process-capability.test.ts`. They test the capability probes that other tests use to skip, and their source has no process marker. Recorded for the reviewer.
- Changed files:
  - modified `tests/integration/runtime-{antigravity,codex,copilot,cursor,failure-policy,invalid-config}.test.ts`, `tests/integration/brake-lifecycle.test.ts`;
  - `tests/support/harness-simulator/session-recorder.ts`;
  - `tests/helpers/in-process-hook.ts`;
  - `tests/test-lanes.ts`, `tests/unit/test-lanes.test.ts`.
- Checks (Windows 11, Git Bash):
  - The six runtime suites pass: 16 tests in 0.07-0.17 s each, against 0.9-3.6 s before.
  - `brake-lifecycle` and `simulated-usage` pass: 18 tests, in 0.8 s and 3.6 s.
  - The lane tests pass: 11 tests.
  - The acceptance `grep -lE "node:child_process|runInstalledHook|runBuiltCli|shell-runner|npm pack"` over test files lists only the e2e smoke files and listed process files.
  - `rtk proxy npx eslint .` and `npm run typecheck` are clean. `test-lanes.test.ts` is at 99 lines.
  - Full `npm run test:budget` after `npm run build`: `Test run: 117.1s wall (budget 120s)`, exit 0. The slowest files are `statusline-shell` 12.1 s, `statusline-bridge-previous` 9.2 s, and `e2e-doctor` 4.1 s.
- Validated state: base `cca3a29` plus T01-T06; Windows 11, Git Bash, `MAX_WORKERS = 2`.
- Open items: the budget margin is 3 s before T07's worker tuning.

### ADR candidates

None - direct TechSpec implementation or local decision.
