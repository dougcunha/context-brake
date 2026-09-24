# Stable execution context

Load in this exact order:

1. `tasks/prd-04-runner-de-reinicio-automatico/prd.md`
2. `tasks/prd-04-runner-de-reinicio-automatico/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T07 — Harness session process and launchers

## Outcome

- `HarnessSessionProcess` launches a harness from a constant argument vector plus the user's explicit arguments and writes the prompt to stdin. It parses stdout lines through the harness's launcher into neutral events, and stops the process tree with the DEC-05 grace period.
- The Claude Code and Codex CLI launchers parse the documented stream shapes. Other harnesses map to an unsupported reason.
- A fake harness executable, installed on a temporary `PATH`, reproduces both streams.
- `harness-integrations.md` records each harness's non-interactive mode.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T08
- In scope:
  - The executable resolver, including Windows shims, and the session process.
  - The two launchers, with non-strict Zod stream schemas.
  - The launcher registry with unsupported reasons.
  - The base fake harness and its shims, the stream fixtures, and the research update.
- Out of scope: runner orchestration (T04), and fake-harness acceptance scenarios beyond what these integration tests need (T09 extends them).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF1, RF3, RF15 | `prd.md#execução-de-sessões`, `#segurança-da-execução` | Non-interactive launch, end detection, default permissions |
| DEC-01, DEC-02, DEC-04, DEC-05, DEC-18, DEC-22 | `techspec.md#technical-decisions` | Port, supported set, stdin and shims, stop, pass-through, fake |
| CMP-11–CMP-14, CMP-19 (registry part), CMP-27, CMP-28 | `techspec.md#components-and-flow` | Components |
| TC-14, TC-15 | `techspec.md#test-approach` | Integration scenarios |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`
- Existing code:
  - `src/infrastructure/process/node-process-runner.ts`: `discover` and the spawn options.
  - `process-tree.ts`.
  - `tests/support/harness-simulator/process-driver.ts`: how built hooks are invoked.
- Harness reference: `docs/research/harness-integrations.md` §Claude Code and §Codex CLI, and the vendor list in `techspec.md#sources-and-traceability`. First recheck whether Codex accepts the prompt on stdin (TechSpec risk).

## Work

- [x] T07.1 Recheck the vendor docs for `claude -p` and `codex exec`: stdin prompt, stream events, and exit codes.
  - Update `harness-integrations.md` with a dated "Modo não interativo" line per harness, including the DEC-02 unsupported reasons.
  - If Codex stdin is undocumented, apply the TechSpec fallback, and raise an exception HIL when support shrinks.
- [x] T07.2 Implement the executable resolver and Windows shim handling, rejecting forbidden characters.
- [x] T07.3 Implement `HarnessSessionProcess`: spawn, stdin, line splitting, stderr drain, a parse-error count, and a graceful stop followed by tree kill.
- [x] T07.4 Implement the Claude Code and Codex CLI launchers and stream schemas, with fixtures under `tests/fixtures/harnesses/<harness>/`.
- [x] T07.5 Implement the launcher registry with unsupported reasons, and the base fake harness (`tests/support/fake-harness/`) with `claude` and `codex` entrypoints and `.cmd` shims.

## Acceptance criteria

- Argv contains no prompt text, and no permission flag unless it comes through `--harness-arg`.
- Stream parsing:
  - The `started`, `final_text`, `usage`, and `failed` events come from the documented fields.
  - Unknown fields are tolerated.
  - Unparseable lines are counted, not fatal.
- Stopping a hung fake harness leaves no surviving process (pid check).
- A forbidden character in a user argument fails before anything is spawned.

## Verification

- Unit: edge cases of stream-schema parsing.
- Integration: TC-14 and TC-15, in the process lane.
- End-to-end: T09.
- Platforms: Linux, macOS, and Windows. The Windows shim path is verified locally; the POSIX paths are recorded as unverified locally.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`
- Environment dependency: none (no real harness).
- Expected evidence: the integration suites green, and the research section updated with the date and links.

## Affected files

- Create:
  - Launchers: `src/infrastructure/harnesses/claude-code/session-launcher.ts` and `session-stream.ts`; `src/infrastructure/harnesses/codex-cli/session-launcher.ts` and `session-stream.ts`.
  - Runner process: `src/infrastructure/runner/harness-session-process.ts`, `executable-resolver.ts`, `launcher-registry.ts`.
  - Fake harness and fixtures: `tests/support/fake-harness/*`, `tests/fixtures/harnesses/claude-code/stream-*.jsonl`, `tests/fixtures/harnesses/codex-cli/exec-*.jsonl`.
  - Tests: `tests/integration/claude-code-session-launcher.test.ts`, `codex-cli-session-launcher.test.ts`, `harness-session-process.test.ts`.
- Modify: `docs/research/harness-integrations.md`

## Observability and recovery

- Operational signal: the `streamParseErrors` count per session.
- Recovery: none needed.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - `NodeHarnessSessionProcess` (CMP-13) spawns the harness from the launcher argv through `resolveSpawnCommand` (DEC-04 shim rule, reused from T06), merges `CONTEXT_BRAKE_RUN_ID` and other request variables into the inherited environment, writes the prompt to stdin and closes it, drains stderr, and splits stdout lines through `readline`. A line whose `parseLine` throws is counted in `unparsedLines` (the `streamParseErrors` signal) and never ends the session. `stop()` sends SIGINT to the process group on POSIX, waits the 10 s grace (`STOP_GRACE_MILLISECONDS`, configurable for tests), then calls `killProcessTree`. On Windows it kills the tree directly (DEC-05). A spawn error or a rejected shim argument resolves `exit` with `spawnFailed: true` and spawns nothing.
  - The launchers (CMP-11, CMP-12) build constant argv. Claude Code uses `-p --output-format stream-json --verbose`, and Codex CLI uses `exec --json` with the `-` stdin sentinel last. User `--harness-arg` values are appended verbatim, and no permission flag is ever added (DEC-18).
  - The stream schemas are non-strict Zod. They produce `started` from `system/init.session_id` and `thread.started.thread_id`, and `final_text` from `result.result` (success, `is_error` false) and `item.completed` `agent_message.text`. `usage` is the Claude sum of input, output, and both cache counts, or Codex `input_tokens + output_tokens`, since cached and reasoning tokens are subsets. `failed` comes from Claude error results (text, then `errors[]`, then subtype) and from Codex `turn.failed.error.message` and `error.message`. Other event types yield no events. Non-JSON lines, lines without a string `type`, and known events missing a read field throw `StreamLineError` (`harnesses/common/stream-line.ts`).
  - `launcher-registry.ts` (the CMP-19 registry part) returns a launcher for `claude-code` and `codex-cli`, and a DEC-02 reason for each other harness. `executable-resolver.ts` (CMP-14) discovers the executable through `ProcessRunner.discover`. It returns the found name (so Windows spawn resolves the `.cmd` through PATHEXT instead of the extensionless npm script that `where.exe` lists first) plus a `shim` flag. `assertHarnessArguments` lets T08 reject forbidden shim characters with `INVALID_ARGUMENTS` before anything starts.
  - The fake harness (CMP-27, DEC-22) is `tests/support/fake-harness/fake-harness.mjs` with `claude` and `codex` entrypoints. `install.ts` writes `.cmd` shims on Windows and `sh` scripts on POSIX. Scenario fields: `record` (argv, stdin, run id, cwd), `sessionId`, `finalText`, `tokens`, `failure`, `exitCode`, `noise`, `hang.pidFile` (spawns a grandchild), and `ignoreInterrupt`.
  - T07.1: the vendor docs were rechecked on 2026-09-24. Codex documents the stdin prompt through `-` ("If you omit the prompt argument, Codex reads the prompt from stdin"), so the TechSpec fallback and the exception HIL are not needed (O-01 closed). `docs/research/harness-integrations.md` gained a dated "Modo não interativo" line per harness: the Claude Code and Codex CLI stream fields with sources, and the DEC-02 reasons for the other six harnesses.
- Changed files:
  - Created, src: `src/infrastructure/harnesses/common/stream-line.ts`, `claude-code/session-stream.ts`, `claude-code/session-launcher.ts`, `codex-cli/session-stream.ts`, `codex-cli/session-launcher.ts`, `src/infrastructure/runner/harness-session-process.ts`, `executable-resolver.ts`, `launcher-registry.ts`.
  - Created, tests: `tests/support/fake-harness/fake-harness.mjs`, `install.ts`; `tests/helpers/fake-session.ts`, `stream-fixtures.ts`; fixtures `tests/fixtures/harnesses/claude-code/stream-{success,auth-failure,error-subtype}.jsonl` and `codex-cli/exec-{success,failed}.jsonl`; tests `tests/unit/session-stream.test.ts`, `launcher-registry.test.ts`, `tests/integration/claude-code-session-launcher.test.ts`, `codex-cli-session-launcher.test.ts`, `harness-session-process.test.ts`, `harness-session-stop.test.ts`.
  - Modified: `tests/test-lanes.ts` (the two process-spawning suites in `PROCESS_LANE_FILES`, L-02) and `docs/research/harness-integrations.md`.
- Checks (final state, 2026-09-24):
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npm run lint`: 14 errors, all the prd-03 `qa_01/evidence/*.mjs` baseline (L-05); none new.
  - `npm run coverage`: 202 files and 1,254 tests pass. All files 94.4% lines, 89.03% branches.
  - New-file coverage: launchers, streams, registry, and resolver 100%; `stream-line.ts` 100% lines; `harness-session-process.ts` 85.88% lines.
  - The T07 suites: 41 tests (unit 25, fixture integration 9, process integration 7). TC-14 and TC-15 pass. The Windows run exercises the real `.cmd` shim through `cmd.exe`, the forbidden-character rejection with no spawn (record file absent), and a hung harness plus grandchild stopped with no surviving pid, with and without `ignoreInterrupt`.
  - Quality profile QA-01 to QA-08 over the task's TypeScript files: no hits. Two QA-06 hits in tests and a 104-line `harness-session-process.ts` were removed before the handoff.
- Validated state: HEAD `eb2f386` plus the uncommitted T01–T07 worktree; Windows 11, Node v24.19.0; no real harness, network, or credentials.
- Open items:
  1. POSIX paths are unverified locally (PI-03). These are the SIGINT-to-group grace branch (`harness-session-process.ts:79-82,93-100`, the only uncovered lines) and the `sh` fake-harness entrypoints. The stop test runs on every platform and covers both branches in CI.
  2. For T08: call `sessionLauncherFor`, and map `supported: false` to `RUN_HARNESS_UNSUPPORTED` with the reason. Call `resolveHarnessExecutable(launcher.executableNames, { processes })`, and map `null` to `RUN_HARNESS_MISSING`. Call `assertHarnessArguments(executable, harnessArgs)` in preflight so `ShimArgumentError` becomes `INVALID_ARGUMENTS` exit 2, instead of a `harness_error` session. Build `NodeHarnessSessionProcess({ cwd: projectRoot })`. `SessionCommand.executable` is the logical name, so the resolved name must replace it or match it.
  3. For T09: the fake harness does not yet run the built `SessionStart` and `PostToolUse` hooks, write the checkpoint, or follow a multi-session script. DEC-22 assigns those acceptance scenarios to T09, which extends `fake-harness.mjs` and `FakeScenario`.
  4. Interpretations: `parseLine` signals an unparseable line by throwing (the port returns events only). The session process has no own timeout because the core loop enforces the session deadline and calls `stop()` (DEC-09). The stdin `error` handler (EPIPE when a harness exits before reading) is a no-op because the exit status reports the failure. Codex exit codes are undocumented, so non-zero or a `failed` event means `harness_error`, as the core already decides.

### ADR candidates

None - direct TechSpec implementation or local decision.
