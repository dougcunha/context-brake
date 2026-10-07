# Code review report — prd-13-refatoracao-modo-leve-testes-rapidos (Fast test suite)

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `cca3a29..uncommitted worktree` (HEAD = `cca3a29`; staged, unstaged, and untracked changes, excluding the pre-existing untracked `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/`), including correction rounds 1 (`codereview_01/done/task_08.md` to `task_10.md`) and 2 (`codereview_02/done/task_11.md`)
- Previous review: `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/codereview_02/codereview.md`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/prd.md` | read; sha256 `e3d411c7…0450386` equals `checkpoint.json#approved_sources` (DEC-HIL-01) |
| TechSpec | `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/techspec.md` | read; sha256 `e26b4238…84c500` equals `approved_sources` (DEC-EXC-01); DEC-03, DEC-04, DEC-06 carry the DEC-EXC-01 amendments |
| Manifest | `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/tasks.md` | read; sha256 `291bb70d…9c629c` equals `approved_sources` (DEC-EXC-01); State T01–T07 `[x] done`, each link resolves to `done/task_0N.md` |
| Handoffs | `done/task_01.md` … `task_07.md`; `codereview_01/done/task_08.md` … `task_10.md`; `codereview_02/done/task_11.md` | read; every work item checked, handoffs filled; no task left at a report root |
| Workflow | `workflow.md` | read; DEC-HIL-01, DEC-HIL-02, DEC-EXC-01, DEC-EXC-02 |
| Checkpoint | `checkpoint.json` | read; `correction_round: 2`, `decisions_to_read` includes `DEC-EXC-02`, `active_work` names this review (`codereview_03`) |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter (header, next step brief, open threads, `on-run` entries) |
| Implementation | `git diff -M cca3a29` plus untracked files: 69 TypeScript files, `package.json`, `AGENTS.md`, `.agents/rules/tests.md` | delimited |

Round 2 scope: `find . -newer codereview_02/codereview.md` (excluding `node_modules`, `.git`, `dist`, `coverage`, and `tasks/prd-11`) lists only `workflow.md`, `checkpoint.json`, `checkpoint.previous.json`, `context-snapshot.md`, `codereview_01/done/task_10.md`, `codereview_02/done/task_11.md`, and three `.context-brake/runtime/sessions/*.jsonl` telemetry files. No file under `src/`, `tests/`, `scripts/`, the Vitest configs, `package.json`, `AGENTS.md`, or `.agents/rules/` changed after codereview_02, so the code under review is the code codereview_02 measured.

Snapshot header check: `git_head` `cca3a29` equals `git rev-parse HEAD`; `worktree` matches `git status --porcelain`; `covers_through` ("codereview_02 round 2 T11 done") matches `codereview_02/done/task_11.md`. The next step brief is stale (it still describes codereview_01 and asks to answer its exception HIL); the header `next_step` is current. The file is under 8 KiB and was read whole; Decisions, Code map, and other Learnings were not used as evidence.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | `npm test` without benchmarks, ≤ 120 s | `vitest.config.ts:22` excludes `BENCH_FILE_PATTERN`; `tests/test-lanes.ts` lists no bench file | `tests/unit/bench-config.test.ts` (TC-03) | conformant | this review: `npx vitest list --filesOnly` lists 199 files, 0 under `tests/bench/`; time: codereview_02 runs 88.4 / 93.9 / 115.6 s on unchanged code |
| FR-02 | `npm run coverage` ≤ 120 s, four thresholds ≥ 80% | thresholds 80 and `exclude: []` (`vitest.config.ts:44-49`) | `npm run coverage` (TC-02) | conformant | reused from codereview_02 on unchanged code: 107.7 s wall; 93.5% statements, 90.21% branches, 94.03% functions, 93.5% lines |
| FR-03 | Separate bench script in `release:check`; original limits | `vitest.bench.config.ts`; `package.json` `test:bench`, `release:check` | `npm run test:bench` (TC-04) | conformant | this review: bench config lists 6 files; `release:check` runs `coverage`, `test:bench`, `test:budget`, `package:smoke`; pass result reused (codereview_01 run, unchanged-dependency proof in codereview_02 and in Sources above) |
| FR-04 | E2E reduced to the smoke set; removed scenarios mapped | `tests/e2e/e2e-{init,doctor,remove,hook-round-trips}.test.ts` | `tests/unit/e2e-smoke-set.test.ts` (TC-05) | conformant | `tests/e2e/` holds the four test files plus `cli-runner.ts` and `shell-runner.ts` helpers; mapping rows in `done/task_03.md#Handoff`, `done/task_04.md#Handoff`; amended rows `techspec.md:130,137` |
| FR-05 | Process-starting tests limited to the TechSpec list | `tests/test-lanes.ts:6-19` | `tests/unit/test-lanes.test.ts:51-70` (TC-06) | conformant | 12 lane files equal `techspec.md:150-156`; probes allowed at `techspec.md:157` (DEC-EXC-01); lane test passes in this review |
| FR-06 | Budget check reports and fails on failed or slow run | `scripts/check-test-budget.ts`, `scripts/test-budget.ts` | `tests/unit/test-budget.test.ts` (TC-07) | conformant | test passes in this review; exit-code handling verified in codereview_02 (`check-test-budget.ts:42,46`, `test-budget.ts:29-34`), files unchanged |
| FR-07 | Rules and `AGENTS.md` | `.agents/rules/tests.md:41-55`, `AGENTS.md` | review (TC-11) | conformant | `git diff cca3a29 -- AGENTS.md .agents/rules/tests.md`: budget, in-process default, allowed process reasons, smoke set, `tests/bench/`, `test:bench` and `test:budget` commands; e2e no longer the default |
| NFR-01 | ≤ 120 s on Windows PowerShell | `vitest.config.ts:9` `MAX_WORKERS = 6` | TC-01 | conformant | reused: 88.4 / 93.9 / 115.6 s in PowerShell 7.6.6 (codereview_02); small margin, see limitations |
| NFR-02 | 80% thresholds kept, no new exclusion | coverage block unchanged | TC-02 | conformant | `exclude: []`; totals above |
| NFR-03 | No behavior loses all coverage | moved files keep assertions; fake runner replaces only process calls in in-process command tests | TC-10 | conformant | codereview_02 evidence (`STATUSLINE_LOCAL_TRACKED` asserted with injected runners in `tests/unit/statusline-diagnostics*.test.ts`); files unchanged |
| NFR-04 | Shell coverage kept | `cli-shells`, `statusline-shell`, `codex-hook-command-shells`, `codex-hook-root` | process lane | conformant | Windows PowerShell and Git Bash; Linux and macOS not run (limitation) |
| NFR-05 | Three runs, no flake | — | TC-08 | conformant | reused: three consecutive passing runs, exit 0 each, no retry configured (codereview_02) |
| DEC-01, DEC-09 | Bench split; no new exclusions | see FR-01, FR-03 | TC-03, TC-04 | conformant | as above |
| DEC-02 | Injected measurer | `src/cli/commands/init.ts:20`, `src/cli/commands/doctor.ts:37` | `doctor-light-mode.test.ts`, `e2e-doctor.test.ts` (TC-09) | conformant | `env.overheadMeasurer ?? new NodeOverheadMeasurer(...)`; helpers inject `fakeOverheadMeasurer` (`tests/helpers/delegated-world.ts`, `in-process-cli.ts`) |
| DEC-03 (amended) | Smoke set; plugin round trips in `runtime-in-process` | see FR-04 | TC-05, TC-10 | conformant | `techspec.md:50` amendment |
| DEC-04 (amended), DEC-05 | 12-file process list and probes; markers | `tests/test-lanes.ts:6-33` | TC-06 | conformant | list equal; `'/cli/commands/'` and `'composition-root'` absent from `PROCESS_MARKERS` |
| DEC-06 (amended) | Global `MAX_WORKERS = 6` only | `vitest.config.ts:9,43` | `test-lanes.test.ts` | conformant | `techspec.md:53` amendment |
| DEC-07 | Budget script contract | `scripts/check-test-budget.ts`, `scripts/test-budget.ts` | TC-07 | conformant | spawn of `process.execPath` without a shell (QA-04: 0 hits); output contract observed in codereview_02 |
| DEC-08 | Rules and commands text | see FR-07 | TC-11 | conformant | as above |
| codereview_01 correction T10 | Fake process runner in in-process command tests | `tests/helpers/fake-process-runner.ts`; `delegated-world.ts`, `in-process-cli.ts`, `statusline-world.ts`, 7 integration tests | full suite | conformant | now authorized by DEC-EXC-02 (`workflow.md:19`, "Manter a T10 (Recommended)", superseding the DEC-EXC-01 optional choice); `task_10.md:28` cites it |
| codereview_02 correction T11 | Record the decision that keeps T10 | `workflow.md:19`; `codereview_01/done/task_10.md:28,48` | review | conformant | `grep DEC-EXC-02` hits both files and `checkpoint.json:46` |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` architecture | OK | QA-05: no `src/core/` file in scope |
| `.agents/rules/code-standards.md`, `javascript-typescript.md` | OK | `rtk proxy npx eslint .` exit 0, empty output; `npm run typecheck` exit 0 (this review) |
| `.agents/rules/node.md` (injection, no shell) | OK | `overheadMeasurer` and `runner` injected through `CommandEnv`; `main(argumentsList, overrides)` passes them to `dispatchCommand`; no shell spawn |
| `.agents/rules/tests.md` | OK | new tests cite IDs; largest touched test file in feature code 99 lines (`test-lanes.test.ts`); fake runner is a port fake |
| `.agents/rules/cli-output.md` | N/A | no user-visible output change |
| `.agents/rules/harness-adapters.md`, `file-changes.md` | N/A | no adapter or user-file logic changed |
| `sdd-execute-corrections` step 5 (scope divergence requires HIL) | OK | T10 now traces to DEC-EXC-02 |
| `sdd-plan-corrections` task template | partial | T10 and T11 omit the template's Requirements, Context, Verification, Affected files, and Observability sections (optional improvement) |

## Quality profile

Scope: 69 TypeScript files (`git diff --name-only -M cca3a29 --diff-filter=AMR -- '*.ts'` plus untracked `*.ts`), the same set as codereview_02.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | `rtk proxy rg -n -H -P ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | 0 | OK |
| QA-02 | disable comments | blocking | `rtk proxy rg -n -H -P '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | 0 | OK |
| QA-03 | empty catch | blocking | `rtk proxy rg -n -H -P -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | 0 new of 4 | pre-existing: `linked-project-root.test.ts:26` (1 at `cca3a29`), `linked-project-root-lifecycle.test.ts:40` (1 in base `e2e-linked-project-root`), `symlinked-harness-lifecycle.test.ts:24,48` (2 in base `e2e-symlinked-harness-config`) |
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
| DEC-01 bench split, `release:check` order | YES | `package.json`: `… coverage && test:bench && test:budget && package:smoke` |
| DEC-02 injected measurer | YES | `doctor.ts:37`; helpers inject `fakeOverheadMeasurer` |
| DEC-03 smoke set (amended) | YES | `techspec.md:50`; four smoke files |
| DEC-04 process list (amended) | YES | `tests/test-lanes.ts:6-19` = `techspec.md:150-156` |
| DEC-05 markers | YES | `tests/test-lanes.ts:25-33` |
| DEC-06 workers (amended) | YES | `MAX_WORKERS = 6`; no process-lane cap |
| DEC-07 budget script | YES | unchanged since codereview_02 verified it |
| DEC-08 text | YES | `.agents/rules/tests.md:41-55`; `AGENTS.md` Architecture, Project constraints, Commands |
| DEC-09 coverage exclusions | YES | `exclude: []`; totals ≥ 80% |
| `CommandEnv.overheadMeasurer?: OverheadMeasurer` | YES | `src/cli/commands/init.ts:20` |
| `main()` `overrides: Partial<CommandEnv>` parameter | YES (internal) | `src/cli/main.ts:26-31`; not named in the TechSpec contracts, but internal to the CLI with no flag, schema, or exit-code change (`techspec.md:81`); the product entry calls `main()` with defaults (`main.ts:59`); accepted in codereview_02, unchanged |
| Budget output contract | YES | observed in codereview_02 runs; script unchanged |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | six suites in `tests/bench/`; bench list has 6 files |
| T02 | `done/task_02.md` | COMPLETE | injected measurer |
| T03 | `done/task_03.md` | COMPLETE | `e2e-init`, `e2e-remove`, mapping rows |
| T04 | `done/task_04.md` | COMPLETE | `e2e-doctor`, `e2e-hook-round-trips`; DEC-03 amended |
| T05 | `done/task_05.md` | COMPLETE | 12-file process lane, the amended DEC-04 list |
| T06 | `done/task_06.md` | COMPLETE | evaluator and runner |
| T07 | `done/task_07.md` | COMPLETE | `MAX_WORKERS = 6`; rules and `AGENTS.md` |
| T08 | `codereview_01/done/task_08.md` | COMPLETE | exit code carried into `evaluateBudget`; `test-budget.test.ts` passes |
| T09 | `codereview_01/done/task_09.md` | COMPLETE | TechSpec amended; hashes match |
| T10 | `codereview_01/done/task_10.md` | COMPLETE | fake runner injected; traceability now DEC-EXC-02; open item (dialogs) routed to HIL 3 |
| T11 | `codereview_02/done/task_11.md` | COMPLETE | `workflow.md:19` DEC-EXC-02 with human text and choice; `task_10.md:28` cites it; artifacts only |

## Executed validations

- Profile and scope: test infrastructure plus the `doctor` CLI wiring and the `main()` override; e2e limited to the DEC-03 smoke set; no CLI QA per DEC-HIL-02.
- Validated state: the uncommitted worktree on `cca3a29` after T08–T11; Windows 11 Pro 10.0.26200, PowerShell 7.6.6, Node 24.19.0, Vitest 3.2.7, 12 logical CPUs.
- Reused evidence: `npm run build`, `npm run test:budget` ×3 (88.4 / 93.9 / 115.6 s), and `npm run coverage` (107.7 s, thresholds met) from codereview_02; `npm run test:bench` (6 files pass, 82.3 s) from codereview_01 through codereview_02's unchanged-dependency proof. Valid because round 2 changed no code, config, script, or rule file (`find -newer` in Sources and scope), and platform and toolchain are the same.
- Manual acceptance: TC-01, TC-02, and TC-08 rest on the codereview_02 recorded runs. T10's open item (the 0xc0000142 `git.exe` dialogs stop during a full run) is recorded at DEC-EXC-02 as "Não observei ainda": not verifiable, routed to HIL 3; it is not a T10 acceptance criterion.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run typecheck` (PowerShell) | passed, exit 0 | all |
| `rtk proxy npx eslint .` (PowerShell) | passed, empty output, exit 0 | all |
| `rtk proxy npx vitest run tests/unit/test-lanes.test.ts tests/unit/bench-config.test.ts tests/unit/e2e-smoke-set.test.ts tests/unit/test-budget.test.ts` | passed: 4 files, 20 tests | TC-03, TC-05, TC-06, TC-07 |
| `npx vitest list --filesOnly` (default and bench configs) | 199 default files, none under `tests/bench/`; bench lists 6 files | FR-01, FR-03, TC-03 |
| Quality profile QA-01 to QA-07 | no new hit | quality profile |
| `grep -n DEC-EXC-02` over `workflow.md`, `task_10.md`, `checkpoint.json` | 4 hits as expected | codereview_02/CR-01 |
| `sha256sum prd.md techspec.md tasks.md` | equal to `approved_sources` | source integrity |

## Findings

None.

### Optional improvements

- `.agents/rules/tests.md:52` names the fake overhead measurer the in-process helpers inject but not the fake process runner; adding it would tell direct `runInit`/`runRemove`/`runDoctor` callers to pass `runner: fakeProcessRunner` (carried from codereview_02).
- `tests/unit/test-lanes.test.ts:51-64` duplicates `PROCESS_LANE_FILES` verbatim as `ALLOWED_PROCESS_FILES`; an independent guard list is defensible, but it must be edited with the TechSpec table each time (carried from codereview_01).
- `codereview_01/done/task_10.md:43` (Handoff) says the version probes build `NodeProcessRunner` only when no runner is injected; `src/infrastructure/harnesses/common/version-probes.ts:12-14` returns `unknown` without a runner and builds none. Only `statusline-diagnostics.ts:62` (`git check-ignore`) changed behavior. The handoff overstates the effect, with no code impact (carried from codereview_02).
- T10 and T11 omit the `sdd-plan-corrections` template sections Requirements, Context to recover on demand, Verification, Affected files, and Observability and recovery. Both tasks are traceable and complete; the gap affects only artifact uniformity.
- Relative source paths in correction tasks are mixed: T08, T09, and T11 write paths relative to the report folder (`../workflow.md`, `../techspec.md`, as in prd-12 `codereview_03/done/`), while the line T11 rewrote in T10 uses `../../workflow.md`, relative to `done/`, next to T10's own `../techspec.md`. Every target exists; one convention would remove the ambiguity.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_02/CR-01 | resolved | `workflow.md:19` DEC-EXC-02: human report of `git.exe` 0xc0000142 dialogs and the choice "Manter a T10 (Recommended)", which supersedes the DEC-EXC-01 "Não incluir" optional choice; `codereview_01/done/task_10.md:28` cites DEC-EXC-02 instead of "conversation"; `checkpoint.json#decisions_to_read` lists DEC-EXC-02. The recommendation's first branch (record the decision and cite it) is met; no code change was required |
| codereview_02 optional improvement: `tests.md` silent on the fake runner | persistent | `.agents/rules/tests.md:52` unchanged |
| codereview_02 optional improvement: lane list duplicated in the guard test | persistent | `tests/unit/test-lanes.test.ts:51-64` unchanged |
| codereview_02 optional improvement: T10 handoff overstates the version-probe effect | persistent | `task_10.md:43` unchanged in that sentence |
| codereview_02 limitation: budget margin 4.4 s on the third run | persistent | no new runs on unchanged code; see limitations |
| codereview_02 limitation: T10 dialogs open item | not verifiable | DEC-EXC-02 "Não observei ainda"; routed to HIL 3 |
| codereview_01/CR-01, CR-02 and its limitations | resolved | as codereview_02 recorded; code and TechSpec unchanged since |

## Limitations and open items

- Budget margin: the third consecutive codereview_02 run took 115.6 s (4.4 s under the limit) at light load; this review did not repeat the runs because round 2 changed no code, configuration, or rule (reuse rule of step 4). NFR-01 and NFR-05 hold on that evidence; the margin is small and machine-load dependent (snapshot O-04).
- T10's open item, whether the 0xc0000142 `git.exe` dialogs stop during a full run, needs the maintainer's observation: not verifiable here; DEC-EXC-02 routes it to HIL 3.
- `test:bench` was not rerun; the codereview_01 result is reused on the unchanged-dependency chain.
- Linux and macOS were not run; the POSIX shell paths of `cli-shells`, `statusline-shell`, `codex-hook-command-shells`, and `codex-hook-root` are unverified locally, as the TechSpec records.
- `workflow.md` record for this review (the caller records it; this delegated reviewer does not edit `workflow.md`): codereview_03 APPROVED WITH RESERVATIONS, no findings, five optional improvements; the dialog observation stays open for HIL 3.

## Conclusion

Round 2 changed only SDD artifacts. T11 recorded DEC-EXC-02, the human decision that keeps T10's fake process runner and supersedes the DEC-EXC-01 optional choice, and T10 now cites it. That closes codereview_02/CR-01, the only open finding. The code is the same code codereview_02 measured: 199 default test files with no benchmark, 6 bench files, a 12-file process lane equal to the amended DEC-04 list, three `npm test` runs within 120 s, and coverage in 107.7 s with every threshold above 80%. This review reconfirmed typecheck, lint, the lane, smoke-set, bench-config, and budget unit tests, the file lists, and the quality profile with no new hit. Every obligation is conformant and every task is complete. The status is APPROVED WITH RESERVATIONS only because of the five optional improvements, all documentation or artifact uniformity, and the open limitations: a small budget margin, the dialog observation for HIL 3, and no local Linux or macOS runs.
