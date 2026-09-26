# Code review report — PRD 2.2 real context window in Claude Code (re-review, correction round 1)

## Summary

- Status: APPROVED
- Git scope: `5917593..8dd3baa` (commits `66e46cf`, `8dd3baa` on `feat/prd-02.2-claude-context-window`, draft PR #2). The worktree after `8dd3baa` changes no code: only this feature's task state and the dogfooding files excluded in codereview_01.
- Previous review: `tasks/prd-02.2-janela-de-contexto-do-claude-code/codereview_01/codereview.md` (REJECTED)
- Independence: this session started after `/clear`, wrote and changed no code, and made none of the corrections. It wrote only this report and flow state.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `prd.md` (OBJ-04 and NFR-01 amended under DEC-HIL-05) | read |
| TechSpec | `techspec.md` (DEC-02, DEC-06, DEC-07, DEC-09, DEC-13, CMP-07a, TC-20, TC-22 amended under DEC-HIL-03/04/05) | read |
| Manifest | `tasks.md`; T01–T05 link to `done/task_0N.md`; TC-22 row added | read |
| Corrections | `codereview_01/done/task_06.md`–`task_15.md`, all with handoffs | read |
| Decisions | `workflow.md` DEC-HIL-01..05, EV-01..10 | read |
| Snapshot | `context-snapshot.md`, loaded as an independent stage (header, brief, open threads, `on-run`) | read |
| Implementation | `git diff 5917593 8dd3baa` (105 files) | delimited |

The approved-source hashes in `checkpoint.json` predate the amendments. Every amendment to `prd.md`, `techspec.md`, and `tasks.md` since then is covered by an exception decision (DEC-HIL-03, DEC-HIL-04, DEC-HIL-05) and by the handoffs of T06, T09, and T15. No other change to those files was found.

## Coverage matrix

Rows that were conformant in codereview_01 and whose code did not change are kept as conformant, with their evidence rerun in the full suite below.

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| OBJ-01 | Every block after the first status line run shows the latest window | `session-zone.ts:57` (window from any reading, stale or not); `usage-resolver.ts:26` | TC-03, TC-22 | conformant | `session-zone-reset-window.test.ts:24-36`: `tokens=15150/1000000 source=estimated` after a compaction |
| OBJ-02 | Status line output intact | `statusline-bridge.ts`, `statusline-settings.ts:bridgeCommand` | TC-06, TC-08, `e2e-statusline-shell` | conformant | byte-equal stdout and exit code through `sh -c`, including a trailing `#` comment and a failing command |
| OBJ-03 | No regression without the bridge | `mergeMeasurements` without `statusline` lines; `resolveUsage` | TC-05, TC-22 case 4, PRD 2.1 suites | conformant | The only PRD 2.1 test changed is the Pi null-tokens case, which now estimates over the harness-reported window. That follows PRD 2.1 FR-07 ("the window the harness reports, else `contextWindowCeiling`") and the approved DEC-06 amendment (DEC-HIL-04). |
| OBJ-04 / NFR-01 | Hooks ≤ 100 ms without the bridge; ≤ 120 ms with 200 `statusline` lines; bridge ≤ 50 ms beyond one Node start (DEC-HIL-05) | — | TC-20, `runtime-overhead` | conformant | CI run 36257966989 on `8dd3baa`, 9/9 jobs green; the bridge measures +24.4 to +62.0 ms against targets of 76.7 to 130.0 ms; hooks +26.2 to +78.2 ms (`codereview_01/done/task_12.md#handoff`). One outlier under coverage load, see limitations. |
| US-01 | 1M sessions use the real window | as FR-04 | TC-03, TC-22 | conformant | manual acceptance from codereview_01 (reported passed) |
| US-02 | Keep the existing status line | planner + bridge | TC-06, TC-12, `e2e-statusline-shell` | conformant | — |
| US-03 | Window follows `/model` | `summarizeStatusline` keeps the last window | TC-02 | conformant | unchanged since codereview_01 |
| US-04 | Diagnose the bridge | `statusline-diagnostics.ts`, `statusline-context-window.ts` | TC-16, `statusline-diagnostics-symlink`, `statusline-context-window` | conformant | `doctor --json` on this repository reports `STATUSLINE_LOCAL_TRACKED` for `.agents/settings.local.json` |
| US-05 | Clean removal | `statusline-restore.ts` | TC-12, TC-13, TC-21 | conformant | unchanged |
| FR-01 | Opt-in local install | `statusline-planner.ts`, `init-arguments.ts:58-62` | TC-10–TC-12, TC-15, `statusline-install` | conformant | also fails with exit 64 when Claude Code is not detected (CR-06) |
| FR-02 | Previous command run, output and exit preserved | `statusline-settings.ts:bridgeCommand` (subshell closed on its own line) | TC-06, TC-10, `e2e-statusline-shell` | conformant | `sh -c` cases pass on all 9 CI jobs and locally with Git Bash |
| FR-03 | Five values per session | `statusline-payload.ts`, `statusline-summary.ts` | TC-01, TC-02, TC-06, TC-09 | conformant | unchanged |
| FR-04 | Bridge window, else the ceiling | `mergeMeasurements`, `resolveUsage` | TC-03, TC-05, TC-22 | conformant | — |
| FR-05 | Bridge tokens as fallback after the reset | `mergeMeasurements:55-56`, `isStale` | TC-04 | conformant | unchanged |
| FR-06 | Keep the window, drop usage across resets | `summarizeStatusline` (window across resets, usage after); `mergeMeasurements:57` | TC-02, TC-22 | conformant | CR-01 resolved |
| FR-07 | Doctor state, source, last window, four warnings | `statusline-diagnostics.ts:55-68`, `statusline-context-window.ts:30-37` | TC-16–TC-18, symlink suite | conformant | link path and real target both checked; the newest ledger with a window is used |
| FR-08 | Removal restores the key | `statusline-restore.ts` | TC-12, TC-13, TC-21 | conformant | unchanged |
| FR-09 | README and research docs | README, `harness-integrations.md`, `telemetry-block.md` | TC-19 | conformant | the README zone bullet now matches the behavior (CR-01 fixed) |
| NFR-02 | Resilience | `statusline-bridge.ts` | TC-08 | conformant | unchanged |
| NFR-03 | Privacy | `statusline-payload.ts` | TC-09 | conformant | unchanged |
| NFR-04 | Compatibility | optional fields; additive ledger line | TC-01, TC-18, `schemas:check` | conformant | `schemas:check` passed in this session |
| NFR-05 | Quality gates | — | lint, typecheck, coverage, schemas, smoke | conformant | see validations |
| NFR-06 | Linux, macOS, Windows (Git Bash); spaces, quotes, accents | `bridgeCommand` quoting | TC-11, TC-21, `e2e-statusline-shell` | conformant for POSIX shells | the root `Meus Projetos/ação` and a previous command with single and double quotes run through `sh -c` on all 9 CI jobs. PowerShell-only Windows is unsupported by design (TechSpec Risks). |
| DEC-01–DEC-13, CMP-01–CMP-14 | see TechSpec adherence | — | — | — | — |
| TC-01–TC-22 | Listed suites | present | — | present and green | local suite and CI |
| Manual acceptance | Five-step script with a 1M model | — | user | reported passed on 25/09/2026 | `done/task_05.md#handoff`; not repeated after the corrections, see limitations |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` / QA profile | OK | no new blocking hits (see Quality profile) |
| Architecture (`core` never imports `infrastructure`/`cli`) | OK | QA-05: 0 hits; the `NodeProcessRunner` fallback lives in `infrastructure` (`statusline-diagnostics.ts:6,56`) |
| `node.md` (stdout belongs to the harness) | OK | QA-06: 0 hits in the hook path |
| `file-changes.md` | OK | the init guard runs before the dry-run report and any write (`init.ts:76`) |
| `harness-adapters.md` | OK | no adapter contract changes in the round |
| `AGENTS.md` (symlinked configs, Windows) | OK | `statusline-diagnostics-symlink.test.ts` (Windows junction on CI with `core.symlinks`); `doctor` on this repository |
| `tests.md` | OK | the estimated-path window (TC-22) and real-shell execution (`e2e-statusline-shell`) now have tests; T10 records a mutation check against the old format |
| `cli-output.md` | OK | `text.ts` newline escaped (OI-02); same output |

## Quality profile

Run from Git Bash over the 77 added or modified TypeScript files in `5917593..8dd3baa`, with the TechSpec `RG` command set.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | as TechSpec | 0 | OK |
| QA-02 | suppressions | blocking | as TechSpec | 0 | OK |
| QA-03 | empty catch | blocking | as TechSpec | 0 new of 2 | pre-existing (`symlinked-harness-config.test.ts:30,58`, present at `5917593`) |
| QA-04 | `exec`/`shell: true` | blocking | as TechSpec | 0 | OK (`posix-shell.ts` spawns `sh -c` with an argument array, test-only) |
| QA-05 | core → infra/cli | blocking | as TechSpec | 0 | OK |
| QA-06 | stray stdout in the hook path | blocking | as TechSpec | 0 | OK |
| QA-07 | `throw new Error(` | reservation | as TechSpec | 0 new of 20 | pre-existing: `scripts/*` in the Terrain baseline; each test hit exists verbatim at `5917593` |
| QA-08 | clock in core | reservation | as TechSpec | 0 | OK |
| QA-09 | 4+ parameters | reservation | as TechSpec (`rg -P`) | 0 new of 3 | pre-existing at `5917593`; all three are regex false positives (a generic `Map<string, Handler>` comma or a destructured parameter) |
| QA-10 | file > 100 lines | reservation | as TechSpec | 0 | OK; `init.ts` stays at 100 lines |

- Terrain baseline: applied from the TechSpec, plus a check at `5917593` for every hit.
- Hits discounted by baseline: 25.
- Reservations accumulated in the feature: 0.
- Suggested escalation: no trigger fired (0 reservations, no touched file above 200 lines, no duplication in 3+ places).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 | YES | unchanged; `package:smoke` passed |
| DEC-02 (amended) | YES | `statusline-settings.ts:bridgeCommand` emits `( <previous>` + newline + `)`; `isBridgeStatusline` matches the script path, so the old single-line command stays recognized |
| DEC-03, DEC-04, DEC-05 | YES | unchanged |
| DEC-06 (amended, DEC-HIL-04) | YES | `session-zone.ts:57` `inputs.measured?.contextWindow ?? statusline.windowTokens`; `usage-resolver.ts:26` `measured?.contextWindow ?? contextWindowCeiling`; TC-22 covers both precedence cases and the ceiling fallback |
| DEC-07 (amended) | YES | owner `harness_entry` now in the TechSpec |
| DEC-08 | YES | `init-arguments.ts:58-62` + `init.ts:76`; TC-15 cases and `statusline-install` (no Claude Code, apply and dry run) |
| DEC-09 (amended) | YES | `AdapterPlan.findings` now in the TechSpec |
| DEC-10 | YES | CR-02 and OI-01 resolved |
| DEC-11, DEC-12 | YES | unchanged; `telemetry-block.md` documents the window precedence |
| DEC-13 (amended, DEC-HIL-05) | YES | `statusline-overhead.test.ts:15-16,54-57` applies 50 ms + the Node start p95 on CI, 120 ms for hooks, and the local rule |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01–T05 | `done/task_0N.md` | COMPLETE | verified in codereview_01; the obligations CR-01..CR-06 reopened are closed by T06–T15 |
| T06 | `codereview_01/done/task_06.md` | COMPLETE | TechSpec DEC-06/07/09, CMP-07a, TC-22 match the code |
| T07 | `codereview_01/done/task_07.md` | COMPLETE | code and TC-22 verified |
| T08 | `codereview_01/done/task_08.md` | COMPLETE | reproduced on this repository; also fixes the missing production `ProcessRunner` |
| T09 | `codereview_01/done/task_09.md` | COMPLETE | format verified; DEC-02 amended |
| T10 | `codereview_01/done/task_10.md` | COMPLETE | 4/4 on all 9 CI jobs and locally |
| T11 | `codereview_01/done/task_11.md` | COMPLETE | guard verified before any write |
| T12 | `codereview_01/done/task_12.md` | COMPLETE | CI run 36257966989 verified with `gh` (9/9 success on `8dd3baa`) |
| T13 | `codereview_01/done/task_13.md` | COMPLETE | newest ledger with a window |
| T14 | `codereview_01/done/task_14.md` | COMPLETE | `\n` escape |
| T15 | `codereview_01/done/task_15.md` | COMPLETE | PRD, TechSpec, and test budgets agree with DEC-HIL-05 |

## Executed validations

- Profile and scope: CLI (`init`, `remove`, `doctor`), per-event hook processes, and the status line process. End-to-end tests run the built CLI against temporary repositories (TC-21, `e2e-statusline-shell`). No web surface.
- Validated state: `8dd3baa` (the worktree changes no code); Windows 11, Git Bash, Node 20+, with this repository's `.claude` symlinked to `.agents`.
- Reused evidence: CI run 36257966989 on `8dd3baa` for Linux, macOS, and Windows on Node 20/22/24. It covers the same commit and the full CI pipeline (`schemas:check`, `dependencies:check`, build, typecheck, lint, `npm test`, `npm run coverage`, `package:smoke`). Job status was checked with `gh pr checks 2` and `gh run view`, and the Windows Node 20 job log was read for TC-20, TC-22, the symlink suite, and `e2e-statusline-shell`.
- Manual acceptance: reported passed on 25/09/2026 before the corrections; see limitations.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | CMP-13 |
| `npm run lint` | passed | NFR-05 |
| `npm run typecheck` | passed | NFR-05 |
| `npm run schemas:check` | passed | NFR-04, TC-18 |
| `npx vitest run --coverage --coverage.reportOnFailure` | passed: 263/263 files; 1,722 passed, 3 skipped (outside the feature: `e2e-run-interrupt`, `harness-session-stop`); 95.39% statements / 90.79% branches; exit 0, no timeouts | NFR-05, TC-01–TC-22 |
| `npm run package:smoke` | passed | DEC-01 |
| `node dist/src/cli/main.js doctor --json --harness claude-code` (this repository) | `contextWindow` `{bridge: installed, source: statusline, lastWindowTokens: 1000000}`; `STATUSLINE_LOCAL_TRACKED` at `.agents/settings.local.json` | FR-07, codereview_01/CR-02 |
| `git check-ignore -q .agents/settings.local.json` | exit 1 (not ignored), matching the warning | codereview_01/CR-02 |
| `gh pr checks 2`; `gh run view 36257966989` | 9/9 jobs success on head `8dd3baa` | NFR-01, NFR-06, codereview_01/CR-03, CR-04 |
| Quality profile QA-01..QA-10 | 0 new hits | NFR-05 |

## Findings

No findings. No optional improvements.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_01/CR-01 | resolved | `session-zone.ts:57`, `usage-resolver.ts:26`; TC-22 in `session-zone-reset-window.test.ts:24-46` asserts `tokens=15150/1000000 source=estimated` after a compaction with a stale transcript; DEC-06 amended under DEC-HIL-04 |
| codereview_01/CR-02 | resolved | `statusline-diagnostics.ts:55-68` checks the link path and the real target, and falls back to `NodeProcessRunner` because the production `doctor` context has no runner; `doctor` on this repository reports `.agents/settings.local.json`; `statusline-diagnostics-symlink.test.ts` 3/3 |
| codereview_01/CR-03 | resolved | `tests/e2e/e2e-statusline-shell.test.ts` runs the command written by `init` through `sh -c` on `Meus Projetos/ação` with a quoted previous command, plus comment, failure, and no-previous cases; 4/4 on all 9 CI jobs, none skipped (fails on CI without a shell) |
| codereview_01/CR-04 | resolved | budgets revised by the user (DEC-HIL-05); CI run 36257966989 green on all 9 jobs with the recorded p95 values; TechSpec DEC-13 and TC-20 match the test |
| codereview_01/CR-05 | resolved | `statusline-settings.ts:bridgeCommand` closes the subshell on its own line; the trailing-comment case passes through `sh -c`; T10 mutation check fails with the old format |
| codereview_01/CR-06 | resolved | `init-arguments.ts:58-62`, called at `init.ts:76` before the dry-run report and any write; unit and integration cases (apply and dry run, directory stays empty) |
| codereview_01/CR-07 | resolved | `techspec.md` DEC-07 (owner `harness_entry`) and DEC-09 (`AdapterPlan.findings`) cite DEC-HIL-03 |
| codereview_01/OI-01 | resolved | `statusline-context-window.ts:30-37` scans ledgers newest first and stops at the first one with a window; `statusline-context-window.test.ts` 5/5 |
| codereview_01/OI-02 | resolved | `text.ts` uses `\n` like its neighbors |

## Limitations and open items

- TC-20 is a timing test on shared runners. In run 36257966989, the first attempt of Windows Node 20 failed once in the coverage pass (PostToolUse +124.2 ms vs 120), and passed on rerun; the `npm test` pass of the same job measured +76.3 ms. Across the 18 TC-20 passes of that run, this was the only failure, it happened under v8 coverage instrumentation, and no rule was relaxed beyond DEC-HIL-05. This review accepts it as evidence of the budget, and it records the risk of future flakes (snapshot O-06).
- The manual acceptance ran before the corrections. The corrected paths (post-compaction window, command format with a newline) are covered by TC-22 and the real-shell suite, not by a new manual run. The user may repeat step 3 after a `/compact` at HIL 3.
- This repository's own `.agents/settings.local.json` keeps the old single-line bridge command until `init --statusline-bridge` runs again, and is not ignored by Git. It is dogfooding state outside the feature (D-05), and `doctor` now warns about it.
- PowerShell-only Windows remains unsupported and untested, as the TechSpec records.
- None of these limitations leaves an essential requirement, security issue, or validation pending.

## Conclusion

APPROVED. All nine items from codereview_01 are resolved, with evidence on the current code: CR-01 through CR-07, OI-01, and OI-02. Every PRD obligation is conformant under the amended contracts (DEC-HIL-03, DEC-HIL-04, DEC-HIL-05), and all tasks T01–T15 are complete with handoffs. The quality profile has no new hits. The local gates pass (build, lint, typecheck, schemas, full suite with coverage, package smoke), and CI is green on Linux, macOS, and Windows for `8dd3baa`. The review cycle is closed. The TechSpec defines end-to-end cases (TC-21 and the real-shell suite) and a manual acceptance script, so the next step is `sdd-execute-qa` before HIL 3.
