# Code review report — prd-13-refatoracao-modo-leve-testes-rapidos (Fast test suite)

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `cca3a29..uncommitted worktree` (HEAD = `cca3a29`; staged, unstaged, and untracked changes, excluding the pre-existing untracked `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/`), including correction round 1 (`codereview_01/done/task_08.md` to `task_10.md`)
- Previous review: `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/codereview_01/codereview.md`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/prd.md` | read; sha256 `e3d411c7…0450386` equals `checkpoint.json#approved_sources` (DEC-HIL-01) |
| TechSpec | `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/techspec.md` | read; sha256 `e26b4238…84c500` equals `approved_sources` (DEC-EXC-01); DEC-03, DEC-04, DEC-06 carry the 2026-10-07 DEC-EXC-01 amendments |
| Manifest | `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/tasks.md` | read; sha256 `291bb70d…9c629c` equals `approved_sources` (DEC-EXC-01); T01–T07 checked |
| Handoffs | `done/task_01.md` … `done/task_07.md`; `codereview_01/done/task_08.md` … `task_10.md` | read; every work item checked, handoffs filled |
| Workflow | `workflow.md` | read; DEC-HIL-01, DEC-HIL-02, DEC-EXC-01 |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter (header, next step brief, open threads, `on-run` entries) |
| Implementation | `git diff -M cca3a29` plus untracked files: 69 TypeScript files, `package.json`, `AGENTS.md`, `.agents/rules/tests.md` | delimited |

Snapshot header check: `git_head` `cca3a29` equals `git rev-parse HEAD`; `worktree` matches `git status --porcelain`; `covers_through` ("codereview_01 round 1 T08-T10 done") matches `codereview_01/done/`. The next step brief is stale (it still asks to answer the exception HIL and plan corrections, which DEC-EXC-01 and T08–T10 already did); the header `next_step` is current. Decisions, Code map, and other Learnings were not used.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | `npm test` without benchmarks, ≤ 120 s | `vitest.config.ts:22` excludes `BENCH_FILE_PATTERN`; `tests/test-lanes.ts` lists no bench file | `tests/unit/bench-config.test.ts` (TC-03) | conformant | `npx vitest list --filesOnly`: 199 files, 0 under `tests/bench/`; three `npm run test:budget` runs 88.4 / 93.9 / 115.6 s |
| FR-02 | `npm run coverage` ≤ 120 s, four thresholds ≥ 80% | thresholds unchanged, `exclude: []` (`vitest.config.ts:44-49`) | `npm run coverage` (TC-02) | conformant | 107.7 s wall, 199 files, 1,057 tests; 93.5% statements, 90.21% branches, 94.03% functions, 93.5% lines |
| FR-03 | Separate bench script in `release:check`; original limits | `vitest.bench.config.ts`; `package.json` `test:bench`, `release:check` | `npm run test:bench` (TC-04) | conformant | bench config lists exactly 6 files; pass result reused from codereview_01 (see Executed validations) |
| FR-04 | E2E reduced to the smoke set; removed scenarios mapped | `tests/e2e/e2e-{init,doctor,remove,hook-round-trips}.test.ts` | `tests/unit/e2e-smoke-set.test.ts` (TC-05) | conformant | mapping rows in `done/task_03.md#Handoff`, `done/task_04.md#Handoff`; amended rows `techspec.md:130,137` match the final files |
| FR-05 | Process-starting tests limited to the TechSpec list | `tests/test-lanes.ts:6-19` | `tests/unit/test-lanes.test.ts:51-70` (TC-06) | conformant | 12 lane files equal `techspec.md:150-156`; `git-capability` and `process-capability` probes allowed at `techspec.md:157` (DEC-EXC-01) |
| FR-06 | Budget check reports wall time and ten slowest files, fails when the run fails or exceeds 120 s | `scripts/check-test-budget.ts:42,46`; `scripts/test-budget.ts:29-34` | `tests/unit/test-budget.test.ts` (TC-07, 9 tests) | conformant | `evaluateBudget` fails on `!success` or `vitestExitCode !== 0` (covers `null`); a run without a report exits 1 through `readReport`; `it.each([[1],[null]])` at `test-budget.test.ts:45` |
| FR-07 | Rules and `AGENTS.md` | `.agents/rules/tests.md:41-55`, `AGENTS.md` | review (TC-11) | conformant | files unchanged since codereview_01 (mtime before its report); text states budget, in-process default, process reasons, smoke set, `tests/bench/`, both scripts |
| NFR-01 | ≤ 120 s on Windows PowerShell | `vitest.config.ts:9` `MAX_WORKERS = 6` | TC-01 | conformant | 88.4 / 93.9 / 115.6 s in PowerShell 7.6.6; margin on the third run 4.4 s (limitations) |
| NFR-02 | 80% thresholds kept, no new exclusion | coverage block unchanged | TC-02 | conformant | totals above; no `src` file excluded |
| NFR-03 | No behavior loses all coverage | moved files keep assertions; T10 fake runner only replaces `git check-ignore` in in-process command tests | TC-10 | conformant | `STATUSLINE_LOCAL_TRACKED` stays asserted with injected runners in `tests/unit/statusline-diagnostics.test.ts:76,89` and `statusline-diagnostics-symlink.test.ts:54`, as at `cca3a29` |
| NFR-04 | Shell coverage kept | `cli-shells`, `statusline-shell`, `codex-hook-command-shells`, `codex-hook-root` | process lane | conformant | PowerShell and Git Bash on Windows; Linux and macOS not run (limitation) |
| NFR-05 | Three runs, no flake | — | TC-08 | conformant | three consecutive passing runs, exit 0 each, no retry configured |
| DEC-01, DEC-09 | Bench split; no new exclusions | see FR-01, FR-03 | TC-03, TC-04 | conformant | as above |
| DEC-02 | Injected measurer | `src/cli/commands/init.ts:20`, `src/cli/commands/doctor.ts:37` | `doctor-light-mode.test.ts`, `e2e-doctor.test.ts` (TC-09) | conformant | helpers inject `fakeOverheadMeasurer`; built doctor asserts `sampleCount > 0` |
| DEC-03 (amended) | Smoke set; plugin round trips in `runtime-in-process` | see FR-04 | TC-05, TC-10 | conformant | `techspec.md:50` amendment; `tests/integration/runtime-in-process.test.ts` loads `dist/assets/runtime/*` |
| DEC-04 (amended), DEC-05 | 12-file process list and probes; markers | `tests/test-lanes.ts:6-33` | TC-06 | conformant | list equal; markers `'/cli/commands/'`, `'composition-root'` absent |
| DEC-06 (amended) | Global `MAX_WORKERS = 6` only | `vitest.config.ts:9,43` | `test-lanes.test.ts:77,83` | conformant | `techspec.md:53` amendment |
| DEC-07 | Budget script contract | `scripts/check-test-budget.ts`, `scripts/test-budget.ts` | TC-07 | conformant | spawn of `process.execPath` without a shell; output lines and labels as specified |
| DEC-08 | Rules and commands text | see FR-07 | TC-11 | conformant | as above |
| codereview_01 correction T10 | Fake process runner in in-process command tests | `tests/helpers/fake-process-runner.ts`; 3 helpers and 7 test files | full suite | non-conformant (process) | the code is sound, but the task contradicts DEC-EXC-01 "optional fake runner: Não incluir" with no recorded decision (CR-01) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` architecture | OK | QA-05: no `src/core/` file in scope |
| `.agents/rules/code-standards.md`, `javascript-typescript.md` | OK | `rtk proxy npx eslint .` exit 0, empty output; `npm run typecheck` exit 0 |
| `.agents/rules/node.md` (injection, no shell) | OK | `overheadMeasurer` and `runner` injected through `CommandEnv`; `scripts/check-test-budget.ts:15` spawns without a shell |
| `.agents/rules/tests.md` | OK | new tests cite IDs; `test-lanes.test.ts` at 99 lines; fake runner is a port fake (`tests.md:22`) |
| `.agents/rules/cli-output.md` | N/A | no user-visible output change |
| `.agents/rules/harness-adapters.md`, `file-changes.md` | N/A | no adapter or user-file logic changed |
| `sdd-execute-corrections` step 5 ("a scope divergence requires HIL when not covered by existing authorization") | NOT OK | T10 (CR-01) |

## Quality profile

Scope: 69 TypeScript files (`git diff --name-only -M cca3a29 --diff-filter=AMR` plus untracked `*.ts`).

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | `rtk proxy rg -n -H -P ':\s*any\b\|\bas any\b\|<any>'` | 0 | OK |
| QA-02 | disable comments | blocking | `rtk proxy rg -n -H -P '@ts-ignore\|@ts-nocheck\|eslint-disable'` | 0 | OK |
| QA-03 | empty catch | blocking | `rtk proxy rg -n -H -P -U '…\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)'` | 0 new of 4 | pre-existing: `symlinked-harness-lifecycle.test.ts:24,48`, `linked-project-root-lifecycle.test.ts:40` (moved, same hits in the base e2e files) and `linked-project-root.test.ts:26` (same line 25 at `cca3a29`; file entered scope through T10) |
| QA-04 | `exec`, `execSync`, `shell: true` | blocking | `rtk proxy rg -n -H -P '\bexecSync\(\|\bexec\(\|shell:\s*true'` | 0 | OK |
| QA-05 | core importing infrastructure or cli | blocking | file list filtered to `src/core/` | 0 | OK |
| QA-06 | file above 100 lines | reservation | `wc -l` per file | 0 new of 1 | pre-existing: `tests/bench/runtime-overhead.test.ts` 105 lines (`techspec.md:204`) |
| QA-07 | 4+ parameters | reservation | `rtk proxy rg -n -H -P '\((?:[^(),]+,){3,}…'` | 0 | OK |

- Terrain baseline: applied from TechSpec (`techspec.md#terrain-baseline`, line 204 for moved and rewritten files).
- Hits discounted by baseline: 5 (4 QA-03, 1 QA-06).
- Reservations accumulated in the feature: 0 new.
- Suggested escalation: no trigger fired (0 reservation hits; largest touched file 105 lines; no duplication in 3+ places).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 bench split, `release:check` order | YES | `package.json` `release:check` runs `coverage`, `test:bench`, `test:budget`, `package:smoke` |
| DEC-02 injected measurer | YES | `doctor.ts:37`; helpers inject `fakeOverheadMeasurer` |
| DEC-03 smoke set (amended) | YES | `techspec.md:50` |
| DEC-04 process list (amended) | YES | `tests/test-lanes.ts:6-19` = `techspec.md:150-156` |
| DEC-05 markers | YES | `tests/test-lanes.ts:25-33` |
| DEC-06 workers (amended) | YES | `MAX_WORKERS = 6`; no process-lane cap |
| DEC-07 budget script | YES | exit code honored (`check-test-budget.ts:42,46`, `test-budget.ts:29`) |
| DEC-08 text | YES | `.agents/rules/tests.md:41-55`; `AGENTS.md` |
| DEC-09 coverage exclusions | YES | `exclude: []`; totals ≥ 80% |
| `CommandEnv.overheadMeasurer?: OverheadMeasurer` | YES | `src/cli/commands/init.ts:20` |
| Budget output contract | YES | observed in the three runs: `Test run: <s>s wall (budget 120s)`, `Slowest files:`, ten lines |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | six suites in `tests/bench/`; bench list has 6 files |
| T02 | `done/task_02.md` | COMPLETE | injected measurer |
| T03 | `done/task_03.md` | COMPLETE | `e2e-init`, `e2e-remove`, mapping rows |
| T04 | `done/task_04.md` | COMPLETE | `e2e-doctor`, `e2e-hook-round-trips`; DEC-03 deviation now amended |
| T05 | `done/task_05.md` | COMPLETE | 12-file process lane, now the amended DEC-04 list |
| T06 | `done/task_06.md` | COMPLETE | evaluator and runner |
| T07 | `done/task_07.md` | COMPLETE | `MAX_WORKERS = 6`; rules and `AGENTS.md` |
| T08 | `codereview_01/done/task_08.md` | COMPLETE | exit code carried into `evaluateBudget`; 9 unit tests pass in the full run |
| T09 | `codereview_01/done/task_09.md` | COMPLETE | TechSpec amended; TC-06 name cites DEC-EXC-01; hashes match |
| T10 | `codereview_01/done/task_10.md` | COMPLETE | unauthorized (CR-01); fake runner injected in all in-process command callers (`grep` of `runInit\|runRemove\|runDoctor\|dispatchCommand\|main(` in `tests/`: every command call passes `runner: fakeProcessRunner`, except `tests/unit/main.test.ts` argument-error paths); traceability cites "User report, 2026-10-07, conversation"; the task file has no Requirements, Verification, or Affected files sections (CR-01) |

## Executed validations

- Profile and scope: test infrastructure plus the `doctor` CLI wiring and `main()` override; e2e limited to the DEC-03 smoke set; no CLI QA per DEC-HIL-02, with the reviewer repeating the recorded runs.
- Validated state: the uncommitted worktree on `cca3a29` after T08–T10; Windows 11 Pro 10.0.26200, PowerShell 7.6.6, Node 24.19.0, Vitest 3.2.7, 12 logical CPUs. At start: CPU load 13%, 18 node/claude processes; at end: 25%, 18 processes.
- Reused evidence: `npm run test:bench` (codereview_01: 6 files pass, 82.3 s). Still valid: no file under `src/`, `tests/bench/`, `tests/e2e/`, `vitest.bench.config.ts`, or `package.json` changed after the codereview_01 report (`find -newer`), and no bench file imports a helper changed by T08–T10.
- Manual acceptance: TC-01, TC-02, TC-08 repeated by this reviewer (below). T10's open item (the maintainer confirms the 0xc0000142 dialogs stop) was not observed: not verifiable.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed, 11.9 s | prerequisite |
| `npm run typecheck` | passed | all |
| `rtk proxy npx eslint .` | passed (empty output, exit 0) | all |
| `npm run test:budget` ×3, PowerShell, consecutive | passed: 88.4 s, 93.9 s, 115.6 s, exit 0 each | FR-01, FR-06, NFR-01, NFR-05, TC-01, TC-08 |
| `npm run coverage`, PowerShell, timed | passed: 107.7 s wall, 199 files, 1,057 tests, 93.5 / 90.21 / 94.03 / 93.5 % | FR-02, NFR-02, DEC-09, TC-02 |
| `npx vitest list --filesOnly` (default and bench configs) | 199 default files, none under `tests/bench/`; bench lists 6 files | FR-01, TC-03 |
| Quality profile QA-01 to QA-07 | no new hit | quality profile |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Low | `workflow.md` DEC-EXC-01; `sdd-execute-corrections` step 5 | `codereview_01/done/task_10.md` implements the fake process runner (`tests/helpers/fake-process-runner.ts`, injected in `tests/helpers/{delegated-world,in-process-cli,statusline-world}.ts` and 7 integration tests), while `workflow.md:18` records the human choice "optional fake runner 'Não incluir (Recommended)'" and `codereview_01/done/task_09.md:28` scopes it out citing DEC-EXC-01. T10's only new source is "User report, 2026-10-07, conversation", absent from `workflow.md` and `checkpoint.json#decisions_to_read`. The task file lacks the Requirements, Verification, and Affected files sections of T08/T09 | The worktree contradicts the last recorded HIL decision, and the change cannot be traced to a verifiable source; an independent session cannot tell whether the reversal was authorized. The code itself is sound, test-only, and passes the full suite | Record the user's decision that authorized T10 (reversing the DEC-EXC-01 fake-runner choice) in the `workflow.md` Human Decisions Log and cite it in `task_10.md` traceability; or, without such a decision, revert T10 |

### Optional improvements

- `.agents/rules/tests.md:52` names the fake overhead measurer the in-process helpers inject but not the fake process runner; adding it would tell direct `runInit`/`runRemove`/`runDoctor` callers to pass `runner: fakeProcessRunner`.
- `tests/unit/test-lanes.test.ts:51-64` still duplicates `PROCESS_LANE_FILES` verbatim (carried from codereview_01).
- T10's handoff says the version probes stopped starting processes, but `src/infrastructure/harnesses/common/version-probes.ts:12` already returns `unknown` when no runner is injected and no CLI path builds one; only `statusline-diagnostics.ts:62` (`git check-ignore`) changed behavior. The handoff overstates the effect, with no code impact.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_01/CR-01 | resolved | `scripts/check-test-budget.ts:42,46` passes `vitestExitCode`; `scripts/test-budget.ts:29` fails on non-zero or `null`; `tests/unit/test-budget.test.ts:45-48` |
| codereview_01/CR-02 | resolved | DEC-EXC-01 amends DEC-04 (`techspec.md:51,150-158`); `tests/test-lanes.ts:6-19` equals the table; TC-06 test renamed (`test-lanes.test.ts:67`) |
| codereview_01 limitation: DEC-06 deviation without HIL | resolved | DEC-EXC-01 "Aceitar os dois"; `techspec.md:53` amendment |
| codereview_01 limitation: DEC-03 placement without HIL | resolved | DEC-EXC-01; `techspec.md:50` amendment |
| codereview_01 limitation: `tasks.md` hash mismatch | resolved | `tasks.md` and `techspec.md` re-hashed under DEC-EXC-01; sha256 values match |
| codereview_01 optional improvement: in-process doctor spawns `git check-ignore` | resolved in code, against the recorded decision | T10; see CR-01 |

## Limitations and open items

- Budget margin: the third consecutive run took 115.6 s (4.4 s under the limit) at light load (CPU 13–25%, 18 node/claude processes), against about 75 s in codereview_01 under similar load; `statusline-shell` took 25.7 s against 12–18 s before. The cause of the slowdown was not isolated (machine variance or T10); NFR-01 and NFR-05 hold, but the margin is small (snapshot O-04).
- T10's open item (the 0xc0000142 `git.exe` dialogs stop during a full run) needs the maintainer's observation: not verifiable in this review.
- `test:bench` was not rerun; the codereview_01 result is reused on the unchanged-dependency proof above.
- Linux and macOS were not run; the POSIX shell paths of `cli-shells`, `statusline-shell`, `codex-hook-command-shells`, and `codex-hook-root` are unverified locally.
- `workflow.md` record for this review: CR-01 needs an HIL decision (record the authorization for T10 or revert it). As a delegated reviewer, this session does not edit `workflow.md`; the caller records it.

## Conclusion

The corrections close both codereview_01 findings: the budget gate now fails whenever Vitest exits non-zero or is killed, and the TechSpec, as amended by DEC-EXC-01, matches the 12-file process lane, the global worker cap, and the plugin round-trip placement. All measurable goals hold on this machine: three consecutive `npm test` runs in 88–116 s, `npm run coverage` in 108 s with every threshold above 80%, lint and typecheck clean, and no new quality-profile hit. The review is REJECTED on one Low finding. CR-01: correction task T10 adds the fake process runner that DEC-EXC-01 recorded as "do not include", and no decision in `workflow.md` authorizes the reversal. Recording that decision, or reverting T10, closes it; the code needs no change if the decision is recorded.
