# ContextBrake 🛑

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![Spec-Driven Development](https://img.shields.io/badge/Paradigm-Spec--Driven%20Development-purple.svg)](https://github.com/context-brake/context-brake)

> **Context telemetry, a tool-call brake, and checkpoint-driven session resets for coding agents.**
> Keep long tasks from degrading as the context window fills, and carry their state safely into a fresh session.

> [!NOTE]
> PRD-01 (Installation, Detection, and Diagnostics) is implemented and verified across Linux, macOS, and Windows. Commands and configuration below reflect the implemented CLI and upcoming roadmap features.

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
- 🪓 **Brake:** above a critical ceiling, tool calls are blocked except the ones needed to save state.
- 💾 **Checkpoint and boot:** the agent saves progress to `task_plan.json` and `state_checkpoint.json`, local files that `init` adds to `.gitignore`. After you run `/clear` or `/new`, the new session starts with a boot summary and validates the inherited state before editing code.

---

## 🚦 Zones

Default limits. A turn is one completed tool call, and when several conditions match, the highest zone applies.

| Zone | Context usage | Turns | Agent behavior |
| :--- | :--- | :--- | :--- |
| 🟢 `GREEN` | below 50% | up to 7 | Normal work. No telemetry is injected in the default mode. |
| 🟡 `YELLOW` | 50% to 65% | 8 to 10 | Finish the current edit, start no new plan step, run the step's validation command. |
| 🔴 `RED` | above 65% | 11 or more | Save plan and checkpoint, commit the code with `checkpoint: <step title>` if validation passes, and end with `[REQUEST_SESSION_RESET]`. |
| ⛔ `CRITICAL` | 75% or more | 12 or more | Only state-saving calls run: reading and writing the plan and checkpoint, the validation command, `git status`, `git add`, and `git commit`. |

Blocking is enforced only on harnesses with **Full** support; `doctor` lists hook timeouts or crashes that can still release a call as limitations. The agent-facing rules live in `docs/context-brake-protocol.md`; instruction files get only a short reference to it, so the protocol does not fill every session's context.

---

## 🧩 Supported Harnesses

Support levels come from each vendor's documentation, checked in September 2026. **Full** means the harness honors ContextBrake's explicit deny on every tool call, delivers telemetry alongside tool results, and injects a boot summary at session start. **Partial** means one of these is missing, indirect, unconfirmed, or does not cover every tool.

| Harness | Integration point | Support level | Main limitation |
| :--- | :--- | :--- | :--- |
| Claude Code (`claude-code`) | Hooks in `.claude/settings.json` | Full | Context usage reaches the status line, not hooks |
| Codex CLI (`codex-cli`) | Hooks in `.codex/hooks.json` | Partial | Hosted tools such as web search bypass hooks |
| Cursor (`cursor`) | Hooks in `.cursor/hooks.json` | Full | Context usage is only sent before compaction |
| GitHub Copilot CLI (`github-copilot-cli`) | Hooks in `.github/hooks/*.json` | Full | A hook timeout lets the tool call proceed |
| OpenCode (`opencode`) | Plugins in `.opencode/plugins/` | Partial | Changing tool output from a plugin is unconfirmed |
| Pi (`pi`) | Extensions in `.pi/extensions/` | Full | None documented |
| Oh-My-Pi (`oh-my-pi`) | Hooks in `.omp/hooks/` | Full | None documented |
| Antigravity CLI (`antigravity-cli`) | Hooks in `.agents/hooks.json` | Partial | Context can only be injected before model calls |

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
4. **Adds reference markers:** Inserts a short 4-line pointer between `<!-- CONTEXTBRAKE:START -->` and `<!-- CONTEXTBRAKE:END -->` in existing `CLAUDE.md` and `AGENTS.md` instruction files without modifying any other content.
5. **Ignores local state (planned):** Adds the plan and checkpoint paths to `.gitignore` between `# CONTEXTBRAKE:START` and `# CONTEXTBRAKE:END`, creating the file when needed. Plans and checkpoints stay on your machine and are never committed.

### Updating and Removal

- **Updating:** Running `npx context-brake init --yes` is completely idempotent. Run it again after upgrading ContextBrake to refresh runtime assets and protocol references without touching your custom settings.
- **Diagnostics:** Run `npx context-brake doctor` anytime to verify integration integrity, measure latency overhead, and check version compatibility.
- **Uninstallation:** Run `npx context-brake remove` to cleanly remove registered hooks, protocol docs, and instruction markers while preserving your plans, checkpoints, and harness configurations; the state files stay git-ignored. Add `--remove-state` to also delete them and their `.gitignore` block.

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
    "turnCeiling": 12,
    "zones": {
      "greenMaxPercentage": 49,
      "yellowMaxPercentage": 65,
      "criticalPercentage": 75,
      "greenMaxTurn": 7,
      "yellowMaxTurn": 10,
      "criticalTurn": 12
    }
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

`contextWindowCeiling` is used only when the harness does not report the active model's window. `turnCeiling` must equal `zones.criticalTurn`; change both to move the turn ceiling. With `instructCheckpointCommit`, the protocol tells the agent to commit the code; ContextBrake never commits on its own.

---

## 📋 CLI Commands

### Implemented Commands (MVP)

| Command | Options | Description |
| :--- | :--- | :--- |
| `context-brake init` | `--dry-run`, `--yes` (`-y`), `--json`, `--harness <id>`, `--exclude-harness <id>`, `--instruction-file <path>`, `--create-instructions`, `--migrate-legacy` | Detects harnesses, registers integrations, creates protocol and config, and inserts instruction markers. |
| `context-brake doctor` | `--json`, `--harness <id>` | Inspects integrations, configuration integrity, versions, support levels, missing capabilities, and measures overhead p95. |
| `context-brake remove` | `--dry-run`, `--yes` (`-y`), `--json`, `--remove-state` | Safely uninstalls integrations, removes protocol, and cleans reference blocks; keeps plan/checkpoint unless `--remove-state` is provided. |

### Roadmap Commands (Planned)

| Command | Phase | Description |
| :--- | :--- | :--- |
| `context-brake plan init --task="<name>"` | PRD 03 | Creates `task_plan.json` and `state_checkpoint.json`. |
| `context-brake plan status` | PRD 03 | Shows step progress, last checkpoint, and validates state files. |
| `context-brake run` | Post-MVP | Runs the plan across fresh harness sessions and validates each step. |
| `context-brake wrap -- <command>` | Post-MVP | Runs a command inside a runner session and appends telemetry. |

---

## 🗺️ State Files

- **`task_plan.json`:** task id and title, current step, and steps with status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `FAILED`), a validation command, and produced artifacts.
- **`state_checkpoint.json`:** active step, git state (branch, last commit, clean tree), discovered constraints, decisions, blocked items, breaking changes, and modified files.

Both files are local state: `init` lists them in `.gitignore`, and the red-zone commit records code changes only. If a state file was committed earlier, untrack it once with `git rm --cached <file>`. Both files are validated before every use. An invalid file is reported instead of being passed to the agent, and discovered constraints are never trimmed from the boot summary.

---

## 🧭 Roadmap

| PRD | Scope |
| :--- | :--- |
| [Installation, detection, and diagnostics](./tasks/prd-01-instalacao-deteccao-diagnostico/prd.md) | `init`, `doctor`, `remove`, harness support levels |
| [Telemetry, zones, and brake](./tasks/prd-02-telemetria-zonas-e-freio/prd.md) | Turn counting, context measurement, zones, blocking above the ceiling |
| [Plan, checkpoint, and boot](./tasks/prd-03-plano-checkpoint-e-boot/prd.md) | State files, boot summary, inherited-state validation |
| [Automatic reset runner](./tasks/prd-04-runner-de-reinicio-automatico/prd.md) | Post-MVP `run` and `wrap` |

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
