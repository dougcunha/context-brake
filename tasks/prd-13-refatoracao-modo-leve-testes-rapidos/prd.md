# PRD — Fast test suite

## Problem and context

`AGENTS.md` asks for lint, typecheck, and tests with coverage before every code change is finished. On 2026-10-06, `npx vitest run` at commit `1474f54` took 596 s of wall time on the development machine (Windows), without coverage: 2,053 tests in 321 files. The user reports more than 15 minutes for the full run with coverage. Either figure stalls every SDD task, review, and correction loop. The limit is 2 minutes, and ideally 1.

The measurement shows where the time goes.

Time per layer:
- Unit tests: 180 files, 19 s in total.
- Integration tests: 101 files, 308 s.
- E2E tests: 40 files, 402 s.

Integration and e2e time is spent mostly on starting the built CLI or hook processes:
- `tests/test-lanes.ts:4-40` puts all e2e tests and about 30 integration tests in a `process` lane.
- `vitest.config.ts` caps the run at `MAX_WORKERS = 2`.

A `serial` lane runs one file at a time (`tests/test-lanes.ts:67-79`). It holds:
- latency benchmarks of earlier NFRs:
  - `statusline-overhead`, 38 s
  - `statusline-previous-overhead`, 22 s
  - `runtime-overhead`, 21 s
  - `doctor-benchmark`, 11 s
  - `overhead-measurer`, 9 s
- simulated long-task suites:
  - `e2e-simulated-long-task`, 51 s
  - `e2e-simulated-boot`, 43 s

prd-12-refatoracao-modo-leve-modo-unico deletes the tests of the removed features first. Those files take about 143 s. The rest still needs a different test strategy.

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | The default test run fits the budget | `npm test` ≤ 120 s wall time on the development machine, target 60 s (FR-01, NFR-01) |
| OBJ-02 | The coverage run used before finishing a change fits the same budget | `npm run coverage` ≤ 120 s, with the 80% thresholds kept (FR-02, NFR-02) |
| OBJ-03 | Latency and acceptance-scale checks keep running where they matter | The benchmarks and acceptance-scale suites run in their own script and in `release:check` (FR-03) |
| OBJ-04 | The budget does not erode again | A budget check reports the run time and fails above the limit (FR-06) |

## Stories and journeys

| ID | User | Need | Benefit | Flow or edge |
| --- | --- | --- | --- | --- |
| US-01 | Developer or agent finishing a change | Lint, typecheck, and coverage in about a minute | Validation fits inside each SDD task instead of dominating it | `npm run coverage` returns in ≤ 120 s with the thresholds met |
| US-02 | Maintainer preparing a release | The latency benchmarks and acceptance-scale suites still run | Performance regressions are still caught before publishing | `npm run release:check` runs the bench script |
| US-03 | Developer writing a new test | To know which kind of test to write and where it goes | New tests do not reintroduce process-heavy suites | Documented rules say when a test may start a process |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | `npm test` runs unit, integration, and the minimal e2e smoke set, without latency benchmarks or acceptance-scale repetitions | `npm test` finishes in ≤ 120 s on the development machine. Its file list contains no benchmark file |
| FR-02 | `npm run coverage` runs the same set as `npm test`, with the 80% line, statement, function, and branch thresholds | `npm run coverage` finishes in ≤ 120 s and meets all four thresholds |
| FR-03 | A separate script runs the latency benchmarks and any acceptance-scale suite that survives prd-12. `release:check` calls it instead of the acceptance-mode coverage run. The plan-based `e2e-simulated-long-task`, `e2e-simulated-boot`, and `e2e-run-autonomy` are removed by prd-12 | The new script exists. `release:check` invokes it. Each benchmark still asserts the limit its original PRD set |
| FR-04 | E2E tests that start the built CLI are reduced to a smoke set: one per command (`init`, `doctor`, `remove`) and one hook round trip per supported harness, against fixture repositories in temporary directories | The e2e folder holds only the smoke set. Each scenario removed from e2e is covered by an in-process test of the same behavior, and the mapping is listed in the TechSpec |
| FR-05 | Integration tests call command and hook entry points in process wherever the behavior does not depend on a real child process, shell, or OS signal | Tests that start a process are limited to the cases the TechSpec lists with a reason (shell quoting, signal handling, symlinks, packaging). The `process` lane shrinks to them |
| FR-06 | A test-time budget check runs `npm test`, reports wall time and the ten slowest files, and fails when the run exceeds 120 s | The check prints the duration and the slowest files, and exits non-zero above the limit. Running it on the current tree passes |
| FR-07 | The test-writing rules state the budget, the in-process default, when a process-starting test is allowed, and where benchmarks go | `.agents/rules/tests.md` and the `AGENTS.md` commands section describe the new scripts and rules. `AGENTS.md` no longer describes e2e as the default way to test behavior |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Performance | `npm test` ≤ 120 s, target 60 s, measured as wall time on the development machine (Windows 11, PowerShell) after prd-12 is merged |
| NFR-02 | Coverage | The 80% thresholds stay unchanged. No `src` file is added to the coverage exclusions to meet the budget |
| NFR-03 | Behavior coverage | No behavior covered on 2026-10-06 by a remaining feature's test loses all coverage. A removed e2e scenario maps to an in-process test |
| NFR-04 | Platform | The process-starting smoke tests still cover Windows (PowerShell and Git Bash) and POSIX shells where they did before |
| NFR-05 | Stability | Three consecutive `npm test` runs pass with no flaky failure and no test needing a retry |

## Constraints and dependencies

- Depends on prd-12-refatoracao-modo-leve-modo-unico. The budget is measured after the removed features' tests are deleted.
- prd-14-refatoracao-modo-leve-reinicio-multi-harness must respect NFR-01 and the rules of FR-07 for every test it adds.
- Keeps `.agents/rules/tests.md` and the Vitest stack. Lint and typecheck time are not part of this budget.
- Product decisions from the user on 2026-10-06:
  - The 120 s budget applies to `npm test` and `npm run coverage`.
  - Benchmarks and acceptance scale run in a separate script.
  - The e2e tests become a minimal smoke set for each command.

## Out of scope

- Removing tests of plan mode, checkpoint, boot, `run`, `wrap`, delegated mode, or deny: prd-12.
- Tests for the multi-harness restart and the markdown handoff: prd-14.
- Changing the latency limits the benchmarks assert.
- Making lint, typecheck, or the build faster.
- A hosted CI pipeline. The budget is measured locally.

## Assumptions and sources

- Assumption: most integration and e2e time is process start-up and serialized lanes, not test logic. This is based on unit tests taking 19 s across 180 files. If it is wrong, the TechSpec will profile the remaining slow files before changing their strategy.
- Assumption: the development machine is the reference for the budget. A slower machine may exceed it. The budget check reports the time and does not depend on the machine.
- Source: per-file timing measured on 2026-10-06 at commit `1474f54` with `npx vitest run --reporter=json` (default mode, no coverage), as summarized in Problem and context.
- Source: `vitest.config.ts`, `tests/test-lanes.ts`, `package.json` scripts at `1474f54`.

## PRD acceptance gate

- [ ] Every requirement has an ID and an observable criterion.
- [ ] Metrics, boundaries, and out-of-scope items are explicit.
- [ ] Internal rules came from the user or an identified project source.
- [ ] Implementation details remain in the TechSpec.
