# Code review report — prd-14-refatoracao-modo-leve-reinicio-multi-harness

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `a31e183..worktree` (HEAD = `a31e1833d195a02614d4e64f8ccc29199b1df83d`; the whole feature is uncommitted: 65 files from `git diff --name-only a31e183` plus 160 untracked files outside `tasks/prd-11-…/rtk/`, 225 in all, 104 of them TypeScript). Delta since codereview_08: `tests/integration/directory-pruner.test.ts` (T24) plus the SDD artifacts `codereview_08/codereview.md` and `codereview_08/done/task_24.md`. No production file changed
- Previous review: `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_08/codereview.md` (APPROVED WITH RESERVATIONS, no findings). Correction T24 in `codereview_08/done/task_24.md`, ordered by DEC-HIL-07 for codereview_08's first optional improvement

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md` | read; sha256 `46d51574…`, matches the approved hash (DEC-HIL-01) |
| TechSpec | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md` | read in full; sha256 `305fea9c…`, unchanged since codereview_07. Differs from the approved `be5a0c65…` (DEC-HIL-04) by the agent amendments pending HIL 3 (`techspec.md:230-240`) |
| Manifest | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/tasks.md` | read; sha256 `3bd8e790…`, unchanged since codereview_05. T01-T09 `[x]`; every link resolves to `done/task_NN.md`; DAG acyclic |
| Handoffs | `done/task_01.md` … `task_09.md`; `codereview_01/done/` … `codereview_06/done/` (T10-T21); `qa_01/done/task_22.md`, `task_23.md`; `codereview_08/done/task_24.md` | T24 read in full: work items T24.1-T24.3 checked, Handoff filled, depends on T22 and DEC-HIL-07, scope limited to one test file. Earlier handoffs byte-identical to codereview_08 (hash check below). No correction manifest, as in earlier rounds |
| Workflow and checkpoint | `workflow.md`, `checkpoint.json` | read (DEC-HIL-01..07; `correction_round: 8`; `rounds_without_progress: 0`; `active_work` lists this reviewer for `codereview_09`) |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter: header, next step brief, open threads O-04, O-05, O-07, O-09, and `on-run` L-05. Under 8 KiB, read whole; `Decisions` and the `on-edit` learning were not used as evidence. `git_head` = HEAD (`a31e183`); `covers_through` T24 matches `codereview_08/done/`; the worktree matches the header; no suspect entries. The brief's "Watch out" line is stale (names codereview_06 and qa_01, and says `rounds_without_progress` = 1 where the checkpoint says 0); the checkpoint wins, and the line was not used |
| Implementation | `git diff a31e183` plus `git ls-files --others --exclude-standard` | delimited. `sha256sum -c` against codereview_08's 223-file list fails only for four SDD state files (`checkpoint.json`, `checkpoint.previous.json`, `context-snapshot.md`, `workflow.md`). The scope gained `tests/integration/directory-pruner.test.ts` (tracked at the base, modified by T24) and the two codereview_08 artifacts |
| Excluded from scope | `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/` (untracked, predates the slice); `probe/` (throwaway, NFR-03); OpenCode 2.x load failure (DEC-HIL-04); Codex `"hooks": {}` reformatting after remove (pre-existing); `qa_01/evidence/` (QA artifacts, not code) | — |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Handoff action at and above the trigger zone with restart on and no skill; nothing with restart off | `restart-mode.ts`, `zone-guidance.ts`, `brake-engine.ts` | `zone-guidance.test.ts`, `restart-mode.test.ts`, `telemetry-block-budget.test.ts` | conformant | Code and tests byte-identical to codereview_08; green in coverage |
| FR-02 | The next session starts with the instruction and the handoff path | `session-reset-handler.ts`, `in-process-host.ts`, `process-hook-host.ts`, `node-handoff-store.ts` | `session-reset-handler.test.ts`, `semi-auto-restart.test.ts`, `omp-session-switch.test.ts`, `handoff-deadline*.test.ts` | conformant | Unchanged; green |
| FR-03 | One delivery; the archive keeps the most recent N = 10 | `node-handoff-store.ts`, `handoff-claim-lock.ts` | `node-handoff-store*.test.ts`, `handoff-deadline-hosts.test.ts` | conformant | Unchanged; green |
| FR-04 | Fresh-handoff gate | `auto-restart-policy.ts` | `auto-restart-policy.test.ts`, `restart-flow.test.ts`, `claude-mod-handoff.test.ts`, `pi-restart-handoff.test.ts`, `omp-restart-handoff.test.ts` | conformant | Unchanged; green |
| FR-05 | Neutral restart core; Claude mod behavior unchanged | `core/contracts/*`, `core/services/restart-flow.ts`, `claude-code/mod/restart-host.ts` | `restart-neutrality.test.ts`, `restart-flow.test.ts`, `claude-mod-*.test.ts` | conformant | Unchanged; green |
| FR-06 | Probe on real installations; research updated | `docs/research/harness-integrations.md`, `probe/captures/`, fixtures | TC-08 | conformant | Unchanged |
| FR-07 | Automatic restart where (a) and (b) were verified | `pi/planner.ts`, `common/restart-asset-plan.ts`, `pi/restart.ts`, `assets/runtime/pi-restart.ts` | `pi-restart*.test.ts`, `in-process-restart-plan.test.ts` | conformant | Unchanged. Pi only; Oh-My-Pi needs one Enter (DEC-19); OpenCode out of scope (DEC-HIL-04) |
| FR-08 | Semi-automatic restart elsewhere | capabilities; `reset-notice.ts`; `oh-my-pi/restart.ts` | `semi-auto-restart.test.ts`, `omp-restart*.test.ts`, `reset-notice.test.ts` | conformant | Unchanged |
| FR-09 | Limit, typed-prompt reset, no-progress, env switch, non-interactive | `common/in-process-restart-state.ts`, `pi/restart.ts`, `oh-my-pi/restart.ts` | `pi-restart*.test.ts`, `omp-restart*.test.ts` | conformant | Unchanged |
| FR-10 | `auto_restart` state and impact text per harness | `*/capabilities.ts`, `restart-install-extras.ts`, `common/restart-diagnostics.ts` | `harness-adapters.test.ts`, `init-auto-restart.test.ts`, `doctor-remove-restart.test.ts` | conformant | Unchanged |
| FR-11 | Doctor per harness; codes reused | `common/restart-diagnostics.ts`, `restart-doctor-findings.ts`, `cli/commands/doctor.ts` | `doctor-remove-restart.test.ts`, `auto-restart-doctor.test.ts` | conformant | Unchanged |
| FR-12 | Consistent marker detection | `reset-notice.ts:endsWithResetSignal` | `reset-notice.test.ts`, TC-07, TC-09 | conformant | Unchanged |
| FR-13 | `remove` and `init --no-auto-restart` remove restart artifacts, keep and name handoffs | `cli/handoff-findings.ts`, `cli/commands/init.ts`, `remove.ts`, `storage/directory-pruner.ts:39`, `:63-64` | `init-auto-restart.test.ts:57-71`, `doctor-remove-restart.test.ts`, `directory-pruner.test.ts:63-85` (T24) | conformant | T24 pins both sides of the condition T22 moved: under `pruneRuntime: true` (`remove.ts:59`) the non-empty `.context-brake/runtime` is reported as `skipped`; under the default (`change-applier.ts:73`, `pruneRuntime ?? false`, used by `init.ts:62`) the prune is silent, the report is `success`, `runtime/restart/` is gone and `keep.json` stays |
| `file-changes.md` (remove reports what it could not delete) | A ContextBrake directory left non-empty after `remove` appears as `skipped` with its reason | `directory-pruner.ts:62-64` | `directory-pruner.test.ts:64-72` | conformant | Branch `63:42` (the report) is hit once in `coverage/coverage-final.json`; codereview_08 recorded 0 hits |
| `cli-output.md` exit codes | A warning status names a real cause | `directory-pruner.ts:39`, `:63` | `init-auto-restart.test.ts:66-67`, `directory-pruner.test.ts:77` | conformant | Unchanged code; the new silent-prune case also asserts `success` |
| NFR-01 | No clear without a passing gate; errors leave the session intact | `restart-flow.ts` | `restart-flow.test.ts` | conformant | Unchanged |
| NFR-02 | Linux, macOS, Windows; no `sh`/`setsid`/server | `node:fs/promises` only | local Windows; CI matrix | conformant (Windows) | Linux and macOS not run here (limitations) |
| NFR-03 | New tests within the 120 s budget; probes outside `npm test` | `probe/` not in the test globs | `npm run test:budget` | conformant | 79.1 s wall, exit 0 |
| NFR-04 | Handoffs under `.context-brake/`, untracked | `restart-install-extras.ts` | `init-auto-restart.test.ts` | conformant | Unchanged |
| NFR-05 | Restart off installs and injects nothing | `restart-asset-plan.ts`, `session-reset-handler.ts` | `semi-auto-restart.test.ts`, `in-process-restart-plan.test.ts` | conformant | Unchanged |
| TC-12, TC-13, TC-14 | Doctor, init, and remove suites | — | `doctor-remove-restart.test.ts`, `init-auto-restart.test.ts`, `directory-pruner.test.ts` | conformant (renamed) | Implemented under file names other than the ones the TechSpec lists, as in earlier reviews |
| T24 (codereview_08 reservation 1, DEC-HIL-07) | Two integration cases; each fails under its mutation; no production change | — | `directory-pruner.test.ts:54-85` | conformant | Hand trace and mutations below. No file under `src/`, `assets/`, `scripts/`, or `schemas/` changed since codereview_08 (hash check) |
| Manual acceptance | A real session per probe-passed harness to `RED` with a handoff; Codex `/new` | — | — | not verifiable | The TechSpec assigns it to the person at HIL 3 (`techspec.md:122`) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` / `javascript-typescript.md` | OK | `npm run lint`, `npm run typecheck` exit 0 with the new test file. The helper `restartLogPlan` has one parameter and an explicit return type |
| `tests.md` (FIRST, layers, budget, lanes) | OK | Two in-process integration cases, each in its own `mkdtemp` directory removed in `finally`; they assert observable outcomes (report entries, status, final files), not calls. No new file, no process lane (the file runs in the `parallel` lane). Budget 79.1 s |
| `node.md` (in-process I/O) | OK | QA-06 clean over the 26 in-process production files and `dist/assets/runtime/{pi,omp}-restart.js` |
| `harness-adapters.md` | N/A | No adapter changed in this round |
| `file-changes.md` | OK | No production change; the new remove case pins the "report what it could not delete" path |
| `cli-output.md` | OK | No output change; `npm run schemas:check` exit 0 |
| Hexagonal layering (`AGENTS.md`) | OK | QA-05 clean over the 17 `src/core/**` scope files |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | TechSpec command over the 104 scope `.ts` files | 0 | OK |
| QA-02 | Suppression comments | blocking | idem | 0 | OK |
| QA-03 | Empty `catch` | blocking | idem | 0 | OK (the new `.catch(() => false)` returns a value) |
| QA-04 | `exec`/`execSync`/`shell: true` | blocking | idem | 0 new of 1 | false positive carried since codereview_07: `handoff-deadline-hosts.test.ts:47` is `RegExp.prototype.exec` |
| QA-05 | `core` → `infrastructure`/`cli` | blocking | over the 17 `src/core/**` scope files | 0 | OK |
| QA-06 | Sync API in process | blocking | over the 26 in-process production files plus the two built restart bundles | 0 | OK |
| QA-07 | stdout on hook paths | blocking | over the 55 `src/{core,infrastructure}/**` scope files | 0 new of 1 | pre-existing: `process-hook-host.ts:29`, the hook's response writer, byte-identical to the content codereview_06 checked against `a31e183` |
| QA-08 | Clock or randomness in `core` | reservation | over `src/core/**` scope files | 0 | OK |
| QA-09 | 4+ parameters | reservation | idem (`--pcre2`), over all 104 files | 0 new of 1 | pre-existing (`oh-my-pi/runtime.ts:51`, the baseline's object-type false positive). The new test's `createChangePlan({ … })` call does not match |
| QA-10 | File above 100 lines | reservation | `rg -c -H '^' … \| awk -F: '$2 > 100'` | 0 | OK (largest: `process-hook-host.ts` 97, `handoff-deadline.test.ts` 96, `oh-my-pi/restart.ts` 95; `directory-pruner.test.ts` 85) |

- Terrain baseline: applied from the TechSpec (`techspec.md:163-201`).
- Hits discounted by baseline: 2 (QA-07 at `process-hook-host.ts:29`, QA-09 at `oh-my-pi/runtime.ts:51`)
- Reservations accumulated in the feature: 0 profile reservation hits
- Suggested escalation: no trigger fired (0 reservation hits; no touched file above 200 lines; no block duplicated in 3+ places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 | PARTIAL | Shortened text and positional `mode` parameter (amendment pending HIL 3, `techspec.md:231`) |
| DEC-02 | PARTIAL | Matches the T19 amendment (`techspec.md:239`); all DEC-02 amendments pending HIL 3 |
| prd-10 FR-10 / DEC-11 amendment (`techspec.md:240`, DEC-HIL-05) | YES | Unchanged |
| DEC-03, DEC-04 | YES | Unchanged |
| DEC-05, DEC-06 | PARTIAL | `MOD_VERSION` not bumped; `RestartHost` shape differs (amendments pending HIL 3) |
| DEC-14 (`--no-auto-restart` and `remove` delete restart logs under `runtime/`; handoffs kept) | YES | Unchanged code; T24 adds a direct pruner pin for both callers |
| DEC-07 … DEC-13, DEC-15 … DEC-21 | YES | Unchanged since codereview_08 |
| Contracts and data, finding codes ("Neither `schemas/*.json` nor exit codes change") | YES | `schemas:check` exit 0 |
| Contracts and data, handoff files (`techspec.md:82`): "at most 10 files" | PARTIAL | The 11-file case after a restore that meets a newer handoff persists (optional improvement accepted by DEC-HIL-06) |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 … T09 | `done/task_01.md` … `task_09.md` | COMPLETE | Byte-identical to codereview_08 |
| T10 … T21 | `codereview_01/done/` … `codereview_06/done/` | COMPLETE | Byte-identical |
| T22, T23 | `qa_01/done/task_22.md`, `task_23.md` | COMPLETE | Byte-identical; code unchanged |
| T24 | `codereview_08/done/task_24.md` | COMPLETE | Both cases pass; each fails under its own mutation and only that one (reproduced below); no production change. The acceptance gap codereview_08 recorded for T22 ("`remove` suites that assert non-empty reporting") is now covered |

Hand trace of T24.1 against `collectCandidateDirectories` (`directory-pruner.ts:32-53`): with `pruneRuntime: true`, the walk from `runtime/restart/pi/s1.json` marks `restart/pi`, `restart`, and `runtime` to report and `.context-brake` not to (line 39, then lines 46-47). Longest path first, `restart/pi` and `restart` are removed, `runtime` keeps `keep.json`, and line 64 yields `Directory is not empty: 1 remaining entry ContextBrake did not delete.`, the exact string at `directory-pruner.test.ts:68`. With the default applier every candidate is unreported, so the non-empty `runtime` and `.context-brake` return `null` (line 63) and the report stays `success`.

## Executed validations

- Profile and scope: CLI commands, process hooks, the Claude mod, and the Pi and Oh-My-Pi in-process files. The e2e smoke set runs inside `npm run coverage` and `npm run test:budget`.
- Validated state: worktree at `a31e183` plus the uncommitted feature diff and T10-T24; Windows 11 Pro 10.0.26200, Node 24.19.0. Commands ran serially in this session; the mutation runs used a separate copy and ran before the budget run.
- Reused evidence: codereview_08's built-CLI QA reproductions (BUG-01, BUG-02), its T22/T23 mutation runs, codereview_06's host sweep, and codereview_07's deadline mutation runs. Every production, asset, script, and schema file they covered is byte-identical (hash check against codereview_08's list). Every command below was re-run because the test set changed.
- Manual acceptance: open item for HIL 3; `not verifiable` here.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed (exit 0, 9 s) | bundles for the in-process files; L-05 prerequisite |
| `npm run lint` | passed (exit 0) | code standards |
| `npm run typecheck` | passed (exit 0) | all |
| `npm run schemas:check` | passed (exit 0) | Contracts and data |
| `npm run dependencies:check` | passed (exit 0) | — |
| `npm run coverage` | passed: 218 files, 1171 tests; statements 94.04%, branches 90.14%, functions 94.73%, lines 94.04%; Vitest 96.3 s, command 99 s | FR-01..FR-13, TC-01..TC-14 |
| `npm run test:budget` (standalone, after coverage) | passed: "Test run: 79.1s wall (budget 120s)", exit 0 | NFR-03, TC-15 |
| Scratch copy `cr09/mut/` (outside the repository; `src/`, `tests/`, `schemas/`, `assets/`, `scripts/`, root configs, `node_modules` junction): `npx vitest run tests/integration/directory-pruner.test.ts` | unmutated: 4 passed. Mutation A, `directory-pruner.ts:39` set to the pre-T22 expression `dirs.set(current, current !== contextBrakeDir);`: only the silent-prune case fails (`expected 'warnings' to be 'success'`). Mutation B, line 63 set to `return null;`: only the remove-report case fails (`toContainEqual` misses the `skipped` outcome). File restored and compared byte-identical to the worktree | T24, FR-13, `file-changes.md` |
| `coverage/coverage-final.json` for `directory-pruner.ts` | branch `63:42` (non-empty report) hit 1 time; `64:137` (plural "entries") 0 | T24 |
| QA-01..QA-10 (`rg` per the TechSpec) | 0 real new hits (1 QA-04 false positive; 2 pre-existing) | Quality profile |
| `sha256sum -c` of codereview_08's 223-file list, at start and after all commands | only the four SDD state files differ, both times | scope, reuse, review integrity |
| `git status --porcelain` at start and after all commands | identical (before this report was written) | review integrity |

## Findings

No findings.

Optional improvements (not findings): none new in this round. Carried and accepted:

- Accepted as a HIL 3 open item by DEC-HIL-07: `AUTO_RESTART_LAST_SKIP` for Pi, Oh-My-Pi, and Claude Code names its harness only in the remediation line (`common/restart-diagnostics.ts:44`, `claude-code/auto-restart-diagnostics.ts:32`).
- Accepted as HIL 3 open items by DEC-HIL-06 (from codereview_05-07): archive edge cases (11 files after a restore that meets a newer handoff, and 11 between the move and the prune); no deadline after `commit()`; `restoreHandoff` copies then deletes; stale-lock double takeover; `AUTO_RESTART_HANDOFF_KEPT` for a lone `.claim.lock`; Oh-My-Pi stand-down test gaps; `pi/restart.ts:44` synchronous throw; the prefix-based semi-automatic classification; the size of the restart bundles; Pi's `/new` notice next to its automatic restart; `restart-diagnostics.ts` swallows `readdir` and `stat` errors; the future mtime in `tests/helpers/handoff-file.ts`; the TC-10 label in `omp-restart-handoff.test.ts:16`; the QA-04 pattern matching `RegExp.prototype.exec`.

Note for qa_02 (not an improvement to the code): `qa_01/evidence/scripts/cli-scenarios.mjs:8-15` still pins the pre-T23 "on this harness" messages, so a re-run of that script reports 7 expected failures until its expectations are updated.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_08 (no findings) — optional improvement 1: no suite asserts `remove`'s non-empty `skipped` report | resolved | T24: `directory-pruner.test.ts:64-72` asserts the report; mutation B fails it; branch `63:42` now hit |
| codereview_08 — optional improvement 2: `AUTO_RESTART_LAST_SKIP` wording | accepted open item (DEC-HIL-07) | Unchanged, by decision |
| qa_01/BUG-01, BUG-02 | resolved (unchanged) | Code byte-identical to codereview_08's verification; `init-auto-restart.test.ts`, `doctor-remove-restart.test.ts` green; BUG-02's pruner condition now also pinned by `directory-pruner.test.ts:73-84` (mutation A) |
| codereview_07 | — | No findings |
| codereview_06/CR-01 | resolved (unchanged) | `handoff-deadline-hosts.test.ts` byte-identical and green |
| codereview_05/CR-01, CR-02 | resolved (unchanged) | Code byte-identical; suites green |
| codereview_04/CR-01 | resolved (unchanged) | `node-handoff-store-expiry.test.ts` green; code unchanged |
| codereview_03/CR-01, CR-02, CR-03 | resolved (unchanged) | Code unchanged; suites green |
| codereview_02/CR-01 | resolved (unchanged) | Lock unchanged; lock and concurrency suites green |
| codereview_01/CR-01 … CR-05 | resolved (unchanged) | Code and tests unchanged; suites green |

## Limitations and open items

- Block count: codereview_08 had 0 findings; this review has 0. No new optional improvement; the round closed the one DEC-HIL-07 ordered.
- The TechSpec and manifest hashes differ from the approved ones, as in earlier reviews. The agent amendments (DEC-01; DEC-02 with T03, T14, T15, T18, and T19; DEC-05 `MOD_VERSION`; DEC-06 host shape; `SKIP_DISABLED_ENV` wording; the prd-10 FR-10 / DEC-11 session-start amendment) are pending HIL 3. This review judged against the current text and did not treat the pending acknowledgement as a block.
- Manual acceptance (real Pi and Oh-My-Pi sessions to `RED` with a handoff; Codex `/new`) is `not verifiable` here. The TechSpec assigns it to HIL 3.
- NFR-02: validated on Windows only. Linux and macOS depend on the CI matrix.
- No built-CLI run in this round: no production, asset, or script file changed since codereview_08's built-CLI reproductions, so they were reused. `qa_02` still owes the full end-to-end matrix.
- The snapshot's next step brief "Watch out" line is stale (it names codereview_06 and qa_01 and says `rounds_without_progress` = 1, while `checkpoint.json` says 0). Hints only; not used as evidence.
- The mutation checks required editing production code, which the delegated-reviewer contract forbids in the worktree. They ran on a copy in this session's scratchpad (`cr09/mut/`), outside the repository.
- What `workflow.md` should record (this delegated reviewer does not edit it): codereview_09 APPROVED WITH RESERVATIONS, no findings; T24 complete (both cases fail under their mutations; no production change); codereview_08's first optional improvement resolved, the second accepted under DEC-HIL-07; no new optional improvement, so every remaining reservation is already decided (DEC-HIL-06, DEC-HIL-07); blocks 0 → 0; NFR-03 measured at 79.1 s; coverage 218 files / 1171 tests, 94.04% lines. Note for qa_02: `cli-scenarios.mjs` expectations still pin the pre-T23 messages.
- Scratch copies and command logs live in this session's scratchpad under `cr09/`. Besides this report, the commands changed only `dist/`, `coverage/`, and temporary directories.

## Conclusion

T24 adds two pruner cases that pin both sides of the condition T22 moved: `remove` reports a ContextBrake directory left non-empty as `skipped`, and `init --no-auto-restart` prunes silently with `success`. Each case fails under its own mutation and only that one, the previously unexercised report branch is now covered, and no production file changed since codereview_08.

Build, lint, typecheck, schemas, dependencies, coverage (1171 tests, 94.04% lines), the budget run (79.1 s), and the quality profile are green, with no real new profile hit. Every obligation is conformant except manual acceptance, which is assigned to HIL 3, and the DEC amendments HIL 3 must acknowledge. The status is APPROVED WITH RESERVATIONS: there are no findings and no new optional improvements, and the remaining reservations were already accepted by DEC-HIL-06 and DEC-HIL-07. Next comes the delegated QA `qa_02`.
