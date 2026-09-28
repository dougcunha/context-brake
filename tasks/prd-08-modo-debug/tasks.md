# Implementation plan — Modo debug

## Stable sources

- PRD: `tasks/prd-08-modo-debug/prd.md`
- TechSpec: `tasks/prd-08-modo-debug/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | `init --debug`/`--no-debug` persist `debug`, render the debug line in the managed block, force telemetry injection, and enforce the light-mode conflicts | — | T02 |
| T02 | `doctor` reports the debug mode; end-to-end coverage of the built CLI and hook; README | T01 | — |

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | `init --debug` persists `debug`, and a later `init` keeps it | T01 | TC-01, TC-02, TC-06, TC-13 |
| FR-02 | `prd.md#functional-requirements` | Debug line in the managed block, bytes outside the markers preserved | T01 | TC-03, TC-06 |
| FR-03 | `prd.md#functional-requirements` | Forced injection while debug is on | T01, T02 | TC-04, TC-05, TC-12 |
| FR-04 | `prd.md#functional-requirements` | `--no-debug` restores the bytes; both flags together are an error | T01 | TC-01, TC-02, TC-06 |
| FR-05 | `prd.md#functional-requirements` | Light-mode conflicts and `--light --no-debug` | T01 | TC-07 |
| FR-06 | `prd.md#functional-requirements` | Plan shows the change; `doctor` shows debug; drift repaired by `init`; `remove` clears the line | T01, T02 | TC-08, TC-09, TC-10, TC-11, TC-13 |
| NFR-01 | `prd.md#non-functional-requirements` | Line ≤ 60 tokens; telemetry `v2` unchanged | T01 | TC-03 |
| NFR-02 | `prd.md#non-functional-requirements` | Linux, macOS, Windows; symlinked instruction files | T01, T02 | TC-06, TC-11, CI |
| DEC-01–DEC-06, DEC-08 | `techspec.md#technical-decisions` | Config key, merge service, block rendering (absorbs the `instruction-service.ts` baseline), injection, conflicts, config wiring, existing writer | T01 | TC-01–TC-09 |
| DEC-07 | `techspec.md#technical-decisions` | `debugMode` in the doctor report and text | T02 | TC-10, TC-11 |
| TC-01–TC-09 | `techspec.md#test-approach` | Unit and integration scenarios | T01 | listed test files |
| TC-10–TC-13 | `techspec.md#test-approach` | Doctor unit, end-to-end, schema check | T02 | listed test files |
| QA-01–QA-07 | `techspec.md#quality-profile` | Quality profile over each task diff | T01, T02 | profile commands |

## Tasks

- [T01 — Debug mode in config, managed block, injection, and `init`](done/task_01.md): `init --debug`/`--no-debug` work end to end in-process, with the light-mode conflicts.
- [T02 — Debug mode in `doctor`, end-to-end, and README](done/task_02.md): `doctor` reports the mode, and the built CLI and hook are covered end to end.

## Coverage gate

- Coverage: pass. Every FR, NFR, DEC, and TC maps to a task.
- Traceability: pass.
- Dependencies: pass; T02 depends on T01's `isDebugModeInEffect` and config key.
- Atomicity: pass; each task is a vertical slice with its tests.
- Executability: pass; commands come from `AGENTS.md`.
- Validation profile: pass. End-to-end tests only for TC-11 and TC-12 (built CLI and hook as child processes in `tests/e2e/`); Windows locally, Linux and macOS through CI.
- Idempotency: pass; TC-06 covers the second `init`.

## Assumptions and open items

- Assumption: the new integration tests run in-process, like `tests/integration/init-light-mode.test.ts`, so they need no entry in `tests/test-lanes.ts#PROCESS_LANE_FILES`. A test that spawns a process goes under `tests/e2e/` instead.
- Open item: none.
- Required environment: None.

## State

- [x] T01 — completed (done/task_01.md)
- [x] T02 — completed (done/task_02.md)

## Problems and solutions

- T01: `tests/unit/init-light-arguments.test.ts` compared the exact `ConfigUpdates` object and failed once `debug` joined it; its three expectations now include `debug: { kind: 'keep' }`. `tests/e2e/e2e-simulated-boot.test.ts` (pi startup) failed once in a full run and passed on rerun; it is unrelated to this feature.
- T02: `buildDoctorReport` in `src/core/services/report-service.ts` builds and strictly parses the doctor report, so DEC-07's `debugMode` passes through it (two lines), although the task's file list did not name that file. The first `e2e-debug-mode.test.ts` run took the doctor baseline before the first hook call, which then added `BRAKE_BLOCKS_RECORDED` to the debug reading; the baseline now comes after the hook call.
