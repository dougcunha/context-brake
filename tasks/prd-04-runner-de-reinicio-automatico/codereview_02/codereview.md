# Code review report — prd-04-runner-de-reinicio-automatico

## Summary

- Status: APPROVED
- Git scope: `eb2f386..worktree`. T01–T09 implementation plus T10–T14 corrections: 18 modified tracked files, plus new files under `src/`, `tests/`, `schemas/`, and this feature folder. `.agents/scheduled_tasks.lock` is excluded as a pre-existing unrelated change (`workflow.md#Baseline and pre-existing changes`).
- Previous review: `tasks/prd-04-runner-de-reinicio-automatico/codereview_01/codereview.md`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-04-runner-de-reinicio-automatico/prd.md` | read; sha256 `1f5342…` matches `DEC-HIL-01` |
| TechSpec | `tasks/prd-04-runner-de-reinicio-automatico/techspec.md` | read; updated with `DEC-EXC-CR01` and `DEC-EXC-CR05` |
| Manifest | `tasks/prd-04-runner-de-reinicio-automatico/tasks.md` | read; T01–T09 complete, links resolve |
| Correction tasks | `tasks/prd-04-runner-de-reinicio-automatico/codereview_01/done/task_10.md`–`task_14.md` | read; all 5 correction tasks verified in `done/` |
| Implementation | `git diff eb2f386` plus untracked files (117 TypeScript and `.mjs` files in `src/`, `tests/`, and `scripts/`), and handoffs `done/task_01.md`–`done/task_09.md`, `codereview_01/done/task_10.md`–`task_14.md` | delimited |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF1 | `run` opens sessions through a documented non-interactive mode | `src/infrastructure/harnesses/{claude-code,codex-cli}/session-launcher.ts`, `src/infrastructure/runner/harness-session-process.ts`, `src/core/services/run-session.ts` | TC-14, TC-19, TC-20 | conformant | Constant argv (`-p --output-format stream-json --verbose`; `exec --json -`), prompt on stdin, e2e runs on both harnesses |
| RF2 | Each session starts with the boot | Boot via installed `SessionStart` hook (`DEC-03`); `src/infrastructure/runner/run-system-ports.ts:RuntimeBootTokenEstimator` | `tests/e2e/e2e-run-steps.test.ts:28` | conformant | Journal shows `additionalContext` in all sessions |
| RF3 | End session on signal, critical ceiling, or harness exit | `src/core/services/session-watch.ts`, `src/core/services/reset-notice.ts` | TC-10, TC-23, `tests/e2e/e2e-run-signal.test.ts` | conformant | Signal recognized on trailing non-blank line of final message (`DEC-EXC-CR01`, T10); critical ceiling and harness exit tested |
| RF4 | Advance only after runner-run validation passes | `src/core/services/run-step.ts:41-77`, `src/core/services/session-evaluation.ts:30-39` | TC-02, TC-20 | conformant | `tests/e2e/e2e-run-steps.test.ts` demonstrates passed / failed / passed / passed sequence |
| RF5 | Correct unvalidated completions and record divergence | `src/core/services/session-evaluation.ts:30-55` | TC-03, TC-20 | conformant | `tests/e2e/e2e-run-steps.test.ts` logs `COMPLETED→IN_PROGRESS` correction |
| RF6 | Succeed when all steps are complete and validated | `src/core/services/run-loop.ts:59-62` | TC-01, TC-20 | conformant | Exit 0 with all plan steps validated |
| RF7 | Session, duration, and token ceilings | `src/core/services/run-limits.ts`, `src/core/services/session-watch.ts` | TC-05, TC-21, `tests/unit/run-text.test.ts` | conformant | Session cap exits 3; duration bound includes post-session validation per `DEC-EXC-CR05` (T14) |
| RF8 | Anti-loop stop for human decision | `src/core/services/run-limits.ts:21-44`, `src/core/services/run-tracker.ts:28` | TC-04, TC-21 | conformant | Exit 4 `repeated_failure`, naming step and output tail |
| RF9 | Stop on session without checkpoint and signal, preserving state | `src/core/services/session-evaluation.ts:23-28`, `src/core/services/run-step.ts:31-39` | TC-06, TC-21 | conformant | Plan and checkpoint bytes unchanged on unFresh exit without signal |
| RF10 | Validation timeout | `src/infrastructure/runner/shell-validation-executor.ts:49,62-64` | TC-11, TC-21 | conformant | `timed_out` twice, then exit 4 with tree kill |
| RF11 | Step approval mode | `src/core/services/run-loop.ts:64-66`, `src/cli/commands/run-prompts.ts:49-60` | TC-09, TC-24 | conformant | Exit 4 `step_not_approved` without a TTY; pauses between sessions with a TTY |
| RF12 | Clean interrupt with valid state and no harness processes | `src/cli/shutdown.ts`, `src/core/services/run-lifecycle.ts`, `src/infrastructure/runner/harness-session-process.ts`, `harness-session-signals.ts` | TC-22, `tests/unit/shutdown.test.ts`, `tests/integration/run-command-interrupt.test.ts`, `tests/integration/harness-session-stop.test.ts` | conformant | POSIX group kill after grace and after early exit (`CR-02`, T11); Windows direct tree kill |
| RF13 | Resume from the pending step | `src/core/services/run-loop.ts:39-43`, `src/core/services/run-lifecycle.ts:54-59` | TC-22, resume-after-stop | conformant | `resumedFrom` linked, resumes at pending step |
| RF14 | Confirm commands on first run and on change | `src/core/services/run-approvals.ts`, `src/core/services/run-step.ts:44-45`, `src/infrastructure/runner/node-approval-store.ts` | TC-07, TC-13, TC-19 | conformant | Unapproved non-TTY run exits 2; approvals stored in git-ignored runtime directory |
| RF15 | Harness permission modes untouched by default | Session launchers, `src/cli/commands/run.ts:21,31` | TC-17 | conformant | No permission override flag by default; preflight notice displayed |
| RF16 | `wrap` attaches session telemetry | `src/cli/commands/wrap.ts`, `src/infrastructure/runner/wrap-telemetry.ts` | TC-16, TC-24 | conformant | Telemetry block follows command output on supported harnesses |
| RF17 | Per-session local record | `src/core/services/session-record.ts`, `src/infrastructure/runner/node-run-store.ts` | TC-12, TC-18 | conformant | Strict schema without content fields; `streamParseErrors` recorded (`CR-03`, T12); final ledger reading applied (`CR-04`, T13) |
| RF18 | Summary in text and JSON | `src/core/services/run-summary.ts`, `src/cli/output/run-text.ts`, `schemas/run-summary.schema.json` | TC-18 | conformant | Valid against schema; duration note on `maxTotalMinutes` stop (`CR-05`, T14) |
| CA-01 | 3 validated steps, success | — | TC-20 | conformant | `tests/e2e/e2e-run-steps.test.ts:17-24` |
| CA-02 | Failed step repeats with validation result | — | TC-02, TC-20 | conformant | `tests/e2e/e2e-run-steps.test.ts:36-44` |
| CA-03 | False completion reverted and recorded | — | TC-03, TC-20 | conformant | `tests/e2e/e2e-run-steps.test.ts:46-51` |
| CA-04 | Stop after 2 failures with step, output, exit code | — | TC-04, TC-21 | conformant | `tests/e2e/e2e-run-stops.test.ts:13-24` |
| CA-05 | No 6th session with cap of 5 | — | TC-05, TC-21 | conformant | `tests/e2e/e2e-run-stops.test.ts:26-36` |
| CA-06 | No checkpoint and no signal: stop, state kept | — | TC-06, TC-21 | conformant | `tests/e2e/e2e-run-stops.test.ts:38-51` |
| CA-07 | Timed-out validation counts as failure | — | TC-11, TC-21 | conformant | `tests/e2e/e2e-run-stops.test.ts:53-63` |
| CA-08 | Approval mode waits before next session | — | TC-09, TC-24 | conformant | `tests/e2e/e2e-run-approval-wrap.test.ts` |
| CA-09 | Ctrl+C leaves no harness process; `run` resumes | — | TC-22 | conformant | Windows fallbacks pass; POSIX group stop implemented with unit/integration tests (`CR-02`, T11; POSIX CI for live execution) |
| CA-10 | Never-run plan without confirmation: nothing executes, commands listed | — | TC-07, TC-19 | conformant | `tests/e2e/e2e-run-preflight.test.ts` |
| CA-11 | Default permission mode | — | TC-17 | conformant | `tests/e2e/e2e-run-harness-args.test.ts` |
| CA-12 | `wrap` output carries session block | — | TC-16, TC-24 | conformant | `tests/e2e/e2e-run-approval-wrap.test.ts` |
| CA-13 | Log and JSON summary carry duration, end reason, step, validation, tokens | — | TC-18 | conformant | `tests/e2e/e2e-run-summary.test.ts` |
| CA-14 | 20×10 autonomy runs | — | TC-23 | conformant | 20/20 runs exit 0 in `tests/e2e/e2e-run-autonomy.test.ts` |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (no content in logs) | OK | `runSessionLineSchema` is strict; no content fields in `node-run-store.ts` |
| `javascript-typescript.md` / ESLint limits | OK | `npm run lint` reports 0 new errors (only 14 baseline PRD-03 QA errors). No source file exceeds 100 lines. |
| `node.md` Child Processes: argv spawn, shell only for validation | OK | `QA-04` hits only `shell-validation-executor.ts:29` (justified by `DEC-11`) |
| `node.md` Child Processes: timeout on every child | OK (disclosed, OI-01) | `passthrough-process.ts:21` spawns `wrap` child without timeout (harness tool timeout bounds `wrap`; non-functional impact) |
| `node.md` Shutdown | OK | Single signal registration (`shutdown.ts:27-37`); child group killed with `SIGKILL` on POSIX, direct tree kill on Windows |
| `cli-output.md` | OK | No prompt without TTY; one JSON document on stdout; named exit codes; duration overrun note added |
| `file-changes.md` | OK | Plan written atomically in reconciliation (`run-step.ts:67`); invalid copy preserved on restore; approvals renamed |
| `harness-adapters.md` | OK | Stream payloads stay in harness adapters; non-interactive mode documented in `docs/research/harness-integrations.md` |
| `tests.md` | OK | E2E runs built CLI on fixture repositories with sealed `PATH` and real-harness guard |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | ripgrep regex over 117 files | 0 | OK |
| QA-02 | `@ts-ignore` / `eslint-disable` | blocking | ripgrep regex | 0 | OK |
| QA-03 | Empty `catch` | blocking | ripgrep regex | 0 | OK |
| QA-04 | `exec` / `shell: true` | blocking | ripgrep regex | 1 of 1 | justified by `DEC-11` (`shell-validation-executor.ts:29`) |
| QA-05 | `core` importing `infrastructure` or `cli` | blocking | ripgrep regex over 20 `src/core` files | 0 | OK |
| QA-06 | `throw new Error(` | reservation | ripgrep regex | 1 new of 10 | 1 test double hit (`tests/integration/node-ledger-watcher.test.ts:72`). 9 `scripts/` hits are pre-existing baseline. |
| QA-07 | Clock or randomness in `core` | reservation | ripgrep regex | 0 | OK |
| QA-08 | 4+ parameters; file above 100 lines | reservation | ripgrep regex and line count | 0 files > 100 lines; 0 parameter hits | 1 false positive in test destructured parameter (`run-plan-reader.test.ts:41`) |

- Terrain baseline: applied from TechSpec. 9 pre-existing hits in `scripts/` excluded.
- Hits discounted by baseline: 9 (QA-06, `scripts/`)
- Reservations accumulated in the feature: 1 (OI-02 test double)
- Suggested escalation: `no trigger fired` (1 reservation vs threshold of 8; max file size 100 lines vs 200 threshold)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 | YES | `run-ports.ts` `SessionLauncher`. Non-strict schemas in harness adapters. |
| DEC-02 | YES | `launcher-registry.ts`; `--harness cursor` exits 2 |
| DEC-03 | YES | `runner-prompt.ts` renders TechSpec text. Boot tokens estimated. |
| DEC-04 | YES | `executable-command.ts`; forbidden shim arguments exit 64 (`INVALID_ARGUMENTS`) |
| DEC-05 | YES | End reasons, 10s grace, trailing-line reset signal (`DEC-EXC-CR01`), and POSIX group kill (`CR-02`) |
| DEC-06 | YES | 1s polling, critical grace, and final ledger reading at session end (`CR-04`) |
| DEC-07 | YES | Order: gate, validation, reconciliation |
| DEC-08 | YES | `runner-configuration.ts`; schema validation for flags |
| DEC-09 | YES | `run-limits.ts`; overrun bound documented per `DEC-EXC-CR05` |
| DEC-10 | YES | Hash of `(taskId, stepId, command)`; approvals in `.context-brake/runtime/` |
| DEC-11 | YES | `shell-validation-executor.ts` (16 KiB tail, tree kill on timeout) |
| DEC-12 | YES | `shutdown.ts`, `run-lifecycle.ts`, `state-snapshots.ts` |
| DEC-13 | YES | `node-run-lock.ts` |
| DEC-14 | YES | `run-records.ts`, `node-run-store.ts` (retention 20) |
| DEC-15 | YES | `run-summary.ts`, published `run-summary.schema.json` |
| DEC-16 | YES | `run.ts:36-42`, named exit codes in `exit-codes.ts` |
| DEC-17 | YES | `run-prompts.ts:49-60` |
| DEC-18 | YES | `--harness-arg` pass-through, preflight notice, summary `harnessArgs` |
| DEC-19 | YES | `wrap.ts`, `wrap-telemetry.ts` |
| DEC-20 | YES | `session-zone.ts`; `brake-engine.ts` kept within line limits |
| DEC-21 | YES | `run-plan-reader.ts`, `commands/run-preflight.ts` |
| DEC-22 | YES | Fake harness on sealed `PATH` in `tests/support/fake-harness/` |
| Observability: `streamParseErrors` | YES | `run-records.ts`, `session-record.ts`, `schemas/run-summary.schema.json` (`CR-03`, T12) |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | Contracts, configuration, exit codes, and summary schema |
| T02 | `done/task_02.md` | COMPLETE | Session evaluation and run limits |
| T03 | `done/task_03.md` | COMPLETE | Preflight, approvals model, and runner prompt |
| T04 | `done/task_04.md` | COMPLETE | Core run loop and summary builder |
| T05 | `done/task_05.md` | COMPLETE | Validation executor, store, approvals, and run lock |
| T06 | `done/task_06.md` | COMPLETE | Session zone extraction, ledger watcher, and `wrap` |
| T07 | `done/task_07.md` | COMPLETE | Harness session process and Claude Code / Codex launchers |
| T08 | `done/task_08.md` | COMPLETE | `context-brake run` CLI command and integration |
| T09 | `done/task_09.md` | COMPLETE | End-to-end acceptance with fake harness (TC-20–TC-24) |
| T10 | `codereview_01/done/task_10.md` | COMPLETE | Trailing-line reset signal predicate and tests (`CR-01`, `DEC-EXC-CR01`) |
| T11 | `codereview_01/done/task_11.md` | COMPLETE | POSIX process group stop and tests (`CR-02`) |
| T12 | `codereview_01/done/task_12.md` | COMPLETE | `streamParseErrors` in session lines and summary schema (`CR-03`) |
| T13 | `codereview_01/done/task_13.md` | COMPLETE | Final ledger reading at session end (`CR-04`) |
| T14 | `codereview_01/done/task_14.md` | COMPLETE | Duration overrun bound documented and summary note added (`CR-05`, `DEC-EXC-CR05`) |

All tasks in `tasks.md` and `codereview_01/done/` are complete and verified.

## Executed validations

- Profile and scope: CLI commands `run` and `wrap`. End-to-end tests run the built CLI against fixture repositories with the fake harness on a sealed `PATH`. No real harness, network, or credentials were used.
- Validated state: `eb2f386` plus uncommitted T01–T14 worktree. Windows 11, Node v24.19.0. This review session authored none of the code or corrections under review.
- Reused evidence: none for the gate. Every command below ran serialized in this review session.
- Manual acceptance: optional per TechSpec, owned by the user, and not run.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed (code 0) | CMP-26, package |
| `npm run typecheck` | passed (code 0) | all TypeScript contracts |
| `npm run lint` | passed (code 1; 14 baseline PRD-03 errors only, 0 new) | code standards |
| `npm run schemas:check` | passed (code 0) | DEC-08, DEC-15 |
| `npm run dependencies:check` | passed (code 0) | package dependencies |
| `npm run package:smoke` | passed (code 0; 460 packaged files verified, help output verified) | CMP-26 |
| `npm run coverage` | passed (code 0; 223 test files passed, 1390 tests passed, 3 skipped; 94.88% lines, 89.66% branches) | TC-01–TC-24 |

## Findings

No blocking or medium/high findings. All previous findings are resolved.

### Optional improvements

| ID | Source | Evidence | Suggestion |
| --- | --- | --- | --- |
| OI-01 | `node.md` Child Processes ("Give every child process a timeout") | `src/infrastructure/runner/passthrough-process.ts:21` | The harness tool timeout bounds `wrap`. For HIL 3 consideration. |
| OI-02 | QA-06 reservation | `tests/integration/node-ledger-watcher.test.ts:72` throws a plain `Error('locked')` in a test double | Use a named test error class or leave as is. Test-only. |
| OI-03 | Pre-existing outside this feature | `src/core/services/brake-engine.ts:76` uses exact-match `hasResetSignal` for PRD-02 reset notice | Separate PRD-02 decision whether to adopt the trailing-line signal rule. |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_01/CR-01 | resolved | `src/core/services/reset-notice.ts` (`endsWithResetSignal`), `src/core/services/session-watch.ts`, `tests/unit/runner-reset-signal.test.ts`, `tests/e2e/e2e-run-signal.test.ts`. Trailing non-blank signal recognized; bare signal and preceding text both yield `reset_signal`. |
| codereview_01/CR-02 | resolved | `src/infrastructure/runner/harness-session-process.ts`, `harness-session-signals.ts`, `tests/unit/harness-session-signals.test.ts`, `tests/integration/harness-session-stop.test.ts`. POSIX group kill after grace and after early exit implemented; Windows direct tree kill retained; platform limit documented. |
| codereview_01/CR-03 | resolved | `src/core/contracts/run-records.ts`, `src/core/services/session-record.ts`, `schemas/run-summary.schema.json`, `tests/e2e/e2e-run-summary.test.ts`. `streamParseErrors` recorded in session lines and summary. |
| codereview_01/CR-04 | resolved | `src/core/contracts/run-ports.ts`, `src/infrastructure/runner/node-ledger-watcher.ts`, `src/core/services/session-watch.ts`, `src/core/services/run-session.ts`, `tests/integration/node-ledger-watcher.test.ts`, `tests/integration/node-ledger-watcher-race.test.ts`, `tests/e2e/e2e-run-steps.test.ts`. Final ledger reading polled and awaited at session end; non-null `finalZone` in short sessions. |
| codereview_01/CR-05 | resolved | `tasks/prd-04-runner-de-reinicio-automatico/techspec.md`, `src/cli/output/run-text.ts`, `tests/unit/run-text.test.ts`. Duration bound documented (`maxTotalMinutes + validationTimeoutSeconds + 10s stop grace`), and duration note rendered in text summary on `maxTotalMinutes` stop. |

## Limitations and open items

- **Review independence.** This review ran in an independent session that authored none of T01–T09 or T10–T14 corrections.
- **Platforms (PI-03, O-02).** Local evidence is Windows 11 / Node 24 only. The TC-22 SIGINT case and two T11 POSIX stop cases are skipped on Windows and run in Linux/macOS CI.
- **T08 incident (O-04).** Addressed in T08; all tests run on a sealed `PATH` with real-harness guard.
- **Real-harness behavior (PI-04).** Autonomy objective is measured on the fake harness.
- **Manual acceptance.** Optional per TechSpec, owned by the user.

## Conclusion

All 14 obligations (RF1–RF18, CA-01–CA-14) are conformant. All tasks (T01–T09) and corrections (T10–T14) are verified complete in `done/` and `codereview_01/done/`. All 5 findings from `codereview_01` (CR-01 through CR-05) are resolved with rigorous unit, integration, and end-to-end evidence.

The full serialized test suite passed (223 test files, 1390 passed, 3 skipped on Windows for POSIX CI), achieving 94.88% line coverage. The build, typecheck, schemas check, dependencies check, and package smoke tests all passed. The linter reports zero new errors against the pre-existing PRD-03 baseline. The quality profile has no unjustified blocking hit.

The status is APPROVED.
