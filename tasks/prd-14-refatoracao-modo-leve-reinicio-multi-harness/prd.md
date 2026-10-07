# PRD — Automatic restart and markdown handoff across harnesses

## Problem and context

PRD-11 made interactive Claude Code restart itself. A Claude Code mod watches for a reply that ends with `[REQUEST_SESSION_RESET]`, runs `/clear`, and submits a seed prompt (`src/infrastructure/harnesses/claude-code/mod/restart-flow.ts:26-64`). Every other harness declares `auto_restart: 'unsupported'` with the impact text "exists only for Claude Code" (e.g. `src/infrastructure/harnesses/pi/capabilities.ts:10`). On those harnesses a person still has to type `/new` and tell the agent where to resume.

After prd-12-refatoracao-modo-leve-modo-unico, the plan checkpoint no longer exists. A restart can carry work forward in only two ways:

- **Snapshot skill configured.** The resume command is injected after the reset (prd-12 FR-04, FR-05).
- **No snapshot skill.** Nothing carries the work forward. The light-mode action asks generically to "save your snapshot or checkpoint" (`src/core/services/light-guidance.ts:9`), and no resume text is injected (`light-guidance.ts:27`).

The harnesses differ in what they can do (`docs/research/harness-integrations.md:26`, sections per harness):

- **Pi and Oh-My-Pi.** They document `ctx.newSession(...)`. In Oh-My-Pi it is available only in command context. Neither is verified.
- **OpenCode.** It passes an SDK `client` to its plugin, whose session API has not been researched.
- **Codex, Cursor, Copilot CLI, and Antigravity.** They document no way to open a session. They can inject context at session start.

The reusable restart core already lives in `src/core`: `auto-restart-policy.ts`, `auto-restart-notices.ts`, and `contracts/auto-restart.ts`. Part of it is still named after Claude Code: the log `claudeVersion` field, the `claude-mod` log directory, and the notice "Claude Code rejected the clear".

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | Without a snapshot skill, a restart still carries the work forward | With automatic restart on and no skill, 100% of simulated restarts produce a handoff file, and the next session starts with the instruction to continue from it (FR-01, FR-02, FR-03) |
| OBJ-02 | Harnesses with a verified new-session API restart with no keystroke | In each verified harness's simulated host, a valid reset signal ends in a new session seeded with the resume instruction (FR-06, FR-07) |
| OBJ-03 | Harnesses without such an API resume with one keystroke | After the person types `/new` (or equivalent), the next session receives the resume instruction with nothing else typed (FR-08) |
| OBJ-04 | Automation never discards unsaved work or loops | 0 clears without a fresh handoff in handoff mode. At most the configured number of consecutive automatic restarts on every harness (FR-04, FR-09) |
| OBJ-05 | `doctor` tells the truth per harness | The `auto_restart` capability and findings match each harness's verified behavior (FR-10, FR-11) |

## Stories and journeys

| ID | User | Need | Benefit | Flow or edge |
| --- | --- | --- | --- | --- |
| US-01 | Developer with no snapshot skill and automatic restart on | The agent leaves a handoff and the next session continues from it | Long work survives a reset without installing a skill | At the trigger zone the agent writes `.context-brake/handoff.md` and ends with the marker. The session clears, and the new one is told to continue from the handoff |
| US-02 | Developer with a snapshot skill and automatic restart on | The same restart, using my skill | Consistent with my SDD flow | The agent runs the skill and ends with the marker. After the clear, the resume command is injected |
| US-03 | Developer on Pi, Oh-My-Pi, or OpenCode | Automatic restart as in Claude Code | Unattended long tasks there too | Works where the probe verified the API. Otherwise the harness falls back to US-04 |
| US-04 | Developer on Codex, Cursor, Copilot CLI, or Antigravity | To be told to start a new session, and not to explain anything | One keystroke per restart | A notice asks for `/new` or the harness's equivalent. The new session starts with the resume instruction |
| US-05 | Cautious developer | To switch restart off per session and stop loops | I keep control of my context | The same kill switches and the same consecutive-restart limit as PRD-11, on every harness |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | With automatic restart on and no snapshot skill, the telemetry action at and above the trigger zone tells the agent to write a markdown handoff to `.context-brake/handoff.md` and end its reply with `[REQUEST_SESSION_RESET]`. The handoff covers the goal, the work done, the next step, and open items. With automatic restart off and no skill, prd-12 FR-06 applies unchanged (zone header only) | Simulated `RED` telemetry with restart on and no skill contains the handoff path and the marker. With restart off, it contains neither |
| FR-02 | When a handoff file is pending, the next session after a reset starts with an instruction to read it and continue from it. It reaches the agent through the automatic seed, or through session-start injection on harnesses without automatic restart | In each harness's simulated host, the first context of the new session contains the instruction and the handoff path |
| FR-03 | A handoff is delivered to one new session only. After delivery it moves to `.context-brake/handoffs/<timestamp>.md`, and the most recent N archived handoffs are kept (default 10) | A second reset with no new handoff injects no resume instruction. The archive never holds more than N files |
| FR-04 | In handoff mode, a restart requires a handoff file written after the turn that asked for it began. Otherwise the restart is skipped with a reason. With a snapshot skill, the reset signal alone is the gate (prd-12 FR-10) | A marker reply with a missing or stale handoff does not clear, and the log records the skip reason. A fresh handoff clears |
| FR-05 | The harness-independent restart logic (decision, guards, notices, seed text, per-session log) has no harness-specific names, and every adapter uses it | The core contracts, notices, and log schema contain no Claude-specific field or text. The Claude Code mod behavior of PRD-11 is unchanged in its simulated-host tests |
| FR-06 | Before any adapter work, a probe on a real installation verifies, for Pi, Oh-My-Pi, and OpenCode, whether an extension or plugin can, from the event that sees the end of a turn: (a) open a new session or clear the context, and (b) send the first prompt of the new session. The results update `docs/research/harness-integrations.md` with the version and date | Each harness's research section records the verified answer for (a) and (b), with captured payloads or fixtures |
| FR-07 | On each harness where FR-06 verified both (a) and (b), `init --auto-restart` installs the automatic restart: on a reply ending with the marker that passes the gates, a new session opens and is seeded with the resume instruction | In that harness's simulated host, a valid signal leads to a new session with one seed prompt, and the kill switches stand it down |
| FR-08 | On each harness without verified automatic restart, `init --auto-restart` enables the semi-automatic restart. When a reply ends with the marker, the person sees the harness's command for a new session (where the harness has a notice channel), and that session receives the resume instruction at start | A simulated session start after a marker reply carries the resume instruction, on every harness with session-start injection |
| FR-09 | The guards and switches of PRD-11 apply on every harness: the consecutive-restart limit (`autoRestart.maxConsecutiveRestarts`), its reset when a person types a prompt, the no-progress guard, the `CONTEXT_BRAKE_AUTO_RESTART=0` switch, and the stand-down on non-interactive runs | Each verified harness's simulated host stops after the limit, resets on a typed prompt, and stands down under the switch |
| FR-10 | Each harness declares `auto_restart` as `supported`, `unknown`, or `unsupported` from FR-06's results. The impact text says whether restart is automatic or semi-automatic | `doctor` on a fixture of each harness reports the declared state and impact text |
| FR-11 | `doctor` reports, per harness that has restart on: ready, not loaded or outdated, and the last skip reason | A doctor fixture per harness with restart on shows the matching finding. The existing `AUTO_RESTART_*` codes are reused, not duplicated per harness |
| FR-12 | Reset-signal detection is consistent: every component that reacts to `[REQUEST_SESSION_RESET]` treats a reply that ends with it as a reset request | The brake's new-session notice, the restart flows, and the semi-automatic notice all fire for a reply whose last line is the marker after other text |
| FR-13 | `remove` and `init --no-auto-restart` remove only the restart files and settings ContextBrake created on each harness. They keep the pending handoff and the archive, and their output says where those are | After `remove`, no restart artifact remains on any harness fixture, the handoff files remain, and the output names their path |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Safety | No path clears or opens a session without a passing gate. An error in the restart flow leaves the current session intact, as PRD-11 requires |
| NFR-02 | Platform | Works on Linux, macOS, and Windows (PowerShell and Git Bash), with no dependency on `sh`, `setsid`, or a local server |
| NFR-03 | Test budget | Every new test respects prd-13's 120 s budget and test rules. Probes on real harnesses are recorded as fixtures and do not run in `npm test` |
| NFR-04 | Privacy | The handoff and its archive stay under `.context-brake/`, outside version control, and are never sent anywhere by ContextBrake |
| NFR-05 | Opt-in | With automatic restart off, no restart artifact is installed on any harness and no handoff instruction is injected |

## User experience

`init --auto-restart` reports, for each active harness, whether restart will be automatic or semi-automatic and why. The semi-automatic notice names the harness's command for a new session (`/new`, `/clear`). `doctor` shows the restart state per harness, the handoff mode (snapshot skill or markdown handoff), whether a handoff is pending, and the last skip reason. Output follows `.agents/rules/cli-output.md`.

## Constraints and dependencies

- Depends on prd-12-refatoracao-modo-leve-modo-unico:
  - single mode;
  - snapshot and resume commands (FR-04, FR-05);
  - zone header only without a skill (FR-06);
  - signal-only restart gate (FR-10).
- Depends on prd-13-refatoracao-modo-leve-testes-rapidos: test budget and rules.
- Each adapter change follows `.agents/rules/harness-adapters.md`, re-checks the vendor docs linked in its research section, and updates that section (`AGENTS.md`, Specifications and research).
- Harness event names and payloads stay inside adapters. The restart core depends only on ports.
- Pi and Oh-My-Pi extension loading of `.js` files is still unconfirmed (OI-03 and OI-04 in `docs/research/harness-integrations.md`). The FR-06 probe must settle it first.

## Out of scope

- Removing plan mode, run, wrap, or deny, and the snapshot skill settings themselves: prd-12.
- Reducing test-suite time beyond keeping new tests within the budget: prd-13.
- Automatic restart through mechanisms the probe does not verify, such as terminal input injection or external process supervisors.
- Non-interactive runs. They stand down, and `run` no longer exists.
- Generating the handoff content with ContextBrake itself. The agent writes it.

## Assumptions and sources

- Product decisions from the user on 2026-10-06:
  - The markdown handoff is used only when automatic restart is on and no snapshot skill is configured.
  - The scope is Pi and Oh-My-Pi, plus a probe on OpenCode. The other harnesses get the semi-automatic restart.
  - The handoff lives at `.context-brake/handoff.md` and is archived after resume.
- Assumption: the default archive size is 10 handoffs. The TechSpec may change it, and its being configurable is not required.
- Assumption: Oh-My-Pi's command-context restriction may block automatic restart from event handlers. If the probe confirms it, Oh-My-Pi falls back to FR-08.
- Source: the harness capability survey explored on 2026-10-06 at commit `1474f54`:
  - `docs/research/harness-integrations.md:26,58,83,137,155,173`;
  - `src/infrastructure/harnesses/*/capabilities.ts`;
  - `src/core/services/auto-restart-*.ts`.
- Source: PRD-11, `tasks/prd-11-reinicio-automatico-no-claude-code/prd.md`.

## PRD acceptance gate

- [ ] Every requirement has an ID and an observable criterion.
- [ ] Metrics, boundaries, and out-of-scope items are explicit.
- [ ] Internal rules came from the user or an identified project source.
- [ ] Implementation details remain in the TechSpec.
