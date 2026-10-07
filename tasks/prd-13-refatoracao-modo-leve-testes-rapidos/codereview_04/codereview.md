# Code review report — prd-13-refatoracao-modo-leve-testes-rapidos (Fast test suite)

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `cca3a29..uncommitted worktree` (HEAD = `cca3a29`; staged, unstaged, and untracked changes, excluding the pre-existing untracked `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/`), including correction rounds 1 (`codereview_01/done/task_08.md` to `task_10.md`), 2 (`codereview_02/done/task_11.md`), and 3 (`codereview_03/done/task_12.md`)
- Previous review: `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/codereview_03/codereview.md`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/prd.md` | read; sha256 `e3d411c7…e450386` equals `checkpoint.json#approved_sources` (DEC-HIL-01) |
| TechSpec | `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/techspec.md` | read; sha256 `e26b4238…7b784c500` equals `approved_sources` (DEC-EXC-01); DEC-03, DEC-04, DEC-06 carry the DEC-EXC-01 amendments |
| Manifest | `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/tasks.md` | read; sha256 `291bb70d…02819c629c` equals `approved_sources` (DEC-EXC-01); State T01–T07 `[x] done`, each link resolves to `done/task_0N.md` |
| Handoffs | `done/task_01.md` … `task_07.md`; `codereview_01/done/task_08.md` … `task_10.md`; `codereview_02/done/task_11.md`; `codereview_03/done/task_12.md` | read; every work item checked, handoffs filled; no task left at a report root |
| Workflow | `workflow.md` | read; DEC-HIL-01, DEC-HIL-02, DEC-EXC-01, DEC-EXC-02, DEC-RES-01 |
| Checkpoint | `checkpoint.json` | read; `correction_round: 3`, `decisions_to_read` includes `DEC-RES-01`, `active_work` names this review (`codereview_04`) |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter (header, next step brief, open threads, `on-run` entries) |
| Implementation | `git diff -M cca3a29` plus untracked files: 69 TypeScript files, `package.json`, `AGENTS.md`, `.agents/rules/tests.md` | delimited |

Round 3 scope: `/usr/bin/find . -newer codereview_03/codereview.md -type f` (excluding `node_modules`, `.git`, `dist`, `coverage`, and `tasks/prd-11*`) lists only `.agents/rules/tests.md`, `codereview_01/done/task_10.md`, `codereview_03/done/task_12.md`, `workflow.md`, `checkpoint.json`, `checkpoint.previous.json`, `context-snapshot.md`, and three `.context-brake/runtime/sessions/claude-code/*.jsonl` telemetry files. No file under `src/`, `tests/`, `scripts/`, the Vitest configs, or `package.json` changed after codereview_03, and codereview_03 recorded the same for round 2 against codereview_02. The code under review is therefore the code codereview_02 measured. The 69-file TypeScript scope equals the codereview_02 and codereview_03 scope.

Snapshot header check: `git_head` `cca3a29` equals `git rev-parse HEAD`; `worktree` matches `git status --porcelain`; `covers_through` ("codereview_03 round 3 T12 done") matches `codereview_03/done/task_12.md`. The next step brief is stale (it still describes codereview_01); the header `next_step` is current. The file is under 8 KiB and was read whole; Decisions, Code map, and other Learnings were not used as evidence.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | `npm test` without benchmarks, ≤ 120 s | `vitest.config.ts` excludes `BENCH_FILE_PATTERN`; `tests/test-lanes.ts` lists no bench file | `tests/unit/bench-config.test.ts` (TC-03) | conformant | this review: `npx vitest list --filesOnly` lists 199 files, 0 under `tests/bench/`; time: codereview_02 runs 88.4 / 93.9 / 115.6 s on the same code |
| FR-02 | `npm run coverage` ≤ 120 s, four thresholds ≥ 80% | thresholds 80 and `exclude: []` in `vitest.config.ts` | `npm run coverage` (TC-02) | conformant | reused from codereview_02 on the same code: 107.7 s wall; 93.5% statements, 90.21% branches, 94.03% functions, 93.5% lines |
| FR-03 | Separate bench script in `release:check`; original limits | `vitest.bench.config.ts`; `package.json:29,33` | `npm run test:bench` (TC-04) | conformant | this review: bench config lists exactly the six moved suites; `release:check` runs `coverage && test:bench && test:budget && package:smoke`; pass result reused from codereview_01 through the unchanged-code chain |
| FR-04 | E2E reduced to the smoke set; removed scenarios mapped | `tests/e2e/e2e-{init,doctor,remove,hook-round-trips}.test.ts` | `tests/unit/e2e-smoke-set.test.ts` (TC-05) | conformant | `tests/e2e/` holds the four test files plus the `cli-runner.ts` and `shell-runner.ts` helpers; mapping rows in `done/task_03.md#Handoff`, `done/task_04.md#Handoff`; amended rows `techspec.md:130,137` |
| FR-05 | Process-starting tests limited to the TechSpec list | `tests/test-lanes.ts` `PROCESS_LANE_FILES` | `tests/unit/test-lanes.test.ts` (TC-06) | conformant | 12 lane files equal `techspec.md:150-156`; probes allowed at `techspec.md:157` (DEC-EXC-01); lane test passes in this review |
| FR-06 | Budget check reports and fails on failed or slow run | `scripts/check-test-budget.ts`, `scripts/test-budget.ts` | `tests/unit/test-budget.test.ts` (TC-07) | conformant | test passes in this review; scripts unchanged since codereview_02 verified exit-code handling |
| FR-07 | Rules and `AGENTS.md` | `.agents/rules/tests.md:42-54`, `AGENTS.md` (Architecture, Project constraints, Commands) | review (TC-11) | conformant | budget, in-process default, allowed process reasons, smoke set, `tests/bench/`, `test:bench` and `test:budget`; e2e no longer the default; round 3 adds the fake process runner at `tests.md:52` |
| NFR-01 | ≤ 120 s on Windows PowerShell | `vitest.config.ts` `MAX_WORKERS = 6` | TC-01 | conformant | reused: 88.4 / 93.9 / 115.6 s in PowerShell 7.6.6 (codereview_02); small margin, see limitations |
| NFR-02 | 80% thresholds kept, no new exclusion | coverage block unchanged | TC-02 | conformant | `exclude: []`; totals above |
| NFR-03 | No behavior loses all coverage | moved files keep assertions; the fake runner replaces only process calls in in-process command tests | TC-10 | conformant | codereview_02 evidence; test files unchanged since |
| NFR-04 | Shell coverage kept | `cli-shells`, `statusline-shell`, `codex-hook-command-shells`, `codex-hook-root` | process lane | conformant | Windows PowerShell and Git Bash; Linux and macOS not run (limitation) |
| NFR-05 | Three runs, no flake | — | TC-08 | conformant | reused: three consecutive passing runs, exit 0 each, no retry configured (codereview_02) |
| DEC-01, DEC-09 | Bench split; no new exclusions | see FR-01, FR-03 | TC-03, TC-04 | conformant | as above |
| DEC-02 | Injected measurer | `src/cli/commands/init.ts:20`, `src/cli/commands/doctor.ts:37` | `doctor-light-mode.test.ts`, `e2e-doctor.test.ts` (TC-09) | conformant | `env.overheadMeasurer ?? new NodeOverheadMeasurer(...)`; `delegated-world.ts:32`, `in-process-cli.ts:16`, `statusline-world.ts:31` inject `fakeOverheadMeasurer` |
| DEC-03 (amended) | Smoke set; plugin round trips in `runtime-in-process` | see FR-04 | TC-05, TC-10 | conformant | `techspec.md:50` amendment |
| DEC-04 (amended), DEC-05 | 12-file process list and probes; markers | `tests/test-lanes.ts` | TC-06 | conformant | list equal; `'/cli/commands/'` and `'composition-root'` absent from `PROCESS_MARKERS` |
| DEC-06 (amended) | Global `MAX_WORKERS = 6` only | `vitest.config.ts` | `test-lanes.test.ts` | conformant | `techspec.md:53` amendment |
| DEC-07 | Budget script contract | `scripts/check-test-budget.ts`, `scripts/test-budget.ts` | TC-07 | conformant | spawn of `process.execPath` without a shell (QA-04: 0 hits); output contract observed in codereview_02 |
| DEC-08 | Rules and commands text | see FR-07 | TC-11 | conformant | as above |
| codereview_01 correction T10 | Fake process runner in in-process command tests | `tests/helpers/fake-process-runner.ts`; helpers and 7 integration tests | full suite | conformant | authorized by DEC-EXC-02; every direct `runInit`/`runRemove`/`runDoctor`/`dispatchCommand` caller under `tests/` passes `runner: fakeProcessRunner` (grep in this review: `doctor-asset-currency.test.ts:26`, `doctor-context-window-schema.test.ts:34`, `doctor-manual-removal.test.ts:30`, `invalid-config.test.ts:30,32,46`, `linked-project-root.test.ts:36-74`, `runtime-state-removal.test.ts:46-72`, `safe-removal.test.ts:54`) |
| codereview_02 correction T11 | Record the decision that keeps T10 | `workflow.md` DEC-EXC-02; `task_10.md` Traceability | review | conformant | unchanged since codereview_03 |
| codereview_03 correction T12 (DEC-RES-01) | Rule names the fake runner; T10 handoff describes the version-probe effect accurately | `.agents/rules/tests.md:52`; `codereview_01/done/task_10.md` Handoff | review | conformant | `tests.md:52` names `tests/helpers/fake-process-runner.ts` and tells direct callers to pass both fakes; `diff -q .agents/rules/tests.md .claude/rules/tests.md` is empty; T10 Handoff now says only `git check-ignore` stopped and the version probes already returned `unknown` without a runner, which matches `src/infrastructure/harnesses/common/version-probes.ts:12-14` (returns `unknown` when `runner` is undefined) and `src/infrastructure/harnesses/claude-code/statusline-diagnostics.ts:62` (the only `NodeProcessRunner` fallback); the product entry `main()` passes no runner (`src/cli/main.ts:26-31,59`) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` architecture | OK | QA-05: no `src/core/` file in scope |
| `.agents/rules/code-standards.md`, `javascript-typescript.md` | OK | `rtk proxy npx eslint .` exit 0, empty output; `npm run typecheck` exit 0 (this review) |
| `.agents/rules/node.md` (injection, no shell) | OK | `overheadMeasurer` and `runner` injected through `CommandEnv`; `main(argumentsList, overrides)` passes them to `dispatchCommand`; no shell spawn |
| `.agents/rules/tests.md` | OK | new tests cite IDs; the in-process helpers and direct callers inject the fake runner as the round-3 rule line requires |
| `.agents/rules/cli-output.md` | N/A | no user-visible output change |
| `.agents/rules/harness-adapters.md`, `file-changes.md` | N/A | no adapter or user-file logic changed |
| `sdd-plan-corrections` task template | OK for T12; partial for T10, T11 | T12 has every template section; T10 and T11 still omit some sections (accepted open item, DEC-RES-01) |

## Quality profile

Scope: 69 TypeScript files (`git diff --name-only -M cca3a29 --diff-filter=AMR -- '*.ts'` plus untracked `*.ts`), the same set as codereview_02 and codereview_03.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | `rtk proxy rg -n -H -P ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | 0 | OK |
| QA-02 | disable comments | blocking | `rtk proxy rg -n -H -P '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | 0 | OK |
| QA-03 | empty catch | blocking | `rtk proxy rg -n -H -P -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | 0 new of 4 | pre-existing: `linked-project-root.test.ts:26` (1 at `cca3a29`), `linked-project-root-lifecycle.test.ts:40` (1 in base `tests/e2e/e2e-linked-project-root.test.ts`), `symlinked-harness-lifecycle.test.ts:24,48` (2 in base `tests/e2e/e2e-symlinked-harness-config.test.ts`); counts rechecked with `git show cca3a29:<file>` |
| QA-04 | `exec`, `execSync`, `shell: true` | blocking | `rtk proxy rg -n -H -P '\bexecSync\(\|\bexec\(\|shell:\s*true' "${files[@]}"` | 0 | OK |
| QA-05 | core importing infrastructure or cli | blocking | file list filtered to `src/core/` | 0 (no core file in scope) | OK |
| QA-06 | file above 100 lines | reservation | `wc -l` per file | 0 new of 1 | pre-existing: `tests/bench/runtime-overhead.test.ts` 105 lines, 105 at `cca3a29` (`techspec.md:204`) |
| QA-07 | 4+ parameters | reservation | `rtk proxy rg -n -H -P '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"` | 0 | OK |

- Terrain baseline: applied from TechSpec (`techspec.md#terrain-baseline`, line 204 for moved and rewritten files).
- Hits discounted by baseline: 5 (4 QA-03, 1 QA-06).
- Reservations accumulated in the feature: 0 new.
- Suggested escalation: no trigger fired (0 new reservation hits; largest touched file 105 lines, pre-existing; no duplication in 3+ places).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 bench split, `release:check` order | YES | `package.json:33`: `… coverage && test:bench && test:budget && package:smoke` |
| DEC-02 injected measurer | YES | `doctor.ts:37`; helpers inject `fakeOverheadMeasurer` |
| DEC-03 smoke set (amended) | YES | `techspec.md:50`; four smoke files |
| DEC-04 process list (amended) | YES | `tests/test-lanes.ts` `PROCESS_LANE_FILES` = `techspec.md:150-156` |
| DEC-05 markers | YES | `tests/test-lanes.ts` `PROCESS_MARKERS` |
| DEC-06 workers (amended) | YES | `MAX_WORKERS = 6`; no process-lane cap |
| DEC-07 budget script | YES | unchanged since codereview_02 verified it |
| DEC-08 text | YES | `.agents/rules/tests.md:42-54`; `AGENTS.md` Architecture, Project constraints, Commands |
| DEC-09 coverage exclusions | YES | `exclude: []`; totals ≥ 80% |
| `CommandEnv.overheadMeasurer?: OverheadMeasurer` | YES | `src/cli/commands/init.ts:20` |
| `main()` `overrides: Partial<CommandEnv>` parameter | YES (internal) | `src/cli/main.ts:26-31`; internal to the CLI with no flag, schema, or exit-code change (`techspec.md:81`); accepted in codereview_02 and codereview_03, unchanged |
| Budget output contract | YES | observed in codereview_02 runs; script unchanged |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | six suites in `tests/bench/`; bench list has 6 files (this review) |
| T02 | `done/task_02.md` | COMPLETE | injected measurer |
| T03 | `done/task_03.md` | COMPLETE | `e2e-init`, `e2e-remove`, mapping rows |
| T04 | `done/task_04.md` | COMPLETE | `e2e-doctor`, `e2e-hook-round-trips`; DEC-03 amended |
| T05 | `done/task_05.md` | COMPLETE | 12-file process lane, the amended DEC-04 list |
| T06 | `done/task_06.md` | COMPLETE | evaluator and runner |
| T07 | `done/task_07.md` | COMPLETE | `MAX_WORKERS = 6`; rules and `AGENTS.md` |
| T08 | `codereview_01/done/task_08.md` | COMPLETE | exit code carried into `evaluateBudget`; `test-budget.test.ts` passes |
| T09 | `codereview_01/done/task_09.md` | COMPLETE | TechSpec amended; hashes match |
| T10 | `codereview_01/done/task_10.md` | COMPLETE | fake runner injected; Handoff corrected by T12; open item (dialogs) routed to HIL 3 |
| T11 | `codereview_02/done/task_11.md` | COMPLETE | DEC-EXC-02 recorded and cited |
| T12 | `codereview_03/done/task_12.md` | COMPLETE | T12.1 and T12.2 checked; `tests.md:52` and the T10 Handoff carry the required text; the `.claude/rules/tests.md` mirror matches |

## Executed validations

- Profile and scope: test infrastructure plus the `doctor` CLI wiring and the `main()` override; e2e limited to the DEC-03 smoke set; no CLI QA per DEC-HIL-02.
- Validated state: the uncommitted worktree on `cca3a29` after T08–T12; Windows 11 Pro 10.0.26200, PowerShell 7, Vitest 3.2.7, 12 logical CPUs.
- Reused evidence: `npm run build`, `npm run test:budget` ×3 (88.4 / 93.9 / 115.6 s), and `npm run coverage` (107.7 s, thresholds met) from codereview_02; `npm run test:bench` (6 files pass) from codereview_01 through the unchanged-code chain. Valid because rounds 2 and 3 changed no code, config, script, or `package.json` (`find -newer` in codereview_03 and in Sources and scope above; round 3 changed only the `tests.md` rule text and SDD artifacts), and platform and toolchain are the same.
- Manual acceptance: TC-01, TC-02, and TC-08 rest on the codereview_02 recorded runs. T10's open item (whether the 0xc0000142 `git.exe` dialogs stop during a full run) is still "Não observei ainda" at DEC-EXC-02: not verifiable here, routed to HIL 3; it is not a T10 acceptance criterion.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run typecheck` (PowerShell) | passed, exit 0 | all |
| `rtk proxy npx eslint .` (PowerShell) | passed, empty output, exit 0 | all |
| `rtk proxy npx vitest run tests/unit/test-lanes.test.ts tests/unit/bench-config.test.ts tests/unit/e2e-smoke-set.test.ts tests/unit/test-budget.test.ts` | passed: 4 files, 20 tests | TC-03, TC-05, TC-06, TC-07 |
| `npx vitest list --filesOnly` (default and bench configs) | 199 default files, none under `tests/bench/`; bench lists the 6 moved suites | FR-01, FR-03, TC-03 |
| Quality profile QA-01 to QA-07 | no new hit | quality profile |
| `grep -rn -E '\b(runInit\|runRemove\|runDoctor\|dispatchCommand\|main)\(' tests` | every in-process command call passes `fakeProcessRunner`; `main()` calls in `tests/unit/main.test.ts` reach only help or argument errors | T10, T12 |
| `diff -q .agents/rules/tests.md .claude/rules/tests.md` | identical | T12 |
| `sha256sum prd.md techspec.md tasks.md` | equal to `approved_sources` | source integrity |

## Findings

None.

### Optional improvements

- `tests/unit/test-lanes.test.ts` duplicates `PROCESS_LANE_FILES` verbatim as `ALLOWED_PROCESS_FILES`; it must be edited with the TechSpec table each time. Accepted open item (DEC-RES-01).
- T10 and T11 omit the `sdd-plan-corrections` template sections Requirements, Context to recover on demand, Verification, Affected files, and Observability and recovery. Accepted open item (DEC-RES-01).
- Relative source paths in correction tasks are mixed: T08, T09, T11, and T12 write paths relative to the report folder (`../workflow.md`), while T10's DEC-EXC-02 row uses `../../workflow.md`. Every target exists. Accepted open item (DEC-RES-01).
- New in this round, low value: `.agents/rules/tests.md:52` tells every direct caller of `runInit`, `runRemove`, `runDoctor`, or `dispatchCommand` to pass both `overheadMeasurer` and `runner`. The `init` and `remove` callers pass only `runner` (`doctor-asset-currency.test.ts:26`, `invalid-config.test.ts:30,32`, `linked-project-root.test.ts:36-74`, `runtime-state-removal.test.ts:46-72`, `safe-removal.test.ts:54`). They start no process, because only `runDoctor` reads the measurer (`doctor.ts:37`). The rule could say "`runner` always; `overheadMeasurer` for `doctor`" so that it matches practice.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_03 optional improvement 1: `tests.md` silent on the fake runner | resolved | `.agents/rules/tests.md:52` names `tests/helpers/fake-process-runner.ts` and tells direct callers to pass `runner: fakeProcessRunner`; mirrored in `.claude/rules/tests.md` (T12) |
| codereview_03 optional improvement 2: lane list duplicated in the guard test | persistent (accepted, DEC-RES-01) | `tests/unit/test-lanes.test.ts` unchanged |
| codereview_03 optional improvement 3: T10 handoff overstates the version-probe effect | resolved | `codereview_01/done/task_10.md` Handoff now says only `git check-ignore` stopped; matches `version-probes.ts:12-14` and `statusline-diagnostics.ts:62` (T12) |
| codereview_03 optional improvement 4: T10/T11 template sections | persistent (accepted, DEC-RES-01) | T10 and T11 unchanged in structure |
| codereview_03 optional improvement 5: mixed relative paths | persistent (accepted, DEC-RES-01) | T12 follows the report-folder convention of T08, T09, T11; T10's `../../workflow.md` remains |
| codereview_03 limitation: budget margin 4.4 s on the third run | persistent | no new runs on unchanged code; see limitations |
| codereview_03 limitation: T10 dialogs open item | not verifiable | DEC-EXC-02 "Não observei ainda"; routed to HIL 3 |
| codereview_02/CR-01 | resolved | as codereview_03 recorded; DEC-EXC-02 unchanged |
| codereview_01/CR-01, CR-02 and their limitations | resolved | as codereview_02 and codereview_03 recorded; code and TechSpec unchanged since |

## Limitations and open items

- Budget margin: the third consecutive codereview_02 run took 115.6 s (4.4 s under the limit). This review did not repeat the runs because rounds 2 and 3 changed no code, configuration, or script (reuse rule of step 4). NFR-01 and NFR-05 hold on that evidence; the margin is small and depends on machine load (snapshot O-04).
- T10's open item, whether the 0xc0000142 `git.exe` dialogs stop during a full run, needs the maintainer's observation. It is not verifiable here; DEC-EXC-02 routes it to HIL 3.
- `test:bench` and `npm run coverage` were not rerun; the codereview_01 and codereview_02 results are reused on the unchanged-code chain.
- Linux and macOS were not run; the POSIX shell paths of `cli-shells`, `statusline-shell`, `codex-hook-command-shells`, and `codex-hook-root` are unverified locally, as the TechSpec records.
- `workflow.md` record for this review (the caller records it; this delegated reviewer does not edit `workflow.md`): codereview_04 APPROVED WITH RESERVATIONS, no findings; codereview_03 improvements 1 and 3 resolved by T12; improvements 2, 4, and 5 persist as open items DEC-RES-01 accepted; one new low-value rule-wording improvement; the dialog observation stays open for HIL 3.

## Conclusion

Round 3 changed only the `tests.md` rule text and SDD artifacts. T12 resolved the two items DEC-RES-01 chose. The rule now names the fake process runner and tells direct command callers to inject it, and every such caller under `tests/` does. The T10 handoff now matches `version-probes.ts:12-14`: only `git check-ignore` stopped. The code is the same code codereview_02 measured:
- 199 default test files, none of them benchmarks;
- 6 bench files;
- a 12-file process lane equal to the amended DEC-04 list;
- three `npm test` runs within 120 s;
- coverage in 107.7 s, with every threshold above 80%.

This review reran typecheck, lint, the lane, smoke-set, bench-config, and budget unit tests, the file lists, and the quality profile, and found no new hit. Every obligation is conformant and every task is complete. The status is APPROVED WITH RESERVATIONS for two reasons:
- Optional improvements remain: the three that DEC-RES-01 accepted, plus one new wording nuance in `tests.md:52`.
- Limitations remain open: a small budget margin, the dialog observation for HIL 3, and no local Linux or macOS runs.
