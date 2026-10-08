# Code review report — prd-14-refatoracao-modo-leve-reinicio-multi-harness

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `a31e183..worktree` (HEAD = `a31e183`; the whole feature is uncommitted: modified tracked files plus untracked files under `src/`, `assets/runtime/`, `tests/`, and the feature folder; 153 scope files, 101 of them TypeScript)
- Previous review: `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_04/codereview.md` (REJECTED, CR-01); correction T18 in `codereview_04/done/task_18.md`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md` | read; sha256 `46d51574…`, matches the approved hash (DEC-HIL-01) |
| TechSpec | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md` | read; sha256 `5d17fe2a…`. Since codereview_04 (`61eba181…`) only line 238 was added: the T18 DEC-02 amendment. It still differs from the approved `be5a0c65…` (DEC-HIL-04) by the agent amendments pending HIL 3 (`techspec.md:230-238`) |
| Manifest | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/tasks.md` | read; sha256 `3bd8e790…`, unchanged since codereview_04. T01-T09 `[x]`; every link resolves to `done/task_NN.md`; DAG acyclic |
| Handoffs | `done/task_01.md` … `task_09.md`; `codereview_01/done/task_10.md` … `task_13.md`; `codereview_02/done/task_14.md`; `codereview_03/done/task_15.md` … `task_17.md`; `codereview_04/done/task_18.md` | read (T18 in full; earlier ones unchanged since codereview_04, which verified them). T18 has a filled Handoff and all Work items checked. No correction manifest, as in earlier rounds |
| Workflow and checkpoint | `workflow.md`, `checkpoint.json` | read (DEC-HIL-01..04; `correction_round: 4`; `rounds_without_progress: 0`; `active_work` lists this reviewer for `codereview_05`) |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter: header, next step brief, open threads O-04, O-05, O-07, O-08, and `on-run` L-05. The file is under 8 KiB and was read whole in one call; `Decisions` and the `on-edit` learning were not used as evidence. `git_head` = HEAD (`a31e183`); `covers_through` T18 matches `codereview_04/done/task_18.md`; worktree matches the header |
| Implementation | `git diff a31e183` plus `git ls-files --others --exclude-standard` | delimited. Files newer than `codereview_04/codereview.md` under `src/`, `assets/`, `tests/`, `scripts/`, `docs/`, and the feature folder are exactly the two files T18 lists (`node-handoff-store.ts`, `node-handoff-store-expiry.test.ts`) plus `techspec.md`, `workflow.md`, `checkpoint*.json`, `context-snapshot.md`, and `task_18.md`. `schemas/*.json` have a newer mtime but no Git change. A sha256 list of all 153 scope files taken before any command matched again after the last command |
| Excluded from scope | `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/` (untracked, predates the slice); `probe/` (throwaway, NFR-03); OpenCode 2.x load failure (DEC-HIL-04); Codex `"hooks": {}` reformatting after remove (pre-existing) | — |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Handoff action at and above the trigger zone with restart on and no skill; nothing with restart off | `restart-mode.ts`, `zone-guidance.ts`, `brake-engine.ts` | `zone-guidance.test.ts`, `restart-mode.test.ts`, `telemetry-block-budget.test.ts` | conformant | Unchanged since codereview_04; suites green in coverage. Content list dropped for the 60-token budget (DEC-01 amendment, HIL 3) |
| FR-02 | The next session starts with the instruction and the handoff path | `session-reset-handler.ts:30-37`, `in-process-host.ts:32`, `process-hook-host.ts:84`, `node-handoff-store.ts:29-50` | `session-reset-handler.test.ts`, `semi-auto-restart.test.ts`, `omp-session-switch.test.ts`, `handoff-deadline.test.ts` | non-conformant | Normal path holds. When the session-start deadline fires after the store's final expiry check, the claim still archives the handoff while the host answers neutral: the next session gets no instruction and nothing is left pending (CR-01). With a clock earlier than the archive names, the instruction names a file the same claim already deleted (CR-02) |
| FR-03 | One delivery; the archive keeps the most recent N = 10 | `node-handoff-store.ts:38-94`, `handoff-claim-lock.ts` | `node-handoff-store.test.ts`, `node-handoff-store-lock.test.ts`, `node-handoff-store-expiry.test.ts` | non-conformant | codereview_04/CR-01 is resolved: a skipped or undone claim leaves a full archive unchanged (tests at `node-handoff-store-expiry.test.ts:61-81`; 0 archive changes on 55 neutral runs of a full-archive host sweep). Two gaps remain: a handoff archived without delivery (CR-01) and the just-archived handoff pruned as the "oldest" name when the clock is behind the archive (CR-02) |
| FR-04 | Handoff gate: fresh handoff required, skip with a reason otherwise | `auto-restart-policy.ts` | `auto-restart-policy.test.ts`, `restart-flow.test.ts`, `claude-mod-handoff.test.ts`, `pi-restart-handoff.test.ts`, `omp-restart-handoff.test.ts` | conformant | Unchanged |
| FR-05 | Neutral restart core; Claude mod behavior unchanged | `core/contracts/{restart-log,restart-host,auto-restart}.ts`, `core/services/{restart-flow,restart-guards,auto-restart-notices}.ts`, `claude-code/mod/restart-host.ts` | `restart-neutrality.test.ts`, `restart-flow.test.ts`, `claude-mod-*.test.ts` | conformant | Unchanged |
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
| NFR-03 | New tests within the 120 s budget; probes outside `npm test` | `probe/` not in the test globs | `npm run test:budget` | conformant | 116.4 s wall, exit 0, at 88% CPU before and 97% after (external load); coverage 116.7 s Vitest at 21-43% CPU |
| NFR-04 | Handoffs under `.context-brake/`, untracked | `restart-install-extras.ts` | `init-auto-restart.test.ts` | conformant | Unchanged |
| NFR-05 | Restart off installs and injects nothing | `restart-asset-plan.ts`, `session-reset-handler.ts:35` | `semi-auto-restart.test.ts`, `in-process-restart-plan.test.ts`, `pi-restart.test.ts` | conformant | Unchanged |
| TC-02 / Errors section | A failed or timed-out session-start claim leaves the handoff pending (`techspec.md:98`) | `hook-deadline.ts`, `in-process-host.ts:32`, `process-hook-host.ts:84`, `node-handoff-store.ts:35,39-48` | `handoff-deadline.test.ts`, `node-handoff-store-expiry.test.ts` | non-conformant | A deadline before the first check or during the move leaves the handoff pending. A deadline during the awaited I/O after the final check (prune at `:48`, lock release at `:35`) archives it undelivered (CR-01) |
| TC-03 | Concurrent claims: exactly one wins | `node-handoff-store.ts`, `handoff-claim-lock.ts` | `node-handoff-store.test.ts`, `node-handoff-store-lock.test.ts` | conformant | 10/10 repeated suite runs; 300/300 scratch pairs on a full archive delivered once, archive at 10 |
| TC-09 | Per probe-passed harness: valid signal, limit, typed prompt, env switch, non-interactive | `pi/restart.ts` | `pi-restart.test.ts`, `pi-restart-handoff.test.ts` | conformant | Unchanged |
| TC-12, TC-14 | Doctor and remove suites | — | `doctor-remove-restart.test.ts`, `init-auto-restart.test.ts` | conformant (renamed) | Implemented under file names other than the ones the TechSpec lists |
| Manual acceptance | A real session per probe-passed harness to `RED` with a handoff; Codex `/new` | — | — | not verifiable | The TechSpec assigns it to the person at HIL 3 |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` / `javascript-typescript.md` | OK | `npm run lint`, `npm run typecheck` exit 0; QA-01..QA-03, QA-09, QA-10 with no new hit. `node-handoff-store.ts` is 94 lines |
| `node.md` (in-process I/O) | OK | QA-06 clean over the 30 in-process files and the two built restart bundles. The test's `writeFileSync` (`node-handoff-store-expiry.test.ts:2,51`) is test code, outside QA-06's scope |
| `harness-adapters.md` | OK | No adapter changed since codereview_04 |
| `file-changes.md` | NOT OK | ContextBrake deletes a handoff the agent wrote: with the clock behind the archive names, the claim moves `handoff.md` into the archive and its own prune deletes it (CR-02). DEC-14 calls deleting handoffs "destroys user work" |
| `cli-output.md` | OK | No output change; `npm run schemas:check` exit 0 |
| `tests.md` (budget, isolation) | OK | Budget 116.4 s under external load. New cases use `mkdtemp` and remove their temp dirs with retries |
| Hexagonal layering (`AGENTS.md`) | OK | QA-05 clean |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | TechSpec command over the 101 scope `.ts` files | 0 | OK |
| QA-02 | Suppression comments | blocking | idem | 0 | OK |
| QA-03 | Empty `catch` | blocking | idem | 0 | OK |
| QA-04 | `exec`/`execSync`/`shell: true` | blocking | idem | 0 | OK |
| QA-05 | `core` → `infrastructure`/`cli` | blocking | over the 17 `src/core/**` scope files | 0 | OK |
| QA-06 | Sync API in process | blocking | over the 30 in-process files (Pi, Oh-My-Pi, OpenCode, Claude mod, `common/in-process-*`, `assets/runtime/*-restart.ts`, handoff store, lock helper, deadline, in-process host), plus `dist/assets/runtime/{pi,omp}-restart.js` | 0 | OK |
| QA-07 | stdout on hook paths | blocking | over the 54 `src/{core,infrastructure}/**` scope files | 0 new of 1 | pre-existing: `process-hook-host.ts:29` is the hook's response writer, identical at `a31e183` (codereview_04 checked it with `git show`) |
| QA-08 | Clock or randomness in `core` | reservation | over `src/core/**` scope files | 0 | OK |
| QA-09 | 4+ parameters | reservation | idem (`--pcre2`), source files | 0 new of 1 | pre-existing (`oh-my-pi/runtime.ts:51`, the baseline's object-type false positive) |
| QA-10 | File above 100 lines | reservation | `rg -c -H '^' … \| awk -F: '$2 > 100'` | 0 | OK (`node-handoff-store.ts` 94) |

- Terrain baseline: applied from the TechSpec (`techspec.md:163-201`). `process-hook-host.ts` is not in the baseline table; its QA-07 hit was checked against `a31e183` in codereview_04 and the file is unchanged since.
- Hits discounted by baseline: 2 (QA-07 at `process-hook-host.ts:29`, QA-09 at `oh-my-pi/runtime.ts:51`)
- Reservations accumulated in the feature: 0
- Suggested escalation: no trigger fired (0 reservations; no touched file above 200 lines; no block duplicated in 3+ places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 | PARTIAL | Shortened text and positional `mode` parameter (amendment pending HIL 3, `techspec.md:231`) |
| DEC-02 | PARTIAL | One claimer wins under the lock. The claim order now matches the T18 amendment (`techspec.md:238`): expiry check, reserve, move, expiry check with restore, then prune to 10 (`node-handoff-store.ts:39-48`). That order puts awaited I/O after the final check (CR-01) and lets the prune delete the name it just reserved (CR-02). All DEC-02 amendments (T03, T14, T15, T18) are pending HIL 3 |
| DEC-03, DEC-04 | YES | Unchanged |
| DEC-05, DEC-06 | PARTIAL | `MOD_VERSION` not bumped; `RestartHost` shape differs (amendments pending HIL 3) |
| DEC-07 … DEC-21 | YES | Unchanged since codereview_04 |
| Errors, security, and recovery (`techspec.md:98`): "the handoff stays pending for the next start" | NO | Holds for a deadline before the first check or during the move; fails for a deadline after the final check (CR-01) |
| Contracts and data, handoff files (`techspec.md:82`): "at most 10 files, oldest deleted by name order" | PARTIAL | Followed literally. With a clock behind the archive, "oldest by name" is the handoff just delivered (CR-02). On the newer-handoff-at-restore path the archive keeps 11 files until the next delivered claim (optional improvement) |
| Contracts and data (log v2, reason codes, finding codes) | YES | `schemas:check` exit 0 |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01, T02 | `done/task_01.md`, `done/task_02.md` | COMPLETE | Unchanged |
| T03 | `done/task_03.md` | INCOMPLETE | Its outcome "the session-start path injects the archived path once" and FR-03's "most recent N are kept" do not hold on the paths of CR-01 and CR-02 |
| T04 … T09 | `done/task_04.md` … `task_09.md` | COMPLETE | Unchanged since codereview_04 |
| T10 … T14, T16, T17 | `codereview_01/done/…`, `codereview_02/done/task_14.md`, `codereview_03/done/task_16.md`, `task_17.md` | COMPLETE | Unchanged |
| T15 | `codereview_03/done/task_15.md` | INCOMPLETE | Its residual window was disclosed as in-memory only. It is not: the lock release in `claim`'s `finally` (`node-handoff-store.ts:35`) is awaited I/O after the final check (CR-01) |
| T18 | `codereview_04/done/task_18.md` | COMPLETE | Every Work item is done and every acceptance criterion holds: full-archive `claim(() => true)` and `claim(expiresAfter(1))` return `null` with the same 10 files (`node-handoff-store-expiry.test.ts:61-74`); the delivered full-archive claim keeps 10 (`node-handoff-store.test.ts:44`); the prune-failure case rejects with the archive unchanged and no lock (`:75-81`); the amendment is at `techspec.md:238`. Its prescribed order also widened the CR-01 window and reintroduced CR-02 |

## Executed validations

- Profile and scope: CLI commands, process hooks, the Claude mod, and the Pi and Oh-My-Pi in-process files. The e2e smoke set runs inside `npm run coverage` and `npm run test:budget`.
- Validated state: worktree at `a31e183` plus the uncommitted feature diff and T10-T18; Windows 11 Pro 10.0.26200, Node 24.19.0. Commands ran serially in this session. CPU load was 21% before the build, 43% after coverage, and 88% before and 97% after the budget run; the top CPU consumers were external (`TokenHound.App`, `herdr`).
- Reused evidence: none for commands. Code changed after codereview_04 (T18), so every command was re-run. codereview_04's evidence for unchanged areas (`process-hook-host.ts:29` at `a31e183`, the T10-T17 verifications) is reused because those files did not change.
- Manual acceptance: open item for HIL 3; `not verifiable` here.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed (exit 0, 9 s) | bundles for the in-process files; L-05 prerequisite |
| `npm run lint` | passed (exit 0) | code standards |
| `npm run typecheck` | passed (exit 0) | all |
| `npm run schemas:check` | passed (exit 0) | Contracts and data |
| `npm run dependencies:check` | passed (exit 0) | — |
| `npm run coverage` | passed: 217 files, 1161 tests; statements 94.04%, branches 90.13%, functions 94.72%, lines 94.04%; Vitest 116.7 s, command 120 s | FR-01..FR-13, TC-01..TC-14 |
| `npm run test:budget` (standalone) | passed: "Test run: 116.4s wall (budget 120s)", exit 0, CPU 88% → 97% | NFR-03, TC-15 |
| `npx vitest run` over `node-handoff-store-expiry`, `node-handoff-store`, `node-handoff-store-lock`, `handoff-deadline`, `session-reset-handler`, `hook-deadline` × 10 | 10 passed, 0 failed (6 files, 29 tests each) | FR-03, TC-02, TC-03, T18 acceptance |
| Scratch sweep (`cr05/proof.mts` (a)): `createInProcessRuntime`, Pi descriptor, handoff mode, real `NodeHandoffStore`, full archive, session-start deadlines 1-40 ms × 8 | 259 delivered (archive 10, oldest gone); 55 neutral with the handoff pending and the archive unchanged; **6 neutral with `handoff.md` gone**; 0 inconsistent | codereview_04/CR-01 resolved; CR-01 |
| Scratch sweep (`cr05/sweep3.mts`), same host, full and empty archive, lost runs re-checked after a further 1 s | full archive: 230 delivered, 80 pending, **10 lost**; empty archive: 236 delivered, 65 pending, **19 lost**. In every lost run, 1.15 s after the neutral answer `handoff.md` was still absent and the newest archive entry carried the current timestamp, so no restore was in flight | CR-01 |
| Scratch window probe (`cr05/window.mts`): a 0 ms timer scheduled at the store's second (final) expiry check, on claims that then delivered | the timer fired before `claim()` resolved in 23/50 claims on an empty archive and 49/50 on a full archive | CR-01 mechanism: a deadline timer can fire after the final check |
| Scratch A/B (`cr05/ab.mts`): the same sweep with `claimLocked` replaced by a reconstruction of the T15 order from codereview_04's description (prune to 9 before the move, nothing awaited after the final check except the lock release) | reconstruction: 7 lost (full), 8 lost (empty); current code: 7 lost (full), 11 lost (empty) | CR-01 predates T18 through the lock release; T18 adds the prune to the window. The reconstruction is not T15's code, which is unrecoverable |
| Scratch proof (`cr05/proof.mts` (c)): archive of 10 named `202712…`, clock at `2026-10-07T12:00:00.000Z`, `claim()` | returns `.context-brake/handoffs/20261007T120000.000Z.md`; that file does not exist; `handoff.md` does not exist; archive holds the 10 future-named files | CR-02 |
| Scratch proof (`cr05/proof.mts` (b)): full archive, expiry seen after the move, newer `handoff.md` written before the restore | returns `null`; `handoff.md` holds the newer text; archive holds 11 files | optional improvement |
| Scratch stress (`cr05/proof.mts` (d)): 300 iterations of 2 concurrent `claim()` calls on a full archive | 300/300 delivered exactly once to an existing file, archive at 10, nothing pending | TC-03 regression after T18 |
| QA-01..QA-10 (`rg` per the TechSpec) | 0 new hits (2 pre-existing) | Quality profile |
| `sha256sum -c` of the 153 scope files after all commands | all unchanged | review integrity |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Medium | codereview_03/CR-01; TechSpec Errors (`techspec.md:98`); FR-02, FR-03; T15, T18 | `src/infrastructure/storage/node-handoff-store.ts:44` (`claimLocked`) is the last `isExpired()` call. After it, `claim` still awaits I/O before it resolves: `pruneOrRestore` → `pruneArchive` (`readdir` and `rm`, `:48`, `:90-94`, added there by T18) and the lock release in the `finally` (`rm(lock)`, `:35`, T14/T15). `HookDeadline.run` races `claim`'s caller against a timer (`hook-deadline.ts:39-42`), and a timer can fire in that gap: 23/50 delivered claims on an empty archive and 49/50 on a full one (window probe). When it fires, both hosts (`in-process-host.ts:32`, swept; `process-hook-host.ts:56,84`, same race, by reading) answer neutral and discard the resume text, while the claim completes and archives the handoff. Host sweeps with 1-40 ms deadlines left `handoff.md` absent and the handoff archived with no instruction in 6-19 of 320 runs, still so 1 s later | The next session is not told to resume, and the handoff is no longer pending, so no later session start delivers it either; the work survives only as an archive file the person must find. The trigger is a session start that reaches its deadline (default 5,000 ms) during the last few milliseconds of the claim. codereview_04 recorded this window as in-memory only; the lock release disproves that, and T18 widened it with the prune | Cause proven: awaited I/O between the final expiry decision and `claim`'s resolution. The correction must satisfy two constraints together: nothing awaited after the final expiry decision, and no archived handoff deleted before delivery is decided (codereview_04/CR-01). T15 met the second only partly and T18 met it by widening the first. The mechanism (for example, keeping the deadline from answering while the claim commits, `HookDeadline.extendTo` exists) is for `sdd-plan-corrections`. Add a host-level test whose deadline fires during the prune or the lock release and asserts the handoff is either delivered or still pending |
| CR-02 | Low | FR-03 ("the most recent N archived handoffs are kept"), FR-02, `file-changes.md`, DEC-14 rationale; T18 | `node-handoff-store.ts:48` prunes after the move with `pruneArchive(archive, HANDOFF_ARCHIVE_LIMIT)`, which sorts every `.md` name and deletes the first `length - 10` (`:90-94`). The name reserved at `:40` comes from the clock and is not excluded. When the clock is earlier than the ten archived names, the new name sorts first and the claim deletes the handoff it just moved, then returns its path. Scratch proof (c): archive `202712…` × 10, clock `2026-10-07`: `claim()` returns `.context-brake/handoffs/20261007T120000.000Z.md`, which does not exist, and `handoff.md` is gone. Under the T15 order (prune to 9 before the move, per codereview_04) the new name could not be pruned | The agent's handoff is destroyed and the resume instruction points to a missing file; this repeats on every claim until the clock passes the archived names. Reachable only after the system clock moves back past ten archived handoffs (for example, a clock that ran ahead and was corrected) | Cause proven: the prune does not exclude the name the claim just archived. Exclude the reserved name from the prune candidates (prune the oldest of the other names down to 9) and add a case with a clock earlier than a full archive asserting the returned path exists and the archive holds 10 |

Optional improvements (not findings):

- Newer handoff at restore on a full archive (`node-handoff-store.ts:44-46`, `:80-88`): when expiry is seen after the move and a newer `handoff.md` already exists, `restoreHandoff` keeps the archived file and nothing prunes, so the archive holds 11 files until the next delivered claim (scratch proof (b)). The same holds on the prune-failure path when the restore meets a newer file. Both need a write inside the claim's move window; nothing is deleted and the next delivered claim corrects the count, but FR-03's "never more than N" fails strictly there.
- The happy path now holds an eleventh archive file between the move and the prune (accepted by T18's requirements); a concurrent `doctor` could see 11.
- Carried from codereview_04 and still untouched: no test drives `runProcessHook` with a short session-start deadline; `restoreHandoff` copies then deletes (crash window); empty `runtime/restart/<harness>/` folders after `init --no-auto-restart`; only the Pi ready impact is asserted; the stale-lock double takeover in `acquireClaimLock` (`handoff-claim-lock.ts:17-22`); `AUTO_RESTART_HANDOFF_KEPT` for a `handoffs/` folder holding only a leftover `.claim.lock`; Oh-My-Pi has no typed-prompt, no-progress, or non-TUI stand-down case; `pi/restart.ts:44` synchronous throw skips the guard rollback; the semi-automatic classification matches the impact prefix; each restart bundle is about 732 KB; Pi shows the `/new` reset notice and also restarts automatically (UX for HIL 3); `common/restart-diagnostics.ts` swallows `readdir` and `stat` errors; `tests/helpers/handoff-file.ts` sets a future mtime; `omp-restart-handoff.test.ts:16` labels the env-switch case TC-10.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_04/CR-01 | resolved | `node-handoff-store.ts:39-48` checks expiry, moves, checks again and restores, and prunes only after; `pruneOrRestore` (`:53-60`) restores on a prune failure. Tests `node-handoff-store-expiry.test.ts:61-81` (full archive unchanged on both expiry paths and on prune failure) are green 10/10; 55 neutral runs of the full-archive host sweep left the archive unchanged |
| codereview_03/CR-01 | persistent | codereview_04 marked it resolved on a 0/320 sweep and the statement that no I/O runs after the last check. The lock release at `:35` is such I/O, and T18 added the prune at `:48`. This review's sweeps lost the handoff in 6-19 of 320 runs (CR-01) |
| codereview_03/CR-02, CR-03 | resolved (unchanged) | Code unchanged since codereview_04; `init-auto-restart.test.ts` and `doctor-remove-restart.test.ts` green in coverage |
| codereview_02/CR-01 | resolved (unchanged) | Lock unchanged; lock suite 10/10; 300/300 scratch pairs on a full archive |
| codereview_01/CR-01 … CR-05 | resolved (unchanged) | Code and tests unchanged; suites green in coverage |

## Limitations and open items

- Block count: codereview_04 had 1 (CR-01, Low). This review resolves it and records 2: CR-01 (Medium), which reopens codereview_03/CR-01 with new evidence, partly in code T18 changed (the prune) and partly in code that predates the round (the lock release); and CR-02 (Low), reintroduced by T18's prune order. The round did not reduce blocks.
- The A/B row compares the current code with a scratch reconstruction of the T15 order built from codereview_04's description; T15's code itself is uncommitted and no longer recoverable. CR-01 does not depend on it: the window probe and the sweeps run the current code.
- `process-hook-host.ts:56,84` was verified by reading only: it races the same engine call against the same `HookDeadline`, so the store's window applies there too. The sweeps ran the in-process host.
- The TechSpec and manifest hashes differ from the approved ones, as in earlier reviews. The agent amendments (DEC-01, DEC-02 with T03, T14, T15, and T18, DEC-05 `MOD_VERSION`, DEC-06 host shape, `SKIP_DISABLED_ENV` wording) are pending HIL 3; this review judged against the current text.
- Manual acceptance (real Pi and Oh-My-Pi sessions to `RED` with a handoff; Codex `/new`) is `not verifiable` here; the TechSpec assigns it to HIL 3.
- NFR-02: validated on Windows only. Linux and macOS depend on the CI matrix.
- NFR-03 passed at 116.4 s under 88-97% external CPU load, close to the 120 s limit; an idle run would show more margin (O-08).
- What `workflow.md` should record (this delegated reviewer does not edit it): codereview_05 REJECTED; codereview_04/CR-01 resolved; codereview_03/CR-01 persistent, reopened by evidence (handoff archived undelivered when the deadline fires after the final expiry check, during the T18 prune or the lock release; 6-19 of 320 host runs); new CR-01 (Medium, that window; `techspec.md:98`, FR-02, FR-03) and CR-02 (Low, the post-move prune deletes the just-archived handoff when the clock is behind the archive names; FR-03; T18); blocks 1 → 2, so the round made no progress (`rounds_without_progress` becomes 1); NFR-03 measured at 116.4 s under load.
- The scratch scripts (`proof.mts`, `sweep2.mts`, `sweep3.mts`, `window.mts`, `ab.mts`), the hash list, and the command logs live in this session's scratchpad under `cr05/`, outside the repository. Besides this report, the commands changed only `dist/`, `coverage/`, and temporary directories.

## Conclusion

T18 did what it planned: a claim that the session-start deadline skips or undoes no longer deletes an archived handoff. The full-archive tests and 55 neutral host runs confirm it, so codereview_04/CR-01 is resolved. Build, lint, typecheck, schemas, dependencies, the quality profile (0 new hits), coverage (1161 tests, 94.04% lines), and the budget run (116.4 s under load) are green.

The status is REJECTED for two findings in the handoff claim. First, the store's final expiry check is followed by awaited I/O, the T18 prune and the lock release, so a deadline that fires there makes the host answer neutral while the claim archives the handoff. The next session is not told to resume, and nothing stays pending. This reopens codereview_03/CR-01 (CR-01, Medium). Second, the prune now runs after the move and sorts by name, so with a clock behind the archive it deletes the handoff the claim just archived (CR-02, Low). The two earlier findings pull in opposite directions: no deletion before delivery is decided, and nothing awaited after the final check. The next correction has to satisfy both, and the design belongs in `sdd-plan-corrections`. The round did not reduce blocks (1 → 2). The HIL 3 amendment list and the manual acceptance remain open.
