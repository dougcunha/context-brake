# Implementation plan — Fast test suite

## Stable sources

- PRD: `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/prd.md`
- TechSpec: `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | Benchmarks and `e2e-09` run only through `npm run test:bench`, which `release:check` calls; `npm test` lists none of them | — | T06 |
| T02 | `doctor` takes an injected overhead measurer; in-process tests use a fake one | — | T03, T04 |
| T03 | Built-CLI `init` and `remove` smoke tests; the install and removal e2e scenarios run in process | T02 | T04 |
| T04 | Built-CLI `doctor` smoke and hook round trips per harness; the doctor, mode, and hook e2e scenarios run in process; `tests/e2e/` holds only the smoke set | T02, T03 | T05 |
| T05 | Only the listed tests start a process; the process lane equals that list | T03, T04 | T07 |
| T06 | `npm run test:budget` reports wall time and the ten slowest files, and fails above 120 s | T01 | T07 |
| T07 | Worker counts set by measurement; rules and `AGENTS.md` updated; budget and stability recorded | T05, T06 | — |

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | `npm test` without benchmarks, ≤ 120 s | T01, T07 | TC-01, TC-03 |
| FR-02 | `prd.md#functional-requirements` | `npm run coverage` ≤ 120 s, thresholds kept | T07 | TC-02 |
| FR-03 | `prd.md#functional-requirements` | Separate bench script in `release:check` | T01 | TC-03, TC-04 |
| FR-04 | `prd.md#functional-requirements` | E2E smoke set; removed scenarios mapped | T03, T04 | TC-05, TC-10 |
| FR-05 | `prd.md#functional-requirements` | Process-starting tests limited to the listed cases | T05 | TC-06 |
| FR-06 | `prd.md#functional-requirements` | Budget check | T06 | TC-07, TC-01 |
| FR-07 | `prd.md#functional-requirements` | Rules and `AGENTS.md` | T07 | TC-11 |
| NFR-01 | `prd.md#non-functional-requirements` | ≤ 120 s on Windows PowerShell | T07 | TC-01, TC-08 |
| NFR-02 | `prd.md#non-functional-requirements` | 80% thresholds, no new exclusion | T01, T07 | TC-02, DEC-09 |
| NFR-03 | `prd.md#non-functional-requirements` | No behavior loses all coverage | T03, T04 | TC-10 |
| NFR-04 | `prd.md#non-functional-requirements` | Shell coverage kept | T03, T04, T05 | DEC-04 list |
| NFR-05 | `prd.md#non-functional-requirements` | Three runs, no flake | T07 | TC-08 |
| DEC-01, DEC-09 | `techspec.md#technical-decisions` | Bench split; coverage without exclusions | T01 | TC-03, TC-04 |
| DEC-02 | `techspec.md#technical-decisions` | Injected measurer | T02 | TC-09 |
| DEC-03 | `techspec.md#technical-decisions` | Smoke set and mapping | T03, T04 | TC-05, TC-10 |
| DEC-04, DEC-05 | `techspec.md#technical-decisions` | Process list and markers | T05 | TC-06 |
| DEC-06 | `techspec.md#technical-decisions` | Workers by measurement | T07 | TC-08 |
| DEC-07 | `techspec.md#technical-decisions` | Budget script | T06 | TC-07 |
| DEC-08 | `techspec.md#technical-decisions` | Rules and commands text | T07 | TC-11 |
| TC-01 to TC-11 | `techspec.md#test-approach` | Test cases | per row above | — |

## Tasks

- [T01 — Move benchmarks to their own script](done/task_01.md): the six timing suites run only under `npm run test:bench`, and `release:check` calls it.
- [T02 — Inject the doctor overhead measurer](done/task_02.md): in-process `doctor` tests stop sampling processes.
- [T03 — Init and remove smoke, scenarios in process](done/task_03.md): two built-CLI smoke files; the install and removal e2e scenarios move in process.
- [T04 — Doctor smoke, hook round trips, scenarios in process](done/task_04.md): the e2e folder holds only the smoke set.
- [T05 — Limit process-starting tests](done/task_05.md): the process lane equals the TechSpec list.
- [T06 — Test budget check](done/task_06.md): `npm run test:budget` reports and gates the run time.
- [T07 — Workers, rules, and recorded budget](done/task_07.md): measured worker counts, updated rules, and the recorded runs.

## Coverage gate

- Coverage: pass. Every FR, NFR, DEC, and TC maps to a task.
- Traceability: pass. Each task lists its IDs.
- Dependencies: pass. The DAG is acyclic: T01 → T06 → T07; T02 → T03 → T04 → T05 → T07.
- Atomicity: pass with a size risk. T03 and T04 each move about ten e2e files. If a session runs short, either can stop after any completed mapping row, because each row is independent.
- Executability: pass. Commands come from `AGENTS.md`, plus `test:bench` and `test:budget` once T01 and T06 add them. `npm run build` precedes test runs that use `dist/`.
- Validation profile: pass. The e2e scope is the smoke set of DEC-03. Budget evidence is recorded on Windows PowerShell. Linux and macOS stay unverified locally.
- Idempotency: pass. Scripts and configs are declarative. Tests use their own temporary directories.

## Assumptions and open items

- Assumption: DEC-PROC-01 and DEC-PROC-02 from prd-12 still apply. Tasks run only their touched suites. T07 runs the full suite, because measuring it is the deliverable.
- Required environment: Windows 11 under PowerShell for the TC-01, TC-02, and TC-08 recorded runs (NFR-01). The owner is the coordinator.

## State

- [x] T01 — done
- [x] T02 — done
- [x] T03 — done
- [x] T04 — done
- [x] T05 — done
- [x] T06 — done
- [x] T07 — done

## Problems and solutions

- T04: the three built in-process plugins keep their round trip in `tests/integration/runtime-in-process.test.ts`, which already loads them from `dist/` without a process, instead of in `tests/e2e/`. `codex-hook-root` and `statusline-bridge-lifecycle` joined the process list for the same shell and bridge reasons as listed files. See `done/task_04.md#Handoff`.
- T05: the harness simulator no longer runs `git` for simulated shell calls; `tests/unit/{git,process}-capability.test.ts` still start one small probe process each, outside the lane. See `done/task_05.md#Handoff`.
- T07: Vitest 3.2.7 has no per-project `maxForks`, so DEC-06's process-lane cap does not exist; only `MAX_WORKERS = 6` applies. The `claude-mod-restart` seed-failure test raced the asynchronous error record and now waits for it. See `done/task_07.md#Handoff`.
