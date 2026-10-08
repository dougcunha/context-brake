# Code review report — prd-14-refatoracao-modo-leve-reinicio-multi-harness

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `a31e183..worktree` (HEAD = `a31e183`; the whole feature is uncommitted: modified tracked files plus untracked files under `src/`, `assets/runtime/`, `tests/`, and the feature folder; 93 TypeScript files in scope)
- Previous review: `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_02/codereview.md` (REJECTED, CR-01); correction T14 in `codereview_02/done/task_14.md`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md` | read; sha256 `46d51574…`, matches the approved hash (DEC-HIL-01) |
| TechSpec | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md` | read; sha256 `055f9ba0…`, the same version codereview_01 and codereview_02 judged. It differs from the approved `be5a0c65…` (DEC-HIL-04) only by the agent amendments pending HIL 3 (`techspec.md:230-235`) |
| Manifest | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/tasks.md` | read; sha256 `3bd8e790…`, unchanged. T01-T09 `[x]`; every link resolves to `done/task_NN.md`; DAG acyclic |
| Handoffs | `done/task_01.md` … `task_09.md`; `codereview_01/done/task_10.md` … `task_13.md`; `codereview_02/done/task_14.md` | read; every task has a filled Handoff section. No correction manifest, as before |
| Workflow and checkpoint | `workflow.md`, `checkpoint.json` | read (DEC-HIL-01..04; `correction_round: 2`; `active_work` lists this reviewer) |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter: header, next step brief, open threads O-04, O-05, O-07, O-08, `on-run` L-05. The file is under 8 KiB and was read whole in one call; `Decisions` and other `Learnings` were not used as evidence. `git_head` = HEAD; the worktree matches the header |
| Implementation | `git diff a31e183` plus `git ls-files --others --exclude-standard` | delimited. Before any command ran, every file matched the hash list taken by the author before delegation. Compared with the hash list taken before codereview_02, only these files changed: `src/infrastructure/storage/node-handoff-store.ts`, the new `tests/integration/node-handoff-store-lock.test.ts`, `codereview_02/done/task_14.md`, `checkpoint.json`, `checkpoint.previous.json`, `context-snapshot.md`, `workflow.md`. This matches the T14 handoff |
| Excluded from scope | `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/` (untracked, predates the slice); `probe/` (throwaway, NFR-03); OpenCode 2.x load failure (DEC-HIL-04) | — |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Handoff action at and above the trigger zone with restart on and no skill; nothing with restart off | `restart-mode.ts:6-9`, `zone-guidance.ts:15-20`, `brake-engine.ts:50` | `zone-guidance.test.ts:45-65`, `restart-mode.test.ts:8-17`, `telemetry-block-budget.test.ts` | conformant | Exact action text; restart off gives the generic text with no path and no marker. Content list dropped for the 60-token budget (DEC-01 amendment, HIL 3) |
| FR-02 | The next session starts with the instruction | `session-reset-handler.ts:28,32-36`, `runtime-composition.ts:54-55`, Oh-My-Pi `session_switch` mapping (`oh-my-pi/events.ts:38`) | `session-reset-handler.test.ts:40-76`, `semi-auto-restart.test.ts:40-53`, `omp-session-switch.test.ts:14-23` | conformant | The normal path delivers. The deadline path loses the handoff instead (CR-01, counted under FR-03) |
| FR-03 | One delivery, archive of N=10 | `node-handoff-store.ts:23-93` | `node-handoff-store.test.ts`, `node-handoff-store-lock.test.ts` | non-conformant | Concurrent claims are fixed: one delivery in every stress pair (codereview_02/CR-01 resolved). When the session-start deadline expires, the claim still archives the handoff after the hook has answered neutral, so it is delivered to zero sessions (CR-01) |
| FR-04 | Handoff gate: fresh handoff required, skip with a reason otherwise | `auto-restart-policy.ts:20-24,33` | `auto-restart-policy.test.ts:71-90`, `restart-flow.test.ts:65-69`, `claude-mod-handoff.test.ts`, `pi-restart-handoff.test.ts`, `omp-restart-handoff.test.ts` | conformant | An unknown turn start gives `SKIP_HANDOFF_STALE`. Order: stand-down, then handoff, then guards |
| FR-05 | Neutral restart core; Claude mod behavior unchanged | `core/contracts/{restart-log,restart-host,auto-restart}.ts`, `core/services/{restart-flow,restart-guards,auto-restart-notices}.ts`, `claude-code/mod/restart-host.ts` | `restart-neutrality.test.ts:6-24`, `restart-flow.test.ts`, `claude-mod-*.test.ts` | conformant | No `claude`/`clear`/`DISABLE_AUTO_COMPACT` in the neutral contracts and services |
| FR-06 | Probe on real installations; research updated | `docs/research/harness-integrations.md`, `probe/captures/`, fixtures | TC-08 (manual + captures) | conformant | Unchanged since codereview_02 |
| FR-07 | Automatic restart where (a) and (b) were verified | `pi/planner.ts:16-24`, `common/restart-asset-plan.ts:39-41`, `pi/restart.ts`, `assets/runtime/pi-restart.ts` | `pi-restart.test.ts`, `pi-restart-handoff.test.ts`, `in-process-restart-plan.test.ts` | conformant | Pi only; Oh-My-Pi needs one Enter (DEC-19); OpenCode out of scope (DEC-HIL-04) |
| FR-08 | Semi-automatic restart elsewhere | capabilities of Codex, Cursor, Copilot, Oh-My-Pi; `reset-notice.ts:7-9`; `oh-my-pi/restart.ts` | `semi-auto-restart.test.ts`, `omp-restart.test.ts`, `omp-restart-handoff.test.ts`, `reset-notice.test.ts` | conformant | Antigravity narrowed to "no restart" (DEC-HIL-02) |
| FR-09 | Limit, typed-prompt reset, no-progress, env switch, non-interactive | `common/in-process-restart-state.ts`, `pi/restart.ts`, `oh-my-pi/restart.ts` | `pi-restart.test.ts`, `pi-restart-handoff.test.ts:16-25`, `omp-restart-handoff.test.ts:16-25`, `omp-restart.test.ts:21` | conformant | The acceptance binds "each verified harness" (Pi). Oh-My-Pi has limit and env-switch cases, but no typed-prompt, no-progress, or non-TUI case (optional improvement) |
| FR-10 | `auto_restart` state and impact text per harness | `*/capabilities.ts`, `restart-install-extras.ts:22-26` | `harness-adapters.test.ts:12-44` | conformant | Each state matches DEC-10. For Pi, the "Automatic restart" text exists only in init's `AUTO_RESTART_MODE` finding; doctor shows no impact text for it (CR-03, Low) |
| FR-11 | Doctor per harness: ready, not loaded or outdated, last skip; codes reused | `common/restart-diagnostics.ts`, `restart-doctor-findings.ts`, `cli/commands/doctor.ts` | `doctor-remove-restart.test.ts`, `auto-restart-doctor.test.ts` | conformant | Unchanged since codereview_02 |
| FR-13 | `remove` and `init --no-auto-restart` remove restart artifacts, keep and name handoffs | `cli/handoff-findings.ts`, `cli/commands/init.ts:54-60`, `remove.ts:37-62`, `restart-install-extras.ts:34-41` | `init-auto-restart.test.ts:48-67`, `doctor-remove-restart.test.ts:76-86` | conformant | The acceptance (after `remove`, no restart artifact remains; handoffs remain and are named) holds. DEC-14's log deletion on `--no-auto-restart` is missing (CR-02) |
| NFR-01 | No clear without a passing gate; errors leave the session intact | `restart-flow.ts:42-54` | `restart-flow.test.ts:57-81` | conformant | The session opens only after `decideRestart` returns restart; `onRejected` rolls the guard back |
| NFR-02 | Linux, macOS, Windows; no `sh`/`setsid`/server | `node:fs/promises` only; claim lock with `open(…, 'wx')` | local Windows; CI matrix | conformant (Windows) | Windows race resolved (see previous findings). Linux and macOS were not run here (limitations) |
| NFR-03 | New tests within the 120 s budget; probes outside `npm test` | `probe/` not in the test globs | `npm run test:budget` | conformant | 81.6 s wall, exit 0, CPU 39% before and 65% after the run: the lowest load measured in any review so far (O-08) |
| NFR-04 | Handoffs under `.context-brake/`, untracked | `restart-install-extras.ts:8-9` | `init-auto-restart.test.ts:39` | conformant | Unchanged |
| NFR-05 | Restart off installs and injects nothing | `restart-asset-plan.ts:40`, `session-reset-handler.ts:33` | `semi-auto-restart.test.ts`, `in-process-restart-plan.test.ts`, `pi-restart.test.ts` | conformant | Unchanged |
| TC-03 | `NodeHandoffStore` concurrent claims: exactly one claim wins | `node-handoff-store.ts:23-58` | `node-handoff-store.test.ts:56-64`, `node-handoff-store-lock.test.ts:28-50` | conformant | 10 of 10 repeated runs of both files passed. Stress results under Executed validations |
| TC-02 / Errors section | A failed or timed-out session-start claim leaves the handoff pending (`techspec.md:98`) | `session-reset-handler.ts:34`, `failure-policy.ts:49-57` | none | non-conformant | No test makes `claim()` reject or time out. Scratch proof in CR-01 |
| TC-09 | Per probe-passed harness: valid signal, limit, typed prompt, env switch, non-interactive | `pi/restart.ts` | `pi-restart.test.ts`, `pi-restart-handoff.test.ts` | conformant | Unchanged |
| TC-12, TC-14 | Doctor and remove suites | — | `doctor-remove-restart.test.ts`, `init-auto-restart.test.ts` | conformant (renamed) | Implemented under file names other than the ones the TechSpec lists |
| Manual acceptance | A real session per probe-passed harness to `RED` with a handoff; Codex `/new` | — | — | not verifiable | The TechSpec assigns it to the person at HIL 3 |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` / `javascript-typescript.md` | OK | `npm run lint`, `npm run typecheck` exit 0; QA-01, QA-02, QA-03, QA-09, QA-10 clean |
| `node.md` (in-process I/O) | OK | QA-06 clean on the source and on `node-handoff-store.ts`; `rg` over `dist/assets/runtime/{pi,omp}-restart.js` finds no sync file or process API |
| `harness-adapters.md` | OK | No adapter changed since codereview_02 |
| `file-changes.md` | OK | The claim lock lives under `.context-brake/handoffs/`, which the ignore file covers. `remove` and `--no-auto-restart` never touch `handoff.md` or `handoffs/` |
| `cli-output.md` | OK | No output change since codereview_02; `npm run schemas:check` exit 0 |
| `tests.md` (budget, isolation) | OK | Budget 81.6 s. The new lock test uses `mkdtemp` and removes its temp dir with retries |
| Hexagonal layering (`AGENTS.md`) | OK | QA-05 clean |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | TechSpec command over the 93 diff `.ts` files | 0 | OK |
| QA-02 | Suppression comments | blocking | idem | 0 | OK |
| QA-03 | Empty `catch` | blocking | idem | 0 | OK |
| QA-04 | `exec`/`execSync`/`shell: true` | blocking | idem | 0 | OK |
| QA-05 | `core` → `infrastructure`/`cli` | blocking | over the 16 `src/core/**` files in the diff | 0 | OK |
| QA-06 | Sync API in process | blocking | over the 26 Pi, Oh-My-Pi, OpenCode, `common/in-process-*`, `assets/runtime/*-restart.ts`, and Claude mod files, plus `node-handoff-store.ts` and the two built bundles | 0 | OK |
| QA-07 | stdout on hook paths | blocking | over `src/{core,infrastructure}/**` in the diff | 0 | OK |
| QA-08 | Clock or randomness in `core` | reservation | over `src/core/**` in the diff | 0 | OK |
| QA-09 | 4+ parameters | reservation | idem (`--pcre2`) | 0 new of 1 | pre-existing (`oh-my-pi/runtime.ts:51`, the baseline's object-type false positive) |
| QA-10 | File above 100 lines | reservation | `rg -c -H '^' … \| awk -F: '$2 > 100'` | 0 | OK (`node-handoff-store.ts` has 93 lines) |

- Terrain baseline: applied from the TechSpec (`techspec.md:163-201`)
- Hits discounted by baseline: 1 (QA-09 at `oh-my-pi/runtime.ts:51`)
- Reservations accumulated in the feature: 0
- Suggested escalation: no trigger fired (0 reservations; no touched file above 200 lines; no block duplicated in 3+ places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 | PARTIAL | Shortened text and positional `mode` parameter (amendment pending HIL 3, `techspec.md:231`) |
| DEC-02 | PARTIAL | One claimer now wins on Windows. The lock replaces "the loser gets `ENOENT`" and is not written into the TechSpec. `claim()` takes no date (amendment pending HIL 3) |
| DEC-03 | YES | One deliverer; `compact` never claims |
| DEC-04 | YES | Gate order and fail-closed unknown turn start |
| DEC-05, DEC-06 | PARTIAL | `MOD_VERSION` not bumped; `RestartHost` shape differs (amendments pending HIL 3) |
| DEC-07, DEC-08, DEC-09, DEC-11, DEC-12, DEC-13 | YES | Unchanged since codereview_02 |
| DEC-10 | PARTIAL | State per harness matches. Pi's "Automatic restart: …" impact text is not declared, so doctor cannot show it (CR-03) |
| DEC-14 | PARTIAL | `remove` deletes the restart logs through `listRuntimeStateFiles`. `init --no-auto-restart` does not (CR-02) |
| DEC-15 … DEC-21 | YES | Unchanged since codereview_02 |
| Errors, security, and recovery (`techspec.md:98`) | NO | "the handoff stays pending for the next start" does not hold when the session-start deadline expires, or when the prune fails after the rename (CR-01) |
| Contracts and data (log v2, reason codes, finding codes) | YES | `schemas:check` exit 0 |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01, T02 | `done/task_01.md`, `done/task_02.md` | COMPLETE | Unchanged |
| T03 | `done/task_03.md` | INCOMPLETE | The concurrency gap is closed by T14. The outcome "the session-start path injects the archived path once" fails on the deadline path: the handoff is archived and never injected (CR-01) |
| T04 … T08 | `done/task_04.md` … `task_08.md` | COMPLETE | Unchanged since codereview_02. T08 carries CR-03 as Low |
| T09 | `done/task_09.md` | COMPLETE | Budget re-measured at 81.6 s. DEC-14 log gap on `--no-auto-restart` (CR-02, Low) |
| T10 … T13 | `codereview_01/done/task_10.md` … `task_13.md` | COMPLETE | Unchanged since codereview_02 |
| T14 | `codereview_02/done/task_14.md` | COMPLETE | `node-handoff-store.ts:23-58` takes an exclusive `handoffs/.claim.lock` (`open 'wx'`), re-checks the handoff, and removes the lock in `finally`. A lock older than 30 s is taken over. The new tests cover 100 concurrent pairs, a fresh lock, and a stale lock. The handoff discloses the residual stale-lock double-takeover |

## Executed validations

- Profile and scope: CLI commands, process hooks, the Claude mod, and the Pi and Oh-My-Pi in-process files. The e2e smoke set runs inside `npm run coverage` and `npm run test:budget`.
- Validated state: worktree at `a31e183` plus the uncommitted feature diff and T10-T14; Windows 11, Node 24. Commands ran serially in this session. CPU load was 18% before the build, 39% before the budget run, and 65% after it.
- Reused evidence: none. Code changed after codereview_02 (T14), so every command was re-run.
- Manual acceptance: open item for HIL 3; `not verifiable` here.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed (exit 0, 9 s) | bundles `pi-restart.js` (731,802 bytes) and `omp-restart.js` (732,082 bytes) |
| `npm run lint` | passed (exit 0) | code standards |
| `npm run typecheck` | passed (exit 0) | all |
| `npm run schemas:check` | passed (exit 0) | Contracts and data |
| `npm run dependencies:check` | passed (exit 0) | — |
| `npm run coverage` | passed: 215 files, 1152 tests; statements 94.04%, branches 90.03%, functions 94.69%, lines 94.04%; Vitest 88.2 s, command 91 s | FR-01..FR-13, TC-01..TC-14 |
| `npm run test:budget` (standalone) | passed: "Test run: 81.6s wall (budget 120s)", exit 0 | NFR-03, TC-15 |
| `npx vitest run tests/integration/node-handoff-store.test.ts tests/integration/node-handoff-store-lock.test.ts` × 10 | 10 passed, 0 failed | TC-03 |
| Scratch stress, in process (scratchpad `cr03/claim-stress.mts`, outside the repository): 400 iterations of 2 concurrent `claim()` calls; 300 iterations of 3 | 400/400 and 300/300 delivered exactly once to an existing file; the archive holds only that file and no lock is left | FR-03, TC-03, NFR-02 (codereview_02/CR-01) |
| Scratch stress, across processes (`cr03/xproc.mjs`): 2 Node processes claiming the same 150 roots in aligned 30 ms slots | 150/150 delivered exactly once, missing = 0, no errors | FR-03, NFR-02 |
| Scratch proof (`cr03/deadline-loss.mts`): `handleSessionReset` in handoff mode with a real `NodeHandoffStore`, a ledger whose `appendResetLine` takes 200 ms, `HookDeadline(50)`, and `resolveFailure` on `DEADLINE_EXCEEDED`, as `process-hook-host.ts:55-61` and `in-process-host.ts:31-41` do | Decision returned: `{"kind":"neutral"}`. 500 ms later `handoff.md` is gone and the archive holds `20261007T203448.144Z.md` | FR-03, `techspec.md:98` (CR-01) |
| QA-01..QA-10 (`rg` per the TechSpec) | 0 new hits | Quality profile |
| `rg` sync APIs over `dist/assets/runtime/{pi,omp}-restart.js` | 0 hits | QA-06 on the shipped bundles |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Medium | FR-03, FR-02, OBJ-04, `techspec.md:98` (Errors), T03 | `src/core/services/session-reset-handler.ts:34` runs `claim()` inside the work that `HookDeadline.run` races (`src/infrastructure/runtime/hook-deadline.ts:30-37`; callers `process-hook-host.ts:56`, `in-process-host.ts:32`). When the deadline fires, the host answers through `resolveFailure` (`src/core/services/failure-policy.ts:49-57`). `deadlineBootDecision` builds only the snapshot resume text, which is `null` in handoff mode, so the answer is neutral. The abandoned promise keeps running, and `node-handoff-store.ts:39` moves `handoff.md` into the archive. The scratch proof reproduces this: neutral decision, handoff archived, nothing pending. A second path has the same effect: if `pruneArchive` throws after the rename (`node-handoff-store.ts:40`), `claim()` rejects after the move. No test makes `claim()` reject or time out | The handoff is delivered to no session, and it is no longer pending for the next start: the agent loses the recorded work. The TechSpec says a failed session start leaves the handoff pending. The trigger is a session-start hook that exceeds the default 5,000 ms (`SESSION_START_DEADLINE_MILLISECONDS`), for example a slow ledger write or a slow disk; the proof used shorter limits to force it. Deadline handling itself is unchanged since `a31e183`; the new part is that the one-time claim now sits inside the abandoned work | Cause proven: a one-time side effect runs inside work the deadline abandons, and the deadline fallback cannot report its result. The fix belongs to corrections. Options include: keep the claim from starting once the deadline has fired; or finish an in-flight claim and deliver its path (for example by letting the deadline fallback use the claim's outcome); and treat a prune failure after a successful rename as non-fatal, returning the archived path. Add a case shaped like `tests/unit/process-hook-host-deadline.test.ts` with a short `sessionStartDeadlineMilliseconds`, a slow ledger, and handoff mode, asserting the handoff is either delivered or still pending |
| CR-02 | Low | DEC-14, T09 | DEC-14: "`remove` and `--no-auto-restart` delete … the restart logs under `runtime/`". `src/cli/commands/remove.ts:37-51` adds runtime state files (`listRuntimeStateFiles`) and applies with `pruneRuntime: true`. `src/cli/commands/init.ts:39-62` has no such step, and the restart planners plan only the module file and the ignore file (`common/restart-asset-plan.ts:32-37`, `restart-install-extras.ts:34-41`). `tests/integration/init-auto-restart.test.ts:48-53` asserts only those two deletions | After `init --no-auto-restart`, `.context-brake/runtime/restart/<harness>/*.json` stays until `remove`. It is runtime state, not user content, so the effect is limited to leftover files that contradict the decision | Cause proven: the init path never plans deletion of `runtime/restart/`. Plan those files for deletion when restart is turned off, or amend DEC-14 to give the logs to `remove` only, and assert the chosen behavior in `init-auto-restart.test.ts` |
| CR-03 | Low | DEC-10, FR-10, T08 | DEC-10 gives an impact text for each state, including "Automatic restart: …". `src/infrastructure/harnesses/pi/capabilities.ts:7` declares `auto_restart: 'supported'` with no impact. Impact texts reach the profile only as limitations of non-supported capabilities (`support-service.ts:58`), so `tests/unit/harness-adapters.test.ts:34` pins Pi to `limitations: []`. The automatic text appears only as the fallback in init's `AUTO_RESTART_MODE` finding (`restart-install-extras.ts:25`) | `doctor` on Pi shows the state but no text saying restart is automatic. `init` shows it | Cause proven: the capability model carries impact text only for limitations. Either surface the automatic text in doctor (for example from the same `harnessRestartMode` helper), or amend DEC-10 to say the automatic text lives in the `AUTO_RESTART_MODE` finding |

Optional improvements (not findings):

- `NodeHandoffStore.acquire` (`node-handoff-store.ts:44-49`): two claimers that both find the same stale lock can both take it over, because one can `rm` the other's newly created lock. This needs a crashed claim plus a simultaneous double start; T14's handoff records it as accepted residual risk.
- `src/cli/handoff-findings.ts:12-14` reports `AUTO_RESTART_HANDOFF_KEPT` for `.context-brake/handoffs/` when the folder holds only a leftover `.claim.lock`.
- Oh-My-Pi has no typed-prompt, no-progress, or non-TUI stand-down case. The guards are shared code that the Pi cases exercise, and FR-09 binds verified harnesses only.
- `pi/restart.ts:44`: a synchronous throw from `api.sendUserMessage` happens before `Promise.resolve`, so `onRejected` is skipped and the guard is not rolled back. Pi's API returns a promise, so this is unlikely.
- Carried from codereview_02 and still untouched: the semi-automatic classification matches the impact prefix (`restart-install-extras.ts:10,26`); each restart bundle is about 732 KB because `systemClock` is imported from `runtime-composition.ts`; Pi shows the `/new` reset notice and also restarts automatically (UX for HIL 3); `common/restart-diagnostics.ts` swallows every `readdir` error; `doctor-remove-restart.test.ts` stays among the slow files; `tests/helpers/handoff-file.ts` makes a handoff "fresh" by setting its mtime in the future; `omp-restart-handoff.test.ts:16` labels the env-switch case TC-10.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_02/CR-01 | resolved | `node-handoff-store.ts:23-58` serializes the claim with an exclusive lock. Results: 400/400 two-claimer and 300/300 three-claimer in-process pairs, and 150/150 cross-process pairs, each delivered once to an existing file; 10/10 repeated runs of `node-handoff-store.test.ts` and `node-handoff-store-lock.test.ts`; full coverage and budget runs green |
| codereview_01/CR-01 … CR-05 | resolved (unchanged) | Code and tests unchanged since codereview_02, which recorded them resolved; the suites passed again in this review's coverage run |

## Limitations and open items

- The TechSpec and manifest hashes differ from the approved ones, as in the earlier reviews. The agent amendments (DEC-01, DEC-02, DEC-05 `MOD_VERSION`, DEC-06 host shape, `SKIP_DISABLED_ENV` wording) are pending HIL 3; this review judged against the current text. The T14 lock also changes DEC-02's mechanism and is not yet in the amendment list.
- Manual acceptance (real Pi and Oh-My-Pi sessions to `RED` with a handoff; Codex `/new`) is `not verifiable` here; the TechSpec assigns it to HIL 3.
- NFR-02: validated on Windows only. The lock uses `open(…, 'wx')` and mtime, which are portable, but Linux and macOS were not run in this review; they depend on the CI matrix.
- CR-01 was proven with a scratch script that used shorter limits (50 ms deadline, 200 ms ledger delay) than the 5,000 ms default. How often a real session start exceeds 5 s was not measured.
- What `workflow.md` should record (this delegated reviewer does not edit it): codereview_03 REJECTED; codereview_02/CR-01 resolved; new CR-01 (handoff lost when the session-start deadline expires, or when the prune fails after the rename; FR-03, `techspec.md:98`; T03 incomplete), CR-02 (DEC-14 logs on `--no-auto-restart`, Low), CR-03 (Pi automatic impact text, DEC-10, Low); correction round 3 needed; the TechSpec amendments, plus the T14 lock change to DEC-02, still go to HIL 3. NFR-03 measured at 81.6 s at 39-65% CPU.
- The scratch scripts (`claim-stress.mts`, `xproc.mjs`, `deadline-loss.mts`) and command logs live in this session's scratchpad under `cr03/`, outside the repository. Besides this report, the commands changed only `dist/`, `coverage/`, and temporary directories.
- Pre-existing, not counted as findings: OpenCode 2.x does not load the v1 plugin (DEC-HIL-04, follow-up PRD); Codex `"hooks": {}` reformatting after remove; the untracked `tasks/prd-11-…/rtk/`; `probe/` is throwaway.

## Conclusion

Correction round 2 closed codereview_02/CR-01. The handoff claim is serialized with an exclusive lock, and stress runs inside one process and across two processes show exactly one delivery, to an existing file, in every pair. Build, lint, typecheck, schemas, dependencies, the quality profile (0 new hits), coverage (1152 tests, 94.04% lines), and the test budget (81.6 s, the lowest-load run so far) are all green.

The status is REJECTED for one Medium finding in T03 code that the earlier rounds did not catch. The handoff claim runs inside work that the session-start deadline abandons. When the deadline fires, the hook answers neutral and the claim still archives the handoff, so the handoff reaches no session and is no longer pending. This contradicts FR-03 and the TechSpec's error contract (CR-01); a prune failure after the rename has the same effect. Two Low gaps are also recorded: `init --no-auto-restart` does not delete the restart logs as DEC-14 states (CR-02), and Pi's automatic-restart impact text is not shown by doctor (CR-03). Route CR-01 through CR-03 through `sdd-plan-corrections`. The HIL 3 amendment list, now including the DEC-02 lock, and the manual acceptance remain open.
