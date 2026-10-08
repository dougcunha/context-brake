# Code review report — prd-14-refatoracao-modo-leve-reinicio-multi-harness

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `a31e183..worktree` (HEAD = `a31e183`; the whole feature is uncommitted: modified tracked files plus untracked files under `src/`, `assets/runtime/`, `tests/`, and the feature folder; 159 scope files, 102 of them TypeScript)
- Previous review: `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_06/codereview.md` (REJECTED, CR-01); correction T21 in `codereview_06/done/`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md` | read; sha256 `46d51574…`, matches the approved hash (DEC-HIL-01) |
| TechSpec | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md` | read in full (240 lines); sha256 `305fea9c…` (codereview_06: `b1a8fdf2…`). The file is untracked, so no diff across reviews is possible; the change is the prd-10 FR-10 / DEC-11 deviation line at `techspec.md:240` (T21.3), as the T21 handoff states. It still differs from the approved `be5a0c65…` (DEC-HIL-04) by the agent amendments pending HIL 3 (`techspec.md:230-240`) |
| Manifest | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/tasks.md` | read; sha256 `3bd8e790…`, unchanged since codereview_05. T01-T09 `[x]`; every link resolves to `done/task_NN.md`; DAG acyclic |
| Handoffs | `done/task_01.md` … `task_09.md`; `codereview_01/done/task_10.md` … `task_13.md`; `codereview_02/done/task_14.md`; `codereview_03/done/task_15.md` … `task_17.md`; `codereview_04/done/task_18.md`; `codereview_05/done/task_19.md`, `task_20.md`; `codereview_06/done/task_21.md` | T21 read in full: Handoff filled, Work items T21.1-T21.3 checked. Earlier handoffs byte-identical to codereview_06 (hash check below). No correction manifest, as in earlier rounds |
| Workflow and checkpoint | `workflow.md`, `checkpoint.json` | read (DEC-HIL-01..05; `correction_round: 6`; `rounds_without_progress: 0`; `active_work` lists this reviewer for `codereview_07`) |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter: header, next step brief, open threads O-04, O-05, O-07, O-09, and `on-run` L-05. Under 8 KiB, read whole in one call; `Decisions` and the `on-edit` learning were not used as evidence. `git_head` = HEAD (`a31e183`); `covers_through` T21 matches `codereview_06/done/`; worktree matches the header; no suspect entries |
| Implementation | `git diff a31e183` plus `git ls-files --others --exclude-standard` | delimited. `sha256sum -c` against codereview_06's 156-file hash list (`cr06/hashes-before.txt` in the shared scratchpad) fails only for `checkpoint.json`, `checkpoint.previous.json`, `context-snapshot.md`, `techspec.md`, and `workflow.md`; the scope gained exactly `codereview_06/codereview.md`, `codereview_06/done/task_21.md`, and `tests/integration/handoff-deadline-hosts.test.ts`. `in-process-host.ts` and `process-hook-host.ts` have a newer mtime (T21.2 mutation and restore) but the same content as in codereview_06. No production file changed in round 6 |
| Excluded from scope | `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/` (untracked, predates the slice); `probe/` (throwaway, NFR-03); OpenCode 2.x load failure (DEC-HIL-04); Codex `"hooks": {}` reformatting after remove (pre-existing) | — |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Handoff action at and above the trigger zone with restart on and no skill; nothing with restart off | `restart-mode.ts`, `zone-guidance.ts`, `brake-engine.ts` | `zone-guidance.test.ts`, `restart-mode.test.ts`, `telemetry-block-budget.test.ts` | conformant | Code unchanged since codereview_06; suites green in coverage. Content list dropped for the 60-token budget (DEC-01 amendment, HIL 3) |
| FR-02 | The next session starts with the instruction and the handoff path | `session-reset-handler.ts:30-37`, `in-process-host.ts:32`, `process-hook-host.ts:84`, `node-handoff-store.ts:36-48` | `session-reset-handler.test.ts`, `semi-auto-restart.test.ts`, `omp-session-switch.test.ts`, `handoff-deadline.test.ts`, `handoff-deadline-hosts.test.ts` | conformant | Both hosts' `deadline` pass-through now has a suite guard: removing it fails the new cases (mutation runs below). codereview_06's 1,280-run host sweep (0 lost) stays valid: the code it ran is byte-identical |
| FR-03 | One delivery; the archive keeps the most recent N = 10 | `node-handoff-store.ts:42-47`, `:88-92`, `handoff-claim-lock.ts` | `node-handoff-store.test.ts`, `node-handoff-store-lock.test.ts`, `node-handoff-store-expiry.test.ts`, `handoff-deadline-hosts.test.ts:57-65` | conformant | Unchanged; the new pre-claim case asserts `claim()` resolves `null` and `handoff.md` keeps its content |
| FR-04 | Handoff gate: fresh handoff required, skip with a reason otherwise | `auto-restart-policy.ts` | `auto-restart-policy.test.ts`, `restart-flow.test.ts`, `claude-mod-handoff.test.ts`, `pi-restart-handoff.test.ts`, `omp-restart-handoff.test.ts` | conformant | Unchanged |
| FR-05 | Neutral restart core; Claude mod behavior unchanged | `core/contracts/{restart-log,restart-host,auto-restart,hook-phase}.ts`, `core/services/{restart-flow,restart-guards,auto-restart-notices}.ts`, `claude-code/mod/restart-host.ts` | `restart-neutrality.test.ts`, `restart-flow.test.ts`, `claude-mod-*.test.ts` | conformant | Unchanged |
| FR-06 | Probe on real installations; research updated | `docs/research/harness-integrations.md`, `probe/captures/`, fixtures | TC-08 (manual + captures) | conformant | Unchanged |
| FR-07 | Automatic restart where (a) and (b) were verified | `pi/planner.ts`, `common/restart-asset-plan.ts`, `pi/restart.ts`, `assets/runtime/pi-restart.ts` | `pi-restart.test.ts`, `pi-restart-handoff.test.ts`, `in-process-restart-plan.test.ts` | conformant | Unchanged. Pi only; Oh-My-Pi needs one Enter (DEC-19); OpenCode out of scope (DEC-HIL-04) |
| FR-08 | Semi-automatic restart elsewhere | capabilities of Codex, Cursor, Copilot, Oh-My-Pi; `reset-notice.ts`; `oh-my-pi/restart.ts` | `semi-auto-restart.test.ts`, `omp-restart*.test.ts`, `reset-notice.test.ts` | conformant | Unchanged; Antigravity narrowed to "no restart" (DEC-HIL-02) |
| FR-09 | Limit, typed-prompt reset, no-progress, env switch, non-interactive | `common/in-process-restart-state.ts`, `pi/restart.ts`, `oh-my-pi/restart.ts` | `pi-restart*.test.ts`, `omp-restart*.test.ts` | conformant | Unchanged |
| FR-10 | `auto_restart` state and impact text per harness | `*/capabilities.ts`, `restart-install-extras.ts`, `common/restart-diagnostics.ts` | `harness-adapters.test.ts`, `doctor-remove-restart.test.ts` | conformant | Unchanged |
| FR-11 | Doctor per harness; codes reused | `common/restart-diagnostics.ts`, `restart-doctor-findings.ts`, `cli/commands/doctor.ts` | `doctor-remove-restart.test.ts`, `auto-restart-doctor.test.ts` | conformant | Unchanged |
| FR-12 | Consistent marker detection | `reset-notice.ts:endsWithResetSignal` | `reset-notice.test.ts`, TC-07, TC-09 | conformant | Unchanged |
| FR-13 | `remove` and `init --no-auto-restart` remove restart artifacts, keep and name handoffs | `cli/handoff-findings.ts`, `cli/commands/init.ts`, `remove.ts`, `restart-install-extras.ts`, `cli/snapshot-helper.ts` | `init-auto-restart.test.ts`, `doctor-remove-restart.test.ts` | conformant | Unchanged |
| NFR-01 | No clear without a passing gate; errors leave the session intact | `restart-flow.ts` | `restart-flow.test.ts` | conformant | Unchanged |
| NFR-02 | Linux, macOS, Windows; no `sh`/`setsid`/server | `node:fs/promises` only in the store | local Windows; CI matrix | conformant (Windows) | Linux and macOS not run here (limitations) |
| NFR-03 | New tests within the 120 s budget; probes outside `npm test` | `probe/` not in the test globs | `npm run test:budget` | conformant | 74.6 s wall, exit 0, CPU 26% before and 22% after |
| NFR-04 | Handoffs under `.context-brake/`, untracked | `restart-install-extras.ts` | `init-auto-restart.test.ts` | conformant | Unchanged |
| NFR-05 | Restart off installs and injects nothing | `restart-asset-plan.ts`, `session-reset-handler.ts:35` | `semi-auto-restart.test.ts`, `in-process-restart-plan.test.ts`, `pi-restart.test.ts` | conformant | Unchanged |
| TC-02 / Errors section | A failed or timed-out session-start claim leaves the handoff pending (`techspec.md:98`) | `hook-deadline.ts:29-36`, `node-handoff-store.ts:37`, `:42-45` | `handoff-deadline.test.ts`, `handoff-deadline-hosts.test.ts`, `node-handoff-store-expiry.test.ts`, `hook-deadline.test.ts` | conformant | Unchanged code; now guarded at host level on both hosts |
| TC-03 | Concurrent claims: exactly one wins | `node-handoff-store.ts`, `handoff-claim-lock.ts` | `node-handoff-store.test.ts`, `node-handoff-store-lock.test.ts` | conformant | Unchanged; green in coverage |
| TC-09 | Per probe-passed harness: valid signal, limit, typed prompt, env switch, non-interactive | `pi/restart.ts` | `pi-restart.test.ts`, `pi-restart-handoff.test.ts` | conformant | Unchanged |
| TC-12, TC-14 | Doctor and remove suites | — | `doctor-remove-restart.test.ts`, `init-auto-restart.test.ts` | conformant (renamed) | Implemented under file names other than the ones the TechSpec lists |
| T21.1 (codereview_06/CR-01) | In-process host: deadline before the claim keeps `handoff.md` pending; deadline after the commit returns resume text naming an existing archived file. `runProcessHook`: deadline after the commit writes that text | — | `handoff-deadline-hosts.test.ts:56-82` | conformant | `createInProcessRuntime` with a handoff-mode config (`autoRestart` on, no snapshot command) and 40 ms deadlines (`:13`, `:53`); `runProcessHook` with the same config file (`:74-79`). The wrapper on `NodeHandoffStore.prototype.claim` (`:36-45`) advances fake time once the claim resolves, which is after the prune and lock release rather than during them. For the host the two are equivalent: `commit()` clears the timer and sets it `undefined` (`hook-deadline.ts:31-36`), and `extendTo` returns early on an `undefined` timer (`:38-39`), so nothing can re-arm it after the commit. The deadline timer is scheduled synchronously inside `handle` (`in-process-host.ts:31`), so `elapseDeadline()` right after `handle` starts fires it before the claim |
| T21.2 | Each case fails with its host's `deadline` pass-through removed | — | mutation runs in a scratch copy | conformant | Re-run by this review outside the repository: without `deadline` at `in-process-host.ts:32`, both in-process cases fail and the process-hook case passes; without it at `process-hook-host.ts:84`, the process-hook case fails and both in-process cases pass. Unmutated copy: 3 passed |
| T21.3 | Deviation line states the documented harness timeouts | `techspec.md:240` | — | conformant | Matches `docs/research/harness-integrations.md`: Claude Code 600 s (`:43`), Codex 600 s (`:71`), GitHub Copilot CLI 30 s (`:114`), Pi 30 s for events other than `tool_call` (`:160`), Cursor platform default undocumented (`:102`), Oh-My-Pi none documented (`:178`). Antigravity (30 s, `:190`) is omitted but has no session-start injection |
| Manual acceptance | A real session per probe-passed harness to `RED` with a handoff; Codex `/new` | — | — | not verifiable | The TechSpec assigns it to the person at HIL 3 (`techspec.md:122`) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` / `javascript-typescript.md` | OK | `npm run lint`, `npm run typecheck` exit 0. New test file is 82 lines, no comments, no blank lines inside functions, longest function under 30 lines, named constants for the deadline and the archived-path pattern |
| `node.md` (in-process I/O) | OK | QA-06 clean over the 30 in-process files and `dist/assets/runtime/{pi,omp}-restart.js` |
| `harness-adapters.md` | OK | No adapter changed since codereview_06 |
| `file-changes.md` | OK | No production change |
| `cli-output.md` | OK | No output change; `npm run schemas:check` exit 0 |
| `tests.md` (FIRST, layers, budget, lanes) | OK | Integration test against a real temp directory (`mkdtemp`, removed with retries after `vi.useRealTimers()`); fake `setTimeout`/`clearTimeout` restored and the prototype spy undone in `afterEach` (`:27-31`); no sleeps; cites FR-02, FR-03, and codereview_06 CR-01 in `describe`. It spawns no process and is not in `PROCESS_LANE_FILES`; it ran in the parallel lane. Budget 74.6 s |
| Hexagonal layering (`AGENTS.md`) | OK | QA-05 clean |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | TechSpec command over the 102 scope `.ts` files | 0 | OK |
| QA-02 | Suppression comments | blocking | idem | 0 | OK |
| QA-03 | Empty `catch` | blocking | idem | 0 | OK |
| QA-04 | `exec`/`execSync`/`shell: true` | blocking | idem | 1 new of 1 | OK, false positive: `tests/integration/handoff-deadline-hosts.test.ts:47` is `ARCHIVED_PATH.exec(text)`, `RegExp.prototype.exec`; the file imports nothing from `node:child_process` (`rg child_process` on it: no match) |
| QA-05 | `core` → `infrastructure`/`cli` | blocking | over the 17 `src/core/**` scope files | 0 | OK |
| QA-06 | Sync API in process | blocking | over the 30 in-process files plus the two built restart bundles | 0 | OK |
| QA-07 | stdout on hook paths | blocking | over the 54 `src/{core,infrastructure}/**` scope files | 0 new of 1 | pre-existing: `process-hook-host.ts:29` is the hook's response writer, same line at `a31e183` (codereview_06) |
| QA-08 | Clock or randomness in `core` | reservation | over `src/core/**` scope files | 0 | OK |
| QA-09 | 4+ parameters | reservation | idem (`--pcre2`), scope files | 0 new of 1 | pre-existing (`oh-my-pi/runtime.ts:51`, the baseline's object-type false positive) |
| QA-10 | File above 100 lines | reservation | `rg -c -H '^' … \| awk -F: '$2 > 100'` | 0 | OK |

- Terrain baseline: applied from the TechSpec (`techspec.md:163-201`); `process-hook-host.ts` is not in the baseline table, and its QA-07 hit was checked against `a31e183` in codereview_06 on byte-identical content.
- Hits discounted by baseline: 2 (QA-07 at `process-hook-host.ts:29`, QA-09 at `oh-my-pi/runtime.ts:51`)
- Reservations accumulated in the feature: 0
- Suggested escalation: no trigger fired (0 reservations; no touched file above 200 lines; no block duplicated in 3+ places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 | PARTIAL | Shortened text and positional `mode` parameter (amendment pending HIL 3, `techspec.md:231`) |
| DEC-02 | PARTIAL | Matches the T19 amendment (`techspec.md:239`): `claim(deadline?)`, peek before the move, `commit()` after it with restore on failure, then the prune that excludes the archived name. All DEC-02 amendments (T03, T14, T15, T18, T19) are pending HIL 3 |
| prd-10 FR-10 / DEC-11 amendment (`techspec.md:240`, DEC-HIL-05) | YES | Behavior unchanged; the rationale now cites only documented timeouts (T21.3) |
| DEC-03, DEC-04 | YES | Unchanged |
| DEC-05, DEC-06 | PARTIAL | `MOD_VERSION` not bumped; `RestartHost` shape differs (amendments pending HIL 3) |
| DEC-07 … DEC-21 | YES | Unchanged since codereview_05 |
| Errors, security, and recovery (`techspec.md:98`): "the handoff stays pending for the next start" | YES | New in-process pre-claim case asserts it at host level |
| Contracts and data, handoff files (`techspec.md:82`): "at most 10 files, oldest deleted by name order" | PARTIAL | The delivered one is always kept; the 11-file case after a restore that meets a newer handoff persists (optional improvement, carried) |
| Contracts and data (log v2, reason codes, finding codes) | YES | `schemas:check` exit 0 |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 … T09 | `done/task_01.md` … `task_09.md` | COMPLETE | Unchanged since codereview_06 |
| T10 … T18, T20 | `codereview_01/done/…` … `codereview_05/done/task_20.md` | COMPLETE | Unchanged |
| T19 | `codereview_05/done/task_19.md` | COMPLETE | T19.4's missing host-level guards are delivered by T21 |
| T21 | `codereview_06/done/task_21.md` | COMPLETE | Three cases green 10/10; mutation failures reproduced by this review; deviation line verified against the research doc; no production file changed (hash check) |

## Executed validations

- Profile and scope: CLI commands, process hooks, the Claude mod, and the Pi and Oh-My-Pi in-process files. The e2e smoke set runs inside `npm run coverage` and `npm run test:budget`.
- Validated state: worktree at `a31e183` plus the uncommitted feature diff and T10-T21; Windows 11 Pro 10.0.26200, Node 24.19.0. Commands ran serially in this session.
- Reused evidence: codereview_06's scratch sweep (1,280 host runs, 0 lost) and the scratch proof for codereview_05/CR-02, because every production and earlier test file is byte-identical to the state codereview_06 hashed. Every command below was re-run because the test set changed.
- Manual acceptance: open item for HIL 3; `not verifiable` here.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed (exit 0, 9.2 s) | bundles for the in-process files; L-05 prerequisite |
| `npm run lint` | passed (exit 0) | code standards |
| `npm run typecheck` | passed (exit 0) | all |
| `npm run schemas:check` | passed (exit 0) | Contracts and data |
| `npm run dependencies:check` | passed (exit 0) | — |
| `npm run coverage` | passed: 218 files, 1169 tests; statements 94.04%, branches 90.16%, functions 94.73%, lines 94.04%; Vitest 79.4 s, command 81.7 s; CPU 32% before | FR-01..FR-13, TC-01..TC-14 |
| `npm run test:budget` (standalone) | passed: "Test run: 74.6s wall (budget 120s)", exit 0; CPU 26% before, 22% after | NFR-03, TC-15 |
| `npx vitest run tests/integration/handoff-deadline-hosts.test.ts tests/integration/handoff-deadline.test.ts` × 10 | 10 passed, 0 failed (2 files, 6 tests each) | T21.1, FR-02, TC-02 |
| Mutation runs in a scratch copy (`cr07/mut/`, outside the repository; `deadline` removed from `in-process-host.ts:32`, then from `process-hook-host.ts:84`) | unmutated 3 passed; mutation A: 2 in-process cases failed, 1 passed; mutation B: process-hook case failed, 2 passed | T21.2, codereview_06/CR-01 |
| QA-01..QA-10 (`rg` per the TechSpec) | 0 real new hits (1 QA-04 false positive; 2 pre-existing) | Quality profile |
| `sha256sum -c` of codereview_06's 156-file list | only the five SDD state files differ | scope, reuse |
| `sha256sum -c` of this review's 159-file list after all commands; `git status --porcelain` against the caller's recorded status | all unchanged; identical | review integrity |

## Findings

No findings.

Optional improvements (not findings), carried from codereview_06 and untouched by T21, whose scope excluded them:

- Newer handoff at restore on a full archive (`node-handoff-store.ts:42-45`, `:78-86`): when the commit fails and a newer `handoff.md` already exists, the archived file is kept and nothing prunes, so the archive holds 11 files until the next delivered claim.
- The happy path holds an eleventh archive file between the move and the prune; a concurrent `doctor` could see 11.
- After `commit()`, the hook has no deadline until the prune and lock release finish; a hung `readdir` or `rm` blocks the session-start hook up to the harness's own timeout, which Cursor and Oh-My-Pi do not document. Accepted by DEC-HIL-05; for HIL 3.
- `restoreHandoff` copies then deletes (crash window); empty `runtime/restart/<harness>/` folders after `init --no-auto-restart`; only the Pi ready impact is asserted; the stale-lock double takeover in `acquireClaimLock` (`handoff-claim-lock.ts:17-22`); `AUTO_RESTART_HANDOFF_KEPT` for a `handoffs/` folder holding only a leftover `.claim.lock`; Oh-My-Pi has no typed-prompt, no-progress, or non-TUI stand-down case; `pi/restart.ts:44` synchronous throw skips the guard rollback; the semi-automatic classification matches the impact prefix; each restart bundle is about 732 KB; Pi shows the `/new` reset notice and also restarts automatically (UX for HIL 3); `common/restart-diagnostics.ts` swallows `readdir` and `stat` errors; `tests/helpers/handoff-file.ts` sets a future mtime; `omp-restart-handoff.test.ts:16` labels the env-switch case TC-10.
- New from this round: the QA-04 command matches `RegExp.prototype.exec`; a `\bexec\(` pattern that excludes a preceding `.` would avoid the false positive in later profiles.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_06/CR-01 | resolved | `tests/integration/handoff-deadline-hosts.test.ts` drives `createInProcessRuntime` and `runProcessHook` with a handoff-mode config and a short session-start deadline; removing either host's `deadline` pass-through fails its cases (mutation runs above) |
| codereview_05/CR-01, CR-02 | resolved (unchanged) | Code byte-identical to codereview_06, which proved both with a 1,280-run sweep and a scratch proof; suites green in coverage |
| codereview_04/CR-01 | resolved (unchanged) | `node-handoff-store-expiry.test.ts` green in coverage; code unchanged |
| codereview_03/CR-01 | resolved (unchanged) | Closed in codereview_06; the new in-process pre-claim case also guards it at host level |
| codereview_03/CR-02, CR-03 | resolved (unchanged) | Code unchanged; `init-auto-restart.test.ts` and `doctor-remove-restart.test.ts` green in coverage |
| codereview_02/CR-01 | resolved (unchanged) | Lock unchanged; lock and concurrency suites green in coverage |
| codereview_01/CR-01 … CR-05 | resolved (unchanged) | Code and tests unchanged; suites green in coverage |

## Limitations and open items

- Block count: codereview_06 had 1 (CR-01, Low). It is resolved, and this review records 0. The round reduced blocks (1 → 0).
- The TechSpec is untracked; the change since codereview_06 was identified from the T21 handoff and a full read (line 240), not from a diff.
- The TechSpec and manifest hashes differ from the approved ones, as in earlier reviews. The agent amendments (DEC-01; DEC-02 with T03, T14, T15, T18, and T19; DEC-05 `MOD_VERSION`; DEC-06 host shape; `SKIP_DISABLED_ENV` wording; the prd-10 FR-10 / DEC-11 session-start amendment) are pending HIL 3. This review judged against the current text and did not treat the pending acknowledgement as a block.
- Manual acceptance (real Pi and Oh-My-Pi sessions to `RED` with a handoff; Codex `/new`) is `not verifiable` here. The TechSpec assigns it to HIL 3.
- NFR-02: validated on Windows only. Linux and macOS depend on the CI matrix.
- The mutation check required editing production code, which the delegated-reviewer contract forbids in the worktree; it ran on a copy of `src/`, `tests/`, `assets/`, `schemas/`, `scripts/`, and the root configs in the scratchpad (`cr07/mut/`), with a junction to the repository's `node_modules`, removed afterwards.
- What `workflow.md` should record (this delegated reviewer does not edit it): codereview_07 APPROVED WITH RESERVATIONS; codereview_06/CR-01 resolved (T21 complete, mutation failures reproduced); blocks 1 → 0, `rounds_without_progress` stays 0; NFR-03 measured at 74.6 s; optional improvements carried for HIL 3, plus the QA-04 false positive on `RegExp.prototype.exec`.
- The scratch copy, hash lists, and command logs live in this session's scratchpad under `cr07/`, outside the repository. Besides this report, the commands changed only `dist/`, `coverage/`, and temporary directories.

## Conclusion

T21 adds the host-level regression guards codereview_06/CR-01 asked for. Two in-process cases cover a deadline before the claim and one after the commit. A `runProcessHook` case covers a deadline after the commit. Each fails when its host stops passing the deadline to the claim, which this review reproduced on a scratch copy. The tests are deterministic under fake timers and passed 10 of 10 repeated runs. Their "after the claim resolves" timing is equivalent to "during the prune or lock release", because `commit()` disarms the timer for good. The corrected deviation line matches the research document. No production file changed in this round, so codereview_06's sweep evidence still holds.

Build, lint, typecheck, schemas, dependencies, coverage (1169 tests, 94.04% lines), the budget run (74.6 s), and the quality profile are green. The profile has no real new hit; its one QA-04 hit is `RegExp.prototype.exec`. Every obligation is conformant, except manual acceptance, which is assigned to HIL 3, and the DEC amendments that HIL 3 must acknowledge. The status is APPROVED WITH RESERVATIONS because the optional improvements carried for HIL 3 remain.
