# Stable execution context

Load in this exact order:

1. `tasks/prd-04-runner-de-reinicio-automatico/prd.md`
2. `tasks/prd-04-runner-de-reinicio-automatico/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T04 — Core run loop and summary

## Outcome

`run-loop.ts`, split into `run-session.ts` where needed, runs sessions over port fakes and ends with a final `RunSummary`. It covers:

- Before a session: limit checks, snapshot, prompt, and launch.
- During a session: ledger and deadline watching with the critical grace period, and stops on the signal or a limit.
- After a session: evaluation, validation through the executor port, the plan write, the session record, and a progress event.
- Run-level stops: the anti-loop, step approval, and command re-approval when a command changes.
- Interrupt handling with snapshot restore.

## Dependencies and boundaries

- Depends on: T02, T03
- Unblocks: T08
- In scope: orchestration logic and summary building in `core`. Unit tests use fakes of every port: a launcher that emits scripted events, the executor, the store, the approver, the clock, and the watcher.
- Out of scope: real processes, files, and terminal I/O.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF1, RF3, RF6, RF11, RF12, RF13, RF18 | `prd.md#principais-funcionalidades` | Session sequence, end conditions, success, approval, interrupt, resume, summary |
| DEC-05, DEC-06, DEC-09, DEC-12, DEC-15, DEC-17 | `techspec.md#technical-decisions` | End reasons, critical grace, deadlines, shutdown, summary, step approval |
| CMP-08 | `techspec.md#components-and-flow` | Run loop |
| TC-01, TC-05, TC-07, TC-09, TC-10 | `techspec.md#test-approach` | Unit scenarios |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`
- Existing code: `src/core/contracts/session-ledger.ts` (`Clock`); the services from T02 and T03.
- Contract: `techspec.md#components-and-flow` (the Flow paragraph); `#errors-security-and-recovery`

## Work

- [x] T04.1 Implement one session:
  - Snapshot, prompt, and launch.
  - Event handling: `started` records the session key; also `final_text`, `usage`, and `failed`.
  - End-reason classification, including exact-signal detection.
- [x] T04.2 Implement in-session stops through a cancellable wait: the session deadline, the run deadline, the token total, and a CRITICAL reading followed by `criticalGraceSeconds`.
- [x] T04.3 Implement what follows a session: evaluation, validation through the executor port, the plan write, the session record, the anti-loop, step approval, and command re-approval when a hash changes.
- [x] T04.4 Implement interrupt handling:
  - Stop the active process or validation.
  - Validate the plan and checkpoint, and restore any invalid one from the snapshot.
  - Record `interrupted`.
- [x] T04.5 Build the summary, the resume link (`resumedFrom`), and the progress event model the CLI consumes.

## Acceptance criteria

- A scripted 3-step run completes in 3 sessions with the stop `completed`.
- No launch happens after a limit fires, and the in-session deadline equals the earlier of the session and run deadlines.
- A session that crosses CRITICAL ends with `critical_ceiling` after exactly the grace period (fake clock).
- On interrupt, an invalid plan is restored from the snapshot, and the invalid copy is kept through the store port.

## Verification

- Unit: TC-01, TC-05 (loop part), TC-07 (changed hash), TC-09, TC-10, and interrupt restore.
- Integration: not applicable.
- End-to-end: T09.
- Platforms: platform-independent.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`
- Environment dependency: none.
- Expected evidence:
  - `tests/unit/run-loop.test.ts` and `tests/unit/run-session.test.ts` green.
  - Files at or under 100 lines and functions at or under 30 lines.

## Affected files

- Create: `src/core/services/run-loop.ts`, `src/core/services/run-session.ts`, `src/core/services/run-summary.ts`, `tests/unit/run-loop.test.ts`, `tests/unit/run-session.test.ts`

## Observability and recovery

- Operational signal: progress events and the summary, consumed by the CLI.
- Recovery: the interrupt restore path above.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: the core run loop (CMP-08) over ports, deterministic under a fake clock and timer.
  - **`run-loop.ts` (`runPlan`).**
    - An invalid plan at start ends with `no_checkpoint` and no run record.
    - The initial command approval covers all open-step commands. A decline ends with `confirmation_required`, no run record, and nothing executed.
    - `openRun` sets `resumedFrom` to the latest run unless it completed, then prunes and writes the `running` record.
    - Each iteration checks the interrupt, re-reads the plan, and calls `decideBeforeSession` (completed, then anti-loop, then limits). It then selects the step (`currentStepId` if open, else the `IN_PROGRESS` step, else the first open step), snapshots the state, emits `session_started`, renders the prompt (with the previous failure of the same step), runs the session, settles it, records it, and applies the post-session stops.
    - The post-session stops, in order: a settlement stop; `completed` when the plan is complete; `limit_reached` from `runLimitForEnd`; and step approval after a pass when `stepApprover` is set (DEC-17).
  - **`run-session.ts` and `session-watch.ts` (DEC-05, DEC-06, DEC-09).**
    - Launch uses `launcher.buildCommand` (prompt on stdin), with the environment `CONTEXT_BRAKE_RUN_ID`.
    - Supervision polls every 1 s through `Timer` and forces an end on, in priority order: an interrupt; 10 s after an exact reset signal while the process is alive, keeping `reset_signal`; `criticalGraceSeconds` after the first CRITICAL reading (`critical_ceiling`); then `token_limit`, `run_timeout`, or `session_timeout` through `sessionLimitEnd`.
    - On a natural end, a spawn failure is `harness_error`, then the exact signal is `reset_signal`, then a `failed` event or non-zero exit is `harness_error`, else `harness_exit`.
    - Tokens are the last `usage` event when present (`measured`), else the ledger reading (`estimated`), else 0 (`estimated`). The `started` event records the session key through `onStarted` (`run.json` `activeSession`) and starts the `LedgerWatcher`.
  - **`run-step.ts` (after a session, DEC-07 and DEC-10).**
    - `interrupted` and `harness_error` stop without a read, validation, or write.
    - The gate returns `no_checkpoint` (stop, no write) or `step_removed` (not run, continue).
    - A missing or blank command after the session stops with `no_checkpoint`. A changed command hash is re-listed through `ensureCommandsApproved`, and a decline stops with `confirmation_required`.
    - Validation polls for an interrupt and stops the executor. Reconciliation writes the plan only when changed.
  - **`run-lifecycle.ts` (DEC-12).** On an interrupt after at least one session, it re-reads the state and calls `store.restoreState` for each invalid or missing file (`invalidStateFiles`, the first use of `STATE_FILES`). It then writes the final record and builds `RunResult`.
  - **`run-tracker.ts`.** It tracks lines, the failure streak, the last failure for the prompt, the last output tail, the token totals (`measured` only when every session is measured), and the `RunRecord` counters.
  - **`session-record.ts`.** It builds the DEC-14 line, appends it, rewrites `run.json`, and emits `session_finished` with the step title, the output tail, and the harness detail (`harness_error` only, 200 characters) for the terminal.
  - **`run-summary.ts` (DEC-15).** `buildRunSummary(result, exitCode)` builds the summary, and `decisionFor` gives fixed options for `repeated_failure`, `no_checkpoint`, `harness_error`, `step_not_approved`, and `confirmation_required`.
  - **New ports (`src/core/contracts/run-control.ts`).** `Timer`, `InterruptSignal`, `RunStateAccess` (strict reads, `null` when invalid or missing), `BootTokenEstimator`, and `RunProgressListener` / `RunProgressEvent`.
  - **`run-context.ts`.** `RunDependencies`, `RunSettings`, the named constants, and `waitOrFinish`.
- Changed files:
  - Created under `src/core/services/`: `run-loop.ts` (67 lines), `run-session.ts` (54), `session-watch.ts` (86), `run-step.ts` (82), `run-lifecycle.ts` (64), `run-tracker.ts` (85), `session-record.ts` (37), `run-summary.ts` (54), `run-approvals.ts` (21), and `run-context.ts` (44).
  - Created `src/core/contracts/run-control.ts`.
  - Tests: `tests/unit/run-loop.test.ts`, `run-loop-stops.test.ts`, `run-loop-interrupt.test.ts`, `run-session.test.ts`, and `run-summary.test.ts`, with the helpers `tests/helpers/run-world.ts` and `run-fakes.ts` (fakes of every port).
  - Modified `tests/helpers/run-plans.ts` (`checkpointAt` accepts any step id).
- Checks:
  - `npm run typecheck`: clean.
  - `npm run build`: exit 0.
  - `npm run lint`: the 14 pre-existing prd-03 QA evidence errors only.
  - `npm run coverage`: exit 0. 185 files and 1,139 tests passed, with overall statement coverage at 94.11%. Every new service is at 100% statements. The remaining branch gaps are defensive `??` fallbacks and the `parseLine` passthrough, which the fake process never invokes.
- Test coverage by case:
  - TC-01: 3 steps in 3 sessions, `completed`.
  - TC-02 (loop part): the failure clause and tail appear in the next prompt only.
  - TC-05: no launch after `maxSessions`, `run_timeout` maps to `maxTotalMinutes`, and deadlines are `min(session, total)`.
  - TC-07: declined up front with no launch and no record; a changed command re-listed, then declined or approved.
  - TC-09: yes then no, and no question after a failure or the last step.
  - TC-10: exact signal only, and `critical_ceiling` at exactly 120 s.
  - Interrupt: during a session with plan restore, during validation, between sessions, and with no restore when state is valid.
- Validated state: Git base `eb2f386` with the T01–T04 changes uncommitted, on Windows 11 with Git Bash, Node v24.19.0, and npm 11.17.0.
- Quality profile:
  - QA-01–QA-07: empty over the 11 source files, 5 test files, and 3 helpers.
  - QA-08: no declaration with 4 or more parameters, and no file above 100 lines. The largest is `session-watch.ts` at 86.
  - No reservation hits.
- Open items:
  1. **Deviation disclosed (files).** The task named `run-loop.ts`, `run-session.ts`, and `run-summary.ts`. The line limits forced a split into `session-watch.ts`, `run-step.ts`, `run-lifecycle.ts`, `run-tracker.ts`, `session-record.ts`, `run-approvals.ts`, and `run-context.ts`, all in the same layer, as the TechSpec allows for CMP-08 ("split … if it passes 100 lines").
  2. **Deviation disclosed (ports).** The new ports live in `src/core/contracts/run-control.ts` because `run-ports.ts` is at 86 of 100 lines. `RunStateAccess` keeps `core` free of error catching: the infrastructure (T05/T08) maps `PlanStore` / `CheckpointStore` failures to `null`. The interrupt is a polled `InterruptSignal` that T08's `ShutdownController` sets, with a latency of up to 1 s.
  3. **Interpretation (`harness_error`).** It stops the run without validating or writing, even when the checkpoint is fresh (Errors section: "stop with exit 4"). `session_timeout` continues through the gate (T02 open item 1).
  4. **Interpretation (missing command).** A step whose `validationCommand` the agent removed stops with `no_checkpoint`, the invalid-state fold, because RF4 cannot hold without it.
  5. **For T08 (exit codes).** `core` cannot import `EXIT_CODES`, so `buildRunSummary` takes the exit code. T08 maps `completed` to 0, `limit_reached` to 3, `interrupted` to 130, and `confirmation_required` with `sessionCount === 0` to 2. Other `confirmation_required` stops and the remaining decision stops map to 4.
  6. **For T08 (approvals).** The initial approval runs inside `runPlan` before `openRun`, so T08 can call `runPlan` directly, and the `CommandApprover` implementation owns the TTY and `--approve-commands` behavior. `RunResult.outputTail` and the `session_finished` event carry the tail for the decision text on stderr, never in records.
  7. **For T05.** `RunStore.restoreState` must keep the invalid copy in the run directory and ignore a file that the snapshot also lacked. `pruneRuns` is called before the new record is written.

### ADR candidates

None - direct TechSpec implementation or local decision.
