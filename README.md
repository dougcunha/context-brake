# ContextBrake 🛑

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![Spec-Driven Development](https://img.shields.io/badge/Paradigm-Spec--Driven%20Development-purple.svg)](https://github.com/context-brake/context-brake)

> **Context telemetry, a tool-call brake, and checkpoint-driven session resets for coding agents.**
> Keep long tasks from degrading as the context window fills, and carry their state safely into a fresh session.

> [!NOTE]
> The MVP (installation and diagnostics, telemetry and brake, plan, checkpoint, and boot) is implemented, along with the automatic reset runner, delegated snapshot mode, and the usage-based brake with measured usage in Claude Code. CI runs on Linux, macOS, and Windows. Commands and configuration below reflect the current CLI.

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
- 🪓 **Brake:** once context usage reaches the critical threshold, tool calls are blocked except the ones needed to save state. The number of tool calls alone never blocks.
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

At the critical threshold (by default, 75% context usage), ContextBrake engages the tool-call brake on supported harnesses. General tool executions are intercepted and denied before execution with an agent-facing block message.

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
| Claude Code (`claude-code`) | Hooks in `.claude/settings.json` | Full | Context usage is read from the session transcript, whose format is undocumented, with an estimate as fallback; the context window comes from the optional status line bridge; a hook timeout or failure without an explicit deny lets the call proceed |
| Codex CLI (`codex-cli`) | Hooks in `.codex/hooks.json` | Partial | Hosted tools such as web search bypass hooks; hook errors and timeouts let the call proceed |
| Cursor (`cursor`) | Hooks in `.cursor/hooks.json` | Full | Context usage is only sent before compaction |
| GitHub Copilot CLI (`github-copilot-cli`) | Hooks in `.github/hooks/*.json` | Full | A hook timeout lets the tool call proceed |
| OpenCode (`opencode`) | Plugins in `.opencode/plugins/` | Partial | Whether the pre-tool hook runs for every tool is unconfirmed, and post-tool output visibility is unconfirmed |
| Pi (`pi`) | Extensions in `.pi/extensions/` | Full | Timeout behavior of extension handlers is not documented |
| Oh-My-Pi (`oh-my-pi`) | Extensions in `.omp/extensions/` | Full | Timeout behavior of extension handlers is not documented |
| Antigravity CLI (`antigravity-cli`) | Hooks in `.agents/hooks.json` | Partial | Telemetry is injected through `PreInvocation`; hook coverage in the CLI is unconfirmed, and `PreToolUse` `allow` auto-approves calls |

For Antigravity CLI, `PreToolUse` requires an explicit decision (`allow` or `deny`). ContextBrake emits `allow` below the ceiling to permit tool execution, which auto-approves the call and replaces the harness's normal permission prompt. Above the ceiling, `deny` is returned.

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

### What `context-brake init` does:

1. **Detects coding-agent harnesses:** Identifies Claude Code, Cursor, Codex CLI, GitHub Copilot CLI, Antigravity CLI, OpenCode, Pi, and Oh-My-Pi from repository signals and machine configuration.
2. **Registers integrations safely:** Injects the appropriate hooks/plugins in each harness's own configuration, preserving user settings and comments.
3. **Initializes protocol & config:** Creates `docs/context-brake-protocol.md` and `context-brake.config.json`.
4. **Adds reference markers:** Inserts a short three-line pointer between `<!-- CONTEXTBRAKE:START -->` and `<!-- CONTEXTBRAKE:END -->` in existing `CLAUDE.md` and `AGENTS.md` instruction files without modifying any other content.
5. **Ignores local state:** Adds the plan and checkpoint paths to `.gitignore` between `# CONTEXTBRAKE:START` and `# CONTEXTBRAKE:END`, creating the file when needed, updating the paths when the configuration changes, and leaving the rest of the file untouched. Plans and checkpoints stay on your machine and are never committed.

### Updating and Removal

- **Updating:** Running `npx context-brake init --yes` is completely idempotent. Run it again after upgrading ContextBrake to refresh runtime assets and synchronize protocol references without touching your custom settings. If custom allowed commands are added or protocol rows change, `doctor` may report `PROTOCOL_FILE_MISMATCH` until `context-brake init --yes` is rerun to regenerate the protocol table to match the current configuration.
- **Upgrading from turn-based limits:** earlier versions blocked tool calls after 12 turns and wrote `turnCeiling`, `criticalTurn`, `greenMaxTurn`, and `yellowMaxTurn` into the config. Those configs stay valid, but `doctor` reports `LEGACY_TURN_LIMITS`. Run `npx context-brake init --yes` once: it removes `turnCeiling` and `criticalTurn`, removes `greenMaxTurn` and `yellowMaxTurn` when they are the retired defaults 7 and 10, and keeps custom values as optional turn limits.
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

`contextWindowCeiling` is the session's context budget: when the harness does not report the active model's window, zone percentages are computed against it. Claude Code reports usage but not the window to hooks, so there the percentages measure usage against this budget; a model with a 200,000 or 1,000,000-token window reaches `CRITICAL` at 96,000 tokens with the default 128,000. Raise it to let sessions run longer, or install the [status line bridge](#claude-code-status-line-bridge) so Claude Code sessions use the model's real window. The optional `zones.greenMaxTurn` and `zones.yellowMaxTurn` must be set together, with `greenMaxTurn` lower; they raise the zone up to `RED` by turns. `brake.additionalAllowedCommands` defines extra shell commands allowed in the `CRITICAL` zone (matched against leading tokens, without shell operators). With `instructCheckpointCommit`, the protocol tells the agent to commit the code; ContextBrake never commits on its own.

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

### Claude Code Status Line Bridge

Claude Code sends the active model's context window only to the status line command, never to hooks. The optional bridge reads it there, so zones in Claude Code use the real window instead of `contextWindowCeiling`:

```bash
npx context-brake init --statusline-bridge
```

- **Local scope, per developer:** the option writes `statusLine` into `.claude/settings.local.json`, the local, unversioned settings file, with the absolute path of `.claude/hooks/context-brake-statusline.mjs`. The versioned `.claude/settings.json` does not change, and a later `init` without the option keeps the bridge. Keep `.claude/settings.local.json` ignored by Git; `doctor` warns when it is not.
- **Your status line stays the same:** the bridge runs the status line that was in effect before (local, then project, then user settings) through a pipe, with the same input, output, and exit code, and keeps `padding` and `refreshInterval`. If you had no status line, it prints nothing. Note that Claude Code hides most footer keyboard hints (such as `esc to interrupt` and `? for shortcuts`) whenever a status line is configured, even an empty one, which is why the bridge is opt-in.
- **Zones on 1M models:** after the status line first runs in a session, the telemetry block shows `tokens=<used>/<window>` with the model's `context_window_size`. With a 1,000,000-token model, `RED` starts above 650,000 tokens, and `contextWindowCeiling` no longer limits Claude Code sessions. After `/model`, the window changes with the next assistant response. When the transcript has no usage reading, the bridge's input tokens are used, following the same reset rule.
- **Non-interactive sessions:** Claude Code runs the status line only in interactive sessions, so `claude -p`, including the sessions of `context-brake run`, keep using `contextWindowCeiling`.
- **Windows:** Claude Code runs the status line through Git Bash, or through PowerShell when Git Bash is absent. The bridge command is a `sh` pipeline, verified with Git Bash; Windows without Git Bash (PowerShell only) is not verified.

The bridge records only the window, the input tokens, the used percentage, the model id, and the time, per session, in the session ledger. `context-brake doctor` shows where the window comes from under `contextWindow` and warns when the local status line no longer runs the bridge, when the script is missing, or when the project or user status line changed after installation. `context-brake init --no-statusline-bridge` or `context-brake remove` restores the previous local status line, or removes the key and the file when the bridge created them.

---

## 📋 CLI Commands

| Command | Options | Description |
| :--- | :--- | :--- |
| `context-brake init` | `--dry-run`, `--yes` (`-y`), `--json`, `--harness <id>`, `--exclude-harness <id>`, `--instruction-file <path>`, `--create-instructions`, `--migrate-legacy`, `--snapshot-command <text>`, `--snapshot-trigger <YELLOW\|RED>`, `--resume-command <text>`, `--snapshot-path <pattern>`, `--snapshot-skill <name>`, `--no-delegated-snapshot`, `--statusline-bridge`, `--no-statusline-bridge` | Detects harnesses, registers integrations, creates protocol and config, and inserts instruction markers. |
| `context-brake doctor` | `--json`, `--harness <id>` | Inspects integrations, configuration integrity, versions, support levels, missing capabilities, and measures overhead p95. |
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
