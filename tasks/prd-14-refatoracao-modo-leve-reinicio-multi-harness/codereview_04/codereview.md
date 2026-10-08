# Code review report — prd-14-refatoracao-modo-leve-reinicio-multi-harness

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `a31e183..worktree` (HEAD = `a31e183`; the whole feature is uncommitted: modified tracked files plus untracked files under `src/`, `assets/runtime/`, `tests/`, and the feature folder; 101 TypeScript files in scope)
- Previous review: `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_03/codereview.md` (REJECTED, CR-01..CR-03); corrections T15-T17 in `codereview_03/done/task_15.md` … `task_17.md`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md` | read; sha256 `46d51574…`, matches the approved hash (DEC-HIL-01) |
| TechSpec | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md` | read; sha256 `61eba181…`. Since codereview_03 (`055f9ba0…`) only line 237 was added: the T15 agent amendment to DEC-02. It still differs from the approved `be5a0c65…` (DEC-HIL-04) by the amendments pending HIL 3 (`techspec.md:230-237`) |
| Manifest | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/tasks.md` | read; sha256 `3bd8e790…`, unchanged. T01-T09 `[x]`; every link resolves to `done/task_NN.md`; DAG acyclic |
| Handoffs | `done/task_01.md` … `task_09.md`; `codereview_01/done/task_10.md` … `task_13.md`; `codereview_02/done/task_14.md`; `codereview_03/done/task_15.md` … `task_17.md` | read; every task has a filled Handoff section and all Work items checked. No correction manifest, as in earlier rounds |
| Workflow and checkpoint | `workflow.md`, `checkpoint.json` | read (DEC-HIL-01..04; `correction_round: 3`; `rounds_without_progress: 1`; `active_work` lists this reviewer) |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter: header, next step brief, open threads O-04, O-05, O-07, O-08, `on-run` L-05. The file is under 8 KiB and was read whole in one call; `Decisions` and other `Learnings` were not used as evidence. `git_head` = HEAD (`a31e183`); the worktree matches the header |
| Implementation | `git diff a31e183` plus `git ls-files --others --exclude-standard` | delimited. Files newer than `codereview_03/codereview.md` are exactly the ones the T15, T16, and T17 handoffs list, plus `techspec.md`, `workflow.md`, `checkpoint*.json`, `context-snapshot.md`, and the three handoffs. A sha256 list of all 150 scope files taken before any command matched again after the last command |
| Excluded from scope | `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/` (untracked, predates the slice); `probe/` (throwaway, NFR-03); OpenCode 2.x load failure (DEC-HIL-04) | — |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Handoff action at and above the trigger zone with restart on and no skill; nothing with restart off | `restart-mode.ts`, `zone-guidance.ts`, `brake-engine.ts:50` | `zone-guidance.test.ts`, `restart-mode.test.ts`, `telemetry-block-budget.test.ts` | conformant | Unchanged since codereview_03. Content list dropped for the 60-token budget (DEC-01 amendment, HIL 3) |
| FR-02 | The next session starts with the instruction | `session-reset-handler.ts:30-38`, `runtime-composition.ts:54-55`, Oh-My-Pi `session_switch` mapping | `session-reset-handler.test.ts`, `semi-auto-restart.test.ts`, `omp-session-switch.test.ts` | conformant | Normal path unchanged. On the deadline path the handoff now stays pending for the next start (see FR-03) |
| FR-03 | One delivery; archive keeps the most recent N=10 | `node-handoff-store.ts:29-83`, `handoff-claim-lock.ts` | `node-handoff-store.test.ts`, `node-handoff-store-lock.test.ts`, `node-handoff-store-expiry.test.ts`, `handoff-deadline.test.ts` | non-conformant | One delivery holds, and the deadline no longer loses the pending handoff (codereview_03/CR-01 resolved). A claim skipped because the deadline already answered still prunes the archive first and deletes an archived handoff while nothing is added (CR-01) |
| FR-04 | Handoff gate: fresh handoff required, skip with a reason otherwise | `auto-restart-policy.ts` | `auto-restart-policy.test.ts`, `restart-flow.test.ts`, `claude-mod-handoff.test.ts`, `pi-restart-handoff.test.ts`, `omp-restart-handoff.test.ts` | conformant | Unchanged |
| FR-05 | Neutral restart core; Claude mod behavior unchanged | `core/contracts/{restart-log,restart-host,auto-restart}.ts`, `core/services/{restart-flow,restart-guards,auto-restart-notices}.ts`, `claude-code/mod/restart-host.ts` | `restart-neutrality.test.ts`, `restart-flow.test.ts`, `claude-mod-*.test.ts` | conformant | Unchanged |
| FR-06 | Probe on real installations; research updated | `docs/research/harness-integrations.md`, `probe/captures/`, fixtures | TC-08 (manual + captures) | conformant | Unchanged |
| FR-07 | Automatic restart where (a) and (b) were verified | `pi/planner.ts`, `common/restart-asset-plan.ts`, `pi/restart.ts`, `assets/runtime/pi-restart.ts` | `pi-restart.test.ts`, `pi-restart-handoff.test.ts`, `in-process-restart-plan.test.ts` | conformant | Pi only; Oh-My-Pi needs one Enter (DEC-19); OpenCode out of scope (DEC-HIL-04) |
| FR-08 | Semi-automatic restart elsewhere | capabilities of Codex, Cursor, Copilot, Oh-My-Pi; `reset-notice.ts`; `oh-my-pi/restart.ts` | `semi-auto-restart.test.ts`, `omp-restart.test.ts`, `omp-restart-handoff.test.ts`, `reset-notice.test.ts` | conformant | Unchanged; Antigravity narrowed to "no restart" (DEC-HIL-02) |
| FR-09 | Limit, typed-prompt reset, no-progress, env switch, non-interactive | `common/in-process-restart-state.ts`, `pi/restart.ts`, `oh-my-pi/restart.ts` | `pi-restart.test.ts`, `pi-restart-handoff.test.ts`, `omp-restart-handoff.test.ts`, `omp-restart.test.ts` | conformant | Unchanged |
| FR-10 | `auto_restart` state and impact text per harness | `*/capabilities.ts`, `restart-install-extras.ts:24-29`, `common/restart-diagnostics.ts:10,40`, `pi/adapter.ts:60`, `oh-my-pi/adapter.ts:60` | `harness-adapters.test.ts`, `doctor-remove-restart.test.ts:56` | conformant | `doctor` on Pi now carries "Automatic restart: a valid reset signal opens a new session by itself." on `AUTO_RESTART_READY`, the text `init` shows (codereview_03/CR-03 resolved) |
| FR-11 | Doctor per harness: ready, not loaded or outdated, last skip; codes reused | `common/restart-diagnostics.ts`, `restart-doctor-findings.ts`, `cli/commands/doctor.ts` | `doctor-remove-restart.test.ts`, `auto-restart-doctor.test.ts` | conformant | Only the ready finding's impact changed |
| FR-12 | Consistent marker detection | `reset-notice.ts:endsWithResetSignal` | `reset-notice.test.ts`, TC-07, TC-09 | conformant | Unchanged |
| FR-13 | `remove` and `init --no-auto-restart` remove restart artifacts, keep and name handoffs | `cli/handoff-findings.ts`, `cli/commands/init.ts:44-55`, `remove.ts`, `restart-install-extras.ts:45-53`, `cli/snapshot-helper.ts:collectRestartLogSnapshots` | `init-auto-restart.test.ts:48-67`, `doctor-remove-restart.test.ts` | conformant | `init --no-auto-restart` now plans and applies deletion of `.context-brake/runtime/restart/**`, lists it in the dry run, and leaves other runtime files (codereview_03/CR-02 resolved) |
| NFR-01 | No clear without a passing gate; errors leave the session intact | `restart-flow.ts` | `restart-flow.test.ts` | conformant | Unchanged |
| NFR-02 | Linux, macOS, Windows; no `sh`/`setsid`/server | `node:fs/promises` only, including `copyFile(…, COPYFILE_EXCL)` for the restore | local Windows; CI matrix | conformant (Windows) | Linux and macOS not run here (limitations) |
| NFR-03 | New tests within the 120 s budget; probes outside `npm test` | `probe/` not in the test globs | `npm run test:budget` | conformant | 91.5 s wall, exit 0, at 11% CPU before and 37% after. An earlier run under external load (38% → 80%) took 165.3 s and failed; judged on the idle run per O-08 |
| NFR-04 | Handoffs under `.context-brake/`, untracked | `restart-install-extras.ts:9-10` | `init-auto-restart.test.ts` | conformant | Unchanged |
| NFR-05 | Restart off installs and injects nothing | `restart-asset-plan.ts`, `session-reset-handler.ts:35` | `semi-auto-restart.test.ts`, `in-process-restart-plan.test.ts`, `pi-restart.test.ts` | conformant | Unchanged |
| TC-02 / Errors section | A failed or timed-out session-start claim leaves the handoff pending (`techspec.md:98`) | `hook-deadline.ts:29,48`, `in-process-host.ts:32`, `process-hook-host.ts:84`, `session-reset-handler.ts:30-36`, `node-handoff-store.ts:36-48` | `handoff-deadline.test.ts`, `node-handoff-store-expiry.test.ts`, `session-reset-handler.test.ts:49-53` | conformant | Expired before the move, expired after the move, newer handoff at restore, and prune failure all leave a pending handoff. Host-level scratch proofs under Executed validations |
| TC-03 | `NodeHandoffStore` concurrent claims: exactly one claim wins | `node-handoff-store.ts`, `handoff-claim-lock.ts` | `node-handoff-store.test.ts`, `node-handoff-store-lock.test.ts` | conformant | 10/10 repeated runs; 300/300 scratch pairs |
| TC-09 | Per probe-passed harness: valid signal, limit, typed prompt, env switch, non-interactive | `pi/restart.ts` | `pi-restart.test.ts`, `pi-restart-handoff.test.ts` | conformant | Unchanged |
| TC-12, TC-14 | Doctor and remove suites | — | `doctor-remove-restart.test.ts`, `init-auto-restart.test.ts` | conformant (renamed) | Implemented under file names other than the ones the TechSpec lists |
| Manual acceptance | A real session per probe-passed harness to `RED` with a handoff; Codex `/new` | — | — | not verifiable | The TechSpec assigns it to the person at HIL 3 |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` / `javascript-typescript.md` | OK | `npm run lint`, `npm run typecheck` exit 0; QA-01, QA-02, QA-03, QA-09, QA-10 with no new hit. `node-handoff-store.ts` is 83 lines after the lock helpers moved to `handoff-claim-lock.ts` (31) |
| `node.md` (in-process I/O) | OK | QA-06 clean over the 30 in-process files, including the store, the lock helper, `hook-deadline.ts`, and `in-process-host.ts`; `rg` over `dist/assets/runtime/{pi,omp}-restart.js` finds no sync file or process API |
| `harness-adapters.md` | OK | Adapters changed only to pass `modeText` from their own capability profile (`pi/adapter.ts:60`, `oh-my-pi/adapter.ts:60`) |
| `file-changes.md` | OK | `init --no-auto-restart` deletes only files under `.context-brake/runtime/restart/` (`snapshot-helper.ts:26`), as `runtime_state` changes. The restore uses `COPYFILE_EXCL`, so it never overwrites a newer `handoff.md`. CR-01 concerns the archive ContextBrake owns |
| `cli-output.md` | OK | Only the impact text of the in-process `AUTO_RESTART_READY` changed; `npm run schemas:check` exit 0 |
| `tests.md` (budget, isolation) | OK | Budget 91.5 s on an idle run. New tests use `mkdtemp` and remove their temp dirs with retries |
| Hexagonal layering (`AGENTS.md`) | OK | QA-05 clean. `ExpiryCheck` lives in `core/contracts/hook-phase.ts`; `HookDeadline` stays in `infrastructure/runtime/` |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | TechSpec command over the 101 diff `.ts` files | 0 | OK |
| QA-02 | Suppression comments | blocking | idem | 0 | OK |
| QA-03 | Empty `catch` | blocking | idem | 0 | OK |
| QA-04 | `exec`/`execSync`/`shell: true` | blocking | idem | 0 | OK |
| QA-05 | `core` → `infrastructure`/`cli` | blocking | over the 17 `src/core/**` files in the diff | 0 | OK |
| QA-06 | Sync API in process | blocking | over the 30 Pi, Oh-My-Pi, OpenCode, `common/in-process-*`, `assets/runtime/*-restart.ts`, Claude mod, handoff store, lock helper, deadline, and in-process host files, plus the two built bundles | 0 | OK |
| QA-07 | stdout on hook paths | blocking | over the 54 `src/{core,infrastructure}/**` files in the diff | 0 new of 1 | pre-existing: `process-hook-host.ts:29` is the hook's response writer, identical at `a31e183` (`git show a31e183:…`); the file entered the diff with T15's one-line change at `:84` |
| QA-08 | Clock or randomness in `core` | reservation | over `src/core/**` in the diff | 0 | OK |
| QA-09 | 4+ parameters | reservation | idem (`--pcre2`) | 0 new of 1 | pre-existing (`oh-my-pi/runtime.ts:51`, the baseline's object-type false positive) |
| QA-10 | File above 100 lines | reservation | `rg -c -H '^' … \| awk -F: '$2 > 100'` | 0 | OK (largest: `process-hook-host.ts` 97, `oh-my-pi/restart.ts` 95) |

- Terrain baseline: applied from the TechSpec (`techspec.md:163-201`). `process-hook-host.ts` is not in the baseline table; its QA-07 hit was checked against `a31e183` directly.
- Hits discounted by baseline: 2 (QA-07 at `process-hook-host.ts:29`, QA-09 at `oh-my-pi/runtime.ts:51`)
- Reservations accumulated in the feature: 0
- Suggested escalation: no trigger fired (0 reservations; no touched file above 200 lines; no block duplicated in 3+ places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 | PARTIAL | Shortened text and positional `mode` parameter (amendment pending HIL 3, `techspec.md:231`) |
| DEC-02 | PARTIAL | One claimer wins; claim takes no date, serializes with a lock (T14), and takes the deadline's expiry check (T15). All three are agent amendments pending HIL 3 (`techspec.md:232,236,237`). The amendment says the store "prunes the archive before the move"; it does not cover pruning when the move is then skipped (CR-01) |
| DEC-03, DEC-04 | YES | Unchanged |
| DEC-05, DEC-06 | PARTIAL | `MOD_VERSION` not bumped; `RestartHost` shape differs (amendments pending HIL 3) |
| DEC-07, DEC-08, DEC-09, DEC-11, DEC-12, DEC-13 | YES | Unchanged |
| DEC-10 | YES | Pi's "Automatic restart: …" text now reaches doctor through `harnessRestartMode(…).reason` on the in-process ready finding (`restart-diagnostics.ts:40`) |
| DEC-14 | YES | `remove` and `init --no-auto-restart` both delete the restart logs under `runtime/restart/` and keep the handoffs |
| DEC-15 … DEC-21 | YES | Unchanged |
| Errors, security, and recovery (`techspec.md:98`) | YES | "the handoff stays pending for the next start" now holds for a deadline before or after the move and for a prune failure |
| Contracts and data, handoff files (`techspec.md:82`): "at most 10 files, oldest deleted by name order" | PARTIAL | The limit holds. Deletion also happens on a claim that adds nothing (CR-01) |
| Contracts and data (log v2, reason codes, finding codes) | YES | `schemas:check` exit 0 |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01, T02 | `done/task_01.md`, `done/task_02.md` | COMPLETE | Unchanged |
| T03 | `done/task_03.md` | COMPLETE | The outcome "the session-start path injects the archived path once" now holds, and a timed-out start leaves the handoff pending (T14, T15). CR-01 is a separate archive gap in the same store |
| T04 … T09 | `done/task_04.md` … `task_09.md` | COMPLETE | Unchanged since codereview_03 except as corrected by T16 (T09) and T17 (T08) |
| T10 … T13 | `codereview_01/done/task_10.md` … `task_13.md` | COMPLETE | Unchanged |
| T14 | `codereview_02/done/task_14.md` | COMPLETE | Lock moved to `handoff-claim-lock.ts` by T15 with the same behavior; lock suite green |
| T15 | `codereview_03/done/task_15.md` | COMPLETE | `HookDeadline.isExpired` (`hook-deadline.ts:29,48`) passes through `RuntimeInput` from both hosts to `HandoffStore.claim(isExpired?)`. The store prunes before reserving (`node-handoff-store.ts:43`), skips the move when expired (`:44`), and restores with `COPYFILE_EXCL` then delete when expiry is seen after the move (`:36-37,69-77`). All three acceptance cases are tested. The disclosed residual window holds only in-memory continuations: no I/O runs between the last check and the host's race (`brake-engine.ts:24-30`, `session-reset-handler.ts:30-31`). Its prune-before-check order produces CR-01 |
| T16 | `codereview_03/done/task_16.md` | COMPLETE | `init.ts:44` snapshots restart logs under `--no-auto-restart`; `restart-install-extras.ts:49` plans their deletion through `planRuntimeStateDeletions`. `init-auto-restart.test.ts:48-67` asserts the dry-run delete of `runtime/restart/pi/s1.json`, its removal, and `runtime/keep.json` intact |
| T17 | `codereview_03/done/task_17.md` | COMPLETE | `InProcessRestartSpec.modeText` (`restart-diagnostics.ts:10`) fills the ready finding's impact (`:40`) from both adapters. `doctor-remove-restart.test.ts:56` asserts the exact Pi text |

## Executed validations

- Profile and scope: CLI commands, process hooks, the Claude mod, and the Pi and Oh-My-Pi in-process files. The e2e smoke set runs inside `npm run coverage` and `npm run test:budget`.
- Validated state: worktree at `a31e183` plus the uncommitted feature diff and T10-T17; Windows 11, Node 24. Commands ran serially in this session. CPU load was 77% before the build, 31% before and 71% after coverage, 38% before and 80% after the first budget run, and 11% before and 37% after the second. The top CPU consumers were external (`TokenHound.App`, `herdr`).
- Reused evidence: none. Code changed after codereview_03 (T15-T17), so every command was re-run.
- Manual acceptance: open item for HIL 3; `not verifiable` here.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed (exit 0, 13.6 s) | bundles `pi-restart.js` (732,548 bytes) and `omp-restart.js` (732,828 bytes) |
| `npm run lint` | passed (exit 0) | code standards |
| `npm run typecheck` | passed (exit 0) | all |
| `npm run schemas:check` | passed (exit 0) | Contracts and data |
| `npm run dependencies:check` | passed (exit 0) | — |
| `npm run coverage` | passed: 217 files, 1159 tests; statements 94.03%, branches 90.07%, functions 94.71%, lines 94.03%; Vitest 186.6 s, command 193 s under external load | FR-01..FR-13, TC-01..TC-14 |
| `npm run test:budget` (first, standalone) | failed: "Test run: 165.3s wall (budget 120s)", CPU 38% → 80% | NFR-03 (load-bound run, not used for the verdict) |
| `npm run test:budget` (second, standalone) | passed: "Test run: 91.5s wall (budget 120s)", exit 0, CPU 11% → 37% | NFR-03, TC-15 |
| `npx vitest run` over `node-handoff-store`, `node-handoff-store-lock`, `node-handoff-store-expiry`, `handoff-deadline`, `session-reset-handler`, `hook-deadline` × 10 | 10 passed, 0 failed (6 files, 27 tests each) | FR-03, TC-02, TC-03 |
| Scratch proof (scratchpad `cr04/proof.mts` (a)): `createInProcessRuntime` with a 1 ms session-start deadline, real ledger and `NodeHandoffStore`, handoff mode, 30 runs | 30/30 neutral decisions; 30/30 left `handoff.md` pending; no run left an archived file | FR-03, `techspec.md:98`, host wiring of `isExpired` (codereview_03/CR-01) |
| Scratch sweep (`cr04/sweep.mts`): same host with session-start deadlines 1-40 ms, 8 runs each (320) | 256 delivered (context decision, archive holds 1, nothing pending); 64 neutral with the handoff pending; 0 lost; 0 inconsistent | FR-03, restore path, residual window |
| Scratch proof (`cr04/proof.mts` (b)): archive holding 10 handoffs, `claim(() => true)` | returns `null`; `handoff.md` pending; archive drops from 10 to 9 (`20260900T000000.000Z.md` deleted) | FR-03 (CR-01) |
| Scratch stress (`cr04/proof.mts` (c)): 300 iterations of 2 concurrent `claim()` calls | 300/300 delivered exactly once to an existing file | TC-03 regression after the T15 refactor |
| QA-01..QA-10 (`rg` per the TechSpec) | 0 new hits (2 pre-existing) | Quality profile |
| `rg` sync APIs over `dist/assets/runtime/{pi,omp}-restart.js` | 0 hits | QA-06 on the shipped bundles |
| `sha256sum -c` of the 150 scope files after all commands | all unchanged | review integrity |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Low | FR-03 ("the most recent N archived handoffs are kept"), TechSpec Contracts and data (`techspec.md:82`), T15 | `src/infrastructure/storage/node-handoff-store.ts:43` (`NodeHandoffStore.claimLocked`) prunes the archive to `HANDOFF_ARCHIVE_LIMIT - 1` before the expiry check at `:44`. When the session-start deadline has already answered, the claim returns `null` and keeps the handoff pending, but the oldest archived handoff has already been deleted. The scratch proof reproduces it: an archive of 10, `claim(() => true)` returns `null`, and the archive holds 9. The same happens when expiry is seen after the move: the restore at `:36-37` removes the new archive entry, so the archive again ends at 9. `node-handoff-store-expiry.test.ts` runs its expiry cases on an empty archive, so no test sees the deletion | A delivered handoff in the archive is lost while nothing new is archived. The trigger is a full archive plus a session start that exceeds its deadline (default 5,000 ms). The loss is at most one file per full-archive cycle, because the next skipped claim finds 9 and prunes nothing. No undelivered work is lost | Cause proven: the prune runs inside work the deadline may abandon, before the check that would skip the claim. Check `isExpired()` before `pruneArchive` as well; the remaining check-to-prune gap is in-memory only, like the window T15 already discloses. Add an expiry case with a full archive to `node-handoff-store-expiry.test.ts` asserting the archive still holds 10 files. Alternatively, amend FR-03/DEC-02 at HIL 3 to accept the early prune |

Optional improvements (not findings):

- No test pins the hosts' pass-through of `isExpired`: `handoff-deadline.test.ts` drives `handleSessionReset` with a raw `HookDeadline`. This review's scratch proof covered `in-process-host.ts:32`; `process-hook-host.ts:84` was verified by reading only. A case through `runProcessHook` with a short `sessionStartDeadlineMilliseconds`, the shape codereview_03 suggested, would catch a dropped pass-through.
- `restoreHandoff` (`node-handoff-store.ts:69-77`) copies and then deletes. A crash between the two leaves the handoff both pending and archived (the pending copy is delivered next; the archive keeps a duplicate). A non-`EEXIST` copy error rejects after the move and leaves the handoff only in the archive.
- T16: empty `runtime/restart/<harness>/` folders can remain after `init --no-auto-restart`, because `init` applies without `pruneRuntime` (disclosed in the T16 handoff).
- T17: only the Pi ready impact is asserted; the Oh-My-Pi ready impact is not.
- `tests/integration/node-handoff-store-expiry.test.ts:2,44` uses `writeFileSync` inside the expiry callback to simulate a concurrent writer. It is test code, outside QA-06's scope.
- Carried from codereview_03 and still untouched: the stale-lock double takeover in `acquireClaimLock` (`handoff-claim-lock.ts:17-22`); `AUTO_RESTART_HANDOFF_KEPT` reported for a `handoffs/` folder holding only a leftover `.claim.lock`; Oh-My-Pi has no typed-prompt, no-progress, or non-TUI stand-down case; `pi/restart.ts:44` synchronous throw skips the guard rollback; the semi-automatic classification matches the impact prefix (`restart-install-extras.ts:11,28`); each restart bundle is about 732 KB; Pi shows the `/new` reset notice and also restarts automatically (UX for HIL 3); `common/restart-diagnostics.ts:25-26` swallows `readdir` and `stat` errors; `doctor-remove-restart.test.ts` is among the slowest files (18.5 s in the loaded run); `tests/helpers/handoff-file.ts` sets a future mtime; `omp-restart-handoff.test.ts:16` labels the env-switch case TC-10.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_03/CR-01 | resolved | `hook-deadline.ts:29,48` exposes the expiry; `in-process-host.ts:32` and `process-hook-host.ts:84` pass it; `session-reset-handler.ts:30-36` hands it to `claim`; `node-handoff-store.ts:36-48` skips or undoes the move, and a prune failure rejects before the move. Tests: `handoff-deadline.test.ts` (40 ms deadline, 150 ms ledger), `node-handoff-store-expiry.test.ts` (four cases), `session-reset-handler.test.ts:49-53`. Scratch: 30/30 host runs with a 1 ms deadline left the handoff pending; the 1-40 ms sweep gave 256 delivered, 64 pending, 0 lost |
| codereview_03/CR-02 | resolved | `init.ts:44`, `snapshot-helper.ts:25-28`, `restart-install-extras.ts:49`; `init-auto-restart.test.ts:48-67` green |
| codereview_03/CR-03 | resolved | `restart-diagnostics.ts:10,40`, `pi/adapter.ts:60`, `oh-my-pi/adapter.ts:60`; `doctor-remove-restart.test.ts:56` asserts the Pi text |
| codereview_02/CR-01 | resolved (unchanged) | Lock behavior unchanged after the move to `handoff-claim-lock.ts`; 300/300 scratch pairs; lock suite 10/10 |
| codereview_01/CR-01 … CR-05 | resolved (unchanged) | Code and tests unchanged; the suites passed again in this review's coverage run |

## Limitations and open items

- Blocks went from 3 (codereview_03) to 1 (CR-01, Low), so this round made progress.
- The TechSpec and manifest hashes differ from the approved ones, as in the earlier reviews. The agent amendments (DEC-01, DEC-02 with the T14 lock and the T15 expiry check, DEC-05 `MOD_VERSION`, DEC-06 host shape, `SKIP_DISABLED_ENV` wording) are pending HIL 3; this review judged against the current text.
- Manual acceptance (real Pi and Oh-My-Pi sessions to `RED` with a handoff; Codex `/new`) is `not verifiable` here; the TechSpec assigns it to HIL 3.
- NFR-02: validated on Windows only. Linux and macOS depend on the CI matrix; `copyFile` with `COPYFILE_EXCL` and `open(…, 'wx')` are portable, but were not run there.
- NFR-03 depends on machine load: 165.3 s (failed) at 38-80% CPU and 91.5 s (passed) at 11-37% CPU in this review; coverage took 186.6 s under load. The verdict uses the idle run (O-08).
- What `workflow.md` should record (this delegated reviewer does not edit it): codereview_04 REJECTED; codereview_03/CR-01..CR-03 resolved; new CR-01 (Low: a claim skipped or undone by the session-start deadline prunes the archive first and deletes the oldest archived handoff; FR-03, `techspec.md:82`; T15); blocks 3 → 1, so the round made progress; the T15 expiry check joins the DEC-02 amendments for HIL 3; NFR-03 measured at 91.5 s idle and 165.3 s under load.
- The scratch scripts (`proof.mts`, `sweep.mts`), the hash list, and the command logs live in this session's scratchpad under `cr04/`, outside the repository. Besides this report, the commands changed only `dist/`, `coverage/`, and temporary directories.
- Pre-existing, not counted as findings: OpenCode 2.x does not load the v1 plugin (DEC-HIL-04, follow-up PRD); Codex `"hooks": {}` reformatting after remove; the untracked `tasks/prd-11-…/rtk/`; `probe/` is throwaway.

## Conclusion

Correction round 3 closed all three codereview_03 findings. The session-start deadline no longer loses the handoff: the claim reads the deadline's expiry, skips or undoes the move, and prunes before moving, so a prune failure also leaves the handoff pending. Host-level runs with deadlines from 1 to 40 ms delivered or kept every handoff, and none was lost. `init --no-auto-restart` now deletes the restart logs (DEC-14), and doctor shows Pi's automatic-restart text (DEC-10). Build, lint, typecheck, schemas, dependencies, the quality profile (0 new hits), coverage (1159 tests, 94.03% lines), and the idle budget run (91.5 s) are green.

The status is REJECTED for one Low finding introduced by T15. The claim prunes the archive before checking the deadline, so a claim skipped or undone because the deadline already answered still deletes the oldest archived handoff, against FR-03's "the most recent N archived handoffs are kept" (CR-01). The fix is one reordered check plus a full-archive test case; HIL 3 could instead accept it as an amendment. Route CR-01 through `sdd-plan-corrections`. The HIL 3 amendment list and the manual acceptance remain open.
