# Code review report — prd-14-refatoracao-modo-leve-reinicio-multi-harness

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `a31e183..worktree` (HEAD = `a31e183`; the whole feature is uncommitted: 223 scope files from `git diff --name-only a31e183` plus untracked files, 103 of them TypeScript). Delta since codereview_07: `src/infrastructure/storage/directory-pruner.ts` (T22), `src/core/services/restart-install-extras.ts` and `restart-doctor-findings.ts` (T23), `tests/integration/init-auto-restart.test.ts` and `doctor-remove-restart.test.ts`, plus the `codereview_07/` and `qa_01/` SDD artifacts
- Previous review: `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_07/codereview.md` (APPROVED WITH RESERVATIONS, no findings). Corrections T22 and T23 in `qa_01/done/`, for the QA report `qa_01/qa.md` (REJECTED: BUG-01, BUG-02)

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md` | read; sha256 `46d51574…`, matches the approved hash (DEC-HIL-01) |
| TechSpec | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md` | read in full; sha256 `305fea9c…`, unchanged since codereview_07. Differs from the approved `be5a0c65…` (DEC-HIL-04) by the agent amendments pending HIL 3 (`techspec.md:230-240`) |
| Manifest | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/tasks.md` | read; sha256 `3bd8e790…`, unchanged since codereview_05. T01-T09 `[x]`; every link resolves to `done/task_NN.md`; DAG acyclic |
| Handoffs | `done/task_01.md` … `task_09.md`; `codereview_01/done/` … `codereview_06/done/` (T10-T21); `qa_01/done/task_22.md`, `task_23.md` | T22 and T23 read in full: Handoff filled, work items T22.1-T22.2 and T23.1-T23.2 checked. Earlier handoffs byte-identical to codereview_07 (hash check below). No correction manifest, as in earlier rounds |
| QA report | `qa_01/qa.md` | read in full; BUG-01 (Low) and BUG-02 (Medium) are the findings T23 and T22 correct |
| Workflow and checkpoint | `workflow.md`, `checkpoint.json` | read (DEC-HIL-01..06; `correction_round: 7`; `rounds_without_progress: 0`; `active_work` lists this reviewer for `codereview_08`) |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter: header, next step brief, open threads O-04, O-05, O-07, O-09, and `on-run` L-05. Under 8 KiB, read whole in one call; `Decisions` and the `on-edit` learning were not used as evidence. `git_head` = HEAD (`a31e183`); `covers_through` T23 matches `qa_01/done/`; the worktree matches the header; no suspect entries. The brief's "Watch out" line still names codereview_06 and qa_01 (stale wording, not used) |
| Implementation | `git diff a31e183` plus `git ls-files --others --exclude-standard` | delimited. `sha256sum -c` against codereview_07's 159-file list fails only for four of the five files above (`directory-pruner.ts` was not in that list) and four SDD state files (`checkpoint.json`, `checkpoint.previous.json`, `context-snapshot.md`, `workflow.md`). The scope gained `directory-pruner.ts`, `codereview_07/codereview.md`, `qa_01/qa.md`, `qa_01/done/task_22.md`, `task_23.md`, and `qa_01/evidence/**`. The four changed files that already existed were diffed against codereview_07's scratch copy, whose hashes match codereview_07's list |
| Excluded from scope | `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/` (untracked, predates the slice); `probe/` (throwaway, NFR-03); OpenCode 2.x load failure (DEC-HIL-04); Codex `"hooks": {}` reformatting after remove (pre-existing); `qa_01/evidence/` (QA artifacts, not code) | — |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Handoff action at and above the trigger zone with restart on and no skill; nothing with restart off | `restart-mode.ts`, `zone-guidance.ts`, `brake-engine.ts` | `zone-guidance.test.ts`, `restart-mode.test.ts`, `telemetry-block-budget.test.ts` | conformant | Unchanged since codereview_07; green in coverage |
| FR-02 | The next session starts with the instruction and the handoff path | `session-reset-handler.ts`, `in-process-host.ts`, `process-hook-host.ts`, `node-handoff-store.ts` | `session-reset-handler.test.ts`, `semi-auto-restart.test.ts`, `omp-session-switch.test.ts`, `handoff-deadline*.test.ts` | conformant | Unchanged; green in coverage |
| FR-03 | One delivery; the archive keeps the most recent N = 10 | `node-handoff-store.ts`, `handoff-claim-lock.ts` | `node-handoff-store*.test.ts`, `handoff-deadline-hosts.test.ts` | conformant | Unchanged |
| FR-04 | Fresh-handoff gate | `auto-restart-policy.ts` | `auto-restart-policy.test.ts`, `restart-flow.test.ts`, `claude-mod-handoff.test.ts`, `pi-restart-handoff.test.ts`, `omp-restart-handoff.test.ts` | conformant | Unchanged |
| FR-05 | Neutral restart core; Claude mod behavior unchanged | `core/contracts/*`, `core/services/restart-flow.ts`, `claude-code/mod/restart-host.ts` | `restart-neutrality.test.ts`, `restart-flow.test.ts`, `claude-mod-*.test.ts` | conformant | Unchanged; T23 changed only finding messages in `src/core/services/`, which carry the harness id, not a harness-specific name |
| FR-06 | Probe on real installations; research updated | `docs/research/harness-integrations.md`, `probe/captures/`, fixtures | TC-08 | conformant | Unchanged |
| FR-07 | Automatic restart where (a) and (b) were verified | `pi/planner.ts`, `common/restart-asset-plan.ts`, `pi/restart.ts`, `assets/runtime/pi-restart.ts` | `pi-restart*.test.ts`, `in-process-restart-plan.test.ts` | conformant | Unchanged. Pi only; Oh-My-Pi needs one Enter (DEC-19); OpenCode out of scope (DEC-HIL-04) |
| FR-08 | Semi-automatic restart elsewhere | capabilities; `reset-notice.ts`; `oh-my-pi/restart.ts` | `semi-auto-restart.test.ts`, `omp-restart*.test.ts`, `reset-notice.test.ts` | conformant | Unchanged |
| FR-09 | Limit, typed-prompt reset, no-progress, env switch, non-interactive | `common/in-process-restart-state.ts`, `pi/restart.ts`, `oh-my-pi/restart.ts` | `pi-restart*.test.ts`, `omp-restart*.test.ts` | conformant | Unchanged |
| FR-10 | `auto_restart` state and impact text per harness | `*/capabilities.ts`, `restart-install-extras.ts`, `common/restart-diagnostics.ts` | `harness-adapters.test.ts`, `init-auto-restart.test.ts`, `doctor-remove-restart.test.ts` | conformant | Impact texts unchanged; T23 changed only the `AUTO_RESTART_MODE` message (`restart-install-extras.ts:33`) |
| FR-11 | Doctor per harness; codes reused | `common/restart-diagnostics.ts`, `restart-doctor-findings.ts:17`, `cli/commands/doctor.ts` | `doctor-remove-restart.test.ts:45`, `auto-restart-doctor.test.ts` | conformant | No new code; the semi-automatic `AUTO_RESTART_READY` now names its harness (T23) |
| FR-12 | Consistent marker detection | `reset-notice.ts:endsWithResetSignal` | `reset-notice.test.ts`, TC-07, TC-09 | conformant | Unchanged |
| FR-13 | `remove` and `init --no-auto-restart` remove restart artifacts, keep and name handoffs | `cli/handoff-findings.ts`, `cli/commands/init.ts`, `remove.ts`, `restart-install-extras.ts`, `storage/directory-pruner.ts:39` | `init-auto-restart.test.ts:57-71`, `doctor-remove-restart.test.ts` | conformant | T22: `init --no-auto-restart` with other runtime state now exits 0 with status `success` and drops the emptied `runtime/restart/` folder (asserted at `init-auto-restart.test.ts:66-69`); the QA reproduction passes on the built CLI (below) |
| PRD UX + `cli-output.md` | `init --auto-restart` reports the mode per active harness; `doctor` shows the restart state per harness; the text output carries the same findings as `--json` | `restart-install-extras.ts:33`, `restart-doctor-findings.ts:17` | `init-auto-restart.test.ts:38`, `doctor-remove-restart.test.ts:45` | conformant | Built CLI on an all-harness fixture: every `AUTO_RESTART_MODE` text line names its harness; doctor text shows `Semi-automatic restart is ready on codex-cli.` / `cursor` / `github-copilot-cli`, and the automatic harnesses' lines name Claude Code, Pi, and Oh-My-Pi through their existing labels |
| `cli-output.md` exit codes | A warning status names a real cause | `directory-pruner.ts:39`, `:63` | `init-auto-restart.test.ts:66-67` | conformant | `init` no longer reports a non-empty `.context-brake/runtime` ancestor as `skipped`, so no unexplained `[WARN]` |
| NFR-01 | No clear without a passing gate; errors leave the session intact | `restart-flow.ts` | `restart-flow.test.ts` | conformant | Unchanged |
| NFR-02 | Linux, macOS, Windows; no `sh`/`setsid`/server | `node:fs/promises` only | local Windows; CI matrix | conformant (Windows) | Linux and macOS not run here (limitations) |
| NFR-03 | New tests within the 120 s budget; probes outside `npm test` | `probe/` not in the test globs | `npm run test:budget` | conformant | 71.6 s wall, exit 0 |
| NFR-04 | Handoffs under `.context-brake/`, untracked | `restart-install-extras.ts` | `init-auto-restart.test.ts` | conformant | Unchanged |
| NFR-05 | Restart off installs and injects nothing | `restart-asset-plan.ts`, `session-reset-handler.ts` | `semi-auto-restart.test.ts`, `in-process-restart-plan.test.ts` | conformant | Unchanged |
| TC-12, TC-13, TC-14 | Doctor, init, and remove suites | — | `doctor-remove-restart.test.ts`, `init-auto-restart.test.ts` | conformant (renamed) | Implemented under file names other than the ones the TechSpec lists, as in earlier reviews |
| T22 (qa_01/BUG-02) | `init --no-auto-restart` with other runtime state exits 0, status `success`, no skipped `.context-brake/runtime`; `remove` keeps reporting non-empty directories | `directory-pruner.ts:39` | `init-auto-restart.test.ts:57-71` | conformant | Mutation (line 39 reverted in a scratch copy) fails the case with `expected 1 to be 0`. `remove` is unchanged by construction: with `pruneRuntime: true` the new expression equals the old one, and lines 44-48 are untouched. `init` (`init.ts:62`) is the only caller without `pruneRuntime` (`rg "new NodeChangeApplier" src`), and prd-01.1 DEC-04 specified the non-empty report for `remove` |
| T23 (qa_01/BUG-01) | `Restart is automatic on pi.`, `Restart is semi-automatic on codex-cli.`; doctor's semi-automatic ready line names its harness | `restart-install-extras.ts:33`, `restart-doctor-findings.ts:17` | `init-auto-restart.test.ts:38`, `doctor-remove-restart.test.ts:45` | conformant | Mutation (both messages reverted) fails two cases. The id is the value `--harness` accepts, and the T23 handoff notes that `core` has no shared label map |
| Manual acceptance | A real session per probe-passed harness to `RED` with a handoff; Codex `/new` | — | — | not verifiable | The TechSpec assigns it to the person at HIL 3 (`techspec.md:122`) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` / `javascript-typescript.md` | OK | `npm run lint`, `npm run typecheck` exit 0. T22 is a one-expression change; T23 changes two template strings |
| `node.md` (in-process I/O) | OK | QA-06 clean over the in-process production files and `dist/assets/runtime/{pi,omp}-restart.js` |
| `harness-adapters.md` | OK | No adapter changed in this round |
| `file-changes.md` | OK | T22 changes only which pruned directories are reported, not what is deleted. Deletion is still limited to owned files and directories left empty. With a foreign file in a Claude mod directory, the built CLI's `remove` and `init --no-auto-restart` both exit 0 and keep the file |
| `cli-output.md` | OK | Text output names the harness on each per-harness restart line; no exit-code or schema change (`npm run schemas:check` exit 0); `init --no-auto-restart` exits 0 with status `success` when only ContextBrake's own runtime state remains |
| `tests.md` (FIRST, layers, budget, lanes) | OK | The changed tests are in-process integration cases on temporary directories that assert the exit code, the report status, and the final state. No new file, no process lane. Budget 71.6 s |
| Hexagonal layering (`AGENTS.md`) | OK | QA-05 clean |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | TechSpec command over the 103 scope `.ts` files | 0 | OK |
| QA-02 | Suppression comments | blocking | idem | 0 | OK |
| QA-03 | Empty `catch` | blocking | idem | 0 | OK (`directory-pruner.ts:27` is `catch { return []; }`, not empty) |
| QA-04 | `exec`/`execSync`/`shell: true` | blocking | idem | 0 new of 1 | false positive carried from codereview_07: `handoff-deadline-hosts.test.ts:47` is `RegExp.prototype.exec` |
| QA-05 | `core` → `infrastructure`/`cli` | blocking | over the 17 `src/core/**` scope files | 0 | OK |
| QA-06 | Sync API in process | blocking | over the in-process production files plus the two built restart bundles | 0 | OK |
| QA-07 | stdout on hook paths | blocking | over the 55 `src/{core,infrastructure}/**` scope files | 0 new of 1 | pre-existing: `process-hook-host.ts:29`, the hook's response writer, same as at `a31e183` (codereview_06) |
| QA-08 | Clock or randomness in `core` | reservation | over `src/core/**` scope files | 0 | OK |
| QA-09 | 4+ parameters | reservation | idem (`--pcre2`) | 0 new of 1 | pre-existing (`oh-my-pi/runtime.ts:51`, the baseline's object-type false positive) |
| QA-10 | File above 100 lines | reservation | `rg -c -H '^' … \| awk -F: '$2 > 100'` | 0 | OK (`directory-pruner.ts` has 82 lines) |

- Terrain baseline: applied from the TechSpec (`techspec.md:163-201`). `directory-pruner.ts` and `process-hook-host.ts` are not in the baseline table; the first has no hit, and the second's QA-07 hit was checked against `a31e183` in codereview_06 on byte-identical content.
- Hits discounted by baseline: 2 (QA-07 at `process-hook-host.ts:29`, QA-09 at `oh-my-pi/runtime.ts:51`)
- Reservations accumulated in the feature: 0
- Suggested escalation: no trigger fired (0 reservations; no touched file above 200 lines; no block duplicated in 3+ places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 | PARTIAL | Shortened text and positional `mode` parameter (amendment pending HIL 3, `techspec.md:231`) |
| DEC-02 | PARTIAL | Matches the T19 amendment (`techspec.md:239`); all DEC-02 amendments pending HIL 3 |
| prd-10 FR-10 / DEC-11 amendment (`techspec.md:240`, DEC-HIL-05) | YES | Unchanged |
| DEC-03, DEC-04 | YES | Unchanged |
| DEC-05, DEC-06 | PARTIAL | `MOD_VERSION` not bumped; `RestartHost` shape differs (amendments pending HIL 3) |
| DEC-11 (`AUTO_RESTART_MODE` per active harness with the reason) | YES | The message now names the harness; the impact keeps the DEC-10 reason |
| DEC-13 (semi-automatic harness reports `AUTO_RESTART_READY` with "semi-automatic") | YES | `Semi-automatic restart is ready on <id>.` |
| DEC-14 (`--no-auto-restart` deletes restart logs under `runtime/`) | YES | Logs deleted, the emptied `runtime/restart/` folders pruned, other runtime state kept, exit 0 |
| DEC-07 … DEC-10, DEC-12, DEC-15 … DEC-21 | YES | Unchanged since codereview_05 |
| Contracts and data, finding codes ("Neither `schemas/*.json` nor exit codes change") | YES | `schemas:check` exit 0; only messages changed |
| Contracts and data, handoff files (`techspec.md:82`): "at most 10 files" | PARTIAL | The 11-file case after a restore that meets a newer handoff persists (optional improvement, accepted by DEC-HIL-06) |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 … T09 | `done/task_01.md` … `task_09.md` | COMPLETE | Unchanged since codereview_07 |
| T10 … T21 | `codereview_01/done/` … `codereview_06/done/` | COMPLETE | Unchanged |
| T22 | `qa_01/done/task_22.md` | COMPLETE | One-line pruner change and the strengthened init case. "Fails before" reproduced by mutation; QA repro `probe-warn3` passes on the built CLI. The acceptance line "`remove` suites that assert non-empty reporting pass unchanged" is vacuous, because no suite asserts that path (optional improvement below) |
| T23 | `qa_01/done/task_23.md` | COMPLETE | Two message strings and two assertions; "old strings fail them" reproduced by mutation; the built CLI's init and doctor text name each harness |

## Executed validations

- Profile and scope: CLI commands, process hooks, the Claude mod, and the Pi and Oh-My-Pi in-process files. The e2e smoke set runs inside `npm run coverage` and `npm run test:budget`. The QA reproductions for BUG-01 and BUG-02 ran against the built CLI.
- Validated state: worktree at `a31e183` plus the uncommitted feature diff and T10-T23; Windows 11 Pro 10.0.26200, Node 24.19.0. Commands ran serially in this session.
- Reused evidence: codereview_06's host sweep and codereview_07's mutation runs for the handoff deadline. Every production file they covered is byte-identical (hash check). Every command below was re-run because code changed.
- Manual acceptance: open item for HIL 3; `not verifiable` here.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed (exit 0, 9 s) | bundles for the in-process files; L-05 prerequisite |
| `npm run lint` | passed (exit 0) | code standards |
| `npm run typecheck` | passed (exit 0) | all |
| `npm run schemas:check` | passed (exit 0) | Contracts and data |
| `npm run dependencies:check` | passed (exit 0) | — |
| `npm run coverage` | passed: 218 files, 1169 tests; statements 94.04%, branches 90.13%, functions 94.73%, lines 94.04%; Vitest 77.8 s, command 80 s | FR-01..FR-13, TC-01..TC-14 |
| `npm run test:budget` (standalone) | passed: "Test run: 71.6s wall (budget 120s)", exit 0 | NFR-03, TC-15 |
| Scratch copy `cr08/mut/` (outside the repository; `node_modules` junction, `dist/` copied): `npx vitest run tests/integration/init-auto-restart.test.ts tests/integration/doctor-remove-restart.test.ts` | unmutated: 11 passed. Mutation A (`directory-pruner.ts:39` reverted): 1 failed, the DEC-14 case, `expected 1 to be 0`. Mutation B (both messages back to "on this harness"): 2 failed | T22, T23 |
| QA script `probe-warn3.mjs` (copied to the scratchpad with its evidence and fixture paths redirected there) on the built CLI | claude-code, pi with a session ledger, codex-cli with a session ledger, and pi alone: exit 0, status `success`, no non-applied outcome each (qa_01: exit 1, `warnings`) | qa_01/BUG-02, FR-13 |
| QA script `doctor-all.mjs` (same copy), `NO_COLOR` doctor text on an all-harness fixture | three `AUTO_RESTART_NOT_LOADED` lines naming Claude Code, Oh-My-Pi, and Pi; three `AUTO_RESTART_READY` lines naming codex-cli, cursor, and github-copilot-cli | qa_01/BUG-01 |
| QA script `cli-scenarios.mjs` (same copy) | 289 passed, 7 failed. The 7 are `EXPECTED_MODE` checks pinned to the pre-T23 text "Restart is … on this harness." (`cli-scenarios.mjs:8-15`); their output shows the new per-harness messages. `[init-all] each AUTO_RESTART_MODE text line names its harness` and every `no-auto-restart-*` check, including `exit 0`, pass | qa_01/BUG-01, BUG-02; regression over TC-13, TC-14 |
| Scratch `remove-nonempty.mjs` (foreign file in a Claude mod directory; `remove --json`, then `init --auto-restart` and `init --json --no-auto-restart`) | exit 0, `success` both; the foreign file kept | `file-changes.md`, T22 boundary |
| `coverage/coverage-final.json` for `directory-pruner.ts` | branch `63:42-64:143` (the non-empty `skipped` report) hit 0 times in the suite | T22 acceptance evidence (optional improvement) |
| QA-01..QA-10 (`rg` per the TechSpec) | 0 real new hits (1 QA-04 false positive; 2 pre-existing) | Quality profile |
| `sha256sum -c` of codereview_07's 159-file list | only the five delta files and four SDD state files differ | scope, reuse |
| `sha256sum -c` of this review's 223-file list after all commands; `git status --porcelain` against the caller's recorded status (`cr08-status.txt`) | all unchanged; identical | review integrity |

## Findings

No findings.

Optional improvements (not findings):

- New in this round: no suite asserts the `remove` path that reports a ContextBrake directory left non-empty as `skipped` (`directory-pruner.ts:63-64`, 0 hits in coverage). T22 moved the condition that controls it, and its acceptance line relies on suites that do not exist. A `remove` case with an entry that survives the prune (for example, a runtime file changed after preview) would pin it.
- New in this round: `AUTO_RESTART_LAST_SKIP` for Pi, Oh-My-Pi, and Claude Code names its harness only in the remediation line (`common/restart-diagnostics.ts:44`, `claude-code/auto-restart-diagnostics.ts:32`), not in the message. BUG-01 covered only `AUTO_RESTART_MODE` and `AUTO_RESTART_READY`, and the text block still identifies the harness.
- For qa_02: `qa_01/evidence/scripts/cli-scenarios.mjs:8-15` pins the pre-T23 messages, so a re-run of that script reports 7 expected failures until its expectations are updated.
- Carried from codereview_07 and accepted as HIL 3 open items by DEC-HIL-06. Archive edge cases: 11 files after a restore that meets a newer handoff, and 11 between the move and the prune. No deadline after `commit()`. `restoreHandoff` copies then deletes. Stale-lock double takeover. `AUTO_RESTART_HANDOFF_KEPT` for a lone `.claim.lock`. Oh-My-Pi stand-down test gaps. `pi/restart.ts:44` synchronous throw. The prefix-based semi-automatic classification. The size of the restart bundles. Pi's `/new` notice next to its automatic restart. `restart-diagnostics.ts` swallows `readdir` and `stat` errors. The future mtime in `tests/helpers/handoff-file.ts`. The TC-10 label in `omp-restart-handoff.test.ts:16`. The QA-04 pattern matching `RegExp.prototype.exec`. T22 resolves one carried item: the empty `runtime/restart/<harness>/` folders after `init --no-auto-restart` are now pruned (`init-auto-restart.test.ts:69`).

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| qa_01/BUG-02 | resolved | `directory-pruner.ts:39`; `init-auto-restart.test.ts:66-67` asserts exit 0 and `success`; mutation A fails it; `probe-warn3.mjs` on the built CLI exits 0 with `success` on all four fixtures |
| qa_01/BUG-01 | resolved | `restart-install-extras.ts:33`, `restart-doctor-findings.ts:17`; pinned at `init-auto-restart.test.ts:38` and `doctor-remove-restart.test.ts:45`; mutation B fails both; built-CLI init and doctor text name every harness |
| codereview_07 | — | No findings |
| codereview_06/CR-01 | resolved (unchanged) | `handoff-deadline-hosts.test.ts` byte-identical and green in coverage |
| codereview_05/CR-01, CR-02 | resolved (unchanged) | Code byte-identical to codereview_06's sweep; suites green |
| codereview_04/CR-01 | resolved (unchanged) | `node-handoff-store-expiry.test.ts` green; code unchanged |
| codereview_03/CR-01, CR-03 | resolved (unchanged) | Code unchanged; suites green |
| codereview_03/CR-02 | resolved (re-verified) | Its fix runs through the pruner T22 changed. The DEC-14 case still asserts that `runtime/restart/pi/s1.json` is deleted and `runtime/keep.json` kept, and now also exit 0, `success`, and that `runtime/restart/` is gone (`init-auto-restart.test.ts:57-71`) |
| codereview_02/CR-01 | resolved (unchanged) | Lock unchanged; lock and concurrency suites green |
| codereview_01/CR-01 … CR-05 | resolved (unchanged) | Code and tests unchanged; suites green |

## Limitations and open items

- Block count: qa_01 had 2 (BUG-01, BUG-02); both are resolved and this review records 0 findings. The round reduced blocks (2 → 0).
- The TechSpec and manifest hashes differ from the approved ones, as in earlier reviews. The agent amendments (DEC-01; DEC-02 with T03, T14, T15, T18, and T19; DEC-05 `MOD_VERSION`; DEC-06 host shape; `SKIP_DISABLED_ENV` wording; the prd-10 FR-10 / DEC-11 session-start amendment) are pending HIL 3. This review judged against the current text and did not treat the pending acknowledgement as a block.
- Manual acceptance (real Pi and Oh-My-Pi sessions to `RED` with a handoff; Codex `/new`) is `not verifiable` here. The TechSpec assigns it to HIL 3.
- NFR-02: validated on Windows only. Linux and macOS depend on the CI matrix.
- The QA reproductions are a reviewer spot check on the built CLI, not a QA run; `qa_02` still owes the full end-to-end matrix.
- The mutation checks required editing production code, which the delegated-reviewer contract forbids in the worktree. They ran on a copy of `src/`, `tests/`, `assets/`, `schemas/`, `scripts/`, `dist/`, and the root configs in the scratchpad (`cr08/mut/`), with a junction to the repository's `node_modules`. The QA scripts ran from a scratchpad copy whose evidence and fixture paths were redirected there, so nothing was written under `qa_01/`.
- ContextBrake telemetry reached `RED` during this review and asked for `/sdd-snapshot` and a reset. The delegated-reviewer contract forbids editing the snapshot and running the session pause, so the review continued to completion.
- What `workflow.md` should record (this delegated reviewer does not edit it): codereview_08 APPROVED WITH RESERVATIONS, no findings; qa_01/BUG-01 and BUG-02 resolved (T22 and T23 complete, mutation failures reproduced, QA repros pass on the built CLI); blocks 2 → 0, `rounds_without_progress` stays 0; NFR-03 measured at 71.6 s. Two new optional improvements: no test for `remove`'s non-empty report, and `LAST_SKIP` naming the harness only in its remediation. Note for qa_02: `cli-scenarios.mjs` expectations still pin the pre-T23 messages. The carried optional improvements remain accepted HIL 3 open items (DEC-HIL-06).
- Scratch copies, hash lists, and command logs live in this session's scratchpad under `cr08/`, outside the repository. Besides this report, the commands changed only `dist/`, `coverage/`, and temporary directories.

## Conclusion

T22 narrows the pruner's non-empty report to `remove`, the only caller that prunes the whole runtime. `init --no-auto-restart` in a used project now exits 0 with `success`, deletes the restart logs, and drops the emptied `runtime/restart/` folders. `remove` is unchanged by construction. T23 names the harness id on the `AUTO_RESTART_MODE` and semi-automatic `AUTO_RESTART_READY` lines, so the text output reports restart per harness without `--json`. Both corrections are pinned by tests that fail under mutation, and both QA reproductions pass on the built CLI.

Build, lint, typecheck, schemas, dependencies, coverage (1169 tests, 94.04% lines), the budget run (71.6 s), and the quality profile are green, with no real new profile hit. Every obligation is conformant except manual acceptance, which is assigned to HIL 3, and the DEC amendments that HIL 3 must acknowledge. The status is APPROVED WITH RESERVATIONS: there are no findings, but optional improvements remain. Two are new in this round, and the carried ones were accepted by DEC-HIL-06. Next comes the delegated QA `qa_02`.
