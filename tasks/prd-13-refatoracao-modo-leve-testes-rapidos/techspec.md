# TechSpec — Fast test suite

## Sources and traceability

- PRD: `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/prd.md` (approved, DEC-HIL-01; product decisions DEC-PD-04 and DEC-PD-05 in `tasks/prd-12-refatoracao-modo-leve-modo-unico/workflow.md`)
- Applicable instructions and rules: `AGENTS.md` (Commands, Project constraints), `.agents/rules/tests.md`, `node.md`, `code-standards.md`, `javascript-typescript.md`, `cli-output.md`
- Research: none; no harness behavior changes. Hook round trips keep the payload fixtures in `tests/fixtures/harnesses/`.
- Evidence in existing code:
  - `vitest.config.ts:testConfig,lanes` (three lanes, `MAX_WORKERS = 2`)
  - `tests/test-lanes.ts` (process and serial lane lists, `PROCESS_MARKERS`)
  - `tests/unit/test-lanes.test.ts:36-71` (lane rules)
  - `package.json` scripts `test`, `coverage`, `release:check`
  - `src/cli/commands/doctor.ts:runDoctor` (builds `NodeOverheadMeasurer` itself)
  - `src/core/services/doctor-service.ts:diagnoseProject` (already takes `measurer` as a port)
  - `src/cli/commands/init.ts:20` (`CommandEnv`)
  - `tests/helpers/delegated-world.ts:runCli` (in-process CLI through `dispatchCommand`)
  - `src/infrastructure/runtime/process-hook-host.ts:runProcessHook` (in-process hook host with an injectable `ProcessHookContext`)
- Baseline measurement, 2026-10-07 at `cca3a29` (Windows 11, Git Bash, 12 logical CPUs): `npx vitest run --reporter=json` without coverage took **324 s wall** for 1,052 tests in 197 files. Summed file time: unit 19 s (114 files), integration 200 s (61 files), e2e 188 s (22 files). One built `doctor` run took 4.9 s, because it runs 20 process samples per harness. A built `--help` took 0.4 s. The full table is reproducible with the TC-01 command.

## Solution summary

Wall time goes to three things. First, benchmarks and timing acceptance run in the `serial` lane, after every other lane, so they cost wall time one for one: 77.6 s, of which 65.4 s is in five benchmark files and 8.9 s in `e2e-09`. Second, every `doctor` call runs the real overhead benchmark: about 5 s each, in about 15 files. Third, 22 e2e files start the built CLI or hook processes several times each, with only two workers on a 12-CPU machine.

The design removes each cost at its source:
- Benchmarks and the `e2e-09` timing suite move to `tests/bench/`, under their own config and the `test:bench` script, which `release:check` runs.
- `doctor` gets its overhead measurer through the command environment, and in-process tests pass a fake.
- `tests/e2e/` shrinks to a smoke set: one built-CLI test file per command and one hook round trip per harness. Every other scenario runs in process, through `runCli` and `runProcessHook`, and the TechSpec maps each one.
- Integration tests that keep a child process are limited to a listed set, each with a reason.
- A `test:budget` script times `npm test`, prints the ten slowest files, and fails above 120 s.
- Worker counts are raised last and fixed by measurement.

Expected wall time, as an estimate from the baseline to check in each task:

| After | Expected `npm test` wall | Basis |
| --- | --- | --- |
| Baseline | 324 s | measured |
| Benchmarks and `e2e-09` out (DEC-01) | ≈ 250 s | −74 s of serial-lane wall |
| Fake doctor measurer (DEC-02) | ≈ 215 s | ≈ 60 s of file time in two-worker lanes |
| E2E smoke set and in-process integration (DEC-03, DEC-04) | ≈ 75–95 s | ≈ 190 s of process-lane file time down to ≈ 40 s |
| Workers raised (DEC-06) | ≈ 40–60 s | the parallel lane scales with the CPUs; the process lane keeps a lower cap |

The 120 s budget is reachable without DEC-06; the 60 s target probably needs it. Coverage added about 9% at the prd-12 review (354 s against 324 s).

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-01, FR-03, OBJ-03 | Move `runtime-overhead`, `statusline-overhead`, `statusline-previous-overhead`, `doctor-benchmark`, `overhead-measurer`, and `e2e-09` (quick-start time targets, CA-19) to `tests/bench/`. Add `vitest.bench.config.ts`, which includes only `tests/bench/**/*.test.ts` in one fork, and the `test:bench` script. `release:check` runs `test:bench` after `coverage`. The default config excludes `tests/bench/**`. Each moved test keeps its assertions and limits unchanged | These six files are the serial lane except `node-process-runner`, 74 s of wall time. They assert latency and time limits, which FR-03 assigns to a separate script | A tag or env filter inside one config. Rejected: one config with a filter still lists the files in `npm test` (FR-01 acceptance) |
| DEC-02 | FR-01, FR-02, FR-05 | `CommandEnv` gains an optional `overheadMeasurer`. `runDoctor` uses it, or `new NodeOverheadMeasurer(projectRoot)` when absent. `tests/helpers/delegated-world.ts:runCli` passes a fake measurer that returns a fixed `pass` result for each harness, so in-process tests never sample processes. Only the bench suite and the built `doctor` smoke run the real measurer | `diagnoseProject` already takes the measurer as a port; only the CLI wiring builds it. A built `doctor` costs 4.9 s. The only test asserting overhead values is `doctor-benchmark`, which moves to bench. Dependency injection follows `node.md`, which keeps env variables inside adapters | An env variable that skips the benchmark. Rejected: it would add a product switch read outside an adapter, used only by tests |
| DEC-03 | FR-04, NFR-03, NFR-04 | `tests/e2e/` keeps only the smoke set. `e2e-init.test.ts`, `e2e-doctor.test.ts`, and `e2e-remove.test.ts` each run the built CLI against a temporary fixture repository; `e2e-doctor` runs the real measurer and validates the report schema. `e2e-hook-round-trips.test.ts` holds one round trip per harness: five built process hooks through `runInstalledHook`, and three built in-process plugins loaded from `dist/assets/runtime/`. Every other e2e scenario moves to an in-process integration test, per the mapping in Test approach **Amended 2026-10-07 (DEC-EXC-01):** the three built in-process plugins keep their round trip in `tests/integration/runtime-in-process.test.ts`, which loads them from `dist/` without a process; `e2e-hook-round-trips` covers the five process hooks. | FR-04 and DEC-PD-05. In-process helpers exist: `runCli` (`dispatchCommand`) and `runProcessHook` with an injectable context | Keep e2e files and only speed them up. Rejected: the process start-up is the cost |
| DEC-04 | FR-05, NFR-04 | Tests that start a child process are limited to the list in Test approach, each with a reason: shell quoting, signal or timeout handling, the process boundary of the hook host, concurrency between hook processes, packaging, or the smoke set. `PROCESS_LANE_FILES` lists exactly that set; every other integration test runs in process **Amended 2026-10-07 (DEC-EXC-01):** the list has 12 files, adding `codex-hook-root` and `statusline-bridge-lifecycle`, and allows the `git-capability` and `process-capability` unit probes. | FR-05 asks the TechSpec to list each process-starting test with its reason | Keep the current 33-file process lane. Rejected: 15 of its files no longer start a process after DEC-02 and DEC-03 |
| DEC-05 | FR-05 | Remove `'/cli/commands/'` and `'composition-root'` from `PROCESS_MARKERS`. In-process tests import `dispatchCommand` through `runCli`, and these markers would push them into the process lane. The remaining markers (`node:child_process`, `cli-runner`, `shell-runner`, `built-hook`, `NodeOverheadMeasurer`, `NodeProcessRunner`, `npm pack`) still flag real processes | `tests/unit/test-lanes.test.ts:36` forces any marker file into the process or serial lane | Keep the markers and list in-process files as exceptions. Rejected: the exception list would grow with every new test |
| DEC-06 | NFR-01, NFR-05 | After DEC-01 to DEC-05, raise the worker counts by measurement. On Vitest 3.2.7, `maxWorkers` is global and `poolOptions.forks.maxForks` takes priority per project. The process lane keeps its own `maxForks` cap. The values are named constants. The task picks the global value between 2 and the CPU-based default, and keeps the lowest setting that meets NFR-01 and NFR-05 on three consecutive runs **Amended 2026-10-07 (DEC-EXC-01):** Vitest 3.2.7 accepts only `isolate` and `singleFork` in a project's forks options, so no process-lane cap exists; the only cap is the global `MAX_WORKERS = 6`, the fastest of 4, 6, and 8 measured. | 12 logical CPUs and `MAX_WORKERS = 2`. Spawn-heavy suites on Windows contend for CPU, so the process lane needs its own cap | A fixed high value. Rejected: flaky timeouts on slower machines (NFR-05) |
| DEC-07 | FR-06, OBJ-04 | Add `scripts/check-test-budget.ts`, run by `npm run test:budget`. It starts `process.execPath` with `node_modules/vitest/vitest.mjs run --reporter=json --outputFile=<temp>`, with no shell, and measures wall time around the run. It prints the wall time and the ten slowest files, and exits non-zero when the run fails or exceeds `TEST_BUDGET_SECONDS = 120`. `release:check` runs it after `coverage`. The build stays outside the timed window | Spawning `npm` on Windows needs a shell, which the quality profile forbids. Running vitest's entry with `node` avoids it. The JSON reporter gives the per-file times | Parse vitest's text output. Rejected: the text format is not a contract |
| DEC-08 | FR-07, US-03 | `.agents/rules/tests.md` states the 120 s budget (target 60 s), the in-process default, the allowed reasons for a process-starting test, the smoke-set limit for e2e, and `tests/bench/` for benchmarks. The `AGENTS.md` Commands section lists `test:bench` and `test:budget`, and the Project constraints no longer present e2e as the default way to test behavior | FR-07 | — |
| DEC-09 | NFR-02 | Coverage keeps the 80% thresholds and `exclude: []`. Moving the benchmarks out lowers the default-run coverage of `src/infrastructure/diagnostics/*-sampler.ts` and `overhead-measurer.ts`; the global thresholds still hold (94.5% statements at the prd-12 review). Those files stay out of the exclusion list. If a threshold drops below 80%, the task adds in-process unit tests with fakes, not exclusions | NFR-02 forbids adding `src` files to the exclusions | — |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `vitest.config.ts` | modified | Default lanes without `tests/bench/**`; worker constants (DEC-06) | CMP-02 |
| CMP-02 | `tests/test-lanes.ts` | modified | Process lane equal to the DEC-04 list; serial lane holds only what still needs a single fork; markers per DEC-05 | — |
| CMP-03 | `vitest.bench.config.ts`, `tests/bench/` | new | Benchmarks and timing acceptance in one fork (DEC-01) | — |
| CMP-04 | `src/cli/commands/init.ts:CommandEnv`, `src/cli/commands/doctor.ts:runDoctor` | modified | Optional injected overhead measurer (DEC-02) | — |
| CMP-05 | `tests/helpers/delegated-world.ts:runCli` and a fake measurer helper | modified, new | In-process CLI without process sampling | CMP-04 |
| CMP-06 | `tests/e2e/` smoke files | new, deleted | Built-CLI smoke per command and hook round trips (DEC-03) | — |
| CMP-07 | In-process integration tests | new, modified | Scenarios moved out of e2e and out of the process lane | CMP-05 |
| CMP-08 | `scripts/check-test-budget.ts` | new | Budget check (DEC-07) | CMP-01 |
| CMP-09 | `package.json` scripts | modified | `test:bench`, `test:budget`, `release:check` | CMP-03, CMP-08 |
| CMP-10 | `.agents/rules/tests.md`, `AGENTS.md` | modified | Rules and commands (DEC-08) | — |

Flow:
- `npm test` and `npm run coverage` run the default config: the parallel lane, then the shrunk process lane, then whatever stays serial.
- `npm run test:bench` runs only `tests/bench/`.
- `npm run test:budget` runs the default config with the JSON reporter, then reports and gates.
- `release:check` runs `coverage`, `test:bench`, `test:budget`, and `package:smoke`.

## Contracts and data

- `CommandEnv` (`src/cli/commands/init.ts`) adds `overheadMeasurer?: OverheadMeasurer`, using the existing port type that `diagnoseProject` takes. It is internal to the CLI: no user-visible flag, schema, or exit-code change.
- New npm scripts:
  - `test:bench`: `vitest run --config vitest.bench.config.ts`;
  - `test:budget`: `tsx scripts/check-test-budget.ts`.
- `release:check` order: `schemas:check`, `dependencies:check`, `build`, `typecheck`, `lint`, `coverage`, `test:bench`, `test:budget`, `package:smoke`.
- Budget check output: the first line is `Test run: <seconds>s wall (budget 120s)`, followed by `Slowest files:` and ten lines of `<seconds>s <path>`. The exit code is 0 within the budget and 1 when it fails or exceeds it, with `[ERROR] TEST_BUDGET_EXCEEDED: ...` or `[ERROR] TEST_RUN_FAILED: ...` on stderr. These are developer scripts, outside `cli-output.md`, which governs the product CLI, but they follow its labels.

## Errors, security, and recovery

- Errors and edges:
  - The budget script fails when `dist/` is missing, because e2e smoke and hook tests import built assets. Its message names `npm run build`.
  - A JSON report that fails to parse is a `TEST_RUN_FAILED` with the path.
- User files and sensitive data: none. Tests keep using temporary directories.
- Concurrency: raising workers may expose shared-state tests. Any shared fixture directory found by NFR-05 is fixed in the test, never by a retry.
- Rollback: revert the task commits. Benchmarks run unchanged from `tests/bench/` in either state.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| 1. Bench split (DEC-01) | — | `npm run test:bench` passes the six suites; `npm test` lists none of them |
| 2. Injected measurer (DEC-02) | — | In-process doctor tests run without sampling; the built doctor smoke still samples |
| 3. E2E smoke set and moved scenarios (DEC-03) | 2 | `tests/e2e/` holds the four smoke files; the mapping rows are covered |
| 4. In-process integration and lanes (DEC-04, DEC-05) | 2, 3 | `PROCESS_LANE_FILES` equals the DEC-04 list; lane tests pass |
| 5. Budget script and scripts (DEC-07) | 1 | `npm run test:budget` prints the report and passes |
| 6. Workers (DEC-06) | 1-5 | Three consecutive `npm test` runs pass within budget |
| 7. Rules and AGENTS.md (DEC-08) | 1-6 | Text describes the new scripts and rules |

## Test approach

- Profile: Node.js 20+ and TypeScript strict ESM per `package.json` and `tsconfig.json`; Vitest 3.2.7 with v8 coverage; commands from `AGENTS.md` (`npm run build`, `typecheck`, `lint`, `test`, `coverage`) plus the new `test:bench` and `test:budget`. Runtime surfaces touched: the `doctor` CLI command (CMP-04) and the test infrastructure only. Hook code and in-process plugins are unchanged.
- End-to-end: the built CLI and built hook assets against temporary fixture repositories, limited to the smoke set of DEC-03.
- Platforms: the budget and stability evidence is recorded on Windows 11 under PowerShell (NFR-01); Git Bash numbers are supplementary. The shell tests in the process list keep their current Windows (PowerShell, Git Bash) and POSIX coverage (NFR-04). Linux and macOS stay unverified locally, as in prd-12.
- Prerequisites: `npm run build` before `npm test`, `test:bench`, and `test:budget`, because smoke, hook, and bench tests use `dist/`.
- Manual acceptance: none beyond the recorded runs of TC-01 and TC-08.

### E2E scenario mapping (FR-04, NFR-03)

| Current e2e file | Destination |
| --- | --- |
| `e2e-01-02` (Claude install, manifest version, two harnesses) | `e2e-init` smoke covers the Claude install. The manifest version and multi-harness detection move to in-process `tests/integration/init-detection.test.ts` |
| `e2e-03-04` (no harness warning, 3-run byte idempotency) | in-process `init-detection` |
| `e2e-05-06` (partial install on invalid input, dry-run equals applied) | in-process `tests/integration/init-plan.test.ts` |
| `e2e-07-08` (init/remove without support files, `--remove-state` rejected, doctor JSON schema) | `e2e-remove` smoke (remove deletes owned files); `e2e-doctor` smoke (schema); the rest is already in process in `init-snapshot` and `removal-service` |
| `e2e-09` (quick-start time targets) | `tests/bench/` (DEC-01) |
| `e2e-10` (install, idempotency, symlink per shell) | install per shell stays as a process test (`tests/integration/cli-shells.test.ts`, shell quoting); idempotency and symlink go to in-process `init-detection` and `symlinked-harness-config` |
| `e2e-antigravity-registration` | in-process `tests/integration/antigravity-lifecycle.test.ts`; the hook round trip in `e2e-hook-round-trips` |
| `e2e-asset-currency` | already in process: `doctor-asset-currency`; extend with the rewrite case |
| `e2e-brake` (GREEN to CRITICAL, every call completes) | in-process `runtime-light-mode` through `runProcessHook`; Claude Code round trip in smoke |
| `e2e-codex-hook-root` (hook from a subdirectory, outside-git warning) | `tests/integration/codex-hook-root.test.ts`: the CLI runs in process; the registered command still runs from a subdirectory through the shell (process, shell quoting, DEC-EXC-01) |
| `e2e-debug-mode` | in-process `tests/integration/debug-mode-lifecycle.test.ts` |
| `e2e-light-mode` (footprint, generic actions, flags round trip, removed flags) | in-process `init-snapshot` and `runtime-light-mode` |
| `e2e-linked-project-root` | in-process `linked-project-root` |
| `e2e-minified-config` | in-process `tests/integration/minified-config.test.ts` |
| `e2e-remove-invalid-config` | in-process `tests/integration/remove-invalid-config.test.ts` |
| `e2e-simulated-usage` (reading accuracy per harness; installed Claude hook with repeated ledgers) | in-process `tests/integration/simulated-usage.test.ts` through `runProcessHook`; the Claude Code round trip in smoke |
| `e2e-statusline-bridge` (path with spaces and accents; PowerShell doctor warning) | `tests/integration/statusline-bridge-lifecycle.test.ts`: the CLI and doctor run in process; the built bridge pipeline stays a process (bridge through the user shell, DEC-EXC-01) |
| `e2e-statusline-shell` | process test, moved to `tests/integration/statusline-shell.test.ts` (shell quoting) |
| `e2e-support-limitations` | in-process `tests/integration/support-limitations.test.ts` |
| `e2e-symlinked-harness-config` | in-process `symlinked-harness-config` |
| `e2e-user-hook-preservation` | in-process `tests/integration/user-hook-preservation.test.ts` |
| `auto-restart` (install, opt-out, removal cases) | in-process `auto-restart-removal` and `auto-restart-user-settings` |

A destination named "in process" may extend an existing file instead of creating a new one when the scenario fits. The task records the final file per row in its handoff.

### Tests allowed to start a process (FR-05, DEC-04)

| File | Reason |
| --- | --- |
| `tests/e2e/e2e-init`, `e2e-doctor`, `e2e-remove`, `e2e-hook-round-trips` | smoke set over built artifacts |
| `tests/integration/cli-shells.test.ts`, `statusline-shell.test.ts`, `codex-hook-command-shells.test.ts`, `codex-hook-root.test.ts` | shell quoting (PowerShell, Git Bash, POSIX) |
| `tests/integration/statusline-bridge.test.ts`, `statusline-bridge-previous.test.ts`, `statusline-bridge-lifecycle.test.ts` | the bridge runs the previous status line command through the user's shell |
| `tests/integration/node-process-runner.test.ts` | child process timeout and kill |
| `tests/integration/runtime-host-process.test.ts` | the hook process boundary: stdin limit, stdout response, exit code |
| `tests/integration/runtime-parallel-turns.test.ts` | concurrency between hook processes writing one ledger |
| `tests/integration/package-contents.test.ts`, `package-assets.test.ts` | packaging (`npm pack`, built assets) |
| `tests/unit/git-capability.test.ts`, `tests/unit/process-capability.test.ts` (outside the lane: no process marker in the test source) | capability probes that other tests use to skip; one small process each (DEC-EXC-01) |

Every other file in `tests/integration/` and `tests/unit/` runs in process. The lane list has the 12 integration files above (DEC-EXC-01). The `runtime-*` harness tests switch from `runInstalledHook` to `runProcessHook` with the adapter and an in-memory `ProcessHookContext`.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-01, NFR-01, OBJ-01 | manual (recorded) | `npm test` on Windows PowerShell after `npm run build` | Passes in ≤ 120 s wall | `npm run test:budget` |
| TC-02 | FR-02, NFR-02, OBJ-02 | manual (recorded) | `npm run coverage` on Windows PowerShell | Passes in ≤ 120 s with all four thresholds ≥ 80% | `npm run coverage`, timed |
| TC-03 | FR-01, FR-03 | unit | The default config's file list contains no `tests/bench/` file, and the bench config contains exactly the six moved suites | Both lists match | `tests/unit/test-lanes.test.ts` |
| TC-04 | FR-03, OBJ-03 | integration (recorded) | `npm run test:bench` | The six suites pass with their original limits | `npm run test:bench` |
| TC-05 | FR-04 | unit | `tests/e2e/` holds only the four smoke files | Directory listing matches | `tests/unit/test-lanes.test.ts` |
| TC-06 | FR-05, DEC-04, DEC-05 | unit | `PROCESS_LANE_FILES` equals the DEC-04 list, and every file with a process marker is in it | Lane test passes | `tests/unit/test-lanes.test.ts` |
| TC-07 | FR-06 | unit | The budget evaluator over fake reports: within budget, over budget, failed run, and the top ten ordering | Exit codes 0/1 and the printed lines | `tests/unit/test-budget.test.ts` |
| TC-08 | NFR-05 | manual (recorded) | Three consecutive `npm test` runs on Windows PowerShell | All pass, no retry, each ≤ 120 s | `npm run test:budget` ×3 |
| TC-09 | DEC-02 | integration | `runCli` doctor uses the fake measurer; the built `doctor` smoke reports measured overhead | No sampling in process; smoke shows `sampleCount > 0` | `tests/integration/doctor-light-mode.test.ts`, `tests/e2e/e2e-doctor.test.ts` |
| TC-10 | NFR-03 | review | Every row of the mapping table has a test at its destination | Handoffs list the final test per row | handoffs |
| TC-11 | FR-07 | review | `tests.md` and `AGENTS.md` state the budget, scripts, and rules | Text present | review |

## Quality profile

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `"${RG[@]}" ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | — |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `"${RG[@]}" '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-03 | empty `catch` or `.catch(() => {})` | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | — |
| QA-04 | `exec`, `execSync`, or `shell: true` | blocking | `"${RG[@]}" '\bexecSync\(\|\bexec\(\|shell:\s*true' "${files[@]}"` | — (the budget script spawns `node` without a shell, DEC-07) |
| QA-05 | `core` importing `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-06 | file above 100 lines | reservation | `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | — |
| QA-07 | 4+ parameters in one declaration | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"` | — |

- Verification scope: the TypeScript files in each task diff, including tests, scripts, and configs.
- Escalation trigger: 8+ reservation hits, a touched file above 200 lines, or duplication in 3+ places.

### Terrain baseline

Measured at `cca3a29`.

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `vitest.config.ts` | 54 | 1 | — | 0 | none | recorded |
| `tests/test-lanes.ts` | 79 | 10 | — | 0 | structural: 10 exports | recorded; the task adds no export (it may remove `SERIAL_LANE_FILES` users only if the serial lane empties) |
| `tests/unit/test-lanes.test.ts` | 77 | 0 | — | 0 | none | recorded |
| `tests/helpers/delegated-world.ts` | 42 | 9 | — | 0 | none | recorded |
| `src/cli/commands/doctor.ts` | 51 | 1 | — | 0 | none | recorded |
| `src/cli/commands/init.ts` | 64 | 2 | — | 0 | none | recorded |
| `package.json` | 55 | — | — | — | none | recorded |

- Test files moved or rewritten keep their measured state: a moved file is not a new file, and a pre-existing hit in it (for example `runtime-overhead.test.ts` at 107 lines, `process-hook-host.test.ts` at 105) stays recorded, not a task finding.
- Preparatory refactoring: not recommended. Only `tests/test-lanes.ts` crosses a threshold (10 exports), and the feature edits its lists without adding an export.

## Observability and rollout

- Signals: the `test:budget` report (wall time and slowest files); `test:bench` results in `release:check`.
- Migration and compatibility: none; developer scripts only (prd-12 DEC-PD-03).
- Rollout and rollback: tasks land in sequence order; each keeps `npm test` green. Revert per task.

## Risks and open items

- Risk: in-process tests can share module state that separate processes isolated, such as the `process.stdout` spies in `runCli` or module-level caches. Probability medium, impact medium. Mitigation: `runCli` restores spies in `finally`, and each moved test uses its own temporary directory. NFR-05 runs catch leaks.
- Risk: the budget is machine-dependent (PRD assumption). The check reports the time, and the recorded evidence names the machine.
- Risk: raising workers can make the process lane flaky on Windows (spawn contention). Mitigation: DEC-06 picks the global worker count by three-run measurement; Vitest 3.2.7 offers no separate process-lane cap (DEC-EXC-01). Runs under heavy concurrent load on the machine exceeded the budget (prd-13 T07 handoff).
- Open item: none.

## Relevant files

- Modify: `vitest.config.ts`, `tests/test-lanes.ts`, `tests/unit/test-lanes.test.ts`, `package.json`, `src/cli/commands/init.ts`, `src/cli/commands/doctor.ts`, `tests/helpers/delegated-world.ts`, the `tests/integration/runtime-*` harness suites, `tests/integration/{doctor-asset-currency,linked-project-root,symlinked-harness-config,auto-restart-removal,auto-restart-user-settings,init-snapshot,runtime-light-mode,codex-hook-command-shells,statusline-bridge}.test.ts`, `.agents/rules/tests.md`, `AGENTS.md`
- Create: `vitest.bench.config.ts`, `tests/bench/` (moved suites), `tests/e2e/{e2e-init,e2e-doctor,e2e-remove,e2e-hook-round-trips}.test.ts`, the in-process destinations of the mapping, `scripts/check-test-budget.ts`, `tests/unit/test-budget.test.ts`, a fake measurer helper under `tests/helpers/`
- Delete: the e2e files replaced by the mapping
