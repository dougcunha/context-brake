# TechSpec — Interactive configuration assistant in init

## Sources and traceability

- PRD: `tasks/prd-16-configuracao-guiada-assistente-no-init/prd.md` (approved, DEC-HIL-01; sha256 `e4eceeca…26975`).
- Applicable instructions, rules, and skills: `AGENTS.md`, `.agents/rules/` (`code-standards`, `javascript-typescript`, `node`, `tests`, `cli-output`, `file-changes`); `sdd-create-techspec` references. The test budget in `AGENTS.md` and `tests.md` is now 180 s (commit `b216aba`); it wins over the 120 s in PRD NFR-03.
- Research: no harness behavior changes. The terminal probe (FR-10) adds `docs/research/terminal-tty.md` and an index row in `docs/research/README.md`.
- Evidence in existing code: `src/cli/init-arguments.ts` (flags, `parseInit`, `assertAutoRestartTarget`, `assertStatuslineBridgeTarget`); `src/cli/commands/init.ts` (`CommandEnv`, `runInit`); `src/cli/confirmation.ts` (`authorizeWrite`, `ConfirmationRequiredError`); `src/cli/init-config-state.ts`, `init-config-updates.ts`; `src/core/services/snapshot-merge.ts`, `auto-restart-merge.ts`, `debug-mode-merge.ts`; `src/core/contracts/auto-restart.ts` (1..10, default 2); `src/core/services/restart-install-extras.ts` (`harnessRestartMode`); `src/core/services/restart-mode.ts` (`restartMode`: snapshot, handoff, off); `src/cli/main.ts` (argument errors exit 64); prd-15 `resolveHarnessExclusion` and persistent exclusion.

## Solution summary

The assistant is a front end that produces **a list of `init` flags**, never configuration directly. `init` runs the assistant before planning, gets the list, appends the non-configuration flags the person gave (`--dry-run`), and re-parses the whole list with the same `parseInit` used for typed flags. The same list, quoted for the shell, is the printed equivalent command. Equivalence (OBJ-01, OBJ-02) therefore holds by construction, no rule is duplicated (each answer is checked with the existing merge functions and constants), and `--yes`, `--json`, flags, and non-TTY runs never reach the new code (FR-08).

New code lives in `src/cli/assistant/` behind a `PromptPort` (line-based, `node:readline/promises` in production, a scripted fake in tests). `--max-restarts` is a normal flag handled by `mergeAutoRestart`. The Git Bash question is answered by a runtime check on both streams plus a documented probe: where Node sees no TTY, nothing changes for a plain `init` and `--interactive` explains and names the flags.

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-01, FR-08, NFR-02 | `shouldRunAssistant(args, terminal)` (pure, `cli/terminal.ts`): true when `args.interactive`, or when both `terminal.stdinIsTty` and `terminal.stdoutIsTty` hold and `!yes && !json && !hasConfigurationFlag(args)`. `hasConfigurationFlag` counts `--harness`, `--exclude-harness`, any snapshot flag, `--debug`/`--no-debug`, `--statusline-bridge`/`--no-statusline-bridge`, `--auto-restart`/`--no-auto-restart`, `--max-restarts`; it does not count `--dry-run`. `--interactive` with `--yes` or `--json` is rejected in `parseInit` (exit 64, names both flags); `--interactive` without a TTY on both streams is rejected in `runInit` before any prompt (exit 64) with a message that says the terminal is not interactive and names the flags to use | OI-16-01 (DEC-HIL-01). Parse-time checks need no terminal; the TTY check needs the streams, so it lives where they are injected | Reading `process.stdin` inside `parseInit`: untestable, couples parsing to the process |
| DEC-02 | FR-01, FR-07, NFR-01, NFR-03 | `CommandEnv` gains optional `terminal?: TerminalInfo` and `prompts?: PromptPort`; defaults come from `process.stdin.isTTY`/`process.stdout.isTTY` and a `ReadlinePromptPort`. `PromptPort.ask(question): Promise<string \| null>` returns `null` on end of input or Ctrl+C. The production port creates one `readline` interface per session and closes it before `authorizeWrite` runs elsewhere; when the assistant ran, the final confirmation goes through the same port (`confirmWithPort`), so tests need no TTY. `authorizeWrite` and `remove` are untouched | PRD constraint: prompts through a port wired by `src/cli/`. Readline is line-based with no raw mode (NFR-01) | Prompt libraries (inquirer): new dependency, raw mode, no gain |
| DEC-03 | FR-02, FR-03, FR-04, FR-05 | The questions are small modules returning `AssistantStep` results (`flags: string[]`, plus facts for the summary), run in the FR-02 order by `runAssistant(context, prompts)`. Each answer is validated by the existing rules: snapshot command/trigger/resume through `mergeSnapshot` (single-line, trimmed, length, resume needs command), the limit against `MIN/MAX_CONSECUTIVE_RESTARTS`, harness numbers against the listed ids. A failed rule prints the rule on one line and re-asks; nothing is written. Defaults: current configuration, else today's flag defaults (RED trigger, restart off, debug off, bridge on); harness preselection is the current `activeHarnesses`, or the detected project harnesses on a first run | `snapshot-merge.ts:13-24`, `auto-restart.ts:3-5` already hold the rules; the assistant adds none | Re-validating only at the end through `parseInit`: the person would lose answers |
| DEC-04 | FR-02, FR-03 | Question order and applicability: (1) harnesses (numbered list of all ids, detected ones marked with support level, current active ones preselected; type numbers separated by spaces or blank to keep); (2) snapshot command or none; (3) trigger and resume command only when a command is set; (4) restart on/off, **asked only when at least one selected harness has a restart mode** (`harnessRestartMode`), listing each selected harness with its mode, and stating that without a snapshot command and with restart on the agent writes a markdown handoff (`restartMode`); (5) limit 1..10 only when restart is on; (6) status line bridge only when `claude-code` is selected; (7) debug. A harness with no restart mode never produces `--auto-restart`, so the assistant cannot trigger `AUTO_RESTART_TARGET_ERROR` | "Questions that do not apply are not asked" (FR-02). Interpretation for restart: see OI-01 | Always asking restart and rejecting it later: contradicts FR-04's re-ask intent |
| DEC-05 | FR-05, FR-06 | Answers become flags: `--harness <id>` for every selected harness, `--exclude-harness <id>` for every deselected detected harness (prd-15 persistent exclusion, so the plan equals the plan of the equivalent prd-15 run), `--snapshot-command`/`--no-snapshot-command`, `--snapshot-trigger`, `--resume-command`, `--auto-restart`/`--no-auto-restart`, `--max-restarts N`, `--statusline-bridge`/`--no-statusline-bridge`, `--debug`/`--no-debug`. A flag is emitted only when the answer differs from the starting state; an omitted flag means keep, so the plan is identical either way. The bridge answer "yes" emits `--statusline-bridge` only when the opt-out marker exists (`STATUSLINE_OPT_OUT_FILE` snapshot present), else nothing | One serialization is used both to run and to print, so they cannot diverge | Building `ParsedInitArgs` directly: a second path that can drift from the typed flags |
| DEC-06 | FR-06, NFR-02 | `formatEquivalentCommand(flags)` prints `context-brake init <flags>`. A value made only of `[A-Za-z0-9_@%+=:,./-]` is bare; any other value is wrapped in single quotes, which PowerShell and POSIX shells both treat literally. A value that contains a single quote has no form valid in both families, so two labeled lines are printed (POSIX with `'\''`, PowerShell with `''`). Text mode only; `--json` never prints it | Shell-neutral for the common case, exact for the rare one, no expansion of `$` or backticks | Double quotes: `$`, backtick, and `\` behave differently per shell |
| DEC-07 | FR-07 | After the questions the assistant prints the summary and the equivalent command, then `init` shows the usual preview and asks the usual confirmation once. `null` from any prompt (Ctrl+C or end of input) prints `Nothing was written.` and returns the exit code of a declined confirmation (`0`). `--dry-run` goes through the assistant, shows the plan, and writes nothing | Existing decline path `runInit` returns `0` | A distinct cancel code: breaks the "same as a declined confirmation" criterion |
| DEC-08 | FR-09 | `--max-restarts <N>`: parse-time check for an integer in 1..10 (argument error naming the rule) and for `--no-auto-restart`; `mergeAutoRestart` receives `maxRestarts` and: with restart off in the configuration and no `--auto-restart` returns the argument error; with `--auto-restart` and no configuration sets `maxConsecutiveRestarts = N`; with restart already on, N replaces the stored value. `AutoRestartUpdate` `set` carries an optional `maxConsecutiveRestarts`; `applyAutoRestart` and the config summary use it. `isAutoRestartWanted` is unchanged | Reuses the merge pattern of `--debug` and the snapshot flags | A separate config command: out of scope (PRD) |
| DEC-09 | FR-10, NFR-04 | The trigger uses both stream flags at run time, so the fallback needs no per-terminal code: no TTY means no assistant, a plain `init` behaves as today, and `--interactive` fails with `The terminal is not interactive (stdin or stdout is not a TTY). Use flags such as --harness, --snapshot-command, --auto-restart, --max-restarts, or --yes.` The measurement is a manual acceptance step: a one-line probe (`node -p "[process.stdin.isTTY, process.stdout.isTTY]"`) plus `context-brake init --interactive --dry-run` in Git Bash (mintty, with and without its pseudo-console option where available), PowerShell 7, and Windows PowerShell 5.1, recorded with Node, shell, and terminal versions in `docs/research/terminal-tty.md`. The agent session cannot open those terminals | Behavior does not depend on the result, only the documentation does. See OI-02 | Guessing mintty behavior: PRD asks for measurement |
| DEC-10 | structural | Absorb: `runInit` (about 30 lines) must not grow, so the assistant resolution and the second half of the flow move to `cli/assistant/assistant-session.ts` and a helper in `init.ts`; `init-arguments.ts` (65 lines) adds `parseInit` options and `hasConfigurationFlag` and moves the statusline/auto-restart assertions to `init-assertions.ts` if it would pass 100 lines | Terrain baseline below | Preparatory refactoring feature: not warranted |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/cli/init-arguments.ts` (+ `init-assertions.ts` if needed) | Modified | `--interactive`, `--max-restarts`, parse-time conflicts, `hasConfigurationFlag` | — |
| CMP-02 | `src/core/services/auto-restart-merge.ts`, `src/core/services/installation-builder.ts` summary | Modified | `maxRestarts` rules and update value (DEC-08) | CMP-01 |
| CMP-03 | `src/cli/terminal.ts` | New | `TerminalInfo`, default detection, `shouldRunAssistant`, non-interactive message (DEC-01, DEC-09) | CMP-01 |
| CMP-04 | `src/cli/assistant/prompt-port.ts` | New | `PromptPort`, `ReadlinePromptPort`, `confirmWithPort` (DEC-02) | — |
| CMP-05 | `src/cli/assistant/questions-harness.ts`, `questions-snapshot.ts`, `questions-restart.ts`, `questions-misc.ts` | New | The question steps with validation and facts (DEC-03, DEC-04) | CMP-04, CMP-02 |
| CMP-06 | `src/cli/assistant/equivalent-command.ts`, `summary.ts` | New | Quoting and summary text (DEC-06, DEC-07) | CMP-05 |
| CMP-07 | `src/cli/assistant/assistant-session.ts` | New | Orders the steps, handles cancel, returns the flag list (DEC-05, DEC-07) | CMP-05, CMP-06 |
| CMP-08 | `src/cli/commands/init.ts` | Modified | `CommandEnv` fields, runs the session, re-parses flags, confirms through the port (DEC-02, DEC-10) | CMP-03, CMP-07 |
| CMP-09 | `tests/helpers/scripted-prompts.ts`, `in-process-cli.ts` | New, Modified | Scripted `PromptPort`, terminal injection through `main` overrides | CMP-04 |
| CMP-10 | `docs/research/terminal-tty.md`, `docs/research/README.md`, `README.md` | New, Modified | Probe table, flag documentation (DEC-09) | — |

Flow: `parseInit(argv)` → `loadInitConfigState` (prd-15: tolerant read, exclusion) → `collectHarnessSources` (detections, as today) → `shouldRunAssistant`? yes: `runAssistant` (questions with defaults from the state and detections) → flags + summary + equivalent command → `parseInit([...flags, ...kept])` → the existing plan, preview, and confirmation (through the port) → apply. The preview and plan code is unchanged.

## Contracts and data

- CLI: new `init` flags `--interactive` (boolean) and `--max-restarts <1..10>`. Exit codes unchanged: argument errors `64`, declined or cancelled `0`, `CONFIRMATION_REQUIRED` `2`.
- Configuration: unchanged shape. `autoRestart.maxConsecutiveRestarts` already exists (1..10, default 2).
- Reports: `--json` documents and their schemas are unchanged; the summary and equivalent command are text only.
- Equivalent command examples: `context-brake init --harness claude-code --harness codex-cli --auto-restart --max-restarts 3`; a value with a space: `--snapshot-command '/sdd snapshot'`.

## Integrations and interfaces

CLI only: no hook, plugin, or process. The prompt reads `process.stdin` and writes `process.stdout`; errors go to stderr as today. No child process is started by the assistant, so `PROCESS_LANE_FILES` does not change.

## Errors, security, and recovery

- Errors and edges: invalid answer → rule line and re-ask; end of input → cancel, exit `0`; `--interactive` conflicts → exit `64`; configuration with unrecognized keys (prd-15) is repaired in the normal preview after the assistant; a project with no detected harness lists all ids with none preselected; a restart-capable harness absent from the selection hides the restart questions; a command value containing a single quote prints two labeled lines.
- User files and sensitive data: the assistant writes nothing; all writes go through the existing plan, preview, and confirmation (`file-changes.md`). Prompts echo no secrets and nothing is logged.
- Concurrency and idempotency: unchanged; running the printed command twice plans no change the second time.
- Rollback or reversal: cancel at any prompt; `init --dry-run`; `remove`.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| S1 `--max-restarts` and `--interactive` parsing, `mergeAutoRestart` | — | TC-01..TC-03 |
| S2 `TerminalInfo`, `shouldRunAssistant`, `PromptPort`, scripted prompts | S1 | TC-04, TC-05 |
| S3 Question steps and `equivalent-command` / `summary` | S1, S2 | TC-06..TC-09 |
| S4 `assistant-session`, `init` wiring, cancel, dry run, equivalence | S2, S3 | TC-10..TC-13 |
| S5 Docs, probe document, gates, manual acceptance | S4 | TC-14, TC-15 |

## Test approach

- Profile: Node.js >= 20, ESM TypeScript strict, Vitest; CLI only; commands from `AGENTS.md` (`npm run lint`, `typecheck`, `coverage`, `test:budget`, `schemas:check`). The assistant runs in process through the scripted `PromptPort` and an injected `TerminalInfo`; no pseudo-terminal and no child process.
- End-to-end: the built CLI is run by QA only for what a pipe can show: a non-TTY `init` still fails with `CONFIRMATION_REQUIRED`, `--interactive` without a TTY exits `64` with the message, `--max-restarts` writes the value, and the printed equivalent command (copied from an in-process session) replays on a copy of the fixture to the same configuration bytes (TC-14). A real keyboard session is manual acceptance.
- Platforms: logic on all three; quoting tests assert both families' strings; the TTY behavior of PowerShell 7, Windows PowerShell 5.1, and Git Bash is measured by the person (DEC-09). Linux and macOS terminals are not driven in this repository's environment and stay unverified.
- Command prerequisites and exclusions: none beyond a temporary directory and the existing in-process helpers (`fakeOverheadMeasurer`, `fakeProcessRunner`).
- Manual acceptance (owner: the person; needs real terminals; deferred at HIL 2, so it is not run in this cycle): in Git Bash (mintty), PowerShell 7, and Windows PowerShell 5.1 run the probe one-liner and `context-brake init --interactive --dry-run`; answer the questions once in the terminals where Node sees a TTY; paste the results into `docs/research/terminal-tty.md`. Expected: either the assistant runs to the plan, or `--interactive` prints the not-interactive message and a plain `init` behaves as before.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-09 | unit | `mergeAutoRestart` with `maxRestarts` against restart off/on, `--auto-restart`, `--no-auto-restart` | N stored when allowed; the four argument errors name their rule; out-of-range and non-integers rejected at parse | `tests/unit/auto-restart-merge.test.ts`, `init-arguments.test.ts` |
| TC-02 | FR-09, OBJ-04 | integration | `init --auto-restart --max-restarts 3 --yes`, then `--max-restarts 5 --yes`, then `--max-restarts 11` | Config has 3, then 5; the last exits 64 | `tests/integration/init-max-restarts.test.ts` |
| TC-03 | FR-01 | unit | `parseInit` with `--interactive` plus `--yes` or `--json`; `hasConfigurationFlag` matrix | Argument errors naming both flags; flag matrix as DEC-01 | `tests/unit/init-arguments.test.ts` |
| TC-04 | FR-01, FR-08, FR-10 | unit | `shouldRunAssistant` over TTY/non-TTY streams × flags × `--interactive` | Assistant only in the DEC-01 cases | `tests/unit/terminal.test.ts` |
| TC-05 | FR-01, FR-10, FR-08 | integration | `init --interactive` without a TTY; plain `init` without `--yes` on a non-TTY | Exit 64 with the not-interactive message and no write; `CONFIRMATION_REQUIRED` as today | `tests/integration/init-interactive-gate.test.ts` |
| TC-06 | FR-02, FR-03 | unit | Scripted sessions over harness × snapshot × restart × limit × bridge × debug combinations | Exactly the applicable questions in order; defaults from the state; facts shown (support level, restart modes, handoff note) | `tests/unit/assistant-questions.test.ts` |
| TC-07 | FR-04 | unit | Invalid answers: command with newline or over 200 characters, resume without command, trigger not YELLOW/RED, limit 0 and 11, bad harness number | Rule line, same question again, then accepts a valid answer | `tests/unit/assistant-questions.test.ts` |
| TC-08 | FR-06, NFR-02 | unit | `formatEquivalentCommand` with bare values, spaces, and a single quote | Bare/single-quoted; two labeled lines for the quote case; parseable back by `parseInit` | `tests/unit/equivalent-command.test.ts` |
| TC-09 | FR-05 | integration | Deselect a detected installed harness in a scripted session | Plan equals the plan of `init --exclude-harness <id>` (prd-15 FR-05) | `tests/integration/init-assistant-exclusion.test.ts` |
| TC-10 | FR-06, OBJ-01, OBJ-02 | integration | Scripted sessions for supported combinations; replay the printed command non-interactively on a copy of the starting fixture | Same plan JSON and byte-identical configuration | `tests/integration/init-assistant-equivalence.test.ts` |
| TC-11 | FR-07 | integration | Cancel by `null` at the first, a middle, and the confirmation prompt; `--dry-run` with the assistant | `Nothing was written.`, exit `0`, no file changes; dry run prints the plan only | `tests/integration/init-assistant-cancel.test.ts` |
| TC-12 | FR-08, OBJ-03 | suite | All existing `init` tests with `--yes`, `--json`, flags, and non-TTY input | Pass unchanged | `npm test` |
| TC-13 | NFR-01, NFR-02 | unit | `NO_COLOR`, no meaning by color alone; `--json` never prompts or prints the summary | Plain text output; JSON document unchanged | `tests/unit/assistant-output.test.ts` |
| TC-14 | OBJ-02, FR-08, FR-09 | end-to-end (QA) | Built CLI: non-TTY gate, `--interactive` exit 64, `--max-restarts`, replay of a printed command | As TC-02, TC-05, TC-10 on the built artifact | `sdd-execute-qa` run, `npm run build` |
| TC-15 | FR-10, OBJ-05, NFR-04 | manual | Terminal probe and `init --interactive --dry-run` in Git Bash, PowerShell 7, Windows PowerShell 5.1 | Table filled in `docs/research/terminal-tty.md`; fallback message verified where there is no TTY | person, real terminals |

## Quality profile

Rules this feature can violate. A blocking hit prevents task completion and rejects the review; a reservation becomes an optional improvement and counts toward escalation. A hit covered by `DEC-NN` is expected, not a finding.

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | No `any` (`: any`, `as any`, `<any>`) | blocking | `"${RG[@]}" ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | — |
| QA-02 | No `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `"${RG[@]}" '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-03 | No empty `catch` or `.catch(() => {})` | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | — |
| QA-04 | `core` does not import `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-05 | `exec`, `execSync`, `shell: true` (the assistant starts no process) | blocking | `"${RG[@]}" '\bexecSync\(\|\bexec\(\|shell:\s*true' "${files[@]}"` | — |
| QA-06 | `throw new Error(` only where no dedicated class fits (use `CliArgumentError`) | reservation | `"${RG[@]}" 'throw new Error\(' "${files[@]}"` | — |
| QA-07 | 4+ parameters in one declaration | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"` | — |
| QA-08 | File above 100 lines | reservation | `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | `DEC-10` keeps every target at or below 100 lines |

- Verification scope: every TypeScript file in the task diff; `core_files` is the subset under `src/core/`. No in-process or hook-path files are touched.
- Escalation trigger: 8+ reservation hits, a touched file above 200 lines, or duplication in 3+ places.

### Terrain baseline

Measured at HEAD `b216aba` over the existing files the feature modifies. Max parameters and cases are zero hits in all rows; quality-profile commands returned no hit.

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/cli/commands/init.ts` | 57 | 2 | ≤3 | 0 | none (`runInit` is about 30 lines: it must not grow) | absorbed in `DEC-10` |
| `src/cli/init-arguments.ts` | 65 | 4 | ≤3 | 0 | none | absorbed in `DEC-10` |
| `src/cli/init-config-state.ts` | 28 | 3 | ≤3 | 0 | none | recorded |
| `src/cli/init-config-updates.ts` | 30 | 2 | ≤3 | 0 | none | recorded |
| `src/cli/argument-validator.ts` | 27 | 3 | ≤3 | 0 | none | recorded |
| `src/cli/confirmation.ts` | 21 | 2 | ≤3 | 0 | none (read, not modified) | recorded |
| `src/core/services/auto-restart-merge.ts` | 27 | 6 | ≤3 | 0 | none | recorded |

- Preparatory refactoring: not recommended. No target file crosses a structural threshold, and the two largest are handled by extractions in the same tasks (`DEC-10`).

## Observability and rollout

- Signals: the printed summary and equivalent command; the existing install report.
- Migration and compatibility: none. Scripts, CI, and JSON consumers do not reach the assistant (`DEC-01`).
- Rollout and rollback: one package change; revert removes the flags and the assistant.

## Risks and open items

- Risk (medium): mintty without a pseudo-console may report no TTY, so Git Bash users see no assistant by default; mitigated by the explicit `--interactive` message and the documented probe (`DEC-09`).
- Risk (low): prompt echo and `readline` behavior differ slightly between PowerShell hosts; mitigated by line-based prompts and the manual acceptance step.
- Risk (low): the quoting rule covers common values; a single quote in a value prints two forms.
- Decided at HIL 2 (DEC-HIL-02): OI-01 skip the restart question when no selected harness has a restart mode (`DEC-04`); OI-02 the FR-10 measurement is **not run** now: the table in `docs/research/terminal-tty.md` stays "not measured", the fallback is tested in process, and FR-10's measurement and OBJ-05 are recorded as an open limitation at acceptance; OI-03 the plan follows the 180 s rule, the PRD text (120 s) is unchanged. No open item remains.

## Relevant files

- Modify: `src/cli/init-arguments.ts`, `src/cli/commands/init.ts`, `src/core/services/auto-restart-merge.ts`, `src/core/services/installation-builder.ts`, `tests/helpers/in-process-cli.ts`, `README.md`, `docs/research/README.md`.
- Create: `src/cli/terminal.ts`, `src/cli/assistant/prompt-port.ts`, `questions-harness.ts`, `questions-snapshot.ts`, `questions-restart.ts`, `questions-misc.ts`, `equivalent-command.ts`, `summary.ts`, `assistant-session.ts`, `src/cli/init-assertions.ts` (only if `init-arguments.ts` would pass 100 lines), `tests/helpers/scripted-prompts.ts`, the test files in the table, `docs/research/terminal-tty.md`.

## Amendment 2026-10-08 — rich prompts (DEC-HIL-05)

Requested by the person after the first delivery ("o wizard ficou muito rudimentar", option 1 of the proposal: rich prompts on the existing port, as an experiment to judge whether it is enough).

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-11 | FR-02, FR-03, FR-04, NFR-01 | `PromptPort` gains optional `askUi(prompt, error)` and `begin()`; a question passes a `PromptSpec` (`line` for the line prompts, `ui` for a rich prompt). The rich port returns the same string the line prompt would have received (`1 2`, `none`, `y`/`n`, a zone, a typed value), so every validator, flag, and test of the line mode stays. `ClackPromptPort` (`@clack/prompts` 1.8.1, the only new runtime dependency, no install script) is the production default; `CONTEXT_BRAKE_PLAIN_PROMPTS=1`, `TERM=dumb`, or a failed import select `ReadlinePromptPort`. Ctrl+C maps to `null` (cancel). The summary, equivalent command, and plan stay plain text on stdout so they can be copied | Supersedes the "no prompt library" alternative of DEC-02. `ask`, scripted ports, and every existing test keep working; the library is imported only when the assistant runs | Hand-written raw-mode lists (more code to maintain on Windows); staying line-based (the complaint) |

Open: the real terminals (Git Bash mintty, PowerShell 7, Windows PowerShell 5.1) are still not measured (TC-15); raw mode makes that measurement more important. `CONTEXT_BRAKE_PLAIN_PROMPTS=1` is the escape hatch.
