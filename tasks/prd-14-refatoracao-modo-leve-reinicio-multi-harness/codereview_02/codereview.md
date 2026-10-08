# Code review report — prd-14-refatoracao-modo-leve-reinicio-multi-harness

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `a31e183..worktree` (HEAD = `a31e183`; the whole feature is uncommitted: 58 modified tracked files plus untracked files under `src/`, `assets/runtime/`, `tests/`, and the feature folder; 92 TypeScript files in scope)
- Previous review: `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_01/codereview.md` (REJECTED, CR-01..CR-05); corrections T10-T13 in `codereview_01/done/`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md` | read; sha256 `46d51574…` matches the approved hash (DEC-HIL-01) |
| TechSpec | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md` | read; sha256 `055f9ba0…`, the same version codereview_01 judged. It differs from the approved `be5a0c65…` (DEC-HIL-04) only by the agent amendments pending HIL 3 (`techspec.md:230-235`) |
| Manifest | `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/tasks.md` | read; sha256 `3bd8e790…`, the same as in codereview_01. T01-T09 `[x]`, every link resolves to `done/task_NN.md`, DAG acyclic |
| Handoffs | `done/task_01.md` … `done/task_09.md`; corrections `codereview_01/done/task_10.md` … `task_13.md` | read; every task has a filled Handoff section. No correction manifest, as `sdd-plan-corrections` step 4 prescribes |
| Workflow and checkpoint | `workflow.md`, `checkpoint.json` | read (DEC-HIL-01..04; `correction_round: 1`) |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter (header, next step brief, open threads O-04, O-05, O-07, O-08, `on-run` L-05). `git_head` = HEAD; worktree matches the header. `Decisions` and other `Learnings` not used as evidence |
| Implementation | `git diff a31e183` plus `git ls-files --others --exclude-standard` | delimited. Files changed after `codereview_01/codereview.md` match the T10-T13 handoffs exactly: `src/cli/commands/init.ts`, `src/core/services/auto-restart-policy.ts`, `tests/helpers/{handoff-file,omp-restart-world}.ts`, `tests/integration/{doctor-remove-restart,init-auto-restart,omp-restart-handoff,omp-restart,pi-restart-handoff,pi-restart}.test.ts`, `tests/unit/auto-restart-policy.test.ts` |
| Excluded from scope | `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/` (untracked, predates the slice per `workflow.md` Milestones); `probe/` (throwaway, NFR-03) | — |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Handoff action at and above the trigger zone with restart on and no skill; nothing with restart off | `zone-guidance.ts:zoneAction`, `restart-mode.ts:restartMode`, `brake-engine.ts` | `tests/unit/zone-guidance.test.ts`, `restart-mode.test.ts`, `telemetry-block-budget.test.ts` | conformant | Unchanged since codereview_01; content list dropped for the 60-token budget (DEC-01 amendment, HIL 3) |
| FR-02 | Next session starts with the instruction | `session-reset-handler.ts`, `runtime-composition.ts`, Oh-My-Pi `session_switch` mapping | `session-reset-handler.test.ts`, `semi-auto-restart.test.ts`, `omp-session-switch.test.ts` | conformant | Unchanged since codereview_01 |
| FR-03 | One delivery, archive of N=10 | `src/infrastructure/storage/node-handoff-store.ts:claim` | `tests/integration/node-handoff-store.test.ts:56-64` | non-conformant | On Windows two concurrent claims both return a path, and one of the paths names a file that does not exist (CR-01). The TC-03 concurrency case failed in one of four full-suite runs in this review |
| FR-04 | Handoff gate: fresh handoff required, skip with a reason otherwise | `auto-restart-policy.ts:20-24` `handoffCode` | `tests/unit/auto-restart-policy.test.ts:66-90`, `claude-mod-handoff.test.ts`, `pi-restart-handoff.test.ts:27-49`, `omp-restart-handoff.test.ts:27-50` | conformant | An unknown turn start now returns `SKIP_HANDOFF_STALE`; missing, stale, and fresh cases run on the Claude, Pi, and Oh-My-Pi hosts |
| FR-05 | Neutral restart core; Claude mod behavior unchanged | `core/contracts/{restart-log,restart-host}.ts`, `core/services/{restart-flow,restart-guards}.ts`, `claude-code/mod/restart-host.ts` | `restart-neutrality.test.ts`, `restart-flow.test.ts`, `claude-mod-*.test.ts` | conformant | Unchanged since codereview_01; suites green |
| FR-06 | Probe on real installations; research updated | `docs/research/harness-integrations.md`, `probe/captures/`, fixtures | TC-08 (manual + captures) | conformant | Unchanged since codereview_01 |
| FR-07 | Automatic restart where both (a) and (b) were verified | `pi/restart.ts`, `assets/runtime/pi-restart.ts`, `common/restart-asset-plan.ts` | `pi-restart.test.ts`, `pi-restart-handoff.test.ts:42-48`, `in-process-restart-plan.test.ts`, `init-auto-restart.test.ts` | conformant | Pi only; Oh-My-Pi one Enter (DEC-19); OpenCode out of scope (DEC-HIL-04) |
| FR-08 | Semi-automatic restart elsewhere | capabilities of Codex, Cursor, Copilot, Oh-My-Pi; `reset-notice.ts`; `oh-my-pi/restart.ts` | `semi-auto-restart.test.ts`, `omp-restart.test.ts`, `omp-restart-handoff.test.ts:42-49` | conformant | Antigravity narrowed to "no restart" (DEC-HIL-02) |
| FR-09 | Limit, typed-prompt reset, no-progress, env switch, non-interactive on every verified harness | `common/in-process-restart-state.ts:inProcessStandDown`, `pi/restart.ts`, `oh-my-pi/restart.ts` | `pi-restart.test.ts`, `pi-restart-handoff.test.ts:16-25`, `omp-restart-handoff.test.ts:16-25`, `claude-mod-guards.test.ts:52` | conformant | `CONTEXT_BRAKE_AUTO_RESTART=0` asserts `SKIP_DISABLED_ENV` and no session or prefill on Pi and Oh-My-Pi; `vi.unstubAllEnvs` restores the environment |
| FR-10 | `auto_restart` state and impact text per harness | `*/capabilities.ts`, `restart-install-extras.ts` | `harness-adapters.test.ts` | conformant | Unchanged since codereview_01 |
| FR-11 | Doctor per harness: ready, not loaded or outdated, last skip; codes reused | `common/restart-diagnostics.ts:logFindings`, `restart-doctor-findings.ts`, `cli/commands/doctor.ts` | `doctor-remove-restart.test.ts:39-74`, `auto-restart-doctor.test.ts` | conformant | New case at `:60-66` writes `componentVersion: '0.9.0'` and expects only `AUTO_RESTART_OUTDATED_MOD`; removing the comparison at `restart-diagnostics.ts:39` would yield `AUTO_RESTART_READY` and fail it |
| FR-12 | One reset detector | `reset-notice.ts:endsWithResetSignal` | `reset-notice.test.ts`, `runtime-in-process.test.ts` | conformant | Unchanged since codereview_01 |
| FR-13 | `remove` and `init --no-auto-restart` keep and name handoffs | `cli/handoff-findings.ts:keptHandoffFindings`, `cli/commands/init.ts:54-60`, `remove.ts` | `init-auto-restart.test.ts:57-67`, `doctor-remove-restart.test.ts:76-86` | conformant | `kept` is computed before the dry-run branch and added to both reports; the test asserts the finding in dry run and applied and that `handoff.md` remains |
| NFR-01 | No clear without a passing gate; errors leave the session intact | `restart-flow.ts:handleTurnEnd`, `auto-restart-policy.ts:handoffCode` | `restart-flow.test.ts`, `auto-restart-policy.test.ts:81-83` | conformant | The unknown-turn-start path now fails closed |
| NFR-02 | Linux, macOS, Windows; no `sh`/`setsid`/server | `node:fs/promises` only; QA-04 clean | CI matrix; local Windows | non-conformant | The Windows rename race in CR-01 breaks the one-claim guarantee on Windows. Linux and macOS were not run here (see limitations) |
| NFR-03 | New tests within the 120 s budget; probes outside `npm test` | `probe/` not in the test globs | `npm run test:budget` | conformant | Standalone runs: 91.4 s (timing within budget, run failed on CR-01's test) and 85.2 s (passed, exit 0). 123.4 s when run right after `npm run coverage` with 66-88% external CPU load |
| NFR-04 | Handoffs under `.context-brake/`, untracked | `restart-install-extras.ts` | `init-auto-restart.test.ts:39` | conformant | Unchanged since codereview_01 |
| NFR-05 | Restart off installs and injects nothing | `restart-asset-plan.ts`, `session-reset-handler.ts`, `zoneAction` | `semi-auto-restart.test.ts`, `in-process-restart-plan.test.ts`, `pi-restart.test.ts` | conformant | Unchanged since codereview_01 |
| TC-03 | `NodeHandoffStore` concurrent claims: exactly one claim wins | `node-handoff-store.ts:claim` | `node-handoff-store.test.ts:56-64` | non-conformant | Intermittent failure in `npm run test:budget` run 2; 25 of 400 concurrent claim pairs in a scratch stress script both returned a path (CR-01) |
| TC-09 | Per probe-passed harness: valid signal, limit, typed prompt, env switch, non-interactive | `pi/restart.ts`, `oh-my-pi/restart.ts` | `pi-restart.test.ts`, `pi-restart-handoff.test.ts`, `omp-restart-handoff.test.ts` | conformant | The env-switch and handoff cases live in the sibling `*-restart-handoff.test.ts` files, not in the file names T11's acceptance quotes |
| TC-12, TC-14 | Doctor and remove suites | — | `doctor-remove-restart.test.ts`, `init-auto-restart.test.ts` | conformant (renamed) | Implemented under different file names than the TechSpec lists; stale-module and `--no-auto-restart` handoff cases now present |
| Manual acceptance | Real session per probe-passed harness to `RED` with a handoff; Codex `/new` | — | — | not verifiable | The TechSpec assigns it to the person at HIL 3 |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` / `javascript-typescript.md` | OK | `npm run lint` and `npm run typecheck` exit 0; QA-01, QA-02, QA-03, QA-09, QA-10 clean |
| `node.md` (in-process I/O) | OK | QA-06 clean on source; `rg` over `dist/assets/runtime/{pi,omp}-restart.js` finds no sync file or process API |
| `harness-adapters.md` | OK | No adapter changed in the correction round; research sections unchanged since codereview_01 |
| `file-changes.md` | OK | `init --no-auto-restart` never touches `handoff.md` or `handoffs/` (`init-auto-restart.test.ts:65`) |
| `cli-output.md` | OK | `AUTO_RESTART_HANDOFF_KEPT` uses the existing finding shape; `npm run schemas:check` exit 0 |
| `tests.md` (budget, isolation) | OK | `npm run test:budget` 85.2 s standalone; new suites restore `process.env` with `vi.unstubAllEnvs` and remove their temp dirs |
| Hexagonal layering (`AGENTS.md`) | OK | QA-05 clean |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | TechSpec command over the 92 diff `.ts` files | 0 | OK |
| QA-02 | Suppression comments | blocking | idem | 0 | OK |
| QA-03 | Empty `catch` | blocking | idem | 0 | OK |
| QA-04 | `exec`/`execSync`/`shell: true` | blocking | idem | 0 | OK |
| QA-05 | `core` → `infrastructure`/`cli` | blocking | over `src/core/**` in the diff | 0 | OK |
| QA-06 | Sync API in process | blocking | over Pi, Oh-My-Pi, OpenCode, `common/in-process-*`, `assets/runtime/*-restart.ts`, Claude mod; plus the two built bundles | 0 | OK |
| QA-07 | stdout on hook paths | blocking | over `src/{core,infrastructure}/**` in the diff | 0 | OK |
| QA-08 | Clock or randomness in `core` | reservation | over `src/core/**` in the diff | 0 | OK |
| QA-09 | 4+ parameters | reservation | idem (`--pcre2`) | 0 new of 1 | pre-existing (`oh-my-pi/runtime.ts:51`, the baseline's object-type false positive) |
| QA-10 | File above 100 lines | reservation | `rg -c -H '^' … \| awk -F: '$2 > 100'` | 0 | OK |

- Terrain baseline: applied from the TechSpec (`techspec.md:163-201`)
- Hits discounted by baseline: 1 (QA-09 at `oh-my-pi/runtime.ts:51`)
- Reservations accumulated in the feature: 0
- Suggested escalation: no trigger fired (0 reservations, no touched file above 200 lines; the two in-process restart hosts share their pieces through `common/in-process-restart-*`)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 | PARTIAL | Shortened text and positional `mode` parameter (amendment pending HIL 3, `techspec.md:231`) |
| DEC-02 | NO | `claim()` takes no date (amendment pending HIL 3). The stated guarantee "two sessions starting together cannot both claim (the loser gets `ENOENT` → `null`)" does not hold on Windows (CR-01) |
| DEC-03 | YES | Unchanged since codereview_01 |
| DEC-04 | YES | Gate order stand-down → handoff → guards; unknown turn start skips with `SKIP_HANDOFF_STALE`, no new reason code |
| DEC-05 | PARTIAL | `MOD_VERSION` not bumped (amendment pending HIL 3) |
| DEC-06 | PARTIAL | `RestartHost` shape differs; same responsibilities (amendment pending HIL 3) |
| DEC-07, DEC-08, DEC-09, DEC-10, DEC-11, DEC-12, DEC-13 | YES | Unchanged since codereview_01 |
| DEC-14 | YES | `init --no-auto-restart` names kept handoffs in dry run and applied (`init.ts:54-60`) |
| DEC-15, DEC-16, DEC-17, DEC-18 | YES | Unchanged since codereview_01; DEC-16 env switch now tested on Pi and Oh-My-Pi |
| DEC-19, DEC-20, DEC-21 | YES | Unchanged since codereview_01; DEC-19 prefill exercised in handoff mode (`omp-restart-handoff.test.ts:42-49`) |
| Contracts and data (log v2, reason codes, finding codes) | YES | `schemas:check` exit 0; no new reason code for the fail-closed path |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | Unchanged since codereview_01 |
| T02 | `done/task_02.md` | COMPLETE | Unchanged since codereview_01 |
| T03 | `done/task_03.md` | INCOMPLETE | The handoff says the Windows concurrent-claim race was fixed with an exclusive name reservation; the race persists through a different path (CR-01) |
| T04 | `done/task_04.md` | COMPLETE | The fail-open acceptance it recorded is reversed by T10 |
| T05 | `done/task_05.md` | COMPLETE | Unchanged since codereview_01 |
| T06 | `done/task_06.md` | COMPLETE | Gaps closed by T11 |
| T07 | `done/task_07.md` | COMPLETE | Reduced scope per DEC-HIL-04 |
| T08 | `done/task_08.md` | COMPLETE | Unchanged since codereview_01 |
| T09 | `done/task_09.md` | COMPLETE | Gaps closed by T12 and T13; TC-15 re-measured at 85.2 s |
| T10 | `codereview_01/done/task_10.md` | COMPLETE | `auto-restart-policy.ts:23`; unit case flipped at `auto-restart-policy.test.ts:81-83`; Claude mod suites green |
| T11 | `codereview_01/done/task_11.md` | COMPLETE | Cases in new `pi-restart-handoff.test.ts` and `omp-restart-handoff.test.ts`, shared `omp-restart-world.ts` and `handoff-file.ts` helpers. Deviation, recorded in its own handoff: the acceptance `rg` names `pi-restart.test.ts`/`omp-restart.test.ts`; the obligation (FR-09, FR-04 evidence) is met in the sibling files. Five-tick waits replaced with `vi.waitFor` in the cancel and busy-editor cases |
| T12 | `codereview_01/done/task_12.md` | COMPLETE | `init.ts:54-60`; `init-auto-restart.test.ts:57-67` |
| T13 | `codereview_01/done/task_13.md` | COMPLETE | `doctor-remove-restart.test.ts:60-66` |

## Executed validations

- Profile and scope: CLI commands, process hooks, the Claude mod, and Pi and Oh-My-Pi in-process files. The e2e smoke set runs inside `npm run coverage` and `npm run test:budget`.
- Validated state: worktree at `a31e183` plus the uncommitted feature diff and T10-T13; Windows 11, Node 24.19.0. Commands ran serially in this session. CPU load from external processes sampled at 66-88% before the coverage run and 20-57% around the standalone budget runs.
- Reused evidence: none. codereview_01's timings ran on different code (T11 and T13 added suites and cases), so every command was re-run.
- Manual acceptance: open item for HIL 3, `not verifiable` here.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed (exit 0) | bundles `pi-restart.js` and `omp-restart.js` |
| `npm run lint` | passed (exit 0) | code standards |
| `npm run typecheck` | passed (exit 0) | all |
| `npm run schemas:check` | passed (exit 0) | Contracts and data |
| `npm run dependencies:check` | passed (exit 0) | — |
| `npm run coverage` | passed: 214 files, 1149 tests; statements 94.08%, branches 90.08%, functions 94.67%, lines 94.08%; 200.1 s under 66-88% external CPU load | FR-01..FR-13, TC-01..TC-14 |
| `npm run test:budget` (run 1, right after coverage) | failed: "Test run: 123.4s wall (budget 120s)", `TEST_BUDGET_EXCEEDED`, under external load | NFR-03, TC-15 |
| `npm run test:budget` (run 2, standalone) | failed: "Test run: 91.4s wall (budget 120s)", then `TEST_RUN_FAILED`: `tests/integration/node-handoff-store.test.ts > … lets only one of two concurrent claims deliver the handoff` | NFR-03, TC-03 (CR-01) |
| `npm run test:budget` (run 3, standalone) | passed: "Test run: 85.2s wall (budget 120s)", exit 0; `doctor-remove-restart.test.ts` 6.9 s | NFR-03, TC-15 |
| `npx vitest run tests/integration/node-handoff-store.test.ts` × 12 | 12 passed | TC-03 (the race rarely fires with one pair per run) |
| Scratch stress script (scratchpad, outside the repository): 400 iterations of two concurrent `new NodeHandoffStore(root, clock).claim()` on a fresh temp dir | 375 × one delivery; 25 × both claims fulfilled with a path, one archived file. Sample: `[".context-brake/handoffs/20261007T120000.000Z-1.md", ".context-brake/handoffs/20261007T120000.000Z.md"]`, archive holds only `20261007T120000.000Z-1.md` | FR-03, TC-03, NFR-02 (CR-01) |
| QA-01..QA-10 (`rg` per the TechSpec) | 0 new hits | Quality profile |
| `rg` sync APIs over `dist/assets/runtime/{pi,omp}-restart.js` | 0 hits | QA-06 on the shipped bundles |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Medium | FR-03, TC-03, DEC-02, NFR-02 | `src/infrastructure/storage/node-handoff-store.ts:21-29,49-58` — `claim` reserves a distinct name per claimer (`X` and `X-1`) and then calls `rename(handoff.md, reserved)`. On Windows, two concurrent claims both fulfil: one returns `…/20261007T120000.000Z.md`, which does not exist, and the other returns `…-1.md`, which holds the handoff (25 of 400 stress pairs). The file ends at the second claimer's name, which is consistent with both renames opening the source before the first rename completes, so the second moves the already-renamed file instead of failing with `ENOENT`. `tests/integration/node-handoff-store.test.ts:56-64` asserts exactly one delivery and failed in `npm run test:budget` run 2 | Two session starts in the same project at the same moment both receive a resume instruction, and one points the agent to a missing file. FR-03 ("delivered to one new session only") and DEC-02's guarantee do not hold on Windows, and TC-03 is a flaky mandatory test on Windows CI | Cause proven: the rename alone does not exclude a second claimer on Windows. Serialize the claim, for example with an exclusive lock file created with `open(…, 'wx')` around the stat and rename, with the loser returning `null` and a stale-lock limit so a crashed claimer does not block delivery forever. Keep the TC-03 case and add a repeated variant (many pairs per run) so the race shows up in one run |

Optional improvements (not findings), carried from codereview_01 and untouched by T10-T13:

- `src/core/services/restart-install-extras.ts` still classifies a harness as semi-automatic by matching the impact prefix `"Semi-automatic restart"`; a typed field would remove the coupling.
- `src/infrastructure/harnesses/{pi,oh-my-pi}/restart.ts:4` import `systemClock` from `runtime/runtime-composition.ts`, so each restart bundle is about 731 KB (`dist/assets/runtime/{pi,omp}-restart.js`: 730,996 and 731,276 bytes).
- On Pi, which now restarts automatically, the telemetry extension still shows the `/new` reset notice on the same marker reply; settle the intended UX at HIL 3 (`techspec.md:75` versus DEC-18).
- `common/restart-diagnostics.ts:25` swallows every `readdir` error, not only `ENOENT`.
- `tests/integration/doctor-remove-restart.test.ts` (6.7-10.7 s across runs) runs a full `init` per case and stays among the slowest files.
- `tests/helpers/handoff-file.ts` makes the "fresh" handoff by setting its mtime 60 s in the future rather than writing it after `agent_start`; the gate result is the same, but the case does not reproduce the real write order.
- `omp-restart-handoff.test.ts:16` labels the Oh-My-Pi env-switch case TC-10; TC-09 is the guard-and-switch case.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_01/CR-01 | resolved | `src/core/services/auto-restart-policy.ts:23` returns `SKIP_HANDOFF_STALE` when `turnStartedAt === undefined`; `tests/unit/auto-restart-policy.test.ts:81-83` asserts it; no new reason code |
| codereview_01/CR-02 | resolved | `tests/integration/pi-restart-handoff.test.ts:16-25` and `omp-restart-handoff.test.ts:16-25` assert `SKIP_DISABLED_ENV` with no session or prefill under `CONTEXT_BRAKE_AUTO_RESTART=0` |
| codereview_01/CR-03 | resolved | `pi-restart-handoff.test.ts:27-49` and `omp-restart-handoff.test.ts:27-50` cover missing, stale, and fresh handoffs in handoff mode (`snapshot` without `command`) |
| codereview_01/CR-04 | resolved | `src/cli/commands/init.ts:54-60` adds `keptHandoffFindings` to the dry-run and applied reports; `tests/integration/init-auto-restart.test.ts:57-67` |
| codereview_01/CR-05 | resolved | `tests/integration/doctor-remove-restart.test.ts:60-66` expects only `AUTO_RESTART_OUTDATED_MOD` for a Pi log with `componentVersion: '0.9.0'` |

## Limitations and open items

- The TechSpec and manifest hashes differ from the approved ones, as in codereview_01. The agent amendments (DEC-01, DEC-02, DEC-05 `MOD_VERSION`, DEC-06 host shape, `SKIP_DISABLED_ENV` wording) are pending HIL 3; this review judged against the current text. The CR-01 fix of codereview_01 reuses `SKIP_HANDOFF_STALE` and needs no amendment.
- Manual acceptance (a real Pi and Oh-My-Pi session to `RED` with a handoff; Codex `/new`) is `not verifiable` here; the TechSpec assigns it to HIL 3.
- NFR-02: validated on Windows only. Linux and macOS depend on the CI matrix, which was not run in this review. CR-01 is a Windows rename behavior; POSIX `rename(2)` is expected to give the loser `ENOENT`, but that was not run here.
- NFR-03 (O-08): the machine could not be measured idle; external processes kept CPU load at 20-88% during this review. Two standalone budget runs measured 91.4 s and 85.2 s; the 123.4 s run followed `npm run coverage` under heavy external load.
- Pre-existing, not counted as findings: OpenCode 2.x does not load the v1 plugin (DEC-HIL-04, follow-up PRD); Codex `"hooks": {}` reformatting after remove; the untracked `tasks/prd-11-…/rtk/`; `probe/` is throwaway.
- What `workflow.md` should record (this delegated reviewer does not edit it): codereview_02 REJECTED with CR-01 (Windows concurrent-claim race in `NodeHandoffStore`, FR-03/TC-03); codereview_01 CR-01..CR-05 resolved; correction round 2 needed; the TechSpec amendments still go to HIL 3.
- ContextBrake telemetry in this reviewer session reached `RED` and asked for `/sdd-snapshot` and a reset after the report was written. The delegated-reviewer contract forbids writing the snapshot and running the session pause, so neither was done.
- The stress script used for CR-01 lives in this session's scratchpad (`claim-race.mts`), outside the repository; nothing in the worktree was changed besides `dist/`, `coverage/`, and this report.

## Conclusion

The correction round closed all five findings of codereview_01. The handoff gate now fails closed, Pi and Oh-My-Pi have env-switch and handoff-gate evidence, `init --no-auto-restart` names kept handoffs in both modes, and doctor's outdated in-process module case is tested. Build, lint, typecheck, schemas, dependencies, the quality profile, and coverage (1149 tests) are green, and the test budget passes standalone at 85.2 s.

The status is REJECTED for one new finding in code from the first round (T03). On Windows, two concurrent handoff claims can both succeed, so FR-03's one-delivery guarantee and DEC-02's atomicity claim do not hold there (CR-01). The mandatory TC-03 case fails intermittently: once in four full runs here, and in 25 of 400 stressed pairs. Route CR-01 through `sdd-plan-corrections`. The HIL 3 amendment list and manual acceptance remain open as before.
