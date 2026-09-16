# ContextBrake Telemetry Block & Brake Specification (v1)

This document defines the agent-facing telemetry block, pre-tool block messages, user-facing notices, and local runtime storage contracts for ContextBrake v1.

## 1. Telemetry Block Format & Field Order

The telemetry block is a single-line ASCII string appended or injected into tool results. Fields appear in a fixed sequence separated by single spaces:

```text
[ContextBrake v1] turn=<t>/<criticalTurn> usage=<p>% tokens=<used>/<window> source=<measured|estimated> zone=<GREEN|YELLOW|RED|CRITICAL> action=<action_text>
```

### Fields

1. **Header**: `[ContextBrake v1]` identifies the block specification version.
2. **`turn=<t>/<criticalTurn>`**: completed tool turns since the last reset, followed by the configured critical turn ceiling (default `12`).
3. **`usage=<p>%`**: context window usage as an integer percentage, computed as `floor(usedTokens * 100 / windowTokens)`.
4. **`tokens=<used>/<window>`**: tokens currently used and the active context window ceiling. If measured usage is unavailable, estimated tokens are shown.
5. **`source=<measured|estimated>`**:
   - `measured`: token count reported directly by the harness extension API (supported by Pi and Oh-My-Pi).
   - `estimated`: token count estimated from observed tool inputs, outputs, baseline tokens, and turns.
6. **`zone=<GREEN|YELLOW|RED|CRITICAL>`**: session classification derived from the highest matching threshold between context usage and turn count.
7. **`action=<action_text>`**: prescriptive action for the agent matching the current zone.

### Versioning Rule

Field names, field order, and exact action texts constitute the version 1 contract. Any addition, reordering, removal of fields, or modification of action texts requires incrementing the header version (e.g., `[ContextBrake v2]`).

---

## 2. Examples by Zone

### 🟢 `GREEN` Zone
Work normally without interruption. In `threshold_only` mode, no telemetry is injected below the activation threshold. When injected (or in `always` mode):

```text
[ContextBrake v1] turn=4/12 usage=30% tokens=38400/128000 source=estimated zone=GREEN action=work normally
```

### 🟡 `YELLOW` Zone
The session approaches the budget boundary. The agent must finish current work and validate:

```text
[ContextBrake v1] turn=9/12 usage=55% tokens=70400/128000 source=estimated zone=YELLOW action=finish the current edit, start no new step, run the step validation
```

### 🔴 `RED` Zone
The session is in danger of context exhaustion. The agent must save state, commit validated code, and request a session reset:

```text
[ContextBrake v1] turn=11/12 usage=68% tokens=87040/128000 source=estimated zone=RED action=save plan and checkpoint, commit if validation passes, end reply with [REQUEST_SESSION_RESET]
```

### ⛔ `CRITICAL` Zone
The session has reached or exceeded the critical threshold. General tool execution is blocked; only state-saving actions are permitted:

```text
[ContextBrake v1] turn=12/12 usage=76% tokens=97280/128000 source=estimated zone=CRITICAL action=other tools are blocked; finish the RED actions
```

---

## 3. Block Message (Agent-Facing)

When an agent attempts to execute a non-allowlisted tool call in the `CRITICAL` zone, the tool call is denied before execution with the following message:

```text
[ContextBrake v1] BLOCKED tool=<name> zone=CRITICAL turn=<t>/<criticalTurn> usage=<p>% tokens=<used>/<window> source=<source> reason=critical_ceiling. Allowed: read or write <planFile> and <checkpointFile>, the step validation command, git status, git add, git commit<, extra commands>. Save plan and checkpoint, commit if validation passes, end reply with [REQUEST_SESSION_RESET].
```

### Failure Variant

If an unexpected runtime failure, invalid configuration, or timeout occurs while the last recorded zone in the session ledger was `CRITICAL`, ContextBrake fails safe and denies non-allowlisted calls with:

```text
[ContextBrake v1] BLOCKED tool=<name> zone=CRITICAL last recorded zone=CRITICAL reason=integration_failure. Allowed: read or write <planFile> and <checkpointFile>, the step validation command, git status, git add, git commit<, extra commands>. Save plan and checkpoint, commit if validation passes, end reply with [REQUEST_SESSION_RESET].
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
- **Block Log**: `.context-brake/runtime/blocks.jsonl`
  - Records denied tool calls with timestamp, harness, session ID, tool name, zone, and reason code.
- **Error Log**: `.context-brake/runtime/errors.jsonl`
  - Records integration errors and deadline timeouts with timestamp, harness, event name, error code, and error class name.

### Metadata-Only Rule

In compliance with project privacy requirements, ContextBrake never writes prompt contents, user queries, tool arguments, tool outputs, file contents, or shell command strings into ledgers or log files. Only metadata (identifiers, counts, zones, and reason codes) is persisted.
