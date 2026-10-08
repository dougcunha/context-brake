# ContextBrake Telemetry Block Specification (v3)

This document defines the agent-facing telemetry block, the resume text, the user-facing reset notice, and the local runtime storage of ContextBrake v3. ContextBrake never denies a tool call: zones add telemetry and advice only.

## 1. Telemetry Block Format & Field Order

The telemetry block is a single-line ASCII string appended or injected into tool results. Fields appear in a fixed sequence separated by single spaces:

```text
[ContextBrake v3] turn=<t>[/<redStartTurn>] usage=<p>% tokens=<used>/<window> source=<measured|estimated> window=<harness|declared|config> zone=<GREEN|YELLOW|RED|CRITICAL> action=<action_text>
```

### Fields

1. **Header**: `[ContextBrake v3]` identifies the block specification version.
2. **`turn=<t>[/<redStartTurn>]`**: completed tool turns since the last reset. The `/<redStartTurn>` suffix appears only when optional turn limits (`greenMaxTurn` and `yellowMaxTurn`) are configured, and shows the turn where `RED` starts (`yellowMaxTurn + 1`).
3. **`usage=<p>%`**: context usage as an integer percentage, computed as `floor(usedTokens * 100 / windowTokens)`.
4. **`tokens=<used>/<window>`**: tokens currently used and the active context window. When the harness reports no window, the window is `contextWindowCeiling`, the session's context budget. If measured usage is unavailable, estimated tokens are shown over the same window: the harness-reported window first, then the Claude Code status line window, then `contextWindowCeiling`. A reset drops the measured tokens but keeps the window.
5. **`source=<measured|estimated>`**:
   - `measured`: token count reported by the harness (Pi and Oh-My-Pi extension APIs) or read from the `usage` of the latest main-thread assistant message in the Claude Code session transcript, or from the latest `token_count` event in the Codex CLI session rollout; neither format is documented.
   - `estimated`: token count estimated from observed tool inputs, outputs, baseline tokens, and turns.
6. **`window=<harness|declared|config>`**: where the window in `tokens=` came from. `source=` describes only the used tokens.
   - `harness`: reported by the harness for this session (Pi and Oh-My-Pi extension APIs, the Codex CLI session rollout, or the Claude Code status line bridge).
   - `declared`: `telemetry.declaredContextWindow`, honored only by harnesses that report no window (Cursor, GitHub Copilot, Antigravity, OpenCode).
   - `config`: the `contextWindowCeiling` fallback, the least accurate origin; `doctor` explains how to get a better one.
7. **`zone=<GREEN|YELLOW|RED|CRITICAL>`**: session classification. `CRITICAL` depends only on context usage; optional turn limits can raise a session up to `RED`.
8. **`action=<action_text>`**: what the agent should do in the current zone. The text depends on the `snapshot` section of `context-brake.config.json`.

### Action Texts

Without `snapshot.command`, or in a zone below `snapshot.triggerZone`, the action is generic:

| Zone | Action |
| --- | --- |
| `GREEN` | `work normally` |
| `YELLOW` | `keep working; finish the current unit before large new explorations` |
| `RED` | `finish or pause the current unit and tell the user what remains` |
| `CRITICAL` | `stop starting new work; tell the user what remains` |

With `snapshot.command` set, from `snapshot.triggerZone` (`RED` by default, or `YELLOW`) on, the action names the command and asks for a session reset. `GREEN` always stays generic:

| Zone | Action |
| --- | --- |
| `YELLOW` or `RED` at or above the trigger | `run "<command>", then end reply with [REQUEST_SESSION_RESET]` |
| `CRITICAL` | `run "<command>" now, then end reply with [REQUEST_SESSION_RESET]` |

ContextBrake never runs the command; it only passes the text to the agent, so the command can be a skill, a slash command, or a short instruction. The longest block, with any action variant and a typical command, stays within 60 tokens.

### Versioning Rule

Field names, field order, field meanings, and exact action texts constitute the version 3 contract. Any addition, reordering, removal, change of meaning of a field, or modification of action texts requires incrementing the header version (e.g., `[ContextBrake v4]`).

### Changes Within v3

- prd-12 replaced the plan-aware and blocking action texts with the texts above, without a version bump, because ContextBrake had no release that agents depended on.

### Changes from v2

- New `window=` field after `source=`, with the origin of the window.

### Changes from v1

- The turn suffix is optional and shows where `RED` starts.
- `CRITICAL` is reached only by context usage.

---

## 2. Examples by Zone

### 🟢 `GREEN` Zone
Work normally without interruption. In `threshold_only` mode, no telemetry is injected below the activation threshold. When injected (or in `always` mode):

```text
[ContextBrake v3] turn=4 usage=30% tokens=38400/128000 source=estimated window=config zone=GREEN action=work normally
```

### 🟡 `YELLOW` Zone
The session approaches the budget boundary, and the agent keeps working:

```text
[ContextBrake v3] turn=9 usage=55% tokens=70400/128000 source=estimated window=config zone=YELLOW action=keep working; finish the current unit before large new explorations
```

With turn limits of `greenMaxTurn: 59` and `yellowMaxTurn: 99`, the turn shows where `RED` starts:

```text
[ContextBrake v3] turn=60/100 usage=10% tokens=12800/128000 source=estimated window=config zone=YELLOW action=keep working; finish the current unit before large new explorations
```

### 🔴 `RED` Zone
The session is in danger of context exhaustion. With `snapshot.command` set to `/sdd-snapshot`, the agent saves its state and requests a session reset; without it, the agent wraps up and reports what remains:

```text
[ContextBrake v3] turn=11 usage=68% tokens=87040/128000 source=estimated window=config zone=RED action=run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET]
[ContextBrake v3] turn=11 usage=68% tokens=87040/128000 source=estimated window=config zone=RED action=finish or pause the current unit and tell the user what remains
```

### ⛔ `CRITICAL` Zone
The session has reached the critical usage threshold. Tool calls still run:

```text
[ContextBrake v3] turn=12 usage=76% tokens=97280/128000 source=measured window=harness zone=CRITICAL action=run "/sdd-snapshot" now, then end reply with [REQUEST_SESSION_RESET]
```

---

## 3. Resume Text (Agent-Facing)

With `snapshot.resumeCommand` set, harnesses that inject context at session start add this line after `/clear`, `/new`, or compaction, and after a hook deadline that reset the session:

```text
[ContextBrake resume v1] Run "<resumeCommand>" before continuing.
```

Without `resumeCommand`, nothing is injected at session start.

---

## 4. Reset Notice (User-Facing)

When the agent signals a requested reset by ending its final response with `[REQUEST_SESSION_RESET]`, ContextBrake delivers a user-visible notification indicating the harness-specific reset command:

```text
ContextBrake: the agent requested a session reset. Run <command> to start a new session.
```

- **`/clear`**: Claude Code
- **`/new`**: Codex CLI, Pi, Oh-My-Pi

With automatic restart on, interactive Claude Code clears the session by itself instead (see the README).

---

## 5. Session Ledger, Logs, and Privacy

All local runtime state is stored strictly inside `.context-brake/runtime/`, which is ignored by `.context-brake/runtime/.gitignore`. `context-brake remove` deletes it.

### Locations

- **Session Ledgers**: `.context-brake/runtime/sessions/<harness>/<key>.jsonl`
  - `key` is the first 32 characters of `sha256(sessionId + "\0" + (agentId ?? ""))`.
  - Appended on each post-tool event; records session metadata, turns, token counts, and reset events.
  - With the Claude Code status line bridge, each status line run appends a `statusline` line for the main session, for example `{"v":1,"type":"statusline","at":"2026-09-25T12:00:00.000Z","windowTokens":1000000,"inputTokens":200000,"usedPercentage":20,"model":"claude-opus-5-5"}`. When the bridge also ran the previous status line, the line carries `shell` (`sh`, `git-bash`, or `powershell`), which `doctor` reads to warn on Windows when Claude Code fell back to PowerShell. Hooks take the window from the last non-null `windowTokens`, across resets, and use `inputTokens` only when the transcript gives no reading and the line is newer than the last reset. Null values never replace earlier ones. Versions that do not know the line skip it.
- **Error Log**: `.context-brake/runtime/errors.jsonl`
  - Records integration errors and deadline timeouts with timestamp, harness, event name, error code, and error class name. Status line bridge write failures use the event `StatusLine`. A `DEADLINE_EXCEEDED` record also carries `phase`, the step that was running (`ledger`, for example), and `elapsedMs`; lines written before those fields stay valid.

### Metadata-Only Rule

In compliance with project privacy requirements, ContextBrake never writes prompt contents, user queries, tool arguments, tool outputs, file contents, or shell command strings into ledgers or log files. Only metadata (identifiers, counts, zones, and reason codes) is persisted. The status line bridge stores only the window size, input tokens, used percentage, model id, and time; costs, paths, workspace names, and the status line output are never stored.
