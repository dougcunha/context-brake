# PRD — Interactive configuration assistant in init

## Problem and context

`init` takes eleven configuration flags (`src/cli/init-arguments.ts:17-24`): harness selection, snapshot command, trigger and resume command, auto restart, status line bridge, and debug. The flags are simple one by one, but the rules between them only surface as errors after the fact:

- `--resume-command` requires `--snapshot-command` (`src/core/contracts/configuration.ts:29`).
- `--statusline-bridge` requires Claude Code among the targets (`src/cli/init-arguments.ts:58`).
- `--auto-restart` requires an active harness with a restart mode (`src/cli/init-arguments.ts:65`).
- The restart path depends on the combination. With a snapshot command, the reset resumes through that command. Without one and with restart on, the agent writes a markdown handoff (prd-14). The flags do not show this.
- The restart mode differs per harness (automatic, semi-automatic, or none), and the person sees it only after `init` runs.

The consecutive-restart limit (`autoRestart.maxConsecutiveRestarts`, 1 to 10, default 2, `src/core/contracts/auto-restart.ts:3-5`) has no flag; the person must edit the JSON.

Today `init` asks only one question, the write confirmation, and only when stdin is a TTY (`src/cli/confirmation.ts:11-20`). Whether Git Bash on Windows (mintty) reports a TTY to Node has never been measured. The project must support PowerShell and Git Bash (`AGENTS.md`, Project constraints).

This slice is the second of two under the prefix `configuracao-guiada` and depends on `prd-15-configuracao-guiada-higiene-e-exclusao`.

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | A person configures ContextBrake by answering questions instead of composing flags | In an in-process session with scripted answers, `init` reaches the same plan as the equivalent flags for every supported combination, with no argument error (FR-01 to FR-05) |
| OBJ-02 | Every choice the assistant makes can be repeated without it | The printed equivalent command, run non-interactively on a copy of the starting fixture, produces a byte-identical configuration and plan (FR-06) |
| OBJ-03 | Scripts, CI, and JSON consumers see no change | Every existing `init` test with `--yes`, `--json`, or non-TTY input passes unchanged (FR-08) |
| OBJ-04 | The restart limit is configurable without editing JSON | `init --max-restarts N` writes `autoRestart.maxConsecutiveRestarts = N` for N in 1..10 and rejects other values (FR-09) |
| OBJ-05 | The Git Bash behavior is known and documented | The research notes record whether Node sees a TTY under Git Bash (mintty), with the measured versions, and the assistant's fallback there is tested (FR-10) |

## Stories and journeys

| ID | User | Need | Benefit | Flow or edge |
| --- | --- | --- | --- | --- |
| US-01 | Developer installing ContextBrake in a project for the first time | Pick harnesses, snapshot or handoff, restart, and status line without reading the flag reference | A working install whose behavior they understand | Runs `init` in a terminal; answers prompts; sees a summary, the equivalent command, and the plan; confirms once |
| US-02 | Developer changing an existing install | Revisit the choices with current values pre-filled | Reconfigures by running `init` again | Current configuration supplies each default; deselecting a harness excludes it persistently (prd-15) |
| US-03 | CI script or agent | Run `init` unattended | No prompt blocks the run | `--yes`, `--json`, flags, or a non-TTY stdin keep today's behavior |
| US-04 | Developer in Git Bash on Windows | Use the assistant or understand why it is unavailable | No silent hang and no unexplained error | The measured behavior decides: the assistant runs, or `init` explains the fallback (FR-10) |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | `init` starts the assistant when stdin and stdout are TTYs and no configuration flag, `--yes`, or `--json` is given; `--interactive` starts it explicitly | With TTY streams and no flags, the first prompt appears. With any of `--yes`, `--json`, or a configuration flag, no assistant prompt appears. `--interactive` without a TTY, or combined with `--yes` or `--json`, is an argument error that names the cause |
| FR-02 | The assistant asks, in order: harnesses; snapshot command or none; snapshot trigger and resume command when a command is set; restart on or off; consecutive-restart limit when restart is on; status line bridge when Claude Code is selected; debug | A scripted session sees exactly the questions that apply to its earlier answers, in this order. Questions that do not apply are not asked |
| FR-03 | Each question shows its default and the facts that make the choice clear | Harnesses: detected ones listed with their support level, current active ones preselected. Restart: the restart mode of each selected harness (automatic, semi-automatic, or none). No snapshot command with restart on: states that the agent writes a markdown handoff. Defaults come from the current configuration, else from today's flag defaults |
| FR-04 | Invalid answers are re-asked with the rule that failed | An answer that violates a rule the flags enforce (command length or line rules, resume without command, out-of-range limit) prints that rule and asks again; nothing is written |
| FR-05 | Deselecting a detected harness excludes it as `init --exclude-harness` does | The resulting plan equals the plan of the equivalent `--exclude-harness` run defined in prd-15 FR-05 |
| FR-06 | Before the plan, the assistant prints a summary and the equivalent non-interactive command | The command uses only existing flags, quoting that works in PowerShell and POSIX shells, and reproduces the same plan (OBJ-02) |
| FR-07 | The assistant ends in the existing preview and a single confirmation; cancelling writes nothing | After the summary, `init` shows the usual plan and asks the usual confirmation once. Ctrl+C or end of input at any prompt exits without writing, with the same exit code as a declined confirmation. `--dry-run` with the assistant shows the plan and writes nothing |
| FR-08 | Without the assistant, `init` behaves exactly as today | Existing `init` tests pass unchanged; a non-TTY run without `--yes` still fails with `CONFIRMATION_REQUIRED` as today |
| FR-09 | `--max-restarts <N>` sets the consecutive-restart limit | With restart on (now or through `--auto-restart`), N in 1..10 is written to `autoRestart.maxConsecutiveRestarts`; values outside 1..10, non-integers, or use with `--no-auto-restart`, or with restart off and no `--auto-restart`, are argument errors that name the rule |
| FR-10 | The Git Bash (mintty) TTY behavior is probed and the assistant handles it | A probe records `process.stdin.isTTY` and `process.stdout.isTTY` under Git Bash (mintty, with and without its pseudo-console option where available), PowerShell 7, and Windows PowerShell 5.1, in `docs/research/`. Where Node sees no TTY, a plain `init` keeps today's behavior and `--interactive` explains that the terminal is not interactive and names the flags to use instead |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Terminal compatibility and accessibility | Line-based prompts that work without raw keyboard mode or arrow keys; choices typed as text or numbers; no meaning carried by color alone; `NO_COLOR` respected |
| NFR-02 | Output contract (`cli-output.md`) | `--json` never prompts and its schema is unchanged except for any field this PRD adds; the summary and equivalent command appear only in text mode |
| NFR-03 | Test budget | The assistant is tested in process through an injected prompt source, with no child process; `npm test` and `npm run coverage` stay within 120 s |
| NFR-04 | Platforms | Linux, macOS, Windows PowerShell 7 and 5.1, and Git Bash, per the FR-10 probe |

## User experience

- **Prompt shape:** one question per line with the default in brackets, for example `Restart sessions automatically? [y/N]`, and numbered lists for harness selection.
- **Restart question:** lists each selected harness with its mode, for example `claude-code: automatic`, `codex-cli: semi-automatic (run /new)`.
- **Summary:** a short block of the chosen values, then `Equivalent command: context-brake init --harness claude-code --harness codex-cli --auto-restart --max-restarts 3`.
- **Errors:** the failed rule on one line, then the same question again.
- **Cancel:** a one-line note that nothing was written.

## Constraints and dependencies

- Depends on `prd-15-configuracao-guiada-higiene-e-exclusao` FR-05 to FR-07 for persistent exclusion when a harness is deselected.
- The assistant reuses the existing validation and merge rules (`src/core/services/snapshot-merge.ts`, `src/core/services/auto-restart-merge.ts`, `src/cli/init-arguments.ts`); it adds no rule that the flags lack.
- Prompts go through a port that `src/cli/` wires, so tests replace it without a TTY (`.agents/rules/tests.md`).
- A configuration that fails validation is handled by prd-15 FR-01 and FR-02 before the assistant starts.

## Out of scope

- Telemetry tuning (zones, context window ceiling, declared window, activation threshold, injection mode); these stay in the JSON with its published schema.
- A separate `config` command or `config get/set`.
- Upgrade hygiene and persistent exclusion themselves (owned by `prd-15-configuracao-guiada-higiene-e-exclusao`).
- User-level (global) configuration.

## Assumptions and sources

- Assumption: line-based prompts through `node:readline/promises` work in every supported terminal that Node sees as a TTY. If the FR-10 probe shows otherwise, the TechSpec adapts the prompt mechanism.
- Decision OI-16-01 (HIL 1, DEC-HIL-01 in the prd-15 workflow): the assistant starts automatically with TTY streams and no configuration flag, `--yes`, or `--json`, and `--interactive` forces it (FR-01).
- Decision OI-16-02 (HIL 1, DEC-HIL-01 in the prd-15 workflow): the assistant also asks for the consecutive-restart limit when restart is on (FR-02).
- Source: `tasks/triage-log.jsonl` (2026-10-08 line); the option inventory reviewed with the person on 2026-10-08.

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user or an identified project source.
- [x] Implementation details remain in the TechSpec.
