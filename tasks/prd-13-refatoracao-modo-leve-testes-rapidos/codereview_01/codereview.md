# Code review report — prd-13-refatoracao-modo-leve-testes-rapidos (Fast test suite)

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `cca3a29..uncommitted worktree` (HEAD = `cca3a29`; staged, unstaged, and untracked changes, excluding the pre-existing untracked `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/`)
- Previous review: `—`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/prd.md` | read; sha256 `e3d411c7…0450386` equals `checkpoint.json#approved_sources` |
| TechSpec | `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/techspec.md` | read; sha256 `743f3e5e…b5187c` equals `checkpoint.json#approved_sources` |
| Manifest | `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/tasks.md` | read; sha256 `291bb70d…9c629c` differs from the approved `05201fd6…10978` (untracked file; State and Problems sections are updated during execution, see limitations) |
| Handoffs | `done/task_01.md` … `done/task_07.md` | read; all seven present, every work item checked, handoff filled |
| Workflow | `workflow.md` | read; DEC-HIL-01, DEC-HIL-02 |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter (header, next step brief, open threads, `on-run` entries) |
| Implementation | `git diff -M cca3a29` plus untracked files: 64 TypeScript files, `package.json`, `AGENTS.md`, `.agents/rules/tests.md` | delimited |

Snapshot header check: `git_head` `cca3a29` equals `git rev-parse HEAD`; `worktree` matches `git status --porcelain`; `covers_through` T01–T07 matches the manifest State. No suspect entries.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | `npm test` without benchmarks, ≤ 120 s | `vitest.config.ts:22` excludes `BENCH_FILE_PATTERN`; `tests/test-lanes.ts` lists no bench file | `tests/unit/bench-config.test.ts` (TC-03) | conformant | `npx vitest list --filesOnly`: 199 files, 0 under `tests/bench/`; three `npm run test:budget` runs 76.3 / 74.4 / 74.7 s |
| FR-02 | `npm run coverage` ≤ 120 s, four thresholds ≥ 80% | unchanged thresholds, `exclude: []` | `npm run coverage` | conformant | 86.2 s wall, 199 files, 1,055 tests; 93.5% statements, 90.12% branches, 94.03% functions, 93.5% lines |
| FR-03 | Separate bench script in `release:check`; original limits | `vitest.bench.config.ts`; `package.json` `test:bench`, `release:check` | `npm run test:bench` (TC-04) | conformant | 6 files pass in 82.3 s; the six moved files have 0/0 line changes except one import in `tests/bench/e2e-09.test.ts` |
| FR-04 | E2E reduced to the smoke set; removed scenarios mapped | `tests/e2e/e2e-{init,doctor,remove,hook-round-trips}.test.ts` | `tests/unit/e2e-smoke-set.test.ts` (TC-05) | conformant | `tests/e2e/` holds the four smoke files plus `cli-runner.ts` and `shell-runner.ts`; mapping rows in `done/task_03.md#Handoff` and `done/task_04.md#Handoff` |
| FR-05 | Process-starting tests limited to the TechSpec list | `tests/test-lanes.ts:6-19` | `tests/unit/test-lanes.test.ts:51-69` (TC-06) | non-conformant | 12 lane files against the 10 of `techspec.md:146-156`; two unit tests start processes outside the lane (CR-02) |
| FR-06 | Budget check reports wall time and the ten slowest files, fails when the run fails or exceeds 120 s | `scripts/test-budget.ts`, `scripts/check-test-budget.ts` | `tests/unit/test-budget.test.ts` (TC-07) | non-conformant | Report and the over-budget gate work; a run Vitest fails through unhandled errors still exits 0 (CR-01) |
| FR-07 | Rules and `AGENTS.md` | `.agents/rules/tests.md:41-55`, `AGENTS.md:31,37,48-49` | review (TC-11) | conformant | Budget, in-process default, allowed process reasons, smoke set, `tests/bench/`, and both scripts are stated; e2e is no longer the default |
| NFR-01 | ≤ 120 s on Windows PowerShell | `vitest.config.ts:9` `MAX_WORKERS = 6` | TC-01 | conformant | 76.3 / 74.4 / 74.7 s, PowerShell, 12 logical CPUs |
| NFR-02 | 80% thresholds kept, no new exclusion | `vitest.config.ts` coverage block unchanged | TC-02 | conformant | totals above; no `src` file excluded |
| NFR-03 | No behavior loses all coverage | moved files keep their assertions (`git diff -M` shows runner-call changes only) | TC-10 | conformant | every mapping row has a destination file; plugin round trips in `tests/integration/runtime-in-process.test.ts:12-14,77-79` load `dist/assets/runtime/*` |
| NFR-04 | Shell coverage kept | `tests/integration/cli-shells.test.ts:8`, `statusline-shell`, `codex-hook-command-shells` | process lane | conformant | PowerShell and Git Bash on Windows, `bash`/`native` on POSIX; Linux and macOS not run (limitation) |
| NFR-05 | Three runs, no flake | — | TC-08 | conformant | three consecutive passing runs, no retry configured |
| DEC-01, DEC-09 | Bench split; no new exclusions | see FR-01, FR-03 | TC-03, TC-04 | conformant | as above |
| DEC-02 | Injected measurer | `src/cli/commands/init.ts:20`, `src/cli/commands/doctor.ts:37` | `tests/integration/doctor-light-mode.test.ts` (new describe), `tests/e2e/e2e-doctor.test.ts` | conformant | in-process doctor reports the fake `sampleCount`/p95; built doctor asserts `sampleCount > 0` (TC-09) |
| DEC-03 | Smoke set and mapping | see FR-04 | TC-05, TC-10 | conformant with a recorded deviation | In-process plugin round trips stay in `runtime-in-process.test.ts` rather than `e2e-hook-round-trips` (`tasks.md#Problems and solutions`) |
| DEC-04, DEC-05 | Process list; markers | `tests/test-lanes.ts` | TC-06 | non-conformant (DEC-04), conformant (DEC-05) | CR-02; markers `'/cli/commands/'` and `'composition-root'` removed |
| DEC-06 | Workers by measurement; process-lane cap | `vitest.config.ts:9` | `tests/unit/test-lanes.test.ts` | partial | per-project `maxForks` is impossible in Vitest 3.2.7 (`node_modules/vitest/dist/chunks/reporters.d.BuRON0I0.d.ts:2355`: project forks options are `singleFork` and `isolate` only); see limitations |
| DEC-07 | Budget script contract | `scripts/check-test-budget.ts` | TC-07 | partial | CR-01 |
| DEC-08 | Rules and commands text | see FR-07 | TC-11 | conformant | as above |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` architecture (core never imports infrastructure or cli) | OK | QA-05 over `src/core/`: no changed core file, no hit |
| `.agents/rules/code-standards.md`, `javascript-typescript.md` | OK | `rtk proxy npx eslint .` exit 0; `npm run typecheck` exit 0 |
| `.agents/rules/node.md` (dependency injection, no shell) | OK | `overheadMeasurer` injected through `CommandEnv`; `scripts/check-test-budget.ts:15` spawns `process.execPath` without a shell |
| `.agents/rules/tests.md` (FIRST, temp dirs, IDs in names) | OK | new tests cite prd-13 IDs and clean their temporary directories; one in-process side effect noted under optional improvements |
| `.agents/rules/cli-output.md` | N/A | no user-visible output change; `src/cli/main.ts:26-31` only accepts test overrides |
| `.agents/rules/harness-adapters.md`, `file-changes.md` | N/A | no adapter or user-file logic changed |

## Quality profile

Scope: the 64 TypeScript files in the reviewable set (`git diff --name-only -M cca3a29 --diff-filter=AMR` plus untracked `*.ts`).

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | `rg -n -H -P ':\s*any\b\|\bas any\b\|<any>'` | 0 | OK |
| QA-02 | disable comments | blocking | `rg -n -H '@ts-ignore\|@ts-nocheck\|eslint-disable'` | 0 | OK |
| QA-03 | empty catch | blocking | `rg -n -H -U '…\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)'` | 0 new of 3 | pre-existing: `symlinked-harness-lifecycle.test.ts:24,48` and `linked-project-root-lifecycle.test.ts:40`, moved files whose base versions (`tests/e2e/e2e-symlinked-harness-config.test.ts`, `e2e-linked-project-root.test.ts`) carry the same 2 + 1 hits; `techspec.md:203` |
| QA-04 | `exec`, `execSync`, `shell: true` | blocking | `rg -n -H '\bexecSync\(\|\bexec\(\|shell:\s*true'` | 0 | OK |
| QA-05 | core importing infrastructure or cli | blocking | `rg` over `src/core/` files in scope | 0 (no core file in scope) | OK |
| QA-06 | file above 100 lines | reservation | `wc -l` per file | 0 new of 1 | pre-existing: `tests/bench/runtime-overhead.test.ts` 105 lines, moved unchanged (Terrain baseline) |
| QA-07 | 4+ parameters | reservation | `rg -n -H -P '\((?:[^(),]+,){3,}…'` | 0 | OK |

- Terrain baseline: applied from TechSpec (`techspec.md#terrain-baseline` and line 203 for moved files).
- Hits discounted by baseline: 4 (3 QA-03, 1 QA-06).
- Reservations accumulated in the feature: 0 new.
- Suggested escalation: no trigger fired (0 reservation hits; no touched file above 200 lines; no duplication in 3+ places found).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 bench split, `release:check` order | YES | `package.json` `release:check`: … `coverage`, `test:bench`, `test:budget`, `package:smoke` (matches `techspec.md#contracts-and-data`) |
| DEC-02 injected measurer | YES | `src/cli/commands/doctor.ts:37`; `tests/helpers/fake-overhead-measurer.ts`; `delegated-world.ts:runCli`, `statusline-world.ts`, `in-process-cli.ts` pass it |
| DEC-03 smoke set | PARTIAL | plugin round trips kept in `tests/integration/runtime-in-process.test.ts` (built assets, no process); the behavior is covered, the file placement deviates |
| DEC-04 process list | NO | CR-02 |
| DEC-05 markers | YES | `tests/test-lanes.ts` `PROCESS_MARKERS` |
| DEC-06 workers | PARTIAL | `MAX_WORKERS = 6`; no process-lane cap (Vitest limitation proven above); 6 is the only value with three recorded runs (`done/task_07.md#Handoff`) |
| DEC-07 budget script | PARTIAL | output lines, labels, missing-`dist/` message, and timeout match; child exit code ignored (CR-01) |
| DEC-08 text | YES | `.agents/rules/tests.md:41-55`; `AGENTS.md` |
| DEC-09 coverage exclusions | YES | `exclude: []`; totals ≥ 80% |
| `CommandEnv.overheadMeasurer?: OverheadMeasurer` contract | YES | `src/cli/commands/init.ts:20` |
| Budget output contract (`Test run: <s>s wall (budget 120s)`, `Slowest files:`, ten lines) | YES | `scripts/test-budget.ts` `evaluateBudget`; observed in the three runs |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | six suites in `tests/bench/`; bench run reproduced (6 files pass) |
| T02 | `done/task_02.md` | COMPLETE | injected measurer; TC-09 in-process describe present |
| T03 | `done/task_03.md` | COMPLETE | `e2e-init`, `e2e-remove`, 11 mapping rows with final files; `main()` override added |
| T04 | `done/task_04.md` | COMPLETE | `e2e-doctor`, `e2e-hook-round-trips`, 11 mapping rows; DEC-03 deviation recorded |
| T05 | `done/task_05.md` | COMPLETE (with CR-02) | six `runtime-*` suites in process; 12-file process lane |
| T06 | `done/task_06.md` | COMPLETE (with CR-01) | evaluator and runner split; 7 unit tests |
| T07 | `done/task_07.md` | COMPLETE | `MAX_WORKERS = 6`; rules and `AGENTS.md`; recorded runs; flake fix in `claude-mod-restart.test.ts:72` waits for the async record |

## Executed validations

- Profile and scope: test infrastructure plus the `doctor` CLI wiring and `main()` override; e2e limited to the DEC-03 smoke set; no CLI QA per DEC-HIL-02, with the reviewer repeating the recorded runs.
- Validated state: the uncommitted worktree on `cca3a29`; Windows 11 Pro 10.0.26200, PowerShell 7, Node 24.19.0, Vitest 3.2.7, 12 logical CPUs. At the start, 18 node/claude processes were running and CPU load was 14%.
- Reused evidence: none for pass/fail; handoff timings used only as context.
- Manual acceptance: TC-01, TC-02, TC-08 repeated by this reviewer (below).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | prerequisite |
| `npm run test:budget` ×3, PowerShell, consecutive | passed: 76.3 s, 74.4 s, 74.7 s, exit 0 each | FR-01, FR-06, NFR-01, NFR-05, TC-01, TC-08 |
| `npm run coverage`, PowerShell, timed | passed: 86.2 s wall, 199 files, 1,055 tests, 93.5 / 90.12 / 94.03 / 93.5 % | FR-02, NFR-02, DEC-09, TC-02 |
| `npm run test:bench` | passed: 6 files, 82.3 s | FR-03, DEC-01, TC-04 |
| `npx vitest list --filesOnly` (default and bench configs) | 199 default files, none under `tests/bench/`; bench lists exactly the six suites | FR-01, TC-03 |
| `npm run typecheck` | passed | all |
| `rtk proxy npx eslint .` | passed (empty output, exit 0) | all |
| Quality profile QA-01 to QA-07 | no new hit | quality profile |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Low | FR-06, DEC-07 ("exits non-zero when the run fails") | `scripts/check-test-budget.ts:42` — `await runVitest(reportPath);` discards the exit code that `runVitest` resolves at line 18; the verdict comes only from the report's `success`, which Vitest 3.2.7 computes from failed suites and tests alone (`node_modules/vitest/dist/chunks/index.VByaPkjc.js:1711`), not from unhandled errors | A run that Vitest fails through an unhandled error or rejection (non-zero exit, `success: true`) passes `test:budget` with exit 0, so the gate can report green on a failing `npm test` | Keep the resolved exit code and return `TEST_RUN_FAILED` when it is non-zero or `null` (killed), even with `success: true`; extend `evaluateBudget` input or the runner and cover it in `tests/unit/test-budget.test.ts` |
| CR-02 | Low | FR-05, DEC-04, TC-06 | `tests/test-lanes.ts:6-19` lists 12 files; `techspec.md:146-156` lists 10. The additions `codex-hook-root.test.ts` and `statusline-bridge-lifecycle.test.ts` contradict the mapping rows (`techspec.md:130,137`), which put the process parts in the already-listed `codex-hook-command-shells` and `statusline-bridge`. `tests/unit/test-lanes.test.ts:67-68` names its check "keeps the process lane equal to the TechSpec list" while asserting a different list. `tests/unit/git-capability.test.ts` and `process-capability.test.ts` start processes outside the lane, against `techspec.md:158` ("Every other file in tests/unit/ runs in process") | The approved list and the code disagree with no HIL decision; the lane test asserts a list the TechSpec does not hold, so the TC-06 guard no longer traces to its source | Either move the process parts into `codex-hook-command-shells` and `statusline-bridge` (and drop the two files from the lane), or record an HIL decision that amends DEC-04 with the two files and the two capability probes; then align the TC-06 test name and list with the approved source |

### Optional improvements

- `src/infrastructure/harnesses/claude-code/statusline-diagnostics.ts:62` builds `new NodeProcessRunner()` when `context.runner` is absent, and `runCli`, `runInProcessCli`, and `statusline-world` inject no runner, so in-process `doctor` runs with a status line bridge still spawn `git check-ignore`. Injecting a fake runner in those helpers, like the measurer, would complete DEC-02's intent. Not blocking: the budget holds.
- `tests/unit/test-lanes.test.ts:51-64` duplicates `PROCESS_LANE_FILES` verbatim; a check derived from the TechSpec table or from process markers would catch drift that a copied list cannot.

## Limitations and open items

- DEC-06 deviation (no per-project `maxForks`) is forced by Vitest 3.2.7 and proven, but no HIL decision accepts it; the TechSpec risk mitigation ("caps the process lane separately") does not exist. Required decision: accept the global `MAX_WORKERS = 6` as the only cap, or choose another mechanism.
- DEC-03 placement deviation (plugin round trips in `runtime-in-process.test.ts`) is recorded in `tasks.md` without an HIL decision; behavior is covered, so it does not affect the status by itself.
- `tasks.md` sha256 differs from the approved hash in `checkpoint.json`; the file is untracked, so the delta cannot be reconstructed from Git. The PRD and TechSpec hashes match. Assumed to be the expected State and Problems updates.
- Budget timings depend on machine load (snapshot `O-04`; earlier runs under load exceeded 120 s). This reviewer's runs had light concurrent load.
- Linux and macOS were not run; POSIX shell paths of `cli-shells`, `statusline-shell`, and `codex-hook-command-shells` are unverified locally.
- The snapshot was under 8 KiB and was read whole; its `Decisions`, `Code map`, and `Learnings` entries were not used as evidence.
- ContextBrake telemetry reached RED during this review; as a delegated reviewer this session does not write the snapshot or run the session pause (contract).

## Conclusion

The feature meets its measurable goals on this machine: `npm test` runs in about 75 s three times in a row, `npm run coverage` in 86 s with all thresholds above 80%, benchmarks run only in `test:bench` with their original limits, `tests/e2e/` holds only the smoke set, and lint and typecheck are clean with no new quality-profile hit. The review is REJECTED on two Low findings. CR-01: the budget gate ignores Vitest's exit code, so a run that fails through unhandled errors still passes, which does not meet DEC-07. CR-02: the process lane and its guard test diverge from the approved DEC-04 list without an HIL decision. Both have small, proven corrections, or for CR-02 a TechSpec amendment, and the DEC-03 and DEC-06 deviations need HIL acknowledgment in the same round.
