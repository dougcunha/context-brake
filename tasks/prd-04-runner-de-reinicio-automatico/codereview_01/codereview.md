# Code review report — prd-04-runner-de-reinicio-automatico

## Summary

- Status: REJECTED
- Git scope: `eb2f386..worktree`. The T01–T09 changes are all uncommitted: 17 modified tracked files, plus the new files under `src/`, `tests/`, `schemas/`, and this feature folder. `.agents/scheduled_tasks.lock` is excluded as a pre-existing unrelated change (`workflow.md#Baseline and pre-existing changes`).
- Previous review: —

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-04-runner-de-reinicio-automatico/prd.md` | read; sha256 `1f5342…` matches `DEC-HIL-01` |
| TechSpec | `tasks/prd-04-runner-de-reinicio-automatico/techspec.md` | read; sha256 `fd61d7…` matches `DEC-HIL-02` |
| Manifest | `tasks/prd-04-runner-de-reinicio-automatico/tasks.md` | read. The hash differs from the `DEC-HIL-02` record because execution updated `State` and `Problems and solutions`. The DAG, traceability, and task links are unchanged. |
| Implementation | `git diff eb2f386` plus untracked files (127 TypeScript and `.mjs` files in `src/`, `tests/`, and `scripts/`), and the handoffs `done/task_01.md`–`done/task_09.md` | delimited |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF1 | `run` opens sessions through a documented non-interactive mode | `infrastructure/harnesses/{claude-code,codex-cli}/session-launcher.ts`, `runner/harness-session-process.ts`, `core/services/run-session.ts` | TC-14, TC-19, TC-20 | conformant | Constant argv (`-p --output-format stream-json --verbose`; `exec --json -`), prompt on stdin, e2e runs on both harnesses |
| RF2 | Each session starts with the boot | Boot comes from the installed `SessionStart` hook (DEC-03); `run-system-ports.ts:RuntimeBootTokenEstimator` | `e2e-run-steps.test.ts:28` | conformant | The journal shows `additionalContext` in all 4 sessions |
| RF3 | End the session on the signal, the critical ceiling, or harness exit | `session-watch.ts:31-45`, `reset-notice.ts:3` | TC-10, TC-23 | non-conformant (CR-01) | Critical ceiling and harness exit are conformant. The signal is recognized only when it is the whole final message, but the prompt asks the agent to end its message with it. |
| RF4 | Advance only after a runner-run validation passes | `run-step.ts:41-77`, `session-evaluation.ts:30-39` | TC-02, TC-20 | conformant | `e2e-run-steps.test.ts:22` shows the sequence passed / failed / passed / passed |
| RF5 | Correct unvalidated completions and record them | `session-evaluation.ts:30-55` | TC-03, TC-20 | conformant | `e2e-run-steps.test.ts:49` shows the `COMPLETED→IN_PROGRESS` correction in the log |
| RF6 | Succeed when every step is complete and validated | `run-loop.ts:59-62` | TC-01, TC-20 | conformant | Exit 0 with 3/3 steps |
| RF7 | Session, duration, and token ceilings | `run-limits.ts`, `session-watch.ts:31-37` | TC-05, TC-21 | conformant, with an objective gap (CR-05) | The 5-session cap exits 3. Total duration can be exceeded by the post-session validation. |
| RF8 | Anti-loop stop for a human decision | `run-limits.ts:21-44`, `run-tracker.ts:28` | TC-04, TC-21 | conformant | Exit 4 `repeated_failure`, naming the step and the output tail |
| RF9 | Stop on a session with no checkpoint and no signal, preserving state | `session-evaluation.ts:23-28`, `run-step.ts:31-39` | TC-06, TC-21 | conformant as specified; affected by CR-01 | Plan and checkpoint bytes are unchanged (`e2e-run-stops.test.ts:43-51`) |
| RF10 | Validation timeout | `shell-validation-executor.ts:49,62-64` | TC-11, TC-21 | conformant | `timed_out` twice, then exit 4 |
| RF11 | Step approval mode | `run-loop.ts:64-66`, `run-prompts.ts:49-60` | TC-09, TC-24 | conformant | Exit 4 `step_not_approved` without a TTY |
| RF12 | Clean interrupt with valid state and no harness processes | `shutdown.ts`, `run-lifecycle.ts:23-52`, `harness-session-process.ts:35-84` | TC-22 (POSIX only), `shutdown.test.ts`, `run-command-interrupt.test.ts` | non-conformant (CR-02); POSIX end-to-end not verifiable locally | The tree kill is skipped when the harness leader exits during the grace period |
| RF13 | Resume from the pending step | `run-loop.ts:39-43`, `run-lifecycle.ts:54-59` | TC-22, resume-after-stop case | conformant (Windows: resume-after-stop) | `resumedFrom` is linked, and the run resumes at step 2 |
| RF14 | Confirm commands on the first run and on change | `run-approvals.ts`, `run-step.ts:44-45`, `run-prompts.ts:34-47`, `node-approval-store.ts` | TC-07, TC-13, TC-19 | conformant | The unapproved non-TTY run exits 2, the marker file is absent, and the approvals live in the git-ignored runtime directory |
| RF15 | Harness permission modes untouched by default | launchers, `run.ts:21,31` | TC-17 | conformant | No permission flag by default, and the notice is printed |
| RF16 | `wrap` attaches the session telemetry | `commands/wrap.ts`, `runner/wrap-telemetry.ts` | TC-16, TC-24 | conformant | The block follows the command output on both harnesses |
| RF17 | Per-session local record | `session-record.ts`, `node-run-store.ts` | TC-12, TC-18 | conformant; record quality affected by CR-01 and CR-04 | The lines validate and carry no content fields |
| RF18 | Summary in text and JSON | `run-summary.ts`, `run-text.ts`, `schemas/run-summary.schema.json` | TC-18 | conformant | One JSON document, valid against the schema |
| CA-01 | 3 validated steps, success | — | TC-20 | conformant | `e2e-run-steps.test.ts:17-24` |
| CA-02 | The failed step repeats with the validation result | — | TC-02, TC-20 | conformant | `e2e-run-steps.test.ts:36-44` |
| CA-03 | False completion reverted and recorded | — | TC-03, TC-20 | conformant | `e2e-run-steps.test.ts:46-51` |
| CA-04 | Stop after 2 failures with the step, output, and exit code | — | TC-04, TC-21 | conformant | `e2e-run-stops.test.ts:13-24` |
| CA-05 | No 6th session with a cap of 5 | — | TC-05, TC-21 | conformant | `e2e-run-stops.test.ts:26-36` |
| CA-06 | No checkpoint and no signal: stop, state kept | — | TC-06, TC-21 | conformant | `e2e-run-stops.test.ts:38-51` |
| CA-07 | Timed-out validation counts as a failure | — | TC-11, TC-21 | conformant | `e2e-run-stops.test.ts:53-63` |
| CA-08 | Approval mode waits before the next session | — | TC-09, TC-24 | conformant | T09 handoff; `e2e-run-approval-wrap.test.ts` |
| CA-09 | Ctrl+C leaves no harness process; `run` resumes | — | TC-22 | not verifiable locally (POSIX-only case skipped on Windows); code gap CR-02 | The Windows fallbacks planned by the TechSpec pass |
| CA-10 | Never-run plan without confirmation: nothing executes, commands listed | — | TC-07, TC-19 | conformant | `e2e-run-preflight.test.ts` |
| CA-11 | Default permission mode | — | TC-17 | conformant | `e2e-run-harness-args.test.ts` |
| CA-12 | `wrap` output carries the session block | — | TC-16, TC-24 | conformant | T09 handoff; `e2e-run-approval-wrap.test.ts` |
| CA-13 | Log and JSON summary carry duration, end reason, step, validation, and tokens with their source | — | TC-18 | conformant | `e2e-run-summary.test.ts` |
| CA-14 | 20×10 autonomy runs | — | TC-23 | conformant | 20/20 runs exit 0 (this review's coverage run) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (no content in logs) | OK | `runSessionLineSchema` is strict. `appendSession` rejects content fields (`node-run-store.ts:43-49`). |
| `javascript-typescript.md` / ESLint limits | OK | `npm run lint` reports only the 14 baseline errors. No source file is above 100 lines. |
| `node.md` Child Processes: argv spawn, shell only for validation | OK | QA-04 hits only `shell-validation-executor.ts:29` (DEC-11) |
| `node.md` Child Processes: timeout on every child | NOT OK (disclosed, OI-01) | `passthrough-process.ts:21` spawns the `wrap` child without a timeout (T06 open item 4) |
| `node.md` Shutdown | PARTIAL (CR-02) | One signal registration and no second shutdown (`shutdown.ts:27-37`). The children are not always all stopped (`harness-session-process.ts:81`). |
| `cli-output.md` | OK | No prompt without a TTY (`run-prompts.ts:41,55`), a flag for every confirmation, one JSON document on stdout, named exit codes (`exit-codes.ts:1`), no color codes |
| `file-changes.md` | OK | The plan is written atomically only in reconciliation (`run-step.ts:67`). The restore keeps the invalid copy (`state-snapshots.ts:28`). The approvals file is renamed and never overwritten when invalid. |
| `harness-adapters.md` | OK | Stream payloads stay in the harness folders. The research section was updated with a dated "Modo não interativo" line per harness (`docs/research/harness-integrations.md`). |
| `tests.md` | OK | E2E runs the built CLI on fixture repositories with a sealed `PATH` and a real-harness guard (`tests/helpers/run-project.ts`) |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | TechSpec regex over 127 files | 0 | OK |
| QA-02 | `@ts-ignore` / `eslint-disable` | blocking | TechSpec regex | 0 | OK |
| QA-03 | Empty `catch` | blocking | TechSpec regex | 0 | OK |
| QA-04 | `exec` / `shell: true` | blocking | TechSpec regex | 1 of 1 | justified by `DEC-11` (`shell-validation-executor.ts:29`) |
| QA-05 | `core` importing `infrastructure` or `cli` | blocking | TechSpec regex over 25 `src/core` files | 0 | OK |
| QA-06 | `throw new Error(` | reservation | TechSpec regex | 1 new of 10 | 1 new hit, a test double (`tests/integration/node-ledger-watcher.test.ts:59`). The 9 `scripts/check-package.ts` / `check-schemas.ts` hits sit on unchanged lines and are pre-existing. |
| QA-07 | Clock or randomness in `core` | reservation | TechSpec regex | 0 | OK |
| QA-08 | 4+ parameters; file above 100 lines | reservation | TechSpec regex and line count | 2 regex matches, 0 files | Both matches are false positives (`tests/e2e/cli-runner.ts:10` has 3 parameters; `tests/integration/run-plan-reader.test.ts:41` has 1 destructured parameter). `harness-session-process.ts` is exactly 100 lines. |

- Terrain baseline: applied from the TechSpec. It records no QA-01–QA-07 hits in the touched `src` files. The prior-debt `scripts/` QA-06 lines are excluded, since the diff does not touch them.
- Hits discounted by baseline: 9 (QA-06, `scripts/`)
- Reservations accumulated in the feature: 1
- Suggested escalation: `no trigger fired` (1 reservation against a threshold of 8, no touched file above 200 lines, no block duplicated 3+ times)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 | YES | `run-ports.ts` `SessionLauncher`. Stream schemas are non-strict per harness folder. |
| DEC-02 | YES | `launcher-registry.ts:12-24`; TC-19 `--harness cursor` exits 2 |
| DEC-03 | YES | `runner-prompt.ts` renders the TechSpec text exactly. Boot tokens are `estimated`. |
| DEC-04 | YES | `executable-command.ts:20-29`; forbidden characters raise `INVALID_ARGUMENTS` (exit 64, disclosed in T08 open item 3) |
| DEC-05 | PARTIAL | The end reasons and the 10 s grace are implemented. The tree kill after the grace is skipped when the leader exits (CR-02). The exact-match signal is implemented as specified, but it conflicts with the prompt text (CR-01). |
| DEC-06 | PARTIAL | 1 s polling and critical grace (`session-watch.ts:81-85`). There is no final reading at session end (CR-04). |
| DEC-07 | YES | `session-evaluation.ts`, `run-step.ts` (order: gate, then validation, then reconciliation) |
| DEC-08 | YES | `runner-configuration.ts`. Flags are validated against the schema (`run-arguments.ts:56-61`). |
| DEC-09 | YES | `run-limits.ts:46-57`. Validation time is outside the deadline (CR-05). |
| DEC-10 | YES | Hash of `(taskId, stepId, command)`. Approvals are stored in the runtime directory. A changed command is re-listed. |
| DEC-11 | YES | `shell-validation-executor.ts` (16 KiB tail, tree kill on timeout) |
| DEC-12 | YES | `shutdown.ts`, `run-lifecycle.ts:23-52`, `state-snapshots.ts:23-31` |
| DEC-13 | YES | `node-run-lock.ts` |
| DEC-14 | YES | `run-records.ts`, `node-run-store.ts` (retention 20) |
| DEC-15 | YES | `run-summary.ts`. `sessionCount` / `sessions` is disclosed in T01 open item 1. |
| DEC-16 | YES | `run.ts:36-42` |
| DEC-17 | YES | `run-prompts.ts:49-60` |
| DEC-18 | YES | `--harness-arg` pass-through, the notice, and `harnessArgs` in the summary |
| DEC-19 | YES | `wrap.ts`, `wrap-telemetry.ts`. The subdirectory lookup is disclosed in T06 open item 2. |
| DEC-20 | YES | `session-zone.ts`. `brake-engine.ts` is at 84 lines, and its tests are unchanged (`git diff` is empty for `tests/unit/brake-*.test.ts`). |
| DEC-21 | YES | `run-plan-reader.ts`, `commands/run-preflight.ts` |
| DEC-22 | YES | `tests/support/fake-harness/` on a sealed `PATH` |
| Observability: `streamParseErrors` in the session line | NO | CR-03 |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | Contracts, configuration, exit codes, and the summary schema. `schemas:check` passes. |
| T02 | `done/task_02.md` | COMPLETE | Evaluation and limits, at 100% coverage |
| T03 | `done/task_03.md` | COMPLETE | Preflight, hashes, and the prompt (717 of 800 tokens with the reference tail) |
| T04 | `done/task_04.md` | COMPLETE | The loop over ports. The file split is disclosed under CMP-08. |
| T05 | `done/task_05.md` | COMPLETE | The executor, store, approvals, and lock |
| T06 | `done/task_06.md` | COMPLETE | The zone extraction, watcher, and `wrap`. The missing timeout is disclosed (OI-01). |
| T07 | `done/task_07.md` | COMPLETE | The session process and launchers. The Codex stdin was rechecked. The research doc was updated. |
| T08 | `done/task_08.md` | COMPLETE | The `run` command. The incident is disclosed (see limitations). |
| T09 | `done/task_09.md` | COMPLETE | TC-20–TC-24. The O-05 observation is judged here as CR-04. |

All nine links in `tasks.md` resolve to `done/`. `State` marks all nine as done, which matches the DAG order recorded in `workflow.md`.

## Executed validations

- Profile and scope: CLI commands `run` and `wrap`. End-to-end tests run the built CLI against fixture repositories with the fake harness on a sealed `PATH`. No real harness, network, or credentials were used.
- Validated state: `eb2f386` plus the uncommitted T01–T09 worktree, as found at the start of this review. Windows 11, Git Bash, Node v24.19.0. This review changed no code.
- Reused evidence: none for the gate. Every command below ran in this review session, serialized.
- Manual acceptance: optional per the TechSpec, owned by the user, and not run.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | CMP-26, package |
| `npm run typecheck` | passed | all |
| `npm run lint` | failed with the 14 baseline errors only (`tasks/prd-03-plano-checkpoint-e-boot/qa_01/evidence/*.mjs`); none new | code standards |
| `npm run schemas:check` | passed | DEC-08, DEC-15 |
| `npm run dependencies:check` | passed | package |
| `npm run package:smoke` | passed | CMP-26 |
| `npm run coverage` | passed: 219 files; 1,361 tests pass, 1 skipped (TC-22 SIGINT on Windows); 94.81% lines, 89.67% branches | TC-01–TC-24 |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Medium | RF3, RF9, RF17; DEC-03 vs DEC-05 | `src/core/services/runner-prompt.ts:19` tells the agent to "end your final message with [REQUEST_SESSION_RESET]". `src/core/services/reset-notice.ts:4` (`hasResetSignal`) matches only when the whole trimmed final text equals the signal, and `session-watch.ts:78` uses that check. The protocol (`docs/context-brake-protocol.md:17`) also says "End the response with". The fake harness always sends the bare signal (`tests/support/fake-harness/fake-harness.mjs:24`), so no test covers a message that ends with it. | A real agent that follows the prompt writes a summary followed by the signal, and the runner does not recognize it. That session ends as `harness_exit`, which has three effects. The recorded end reason is wrong (RF17 calibration). The session is stopped as `no_checkpoint` when the checkpoint is not fresh, even though the agent emitted the signal (RF9 applies only without the signal). The 10 s wait for exit after the signal never applies. | The cause is proven, but DEC-05 and TC-10 prescribe the exact match, so the fix changes a contract. Take it to exception HIL, with two options. (a) Recognize the signal as the final message's last non-blank line, updating DEC-05 and TC-10 and adding a fake-harness scenario with text before the signal. (b) Change the prompt contract (DEC-03) to require the signal as the whole final message. Option (a) matches the protocol wording. |
| CR-02 | Medium | RF12, CA-09, DEC-05, `node.md` Shutdown | `src/infrastructure/runner/harness-session-process.ts:78-83`: on POSIX, `terminate` sends SIGINT to the process group and returns as soon as the leader exits within the grace period, without killing the rest of the group. `stop()` (line 38) also skips termination when the leader has already exited. DEC-05 says the runner kills the process tree after the grace period. | A group member that handles or ignores SIGINT (for example, a tool subprocess the agent started) outlives the harness leader. After Ctrl+C or a forced end, harness processes are left behind, which is the outcome RF12 and CA-09 forbid. The fake harness grandchild dies on SIGINT, so TC-15 and TC-22 do not exercise this. The effect was not reproduced locally, because the path is POSIX-only (PI-03). | After the grace race, and also when the leader has already exited, send `SIGKILL` to the group `-pid` on POSIX, treating `ESRCH` as done. Add a TC-15 case with a grandchild that ignores SIGINT, which runs on POSIX CI. On Windows, a leader that has already exited cannot be tree-killed by pid; record that as a platform limit. |
| CR-03 | Low | TechSpec "Observability and rollout" and the "vendor stream drift" risk mitigation | `HarnessSessionExit.unparsedLines` is counted (`harness-session-process.ts:65,89`), but `SessionOutcome`, `RunSessionLine` (`run-records.ts`), and `session-record.ts:19-37` never carry it. `grep streamParseErrors src` finds nothing. | The drift signal that the TechSpec names as the mitigation for vendor stream changes is lost. A changed stream shape shows up only as missing session ids or final text, without a count. | Add optional `streamParseErrors` to the session line schema (additive, `v` unchanged), carry `exit.unparsedLines` through `SessionOutcome`, and assert it in TC-14 or TC-18. |
| CR-04 | Low | DEC-06, PRD UX ("zona final" in the progress line), RF17 | `src/core/services/run-session.ts:37-39` calls `watch.close()` and then reads `finalZone()` and `tokens()` from the last 1 s poll. `node-ledger-watcher.ts:41-44` stops without a final read. This is the T09 open item 2 observation. | A session that ends within 1 s of its last hook records `finalZone: null` and, without measured usage, a stale token estimate. The progress line then shows `zone n/a` although the ledger holds the reading. | Give `LedgerWatch` a final read (for example, `stop(): Promise<LedgerReading>` that polls once), await it in `runSession` before building the outcome, and assert `finalZone` for short sessions in TC-20. |
| CR-05 | Low | PRD objective "Limites respeitados", RF7 | `run-step.ts:53` runs validation with `validationTimeoutSeconds` (default 600 s) after the session. That includes sessions ended by `run_timeout`, before `run-loop.ts:62-63` applies `limit_reached`. `sessionDeadline` (`run-limits.ts:46-51`) bounds only the harness session. | A run can exceed `maxTotalMinutes` by up to the validation timeout plus the 10 s stop grace. The PRD objective says no run exceeds the configured duration. | Cause proven. The fix needs a product decision: either clamp the validation timeout to the remaining run time (at the risk of failing a finished step), or document the overrun bound in the TechSpec. |

### Optional improvements

| ID | Source | Evidence | Suggestion |
| --- | --- | --- | --- |
| OI-01 | `node.md` Child Processes ("Give every child process a timeout") | `src/infrastructure/runner/passthrough-process.ts:21`. This was disclosed and invited for challenge in T06 open item 4. | Either record the exception as a TechSpec `DEC` (the harness tool timeout bounds `wrap`), or add an optional timeout that defaults to off. It has no functional impact on CA-12. |
| OI-02 | QA-06 reservation | `tests/integration/node-ledger-watcher.test.ts:59` throws a plain `Error('locked')` in a test double | Use a named test error class, or leave it as is. It is test-only. |
| OI-03 | Pre-existing, outside this feature | `src/core/services/brake-engine.ts:76` uses the same exact-match `hasResetSignal` for the PRD-02 reset notice | If CR-01 option (a) is chosen, decide whether PRD-02's reset notice should follow the same rule. That is a separate PRD-02 decision. |

## Limitations and open items

- **Review independence.** This review ran in the Claude Code session whose id (`session_01PxYypzqCqe1dvvfCxQkWQk`) also authored T07–T09. The user ran `/clear` before invoking the flow, so this context holds no memory of authoring, and the snapshot's author-framing entries (Decisions, Code map, Learnings other than `on-run`) were not loaded. The review judged the code from the sources. The shared session id is recorded here for transparency.
- **Platforms (PI-03, O-02).** Evidence is Windows / Node 24 only. The TC-22 SIGINT case, the POSIX grace branch (`harness-session-process.ts:78-82`), the `sh` shims, and `/bin/sh` validation are not verifiable locally. CR-02 concerns exactly this path.
- **T08 incident (O-04).** During T08 development, a malformed Git Bash `PATH` launched the real Claude Code for two headless sessions in a scratch project (about 545k tokens, no repository change). The test helpers now seal `PATH` and refuse to launch when a real harness is reachable (`tests/helpers/run-project.ts`). No code defect remains. The user was informed at `DEC-PAUSE-T08`.
- **Real-harness behavior (PI-04).** The autonomy objective is measured only on the fake harness. CR-01 is a real-harness effect that the fake harness masks.
- **Manual acceptance.** The optional real-harness run was not performed.

## Conclusion

All nine tasks are complete. The gate is green except for the pre-existing lint baseline, and CA-01–CA-14 are demonstrated against the built CLI and the fake harness, apart from the POSIX-only CA-09 case. The quality profile has no unjustified blocking hit.

The status is REJECTED for two medium findings. CR-01: the reset signal the prompt asks for is not the one the runner recognizes, which misclassifies real sessions under RF3 and RF9. CR-02: the POSIX stop can leave harness descendants alive, contrary to RF12 and DEC-05.

Three low findings (CR-03 to CR-05) are also non-conformant with named TechSpec or PRD text. CR-01 and CR-05 need a contract or product decision before correction. CR-02, CR-03, and CR-04 fit within the approved contracts.
