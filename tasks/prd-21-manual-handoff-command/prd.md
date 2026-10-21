# PRD — Manual handoff command in Claude Code

## Problem and context

Today the Claude Code mod restarts a session only when the agent ends a reply with `[REQUEST_SESSION_RESET]`. The agent does that only when the zone action tells it to, at the trigger zone. A person who wants a fresh session earlier (a task is done, the context is noisy, the work changes direction) must ask the agent in their own words, or run `/clear` and lose the state.

The user decided (H-01) to add a manual `/handoff [focus]` slash command to the ContextBrake Claude Code mod (`src/infrastructure/harnesses/claude-code/mod/`, installed under `.context-brake/claude-mod/`). The command does not write a handoff itself and does not use a model fork ("mode A"). It submits a prompt that tells the agent to run the configured snapshot skill and to end its reply with `[REQUEST_SESSION_RESET]`. The existing restart flow does the rest: `turn.complete` → `handleTurnComplete` → `handleTurnEnd` → `openSession` → `/clear` and the seed prompt (`mod/restart-flow.ts`, `mod/restart-host.ts`, `src/core/services/restart-flow.ts`). The optional `focus` argument goes into that prompt, so the snapshot stresses it.

Facts from the code (2026-10-16):

- `ModHost` (`mod/host.ts`) has `command.run` and `prompt.submit`, but no `command.register`. `HookRegistrar` takes `(event, handler)` only, with no filter object such as `{ command }`.
- The mod is installed by `init` on every Claude Code 2.1.287 or later, also without `--auto-restart` (README, "Measured usage"). `readModConfig` returns no config when the `autoRestart` block is absent, and then the restart flow does nothing.
- `restartMode` gives `snapshot` when `snapshot.command` is set, `handoff` when it is not, and `off` without `autoRestart`.
- `PERSON_PROMPT_ORIGINS` is `composer` and `bridge`. A prompt that the mod submits has origin `{ kind: 'plugin' }`, so `onPromptSubmit` does not reset the consecutive-restart counter.

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | A person moves the current work to a fresh session at any time, in any zone, with one command | In a live Claude Code session with `autoRestart` on, `/handoff` gives a new session that received the seed, with no other keystroke |
| OBJ-02 | The manual path reuses the trigger path: same snapshot instruction, same restart flow, same seed | The new code adds no second restart flow and no new handoff format; the restart log shows the same reason codes as an automatic restart |
| OBJ-03 | A manual request that cannot restart says why before the agent does any work | Each refusal case in FR-05 and FR-06 prints one line and submits no prompt |
| OBJ-04 | The seed reaches the new session, not the ended one | Live check on the current Claude Code version, recorded in `docs/research/harness-integrations.md` (NFR-04) |

## Stories and journeys

| ID | User | Need | Benefit | Flow or edge |
| --- | --- | --- | --- | --- |
| US-01 | Person in Claude Code with a snapshot skill set | Type `/handoff` | The agent runs the snapshot skill and the session restarts by itself | Command prints one line; the agent's turn runs the skill and ends with the signal; the mod clears and seeds |
| US-02 | Same person, with a focus | Type `/handoff the open bug in the parser` | The snapshot stresses what the next session must do first | The focus text is in the submitted prompt |
| US-03 | Person with automatic restart on, but no snapshot skill | Type `/handoff` | The work still moves, through the markdown handoff | The agent writes `.context-brake/handoff.md` in that turn; the next session reads it |
| US-04 | Person without automatic restart | Type `/handoff` | Learn how to turn it on | One line names `npx context-brake init --auto-restart`; nothing else happens |
| US-05 | Person after 2 automatic restarts in a row | Type `/handoff` | The manual request is not blocked by the loop guard | The command counts as a person's request and resets the counter |
| US-06 | Person who typed `/handoff` during a running turn | Wait | The request runs after the turn ends | The command is queued until the session is idle |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | The mod registers the slash command `/handoff` with a description and the argument hint `[focus]` in every session where the mod loads, also when `autoRestart` is absent. | In a live session with the mod loaded, `/handoff` shows in the typeahead with its description and hint; a kit test sees the registration in `session.start` |
| FR-02 | `/handoff` stays available in a session that a restart opened through `/clear`. | Live check: after one restart, typing `/handoff` in the new session runs the command (see P-02) |
| FR-03 | When the command runs and every check of FR-05 and FR-06 passes, it prints one line, resets the consecutive-restart counter, and submits one prompt to the agent. It does not write any file, run a model fork, or run `/clear` itself. | A kit test sees one `{ text }` answer, one `prompt.submit`, a guard state equal to the idle state, and no `fs.write` of a handoff and no `command.run` of `clear` from the command |
| FR-04 | The prompt follows the restart mode and uses the same instruction text as the trigger-zone action for Claude Code. In `snapshot` mode it asks the agent to run the snapshot skill with the Claude Code invocation (`/<skill>`) and to end the reply with `[REQUEST_SESSION_RESET]`. In `handoff` mode it asks the agent to save a handoff to `.context-brake/handoff.md` and to end the reply with `[REQUEST_SESSION_RESET]`. | Unit test: for each mode, the prompt contains the text that `zoneAction` gives at the trigger zone with the Claude Code invocation format; the prompt does not start with `/` |
| FR-05 | Without the `autoRestart` block, or with a configuration that does not parse, the command prints a refusal that names `npx context-brake init --auto-restart` and submits no prompt. | Kit test with no `autoRestart`: one `{ text }` answer with that command, zero `prompt.submit` |
| FR-06 | Before it submits the prompt, the command reads the same stand-down facts as the restart flow. With `CONTEXT_BRAKE_AUTO_RESTART=0`, with `DISABLE_AUTO_COMPACT` set, or on a surface that is not interactive, it prints the existing notice text for `SKIP_DISABLED_ENV` or `SKIP_NON_INTERACTIVE`, records that code, and submits no prompt. | Kit test per case: the notice text, one log record with the code, zero `prompt.submit` |
| FR-07 | The optional focus is trimmed, newlines become spaces, and text longer than 500 characters is cut. An empty focus means no focus. A focus adds one sentence to the prompt that tells the snapshot (or the handoff file) to stress it. | Unit test: focus `"  a\nb  "` gives `a b` in the prompt; an empty or blank focus gives the prompt with no focus sentence; a 600-character focus gives 500 characters |
| FR-08 | The restart after the command is the existing flow, unchanged in its decisions: it starts only when the agent's main reply ends with `[REQUEST_SESSION_RESET]`. An aborted turn, a reply without the signal, or a subagent reply restarts nothing. | Kit test: the command, then a reply without the signal, gives no `clear`; the same with the signal gives `clear` and the seed |
| FR-09 | In `handoff` mode the stale and missing checks stay as they are. The prompted turn starts a new turn, so a handoff written in that turn passes the check. The command adds no bypass. | Kit test: a handoff written before the prompted turn gives `SKIP_HANDOFF_STALE`; one written during it gives `RESTARTED` |
| FR-10 | The loop guard and the no-progress guard stay as they are for automatic restarts. The manual command resets the counter only when it submits its prompt (FR-03). | Kit test: with `consecutive` equal to `maxConsecutive`, `/handoff` and a reply with the signal give `RESTARTED`; a refused command (FR-05, FR-06) leaves the counter as it was |
| FR-11 | The command is not `immediate`: typed during a turn, it runs when the session is idle. | Command spec has no `immediate`; live check: typed during a turn, it runs after the turn ends |
| FR-12 | The command uses only existing reason codes. A restart from the command logs `RESTARTED`; a skip logs the same code as an automatic restart. | No change to `RESTART_REASON_CODES`, the restart-log schema, or `schemas/doctor-report.schema.json`; `npm run schemas:check` passes |
| FR-13 | `MOD_VERSION` changes, so a project with the earlier mod gets `AUTO_RESTART_OUTDATED_MOD` from `doctor` until `init` runs again. `doctor` adds no new finding for the command. | Unit test: the version is greater than `1.0.0`; the doctor test for an outdated mod log still passes |
| FR-14 | The README section "Automatic Restart in Claude Code" describes `/handoff [focus]`: what it does in each mode, the refusal cases, and that it resets the loop guard. The `init` wizard does not change. | README diff has the new bullet; no change in `src/cli/assistant/` |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Supported API | The command uses only documented mod API members (`$.command.register`, the `command.run` event filtered by command name, `$.prompt.submit`). The local `ModHost` and `HookRegistrar` types grow only with documented members, never `@internal` ones |
| NFR-02 | Privacy | The focus text and the prompt text never reach `.context-brake/runtime/restart/claude-code/` or any other file; the log keeps only reason codes and versions. A test reads the log after a run with a focus and finds no focus text |
| NFR-03 | Architecture | The prompt text is built by a pure `core` function from `SnapshotConfig`, the restart mode, the invocation format, and the focus. The mod only registers and answers the command. Harness names and event shapes stay in the Claude Code adapter |
| NFR-04 | Reliability of the seed | The seed of every restart (manual and automatic) reaches the new session. When `$.session.id()` still gives the ended session's id after `/clear`, the mod waits for the id to change, checks every 100 ms, and sends the seed after 3 s at most. Evidence: a live check on the current Claude Code version, written in the Claude Code section of `docs/research/harness-integrations.md`, because the `claude plugin test` kit does not reproduce the timing of `/clear` |
| NFR-05 | Failure policy | A failure in the command hook never ends with an uncaught exception. It prints a line that says the session was kept, records `ERROR_INTERNAL`, and submits no prompt |
| NFR-06 | Messages | Each line the command prints is English, starts with `ContextBrake: `, says what happened, and, for a refusal, how to fix it. Status is in words, not only in color |
| NFR-07 | Platform | Works on Claude Code 2.1.287 or later, on the surfaces where mods run, on Linux, macOS, and Windows |

## User experience

- `/handoff` with all checks passed prints, for example: `ContextBrake: asking the agent to save its state; the session restarts when the reply ends.` Then the agent's turn starts.
- With a focus: `/handoff finish the parser bug` gives the same line; the focus goes only into the prompt.
- Refusal without automatic restart: `ContextBrake: /handoff needs automatic restart. Run npx context-brake init --auto-restart and start a new session.`
- Refusal by a kill switch or a surface that is not interactive: the existing notice text of `SKIP_DISABLED_ENV` or `SKIP_NON_INTERACTIVE`.
- When the agent does not end with the signal, nothing more happens; the person sees the agent's reply and can type `/handoff` again.
- After the restart, the notices and the seed are those of the automatic restart today.

## Constraints and dependencies

- Mode A only (H-01): the command submits a prompt; the agent's own turn does the snapshot; the existing restart flow clears and seeds.
- Depends on the restart flow of the Claude Code mod (`handleTurnComplete`, `handleTurnEnd`, `openAfterClear`) and on `zoneAction` and the Claude Code invocation format (`CLAUDE_SKILL_INVOCATION`, `slashInvocation`).
- The vendor API documents `$.command.register({ name, description, argumentHint, immediate })` and `on('command.run', { command }, …)` returning `{ text }` (type declarations written by Claude Code 2.1.301, read from the sibling repository `claude-mods`). The minimum Claude Code version that has `command.register` is not known yet (P-05).
- `.agents/rules/harness-adapters.md`: the Claude Code section of `docs/research/harness-integrations.md`, the adapter, and its fixtures change in the same change when behavior differs from the record.
- `AGENTS.md`: the mod's `@internal` members are not used.

## Out of scope

- An automatic decision of when to hand off. That stays the zone trigger.
- A model fork, or a handoff that the mod writes itself.
- A new handoff file format, a new seed text, or a new reason code.
- The `/handoff` command in harnesses other than Claude Code.
- A change to the `init` wizard or to its flags.

## Assumptions and sources

- H-01 (user decision): mode A as described in "Problem and context"; command name `/handoff`; optional `focus` argument.
- A-01 (product decision): the command is registered in every session where the mod loads and refuses at run time when `autoRestart` is absent (FR-05). Reason: the mod is installed also without `--auto-restart`, and the config is read on each call, so the refusal stays correct after a later `init`. Impact if wrong: a command shows that does nothing for people without automatic restart.
- A-02 (product decision): without a snapshot skill, the command uses the markdown handoff of `handoff` mode (FR-04), not a refusal. Reason: this is what the trigger zone asks for in the same configuration.
- A-03 (product decision): a typed `/handoff` is a person's request, so the command resets the consecutive-restart counter (FR-10). The README already defines the limit as restarts "without a prompt you typed". Impact if wrong: a person can start more restarts in a row than `maxConsecutiveRestarts`, but each one needs a typed command.
- A-04 (product decision): the kill switches win over the manual request (FR-06). The command checks them before it submits the prompt, so the agent does not do a snapshot turn that cannot restart.
- A-05: the instruction text of the trigger zone is the right prompt text. A second wording can drift from the zone text that the agent already knows.
- A-06: a 500-character limit on the focus is enough (no user input; chosen to keep the prompt short).
- Source: `src/infrastructure/harnesses/claude-code/mod/` (`host.ts`, `register.ts`, `hooks.ts`, `mod-config.ts`, `mod-info.ts`, `restart-flow.ts`, `restart-host.ts`, `restart-facts.ts`), `src/core/services/` (`restart-flow.ts`, `restart-guards.ts`, `restart-mode.ts`, `auto-restart-policy.ts`, `auto-restart-notices.ts`, `zone-guidance.ts`), `src/core/contracts/configuration.ts`, README sections "Automatic Restart in Claude Code" and "Restart on Other Harnesses and the Markdown Handoff".
- Source: `docs/research/harness-integrations.md`, Claude Code "Mods (PRD-11)" (verified 2026-10-04 on 2.1.289).
- Source: live measurement on Claude Code 2.1.296 (2026-10-13, claude-mods repository memory): after `/clear` only `session.end` reaches the mod; `session.start` does not fire; mod state resets about 80 ms after `session.end`; `$.session.id()` gives the ended session's id for about 900 ms. The sibling mod `claude-mods/handoff` waits for the id to change (every 100 ms, 3 s at most) before it sends its seed.
- External source: [Mods reference](https://code.claude.com/docs/en/plugins/mods/reference) for `command.register` and `command.run`.

### Source divergences

- D-01: `docs/research/harness-integrations.md` (2.1.289) says that the id changes and the seed reaches the new session when the `/clear` promise resolves. The 2.1.296 measurement says the id stays old for about 900 ms. NFR-04 resolves this with a live check and an update of the research section.
- D-02: the task brief says the command uses `$.command.register` and `on('command.run', { command }, …)`. The local `ModHost` and `HookRegistrar` types have neither today. NFR-01 extends them with documented members.

### Pending items

- P-01: should a manual restart be told apart from an automatic one in the restart log or in `doctor`? This PRD keeps the existing codes (FR-12).
- P-02: does a command registered in `session.start` survive `/clear`? `session.start` does not fire after `/clear`. FR-02 needs a live check; if the command is lost, the TechSpec must register it again after the session switch.
- P-03: the seed text says the session "was restarted automatically". For a manual restart this is not exact. This PRD keeps it (no new seed text); the user can decide to change the shared text.
- P-04: another plugin can also register `/handoff` (for example the `claude-mods` `handoff` mod). The API says that a second registration of a name replaces the first. The behavior across 2 plugins, and whether a namespaced name is needed, is not verified.
- P-05: the first Claude Code version that has `$.command.register` is not known. If it is later than 2.1.287, the command needs a version gate and the README must give the version.

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user (H-01) or an identified project source.
- [x] Implementation details remain in the TechSpec.
