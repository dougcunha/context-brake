# Stable execution context

Load in this exact order:

1. `tasks/prd-04-runner-de-reinicio-automatico/prd.md`
2. `tasks/prd-04-runner-de-reinicio-automatico/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T08 — `run` command

## Outcome

`context-brake run --harness <id>` works end to end on the built CLI:

- Argument parsing and limit overrides, configuration load, lock, and launcher resolution.
- Preflight and command confirmation: a TTY prompt, `--approve-commands`, or a stop without a TTY.
- The permission notice and step approval.
- One signal registration in `main.ts` that delegates shutdown once.
- Output: one progress line per session on stderr, decision requests, the text summary, and a `--json` summary that matches the schema.
- The DEC-16 exit codes.

## Dependencies and boundaries

- Depends on: T04, T05, T06, T07
- Unblocks: T09
- In scope:
  - Code: `run-arguments.ts` (the `run` part), `runner-composition.ts`, `commands/run.ts`, `run-prompts.ts`, `shutdown.ts`, `main.ts`, and `run-text.ts`.
  - Dispatch, help, and the error command enum.
  - Tests: the first end-to-end tests (TC-17–TC-19) and the shutdown unit test.
- Out of scope: the acceptance scenarios TC-20–TC-24 (T09).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF1, RF11, RF12, RF14, RF15, RF18 | `prd.md#principais-funcionalidades` | Command, approvals, interrupt, confirmation, permissions, summary |
| PRD user experience | `prd.md#experiência-do-usuário` | Progress line, decision requests, `NO_COLOR`, no TTY, JSON |
| DEC-02, DEC-08, DEC-10, DEC-12, DEC-13, DEC-15, DEC-16, DEC-17, DEC-18, DEC-21 | `techspec.md#technical-decisions` | CLI behavior |
| CMP-19, CMP-20, CMP-21, CMP-23, CMP-24, CMP-25 | `techspec.md#components-and-flow` | Components |
| TC-17, TC-18, TC-19 | `techspec.md#test-approach` | End-to-end scenarios |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `cli-output.md`
- Existing code:
  - `src/cli/main.ts:11-22`: the signal handler to replace with delegation.
  - `src/cli/confirmation.ts`.
  - `src/cli/commands/plan.ts`: the configuration loading and JSON/text pattern.
  - `tests/e2e/cli-runner.ts`.
- Contract: `techspec.md#integrations-and-interfaces` (CLI `run`)

## Work

- [x] T08.1 Implement `shutdown.ts`, and change `main.ts` to delegate to one registered controller and ignore repeated signals; unit-test the delegation.
- [x] T08.2 Implement `run` argument parsing and overrides; compose the ports in `runner-composition.ts`.
- [x] T08.3 Implement the command: lock, preflight, confirmation prompts, permission notice, loop execution, and exit-code mapping.
- [x] T08.4 Implement `run-text.ts` (progress, decision request, and summary with text labels, respecting `NO_COLOR`) and the JSON summary.
- [x] T08.5 Add dispatch, help lines, and the error command enum; write the TC-17–TC-19 end-to-end tests with the fake harness on `PATH`.

## Acceptance criteria

- A run without a TTY and without `--approve-commands` executes no validation command, lists the commands, and exits 2.
- With `--json`, stdout is one document valid against `run-summary.schema.json`, and progress stays on stderr.
- `--harness cursor` exits 2 with the unsupported reason; a missing executable exits 2 with `RUN_HARNESS_MISSING`.
- Repeated SIGINT signals trigger a single shutdown.

## Verification

- Unit: shutdown delegation and argument parsing.
- Integration: a composition smoke test through the end-to-end runner.
- End-to-end: TC-17, TC-18, and TC-19 against fixture repositories.
- Platforms: Linux, macOS, and Windows; local evidence is Windows.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run schemas:check`, `npm run package:smoke`
- Environment dependency: none.
- Expected evidence: the end-to-end suites green, and `node dist/src/cli/main.js --help` listing `run` and `wrap`.

## Affected files

- Modify: `src/cli/main.ts`, `src/cli/argument-parser.ts`, `src/cli/composition-root.ts`, `src/cli/run-arguments.ts`
- Create:
  - CLI: `src/cli/shutdown.ts`, `src/cli/commands/run.ts`, `src/cli/commands/run-prompts.ts`, `src/cli/output/run-text.ts`.
  - Composition: `src/infrastructure/runner/runner-composition.ts`.
  - Tests: `tests/unit/shutdown.test.ts`, `tests/unit/run-arguments.test.ts`, `tests/e2e/e2e-run-harness-args.test.ts`, `e2e-run-summary.test.ts`, `e2e-run-preflight.test.ts`.

## Observability and recovery

- Operational signal: the progress lines, the summary, and the run records.
- Recovery: rerun `run` to resume from the plan.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `context-brake run --harness <id>` works end to end on the built CLI (CMP-19–CMP-21, CMP-23–CMP-25).
  - **Shutdown (T08.1, DEC-12).**
    - `src/cli/shutdown.ts` has a `SignalRouter` (one instance, `signalRouter`) and an `InterruptFlag`, which implements `ShutdownController` and the core `InterruptSignal`.
    - `main.ts` registers SIGINT and SIGTERM once and delegates to the router. The router exits 130 when no controller is registered. Otherwise it delivers the first signal to the controller and ignores every later signal, including after the controller unregisters.
    - `run` registers its flag only around `runPlan`. The flag prints one `[STOP] <signal> received` line.
  - **Arguments and composition (T08.2, DEC-08, DEC-18).**
    - `run-arguments.ts` `parseRun` reads `--harness` (required), `--approve-commands`, `--approve-steps`, `--json`, and the six limit flags (positive integers).
    - `--harness-arg` is extracted before `parseArgs`, so a dash-prefixed value such as `--permission-mode` works in both `--harness-arg V` and `--harness-arg=V` forms.
    - `resolveRunLimits` validates the overrides against the configured `runner` section through the Zod schema, so `maxSessionMinutes ≤ maxTotalMinutes` still holds (`INVALID_ARGUMENTS`, 64).
    - `infrastructure/runner/runner-composition.ts` has four parts:
      - `prepareHarness`: the launcher registry, then the executable resolver, then `assertHarnessArguments`, returning a `ResolvedExecutableLauncher` bound to the discovered name.
      - `composeRunDependencies`: every T05–T07 adapter, plus `NodeRunStateAccess`, the system clock, timer, hasher, and `RuntimeBootTokenEstimator`.
      - `composeRunSettings`: the prompt file names from the configuration.
      - `runLockFor`.
  - **Command (T08.3, DEC-10, DEC-13, DEC-16, DEC-17, DEC-21).**
    - `commands/run.ts` order: load the configuration, then limits, then the launcher (unsupported or missing), then the plan preflight. A complete plan exits 0 with a zero-session summary.
    - It then prints the permission notice, acquires the lock (`RUN_IN_PROGRESS` when held), registers shutdown, calls `runPlan`, and releases in `finally`.
    - `runExitCode` implements D-04: completed 0; `limit_reached` 3; interrupted 130; `confirmation_required` with zero sessions 2; every other stop 4.
    - `commands/run-preflight.ts` holds `RunCommandError` and the preflight messages. `run-prompts.ts` holds `TerminalCommandApprover` (the listing always goes to stderr) and `TerminalStepApprover` (the DEC-17 texts).
    - `terminalAsk` prompts on stderr, answers no on Ctrl+C during a prompt, and forwards the interrupt to the router.
  - **Output (T08.4).**
    - `output/run-text.ts`: one progress line per session on stderr (`Session N | step I "title" | end R | zone Z | validation PASS | 4m12s`), the approval notice, the harness detail line, the decision request (reason, step, output tail, options) on stderr, and the labeled summary (`[OK]` / `[STOP]`) on stdout.
    - No color codes are emitted at all, so `NO_COLOR` holds trivially.
    - `--json` prints only the T04 `RunSummary` on stdout.
  - **Dispatch and errors (T08.5, CMP-25).**
    - `argument-parser.ts` routes `run`. `composition-root.ts` dispatches it and lists it in help.
    - `handleCommandError` now maps any known error `code` (`INVALID_ARGUMENTS` plus `CLI_ERROR_CODES`), with no change for existing commands.
    - `diagnostics.ts` exports `CLI_ERROR_COMMANDS` (plus `run`) and `CLI_ERROR_CODES`, extended with `INVALID_STATE_FILE`, `RUN_HARNESS_UNSUPPORTED`, `RUN_HARNESS_MISSING`, `RUN_PLAN_NOT_RUNNABLE`, and `RUN_IN_PROGRESS`, all exit 2. `report-service.ts` derives its input types from them.
- Changed files:
  - Created, src:
    - CLI: `src/cli/shutdown.ts`, `src/cli/commands/run.ts`, `run-prompts.ts`, `run-preflight.ts`, `src/cli/output/run-text.ts`.
    - Runner: `src/infrastructure/runner/runner-composition.ts`, `run-system-ports.ts`, `node-run-state.ts`, `run-plan-reader.ts`.
  - Modified, src:
    - CLI: `src/cli/main.ts`, `argument-parser.ts`, `composition-root.ts`, `run-arguments.ts`.
    - Core: `src/core/contracts/diagnostics.ts`, `src/core/services/report-service.ts`, `src/core/services/usage-resolver.ts` (exports `CHARACTERS_PER_TOKEN` only).
  - Created, tests:
    - Unit: `tests/unit/shutdown.test.ts`, `run-arguments.test.ts`, `run-text.test.ts`, `run-prompts.test.ts`.
    - Integration: `tests/integration/run-command.test.ts`, `run-command-preflight.test.ts`, `run-command-interrupt.test.ts`, `run-plan-reader.test.ts`, `run-system-ports.test.ts`.
    - End to end: `tests/e2e/e2e-run-harness-args.test.ts`, `e2e-run-summary.test.ts`, `e2e-run-preflight.test.ts`.
    - Helpers: `tests/helpers/run-project.ts` (sealed `PATH` plus the real-harness guard), `run-command-world.ts`.
  - Modified, tests: `tests/e2e/cli-runner.ts` (optional `env`), `tests/test-lanes.ts` (five files join the process lane), `tests/unit/wrap-arguments.test.ts` (the allowed-commands text now includes `run`).
- Checks (final state, 2026-09-24):
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npm run lint`: 14 errors, all the prd-03 `qa_01/evidence/*.mjs` baseline (L-05); none new.
  - `npm run coverage`: exit 0. 214 files and 1,347 tests pass. All files 94.81% lines, 89.61% branches.
  - `npm run schemas:check`: pass.
  - `npm run package:smoke`: pass.
  - `node dist/src/cli/main.js --help` lists `run` and `wrap`.
  - New-file coverage: `run-preflight.ts`, `run-system-ports.ts`, `runner-composition.ts`, `run-arguments.ts`, `shutdown.ts`, and `run-text.ts` 100% lines; `run.ts` 100%; `run-prompts.ts` 97.9%; `run-plan-reader.ts` 92%; `node-run-state.ts` 93.1%. The gaps are rethrows of unexpected errors.
- Acceptance evidence:
  - A non-TTY run without `--approve-commands` lists the commands on stderr and exits 2. The marker file the validation would write is absent, the fake harness record is absent, no run record exists, and the lock is released (`e2e-run-preflight.test.ts`).
  - With `--json`, stdout parses with `runSummarySchema` and holds every `required` key of `schemas/run-summary.schema.json`. The progress lines appear on stderr only (`e2e-run-summary.test.ts`).
  - `--harness cursor` exits 2 with `RUN_HARNESS_UNSUPPORTED` and the DEC-02 reason. A sealed `PATH` without the harness exits 2 with `RUN_HARNESS_MISSING` (JSON error document).
  - Repeated SIGINT and SIGTERM produce one shutdown. `shutdown.test.ts` invokes the listeners registered by `main` directly. `run-command-interrupt.test.ts` sends SIGINT, SIGINT, SIGTERM through the router during a hung fake session: exit 130, one `[STOP]` line, an `interrupted` summary, no surviving harness pid, and the plan unchanged.
  - TC-17: default argv for Claude Code (`-p --output-format stream-json --verbose`) and Codex CLI (`exec --json -`) has no permission flag. `--harness-arg` values are appended verbatim, listed in `harnessArgs`, and the prompt arrives on stdin. On Windows, a shim-forbidden argument exits 64 before any session starts.
  - TC-18: `sessions.jsonl` lines validate, and each carries duration, end reason, step, validation, and tokens with their source. The summary `sessions` equals the log lines.
- Validated state: HEAD `eb2f386` plus the uncommitted T01–T08 worktree; Windows 11, Node v24.19.0; fake harness only, on a sealed `PATH`.
- Quality profile:
  - QA-01–QA-07: no hits over the 35 touched TypeScript files. Three QA-06 hits in test support were removed before the handoff.
  - QA-08: two regex matches that are false positives: `tests/e2e/cli-runner.ts:10` has 3 parameters (the regex counts the commas in `Record<string, string>`), and `tests/integration/run-plan-reader.test.ts:41` destructures one parameter. ESLint `max-params: 3` passes. No file is above 100 non-blank lines.
  - No reservation hits.
- Open items:
  1. **Incident, disclosed.** During an ad-hoc smoke test before the test helpers existed, a Git Bash `PATH` built from a `C:/…` path broke on the drive colon. The real Claude Code at `~/.local/bin/claude.exe` then ran two sessions in a scratchpad temp project with `--permission-mode acceptEdits`, about 545k measured tokens. It completed the 2-step plan there, which incidentally shows the real headless flow working. No repository file was touched, and the scratch project was deleted. Every harness-launching test now uses `tests/helpers/run-project.ts`: a sealed `PATH` (fake bin, the node directory, and the system directory only), plus a guard that throws `RealHarnessReachableError` before launch if a real `claude` or `codex` is reachable.
  2. **Deviation disclosed (files).**
     - The line limits and the layer rules forced four extra files: `commands/run-preflight.ts`, `runner/run-system-ports.ts`, `runner/node-run-state.ts`, and `runner/run-plan-reader.ts`. They are the same layers as CMP-19 and CMP-21.
     - `usage-resolver.ts` now exports its existing token ratio for the boot estimator (DEC-03).
     - `diagnostics.ts` and `report-service.ts` gained the `run` command and its error codes (CMP-25).
  3. **Interpretation (exit 64 for a forbidden shim argument).** `ShimArgumentError` carries `INVALID_ARGUMENTS`, which is exit 64 in the existing contract (`cli-output.md`: codes do not change). The T07 handoff said "exit 2"; the code keeps 64.
  4. **Interpretation (`--approve-commands` scope).** The flag pre-approves exactly the hashes listed at the start of the invocation (DEC-10). A command changed mid-run has a new hash, so it is re-listed and needs a TTY confirmation, or it stops with `confirmation_required` (exit 4, since sessions have run).
  5. **Interpretation (preflight codes).** An invalid or missing checkpoint, or an invalid plan, is `INVALID_STATE_FILE` (exit 2) with the PRD-03 issue text. A missing plan or an open step without a command is `RUN_PLAN_NOT_RUNNABLE`. The permission notice is printed on every run that starts sessions.
  6. **Interpretation (Ctrl+C at a TTY prompt).** The answer is no, and the interrupt flag is also set. The run therefore ends with the approval stop (`confirmation_required` exit 2, or `step_not_approved` exit 4), not with 130, because `runPlan` returns from the approval before it polls the flag.
  7. **Platforms.** Local evidence is Windows only (PI-03). The POSIX `SIGINT` path and `/bin/sh` validation run in CI only. TC-22's end-to-end Ctrl+C belongs to T09.
  8. **For T09.** Reuse `tests/helpers/run-project.ts` (`createRunProject`, `writePlan`, `useScenario`, `runEnvironment`, `readFakeRecord`) and `runBuiltCli(args, cwd, env)`. Keep the sealed `PATH`; never prepend to the developer `PATH` by hand. The fake harness still needs the DEC-22 extensions (O-03).

### ADR candidates

None - direct TechSpec implementation or local decision.
