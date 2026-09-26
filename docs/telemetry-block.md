# ContextBrake Telemetry Block & Brake Specification (v2)

This document defines the agent-facing telemetry block, pre-tool block messages, user-facing notices, and local runtime storage contracts for ContextBrake v2.

## 1. Telemetry Block Format & Field Order

The telemetry block is a single-line ASCII string appended or injected into tool results. Fields appear in a fixed sequence separated by single spaces:

```text
[ContextBrake v2] turn=<t>[/<redStartTurn>] usage=<p>% tokens=<used>/<window> source=<measured|estimated> zone=<GREEN|YELLOW|RED|CRITICAL> action=<action_text>
```

### Fields

1. **Header**: `[ContextBrake v2]` identifies the block specification version.
2. **`turn=<t>[/<redStartTurn>]`**: completed tool turns since the last reset. The `/<redStartTurn>` suffix appears only when optional turn limits (`greenMaxTurn` and `yellowMaxTurn`) are configured, and shows the turn where `RED` starts (`yellowMaxTurn + 1`). Turns never block tool calls.
3. **`usage=<p>%`**: context usage as an integer percentage, computed as `floor(usedTokens * 100 / windowTokens)`.
4. **`tokens=<used>/<window>`**: tokens currently used and the active context window. When the harness reports no window, the window is `contextWindowCeiling`, the session's context budget. If measured usage is unavailable, estimated tokens are shown over the same window: the harness-reported window first, then the Claude Code status line window, then `contextWindowCeiling`. A reset drops the measured tokens but keeps the window.
5. **`source=<measured|estimated>`**:
   - `measured`: token count reported by the harness (Pi and Oh-My-Pi extension APIs) or read from the `usage` of the latest main-thread assistant message in the Claude Code session transcript, whose format is undocumented.
   - `estimated`: token count estimated from observed tool inputs, outputs, baseline tokens, and turns.
6. **`zone=<GREEN|YELLOW|RED|CRITICAL>`**: session classification. `CRITICAL` depends only on context usage; optional turn limits can raise a session up to `RED`.
7. **`action=<action_text>`**: prescriptive action for the agent matching the current zone. In `YELLOW` and `RED`, the text depends on whether the plan file (`task_plan.json` by default) exists and parses.

### Action Texts

| Zone | With a plan file | Without a plan file |
| --- | --- | --- |
| `GREEN` | `work normally` | `work normally` |
| `YELLOW` | `finish the current edit, start no new step, run the step validation` | `keep working; finish the current unit before large new explorations` |
| `RED` | `save plan and checkpoint, commit if validation passes, end reply with [REQUEST_SESSION_RESET]` | `finish or pause the current unit, record progress, end reply with [REQUEST_SESSION_RESET]` |
| `CRITICAL` | `other tools are blocked; finish the RED actions` | `other tools are blocked; finish the RED actions` |

The longest block, with any action variant, stays within 60 tokens.

### Versioning Rule

Field names, field order, field meanings, and exact action texts constitute the version 2 contract. Any addition, reordering, removal, change of meaning of a field, or modification of action texts requires incrementing the header version (e.g., `[ContextBrake v3]`).

### Changes from v1

- The turn suffix is optional and shows where `RED` starts; in v1 it was the critical turn ceiling, which blocked tool calls.
- `CRITICAL` is reached only by context usage.
- `YELLOW` and `RED` carry a no-plan action variant.

---

## 2. Examples by Zone

### 🟢 `GREEN` Zone
Work normally without interruption. In `threshold_only` mode, no telemetry is injected below the activation threshold. When injected (or in `always` mode):

```text
[ContextBrake v2] turn=4 usage=30% tokens=38400/128000 source=estimated zone=GREEN action=work normally
```

### 🟡 `YELLOW` Zone
The session approaches the budget boundary. With a plan file, the agent finishes the current edit and validates; without one, it keeps working:

```text
[ContextBrake v2] turn=9 usage=55% tokens=70400/128000 source=estimated zone=YELLOW action=finish the current edit, start no new step, run the step validation
[ContextBrake v2] turn=9 usage=55% tokens=70400/128000 source=estimated zone=YELLOW action=keep working; finish the current unit before large new explorations
```

With turn limits of `greenMaxTurn: 59` and `yellowMaxTurn: 99`, the turn shows where `RED` starts:

```text
[ContextBrake v2] turn=60/100 usage=10% tokens=12800/128000 source=estimated zone=YELLOW action=finish the current edit, start no new step, run the step validation
```

### 🔴 `RED` Zone
The session is in danger of context exhaustion. The agent saves state and requests a session reset:

```text
[ContextBrake v2] turn=11 usage=68% tokens=87040/128000 source=estimated zone=RED action=save plan and checkpoint, commit if validation passes, end reply with [REQUEST_SESSION_RESET]
[ContextBrake v2] turn=11 usage=68% tokens=87040/128000 source=estimated zone=RED action=finish or pause the current unit, record progress, end reply with [REQUEST_SESSION_RESET]
```

### ⛔ `CRITICAL` Zone
The session has reached or exceeded the critical usage threshold. General tool execution is blocked; only state-saving actions are permitted:

```text
[ContextBrake v2] turn=12 usage=76% tokens=97280/128000 source=estimated zone=CRITICAL action=other tools are blocked; finish the RED actions
```

---

## 3. Block Message (Agent-Facing)

When an agent attempts to execute a non-allowlisted tool call in the `CRITICAL` zone, the tool call is denied before execution with the following message:

```text
[ContextBrake v2] BLOCKED tool=<name> zone=CRITICAL turn=<t>[/<redStartTurn>] usage=<p>% tokens=<used>/<window> source=<source> reason=critical_ceiling. Allowed: read or write <planFile> and <checkpointFile>, the step validation command, git status, git add, git commit<, extra commands>. Save plan and checkpoint, commit if validation passes, end reply with [REQUEST_SESSION_RESET].
```

### Failure Variant

If an unexpected runtime failure, invalid configuration, or timeout occurs while the last recorded zone in the session ledger was `CRITICAL`, ContextBrake fails safe and denies non-allowlisted calls with:

```text
[ContextBrake v2] BLOCKED tool=<name> zone=CRITICAL last recorded zone=CRITICAL reason=integration_failure. Allowed: read or write <planFile> and <checkpointFile>, the step validation command, git status, git add, git commit<, extra commands>. Save plan and checkpoint, commit if validation passes, end reply with [REQUEST_SESSION_RESET].
```

### User Message

Where harnesses support separate human-visible messages (such as Cursor `user_message`), the user receives:

```text
ContextBrake blocked <name>: the session is above the critical ceiling.
```

---

## 4. Reset Notice (User-Facing)

When the agent signals a requested reset by ending its final response with `[REQUEST_SESSION_RESET]`, ContextBrake delivers a user-visible notification indicating the harness-specific reset command:

```text
ContextBrake: the agent requested a session reset. Run <command> to start a new session.
```

- **`/clear`**: Claude Code
- **`/new`**: Codex CLI, Pi, Oh-My-Pi

---

## 5. Session Ledger, Logs, and Privacy

All local runtime state is stored strictly inside `.context-brake/runtime/`, which is ignored by `.context-brake/runtime/.gitignore`.

### Locations

- **Session Ledgers**: `.context-brake/runtime/sessions/<harness>/<key>.jsonl`
  - `key` is the first 32 characters of `sha256(sessionId + "\0" + (agentId ?? ""))`.
  - Appended on each post-tool event; records session metadata, turns, token counts, and reset events.
  - With the Claude Code status line bridge, each status line run appends a `statusline` line for the main session, for example `{"v":1,"type":"statusline","at":"2026-09-25T12:00:00.000Z","windowTokens":1000000,"inputTokens":200000,"usedPercentage":20,"model":"claude-opus-5-5"}`. Hooks take the window from the last non-null `windowTokens`, across resets, and use `inputTokens` only when the transcript gives no reading and the line is newer than the last reset. Null values never replace earlier ones. Versions that do not know the line skip it.
- **Block Log**: `.context-brake/runtime/blocks.jsonl`
  - Records denied tool calls with timestamp, harness, session ID, tool name, zone, and reason code.
- **Error Log**: `.context-brake/runtime/errors.jsonl`
  - Records integration errors and deadline timeouts with timestamp, harness, event name, error code, and error class name. Status line bridge write failures use the event `StatusLine`.

### Metadata-Only Rule

In compliance with project privacy requirements, ContextBrake never writes prompt contents, user queries, tool arguments, tool outputs, file contents, or shell command strings into ledgers or log files. Only metadata (identifiers, counts, zones, and reason codes) is persisted. The status line bridge stores only the window size, input tokens, used percentage, model id, and time; costs, paths, workspace names, and the status line output are never stored.
