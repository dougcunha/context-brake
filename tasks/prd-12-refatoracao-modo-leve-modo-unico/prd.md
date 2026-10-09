# PRD — Light mode as the only mode

## Problem and context

ContextBrake has three overlapping ways to handle a full context. The mode is resolved in `src/core/services/zone-guidance.ts:19-30`:

- **Plan mode** (PRD-03) keeps `task_plan.json` and `state_checkpoint.json`, boots every new session from them, and denies tool calls in `CRITICAL` (`src/core/services/brake-engine.ts:38-47`, `brake-allowlist.ts:13-21`).
- **Delegated snapshot mode** (PRD-06) is a sub-mode of the full mode. It asks the agent to run a configured skill (`delegated-guidance.ts:15-27`) and denies everything except that skill's paths and skills.
- **Light mode** (PRD-07) never denies and only tells the agent to save progress (`light-guidance.ts:9-27`).

Light mode is already the `init` default (`light-mode-merge.ts:19-21`).

The full mode costs much more than it returns:

- About 45 source files serve only the plan, checkpoint, boot, protocol file, instruction blocks, and `.gitignore` block.
- `context-brake run` and `wrap` (PRD-04), about 25 more files, cannot work without a plan (`src/cli/commands/run-preflight.ts:32-48`, `run-loop.ts:15-42`).
- 88 test files serve these features.
- Several behaviors already contradict each other. A config without `lightMode` or `fullMode` counts as light for the Claude Code mod but as full for the brake engine (`brake-engine.ts:39`). The `--snapshot-*` flags are rejected unless `--no-light` is given (`src/cli/init-config-updates.ts:13-21`).

This PRD keeps one mode. It is the light mode, extended with an optional snapshot skill that today exists only in the delegated mode. ContextBrake was never released and runs only in this repository, so no migration or backward compatibility is required.

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | One mode with one behavior per zone | No config key, flag, or code path selects plan, delegated, or full mode (FR-01, FR-02) |
| OBJ-02 | A configured snapshot skill is requested at the right moment and resumed after a reset | Telemetry at the trigger zone names the skill, and every session reset injects the resume command (FR-04, FR-05) |
| OBJ-03 | ContextBrake never blocks the agent | No tool call is denied in any zone (FR-07) |
| OBJ-04 | Smaller product surface | The plan, checkpoint, boot, runner, protocol, and deny code, schemas, and tests are gone (FR-01, FR-03, FR-08, FR-09) |

## Stories and journeys

| ID | User | Need | Benefit | Flow or edge |
| --- | --- | --- | --- | --- |
| US-01 | Developer without a snapshot skill | To know how full the context is | I decide when to wrap up | Tool results carry the zone header. No state file is created, and `init` writes nothing to instruction files |
| US-02 | Developer with a snapshot skill (e.g. `/sdd-snapshot`) | The agent saves a snapshot near the limit and resumes from it after `/clear` | Long work survives a reset without a plan file | At the trigger zone the agent runs the skill and ends with `[REQUEST_SESSION_RESET]`. After the reset it runs the resume command |
| US-03 | Developer with automatic restart in Claude Code (PRD-11) and a snapshot command | The restart still happens without a checkpoint | The feature keeps working after the removal | A reply that ends with the reset marker triggers `/clear` and the seed, with no checkpoint gate |
| US-04 | Maintainer | `doctor` to describe the single mode | I can see whether the snapshot skill is configured | `doctor` shows the zone settings and the snapshot skill, or says none is set |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | Remove plan mode: the task plan, the state checkpoint, the session boot built from them, and the `plan` command | `context-brake plan` fails as an unknown command. No code reads or writes `task_plan.json` or `state_checkpoint.json`. `schemas/task-plan.schema.json` and `schemas/state-checkpoint.schema.json` no longer exist |
| FR-02 | Remove the mode choice: `fullMode`, `lightMode`, `stateStorage`, the `--light` and `--no-light` flags, and the separate `delegatedSnapshot` mode | The config schema has none of these keys. `init --light` and `init --no-light` fail with `INVALID_ARGUMENTS`. A config that contains a removed key fails validation with a message naming the key |
| FR-03 | Remove `context-brake run`, `context-brake wrap`, the `runner` config section, the run summary schema, and the runner error codes | Both commands fail as unknown commands. `schemas/run-summary.schema.json` no longer exists. The help lists only the remaining commands |
| FR-04 | The trigger zone (`YELLOW` or `RED`, default `RED`) is its own setting. A snapshot command and a resume command can optionally be added. `init` sets and clears them with flags, and the trigger zone can be set without a snapshot command | `init --snapshot-command "/sdd-snapshot" --resume-command "<resume command>"` writes both commands. `init --snapshot-trigger YELLOW` works with no snapshot command. `doctor` shows all three. Clearing the snapshot command removes both commands and keeps the trigger zone |
| FR-05 | With a snapshot command, the telemetry action at and above the trigger zone tells the agent to run that command and then end its reply with `[REQUEST_SESSION_RESET]`. With a resume command, every session reset (`/clear`, `/new`, or compaction) on a harness with session-start injection delivers an instruction to run it | Simulated telemetry at the trigger zone contains the snapshot command and the marker. A simulated `SessionStart` with origin `clear` returns the resume instruction |
| FR-06 | Without a snapshot command, ContextBrake only injects the zone header and the zone's generic action. It creates no state file, names no command, and does not ask for `[REQUEST_SESSION_RESET]`, so no automatic restart clears unsaved work | In a fixture without a snapshot command, `RED` telemetry has the header and a generic action without the marker. The session-start output has no resume instruction. No file outside the install set is written |
| FR-07 | The brake is advisory in every zone: no tool call is denied, and a hook failure never blocks | No harness adapter installs or handles a pre-tool hook, so no tool call can be denied in any zone (amended at HIL 2, DEC-AMEND-01). A hook failure returns the neutral response. The deny allowlist, block message, block log, and brake window report no longer exist |
| FR-08 | `init` no longer installs, and `remove` no longer handles, the protocol file, the reference blocks in instruction files, the `.gitignore` block, or the state files. (Superseded for the new, differently marked `.gitignore` block by prd-17.) The `instructionFiles` config section goes away | After `init` in an empty fixture, no `docs/context-brake-protocol.md`, `CONTEXTBRAKE` marker block, or `.gitignore` change exists. `remove` has no `--remove-state` flag |
| FR-09 | `doctor` drops the findings that only applied to the removed features (protocol, instruction blocks, state files, checkpoint mode, light-mode-default, brake window, runner) and reports the snapshot settings | No removed finding code remains in the doctor report schema. A `doctor --json` fixture validates against the regenerated schema |
| FR-10 | Claude Code automatic restart (PRD-11) has a single gate based on the reset signal. The checkpoint gate and its skip reasons go away | In the simulated mod host, a reply ending with the marker clears and seeds with no checkpoint file present. The `SKIP_CHECKPOINT_*` and `SKIP_NO_ACTIVE_STEP` reasons no longer exist |
| FR-11 | This repository runs on the single mode: its config, instruction files, `.gitignore`, and protocol file match a fresh `init` | `context-brake doctor` on this repository reports no error. `CLAUDE.md`, `AGENTS.md`, and `.gitignore` carry no ContextBrake block, and `docs/context-brake-protocol.md` is removed |
| FR-12 | User and repository documentation describe only the single mode: the README, the text in `CLAUDE.md` and `AGENTS.md` outside managed blocks, and the SDD skills and references that describe plan mode or the `CRITICAL` deny (e.g. `sdd-snapshot` Failures, `sdd-orchestrate-tasks/references/session-continuity.md`) | None of these files mentions `task_plan.json`, the checkpoint, boot, delegated or full mode, `run`, `wrap`, or ContextBrake denying tools. The snapshot skill settings are documented in the README with an example |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Platform | Behavior is unchanged on Linux, macOS, and Windows (PowerShell and Git Bash) for the commands that remain |
| NFR-02 | Quality gate | `npm run lint`, `npm run typecheck`, `npm run coverage` (80% thresholds), and `npm run schemas:check` pass. Generated schemas match the code |
| NFR-03 | Test footprint | Tests for removed features are deleted, not skipped. No test file is left for a removed command or mode. The test-time budget itself is owned by prd-13 |
| NFR-04 | Hook latency | Per-call hook overhead does not grow compared with today's light mode |

## User experience

Terminal output keeps following `.agents/rules/cli-output.md`. `init` reports the snapshot skill settings it wrote, or says that only zone headers will be injected. `doctor` shows the zones, the trigger zone, and the snapshot and resume commands, or "not configured". An unknown removed command or flag fails with the existing `INVALID_ARGUMENTS` format and lists the allowed values.

## Constraints and dependencies

- Builds on PRD-02 (zones and telemetry), PRD-07 (light mode), PRD-06 (snapshot command semantics), PRD-08 (debug mode), PRD-10 (status line), and PRD-11 (automatic restart). Their behavior that does not depend on the removed features is preserved.
- prd-13-refatoracao-modo-leve-testes-rapidos runs after this PRD. It owns the `npm test` time budget, so this PRD only removes tests and must not add slow ones.
- Behavior change accepted with FR-06: today light mode asks for the reset marker with no command (`src/core/services/light-guidance.ts:9`). After this PRD it no longer does when no snapshot command is set. Between this PRD and prd-14, Claude Code automatic restart therefore fires only with a snapshot command configured.
- prd-14-refatoracao-modo-leve-reinicio-multi-harness depends on FR-04, FR-05, FR-06, and FR-10. It adds the markdown handoff for sessions without a snapshot skill, and restart on other harnesses.
- Harness event names and payloads stay inside adapters (`AGENTS.md`, Architecture).

## Out of scope

- The markdown handoff instruction and resume when no snapshot skill is configured: prd-14.
- Automatic restart on harnesses other than Claude Code, and generalizing the PRD-11 core: prd-14.
- Reducing the test-suite run time, beyond deleting the tests of removed features: prd-13.
- Migrating or cleaning up existing user installations, and any backward-compatible config reading (decision of 2026-10-06).
- Changing zone thresholds, telemetry format, status line, or debug mode.

## Assumptions and sources

- Product decisions from the user on 2026-10-06:
  - Remove `run` and `wrap`.
  - No tool-call deny.
  - No migration: ContextBrake was never released.
  - Light mode with an optional automatic snapshot skill. Without one, only zone headers.
- Assumption: the delegated allowlists (`allowedPaths`, `allowedSkills`, `--snapshot-path`, `--snapshot-skill`) exist only to exempt calls from the deny, so they go away with FR-07. If wrong, their purpose has to be restated in the TechSpec.
- Assumption: the session-start hook stays installed on every harness. It records the ledger reset and is the channel for the resume instruction (`src/core/services/session-reset-handler.ts:25-33`).
- Source: the mode and coupling inventory explored on 2026-10-06 at commit `1474f54`, recorded in `context-snapshot.md`.
- Source: the triage line of 2026-10-06 in `tasks/triage-log.jsonl`.

## PRD acceptance gate

- [ ] Every requirement has an ID and an observable criterion.
- [ ] Metrics, boundaries, and out-of-scope items are explicit.
- [ ] Internal rules came from the user or an identified project source.
- [ ] Implementation details remain in the TechSpec.
