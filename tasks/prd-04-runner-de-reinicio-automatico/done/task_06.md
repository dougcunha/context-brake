# Stable execution context

Load in this exact order:

1. `tasks/prd-04-runner-de-reinicio-automatico/prd.md`
2. `tasks/prd-04-runner-de-reinicio-automatico/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T06 — Session zone, ledger watcher, and `wrap`

## Outcome

- Zone reading moves from `brake-engine.ts` to `session-zone.ts` with no behavior change.
- `NodeLedgerWatcher` reports zone and token readings for a session key.
- `context-brake wrap -- <command>` runs a command inside a runner session, streams its output, and appends that session's telemetry block. It records a tool line only for harnesses without post-tool telemetry. Outside a runner session, it runs the command and warns.

## Dependencies and boundaries

- Depends on: T01, T05
- Unblocks: T08
- In scope: the extraction, `renderSessionTelemetry`, the watcher, `wrap` parsing and command, and the dispatch and help entry for `wrap`.
- Out of scope: wiring the `run` command (T08).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF16, US8 | `prd.md#telemetria-por-comando-e-relatório` | `wrap` telemetry |
| RF3 | `prd.md#execução-de-sessões` | Critical ceiling readings for the runner |
| DEC-06, DEC-19, DEC-20 | `techspec.md#technical-decisions` | Watcher, `wrap`, extraction |
| CMP-09, CMP-10, CMP-18, CMP-22 | `techspec.md#components-and-flow` | Components |
| TC-16 | `techspec.md#test-approach` | Unit and integration scenarios |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `cli-output.md`
- Existing code:
  - `src/core/services/brake-engine.ts:37-46,53-63` and `src/core/services/telemetry-block.ts`.
  - `src/infrastructure/runtime/runtime-composition.ts` (`composeRuntime`) and `node-session-ledger.ts`.
  - Each harness's `capabilities.ts` (`post_tool_telemetry`).
- Contract: `techspec.md#integrations-and-interfaces` (`wrap`)

## Work

- [x] T06.1 Extract `readZone` and its types into `session-zone.ts` and add `renderSessionTelemetry`. The existing brake tests stay green and unchanged.
- [x] T06.2 Implement `NodeLedgerWatcher` polling with an injected interval.
- [x] T06.3 Implement `wrap`:
  - Argument parsing, and the run-record lookup through `CONTEXT_BRAKE_RUN_ID`.
  - An argv spawn, applying the Windows shim rule from DEC-04.
  - Streaming passthrough and a character count.
  - The block append and exit-code passthrough.
- [x] T06.4 Add `wrap` to dispatch, help, and the CLI error command enum.

## Acceptance criteria

- Inside a runner session, the block is appended even below the activation threshold.
- There is no duplicate tool line when the harness declares `post_tool_telemetry: supported`.
- Outside a runner session, the command's output and exit code are unchanged, `WARN` goes to stderr, and no block is appended.
- `brake-engine.ts` stays at or under 100 lines, and its tests are unchanged.

## Verification

- Unit: `session-zone` readings equal the previous engine readings for the existing fixtures.
- Integration: TC-16 with a temporary project, ledger, and run record.
- End-to-end: CA-12 in T09.
- Platforms: Linux, macOS, and Windows; local evidence is Windows.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`
- Environment dependency: none.
- Expected evidence: `tests/unit/session-zone.test.ts`, `tests/integration/wrap-command.test.ts`, and `tests/integration/node-ledger-watcher.test.ts` green.

## Affected files

- Modify: `src/core/services/brake-engine.ts`, `src/cli/argument-parser.ts`, `src/cli/composition-root.ts`, `src/core/services/report-service.ts`, `src/core/contracts/diagnostics.ts`
- Create: `src/core/services/session-zone.ts`, `src/infrastructure/runner/node-ledger-watcher.ts`, `src/cli/run-arguments.ts`, `src/cli/commands/wrap.ts`, and the tests above

## Observability and recovery

- Operational signal: `WARN` outside runner sessions.
- Recovery: none needed.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: the zone extraction, the ledger watcher, and `context-brake wrap` (CMP-09, CMP-10, CMP-18, CMP-22, and part of CMP-25).
  - **`session-zone.ts` (DEC-20).**
    - `readZone`, `ZoneReading`, `ZoneInputs`, and `MeasuredUsage` moved out of `brake-engine.ts` unchanged. `ZoneSettings` is structural (`descriptor.estimation` and `config.telemetry`), so `BrakeEngineOptions` satisfies it and no engine call site changed.
    - `brake-engine.ts` re-exports `MeasuredUsage` and is now 84 lines (was 96).
    - `renderSessionTelemetry(settings, inputs)` always renders the v1 block, ignoring the injection threshold.
  - **`node-ledger-watcher.ts` (DEC-06).**
    - `NodeLedgerWatcher(ledger, intervalMs = 1000)` polls `readLines` and `summarizeLedger` immediately and then on an unref'd interval, without overlapping polls.
    - The reading is the last tool line's `zone` and `{usedTokens, source}`, or `{zone: null, tokens: null}` before any tool line.
    - A failed read re-emits the last reading. `stop()` ends polling and discards results still in flight.
  - **`wrap` (DEC-19).**
    - `run-arguments.ts` `parseWrap` requires `--` as the first argument and a non-blank command after it. Everything after `--`, including options, belongs to the child.
    - `commands/wrap.ts` looks up the session, runs the child, and then appends `\n<block>\n` to stdout. It returns the child's exit code in every path.
    - Outside a runner session, it prints `[WARN] … no active runner session …` to stderr. When telemetry cannot be computed, it prints `[WARN] … session telemetry is unavailable …`.
    - `wrap-telemetry.ts` `findRunnerSession` reads `CONTEXT_BRAKE_RUN_ID` and walks up from the working directory to the first ancestor holding that run's `run.json`, so `wrap` works from a subdirectory. A run with `activeSession: null` counts as outside.
    - `renderWrapTelemetry` loads the configuration, the harness `RuntimeDescriptor` (`runtime-descriptors.ts`), and `composeRuntime`. Without `post_tool_telemetry: supported`, it records one tool line through the engine's `post_tool` path, with `toolUseId: null` and the counted characters, and renders from the ledger. Otherwise it only reads, rendering with `nextTurn` and the pending characters, which mirrors what the harness hook records for this call.
    - `passthrough-process.ts` `runPassthrough` spawns without a shell (stdin inherited, stdout and stderr piped through), counts decoded characters, and maps a signal exit to 1. A spawn failure raises `WrappedCommandStartError`.
  - **`process/executable-command.ts` (DEC-04, shared with T07).**
    - On Windows, `resolveSpawnCommand` resolves the name through `Path` and `PATHEXT`. A `.cmd` or `.bat` runs as `%ComSpec% /d /s /c ""shim" "arg"…"` with `windowsVerbatimArguments`.
    - An argument containing `% ^ & | < > "` or a line break is rejected with `ShimArgumentError` (`code: INVALID_ARGUMENTS`, exit 64 through `handleCommandError`).
    - Other platforms and non-shim executables spawn directly.
  - **Dispatch and help.**
    - `argument-parser.ts` routes `wrap`, `composition-root.ts` dispatches it and lists it in help, and `report-service.ts` and the `cliErrorSchema` command enum in `diagnostics.ts` accept `wrap`.
    - `main.ts` labels parse errors for `wrap` with that command.
- Changed files:
  - Created: `src/core/services/session-zone.ts` (23 non-blank lines), `src/infrastructure/runner/node-ledger-watcher.ts` (55), `wrap-telemetry.ts` (37), `passthrough-process.ts` (37), `runtime-descriptors.ts` (24), `src/infrastructure/process/executable-command.ts` (51), `src/cli/run-arguments.ts` (17), and `src/cli/commands/wrap.ts` (41).
  - Modified:
    - `src/core/services/brake-engine.ts`: the extraction only.
    - `src/infrastructure/runner/node-run-store.ts`: exported `readRunRecord`, used by the class method.
    - `src/cli/argument-parser.ts`, `composition-root.ts`, `main.ts`, `src/core/services/report-service.ts`, and `src/core/contracts/diagnostics.ts`: one enum literal.
    - `tests/test-lanes.ts`: `executable-command.test.ts` and `wrap-command.test.ts` joined the process lane.
  - Tests:
    - Created `tests/unit/session-zone.test.ts`, `tests/unit/wrap-arguments.test.ts`, `tests/integration/node-ledger-watcher.test.ts`, `wrap-command.test.ts`, and `executable-command.test.ts`.
    - Created the helper `tests/helpers/wrap-world.ts`.
    - The brake engine tests are unchanged (`git diff` is empty for `tests/unit/brake-*.test.ts`).
- Checks:
  - `npm run typecheck`: clean.
  - `npm run build`: exit 0.
  - `npm run lint`: the 14 pre-existing prd-03 QA evidence errors only.
  - `npm run coverage`: exit 0. 196 files and 1,212 tests passed, with overall statement coverage at 94.33%. One `wrap` lookup-failure test was added afterward and passes on its own; the source did not change after the full run.
  - The new source files are at 100% statements, except `wrap-telemetry.ts` at 28/29 (the walk ends at the filesystem root) and `wrap.ts` at 91% before the lookup-failure test covered its catch path.
- Acceptance evidence:
  - Inside a runner session below the threshold, the block is appended after the child's output: `wrap-command.test.ts` expects `stdout:3`, then `[ContextBrake v1] turn=2/12 … zone=GREEN`, with exit 3.
  - With Claude Code (`post_tool_telemetry: supported`), the ledger still holds 1 line after `wrap`, so there is no duplicate. OpenCode (unsupported) gets exactly one tool line.
  - Outside a runner session, stdout is exactly the child's output, stderr carries `[WARN]`, there is no block, and exit 3 is kept.
  - `brake-engine.ts` is at 84 lines, and its tests are unchanged and green. The session-zone blocks equal the engine's injected blocks for the yellow, red, and critical-turn fixtures.
  - A real `.cmd` shim ran through `cmd.exe` on Windows and kept exit 5.
- Validated state: Git base `eb2f386` with the T01–T06 changes uncommitted, on Windows 11 with Git Bash, Node v24.19.0, and npm 11.17.0. The POSIX direct-spawn path runs through unit assertions only (PI-03).
- Quality profile:
  - QA-01–QA-05, QA-07, and QA-08: empty over the 15 source files and 7 test files. No declaration has 4 or more parameters, and no file is above 100 lines.
  - Reservation hit QA-06 at `tests/integration/node-ledger-watcher.test.ts:59`: a ledger fake throws a plain `Error('locked')` to simulate an unreadable ledger. It is a test double, not a product error path.
- Open items:
  1. **Deviation disclosed (files).** The task listed four new source files. Spawning belongs in `infrastructure`, and the line limits apply, so these were added: `passthrough-process.ts`, `wrap-telemetry.ts`, `runtime-descriptors.ts`, and `process/executable-command.ts`. The last one holds the DEC-04 rule once, for T07 to reuse. `main.ts` got a one-token change for the parse-error command label.
  2. **Interpretation (subdirectories).** DEC-19 names only `CONTEXT_BRAKE_RUN_ID`. The lookup walks up from the working directory because agents often `cd` into packages. It stops at the first ancestor holding that run id.
  3. **Interpretation (telemetry failures).** A lookup or telemetry error never changes the child's exit code: `wrap` warns on stderr and appends nothing. This keeps CA-12's exit-code guarantee.
  4. **Interpretation (no timeout on the wrapped command).** `node.md` asks for a timeout on child processes, but `wrap` is a transparent passthrough whose lifetime belongs to the harness's own tool timeout (not verified per harness). Adding a ContextBrake timeout would change the wrapped command's behavior. The reviewer may challenge this.
  5. **For T07.** Reuse `resolveSpawnCommand` for the harness executable; it covers the TC-15 shim and forbidden-character behavior. T07 still owns DEC-04's `--harness-arg` rejection message, which `ShimArgumentError` already carries.
  6. **For T08.** Construct `NodeLedgerWatcher(new NodeSessionLedger(projectRoot, clock))` for `RunDependencies.watcher`. `run` must write `activeSession` to `run.json` before the agent can call `wrap`; T04's `onStarted` already does this.

### ADR candidates

None - direct TechSpec implementation or local decision.
