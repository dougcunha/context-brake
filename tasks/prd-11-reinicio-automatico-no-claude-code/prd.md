# PRD — Automatic restart in interactive Claude Code

## Problem and context

Today the restart is cooperative. At `RED`, ContextBrake tells the agent to save the plan and checkpoint and end the reply with `[REQUEST_SESSION_RESET]` (`README.md:44`, `src/core/services/reset-notice.ts:1`). The Claude Code adapter then shows the person the command to start a new session (PRD-02 RF22). A person must type `/clear` and a prompt before work continues, which stops a long task whenever nobody is watching. PRD-04 removes that step for non-interactive runs (`context-brake run`), but `run` opens its own sessions and does not help someone working in the interactive `claude` terminal or the Desktop app's Code tab.

Claude Code now documents function-hook plugins, called mods, that run inside the session (`code.claude.com/docs/en/plugins/mods/reference`, checked 2026-10-04 against v2.1.289). Mods are on by default since v2.1.287. A mod can run a slash command with `$.command.run({ command: 'clear' })` and submit a prompt with `$.prompt.submit({ text })`, both queued until the session is idle. The open-source `alexknowshtml/claude-auto-handoff` does exactly this at a token threshold: it writes a brief, runs `/clear`, and seeds the new session. ContextBrake already has what that project generates with a model: the checkpoint and the boot text injected at `SessionStart` (PRD-03). It needs only the two missing steps, clear and continue.

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | An interactive Claude Code session that reaches its restart signal continues in a fresh session with no keystroke from the person | In the simulated-host test, 100% of valid restart signals end in `/clear` followed by one seed prompt (FR-01, FR-02, FR-03) |
| OBJ-02 | Automation never discards work or loops | 0 clears without a valid checkpoint; at most the configured number of consecutive automatic restarts (FR-04, FR-05, FR-06) |
| OBJ-03 | Installing, switching off, and removing the feature are as safe as the rest of `init` | `init`, `doctor`, and `remove` plan and confirm every file they touch (FR-07, FR-08, FR-09) |
| OBJ-04 | The feature costs nothing for people who do not enable it | With it off, no mod files exist and no hook runs (FR-07) |

## Stories and journeys

| ID | User | Need | Benefit | Flow or edge |
| --- | --- | --- | --- | --- |
| US-01 | Developer working in interactive Claude Code | The session restarts itself when ContextBrake asks for a reset | A long plan keeps advancing while I am away | The agent ends a reply with `[REQUEST_SESSION_RESET]` after saving the checkpoint; the next session starts working on the checkpoint's next step |
| US-02 | Developer who is cautious about `/clear` | To opt in, see what will happen, and stop it any time | I keep control of when my live context is discarded | Off by default; a per-session switch; a pause after repeated restarts |
| US-03 | Developer on Windows | The same behavior in PowerShell and Git Bash | One setup for the team | The mod does not depend on `sh`, `setsid`, or a local server |
| US-04 | Maintainer | `doctor` to tell me why automatic restart is not working | I can fix it without reading logs | Claude Code too old, mods disabled by policy, plugin not loaded, feature switched off |
| US-05 | Developer using `context-brake run` | The two features not to fight each other | A runner session is never cleared by the mod | Runner sessions are non-interactive, and the mod stands down there |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | When a Claude Code turn ends with the restart signal in the final reply and the feature is on, the mod runs `/clear` for that session. The decision to restart stays with the agent's signal and ContextBrake's own zones; the mod adds no token threshold of its own. | In the simulated host, a turn whose last reply ends with `[REQUEST_SESSION_RESET]` produces exactly one `/clear`. A turn without the signal produces none, whatever the usage. |
| FR-02 | After the clear, the mod submits one seed prompt to the new session, once, and only when the mod started that clear. In full mode the seed names the PRD-03 boot as the source of truth and tells the agent to continue from the checkpoint's next step; in light mode the seed is generic (continue from the state the previous session recorded) and mentions no boot. Neither carries a summary of the old conversation (`DEC-PD-03`). | After the simulated `SessionStart` with source `clear`, one prompt is submitted, once, containing the continue instruction and no text from the previous session; the full-mode seed names the boot and the light-mode seed does not. A second `SessionStart`, and a clear typed by the person, submit nothing. |
| FR-03 | In full mode the mod clears only when the restart is safe: `state_checkpoint.json` exists, validates against `schemas/state-checkpoint.schema.json`, and is newer than the start of the turn that ended with the signal. With a plan present, the checkpoint must also name a step. Otherwise the mod does not clear and shows the person why. In light mode the mod reads no plan, checkpoint, or snapshot file (PRD-07 FR-02); the gate is the restart signal plus FR-04 and FR-05 (`DEC-PD-03`). | Full mode: fixtures with a missing, invalid, stale, or step-less checkpoint produce no `/clear` and one visible message naming the cause; a valid fixture produces the clear; a repository with no plan still restarts when the checkpoint is valid. Light mode: with plan and checkpoint files present, no read of them occurs (port-level test), and a valid signal produces the clear. |
| FR-04 | The mod stops after a configured number of consecutive automatic restarts with no prompt typed by the person (default 2, configurable) and tells the person the loop guard paused it. A prompt typed by the person resets the count. | With the limit 2, the third consecutive signal produces no `/clear` and one visible pause message. After a person-typed prompt, the next signal restarts again. |
| FR-05 | If the fresh session reaches its own restart signal before it did any work (no tool call and no edit since the seed), the mod does not restart again and says so. | A fixture where the seeded session signals at once produces no `/clear` and a message that the new session made no progress. |
| FR-06 | The mod never runs when automation is unsafe: when the person set a switch off for the session (`CONTEXT_BRAKE_AUTO_RESTART=0`), when a `context-brake run` session is active, or in a non-interactive session where there is no person to continue. | Each condition, set in the simulated host, produces no `/clear` and a log line naming the condition. |
| FR-07 | `init` offers automatic restart only for Claude Code and only on request (`--auto-restart`, `--no-auto-restart`), off by default. When on, `init` installs the mod and records the choice in `context-brake.config.json`; when off or removed, no mod file remains. The plan lists each file and requires confirmation like any other change. | `init --auto-restart --yes` writes the mod files and the config record; a second `init` changes nothing; `init --no-auto-restart --yes` removes them. Plain `init` on a fresh repository writes no mod files. The config validates against `schemas/context-brake.config.schema.json`. |
| FR-08 | `doctor` (text and `--json`) reports the automatic-restart state: off, on and ready, or on with a named problem (Claude Code older than the minimum version, mods disabled by `disableAllHooks` or organization policy, plugin not loaded in the current session, mod files drifted from the installed version). Each problem has a remediation. | One fixture per problem produces its finding and remediation; ready and off produce no warning. `doctor --json` validates against `schemas/doctor-report.schema.json`. |
| FR-09 | `remove` deletes the mod files and the config record that `init` wrote, and only those. | After `init --auto-restart` then `remove --yes`, the repository matches its pre-install state for these paths, and a file the user edited inside the mod folder is reported, not deleted. |
| FR-10 | Every decision (restarted, skipped with reason, paused, error) is written to a local log without prompt or reply content, and the person sees a one-line notice in the terminal when a restart or a skip happens. | A restart, a skip, and a pause each leave one log record with a reason code and no conversation text, and one visible notice. |
| FR-11 | The README, `docs/context-brake-protocol.md`, and the Claude Code section of `docs/research/harness-integrations.md` describe the feature, how to switch it on and off, and the mods API facts verified for it. The research section replaces "no documented hook opens a new session" with the verified behavior. | Each of the three sources covers the topics that apply to it, with the check date and Claude Code version. |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Platform | The criteria pass on Linux, macOS, and Windows (Windows PowerShell 5.1, PowerShell 7, Git Bash). The mod uses no shell, no `setsid`, and no local server. |
| NFR-02 | Privacy | Local logs and notices hold no prompt, reply, or tool output text. The mod makes no network request and calls no model. |
| NFR-03 | Compatibility | The configuration stays at `schemaVersion: 1`, and the published schemas gain only optional fields. The hook limits of PRD-02.1 and PRD-02.2 do not change. Light mode and full mode both support the feature, each with its own gate (FR-02, FR-03). |
| NFR-04 | Failure | An error inside the mod never blocks a tool call, loses a checkpoint, or leaves a session half cleared; on error the session keeps running as it is and the person sees the reason. |
| NFR-05 | Footprint | With the feature off, `init` adds zero files and the session runs zero mod hooks. |

## User experience

The person turns the feature on once with `context-brake init --auto-restart`; the plan lists the mod files and asks for confirmation. If Claude Code must reload plugins to see the mod, the output says so and gives the command. During work, the only new output is one line when ContextBrake restarts or declines to, such as `ContextBrake: restarting session (checkpoint step 3 saved)` or `ContextBrake: auto-restart skipped: checkpoint is stale`. Text labels carry the meaning, with no dependence on color. Switching it off is `init --no-auto-restart`, or `CONTEXT_BRAKE_AUTO_RESTART=0` for one session.

## Constraints and dependencies

- Depends on PRD-02 (restart signal, RF22), PRD-03 (checkpoint, boot at `SessionStart`), PRD-01 (`init`, `doctor`, `remove`), PRD-07 (light mode) and PRD-10 (defaults).
- Claude Code mods: v2.1.287 or later, on by default; run in the CLI and the Desktop Code tab, not in WSL sessions of the Desktop app; subject to `disableAllHooks`, `--safe-mode`, and organization policy (`code.claude.com/docs/en/plugins/mods/overview`).
- Mod API limits to respect: `$.command.run` queues until idle and rejects when called inside a hook the turn is waiting on; a hook has 10 s of its own execution time (`mods/reference`).
- Mods are not sandboxed and can submit prompts as the person; the feature must be explicit opt-in and its code readable.
- Harness-specific names (mods API, plugin layout) stay inside the Claude Code adapter (`AGENTS.md`, `harness-adapters.md`).

## Out of scope

- Other harnesses. Pi and Oh-My-Pi already create sessions (`ctx.newSession`); Codex CLI and OpenCode can follow later if their docs support it.
- Non-interactive runs: `context-brake run` and `wrap` stay in PRD-04.
- Writing a brief or summary with a model; the checkpoint and boot are the handoff.
- A token or zone threshold in the mod, a viewer server, a panel or pane in the UI, or Tailscale links.
- Auto-compaction control (`DISABLE_AUTO_COMPACT`) beyond standing down when it is set.
- Making the feature the default.

## Assumptions and sources

- Decision to confirm at HIL 1 (A1): off by default and opt-in, because `/clear` discards live context (triage S8). Alternative: on by default in new installs.
- Decision to confirm (A2): the trigger is the existing `[REQUEST_SESSION_RESET]` signal, not a token threshold, so the agent's checkpoint always comes first. Alternative: also restart on a measured `CRITICAL` zone with no signal.
- Decision to confirm (A3): a separate PRD-11 rather than an addition to PRD-04, since PRD-04 is post-MVP, non-interactive, and a different mechanism.
- Decision to confirm (A4): the seed prompt is short and fixed, and the boot text from PRD-03 carries the context.
- Resolved (T01, 2026-10-04, Claude Code 2.1.289): `classic.*` events do not fire in interactive sessions, so the seed is submitted when the mod's own `/clear` resolves (TechSpec `DEC-03`).
- Resolved (T01): the mod receives the full final reply in `turn.complete` and can read files with `$.fs` at that point.
- Resolved (T01): a directory marketplace plus `enabledPlugins` in `.claude/settings.local.json` loads the mod with no manual step beyond the `init` confirmation (TechSpec `DEC-08`); project settings cannot set `CLAUDE_CODE_PLUGIN_DIRS`.
- External source: https://code.claude.com/docs/en/plugins/mods/overview and /reference (Claude Code v2.1.289, 2026-10-04): `$.command.run`, `$.prompt.submit`, events, limits, availability.
- External source: https://github.com/alexknowshtml/claude-auto-handoff (`hooks/register.tsx`): the `/clear`, seed, loop guard, and kill-switch pattern. MIT license; ContextBrake reuses the ideas, not the code.

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user or an identified project source.
- [x] Implementation details remain in the TechSpec.
