# Code review report — prd-14-refatoracao-modo-leve-reinicio-multi-harness

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `a31e183..worktree` (HEAD = `a31e183`; the whole feature is uncommitted: modified tracked files plus untracked files under `src/`, `assets/runtime/`, `tests/`, and the feature folder; 156 scope files, 101 of them TypeScript)
- Previous review: `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_05/codereview.md` (REJECTED, CR-01, CR-02); corrections T19 and T20 in `codereview_05/done/`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md` | read; sha256 `46d51574…`, matches the approved hash (DEC-HIL-01) |
| TechSpec | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md` | read in full; sha256 `b1a8fdf2…` (codereview_05: `5d17fe2a…`). The file is untracked, so no diff across reviews is possible; the new content is the two deviation lines at `techspec.md:239-240` (T19), as the T19 handoff states. It still differs from the approved `be5a0c65…` (DEC-HIL-04) by the agent amendments pending HIL 3 (`techspec.md:230-240`) |
| Manifest | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/tasks.md` | read; sha256 `3bd8e790…`, unchanged since codereview_05. T01-T09 `[x]`; every link resolves to `done/task_NN.md`; DAG acyclic |
| Handoffs | `done/task_01.md` … `task_09.md`; `codereview_01/done/task_10.md` … `task_13.md`; `codereview_02/done/task_14.md`; `codereview_03/done/task_15.md` … `task_17.md`; `codereview_04/done/task_18.md`; `codereview_05/done/task_19.md`, `task_20.md` | T19 and T20 read in full; earlier ones unchanged since codereview_05, which verified them. Both have a filled Handoff and all Work items checked. No correction manifest, as in earlier rounds |
| Workflow and checkpoint | `workflow.md`, `checkpoint.json` | read (DEC-HIL-01..05; `correction_round: 5`; `rounds_without_progress: 1`; `active_work` lists this reviewer for `codereview_06`) |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter: header, next step brief, open threads O-04, O-05, O-07, O-08, O-09, and `on-run` L-05. The file is under 8 KiB and was read whole in one call; `Decisions` and the `on-edit` learning were not used as evidence. `git_head` = HEAD (`a31e183`); `covers_through` T20 matches `codereview_05/done/`; worktree matches the header |
| Implementation | `git diff a31e183` plus `git ls-files --others --exclude-standard` | delimited. Files newer than `codereview_05/codereview.md` under `src/`, `assets/`, `tests/`, `scripts/`, `docs/`, and the feature folder are exactly the files T19 and T20 list (`hook-phase.ts`, `handoff.ts`, `brake-engine.ts`, `session-reset-handler.ts`, `hook-deadline.ts`, `in-process-host.ts`, `process-hook-host.ts`, `node-handoff-store.ts`, and the five test files) plus `techspec.md`, `workflow.md`, `checkpoint*.json`, `context-snapshot.md`, `task_19.md`, `task_20.md`. `schemas/*.json` have a newer mtime but no Git change. A sha256 list of all 156 scope files taken before any command matched again after the last command |
| Excluded from scope | `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/` (untracked, predates the slice); `probe/` (throwaway, NFR-03); OpenCode 2.x load failure (DEC-HIL-04); Codex `"hooks": {}` reformatting after remove (pre-existing) | — |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Handoff action at and above the trigger zone with restart on and no skill; nothing with restart off | `restart-mode.ts`, `zone-guidance.ts`, `brake-engine.ts:50` | `zone-guidance.test.ts`, `restart-mode.test.ts`, `telemetry-block-budget.test.ts` | conformant | Unchanged logic; suites green in coverage. Content list dropped for the 60-token budget (DEC-01 amendment, HIL 3) |
| FR-02 | The next session starts with the instruction and the handoff path | `session-reset-handler.ts:30-37`, `in-process-host.ts:32`, `process-hook-host.ts:84`, `node-handoff-store.ts:36-48` | `session-reset-handler.test.ts`, `semi-auto-restart.test.ts`, `omp-session-switch.test.ts`, `handoff-deadline.test.ts` | conformant | Behavior holds on both hosts: scratch sweep of 1,280 host runs (1-40 ms deadlines × 8, full and empty archive, in-process and process-hook) gave 1,073 delivered to an existing archived file and 207 neutral with the handoff pending and the archive unchanged; 0 lost, 0 inconsistent. The in-process host's pass-through has no suite guard (CR-01) |
| FR-03 | One delivery; the archive keeps the most recent N = 10 | `node-handoff-store.ts:42-47`, `:88-92`, `handoff-claim-lock.ts` | `node-handoff-store.test.ts:43-68`, `node-handoff-store-lock.test.ts`, `node-handoff-store-expiry.test.ts` | conformant | Deliveries keep 10 files including the new one, also with the clock behind a full archive (`node-handoff-store.test.ts:56-67`; scratch proof: path exists, content intact, 10 names). Skipped or undone claims leave a full archive unchanged (`node-handoff-store-expiry.test.ts:66-80`). The 11-file case after a restore that meets a newer handoff remains (optional improvement) |
| FR-04 | Handoff gate: fresh handoff required, skip with a reason otherwise | `auto-restart-policy.ts` | `auto-restart-policy.test.ts`, `restart-flow.test.ts`, `claude-mod-handoff.test.ts`, `pi-restart-handoff.test.ts`, `omp-restart-handoff.test.ts` | conformant | Unchanged |
| FR-05 | Neutral restart core; Claude mod behavior unchanged | `core/contracts/{restart-log,restart-host,auto-restart}.ts`, `core/services/{restart-flow,restart-guards,auto-restart-notices}.ts`, `claude-code/mod/restart-host.ts` | `restart-neutrality.test.ts`, `restart-flow.test.ts`, `claude-mod-*.test.ts` | conformant | Unchanged; `ClaimDeadline` added to `core/contracts/hook-phase.ts` has no harness name |
| FR-06 | Probe on real installations; research updated | `docs/research/harness-integrations.md`, `probe/captures/`, fixtures | TC-08 (manual + captures) | conformant | Unchanged |
| FR-07 | Automatic restart where (a) and (b) were verified | `pi/planner.ts`, `common/restart-asset-plan.ts`, `pi/restart.ts`, `assets/runtime/pi-restart.ts` | `pi-restart.test.ts`, `pi-restart-handoff.test.ts`, `in-process-restart-plan.test.ts` | conformant | Pi only; Oh-My-Pi needs one Enter (DEC-19); OpenCode out of scope (DEC-HIL-04) |
| FR-08 | Semi-automatic restart elsewhere | capabilities of Codex, Cursor, Copilot, Oh-My-Pi; `reset-notice.ts`; `oh-my-pi/restart.ts` | `semi-auto-restart.test.ts`, `omp-restart*.test.ts`, `reset-notice.test.ts` | conformant | Unchanged; Antigravity narrowed to "no restart" (DEC-HIL-02) |
| FR-09 | Limit, typed-prompt reset, no-progress, env switch, non-interactive | `common/in-process-restart-state.ts`, `pi/restart.ts`, `oh-my-pi/restart.ts` | `pi-restart*.test.ts`, `omp-restart*.test.ts` | conformant | Unchanged |
| FR-10 | `auto_restart` state and impact text per harness | `*/capabilities.ts`, `restart-install-extras.ts`, `common/restart-diagnostics.ts` | `harness-adapters.test.ts`, `doctor-remove-restart.test.ts` | conformant | Unchanged |
| FR-11 | Doctor per harness; codes reused | `common/restart-diagnostics.ts`, `restart-doctor-findings.ts`, `cli/commands/doctor.ts` | `doctor-remove-restart.test.ts`, `auto-restart-doctor.test.ts` | conformant | Unchanged |
| FR-12 | Consistent marker detection | `reset-notice.ts:endsWithResetSignal` | `reset-notice.test.ts`, TC-07, TC-09 | conformant | Unchanged |
| FR-13 | `remove` and `init --no-auto-restart` remove restart artifacts, keep and name handoffs | `cli/handoff-findings.ts`, `cli/commands/init.ts`, `remove.ts`, `restart-install-extras.ts`, `cli/snapshot-helper.ts` | `init-auto-restart.test.ts`, `doctor-remove-restart.test.ts` | conformant | Unchanged |
| NFR-01 | No clear without a passing gate; errors leave the session intact | `restart-flow.ts` | `restart-flow.test.ts` | conformant | Unchanged |
| NFR-02 | Linux, macOS, Windows; no `sh`/`setsid`/server | `node:fs/promises` only in the store | local Windows; CI matrix | conformant (Windows) | Linux and macOS not run here (limitations) |
| NFR-03 | New tests within the 120 s budget; probes outside `npm test` | `probe/` not in the test globs | `npm run test:budget` | conformant | 72.5 s wall, exit 0, CPU 10% before and 20% after (idle run, closes O-08) |
| NFR-04 | Handoffs under `.context-brake/`, untracked | `restart-install-extras.ts` | `init-auto-restart.test.ts` | conformant | Unchanged |
| NFR-05 | Restart off installs and injects nothing | `restart-asset-plan.ts`, `session-reset-handler.ts:35` | `semi-auto-restart.test.ts`, `in-process-restart-plan.test.ts`, `pi-restart.test.ts` | conformant | Unchanged |
| TC-02 / Errors section | A failed or timed-out session-start claim leaves the handoff pending (`techspec.md:98`) | `hook-deadline.ts:29-36`, `node-handoff-store.ts:37`, `:42-45` | `handoff-deadline.test.ts`, `node-handoff-store-expiry.test.ts`, `hook-deadline.test.ts:48-61` | conformant | `commit()` is synchronous: it fails once the timer has fired, otherwise clears the timer, so `run`'s race resolves with the work. Only the prune, the lock release, and the return follow the commit (`node-handoff-store.ts:33`, `:46-47`; `session-reset-handler.ts:30-31`), which matches the amendment at `techspec.md:240`. Sweep: 0 lost on both hosts |
| TC-03 | Concurrent claims: exactly one wins | `node-handoff-store.ts`, `handoff-claim-lock.ts` | `node-handoff-store.test.ts:70-80`, `node-handoff-store-lock.test.ts` | conformant | 10/10 repeated runs of the claim suites |
| TC-09 | Per probe-passed harness: valid signal, limit, typed prompt, env switch, non-interactive | `pi/restart.ts` | `pi-restart.test.ts`, `pi-restart-handoff.test.ts` | conformant | Unchanged |
| TC-12, TC-14 | Doctor and remove suites | — | `doctor-remove-restart.test.ts`, `init-auto-restart.test.ts` | conformant (renamed) | Implemented under file names other than the ones the TechSpec lists |
| T19.4 (correction obligation) | Host-level tests, in-process host and `runProcessHook`, whose deadline fires during the prune or the lock release | — | `handoff-deadline.test.ts:77-95` | non-conformant | No in-process host case; the process-hook case fires before the claim; the commit case drives `handleSessionReset` without a host (CR-01) |
| Manual acceptance | A real session per probe-passed harness to `RED` with a handoff; Codex `/new` | — | — | not verifiable | The TechSpec assigns it to the person at HIL 3 |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` / `javascript-typescript.md` | OK | `npm run lint`, `npm run typecheck` exit 0; QA-01..QA-03, QA-09, QA-10 with no new hit. `node-handoff-store.ts` 92 lines, `hook-deadline.ts` 64 |
| `node.md` (in-process I/O) | OK | QA-06 clean over the 30 in-process files and `dist/assets/runtime/{pi,omp}-restart.js`. The test's `writeFileSync` (`node-handoff-store-expiry.test.ts:2,57`) is test code, outside QA-06's scope |
| `harness-adapters.md` | OK | No adapter changed since codereview_05 |
| `file-changes.md` | OK | The prune no longer deletes the handoff the claim just archived (`node-handoff-store.ts:89`) |
| `cli-output.md` | OK | No output change; `npm run schemas:check` exit 0 |
| `tests.md` (budget, isolation) | OK | Budget 72.5 s idle. New cases use `mkdtemp` and remove their temp dirs with retries; fake timers are restored in `afterEach` (`handoff-deadline.test.ts:64`) |
| Hexagonal layering (`AGENTS.md`) | OK | QA-05 clean; `ClaimDeadline` lives in `core/contracts`, `HookDeadline` in `infrastructure/runtime` |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | TechSpec command over the 101 scope `.ts` files | 0 | OK |
| QA-02 | Suppression comments | blocking | idem | 0 | OK |
| QA-03 | Empty `catch` | blocking | idem | 0 | OK |
| QA-04 | `exec`/`execSync`/`shell: true` | blocking | idem | 0 | OK |
| QA-05 | `core` → `infrastructure`/`cli` | blocking | over the 17 `src/core/**` scope files | 0 | OK |
| QA-06 | Sync API in process | blocking | over the 30 in-process files (Pi, Oh-My-Pi, OpenCode, Claude mod, `common/in-process-*`, `assets/runtime/*-restart.ts`, handoff store, lock helper, deadline, in-process host), plus the two built restart bundles | 0 | OK |
| QA-07 | stdout on hook paths | blocking | over the 54 `src/{core,infrastructure}/**` scope files | 0 new of 1 | pre-existing: `process-hook-host.ts:29` is the hook's response writer; `git show a31e183:src/infrastructure/runtime/process-hook-host.ts` has the same line 29 |
| QA-08 | Clock or randomness in `core` | reservation | over `src/core/**` scope files | 0 | OK |
| QA-09 | 4+ parameters | reservation | idem (`--pcre2`), source files | 0 new of 1 | pre-existing (`oh-my-pi/runtime.ts:51`, the baseline's object-type false positive) |
| QA-10 | File above 100 lines | reservation | `rg -c -H '^' … \| awk -F: '$2 > 100'` | 0 | OK |

- Terrain baseline: applied from the TechSpec (`techspec.md:163-201`). `process-hook-host.ts` is not in the baseline table; its QA-07 hit was checked against `a31e183` in this review.
- Hits discounted by baseline: 2 (QA-07 at `process-hook-host.ts:29`, QA-09 at `oh-my-pi/runtime.ts:51`)
- Reservations accumulated in the feature: 0
- Suggested escalation: no trigger fired (0 reservations; no touched file above 200 lines; no block duplicated in 3+ places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 | PARTIAL | Shortened text and positional `mode` parameter (amendment pending HIL 3, `techspec.md:231`) |
| DEC-02 | PARTIAL | Matches the T19 amendment (`techspec.md:239`): `claim(deadline?: ClaimDeadline)` (`handoff.ts:12`), peek before the move (`node-handoff-store.ts:37`), `commit()` after it with restore on failure (`:42-45`), then the prune that excludes the archived name (`:46`, `:88-92`). All DEC-02 amendments (T03, T14, T15, T18, T19) are pending HIL 3 |
| prd-10 FR-10 / DEC-11 amendment (`techspec.md:240`, DEC-HIL-05) | YES | After a committed claim only the prune and the lock release run past the deadline. Its rationale "harness session-start timeouts are 30 s or more" is not fully backed by the research: Cursor's default is undocumented (`harness-integrations.md:102`) and Oh-My-Pi documents none (`:178`) (limitations) |
| DEC-03, DEC-04 | YES | Unchanged |
| DEC-05, DEC-06 | PARTIAL | `MOD_VERSION` not bumped; `RestartHost` shape differs (amendments pending HIL 3) |
| DEC-07 … DEC-21 | YES | Unchanged since codereview_05 |
| Errors, security, and recovery (`techspec.md:98`): "the handoff stays pending for the next start" | YES | Sweep: every neutral answer left the handoff pending with the archive unchanged |
| Contracts and data, handoff files (`techspec.md:82`): "at most 10 files, oldest deleted by name order" | PARTIAL | Oldest by name among the other names; the delivered one is always kept. The 11-file case after a restore that meets a newer handoff persists (optional improvement) |
| Contracts and data (log v2, reason codes, finding codes) | YES | `schemas:check` exit 0 |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01, T02 | `done/task_01.md`, `done/task_02.md` | COMPLETE | Unchanged |
| T03 | `done/task_03.md` | COMPLETE | The paths of codereview_05/CR-01 and CR-02 no longer occur: 0 lost in 1,280 host runs; the clock-behind claim keeps its file |
| T04 … T09 | `done/task_04.md` … `task_09.md` | COMPLETE | Unchanged |
| T10 … T14, T16, T17 | `codereview_01/done/…`, `codereview_02/done/task_14.md`, `codereview_03/done/task_16.md`, `task_17.md` | COMPLETE | Unchanged |
| T15, T18 | `codereview_03/done/task_15.md`, `codereview_04/done/task_18.md` | COMPLETE | Their residual window is closed by T19 |
| T19 | `codereview_05/done/task_19.md` | INCOMPLETE | T19.1, T19.2, T19.3, T19.5 done and every acceptance criterion holds (commit cases `hook-deadline.test.ts:48-61`; host sweep 0 lost; existing suites green). T19.4 is checked but not delivered as written (CR-01); its handoff discloses the in-process gap and claims typecheck coverage, which does not hold |
| T20 | `codereview_05/done/task_20.md` | COMPLETE | `pruneArchive(archive, delivered)` excludes the archived name and keeps 9 others (`node-handoff-store.ts:88-92`); new case `node-handoff-store.test.ts:56-67`; scratch proof agrees |

## Executed validations

- Profile and scope: CLI commands, process hooks, the Claude mod, and the Pi and Oh-My-Pi in-process files. The e2e smoke set runs inside `npm run coverage` and `npm run test:budget`.
- Validated state: worktree at `a31e183` plus the uncommitted feature diff and T10-T20; Windows 11 Pro 10.0.26200, Node 24.19.0. Commands ran serially in this session; CPU load 27% before coverage, 10% before and 20% after the budget run.
- Reused evidence: none for commands; code changed after codereview_05 (T19, T20), so every command was re-run. codereview_05's evidence for unchanged areas (T10-T18 verifications) is reused because those files did not change.
- Manual acceptance: open item for HIL 3; `not verifiable` here.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed (exit 0, 20.5 s) | bundles for the in-process files; L-05 prerequisite |
| `npm run lint` | passed (exit 0) | code standards |
| `npm run typecheck` | passed (exit 0) | all |
| `npm run schemas:check` | passed (exit 0) | Contracts and data |
| `npm run dependencies:check` | passed (exit 0) | — |
| `npm run coverage` | passed: 217 files, 1166 tests; statements 94.04%, branches 90.13%, functions 94.73%, lines 94.04%; Vitest 94.7 s, command 97 s | FR-01..FR-13, TC-01..TC-14 |
| `npm run test:budget` (standalone) | passed: "Test run: 72.5s wall (budget 120s)", exit 0 | NFR-03, TC-15 |
| `npx vitest run` over `handoff-deadline`, `node-handoff-store`, `node-handoff-store-expiry`, `node-handoff-store-lock`, `session-reset-handler`, `hook-deadline`, `in-process-host-deadline`, `process-hook-host-deadline` × 10 | 10 passed, 0 failed (8 files, 41 tests each) | FR-02, FR-03, TC-02, TC-03, T19, T20 |
| Scratch sweep (`cr06/sweep.mts`): `createInProcessRuntime` with the Pi descriptor and `runProcessHook` with a stub adapter, handoff mode, real `NodeHandoffStore`, session-start deadlines 1-40 ms × 8, full and empty archive, state read 400 ms after the answer | in-process full: 274 delivered, 46 pending; in-process empty: 270 / 50; process-hook full: 265 / 55; process-hook empty: 264 / 56. 0 lost, 0 inconsistent; every delivered path exists and the archive stays ≤ 10 | codereview_05/CR-01 resolved, codereview_03/CR-01 resolved, TC-02 |
| Scratch proof (`cr06/sweep.mts`, last block): 10 archived names `202712…`, clock `2026-10-07T12:00:00.000Z`, `claim()` | returns `.context-brake/handoffs/20261007T120000.000Z.md`; file holds the handoff; 10 names including it | codereview_05/CR-02 resolved |
| QA-01..QA-10 (`rg` per the TechSpec) | 0 new hits (2 pre-existing) | Quality profile |
| `sha256sum -c` of the 156 scope files after all commands | all unchanged | review integrity |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Low | T19.4 and T19 Verification ("the new host cases fail against the T18 code"); codereview_05/CR-01 recommendation (host-level test) | T19.4 asks for tests through the in-process host and `runProcessHook` whose deadline fires during the prune or the lock release. Delivered: `handoff-deadline.test.ts:88-95` drives `handleSessionReset` and `HookDeadline` directly, without a host; `handoff-deadline.test.ts:77-84` uses `runProcessHook`, but its deadline fires during the 150 ms `mapInput`, before the claim. No test drives `createInProcessRuntime` with a handoff and a short deadline: the only in-process deadline suite (`tests/unit/in-process-host-deadline.test.ts:24`) uses `DEFAULT_CONFIG` (restart off, no claim), and the handoff-mode in-process suites run with the 5,000 ms default. The handoff's claim that the pass-through is "covered by the typecheck" does not hold: `RuntimeInput.deadline` (`brake-engine.ts:19`) and `ResetHooks.deadline` (`session-reset-handler.ts:17`) are optional, so dropping `deadline` from `in-process-host.ts:32` compiles and the store falls back to `OPEN_DEADLINE` (`node-handoff-store.ts:13`) | The fix is correct today (scratch sweep, 0 lost), but the wiring codereview_05/CR-01 failed on, used by Pi and Oh-My-Pi, has no regression guard in `npm test`: removing it passes typecheck and every suite, and the handoff would again be archived without an instruction. The process-hook committed-overrun path (deadline during the prune or lock release) is likewise only covered by the scratch sweep | Cause proven: T19.4 checked without the in-process host case and with the process-hook case on the pre-claim path. Add an in-process host test (`createInProcessRuntime` with a handoff-mode config and a short `deadlines.sessionStart`) whose deadline fires after the commit and asserts resume text naming an existing archived file, plus one whose deadline fires before the claim and asserts the handoff pending; and a `runProcessHook` case whose deadline elapses during the prune or the lock release. Each must fail with the host's `deadline` pass-through removed |

Optional improvements (not findings):

- Newer handoff at restore on a full archive (`node-handoff-store.ts:42-45`, `:78-86`): when the commit fails and a newer `handoff.md` already exists, the archived file is kept and nothing prunes, so the archive holds 11 files until the next delivered claim (asserted at `node-handoff-store-expiry.test.ts:53-63` for an empty archive). Out of T20's scope by its text; carried from codereview_05.
- The happy path holds an eleventh archive file between the move and the prune; a concurrent `doctor` could see 11.
- After `commit()`, the hook has no deadline at all until the prune and lock release finish; a hung `readdir` or `rm` (for example, a stalled network drive) blocks the session-start hook up to the harness's own timeout. Accepted by DEC-HIL-05; noted for HIL 3.
- Carried from codereview_05 and still untouched: `restoreHandoff` copies then deletes (crash window); empty `runtime/restart/<harness>/` folders after `init --no-auto-restart`; only the Pi ready impact is asserted; the stale-lock double takeover in `acquireClaimLock` (`handoff-claim-lock.ts:17-22`); `AUTO_RESTART_HANDOFF_KEPT` for a `handoffs/` folder holding only a leftover `.claim.lock`; Oh-My-Pi has no typed-prompt, no-progress, or non-TUI stand-down case; `pi/restart.ts:44` synchronous throw skips the guard rollback; the semi-automatic classification matches the impact prefix; each restart bundle is about 732 KB; Pi shows the `/new` reset notice and also restarts automatically (UX for HIL 3); `common/restart-diagnostics.ts` swallows `readdir` and `stat` errors; `tests/helpers/handoff-file.ts` sets a future mtime; `omp-restart-handoff.test.ts:16` labels the env-switch case TC-10.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_05/CR-01 | resolved | `HookDeadline.commit()` (`hook-deadline.ts:31-36`) decides synchronously between the neutral answer and the delivery; the store commits after the move (`node-handoff-store.ts:42`), and only the prune and the lock release follow. Scratch sweep over both hosts: 0 of 1,280 runs lost the handoff. Regression guard missing for the in-process host (new CR-01) |
| codereview_05/CR-02 | resolved | `pruneArchive` excludes the archived name (`node-handoff-store.ts:89-90`); `node-handoff-store.test.ts:56-67` green 10/10; scratch proof returns an existing path with 10 names |
| codereview_04/CR-01 | resolved (still) | Full-archive expiry cases `node-handoff-store-expiry.test.ts:66-87` green 10/10; every neutral sweep run left the archive unchanged |
| codereview_03/CR-01 | resolved | Persistent in codereview_05; now closed by the commit: 0 lost on both hosts, full and empty archive |
| codereview_03/CR-02, CR-03 | resolved (unchanged) | Code unchanged; `init-auto-restart.test.ts` and `doctor-remove-restart.test.ts` green in coverage |
| codereview_02/CR-01 | resolved (unchanged) | Lock unchanged; lock and concurrency suites 10/10 |
| codereview_01/CR-01 … CR-05 | resolved (unchanged) | Code and tests unchanged; suites green in coverage |

## Limitations and open items

- Block count: codereview_05 had 2 (CR-01 Medium, CR-02 Low). Both are resolved; this review records 1 (CR-01, Low, a missing regression test from T19.4). The round reduced blocks (2 → 1).
- CR-01 is a block because T19.4 is a checked Work item of the correction task that was not delivered as written, and its disclosed justification (typecheck coverage) is incorrect; this feature treated missing test cases as blocks before (codereview_01/CR-02, CR-03). The behavior itself is proven by this review's scratch sweep, not by the suite.
- The TechSpec is untracked; the change since codereview_05 was identified from the T19 handoff and a full read (lines 239-240), not from a diff.
- The rationale of the session-start deadline amendment (`techspec.md:240`, "harness session-start timeouts are 30 s or more") overstates the research: Cursor's default timeout is undocumented (`docs/research/harness-integrations.md:102`) and Oh-My-Pi documents none (`:178`). The overrun is milliseconds of local I/O; an accuracy note for HIL 3.
- The TechSpec and manifest hashes differ from the approved ones, as in earlier reviews. The agent amendments (DEC-01, DEC-02 with T03, T14, T15, T18, and T19, DEC-05 `MOD_VERSION`, DEC-06 host shape, `SKIP_DISABLED_ENV` wording, the prd-10 FR-10 / DEC-11 session-start amendment) are pending HIL 3; this review judged against the current text.
- Manual acceptance (real Pi and Oh-My-Pi sessions to `RED` with a handoff; Codex `/new`) is `not verifiable` here; the TechSpec assigns it to HIL 3.
- NFR-02: validated on Windows only. Linux and macOS depend on the CI matrix.
- During this review the ContextBrake telemetry block reached `RED` on an estimated 128,000-token window and asked for `/sdd-snapshot` and a session reset. The delegated-reviewer contract forbids editing the snapshot and running the session pause, so this review did neither; the report was completed in this session.
- What `workflow.md` should record (this delegated reviewer does not edit it): codereview_06 REJECTED; codereview_05/CR-01 and CR-02 resolved; codereview_03/CR-01 resolved; codereview_04/CR-01 still resolved; new CR-01 (Low: T19.4 incomplete, no in-process host test and no process-hook test with the deadline during the prune or lock release; the in-process `deadline` pass-through is unguarded by any suite); blocks 2 → 1, so the round made progress (`rounds_without_progress` back to 0); NFR-03 measured at 72.5 s on an idle machine (O-08 closed).
- The scratch script (`sweep.mts`), the hash list, and the command logs live in this session's scratchpad under `cr06/`, outside the repository. Besides this report, the commands changed only `dist/`, `coverage/`, and temporary directories.

## Conclusion

T19 and T20 fix both codereview_05 findings. `HookDeadline.commit()` makes the neutral answer and the delivery mutually exclusive, and only the prune and the lock release run after the commit, as the DEC-HIL-05 amendment allows. A 1,280-run sweep over the in-process and process-hook hosts lost no handoff, and every delivered path existed. The prune now keeps the handoff it just archived whatever the clock. codereview_03/CR-01, open since round 3, is closed. Build, lint, typecheck, schemas, dependencies, the quality profile (0 new hits), coverage (1166 tests, 94.04% lines), and the budget run (72.5 s idle) are green.

The status is REJECTED for one Low finding: T19.4's host-level regression tests were not delivered as written. The in-process host's `deadline` pass-through, the wiring the previous race went through for Pi and Oh-My-Pi, can be removed without failing typecheck or any suite. The correction is test-only. Blocks went from 2 to 1. The HIL 3 amendment list and the manual acceptance remain open.
