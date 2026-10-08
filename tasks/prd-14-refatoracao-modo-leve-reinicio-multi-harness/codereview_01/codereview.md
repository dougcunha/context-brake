# Code review report — prd-14-refatoracao-modo-leve-reinicio-multi-harness

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `a31e183..worktree` (HEAD = `a31e183`; the whole feature is uncommitted: 58 modified tracked files plus untracked files under `src/`, `assets/runtime/`, `tests/`, and the feature folder)
- Previous review: `—`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md` | read; sha256 `46d51574…` matches the approved hash (DEC-HIL-01) |
| TechSpec | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md` | read; sha256 `055f9ba0…` differs from the approved `be5a0c65…` (DEC-HIL-04). The difference is the appended "Implementation deviations" list (`techspec.md:230-235`) and the DEC-01 amendment, recorded in `workflow.md` Milestones as agent amendments pending HIL 3 |
| Manifest | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/tasks.md` | read; sha256 `3bd8e790…` differs from the approved `cbe22d7e…` (State and Problems sections updated during execution). Every link resolves to `done/task_NN.md`; T01-T09 checked `[x]`; DAG acyclic |
| Handoffs | `done/task_01.md` … `done/task_09.md` | read; every task has a filled Handoff section |
| Workflow and checkpoint | `workflow.md`, `checkpoint.json` | read (DEC-HIL-01..04) |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter (header, next step brief, open threads, `on-run` L-05). `git_head` = HEAD; worktree matches the header. `Decisions` and other `Learnings` not used as evidence |
| Implementation | `git diff a31e183` plus `git ls-files --others --exclude-standard` (88 TypeScript files in scope) | delimited |
| Excluded from scope | `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/` (untracked, predates the slice per `workflow.md` Milestones); `probe/` (throwaway, NFR-03) | — |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Handoff action at and above the trigger zone with restart on and no skill; nothing with restart off | `src/core/services/zone-guidance.ts:zoneAction`, `restart-mode.ts:restartMode`, `brake-engine.ts:50` | `tests/unit/zone-guidance.test.ts` (handoff mode block, exact RED block), `tests/unit/restart-mode.test.ts`, `tests/unit/telemetry-block-budget.test.ts` | conformant | Text is `save handoff to .context-brake/handoff.md, end reply with [REQUEST_SESSION_RESET]`. The PRD's content list (goal, done, next, open items) was dropped for the 60-token budget (DEC-01 amendment, pending HIL 3). FR-01 acceptance needs only the path and the marker |
| FR-02 | Next session starts with the instruction (seed or session-start) | `session-reset-handler.ts:claimHandoff`, `runtime-composition.ts:54-55`, OMP `session_switch` mapping (`oh-my-pi/events.ts`, `runtime.ts:78`) | `tests/unit/session-reset-handler.test.ts`, `tests/integration/semi-auto-restart.test.ts`, `tests/integration/omp-session-switch.test.ts` | conformant | Codex, Cursor, Copilot, Pi, and Oh-My-Pi deliver at session start. OpenCode and Antigravity have no restart mode (DEC-HIL-02, DEC-HIL-04) |
| FR-03 | One delivery, archive of N=10 | `src/infrastructure/storage/node-handoff-store.ts` | `tests/integration/node-handoff-store.test.ts` (missing, archive, suffix, limit, concurrent claims) | conformant | Reserve with `wx`, then rename; prune by name order |
| FR-04 | In handoff mode, restart requires a handoff written after the turn started; skip with a reason otherwise | `auto-restart-policy.ts:handoffCode` | `tests/unit/auto-restart-policy.test.ts:66-90`, `tests/integration/claude-mod-handoff.test.ts` | non-conformant | Fails open when the turn start is unknown (CR-01). Not exercised on the Pi and Oh-My-Pi hosts, whose simulated world runs only in snapshot mode (CR-03) |
| FR-05 | Neutral restart core; Claude mod behavior unchanged | `src/core/contracts/{restart-log,restart-host}.ts`, `core/services/{restart-flow,restart-guards}.ts`, `claude-code/mod/restart-host.ts` | `tests/unit/restart-neutrality.test.ts`, `tests/unit/restart-flow.test.ts`, existing `tests/integration/claude-mod-*.test.ts` | conformant | No `claude` in the core restart files (TC-06). PRD-11 scenarios pass in the coverage run |
| FR-06 | Probe on real installations; research updated with version and date | `docs/research/harness-integrations.md:139,158,162,179,183`; `probe/captures/*.jsonl`; fixtures | TC-08 (manual + captures) | conformant | Pi 1.0.4, Oh-My-Pi 18.8.1, OpenCode 2.0.18/2.0.24, dated 07/10/2026, Windows only |
| FR-07 | Automatic restart where both (a) and (b) were verified | Pi: `pi/restart.ts`, `assets/runtime/pi-restart.ts`, `pi/planner.ts`, `common/restart-asset-plan.ts` | `tests/integration/pi-restart.test.ts`, `tests/integration/in-process-restart-plan.test.ts`, `tests/integration/init-auto-restart.test.ts` | conformant | Only Pi passed P1-P4. Oh-My-Pi is one-Enter (DEC-19), and OpenCode is out of scope (DEC-HIL-04) |
| FR-08 | Semi-automatic restart elsewhere, resume at session start | capabilities of Codex, Cursor, Copilot, and Oh-My-Pi; `reset-notice.ts:renderResetNotice`; `oh-my-pi/restart.ts` | `tests/integration/semi-auto-restart.test.ts`, `tests/integration/omp-restart.test.ts`, `tests/unit/reset-notice.test.ts` | conformant | Antigravity is narrowed to "no restart" (DEC-HIL-02, OI-14-03) |
| FR-09 | Limit, typed-prompt reset, no-progress, env switch, non-interactive stand-down on every verified harness | `common/in-process-restart-state.ts`, `pi/restart.ts`, `oh-my-pi/restart.ts` | `tests/integration/pi-restart.test.ts` (limit, typed prompt, no-progress, non-interactive); `claude-mod-guards.test.ts:52` (env switch, Claude only) | pending | No Pi or Oh-My-Pi simulated-host test sets `CONTEXT_BRAKE_AUTO_RESTART=0` (`rg CONTEXT_BRAKE_AUTO_RESTART tests/` finds only Claude and notice tests). FR-09 acceptance names "stands down under the switch" (CR-02) |
| FR-10 | `auto_restart` state and impact text per harness | `*/capabilities.ts`; `restart-install-extras.ts:harnessRestartMode` | `tests/unit/harness-adapters.test.ts` (approved capability table) | conformant | Pi is `supported` with no impact text in the profile (supported entries carry no limitation). The automatic wording reaches the person through `AUTO_RESTART_MODE` at init and `AUTO_RESTART_READY` at doctor |
| FR-11 | Doctor per harness: ready, not loaded or outdated, last skip; codes reused | `common/restart-diagnostics.ts`, `claude-code/auto-restart-diagnostics.ts`, `core/services/restart-doctor-findings.ts`, `cli/commands/doctor.ts` | `tests/integration/doctor-remove-restart.test.ts:39-64`, `tests/integration/auto-restart-doctor.test.ts` | conformant (test gap) | Not loaded, ready, last skip, and semi-automatic ready are covered. The in-process "stale running module" case (`componentVersion` ≠ `RESTART_COMPONENT_VERSION`) is not exercised: the test log uses `1.0.0` (CR-05) |
| FR-12 | One reset detector | `reset-notice.ts:endsWithResetSignal` (`hasResetSignal` deleted); `brake-engine.ts:54`; `restart-flow.ts:44` | `tests/unit/reset-notice.test.ts:30-41`, `tests/integration/runtime-in-process.test.ts` | conformant | — |
| FR-13 | `remove` and `init --no-auto-restart` remove restart artifacts, keep handoffs, name them | `cli/handoff-findings.ts:keptHandoffFindings`, `cli/commands/{remove,init}.ts`, `restart-asset-plan.ts:planRestartRemoval`, `restart-install-extras.ts:ignoreChange` | `tests/integration/doctor-remove-restart.test.ts:66-77`, `tests/integration/init-auto-restart.test.ts:47-53` | non-conformant | `init --no-auto-restart --dry-run` does not name the kept handoffs, while `remove --dry-run` does (CR-04). The `--no-auto-restart` test asserts no kept handoffs and no `AUTO_RESTART_HANDOFF_KEPT` |
| NFR-01 | No clear without a passing gate; errors leave the session intact | `restart-flow.ts:handleTurnEnd` (rollback on rejection), `in-process-restart-support.ts:reportFailures` | `tests/unit/restart-flow.test.ts:56-80`, `tests/integration/pi-restart.test.ts:48` | non-conformant | Error paths are conformant. The unknown-turn-start path passes the handoff gate without proof of freshness (CR-01) |
| NFR-02 | Linux, macOS, Windows; no `sh`/`setsid`/server | `node:fs/promises` only; no `exec` (QA-04 clean) | CI matrix | not verifiable | Validated on Windows only in this review. Linux and macOS depend on the CI matrix, which was not run here |
| NFR-03 | New tests within the 120 s budget; probes outside `npm test` | `probe/` not in the test globs | `npm run test:budget` | conformant | 92.0 s when run on its own (123.3 s right after coverage; see optional improvements) |
| NFR-04 | Handoffs under `.context-brake/`, untracked | `restart-install-extras.ts` (`.context-brake/.gitignore`) | `tests/integration/init-auto-restart.test.ts:33` | conformant | — |
| NFR-05 | Restart off installs and injects nothing | `restart-asset-plan.ts:planRestartAsset`, `session-reset-handler.ts:claimHandoff`, `zoneAction` | `tests/integration/semi-auto-restart.test.ts:48`, `tests/integration/in-process-restart-plan.test.ts:20`, `tests/integration/pi-restart.test.ts:57` | conformant | — |
| TC-12, TC-14 | Suite names in the TechSpec | — | Implemented in `tests/integration/doctor-remove-restart.test.ts`, not in `doctor-auto-restart.test.ts` or `remove-auto-restart.test.ts` | conformant (renamed) | TC-14's "foreign content byte-identical" case is only partly covered: the Codex `hooks.json` content is compared after a parse |
| Manual acceptance | Real session per probe-passed harness to `RED` with a handoff; Codex `/new` | — | — | not verifiable | The TechSpec assigns it to the person at HIL 3 |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` / `javascript-typescript.md` | OK | `npm run lint` and `npm run typecheck` exit 0; QA-01, QA-02, QA-03, QA-09, and QA-10 clean |
| `node.md` (in-process I/O) | OK | QA-06 clean on source; `rg` over `dist/assets/runtime/{pi,omp}-restart.js` finds no sync file or process API |
| `harness-adapters.md` | OK | Research sections updated with version and date (`harness-integrations.md:139,158,179`); payloads stay in adapters (`pi/events.ts:lastAssistantText`, `oh-my-pi/events.ts:stopMessageText`) |
| `file-changes.md` | OK | Restart files are owned runtime assets with a hash check before deletion (`restart-asset-plan.ts:isModified`); the project `.gitignore` is untouched (DEC-12) |
| `cli-output.md` | OK | New findings use the existing report shape; `npm run schemas:check` exit 0 |
| `tests.md` (budget) | OK | `npm run test:budget`: 92.0 s on its own; 123.3 s under load right after coverage |
| Hexagonal layering (`AGENTS.md`) | OK | QA-05 clean; `src/core` imports no `infrastructure` or `cli` |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | TechSpec command over the 88 diff `.ts` files | 0 | OK |
| QA-02 | Suppression comments | blocking | idem | 0 | OK |
| QA-03 | Empty `catch` | blocking | idem | 0 | OK |
| QA-04 | `exec`/`execSync`/`shell: true` | blocking | idem | 0 | OK |
| QA-05 | `core` → `infrastructure`/`cli` | blocking | over `src/core/**` in the diff | 0 | OK |
| QA-06 | Sync API in process | blocking | over Pi, Oh-My-Pi, OpenCode, `common/in-process-*`, `assets/runtime/*-restart.ts`, Claude mod | 0 | OK |
| QA-07 | stdout on hook paths | blocking | over `src/{core,infrastructure}/**` in the diff | 0 | OK |
| QA-08 | Clock or randomness in `core` | reservation | over `src/core/**` in the diff | 0 | OK |
| QA-09 | 4+ parameters | reservation | idem | 0 new of 1 | pre-existing (`oh-my-pi/runtime.ts:51`, the baseline's object-type false positive) |
| QA-10 | File above 100 lines | reservation | `rg -c -H '^' … \| awk` | 0 | OK |

- Terrain baseline: applied from the TechSpec (`techspec.md:163-201`)
- Hits discounted by baseline: 1 (QA-09 at `oh-my-pi/runtime.ts:51`)
- Reservations accumulated in the feature: 0
- Suggested escalation: no trigger fired (0 reservations, no touched file above 200 lines, and two in-process restart hosts share their pieces through `common/in-process-restart-*`)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 | PARTIAL | Shortened text and positional `mode` parameter (amendment pending HIL 3, `techspec.md:231`) |
| DEC-02 | PARTIAL | `claim()` takes no date; the `Clock` is injected in the constructor (amendment pending HIL 3) |
| DEC-03 | YES | `session-reset-handler.ts:28-36`: snapshot resume first, then claim; never on `compact` |
| DEC-04 | PARTIAL | Gate order is stand-down → handoff → guards. An unknown turn start passes (CR-01), which is not in the amendment list |
| DEC-05 | PARTIAL | Log v2 under `runtime/restart/<harness>/`; `ERROR_RESTART_REJECTED`. `MOD_VERSION` not bumped (amendment pending HIL 3) |
| DEC-06 | PARTIAL | `RestartHost` shape differs (`standDown`, `turnStartedAt`, request callbacks); same responsibilities (amendment pending HIL 3) |
| DEC-07 | YES | `memoryGuardStore` keyed by root; `modGuardStore` over `$.store` |
| DEC-08 | YES | `hasResetSignal` removed; in-process fixtures flipped |
| DEC-09 | YES | `probe/README.md`, captures, research sections |
| DEC-10 | YES | Pi `supported`; Codex, Cursor, and Copilot semi-automatic texts; Antigravity and OpenCode "No restart: …" |
| DEC-11 | YES | `init-arguments.ts:assertAutoRestartTarget`, `restart-install-extras.ts:modeFinding` |
| DEC-12 | YES | `.context-brake/.gitignore` as a manifest runtime asset |
| DEC-13 | YES | `diagnoseInProcessRestart`, the shared `latestRestartLog`, and `AUTO_RESTART_HANDOFF` |
| DEC-14 | PARTIAL | Applied paths name the handoffs; the `init --no-auto-restart` dry run does not (CR-04) |
| DEC-15 | YES | Separate restart file, planned only with `autoRestart` on |
| DEC-16 | YES | Env switch in `inProcessStandDown`; `tui` mode + `hasUI` |
| DEC-17 | YES | Log contract in a new file; diagnostics moved to `common/` |
| DEC-18 | YES | `renderResetNotice(command, resumes)` |
| DEC-19, DEC-20, DEC-21 | YES | `oh-my-pi/restart.ts:prefill`; `session_switch` mapping; Pi `onOpened` before `sendUserMessage` inside `withSession` |
| Contracts and data (log v2, reason codes, finding codes) | YES | `restart-log.ts`, `auto-restart.ts:7-10`; `schemas:check` exit 0 |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | Probes, captures, research, and fixtures present |
| T02 | `done/task_02.md` | COMPLETE | DEC-01 amendment recorded |
| T03 | `done/task_03.md` | COMPLETE | Store and delivery; concurrency fix described and tested |
| T04 | `done/task_04.md` | COMPLETE | The handoff records the unknown-turn-start acceptance that CR-01 rejects |
| T05 | `done/task_05.md` | COMPLETE | The Claude mod runs on the neutral flow |
| T06 | `done/task_06.md` | INCOMPLETE | The TC-09 env-switch case and the handoff-gate cases on Pi and Oh-My-Pi are missing (CR-02, CR-03) |
| T07 | `done/task_07.md` | COMPLETE | Reduced scope per DEC-HIL-04; T07.2 and T07.3 explicitly out of scope |
| T08 | `done/task_08.md` | COMPLETE | — |
| T09 | `done/task_09.md` | INCOMPLETE | TC-15 reproduced (92.0 s); TC-12 stale-module and TC-14 `--no-auto-restart` handoff cases are missing (CR-04, CR-05) |

## Executed validations

- Profile and scope: CLI commands, process hooks, the Claude mod, and Pi and Oh-My-Pi in-process files. The e2e smoke set runs inside `npm run coverage`.
- Validated state: worktree at `a31e183` plus the uncommitted feature diff; Windows 11, Node 24.19.0. Commands ran serially in this session.
- Reused evidence: none. The handoff checks (budget 82.6 s, 1138 tests) were re-run rather than reused.
- Manual acceptance: open item for HIL 3, `not verifiable` here.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed (exit 0) | bundles `pi-restart.js` and `omp-restart.js` |
| `npm run typecheck` | passed (exit 0) | all |
| `npm run lint` | passed (exit 0) | code standards |
| `npm run schemas:check` | passed (exit 0) | Contracts and data (no schema change) |
| `npm run coverage` | passed: 212 files, 1139 tests; statements 94.08%, branches 90.01%, functions 94.67%, lines 94.08%; 116.1 s | FR-01..FR-13, TC-01..TC-14 |
| `npm run test:budget` (run 1) | failed: "Test run: 123.3s wall (budget 120s)", `TEST_BUDGET_EXCEEDED`. The new `tests/integration/doctor-remove-restart.test.ts` is among the slowest files (8.0 s) | NFR-03, TC-15 |
| `npm run test:budget` (run 2, on its own) | passed: "Test run: 92.0s wall (budget 120s)", exit 0; `doctor-remove-restart.test.ts` 7.1 s | NFR-03, TC-15 |
| `npm run dependencies:check` | passed (exit 0) | — |
| QA-01..QA-10 (`rg` per the TechSpec) | 0 new hits | Quality profile |
| `rg` sync APIs over `dist/assets/runtime/{pi,omp}-restart.js` | 0 hits | QA-06 on the shipped bundles |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Medium | FR-04, OBJ-04, NFR-01, DEC-04 | `src/core/services/auto-restart-policy.ts:20-24` `handoffCode`: `return handoff.turnStartedAt !== undefined && handoff.writtenAt < handoff.turnStartedAt ? 'SKIP_HANDOFF_STALE' : undefined;`. With `turnStartedAt` unknown, any existing `handoff.md` passes. `tests/unit/auto-restart-policy.test.ts:81` asserts this as intended. The turn start is unknown whenever the module did not see the turn begin: Claude `turnSnapshot().startedAt` before the first `turn.start` after the mod loads (`claude-code/mod/turn-state.ts:3`), and Pi or Oh-My-Pi `turnStartedAt(root)` before the first `agent_start` (`common/in-process-restart-state.ts:34`). The behavior is not in the TechSpec deviation list (`techspec.md:230-235`) | A marker reply with a stale handoff from an earlier session clears the context and seeds the agent to resume from outdated work. This contradicts OBJ-04 ("0 clears without a fresh handoff in handoff mode") and FR-04 ("Otherwise the restart is skipped with a reason") | When `required` and `turnStartedAt === undefined`, return `SKIP_HANDOFF_STALE`, or a dedicated reason after a TechSpec decision. Flip the unit case at `auto-restart-policy.test.ts:81`. Alternatively, record an explicit decision accepting fail-open at HIL 3 |
| CR-02 | Medium | FR-09, TC-09 | `tests/integration/pi-restart.test.ts:40-63` covers non-interactive stand-down, cancel, and restart off, but not `CONTEXT_BRAKE_AUTO_RESTART=0`. `rg CONTEXT_BRAKE_AUTO_RESTART tests/` finds only `claude-mod-guards.test.ts:52` and notice and docs tests. `common/in-process-restart-state.ts:inProcessStandDown` reads `process.env` | FR-09 acceptance ("each verified harness's simulated host … stands down under the switch") has no evidence on Pi, the only harness with verified automatic restart. Oh-My-Pi, which also runs the guards, has none either | Add a Pi simulated-host case (and an Oh-My-Pi one) with `CONTEXT_BRAKE_AUTO_RESTART=0` asserting `SKIP_DISABLED_ENV` and no session opened |
| CR-03 | Low | FR-04, TC-09, T06 | `tests/helpers/pi-restart-world.ts:13` always configures `snapshot.command: '/sdd-snapshot'`, so `pi-restart.test.ts` and `omp-restart.test.ts` never run in handoff mode. `rg handoff` over both suites and the helper returns nothing. The handoff gate is only exercised on Claude (`claude-mod-handoff.test.ts`) and in core units | The Pi and Oh-My-Pi wiring of `NodeHandoffStore.pendingSince` and `agent_start` turn start is untested end to end, even though `tasks.md` traces FR-04 to T06 | Add missing, stale, and fresh handoff cases to the Pi world (handoff mode: `autoRestart` on, no `snapshot.command`) |
| CR-04 | Low | FR-13, DEC-14, TC-14 | `src/cli/commands/init.ts:55-57`: the dry-run branch reports `result.findings` only, and `keptHandoffFindings` runs only on the applied path (`init.ts:63`). `remove.ts` adds it in both branches. `tests/integration/init-auto-restart.test.ts:47-53` checks deletions but not the kept handoffs or `AUTO_RESTART_HANDOFF_KEPT` | `init --no-auto-restart --dry-run` does not say where the handoffs are, which FR-13 requires of the command's output. The applied `--no-auto-restart` naming is untested | Add `keptHandoffFindings` to the dry-run report when `args.noAutoRestart`, as `remove.ts` does. Extend the `--no-auto-restart` test with a pending handoff and an archive |
| CR-05 | Low | FR-11, TC-12 | `tests/integration/doctor-remove-restart.test.ts:51` writes `componentVersion: '1.0.0'`, equal to `RESTART_COMPONENT_VERSION` (`common/in-process-restart-state.ts:10`). The version-mismatch branch of `common/restart-diagnostics.ts:logFindings` (`AUTO_RESTART_OUTDATED_MOD`) has no test. TC-12 lists "stale running module" | A regression in the in-process "outdated" finding would go unnoticed | Add a doctor case with a Pi log whose `componentVersion` differs |
Optional improvements (not findings):

- Test budget margin (NFR-03): `npm run test:budget` measured 123.3 s (failed) right after `npm run coverage`, then 92.0 s (passed) when run on its own. The run-1 failure depends on machine load, so it is not counted as a finding. The new `doctor-remove-restart.test.ts` (7-8 s, each case runs a full `init`) is among the ten slowest files and is worth trimming.

- `src/core/services/restart-install-extras.ts:22-26` classifies a harness as semi-automatic by sniffing the user-facing impact prefix `"Semi-automatic restart"` (T08's handoff already flags it). A typed field on the capability or adapter would remove the coupling.
- `src/infrastructure/harnesses/{pi,oh-my-pi}/restart.ts:4` import `systemClock` from `runtime/runtime-composition.ts`, which pulls the whole runtime composition into each restart bundle (about 731 KB each). A small clock module would keep the restart file lean.
- Pi now restarts automatically, but the telemetry extension still shows "Run /new to start a new session; it resumes by itself." on the same marker reply (`brake-engine.ts:54` checks only `newSessionCommand`; `tests/unit/reset-notice.test.ts:87`). The TechSpec flow (`techspec.md:75`) limits that notice to "Pi … before a passing probe", while DEC-18 lists Pi unconditionally. Settle the intended UX at HIL 3.
- `common/restart-diagnostics.ts:25` swallows every `readdir` error (`.catch(() => [])`), not only `ENOENT`. This is carried over from the previous Claude diagnostics.

## Limitations and open items

- The TechSpec and manifest hashes differ from the approved ones. The TechSpec amendments (DEC-01, DEC-02, DEC-05 `MOD_VERSION`, DEC-06 host shape, `SKIP_DISABLED_ENV` wording) are agent amendments pending HIL 3, and this review judged against the current text. CR-01 is a further deviation that is not on that list.
- Manual acceptance (a real Pi and Oh-My-Pi session to `RED` with a handoff; Codex `/new`) is `not verifiable` here; the TechSpec assigns it to HIL 3.
- NFR-02: validated on Windows only. Linux and macOS depend on the CI matrix, which was not run in this review.
- Pre-existing, not counted as findings: OpenCode 2.x does not load the v1 plugin (DEC-HIL-04, follow-up PRD); Codex `"hooks": {}` reformatting after remove; the untracked `tasks/prd-11-…/rtk/`; `probe/` is throwaway.
- What `workflow.md` should record (this delegated reviewer does not edit it): codereview_01 REJECTED with CR-01..CR-05; the TechSpec amendments plus CR-01 go to HIL 3.
- ContextBrake telemetry in this reviewer session reached `CRITICAL` and asked for `/sdd-snapshot` and a reset. The delegated-reviewer contract forbids writing the snapshot and running the session pause, so the review continued to completion.

## Conclusion

The implementation covers the PRD's structure well: a neutral restart core, Pi automatic restart, Oh-My-Pi one-Enter restart, semi-automatic resume on the process harnesses, doctor and remove per harness, and a clean quality profile with all builds and 1139 tests green. The status is REJECTED for three reasons:

- FR-04 and NFR-01 are non-conformant: the handoff gate fails open when the turn start is unknown (CR-01).
- FR-09's env-switch acceptance has no evidence on the verified automatic harness (CR-02).
- FR-13 is incomplete on the `init --no-auto-restart` dry run (CR-04).

CR-03 and CR-05 are test gaps on the same obligations. Route through `sdd-plan-corrections`.
