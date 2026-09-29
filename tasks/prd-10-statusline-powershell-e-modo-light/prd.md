# PRD — Status line under PowerShell, debug in light mode, and light mode as the default

Level `sdd-lean` (`DEC-HIL-00`, `DEC-STOPS-01`): a short PRD covering each of the four outcomes. Product direction in `DEC-PD-00`; decisions in `DEC-PD-01` to `DEC-PD-06` (`workflow.md`).

## Problem and context

After PRD-09 was accepted on 2026-09-29, four problems came up in this repository:

1. **Empty status line.** PRD-09 installs the Claude Code status line bridge by default. With a previous status line, the installed command is a shell pipeline, `node "<root>/.claude/hooks/context-brake-statusline.mjs" --pipe | ( <previous>\n)` (`statusline-settings.ts:bridgeCommand`). Claude Code runs status line commands through Git Bash on Windows, or through PowerShell when it finds no Git Bash. PowerShell cannot parse that pipeline, so the bar went blank with no warning. Claude Code fell back to PowerShell because Git came from scoop and `CLAUDE_CODE_GIT_BASH_PATH` was unset (`workflow.md#Diagnosis` items 1 and 5).
2. **No debug mode in light mode.** Debug mode (PRD-08) relies on a line in the instruction-file reference block, and light mode (PRD-07) writes no instruction files, so `--light --debug` is rejected (`README.md#Debug Mode`).
3. **Light mode is not the default.** `init` installs full mode unless `--light` is given (`init.ts:68`). The user wants light mode as the default for every installation (`DEC-PD-00`, `DEC-PD-03`).
4. **`SessionStart` `DEADLINE_EXCEEDED`.** Five `SessionStart` lines between 11:28Z and 11:40Z exceeded the 1,500 ms internal deadline (`failure-policy.ts:INTERNAL_DEADLINE_MILLISECONDS`). When this happens, the boot falls back to the omission or resume text. At rest the hook takes 303–414 ms, and the error record does not say which phase was slow.

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | The Claude Code status line shows the user's previous status line and ContextBrake still records the window, whichever shell Claude Code uses | The installed command runs with the same output in sh, Git Bash, and PowerShell (FR-01, FR-02) |
| OBJ-02 | Debug mode works in both modes | With light mode and debug on, every telemetry block asks for the 📊 line (FR-06) |
| OBJ-03 | A plain `init` leaves the repository in light mode unless the user chose full mode | FR-07, FR-08 |
| OBJ-04 | `SessionStart` does not lose its boot to the 1,500 ms deadline, and a future timeout names its phase | FR-10, FR-11 |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | The `statusLine` command that `init` installs for the bridge is only `node "<root>/.claude/hooks/context-brake-statusline.mjs"`, plus arguments that need no shell operator. It has no pipe, subshell, separator, or line break, with or without a previous status line (`DEC-PD-01`). | The installed command contains none of `\|`, `(`, `;`, `&`, or a line break. The same string, run with the status line fixture on stdin through sh, Git Bash, Windows PowerShell 5.1, and PowerShell 7 (each where available), exits 0 and records the `statusline` line in the ledger. |
| FR-02 | When a previous status line exists in the bridge state, the bridge runs its command with the same stdin JSON and prints that command's stdout unchanged, including multiple lines and ANSI sequences. It runs the command in the shell Claude Code uses for status line commands: sh on macOS and Linux; on Windows, Git Bash when Claude Code would find it, otherwise PowerShell. Without a previous status line, the bridge prints nothing, as it does today. Recording the reading does not change. | A fixture previous command that prints two lines with ANSI sequences produces byte-identical output through the bridge and when run directly in that shell, and the ledger receives the reading. On Windows, a test with no Git Bash available runs the previous command through PowerShell. |
| FR-03 | When the previous command cannot start, exits non-zero, prints nothing, or exceeds the bridge's time limit, the bridge prints one fallback line instead of an empty bar. The line shows ContextBrake's latest reading (usage and zone), when the ledger has one, and says that the previous status line failed and that `context-brake doctor` explains why. The bridge exits 0. | With a fixture previous command that exits 1, and with one that sleeps past the limit, the output is exactly one line that contains the notice and `context-brake doctor`, and the exit code is 0. |
| FR-04 | An existing installation whose `statusLine` has the pipeline format of PRD-09 moves to the FR-01 command on the next `init`, keeping the recorded previous status line. `remove` still restores the previous status line as in PRD-02.2. `doctor` flags the old format as outdated, with the remediation `context-brake init`. | Starting from a fixture with the PRD-09 pipeline command, `init --yes` writes the FR-01 command and keeps `previousCommand`. A second `init` changes nothing. `remove --yes` restores the previous status line, and `doctor` before the migration shows the outdated-format finding. |
| FR-05 | On Windows, `doctor` (text and `--json`) reports which shell ran the previous status line in the latest bridge run it has on record. When that shell was PowerShell, it warns that Claude Code did not find Git Bash and suggests setting `CLAUDE_CODE_GIT_BASH_PATH`. ContextBrake never sets environment variables. | With a recorded bridge run through PowerShell, `doctor` shows the warning and the remediation. With a run through Git Bash, or with no recorded run, there is no warning. `doctor --json` validates against `schemas/doctor-report.schema.json`. |
| FR-06 | With debug mode on, every telemetry block, in full and light mode alike, asks the agent to end the reply with the 📊 line copied from that block (`DEC-PD-02`). `init --debug` no longer writes the debug line to instruction files, and the next `init` removes a debug line left by PRD-08. `--light --debug`, `--debug` with light mode configured, and `--light` with debug on are accepted. `--no-debug` turns debug off in both modes. | In light mode, `init --debug --yes` succeeds, leaves every instruction file unchanged, and the next telemetry block contains the 📊 instruction. With `--no-debug`, the block no longer contains it. A full installation with the PRD-08 debug line loses that line on `init`, while debug stays on through the block. |
| FR-07 | Without `--light` or `--no-light`, `init` installs light mode whenever the configuration has no recorded full-mode choice, including existing full installations (`DEC-PD-03`). The switch follows the current rules for moving to light mode: it removes the managed protocol (unless edited), the reference blocks, and the `.gitignore` block, and never deletes plan or checkpoint files. It appears in the plan and requires confirmation like any other removal. The output says that the installation switched to light mode and that `init --no-light` goes back. Before that `init`, `doctor` on a full installation with no recorded choice shows an informational finding saying that the next plain `init` switches to light mode and that `init --no-light` keeps full mode. | A new repository with plain `init --yes` gets `lightMode` in its configuration. A full-installation fixture with no recorded choice, after plain `init --yes`, is in light mode with the blocks removed, and the output names `--no-light`. Plain `init` without `--yes` shows the switch in the plan and asks for confirmation. `doctor` on the full fixture shows the informational finding, and its status and exit code do not change. |
| FR-08 | `init --no-light` records the full-mode choice in `context-brake.config.json`, and a later plain `init` keeps full mode. `init --light` switches to light mode and replaces that choice (`DEC-PD-05`). The published configuration schema accepts the record, and existing configurations stay valid. | After `init --no-light --yes`, a later `init --yes` keeps full mode and writes nothing new. `init --light --yes` then switches to light mode. The configuration validates against `schemas/context-brake.config.schema.json` in each state. |
| FR-09 | In light mode, `init` installs the Claude Code status line bridge by default, as full mode does, and `--no-statusline-bridge` opts out (`DEC-PD-06`). Light mode still never blocks a tool call. | In light mode, `init --yes` writes the FR-01 `statusLine`, and `init --no-statusline-bridge --yes` does not write it or restores the previous one. In a light-mode session with a bridge reading, the telemetry block shows `window=harness`, and `pre_tool` in `CRITICAL` returns neutral. |
| FR-10 | The session start event (`SessionStart` in Claude Code and the equivalent boot event of each harness with `session_boot`) gets its own internal deadline of 5,000 ms. Every other event keeps 1,500 ms (`DEC-PD-04`). | A boot whose work takes 2 s injects the normal boot content and logs no error. A boot whose work takes 6 s logs `DEADLINE_EXCEEDED` and resolves as it does today. A `pre_tool` whose work takes 2 s still exceeds its deadline. |
| FR-11 | A `DEADLINE_EXCEEDED` record in `.context-brake/runtime/errors.jsonl` names the phase that was running when the deadline elapsed and the elapsed milliseconds. Readers of `errors.jsonl` accept records written before this change. | A fixture with slow git inspection at boot writes a record whose phase names the git step, with an elapsed time of at least the deadline. The code that reads `errors.jsonl` (the failure policy and `doctor`) accepts both the old and the new record formats. |
| FR-12 | The README, `docs/context-brake-protocol.md`, and `docs/research/harness-integrations.md` describe: light mode as the default and how to keep full mode; debug mode in both modes; the bridge command and the shell that runs the previous status line; and the `SessionStart` deadline. | Each of the three sources covers the topics that apply to it, and the README no longer says that debug mode is unavailable in light mode. |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Platform | The criteria pass on Linux, macOS, and Windows (Windows PowerShell 5.1, PowerShell 7, and Git Bash), including repositories whose instruction files are symlinks. |
| NFR-02 | Status line latency | Over 20 runs in the integration test, the bridge adds at most 200 ms at p95 to running the previous command directly. |
| NFR-03 | Compatibility | The configuration stays at `schemaVersion: 1`, and the published schemas gain only optional fields. The per-call hook limits of PRD-02.1 (100 ms) and PRD-02.2 (120 ms) do not change. The debug instruction, including the prefilled 📊 line, adds at most 40 `o200k_base` tokens to the telemetry block. |

## Out of scope

- `context-brake run` in light mode: it keeps refusing with the remediation `init --no-light` (`run-preflight.ts:33`).
- Blocking in light mode, and any change to the 1,500 ms deadline for tool events.
- Finding and fixing the cause of the slow `SessionStart` runs: this PRD only measures them (FR-11) and gives the boot more time (FR-10).
- Setting `CLAUDE_CODE_GIT_BASH_PATH` or changing the user's shell configuration.
- Status line bridges for other harnesses.

## Assumptions and sources

- Decision (`DEC-PD-03`): the user chose to switch every installation on its next plain `init` over the recommended option of switching only new ones. Existing full installations switch to light mode and lose the brake until `init --no-light` is run, and this repository needs `init --no-light` once (`DEC-PD-05`).
- Assumption: full-mode-only options (`--snapshot-command`, `--resume-command`, `--create-instructions`, and others) passed without `--no-light` stay rejected while light mode is in effect, as they are today, and the error names `--no-light`. If the user instead wants them to imply full mode, FR-07 and FR-08 change.
- Assumption: the fallback line (FR-03) is the "warns otherwise" part of the objective in `checkpoint.json`. It is the only new user-visible behavior not taken from an explicit answer.
- Assumption: 5,000 ms (FR-10) is within the session-start hook timeout of every supported harness. The documented defaults are 600 s in Claude Code and 30 s in GitHub Copilot CLI and Pi (`docs/research/harness-integrations.md`); the TechSpec checks the rest.
- Vendor rule to re-check in the TechSpec: [Claude Code status line](https://code.claude.com/docs/en/statusline) runs `command` through sh on macOS and Linux, and through Git Bash on Windows, or PowerShell when there is no Git Bash. Blank or non-zero output leaves the line empty.
- Sources: `src/infrastructure/harnesses/claude-code/statusline-settings.ts`, `statusline-bridge.ts`, `statusline-state.ts`; `src/cli/commands/init.ts:68-69`; `src/core/services/light-mode-merge.ts`, `debug-mode-merge.ts`, `instruction-markers.ts:DEBUG_MODE_LINE`, `telemetry-block.ts`, `failure-policy.ts`; `.context-brake/runtime/errors.jsonl`; PRD-02.2, PRD-07, PRD-08, and PRD-09.

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user or an identified project source.
- [x] Implementation details remain in the TechSpec.
