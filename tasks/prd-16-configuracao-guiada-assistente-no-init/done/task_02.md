# Stable execution context

Load in this exact order:

1. `tasks/prd-16-configuracao-guiada-assistente-no-init/prd.md`
2. `tasks/prd-16-configuracao-guiada-assistente-no-init/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Terminal, trigger rule, and prompt port

## Outcome

`init` knows whether both standard streams are terminals, decides with a pure rule whether the assistant would run, and refuses `--interactive` without a terminal with a message that names the flags to use. A prompt port with a production readline implementation and a scripted fake exists for the following tasks. Plain `init` is unchanged.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T03, T05
- In scope: `TerminalInfo` and default detection; `shouldRunAssistant`; the `--interactive` no-TTY gate in `runInit`; `PromptPort`, `ReadlinePromptPort`, `confirmWithPort`; `CommandEnv.terminal`/`prompts`; the scripted fake and terminal injection in `runInProcessCli`.
- Out of scope: the questions, summary, and wiring that starts the assistant (T03..T05). With a terminal and `--interactive`, `runInit` continues as today until T05.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Trigger rule; `--interactive` without a TTY is an argument error |
| FR-08 | `prd.md#functional-requirements` | Non-TTY runs keep today's `CONFIRMATION_REQUIRED` |
| FR-10 | `prd.md#functional-requirements` | Fallback message where Node sees no TTY |
| NFR-01, NFR-03 | `prd.md#non-functional-requirements` | Line-based prompts; tests without a TTY |
| DEC-01, DEC-02, DEC-09 | `techspec.md#technical-decisions` | Trigger, port, fallback message |
| CMP-03, CMP-04, CMP-09 | `techspec.md#components-and-flow` | `terminal.ts`, `prompt-port.ts`, helpers |
| TC-04, TC-05 | `techspec.md#test-approach` | Trigger matrix; gate |

## Context to recover on demand

- Applicable skills and rules: `node.md` (no raw mode, stdout belongs to the CLI), `cli-output.md` (never prompt when stdin is not a TTY), `code-standards.md`, `tests.md`.
- Existing code: `src/cli/commands/init.ts` (`CommandEnv`, `runInit`, 57 lines); `src/cli/confirmation.ts` (`authorizeWrite`, readline use); `src/cli/main.ts` (overrides reach `CommandEnv`); `tests/helpers/in-process-cli.ts`.
- Contract or integration: `techspec.md#decisions` DEC-01, DEC-02, DEC-09; exact not-interactive message in DEC-09.

## Work

- [x] T02.1 Add `src/cli/terminal.ts`: `TerminalInfo { stdinIsTty, stdoutIsTty }`, `detectTerminal()` from the process streams, `shouldRunAssistant(args, terminal)`, `NOT_INTERACTIVE_MESSAGE`.
- [x] T02.2 Add `src/cli/assistant/prompt-port.ts`: `PromptPort.ask(question) → string | null` (null on end of input or Ctrl+C), `ReadlinePromptPort` closing its interface, `confirmWithPort(prompts, message) → boolean`.
- [x] T02.3 `CommandEnv` gains optional `terminal` and `prompts`; `runInit` raises `CliArgumentError(NOT_INTERACTIVE_MESSAGE)` for `--interactive` when `terminal` is not a TTY on both streams, before reading anything else; keep `runInit` at or below its current length.
- [x] T02.4 Add `tests/helpers/scripted-prompts.ts` (scripted answers, records questions, returns `null` when exhausted) and let `runInProcessCli` accept `terminal` and `prompts` overrides.
- [x] T02.5 Tests: `tests/unit/terminal.test.ts` (TC-04), `tests/integration/init-interactive-gate.test.ts` (TC-05, including plain non-TTY `init` still raising `CONFIRMATION_REQUIRED`).

## Acceptance criteria

- `shouldRunAssistant` is true only for `--interactive`, or for both-TTY with no `--yes`, `--json`, or configuration flag; `--dry-run` alone does not suppress it.
- `init --interactive` without a TTY on either stream exits `64` with the not-interactive message and writes nothing; `--json` prints the same message in the error document.
- `init` without `--yes` on a non-TTY still exits `2` with `CONFIRMATION_REQUIRED`; every existing `init` test passes unchanged.
- The scripted port needs no TTY; the production port is exercised only through a small in-process stream test, not a pseudo-terminal.

## Verification

- Unit: trigger matrix; scripted port; `ReadlinePromptPort` with in-memory streams (answer, EOF → null).
- Integration: `runInProcessCli` with injected `terminal`.
- End-to-end: not applicable here (TC-14 in QA).
- Manual: none.
- Platforms: Linux, macOS, Windows.
- Commands: `npm test -- tests/unit/terminal.test.ts tests/integration/init-interactive-gate.test.ts`, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: tests citing `FR-01`, `FR-08`, `TC-04`, `TC-05`; lint, typecheck, coverage green.

## Affected files

- Modify: `src/cli/commands/init.ts`, `tests/helpers/in-process-cli.ts`
- Create: `src/cli/terminal.ts`, `src/cli/assistant/prompt-port.ts`, `tests/helpers/scripted-prompts.ts`, `tests/unit/terminal.test.ts`, `tests/integration/init-interactive-gate.test.ts`

## Observability and recovery

- Operational signal: the not-interactive message names the cause and the flags.
- Recovery: revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `shouldRunAssistant(args, terminal)` implements the DEC-01 rule (true for `--interactive`, or both streams TTY with no `--yes`, `--json`, or configuration flag; `--dry-run` alone does not suppress it). `init --interactive` without a TTY on both streams exits 64 with `NOT_INTERACTIVE_MESSAGE` (names the flags to use) before reading anything else; a plain non-TTY `init` without `--yes` still exits 2 with `CONFIRMATION_REQUIRED`. `PromptPort` (`ask` returns `null` on end of input or Ctrl+C), `ReadlinePromptPort` (line-based, no raw mode of its own, closes cleanly), and `confirmWithPort` exist; `CommandEnv` has optional `terminal` and `prompts`. The assistant itself is not wired yet (T05): with a terminal, `init` behaves as before.
- Changed files: created `src/cli/terminal.ts`, `src/cli/assistant/prompt-port.ts`, `tests/helpers/scripted-prompts.ts`, `tests/unit/terminal.test.ts`, `tests/integration/init-interactive-gate.test.ts`; modified `src/cli/commands/init.ts` (59 lines; one added line in `runInit`, which stays under 30 lines), `tests/helpers/in-process-cli.ts` (new `runInProcessCliWith(args, { cwd, env, overrides })`; `runInProcessCli` keeps its signature and now injects a non-TTY terminal by default so tests do not depend on the machine running them).
- Checks: `npm run lint`, `npm run typecheck` clean; `npm run coverage`: 239 files, 1321 tests passed, 94.38%, wall time 182.4 s; quality sweep over the three touched `src/` files returned no hit and no file above 100 lines.
- Validated state: HEAD `b216aba` plus the uncommitted working tree; Windows 11, Node 24.19.
- Open items: (1) The 182.4 s wall time is 2 s above the 180 s budget of `AGENTS.md`; the previous task measured 138.5 s with 20 fewer tests, and the 20 new tests run in milliseconds, so this looks like load on the development machine (the budget was raised for that reason). T06 re-measures with `npm run test:budget`; a real regression goes to the user. (2) The full readline path over a real pseudo-terminal (Ctrl+C in raw mode) is covered only by the in-memory stream test and the deferred real-terminal probe.

### ADR candidates

None - direct TechSpec implementation or local decision.
