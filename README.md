# ContextBrake 🛑

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![Spec-Driven Development](https://img.shields.io/badge/Paradigm-Spec--Driven%20Development-purple.svg)](https://github.com/context-brake/context-brake)

> **Context telemetry, a tool-call brake, and checkpoint-driven session resets for coding agents.**
> Keep long tasks from degrading as the context window fills, and carry their state safely into a fresh session.

> [!NOTE]
> The MVP (installation and diagnostics, telemetry and brake, plan, checkpoint, and boot) is implemented, along with the automatic reset runner, delegated snapshot mode, light mode, and the usage-based brake with measured usage in Claude Code. CI runs on Linux, macOS, and Windows. Commands and configuration below reflect the current CLI.

---

## 💡 The Problem

Long-horizon tasks run by coding agents degrade as the session grows:

1. **Context bloat:** tool outputs such as build logs, test runs, and file reads pile up in the context window.
2. **Attention decay:** as the window fills, instructions and constraints buried in the middle of the context are followed less reliably.
3. **Repeated cost:** every turn re-sends the accumulated history.
4. **No sense of budget:** the model cannot see how much context it has used or how many tools it has called, so it often keeps going until the session is cut off without saving progress.

## 🛡️ The Solution

ContextBrake plugs into the extension mechanism each harness already documents, hooks or plugins, and adds:

- 🔍 **Detection and setup:** `context-brake init` finds the harnesses a project uses, registers the integration in each one's own configuration, and reports the support level it can guarantee.
- 🚦 **Telemetry:** as soon as the session leaves `GREEN`, or context usage reaches the activation threshold, tool results reach the agent with the session turn, context usage (measured by the harness or estimated), zone, and recommended action.
- 🪓 **Brake:** once context usage reaches the critical threshold, tool calls are blocked except the ones needed to save state, as long as the context window is trusted (reported by the harness or declared); with the `contextWindowCeiling` fallback, the brake only warns. The number of tool calls alone never blocks.
- 💾 **Checkpoint and boot:** the agent saves progress to `task_plan.json` and `state_checkpoint.json`, local files that `init` adds to `.gitignore`. After you run `/clear` or `/new`, the new session starts with a boot summary and validates the inherited state before editing code.

---

## 🚦 Zones

Zones follow context usage. Default limits:

| Zone | Context usage | Agent behavior with `task_plan.json` | Agent behavior without a plan |
| :--- | :--- | :--- | :--- |
| 🟢 `GREEN` | below 50% | Normal work. No telemetry is injected in the default mode. | Normal work. |
| 🟡 `YELLOW` | 50% to 65% | Finish the current edit, start no new plan step, run the step's validation command. | Keep working; finish the current unit before large new explorations. |
| 🔴 `RED` | above 65% | Save plan and checkpoint, commit the code with `checkpoint: <step title>` if validation passes, and end with `[REQUEST_SESSION_RESET]`. | Finish or pause the current unit, record progress, and end with `[REQUEST_SESSION_RESET]`. |
| ⛔ `CRITICAL` | 75% or more | Only state-saving calls run: reading and writing the plan and checkpoint, the validation command, `git status`, `git add`, and `git commit`. | Same as with a plan. |

A turn is one completed tool call. Turn limits are optional and off by default: with `zones.greenMaxTurn` and `zones.yellowMaxTurn` set, a long session can move up to `RED` by turns, and when several conditions match, the highest zone applies. Turns never reach `CRITICAL` and never block tool calls.

Blocking is available on harnesses with **Full** or **Partial** support, but only where the installed hook honors an explicit deny; on **Cooperative** harnesses the protocol only advises. `doctor` lists each harness's hook timeouts, missing tool coverage, and crashes as limitations. The agent-facing rules live in `docs/context-brake-protocol.md`; instruction files get only a short reference to it, so the protocol does not fill every session's context.

### Brake Behavior & State-Saving Allowlist

At the critical threshold (by default, 75% context usage), ContextBrake engages the tool-call brake on supported harnesses. General tool executions are intercepted and denied before execution with an agent-facing block message, but only when the context window is trusted: reported by the harness, or declared in `telemetry.declaredContextWindow` for harnesses that report none. With the `contextWindowCeiling` fallback (`window=config`), the `CRITICAL` zone only warns (see `contextWindowCeiling` under Configuration).

Only allowlisted operations pass through:
1. **Plan & Checkpoint Files:** Reading or writing the configured plan file (`task_plan.json`) and checkpoint file (`state_checkpoint.json`).
2. **Step Validation Command:** The validation command configured for the active step in `task_plan.json`.
3. **Safe Git Commands:** `git status`, `git add`, and `git commit` (without chained shell operators).
4. **Configured Additional Commands:** Additional allowed commands defined in `brake.additionalAllowedCommands` in `context-brake.config.json` (such as `npm run typecheck`).

To customize limits, modify `telemetry.zones` in `context-brake.config.json`. Full block specifications and format details live in `docs/telemetry-block.md`.

---

## 🧩 Supported Harnesses

Support levels come from each vendor's documentation, checked in September 2026. **Full** means the harness honors ContextBrake's explicit deny on every tool call, delivers telemetry alongside tool results, and injects a boot summary at session start. **Partial** means one of these is missing, indirect, unconfirmed, or does not cover every tool. **Cooperative** means the harness does not honor a pre-tool deny, so only the protocol acts.

| Harness | Integration point | Support level | Main limitation |
| :--- | :--- | :--- | :--- |
| Claude Code (`claude-code`) | Hooks in `.claude/settings.json` | Full | Context usage is read from the session transcript, whose format is undocumented, with an estimate as fallback; the context window comes from the status line bridge, which `init` installs by default, and without it the brake only warns; a hook timeout or failure without an explicit deny lets the call proceed |
| Codex CLI (`codex-cli`) | Hooks in `.codex/hooks.json` | Partial | Hosted tools such as web search bypass hooks; hook errors and timeouts let the call proceed |
| Cursor (`cursor`) | Hooks in `.cursor/hooks.json` | Full | Context usage is only sent before compaction |
| GitHub Copilot CLI (`github-copilot-cli`) | Hooks in `.github/hooks/*.json` | Full | A hook timeout lets the tool call proceed |
| OpenCode (`opencode`) | Plugins in `.opencode/plugins/` | Partial | Whether the pre-tool hook runs for every tool is unconfirmed, and post-tool output visibility is unconfirmed |
| Pi (`pi`) | Extensions in `.pi/extensions/` | Full | Timeout behavior of extension handlers is not documented |
| Oh-My-Pi (`oh-my-pi`) | Extensions in `.omp/extensions/` | Full | Timeout behavior of extension handlers is not documented |
| Antigravity CLI (`antigravity-cli`) | Hooks in `.agents/hooks.json` | Partial | Telemetry is injected through `PreInvocation`; hook coverage in the CLI is unconfirmed, and `PreToolUse` `allow` auto-approves calls |

For Antigravity CLI, `PreToolUse` requires an explicit decision (`allow` or `deny`). ContextBrake emits `allow` below the ceiling to permit tool execution, which auto-approves the call and replaces the harness's normal permission prompt. Antigravity reports no context window, so `deny` is returned above the ceiling only when `telemetry.declaredContextWindow` is set; otherwise `allow` is returned in every zone.

Aider is not supported because it has no hook mechanism. The full capability matrix and its sources are in the [installation PRD](./tasks/prd-01-instalacao-deteccao-diagnostico/prd.md).

---

## 📦 Installation

ContextBrake requires **Node.js 20 or later**. You can run or install it in three ways:

### Option 1: Zero-Install via `npx` (Recommended)
Best for repositories of any tech stack (Python, Rust, Go, TypeScript, etc.) without polluting local dependencies:
```bash
npx context-brake init --yes
```

### Option 2: Global Installation
Best if you use ContextBrake across multiple repositories and prefer a persistent global CLI:
```bash
npm install -g context-brake
context-brake init --yes
```

### Option 3: Local Dev Dependency
Best for Node.js projects where your team wants to lock the exact version in `package.json`:
```bash
npm install -D context-brake
npx context-brake init --yes
```

---

## 🚀 Quick Start & Project Setup

Reaches an error-free diagnosis within two minutes on any supported repository:

```bash
# 1. Preview every planned file change before writing to disk
npx context-brake init --dry-run

# 2. Detect harnesses, register integrations, and initialize configuration
npx context-brake init --yes

# 3. Diagnose integrations, configurations, versions, and overhead
npx context-brake doctor
```

`init` installs the **light mode** by default: telemetry only, with the status line bridge and no brake. Add `--no-light` for the full mode, with the plan, checkpoint, protocol file, and instruction blocks; that choice is recorded in the configuration and later plain `init` runs keep it.

### What `context-brake init` does:

1. **Detects coding-agent harnesses:** Identifies Claude Code, Cursor, Codex CLI, GitHub Copilot CLI, Antigravity CLI, OpenCode, Pi, and Oh-My-Pi from repository signals and machine configuration.
2. **Registers integrations safely:** Injects the appropriate hooks/plugins in each harness's own configuration, preserving user settings and comments, and installs the [status line bridge](#claude-code-status-line-bridge) for Claude Code.
3. **Initializes config:** Creates `context-brake.config.json` with a `lightMode` section, or, with `--no-light`, the full-mode sections.
4. **Full mode only (`--no-light`): creates the protocol, the reference markers, and the `.gitignore` block.** It creates `docs/context-brake-protocol.md`, inserts a short three-line pointer between `<!-- CONTEXTBRAKE:START -->` and `<!-- CONTEXTBRAKE:END -->` in existing `CLAUDE.md` and `AGENTS.md` without modifying any other content, and adds the plan and checkpoint paths to `.gitignore` between `# CONTEXTBRAKE:START` and `# CONTEXTBRAKE:END`, creating the file when needed and leaving the rest untouched. Plans and checkpoints stay on your machine and are never committed.

### Updating and Removal

- **Updating:** Running `npx context-brake init --yes` is completely idempotent. Run it again after upgrading ContextBrake to refresh runtime assets and synchronize protocol references without touching your custom settings. If custom allowed commands are added or protocol rows change, `doctor` may report `PROTOCOL_FILE_MISMATCH` until `context-brake init --yes` is rerun to regenerate the protocol table to match the current configuration.
- **Upgrading from turn-based limits:** earlier versions blocked tool calls after 12 turns and wrote `turnCeiling`, `criticalTurn`, `greenMaxTurn`, and `yellowMaxTurn` into the config. Those configs stay valid, but `doctor` reports `LEGACY_TURN_LIMITS`. Run `npx context-brake init --yes` once: it removes `turnCeiling` and `criticalTurn`, removes `greenMaxTurn` and `yellowMaxTurn` when they are the retired defaults 7 and 10, and keeps custom values as optional turn limits.
- **Upgrading to the light default:** the first plain `init` on an older full installation switches it to light mode and reports `LIGHT_MODE_DEFAULT_APPLIED`; run `init --no-light` first to keep the full mode, which is recorded and then respected. `doctor` warns about the pending switch with `LIGHT_MODE_DEFAULT_PENDING` before it happens.
- **Downgrading:** a version older than this one rejects the new optional fields, which are `"fullMode": true` in the configuration, `shell` on `statusline` lines in the session ledgers, and `phase` and `elapsedMs` on `DEADLINE_EXCEEDED` lines in `.context-brake/runtime/errors.jsonl`. Remove those three before reinstalling an older package.
- **Diagnostics:** Run `npx context-brake doctor` anytime to verify integration integrity, measure latency overhead, and check version compatibility.
- **Uninstallation:** Run `npx context-brake remove` to cleanly remove registered hooks, protocol docs, and instruction markers while preserving your plans, checkpoints, and harness configurations. Default removal keeps both state files and their `.gitignore` block, so the state stays ignored; add `--remove-state` to delete the plan, checkpoint, and that block together. `remove --remove-state` deletes `.gitignore` only when the ContextBrake block was its only content.

---

## ⚙️ Configuration

`context-brake.config.json` lives at the repository root and conforms to the published JSON Schema:

```json
{
  "$schema": "https://unpkg.com/context-brake@1/schemas/context-brake.config.schema.json",
  "schemaVersion": 1,
  "activeHarnesses": ["claude-code"],
  "telemetry": {
    "injectionMode": "threshold_only",
    "activationThresholdPercentage": 50,
    "contextWindowCeiling": 128000,
    "zones": {
      "greenMaxPercentage": 49,
      "yellowMaxPercentage": 65,
      "criticalPercentage": 75
    }
  },
  "brake": {
    "additionalAllowedCommands": []
  },
  "stateStorage": {
    "planFile": "task_plan.json",
    "checkpointFile": "state_checkpoint.json",
    "instructCheckpointCommit": true,
    "bootMaxTokens": 1000
  },
  "instructionFiles": {
    "targets": ["CLAUDE.md", "AGENTS.md"],
    "protocolFile": "docs/context-brake-protocol.md"
  }
}
```

`contextWindowCeiling` is the session's context budget: when the harness does not report the active model's window, zone percentages are computed against it. A window taken from `contextWindowCeiling` never blocks a tool call: the telemetry block shows `window=config`, and `CRITICAL` only warns. Blocking needs a window the harness reports (`window=harness`: Pi and Oh-My-Pi, and Claude Code through the [status line bridge](#claude-code-status-line-bridge), which `init` installs by default) or, for the harnesses that report none (Codex, Cursor, GitHub Copilot, Antigravity, OpenCode), a window you declare in `telemetry.declaredContextWindow` (`window=declared`). A declared window is ignored by Claude Code, Pi, and Oh-My-Pi, whose window comes from the harness. The optional `zones.greenMaxTurn` and `zones.yellowMaxTurn` must be set together, with `greenMaxTurn` lower; they raise the zone up to `RED` by turns. `brake.additionalAllowedCommands` defines extra shell commands allowed in the `CRITICAL` zone (matched against leading tokens, without shell operators). With `instructCheckpointCommit`, the protocol tells the agent to commit the code; ContextBrake never commits on its own.

### Delegated Snapshot Mode (without a task plan)

If you already save session state with your own skill or command, you can keep telemetry and the brake without creating `task_plan.json`. Configure a snapshot command:

```bash
npx context-brake init --snapshot-command "/sdd-snapshot" --snapshot-path "tasks/**/context-snapshot.md" --resume-command "/sdd-orchestrate-flow"
```

This adds a `delegatedSnapshot` section to the configuration:

```json
{
  "delegatedSnapshot": {
    "snapshotCommand": "/sdd-snapshot",
    "triggerZone": "RED",
    "resumeCommand": "/sdd-orchestrate-flow",
    "allowedPaths": ["tasks/**/context-snapshot.md"],
    "allowedSkills": []
  }
}
```

While the section exists and the plan file does not, ContextBrake runs in delegated mode:

- From `triggerZone` (`RED` by default, or `YELLOW`), the telemetry action becomes `run "<snapshotCommand>", then end reply with [REQUEST_SESSION_RESET]`. ContextBrake never runs the command; it only passes the text to the agent, so the command can be a skill, a slash command, or a short instruction.
- In the `CRITICAL` zone, the brake allows:
  - reading and writing the files that match `allowedPaths` (`*`, `**`, and `?` patterns relative to the repository);
  - the skills in `allowedSkills`, plus the skill named by a leading `/name` in the snapshot or resume command;
  - `git status`, `git add`, and `git commit`;
  - `brake.additionalAllowedCommands`.

  Only Claude Code reports skill calls as tool calls, so with other harnesses, list every file the snapshot command reads or writes in `allowedPaths`. `doctor` reports that limitation.
- After `/clear`, `/new`, or compaction, harnesses with session boot receive the `resumeCommand` instead of the plan boot summary.
- As soon as a plan file exists (for example, after `context-brake plan init`), the plan rules apply again.

`context-brake doctor --json` reports the mode in effect under `checkpointMode`. `context-brake run` still needs a plan. To go back to plan-only behavior, run `context-brake init --no-delegated-snapshot`.

### Light Mode (telemetry only, the default)

If your workflow already manages checkpoints and snapshots, as the SDD skills in this repository do, light mode makes ContextBrake a pure context sensor. It is what `init` installs unless you ask for the full mode:

```bash
npx context-brake init            # light mode, the default
npx context-brake init --no-light # full mode, recorded in the configuration
```

Light mode adds a `lightMode` section to the configuration:

```json
{
  "lightMode": { "triggerZone": "RED" }
}
```

`init --no-light` writes `"fullMode": true` instead, and every later plain `init` keeps that choice. A configuration with neither key is a full installation that never chose, and the next plain `init` switches it to light mode: `doctor` says so with `LIGHT_MODE_DEFAULT_PENDING` before the switch, and `init` reports `LIGHT_MODE_DEFAULT_APPLIED` after it, both informational and neither changing the exit code. `init --light` goes back to light mode and drops `fullMode`. Writing both keys is an invalid configuration.

What light mode does:

- **Measures:** it measures context usage exactly as before. For real Claude Code windows, add the [status line bridge](#claude-code-status-line-bridge).
- **Injects:** it injects the telemetry block with the usage, the tokens, and the zone.
- **Asks for a snapshot:** from `triggerZone` on (`RED` by default, or `YELLOW` with `--snapshot-trigger YELLOW`), the action becomes `save your snapshot or checkpoint now, then end reply with [REQUEST_SESSION_RESET]`, and in `CRITICAL` it becomes `…immediately…`. The action names no skill or command; the agent uses the mechanism its own workflow defines.

What light mode does not do:

- **Files:** it creates, reads, and configures no plan, checkpoint, snapshot, or protocol file. It writes no reference block to instruction files and no `.gitignore` block.
- **Brake:** it never blocks a tool call, in any zone.
- **Session start:** it injects nothing at session start, after `/clear`, or after compaction.

Switching an existing full installation to light mode removes the managed protocol (unless you edited it), the reference blocks, and the `.gitignore` block. The `.gitignore` block stays while a plan or checkpoint file exists, and those files are never deleted. The options of the other modes (`--snapshot-command`, `--snapshot-path`, `--snapshot-skill`, `--resume-command`, `--create-instructions`, `--migrate-legacy`, `--instruction-file`) are rejected while light mode is on, and the error names `--no-light`. `doctor` reports `checkpointMode.effective: "light"` and flags leftovers from a full installation. `context-brake run` does not support light mode. To go back to the full mode, run `context-brake init --no-light`. If you edited the protocol, light mode keeps it unmanaged: delete or move it first, or `--no-light` stops with `UNMANAGED_PROTOCOL_CONFLICT`.

### Debug Mode

To check ContextBrake's usage reading against the real value from the harness (`/context` or the Claude Code status line), turn on debug mode:

```bash
npx context-brake init --debug
```

This writes `"debug": true` to the configuration and adds one field to every telemetry block, in full and light mode alike:

```text
debug_line="📊 ContextBrake: 42% · 53760/128000 (harness) · measured · GREEN" (end your reply with this line)
```

The agent copies that line instead of composing it. Nothing is written to instruction files any more, so `--light --debug`, `--debug` with light mode configured, and `--light` with debug mode on are all accepted, and the next `init` removes a debug line left by an earlier version. In full mode the same instruction also appears in the protocol file, which is generated from the configuration; a light-mode installation has no protocol file.

- **Injects on every call:** while debug mode is on, ContextBrake adds the telemetry block to every tool result, in every zone, as if `injectionMode` were `always`. This costs up to 60 tokens per tool call, plus at most 40 more for the debug line. The `injectionMode` saved in the configuration does not change.
- **Relies on the agent:** the agent prints the line because the block asks it to. ContextBrake does not check that the line was printed.
- **Both modes:** the reference block no longer carries the debug line in any mode, so debug mode costs nothing in instruction files.

`context-brake doctor` shows `debug mode: on`, and `doctor --json` reports `debugMode: true`. Debug mode does not change the `doctor` status or exit code. To turn it off, run `context-brake init --no-debug`, which drops the field from the next block and the key from the configuration.

### Active Sessions in `doctor`

In every mode, `context-brake doctor` lists the repository's active sessions with their current context usage: percentage, tokens, window, zone, and whether the reading was measured or estimated. It also shows the time of each session's last activity. The data comes from the session ledger ContextBrake already keeps under `.context-brake/sessions/`, using the newest reading after the last reset, from the status line bridge or from the last tool call. ContextBrake cannot tell whether a harness process is still running. A session counts as active when its last recorded activity is within 30 minutes, and at most 10 sessions are listed. `doctor --json` reports them under `activeSessions`, and the list is omitted when no session is active.

### Claude Code Status Line Bridge

Claude Code sends the active model's context window only to the status line command, never to hooks. The bridge reads it there, so zones in Claude Code use the real window instead of `contextWindowCeiling`, and it is what lets the brake block in Claude Code. `init` installs it by default in full **and** light mode. To turn it back on after an opt-out:

```bash
npx context-brake init --statusline-bridge
```

- **Local scope, per developer:** the option writes `statusLine` into `.claude/settings.local.json`, the local, unversioned settings file, with the absolute path of `.claude/hooks/context-brake-statusline.mjs`, as a single command: `node "<root>/.claude/hooks/context-brake-statusline.mjs"`, with no pipe, subshell, or separator. The versioned `.claude/settings.json` does not change, and a later `init` without the option keeps the bridge. Keep `.claude/settings.local.json` ignored by Git; `doctor` warns when it is not.
- **Your status line stays the same:** the bridge runs the status line that was in effect before (local, then project, then user settings) itself, with the same input, and prints its output unchanged, keeping `padding` and `refreshInterval`. It uses the shell that launched it: `sh` on macOS and Linux, Git Bash on Windows when the bridge was started by Git Bash, otherwise PowerShell. If you had no status line, it prints nothing. Note that Claude Code hides most footer keyboard hints (such as `esc to interrupt` and `? for shortcuts`) whenever a status line is configured, even an empty one. To keep the footer, opt out with `context-brake init --no-statusline-bridge`: later plain `init` runs remember the choice, and the brake then only warns in Claude Code.
- **When the previous line fails:** a previous command that cannot start, exits non-zero, prints nothing, or takes longer than 5 seconds makes the bridge print one line with ContextBrake's own reading and say that `context-brake doctor` explains why, still exiting 0. An installation written by an older version, with the pipeline form of the command, keeps working until the next `init` rewrites it; `doctor` reports it as `STATUSLINE_BRIDGE_OUTDATED`.
- **Zones on 1M models:** after the status line first runs in a session, the telemetry block shows `tokens=<used>/<window>` with the model's `context_window_size`. With a 1,000,000-token model, `RED` starts above 650,000 tokens, and `contextWindowCeiling` no longer limits Claude Code sessions. After `/model`, the window changes with the next assistant response. When the transcript has no usage reading, the bridge's input tokens are used, following the same reset rule.
- **Non-interactive sessions:** Claude Code runs the status line only in interactive sessions, so `claude -p`, including the sessions of `context-brake run`, keep using `contextWindowCeiling`. There the brake only warns, and the runner does not end a session at `CRITICAL`. The first tool calls of a new session, before the status line first runs, and Claude Code subagents also only warn.
- **Windows without Git Bash:** Claude Code falls back to PowerShell when it does not find Git Bash. ContextBrake never changes your environment: set `CLAUDE_CODE_GIT_BASH_PATH` to the `bash.exe` of Git for Windows and restart the harness to get the Bash tool back. Until then, `doctor` warns with `STATUSLINE_POWERSHELL_FALLBACK` on Windows, after a bridge run that recorded PowerShell.

The bridge records only the window, the input tokens, the used percentage, the model id, the shell that ran it, and the time, per session, in the session ledger. `context-brake doctor` shows where the window comes from under `contextWindow`, lists per harness whether the brake can block under `brakeWindow`, warns with `STATUSLINE_BRIDGE_ABSENT` when Claude Code has no bridge, and warns when the local status line no longer runs the bridge, when the script is missing, or when the project or user status line changed after installation. `context-brake init --no-statusline-bridge` or `context-brake remove` restores the previous local status line, or removes the key and the file when the bridge created them.

### Hook Timeouts

Each hook call has an internal deadline of 1.5 seconds; the session start event gets 5 seconds, because it reads the plan, the checkpoint, and the repository state to build the boot summary. When a deadline elapses, the hook stops waiting, the tool call proceeds, and the failure is recorded in `.context-brake/runtime/errors.jsonl` with the phase that was running (`boot_git`, for example) and the elapsed milliseconds. `doctor` lists recent entries. A session start that runs out of time falls back to the same guidance as before.

---

## 📋 CLI Commands

| Command | Options | Description |
| :--- | :--- | :--- |
| `context-brake init` | `--dry-run`, `--yes` (`-y`), `--json`, `--harness <id>`, `--exclude-harness <id>`, `--instruction-file <path>`, `--create-instructions`, `--migrate-legacy`, `--snapshot-command <text>`, `--snapshot-trigger <YELLOW\|RED>`, `--resume-command <text>`, `--snapshot-path <pattern>`, `--snapshot-skill <name>`, `--no-delegated-snapshot`, `--light`, `--no-light`, `--debug`, `--no-debug`, `--statusline-bridge`, `--no-statusline-bridge` | Detects harnesses, registers integrations, creates protocol and config, and inserts instruction markers. |
| `context-brake doctor` | `--json`, `--harness <id>` | Inspects integrations, configuration integrity, versions, support levels, missing capabilities, and active sessions with their context usage, and measures overhead p95. |
| `context-brake remove` | `--dry-run`, `--yes` (`-y`), `--json`, `--remove-state` | Safely uninstalls integrations, removes protocol, and cleans reference blocks; keeps plan/checkpoint unless `--remove-state` is provided. |
| `context-brake plan init --task="<name>"` | `--yes` (`-y`), `--json` | Creates `task_plan.json` and `state_checkpoint.json`. |
| `context-brake plan status` | `--json` | Shows step progress and the last checkpoint, and validates both state files. |
| `context-brake run --harness <claude-code\|codex-cli>` | `--approve-commands`, `--approve-steps`, `--json`, `--max-sessions <n>`, `--max-minutes <n>`, `--max-session-minutes <n>`, `--max-tokens <n>`, `--validation-timeout <n>`, `--max-failures <n>`, `--harness-arg <arg>` | Drives the plan across fresh harness sessions and validates each step before advancing. Defaults come from the `runner` section of the configuration. |
| `context-brake wrap -- <command> [args...]` | — | Runs a command inside a runner session and appends its context telemetry to the output. |

---

## 🗺️ State Files

- **`task_plan.json`:** task id and title, current step, and steps with status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `FAILED`), a validation command, and produced artifacts.
- **`state_checkpoint.json`:** active step, git state (branch, last commit, clean tree), discovered constraints, decisions, blocked items, breaking changes, and modified files.

Both files are local state: `init` lists them in `.gitignore` between `# CONTEXTBRAKE:START` and `# CONTEXTBRAKE:END`, creating the file when needed and updating the paths when the configuration changes, and default `remove` keeps that block. `remove --remove-state` deletes the plan, checkpoint, and block together. The red-zone commit records code changes only. If a state file was committed earlier, untrack it once with `git rm --cached <file>`. Both files are validated before every use. An invalid file is reported instead of being passed to the agent, and discovered constraints are never trimmed from the boot summary.

---

## 🧭 Roadmap

| PRD | Scope | Status |
| :--- | :--- | :--- |
| [Installation, detection, and diagnostics](./tasks/prd-01-instalacao-deteccao-diagnostico/prd.md) | `init`, `doctor`, `remove`, harness support levels | Implemented |
| [Installation follow-ups](./tasks/prd-01.1-pendencias-da-instalacao/prd.md) | Capabilities, overhead measurement, manifest, and installed assets the brake depends on | Implemented |
| [Telemetry, zones, and brake](./tasks/prd-02-telemetria-zonas-e-freio/prd.md) | Turn counting, context measurement, zones, blocking at the critical threshold | Implemented |
| [Brake by measured usage](./tasks/prd-02.1-freio-por-uso-medido/prd.md) | Usage-only `CRITICAL`, optional turn limits, measured usage in Claude Code, plan-aware actions | Implemented |
| [Plan, checkpoint, and boot](./tasks/prd-03-plano-checkpoint-e-boot/prd.md) | State files, boot summary, inherited-state validation | Implemented |
| [Automatic reset runner](./tasks/prd-04-runner-de-reinicio-automatico/prd.md) | Post-MVP `run` and `wrap` | Implemented |
| [Release automation](./tasks/prd-05-automacao-de-release-e-publicacao/prd.md) | Automated release and npm publishing | Implemented |
| [Delegated snapshot mode](./tasks/prd-06-modo-snapshot-delegado/prd.md) | Telemetry and brake without a task plan, using your own snapshot command | Implemented |
| [Light mode](./tasks/prd-07-modo-leve/prd.md) | Telemetry only, with a generic snapshot action, and active-session usage in `doctor` | Implemented |

The PRDs are written in Portuguese.

---

## 🤝 Contributing

This project follows Spec-Driven Development. Read [AGENTS.md](./AGENTS.md) and the PRD of the feature you are changing before opening a pull request.

Project skills and coding rules live in `.agents/`. Claude Code reads them from `.claude/`, which is git-ignored, so link it once after cloning:

```bash
# macOS and Linux
ln -s .agents .claude
```

```powershell
# Windows (PowerShell, no administrator rights needed)
New-Item -ItemType Junction -Path .claude -Target .agents
```

## 📄 License

[MIT](./LICENSE) © [Douglas Cunha](https://github.com/dougcunha)
