# ContextBrake 🛑

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![Spec-Driven Development](https://img.shields.io/badge/Paradigm-Spec--Driven%20Development-purple.svg)](https://github.com/context-brake/context-brake)

> **Context telemetry and an advisory brake for coding agents.**
> Show the agent how full its context window is, and at the zone you choose, ask it to run your snapshot command and request a fresh session.

> [!NOTE]
> ContextBrake has one mode: zone telemetry with an optional snapshot command and resume command. It never blocks a tool call. Installation and diagnostics, measured usage in Claude Code, the status line bridge, debug mode, and automatic restart in Claude Code are implemented. CI runs on Linux, macOS, and Windows. Commands and configuration below reflect the current CLI.

---

## 💡 The Problem

Long-horizon tasks run by coding agents degrade as the session grows:

1. **Context bloat:** tool outputs such as build logs, test runs, and file reads pile up in the context window.
2. **Attention decay:** as the window fills, instructions and constraints buried in the middle of the context are followed less reliably.
3. **Repeated cost:** every turn re-sends the accumulated history.
4. **No sense of budget:** the model cannot see how much context it has used or how many tools it has called, so it often keeps going until the session is cut off without saving progress.

## 🛡️ The Solution

ContextBrake plugs into the extension mechanism each harness already documents, hooks or plugins, and adds:

- 🔍 **Detection and setup:** `context-brake init` finds the harnesses a project uses, registers the integration in each one's own configuration, and reports the support level it can guarantee. It writes only its configuration, its manifest, and the harness integration; it never edits instruction files or `.gitignore`.
- 🚦 **Telemetry:** as soon as the session leaves `GREEN`, or context usage reaches the activation threshold, tool results reach the agent with the session turn, context usage (measured by the harness or estimated), zone, and recommended action.
- 🪓 **Advisory brake:** from the trigger zone on, the action names your snapshot command, such as a skill that saves the session's state, and asks the agent to end its reply with `[REQUEST_SESSION_RESET]`. Without a snapshot command, the action only tells the agent to wrap up. Tool calls always run.
- 🔁 **Resume:** after `/clear`, `/new`, or compaction, harnesses that inject context at session start tell the new session to run your resume command. In interactive Claude Code, the [automatic restart](#automatic-restart-in-claude-code) can clear the session for you.

---

## 🚦 Zones

Zones follow context usage. Default limits:

| Zone | Context usage | Action without a snapshot command | Action with `snapshot.command` (default trigger `RED`) |
| :--- | :--- | :--- | :--- |
| 🟢 `GREEN` | below 50% | Work normally. No telemetry is injected in the default mode. | Work normally. |
| 🟡 `YELLOW` | 50% to 65% | Keep working; finish the current unit before large new explorations. | Same, unless the trigger is `YELLOW`: then as in `RED`. |
| 🔴 `RED` | above 65% | Finish or pause the current unit and tell the user what remains. | Run the snapshot command, then end the reply with `[REQUEST_SESSION_RESET]`. |
| ⛔ `CRITICAL` | 75% or more | Stop starting new work; tell the user what remains. | Run the snapshot command now, then end the reply with `[REQUEST_SESSION_RESET]`. |

A turn is one completed tool call. Turn limits are optional and off by default: with `zones.greenMaxTurn` and `zones.yellowMaxTurn` set, a long session can move up to `RED` by turns, and when several conditions match, the highest zone applies. Turns never reach `CRITICAL`.

The block format and the exact action texts are specified in `docs/telemetry-block.md`. To customize the limits, change `telemetry.zones` in `context-brake.config.json`.

---

## 🧩 Supported Harnesses

Support levels come from each vendor's documentation, checked in September 2026. **Full** means the harness delivers telemetry alongside tool results and injects context at session start. **Partial** means one of these is missing, indirect, or unconfirmed. ContextBrake never blocks a tool call on any harness: zones only add telemetry and advice.

| Harness | Integration point | Support level | Main limitation |
| :--- | :--- | :--- | :--- |
| Claude Code (`claude-code`) | Hooks in `.claude/settings.json` | Full | Context usage is read from the session transcript, whose format is undocumented, with an estimate as fallback; the context window comes from the status line bridge, which `init` installs by default |
| Codex CLI (`codex-cli`) | Hooks in `.codex/hooks.json` | Full | Context usage and window are read from the session rollout file, whose format is undocumented; falls back to an estimate |
| Cursor (`cursor`) | Hooks in `.cursor/hooks.json` | Full | Context usage is only sent before compaction |
| GitHub Copilot CLI (`github-copilot-cli`) | Hooks in `.github/hooks/*.json` | Full | Context usage is not exposed to hooks, so ContextBrake estimates it |
| OpenCode (`opencode`) | Plugins in `.opencode/plugins/` | Partial | Post-tool output visibility and session-start injection are unconfirmed; OpenCode 2.x does not load this plugin format yet |
| Pi (`pi`) | Extensions in `.pi/extensions/` | Full | Automatic restart runs through an extension command |
| Oh-My-Pi (`oh-my-pi`) | Extensions in `.omp/extensions/` | Full | Restart takes one Enter on the prefilled `/context-brake-restart` |
| Antigravity CLI (`antigravity-cli`) | Hooks in `.agents/hooks.json` | Partial | Telemetry is injected through `PreInvocation`, and `PostToolUse` accepts only empty output |

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

To have the agent save its state before a reset, pass your snapshot command, and optionally the command that resumes the work in the new session:

```bash
npx context-brake init --yes --snapshot-command "/sdd-snapshot" --resume-command "/sdd-orchestrate-flow"
```

### What `context-brake init` does:

1. **Detects coding-agent harnesses:** Identifies Claude Code, Cursor, Codex CLI, GitHub Copilot CLI, Antigravity CLI, OpenCode, Pi, and Oh-My-Pi from repository signals and machine configuration.
2. **Registers integrations safely:** Injects the appropriate hooks/plugins in each harness's own configuration, preserving user settings and comments, and installs the [status line bridge](#claude-code-status-line-bridge) for Claude Code.
3. **Initializes config:** Creates `context-brake.config.json` with the telemetry limits and the `snapshot` section, and records the installed files in `.context-brake/manifest.json`.

It does not touch instruction files such as `CLAUDE.md` and `AGENTS.md`, and it does not touch `.gitignore`. Runtime state lives in `.context-brake/runtime/`, which carries its own `.gitignore`.

### Interactive Setup

Run `context-brake init` in a terminal with no other option and it asks what to configure instead of requiring flags. `init --interactive` starts the same questions on purpose.

```bash
npx context-brake init
npx context-brake init --interactive --dry-run
```

- **When it starts:** only when both stdin and stdout are terminals and none of `--yes`, `--json`, or a configuration flag (`--harness`, `--exclude-harness`, any snapshot flag, `--debug`, `--statusline-bridge`, `--auto-restart`, `--max-restarts`, and their `--no-` forms) is given. Scripts, CI, and `--json` runs never see a prompt and behave exactly as before. `--interactive` without a terminal exits with code 64 and names the flags to use instead; combined with `--yes` or `--json` it is an argument error.
- **Questions, in order:** the harnesses to configure (detected ones are marked with their support level; turning off a detected one excludes it, as `--exclude-harness` does), the snapshot command, its trigger zone and resume command (only when a command is set), restart on or off with the restart mode of each selected harness (only when one can restart), the consecutive-restart limit (only when restart is on), the Claude Code status line bridge (only when Claude Code is selected), and debug mode. Enter keeps the value shown in brackets, which is the current configuration or the default. An invalid answer prints its rule and asks again.
- **Prompts:** on a terminal the questions use arrow keys, Space to mark, and Enter to confirm (a checkbox list for harnesses, yes or no for the switches, a list for the trigger zone and the restart limit, text fields for the commands). Set `CONTEXT_BRAKE_PLAIN_PROMPTS=1`, or run in a terminal with `TERM=dumb`, to get plain line-by-line questions instead; the questions and the resulting flags are the same.
- **Summary and equivalent command:** before the plan, the assistant prints what you chose and the `context-brake init ...` command that reproduces it. Values with spaces or shell characters are single-quoted, and a value that contains a single quote is printed once for POSIX shells and once for PowerShell. Add `--yes` to repeat the setup without prompts; a command with no flags means nothing changes and starts the questions again on a terminal.
- **Confirming and cancelling:** the assistant shows the usual plan and asks the usual single confirmation. Ctrl+C or the end of input at any prompt prints `Nothing was written.` and exits with code 0, like a declined confirmation. With `--dry-run` it shows the plan and writes nothing. Typed configuration flags passed together with `--interactive` are not used; only `--dry-run` is.
- **Git Bash on Windows:** Git Bash in mintty can report that stdin or stdout is not a terminal. Then a plain `init` keeps its non-interactive behavior and `--interactive` explains that the terminal is not interactive. [docs/research/terminal-tty.md](./docs/research/terminal-tty.md) holds the probe and the results per terminal.

### Updating and Removal

- **Updating:** Running `npx context-brake init --yes` is idempotent. Run it again after upgrading ContextBrake to refresh runtime assets without touching your custom settings.
- **Upgrading from turn-based limits:** earlier versions blocked tool calls after 12 turns and wrote `turnCeiling`, `criticalTurn`, `greenMaxTurn`, and `yellowMaxTurn` into the config. Those configs stay valid, but `doctor` reports `LEGACY_TURN_LIMITS`. Run `npx context-brake init --yes` once: it removes `turnCeiling` and `criticalTurn`, removes `greenMaxTurn` and `yellowMaxTurn` when they are the retired defaults 7 and 10, and keeps custom values as optional turn limits.
- **Upgrading an installation from before the single mode:** the configuration keys `stateStorage`, `instructionFiles`, `brake`, `runner`, and the earlier mode keys are no longer recognized, and `init` and `doctor` report an invalid configuration that names each one. Delete those keys and run `npx context-brake init --yes` again. ContextBrake no longer manages the protocol file, the `CONTEXTBRAKE` marker blocks in instruction files and `.gitignore`, or the plan and checkpoint files, so remove them by hand if you no longer want them.
- **Downgrading:** a version older than this one rejects the `snapshot` section and expects the keys listed above. Run `context-brake remove` before installing an older package, then run its own `init`.
- **Diagnostics:** Run `npx context-brake doctor` anytime to verify integration integrity, measure latency overhead, and check version compatibility.
- **Uninstallation:** Run `npx context-brake remove` to delete the registered hooks, the installed assets, the configuration, the manifest, and the runtime files under `.context-brake/runtime/`. Harness settings you wrote, instruction files, and anything else under `.context-brake/` stay in place, and an installed file you edited is reported instead of deleted.

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
  "snapshot": {
    "triggerZone": "RED"
  }
}
```

`contextWindowCeiling` is the session's context budget: when the harness does not report the active model's window, zone percentages are computed against it, and the telemetry block shows `window=config`. A more accurate window comes from the harness (`window=harness`: Pi and Oh-My-Pi, Codex through the session rollout file, and Claude Code through the [status line bridge](#claude-code-status-line-bridge), which `init` installs by default) or, for the harnesses that report none (Cursor, GitHub Copilot, Antigravity, OpenCode), from a window you declare in `telemetry.declaredContextWindow` (`window=declared`). A declared window is ignored by Claude Code, Codex, Pi, and Oh-My-Pi, whose window comes from the harness. The optional `zones.greenMaxTurn` and `zones.yellowMaxTurn` must be set together, with `greenMaxTurn` lower; they raise the zone up to `RED` by turns.

### Excluding a Harness

`init --exclude-harness <id>` turns a detected harness off for the project: the id moves from `activeHarnesses` to `excludedHarnesses` in `context-brake.config.json`, the harness's hook entries, assets, and manifest entries are deleted, and a later plain `init` keeps it off (`doctor` lists it as `excluded by configuration`). `init --harness <id>` turns it back on. `remove` deletes the configuration, so the exclusion goes with it.

### Upgrading From an Earlier Build

A configuration that still carries keys ContextBrake no longer reads (for example `stateStorage`, `instructionFiles`, `brake`, `lightMode`, or `runner`) is repaired by `init`: the preview lists every key it will drop, and `--yes` applies it. `doctor` names the keys and the fix, and `remove` ignores them. `init` and `remove` also delete ContextBrake hook entries for events it no longer registers, such as `PreToolUse`, and leave every other hook as it was.

### Snapshot and Resume Commands

If your workflow saves session state with its own skill or command, as the SDD skills in this repository do, name it in the `snapshot` section:

```json
{
  "snapshot": {
    "triggerZone": "RED",
    "command": "/sdd-snapshot",
    "resumeCommand": "/sdd-orchestrate-flow"
  }
}
```

- **`command`:** from `triggerZone` on (`RED` by default, or `YELLOW`), the telemetry action becomes `run "<command>", then end reply with [REQUEST_SESSION_RESET]`, and in `CRITICAL` it says `now`. ContextBrake never runs the command; it only passes the text to the agent, so the command can be a skill, a slash command, or a short instruction.
- **`resumeCommand`:** after `/clear`, `/new`, or compaction, harnesses that inject context at session start add `[ContextBrake resume v1] Run "<resumeCommand>" before continuing.` A resume command requires a snapshot command.
- **Without a command:** the telemetry block only carries the generic actions in the [zone table](#-zones), with no reset request, and nothing is injected at session start.

Set them with `init`: `--snapshot-command <text>`, `--resume-command <text>`, and `--snapshot-trigger <YELLOW|RED>`. `--no-snapshot-command` clears both commands and keeps the trigger zone. Each command is one line of at most 200 characters. In Git Bash on Windows, run `MSYS_NO_PATHCONV=1 npx context-brake init ...`, because Git Bash rewrites an argument that starts with `/`, such as `/sdd-snapshot`, into a Windows path. `context-brake doctor` shows the settings in effect, and `doctor --json` reports them under `snapshot`.

### Debug Mode

To check ContextBrake's usage reading against the real value from the harness (`/context` or the Claude Code status line), turn on debug mode:

```bash
npx context-brake init --debug
```

This writes `"debug": true` to the configuration and adds one field to every telemetry block:

```text
debug_line="📊 ContextBrake: 42% · 53760/128000 (harness) · measured · GREEN" (end your reply with this line)
```

The agent copies that line instead of composing it. Nothing is written to instruction files.

- **Injects on every call:** while debug mode is on, ContextBrake adds the telemetry block to every tool result, in every zone, as if `injectionMode` were `always`. This costs up to 60 tokens per tool call, plus at most 40 more for the debug line. The `injectionMode` saved in the configuration does not change.
- **Relies on the agent:** the agent prints the line because the block asks it to. ContextBrake does not check that the line was printed.

`context-brake doctor` shows `debug mode: on`, and `doctor --json` reports `debugMode: true`. Debug mode does not change the `doctor` status or exit code. To turn it off, run `context-brake init --no-debug`, which drops the field from the next block and the key from the configuration.

### Active Sessions in `doctor`

`context-brake doctor` lists the repository's active sessions with their current context usage: percentage, tokens, window, zone, and whether the reading was measured or estimated. It also shows the time of each session's last activity. The data comes from the session ledger ContextBrake already keeps under `.context-brake/runtime/sessions/`, using the newest reading after the last reset, from the status line bridge or from the last tool call. ContextBrake cannot tell whether a harness process is still running. A session counts as active when its last recorded activity is within 30 minutes, and at most 10 sessions are listed. `doctor --json` reports them under `activeSessions`, and the list is omitted when no session is active.

### Claude Code Status Line Bridge

Claude Code sends the active model's context window only to the status line command, never to hooks. The bridge reads it there, so zones in Claude Code use the real window instead of `contextWindowCeiling`. `init` installs it by default. To turn it back on after an opt-out:

```bash
npx context-brake init --statusline-bridge
```

- **Local scope, per developer:** the option writes `statusLine` into `.claude/settings.local.json`, the local, unversioned settings file, with the absolute path of `.claude/hooks/context-brake-statusline.mjs`, as a single command: `node "<root>/.claude/hooks/context-brake-statusline.mjs"`, with no pipe, subshell, or separator. The versioned `.claude/settings.json` does not change, and a later `init` without the option keeps the bridge. Keep `.claude/settings.local.json` ignored by Git; `doctor` warns when it is not.
- **Your status line stays the same:** the bridge runs the status line that was in effect before (local, then project, then user settings) itself, with the same input, and prints its output unchanged, keeping `padding` and `refreshInterval`. It uses the shell that launched it: `sh` on macOS and Linux, Git Bash on Windows when the bridge was started by Git Bash, otherwise PowerShell. If you had no status line, it prints nothing. Note that Claude Code hides most footer keyboard hints (such as `esc to interrupt` and `? for shortcuts`) whenever a status line is configured, even an empty one. To keep the footer, opt out with `context-brake init --no-statusline-bridge`: later plain `init` runs remember the choice, and Claude Code zones then use `contextWindowCeiling`.
- **When the previous line fails:** a previous command that cannot start, exits non-zero, prints nothing, or takes longer than 5 seconds makes the bridge print one line with ContextBrake's own reading and say that `context-brake doctor` explains why, still exiting 0. An installation written by an older version, with the pipeline form of the command, keeps working until the next `init` rewrites it; `doctor` reports it as `STATUSLINE_BRIDGE_OUTDATED`.
- **Zones on 1M models:** after the status line first runs in a session, the telemetry block shows `tokens=<used>/<window>` with the model's `context_window_size`. With a 1,000,000-token model, `RED` starts above 650,000 tokens, and `contextWindowCeiling` no longer limits Claude Code sessions. After `/model`, the window changes with the next assistant response. When the transcript has no usage reading, the bridge's input tokens are used, following the same reset rule.
- **Non-interactive sessions:** Claude Code runs the status line only in interactive sessions, so `claude -p` sessions keep using `contextWindowCeiling`, and so do the first tool calls of a new session, before the status line first runs, and Claude Code subagents.
- **Windows without Git Bash:** Claude Code falls back to PowerShell when it does not find Git Bash. ContextBrake never changes your environment: set `CLAUDE_CODE_GIT_BASH_PATH` to the `bash.exe` of Git for Windows and restart the harness to get the Bash tool back. Until then, `doctor` warns with `STATUSLINE_POWERSHELL_FALLBACK` on Windows, after a bridge run that recorded PowerShell.

The bridge records only the window, the input tokens, the used percentage, the model id, the shell that ran it, and the time, per session, in the session ledger. `context-brake doctor` shows where the window comes from under `contextWindow`, warns with `STATUSLINE_BRIDGE_ABSENT` when Claude Code has no bridge, and warns when the local status line no longer runs the bridge, when the script is missing, or when the project or user status line changed after installation. `context-brake init --no-statusline-bridge` or `context-brake remove` restores the previous local status line, or removes the key and the file when the bridge created them.

### Automatic Restart in Claude Code

When the agent ends a reply with `[REQUEST_SESSION_RESET]`, interactive Claude Code can clear the session and resume by itself, with no keystroke. The feature is off by default; the next section covers the other harnesses:

```bash
npx context-brake init --auto-restart      # turn it on
npx context-brake init --no-auto-restart   # turn it off and remove its files
```

- **How it works:** `init --auto-restart` writes a Claude Code mod (a plugin of function hooks) under `.context-brake/claude-mod/`, registers it for you in `.claude/settings.local.json` (`extraKnownMarketplaces` and `enabledPlugins`), and adds an `autoRestart` block to `context-brake.config.json`. When a turn ends with the signal, the mod shows a one-line notice, queues `/clear`, and sends the new session one short generic seed prompt to resume. Only the signal triggers it, never a zone alone.
- **Resume text:** the mod trusts the signal and reads no state file. With `snapshot.resumeCommand` set, the new session also receives the resume text from the session start hook.
- **Loop guards and kill switches:** at most `autoRestart.maxConsecutiveRestarts` restarts (default 2; set it with `init --max-restarts <1-10>`, which needs automatic restart on) without a prompt you typed, and none when no tool call happened since the last seed. `CONTEXT_BRAKE_AUTO_RESTART=0` stands it down for one session; `claude -p` sessions and sessions with `DISABLE_AUTO_COMPACT` set are skipped.
- **Requirements:** Claude Code 2.1.287 or later, where mods are on by default (verified on 2.1.289, 4 October 2026). Mods stay off under `disableAllHooks`, `--safe-mode`, `--bare`, an organization managed policy, and in Desktop WSL sessions. The first interactive launch asks you to trust the folder.
- **`doctor`:** reports `AUTO_RESTART_OFF` or `AUTO_RESTART_READY` without a warning, and warns with `AUTO_RESTART_NOT_LOADED` (no session loaded the mod yet, with the causes above), `AUTO_RESTART_OUTDATED_MOD`, or `AUTO_RESTART_CLAUDE_TOO_OLD`. `AUTO_RESTART_LAST_SKIP` names the reason code of the last request that did not restart. The mod records only reason codes and versions, per session, in `.context-brake/runtime/restart/claude-code/`; never prompt, reply, or tool text.

`context-brake remove` deletes the mod files, the two settings keys, and the config block; a file you edited inside the mod folder is reported, not deleted.

### Restart on Other Harnesses and the Markdown Handoff

`init --auto-restart` also sets up every other active harness that can resume:

| Harness | Restart |
| :--- | :--- |
| Pi | Automatic: an extension opens the new session and seeds it |
| Oh-My-Pi | One Enter: the editor is prefilled with `/context-brake-restart` |
| Codex CLI | Semi-automatic: a notice asks for `/new`; the new session resumes by itself |
| Cursor, GitHub Copilot CLI | Semi-automatic: start a new session; it resumes by itself |
| OpenCode, Antigravity CLI | Not available: they cannot inject the resume instruction |

`init` reports the mode per harness with `AUTO_RESTART_MODE`.

Without a snapshot command, automatic restart uses a markdown handoff. From the trigger zone, the action asks the agent to save a handoff to `.context-brake/handoff.md` and end its reply with `[REQUEST_SESSION_RESET]`. An automatic restart needs a handoff written during that turn. The next session start moves it to `.context-brake/handoffs/` (the last 10 are kept) and tells the agent to read it and continue. `init` adds `.context-brake/.gitignore` so handoffs stay out of Git; `remove` keeps them.

### Hook Timeouts

Each hook call has an internal deadline of 1.5 seconds; the session start event gets 5 seconds. When a deadline elapses, the hook stops waiting, the tool call proceeds, and the failure is recorded in `.context-brake/runtime/errors.jsonl` with the phase that was running (`ledger`, for example) and the elapsed milliseconds. `doctor` lists recent entries.

---

## 📋 CLI Commands

| Command | Options | Description |
| :--- | :--- | :--- |
| `context-brake init` | `--dry-run`, `--yes` (`-y`), `--json`, `--harness <id>`, `--exclude-harness <id>`, `--snapshot-command <text>`, `--snapshot-trigger <YELLOW\|RED>`, `--resume-command <text>`, `--no-snapshot-command`, `--debug`, `--no-debug`, `--statusline-bridge`, `--no-statusline-bridge`, `--auto-restart`, `--no-auto-restart`, `--max-restarts <1-10>`, `--interactive` | Detects harnesses, registers integrations, and creates or updates the configuration and the manifest. `--exclude-harness` turns a harness off persistently and `--harness` turns it back on. In a terminal with no other option, or with `--interactive`, it asks the [setup questions](#interactive-setup). |
| `context-brake doctor` | `--json`, `--harness <id>` | Inspects integrations, configuration integrity, versions, support levels, missing capabilities, snapshot settings, and active sessions with their context usage, and measures overhead p95. |
| `context-brake remove` | `--dry-run`, `--yes` (`-y`), `--json` | Uninstalls the integrations and deletes the configuration, the manifest, and the runtime files. |

---

## 🧭 Roadmap

| PRD | Scope | Status |
| :--- | :--- | :--- |
| [Installation, detection, and diagnostics](./tasks/prd-01-instalacao-deteccao-diagnostico/prd.md) | `init`, `doctor`, `remove`, harness support levels | Implemented |
| [Installation follow-ups](./tasks/prd-01.1-pendencias-da-instalacao/prd.md) | Capabilities, overhead measurement, manifest, and installed assets | Implemented |
| [Telemetry, zones, and brake](./tasks/prd-02-telemetria-zonas-e-freio/prd.md) | Turn counting, context measurement, zones | Implemented; the tool-call deny was removed by the single mode |
| [Brake by measured usage](./tasks/prd-02.1-freio-por-uso-medido/prd.md) | Usage-only `CRITICAL`, optional turn limits, measured usage in Claude Code | Implemented |
| [Claude Code context window](./tasks/prd-02.2-janela-de-contexto-do-claude-code/prd.md) | Status line bridge | Implemented |
| [Plan, checkpoint, and boot](./tasks/prd-03-plano-checkpoint-e-boot/prd.md) | State files and boot summary | Superseded by the single mode |
| [Automatic reset runner](./tasks/prd-04-runner-de-reinicio-automatico/prd.md) | Post-MVP runner | Superseded by the single mode |
| [Release automation](./tasks/prd-05-automacao-de-release-e-publicacao/prd.md) | Automated release and npm publishing | Implemented |
| [Delegated snapshot mode](./tasks/prd-06-modo-snapshot-delegado/prd.md) | Snapshot command without a task plan | Superseded by the single mode |
| [Light mode](./tasks/prd-07-modo-leve/prd.md) | Telemetry only, and active-session usage in `doctor` | Superseded by the single mode |
| [Debug mode](./tasks/prd-08-modo-debug/prd.md) | Usage line printed by the agent | Implemented |
| [Brake with a trusted window](./tasks/prd-09-freio-com-janela-confiavel/prd.md) | Window origin and declared window | Implemented |
| [Status line under PowerShell](./tasks/prd-10-statusline-powershell-e-modo-light/prd.md) | Shell-neutral bridge and debug line | Implemented |
| [Automatic restart in Claude Code](./tasks/prd-11-reinicio-automatico-no-claude-code/prd.md) | Claude Code mod that clears and resumes the session | Implemented |
| [Single mode](./tasks/prd-12-refatoracao-modo-leve-modo-unico/prd.md) | One mode with optional snapshot and resume commands, advisory brake | In progress |
| [Fast test suite](./tasks/prd-13-refatoracao-modo-leve-testes-rapidos/prd.md) | Test budget | Planned |
| [Restart and handoff across harnesses](./tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md) | Automatic restart and markdown handoff beyond Claude Code | In progress |

The PRDs are written in Portuguese, except the later ones.

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
