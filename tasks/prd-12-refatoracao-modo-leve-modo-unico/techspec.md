# TechSpec — Light mode as the only mode

## Sources and traceability

- PRD: `tasks/prd-12-refatoracao-modo-leve-modo-unico/prd.md` (approved at DEC-HIL-01)
- Decisions: `workflow.md` DEC-PD-01 (remove `run`/`wrap`), DEC-PD-02 (no deny), DEC-PD-03 (no migration), REC-SET-01
- Applicable instructions and rules: `AGENTS.md`; `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`, `file-changes.md`, `cli-output.md`
- Research: `docs/research/harness-integrations.md`, "Resumo por canal" and each harness section, for the pre-tool hook of each harness that this spec drops
- Evidence in existing code: inventory explored on 2026-10-06 at `1474f54`. Each component and decision below cites the specific `path:line`

## Solution summary

This is mostly deletion. The removed features go away in whole modules:

- plan mode, checkpoint, and boot;
- `run`, `wrap`, and the runner;
- delegated mode;
- the tool-call deny with its allowlists and block log;
- the protocol file, instruction blocks, and `.gitignore` block.

The surviving code moves to one behavior. A new config section, `snapshot`, holds the trigger zone and the optional snapshot and resume commands. A single guidance module turns zone and section into the telemetry action and the session-start resume text. Because nothing denies any more, the brake engine loses the `pre_tool` event. No adapter installs a pre-tool hook. The deny-only capabilities and the `cooperative` support level go away.

Boundaries:

- Zones, telemetry injection, the status line bridge, debug mode, the session ledger, and the PRD-11 mod survive. The mod loses its checkpoint gate.
- No legacy key is read or migrated (DEC-PD-03). This repository's own install is rewritten at the end (FR-11).
- The markdown handoff and multi-harness restart belong to prd-14.
- The test budget belongs to prd-13. This spec only deletes or rewrites tests.

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-02, FR-04, FR-08, FR-03, FR-07 | `configurationSchema` keeps `$schema`, `schemaVersion: 1`, `activeHarnesses`, `telemetry`, `debug?`, and `autoRestart?`, and adds `snapshot`. It drops `stateStorage`, `instructionFiles`, `brake`, `delegatedSnapshot`, `lightMode`, `fullMode`, `runner`, and the full/light check (`src/core/contracts/configuration.ts:49-81`). `schemaVersion` stays `1`. `strictObject` rejects any removed key | ContextBrake was never released (DEC-PD-03). `parseConfiguration` maps each zod issue to `{ path, rule: issue.message }` (`src/core/validation/configuration-validator.ts:13-16`); that the unrecognized-keys message names the key is proven by TC-04 on the first removed key (T01) | Bump to `schemaVersion: 2`. Rejected: no reader of version 1 remains to tell the two apart |
| DEC-02 | FR-04 | `snapshot` is a strict object with `triggerZone` (`YELLOW` or `RED`, default `RED`), `command?`, and `resumeCommand?`. The defaults make `snapshot` always present after parsing. `resumeCommand` without `command` is a validation error. The schema replaces `lightModeSchema` (`light-mode.ts:4`) and `delegatedSnapshotSchema` (`configuration.ts:63`) | The trigger zone must exist without a command, because prd-14 reuses it for the handoff (REC-SET-01). Resuming with no snapshot to resume from is meaningless | Two sections (`lightMode` plus an optional command section). Rejected: it recreates the mode split the PRD removes |
| DEC-03 | FR-04, FR-02, FR-08 | `init` flags:<ul><li>Keep `--snapshot-command`, `--snapshot-trigger`, and `--resume-command`.</li><li>Rename `--no-delegated-snapshot` to `--no-snapshot-command`, which clears `command` and `resumeCommand` and keeps `triggerZone`.</li><li>Delete `--light`, `--no-light`, `--snapshot-path`, `--snapshot-skill`, `--instruction-file`, `--create-instructions`, and `--migrate-legacy` (`src/cli/init-arguments.ts:17-30`).</li></ul>`delegated-snapshot-merge.ts` becomes `snapshot-merge.ts`. It drops the paths and skills, drops the rule that the command is required (`:16,:25`), and keeps the rule that `--no-snapshot-command` cannot be combined with the other two flags (`:15,:23`) | Reuses the merge chain in `installation-builder.ts:43` | Keep `--no-delegated-snapshot`. Rejected: the delegated name no longer means anything |
| DEC-04 | FR-08 | `remove` drops `--remove-state` and always deletes the runtime files ContextBrake owns under `.context-brake/runtime/` (`planRuntimeStateDeletions`, `state-removal.ts:19-24`). It never deletes other files under `.context-brake/` | FR-08 requires dropping the flag. With no plan or checkpoint, only ContextBrake's own runtime logs were left behind that flag. prd-14's handoff lives outside `runtime/` | Keep runtime files after `remove`. Rejected: it leaves ContextBrake-owned data behind with no way to delete it |
| DEC-05 | FR-05, FR-06 | A single module, `zone-guidance.ts`, exports `zoneAction(zone, snapshot)` and `resumeText(snapshot)` using the texts in Contracts. `light-guidance.ts`, `delegated-guidance.ts`, the plan variants of `zone-actions.ts`, and the `ZoneGuidance`/`CheckpointMode` contract (`checkpoint-mode.ts`) are deleted | One behavior per zone (OBJ-01). The deny members `allows`, `denyMessage`, and `failureMessage` have no caller after DEC-06 | Keep the `ZoneGuidance` object with one implementation. Rejected: an interface with a single implementation and nothing to swap |
| DEC-06 | FR-07 | The brake engine drops the `pre_tool` event and the `deny` decision (`src/core/contracts/runtime.ts:20,28`, `brake-engine.ts:38-47`). Removed with them: the `BlockLog` port, `blocks.jsonl`, `brakeMode`/`brakeReason` in the session line, `brake-mode.ts`, `BRAKE_COOPERATIVE`, `BRAKE_BLOCKS_RECORDED`, and the deny branch of the failure policy (`failure-policy.ts:59-63,84-91`). A hook failure always ends neutral, and the error log and internal deadline stay | Only the deny reads `pre_tool` (turns advance in `post_tool`, `brake-engine.ts:52-56`). With no deny, every one of these has no purpose | — |
| DEC-07 | FR-07, NFR-04 | **No adapter installs a pre-tool hook.**<ul><li>Removed hook registrations: Claude Code (`claude-hooks-config.ts:4`), Codex (`codex-hooks-updater.ts:5`), Cursor (`cursor-hooks-updater.ts:5,11`, including `failClosed`), Copilot (`planner.ts:24,35`), Antigravity (`antigravity-hooks-updater.ts:12`).</li><li>Removed in-process handlers: OpenCode `tool.execute.before` (`runtime.ts:24,81`), and Pi and Oh-My-Pi `tool_call` (`runtime.ts:83`, `events.ts:41,56-58`).</li><li>Removed with them: the pre-tool payload and response schemas, and the deny renderers.</li><li>The Claude Code doctor check of the integration moves from the PreToolUse group to the PostToolUse group (`claude-code/adapter.ts:56-57`).</li><li>An event a host no longer maps returns neutral (`mapEvent` returns `null`, `process-hook-host.ts:14`).</li></ul>**Requires amending FR-07's criterion at HIL 2:** "pre-tool hooks return neutral" becomes "no pre-tool hook is installed" | A hook that always returns neutral costs one process per tool call on Claude Code, Codex, Cursor, Copilot, and Antigravity for no effect. Removing it also removes the `failClosed` risk on Cursor and about 15 schemas, fixtures, and renderers | Keep the hooks registered, returning neutral. That matches the current FR-07 wording, but it keeps the per-call cost and the deny-shaped adapter code |
| DEC-08 | FR-07, FR-09 | `CAPABILITY_IDS` drops `pre_tool_block`, `tool_coverage`, and `timeout_fail_closed` (`harness.ts:15-23`). `SUPPORT_LEVELS` becomes `['full', 'partial']`. A harness is `full` when `post_tool_telemetry` and `session_boot` are `supported`, and `partial` otherwise (`support-service.ts:46-55`). The unverified-floor limitation moves to `post_tool_telemetry` (`:43`). The `session_boot` ID stays, now meaning "session-start injection" | These three capabilities exist only for blocking, and `cooperative` means "cannot block". Keeping the `session_boot` ID avoids renaming it in nine profiles and both report schemas for no behavior gain | Rename `session_boot` to `session_start_context`. Deferred: cosmetic, and prd-14 touches the same profiles |
| DEC-09 | FR-07 | `window-trust.ts` keeps only `acceptsDeclaredWindow` (`session-zone.ts:21`). `telemetryAction`, `UNTRUSTED_CRITICAL_ACTION`, and `isTrustedWindow` are deleted: their only callers are the deny paths and the runner's `session-watch.ts:84` | — | — |
| DEC-10 | FR-09 | Doctor changes:<ul><li>Drops the fields `checkpointMode` and `brakeWindow` (`src/core/contracts/diagnostics.ts:25,28,60`).</li><li>Drops these findings: `DELEGATED_SNAPSHOT_*`, `DELEGATED_SKILL_UNRECOGNIZED`, `LIGHT_MODE_DEFAULT_*`, `LIGHT_MODE_LEFTOVER`, `LIGHT_MODE_ASSET_KEPT`, `INSTRUCTION_REFERENCE_MISSING`, `PROTOCOL_FILE_*`, `INVALID_STATE_FILE`, `STATE_FILES_NOT_IGNORED`, `MALFORMED_GITIGNORE_MARKERS`, `LEGACY_BLOCK_DETECTED`, the instruction and protocol conflict codes, `BRAKE_*`, and the `RUN_*` CLI codes.</li><li>Adds a `snapshot` field: `{ triggerZone, command: string \| null, resumeCommand: string \| null }`.</li><li>`STATUSLINE_BRIDGE_ABSENT` is raised from `contextWindow.bridge === 'absent'` with Claude Code active. It no longer depends on `brakeWindow` (`doctor-report-extras.ts:18-20`), and its text no longer mentions blocking</li></ul> | The bridge still decides how accurate Claude Code telemetry is (PRD-09), so the finding keeps a purpose | — |
| DEC-11 | FR-08 | `init` writes only the config, the manifest, and the harness assets. `support-files.ts` loses the full branch, and the protocol, instruction, and gitignore services are deleted. `CHANGE_OWNERS` drops `protocol`, `instruction_block`, and `ignore_block` (`changes.ts:5`). `instructionFiles` paths leave `snapshot-helper.ts:24-36` and the `find(...)!` lookups in `init.ts:44-47`, `remove.ts:39-44`, and `doctor.ts:34-39` | There is no protocol to reference once plan mode is gone, and the telemetry block explains itself | — |
| DEC-12 | FR-10 | PRD-11 mod changes:<ul><li>`readModConfig` returns no `gate`, `planFile`, or `checkpointFile` (`mod-config.ts:36-44`).</li><li>`restart-facts.ts` stops reading the checkpoint (`:32-40`).</li><li>`decideRestart` loses the checkpoint gate (`auto-restart-policy.ts:16-32`).</li><li>`RESTART_REASON_CODES` drops the `SKIP_CHECKPOINT_*` codes and `SKIP_NO_ACTIVE_STEP` (`auto-restart.ts:9-13`).</li><li>The seed is always the generic sentence (`auto-restart-notices.ts:5,24-26`).</li><li>The resume command reaches the new session through the `SessionStart` resume text, because Claude Code fires `SessionStart` with origin `clear` (`harness-integrations.md:48`)</li></ul> | Signal-only is today's light-mode gate. A configured snapshot command is the only path that asks for the marker (FR-05, FR-06) | Keep a gate on a fresh snapshot file. Rejected: the skill decides where it writes, so ContextBrake cannot verify it. prd-14 adds the handoff gate |
| DEC-13 | FR-03 | Deletes `src/infrastructure/runner/**`, the `run`/`wrap`/`plan` commands and their arguments, `run-text`, the runner contracts, the Claude Code and Codex session launchers and streams, `stream-line.ts`, and `executable-command.ts`. It also deletes `shutdown.ts` when no importer is left. `main.ts:24` and `argument-parser.ts:50-53` dispatch only `init`, `doctor`, and `remove`. The help text lists those three (`composition-root.ts:20-31`) | The import graph at `1474f54` shows these are reached only from the deleted commands | — |
| DEC-14 | FR-01 | Deletes:<ul><li>the plan and checkpoint contracts, validators, stores, and readers (`boot-reader`, `plan-presence`, `plan-validation-reader`, `git-inspector`);</li><li>`boot-*`, `plan-*`, `git-divergence`, `session-evaluation`, `session-record`, and `session-watch`;</li><li>`validation/issues.ts`;</li><li>`schemas/task-plan.schema.json`, `state-checkpoint.schema.json`, and `run-summary.schema.json`.</li></ul>`runtime-composition.ts` stops wiring the boot reader, plan presence, validation reader, git inspector, and block log. The session-reset handler keeps the ledger reset line, stale-session pruning, and resume text injection, gated by `session_boot` and the compaction list (`session-reset-handler.ts:22-33`) | The session-start hook is the channel for the resume text (PRD assumption) | — |
| DEC-15 | FR-11, FR-12 | This repository moves by hand, because no compatibility code exists:<ul><li>rewrite `context-brake.config.json` to the new shape;</li><li>remove the ContextBrake blocks from `CLAUDE.md`, `AGENTS.md`, and `.gitignore`;</li><li>delete `docs/context-brake-protocol.md` and its `package.json` `files` entry;</li><li>remove the stale PreToolUse group from `.claude/settings.json`;</li><li>run `init` and `doctor` with the new build.</li></ul>The unmanaged instruction text is rewritten too: the `CLAUDE.md` protocol line, `AGENTS.md` "Context protocol" and architecture lines, `.agents/rules/*` examples about plan and checkpoint, `sdd-snapshot` Failures, `session-continuity.md` "Measure the context", `sdd-plan-refactoring/references/cli-and-adapters.md:7`, and `sdd-triage/SKILL.md:24`. The research notes under `docs/research/` are history and stay as written, except one dated note in `harness-integrations.md` "Consequências para o desenho" saying the deny was removed in prd-12 | Updaters only touch their own event lists, so a stale PreToolUse entry survives a reinstall. With no compatibility code, the one install that exists is fixed by hand | Add legacy-cleanup lists to the updaters. Rejected by DEC-PD-03 |
| DEC-16 | NFR-03 | Tests for removed features are deleted. Tests of surviving behavior that use removed keys, ports, or deny are rewritten. `tests/test-lanes.ts` drops the deleted files. Acceptance mode goes away: the `test:acceptance` script, `TEST_MODE_VARIABLE`, `tests/helpers/acceptance-scale.ts`, and the `--mode acceptance` in `release:check` (`package.json:30,33`), because its only two suites are deleted. The prd-13 bench script owns the release gate's extra suites | The classification is in Relevant files | Keep an empty acceptance mode for prd-13. Rejected: prd-13 FR-03 defines its own script |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/core/contracts/configuration.ts` (+ `snapshot` section, replacing `light-mode.ts`) | Modified | Config shape, defaults, validation | DEC-01, DEC-02 |
| CMP-02 | `src/core/services/snapshot-merge.ts` (from `delegated-snapshot-merge.ts`), `src/cli/init-arguments.ts`, `init-config-updates.ts`, `installation-builder.ts` | Modified | Flags into config updates | CMP-01, DEC-03 |
| CMP-03 | `src/core/services/zone-guidance.ts`, `zone-actions.ts` | Modified | Zone action and resume text | CMP-01, DEC-05 |
| CMP-04 | `src/core/services/brake-engine.ts`, `session-reset-handler.ts`, `failure-policy.ts`, `window-trust.ts`, `src/core/contracts/runtime.ts`, `session-ledger.ts` | Modified | Telemetry on `post_tool`, `pre_invocation`, `session_reset`, and `response_end`. No deny | CMP-03, DEC-06, DEC-09 |
| CMP-05 | Harness adapters `src/infrastructure/harnesses/*/{planner,runtime,schemas,events,adapter,capabilities}.ts`, `common/*-hooks-updater.ts`, `claude-code/claude-hooks-config.ts`, `runtime/{process-hook-host,in-process-host,hook-failure}.ts`, `common/in-process-support.ts` | Modified | No pre-tool hook. Capabilities updated | CMP-04, DEC-07, DEC-08 |
| CMP-06 | `src/core/contracts/harness.ts`, `support-service.ts` | Modified | Capability IDs and support level | DEC-08 |
| CMP-07 | Doctor: `doctor-service.ts`, `doctor-checks.ts`, `doctor-report-extras.ts`, `project-file-checks.ts`, `report-service.ts`, `contracts/diagnostics.ts`, `cli/commands/doctor.ts`, `cli/output/text.ts`, `doctor-mode-text.ts` (replaced by snapshot text) | Modified | Report the single mode | CMP-01, DEC-10 |
| CMP-08 | Install and remove: `support-files.ts`, `installation-service.ts`, `installation-findings.ts`, `removal-service.ts`, `removal-helper.ts`, `contracts/changes.ts`, `cli/commands/{init,remove}.ts`, `snapshot-helper.ts`, `argument-parser.ts` | Modified | No protocol, blocks, gitignore, or state files | DEC-04, DEC-11 |
| CMP-09 | Claude Code mod: `mod/{mod-config,restart-facts,restart-flow}.ts`, `core/services/auto-restart-{policy,notices}.ts`, `contracts/auto-restart.ts` | Modified | Signal-only restart | DEC-12 |
| CMP-10 | `src/cli/{main,composition-root}.ts`, `runtime-composition.ts` | Modified | Wiring without the removed commands or ports | DEC-13, DEC-14 |
| CMP-11 | `scripts/{generate-schemas,check-schemas,check-package}.ts`, `schemas/*.json`, `package.json` | Modified | Schemas regenerated; files and scripts trimmed | DEC-14, DEC-16 |
| CMP-12 | `README.md`, `AGENTS.md`, `CLAUDE.md`, `.gitignore`, `.agents/rules/*`, SDD skill texts, this repo's config and `.claude/settings.json` | Modified | Documentation and dogfooding | DEC-15 |

Flow after the change:

1. A harness hook or extension maps `post_tool`, `pre_invocation`, `session_reset`, or `response_end` into a `RuntimeEvent`. Any other event maps to `null` and returns neutral.
2. `brake-engine` reads the ledger and classifies the zone. For telemetry it calls `zoneAction(zone, config.snapshot)`.
3. On `session_reset`, it records the ledger line, prunes stale sessions, and returns `resumeText(config.snapshot)` when `session_boot` is supported.
4. On `response_end`, the reset notice is unchanged (prd-14 owns its detection, FR-12).
5. The Claude Code mod reads `autoRestart` from the config and restarts on the signal alone.

## Contracts and data

**Config** (`context-brake.config.json`, `schemaVersion: 1`, generated schema `schemas/context-brake.config.schema.json`):

```json
{
  "schemaVersion": 1,
  "activeHarnesses": ["claude-code"],
  "telemetry": { "...": "unchanged" },
  "snapshot": { "triggerZone": "RED", "command": "/sdd-snapshot", "resumeCommand": "<resume command>" },
  "debug": false,
  "autoRestart": { "maxConsecutiveRestarts": 2 }
}
```

- `snapshot.triggerZone`: `"YELLOW"` or `"RED"`. It is optional on input, with default `"RED"`.
- `snapshot.command` and `snapshot.resumeCommand`: the existing `agentCommand` string rule. Both are optional. `resumeCommand` requires `command`, and the validation message names `snapshot.resumeCommand`.
- A removed top-level key fails with the strict-object issue naming that key, in the existing `INVALID_CONTEXTBRAKE_CONFIG` format.

**Agent-facing text** (the telemetry `action` field and the session-start block). `<marker>` is `[REQUEST_SESSION_RESET]`:

| Zone | With `snapshot.command` | Without |
| --- | --- | --- |
| GREEN | `work normally` | `work normally` |
| YELLOW, trigger `YELLOW` | `run "<command>", then end reply with <marker>` | `keep working; finish the current unit before large new explorations` |
| YELLOW, trigger `RED` | `keep working; finish the current unit before large new explorations` | same |
| RED | `run "<command>", then end reply with <marker>` | `finish or pause the current unit and tell the user what remains` |
| CRITICAL | `run "<command>" now, then end reply with <marker>` | `stop starting new work; tell the user what remains` |

- Resume text, only with `resumeCommand`: `[ContextBrake resume v1] Run "<resumeCommand>" before continuing.`
- No text says "blocked" or "allowed".

**Runtime contract:**
- `RuntimeEvent` loses `pre_tool`, and `RuntimeDecision` loses `deny`.
- The session line in the ledger loses `brakeMode` and `brakeReason`. A ledger line written by the old shape fails strict parsing and is skipped (`parseLedgerLine` returns `null`). That is acceptable under DEC-PD-03, and the runtime directory is recreated after the reinstall in DEC-15.

**Reports** (`schemas/doctor-report.schema.json`, `install-report.schema.json`, regenerated):
- `supportLevel` enum is `full | partial`, and the capability ID enum has 4 values.
- The doctor report drops `checkpointMode` and `brakeWindow` and adds `snapshot`.
- The `fileChange.owner` enum drops `protocol`, `instruction_block`, and `ignore_block`.
- The CLI error command enum is `init | doctor | remove`, and `RUN_*` and `INVALID_STATE_FILE` leave the CLI error codes.

**Mod log** (`.context-brake/runtime/claude-mod/<session>.json`): `code` loses the four checkpoint codes. `v` stays `1` (DEC-PD-03).

**Exit codes:** unchanged for the remaining commands. The runner stop codes in `src/cli/exit-codes.ts` go if nothing else uses them.

## Integrations and interfaces

- **CLI:** `context-brake init | doctor | remove`.
  - `init` gains `--no-snapshot-command` and loses the flags in DEC-03.
  - `remove` loses `--remove-state` and always deletes owned runtime files (DEC-04).
  - An unknown command or flag fails with `INVALID_ARGUMENTS` (exit 64), listing the allowed values.
- **Hooks per harness after the change:**
  - Claude Code: PostToolUse, SessionStart, Stop.
  - Codex: PostToolUse, SessionStart, Stop.
  - Cursor: postToolUse, sessionStart, preCompact.
  - Copilot: postToolUse, sessionStart, preCompact.
  - Antigravity: PostToolUse, PreInvocation.
  - OpenCode: `tool.execute.after` and session events.
  - Pi and Oh-My-Pi: `tool_result`, `before_agent_start`, and `message_end`/`session_stop`.
  - Each adapter re-checks its vendor docs per `harness-adapters.md`. The removed pre-tool registration needs no new vendor behavior.
- **Failure policy:** any hook failure produces the neutral decision and records the error. The internal deadline is unchanged.

## Errors, security, and recovery

- **Errors and edges:**
  - A config with a removed key, or `resumeCommand` without `command`, gives `INVALID_CONTEXTBRAKE_CONFIG`. `doctor` reports it, and runtime hooks fall back to the existing invalid-config behavior (neutral).
  - A host receiving an event it no longer maps returns neutral.
- **User files:**
  - `init` and `remove` no longer touch instruction files or `.gitignore`. (Superseded for the new, differently marked `.gitignore` block by prd-17.)
  - Previously written ContextBrake blocks in other repositories are not cleaned (DEC-PD-03). This repository is cleaned by hand (DEC-15).
  - `remove` deletes only paths in the manifest and `.context-brake/runtime/`.
- **Concurrency:** no new shared state. The ledger format changes, with old lines skipped.
- **Rollback:** revert the feature commits, then run the previous build's `init` in this repository. No user data is migrated, so reverting loses nothing.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| S1. Remove `run`, `wrap`, and the runner (DEC-13), with their tests and lanes | — | `context-brake run` fails with `INVALID_ARGUMENTS`; typecheck, lint, and tests pass |
| S2. Remove plan mode, boot, and checkpoint (DEC-14), the mod checkpoint gate (DEC-12), and the plan and checkpoint schemas | S1 | No reference to `task_plan` or `state_checkpoint` in `src`; mod tests pass with no checkpoint |
| S3. Single config section and guidance (DEC-01, DEC-02, DEC-03, DEC-05), including delegated-mode removal and the doctor `snapshot` field | S2 | TC-04 to TC-08 pass |
| S4. Advisory brake: no deny, no pre-tool hooks, capabilities and support levels (DEC-06 to DEC-09), schemas regenerated | S3 | TC-09 to TC-11 pass; `schemas:check` passes |
| S5. Install and remove without protocol, blocks, or gitignore, plus doctor findings (DEC-04, DEC-10, DEC-11) | S3 | TC-12 to TC-14 pass |
| S6. Documentation, rules, and skill texts; acceptance mode removed; this repo moved to the new install (DEC-15, DEC-16) | S4, S5 | TC-15 to TC-17 pass; `doctor` on this repo has no error |

## Test approach

- **Profile:**
  - Runtime surfaces: the CLI commands in `src/cli/`; process hooks for Claude Code, Codex, Cursor, Copilot, and Antigravity (one process per event); in-process extensions for OpenCode, Pi, and Oh-My-Pi; and the Claude Code mod.
  - Stack: Node.js 20+, TypeScript `tsconfig.json`/`tsconfig.check.json`, ESM, Vitest 3 with the lanes in `tests/test-lanes.ts`.
  - Commands from `AGENTS.md`: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`, `npm run package:smoke`.
- **End-to-end:** the built CLI against fixture repositories in temporary directories, for `init`, `doctor`, and `remove` with and without the snapshot flags. No new e2e file is added (prd-13 budget). Existing e2e files listed as MODIFY are rewritten in place.
- **Platforms:** no path, symlink, or line-ending behavior changes. Windows (PowerShell and Git Bash) is verified locally. Linux and macOS rely on the unchanged platform suites and stay unverified by this feature.
- **Prerequisites:** `npm run build` before e2e, serialized with coverage (shared `dist/`).
- **Manual acceptance:**
  - MA-01: in this repository after S6, start interactive Claude Code with `snapshot.command`, `resumeCommand`, and `autoRestart` set. Check (a) the telemetry at `RED` names the command, (b) no tool call is ever denied, (c) a typed `/clear` injects the resume text, and (d) a reply ending with the marker makes the mod run `/clear`, and the new session receives the resume text from the settings `SessionStart` hook plus the generic seed.
  - Owner: maintainer.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-03 | e2e | `context-brake run`, `wrap`, and `plan` | `INVALID_ARGUMENTS`, exit 64; help lists `init`, `doctor`, `remove` | `tests/e2e/e2e-09.test.ts` (rewritten case) |
| TC-02 | FR-01 | unit | `src` and `schemas` scan | No module or schema for the plan or checkpoint; generated schema set is `config`, `doctor-report`, `install-report` | `tests/unit/schemas.test.ts` |
| TC-03 | FR-10 | integration | Simulated mod host: marker reply, no checkpoint file | `/clear` then the generic seed; no `SKIP_CHECKPOINT_*` code exists | `tests/integration/claude-mod-gates.test.ts`, `claude-mod-restart.test.ts` |
| TC-04 | FR-02 | unit | Config with each removed key | Validation fails naming the key | `tests/unit/configuration.test.ts` |
| TC-05 | FR-04 | integration | `init --snapshot-command /x --resume-command /y`; then `--snapshot-trigger YELLOW` alone; then `--no-snapshot-command` | Config holds both commands; trigger set without a command; commands cleared, trigger kept; `--no-snapshot-command` with another snapshot flag fails | `tests/integration/init-snapshot.test.ts` (rewritten from `init-light-mode`) |
| TC-06 | FR-02 | unit | `init --light`, `--no-light`, `--snapshot-path`, `--remove-state` | `INVALID_ARGUMENTS` | `tests/unit/init-arguments.test.ts` |
| TC-07 | FR-05 | unit | `zoneAction` for each zone and trigger, with a command; `resumeText` with and without `resumeCommand` | Texts as in Contracts | `tests/unit/zone-guidance.test.ts` |
| TC-08 | FR-06 | integration | Runtime with no command: `RED` post-tool and `SessionStart` clear | Header with the generic action without the marker; no resume block; no file written outside the install set | `tests/integration/runtime-light-mode.test.ts` |
| TC-09 | FR-07 | unit | Each harness runtime: `CRITICAL` with a trusted window | No pre-tool handler or registration exists; post-tool returns telemetry; no `deny` kind in `RuntimeDecision` | `tests/unit/runtime-*.test.ts`, `tests/unit/hook-registration-paths.test.ts` |
| TC-10 | FR-07 | integration | Hook throws inside the deadline in `CRITICAL` | Neutral response and error recorded | `tests/integration/runtime-failure-policy.test.ts` |
| TC-11 | FR-07 | unit | Support profile of each harness | Level `full` or `partial`; capability IDs are the 4 remaining | `tests/unit/support-service.test.ts`, `harness-adapters.test.ts` |
| TC-12 | FR-08 | e2e | `init` in an empty fixture, then `remove` | No protocol file, marker block, or `.gitignore` change; `remove` deletes owned runtime files and manifest assets | `tests/e2e/e2e-07-08.test.ts` |
| TC-13 | FR-09 | integration | `doctor --json` with and without `snapshot.command` | Validates against the regenerated schema; `snapshot` field shown; none of the removed codes | `tests/integration/doctor-light-mode.test.ts` (rewritten), `tests/unit/doctor-checks.test.ts` |
| TC-14 | FR-09 | unit | Claude Code active, bridge absent | `STATUSLINE_BRIDGE_ABSENT` without `brakeWindow` | `tests/unit/doctor-context-window.test.ts` |
| TC-15 | FR-12 | unit | README checks | README examples parse against the new config; support table lists `full` or `partial` only | `tests/unit/readme-*.test.ts` |
| TC-16 | FR-11, FR-12 | manual | Repository text scan after S6 | `rg -n "task_plan|state_checkpoint|context-brake-protocol|fullMode|lightMode|delegatedSnapshot|context-brake (run|wrap|plan)" README.md AGENTS.md CLAUDE.md .gitignore .agents package.json src` returns nothing | executed in the S6 task |
| TC-17 | FR-11, NFR-02 | manual | This repo after S6 | `node dist/src/cli/main.js doctor` reports no error; lint, typecheck, coverage at 80%, and `schemas:check` pass | S6 task, then MA-01 |

## Quality profile

Rules this feature can violate. A blocking hit prevents task completion and rejects the review. A reservation becomes an optional improvement and counts toward escalation. A hit covered by `DEC-NN` is expected, not a finding.

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | `core` importing `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-02 | `any` in any form | blocking | `"${RG[@]}" ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | — |
| QA-03 | empty `catch` or `.catch(() => {})` | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | — |
| QA-04 | `console.log` or `process.stdout.write` on a hook response path | blocking | `"${RG[@]}" 'console\.log\|process\.stdout\.write' "${hook_files[@]}"` | — |
| QA-05 | synchronous file or process API in an in-process extension | blocking | `"${RG[@]}" '\b(readFileSync\|writeFileSync\|appendFileSync\|existsSync\|spawnSync)\b' "${in_process_files[@]}"` | — |
| QA-06 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `"${RG[@]}" '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-07 | file above 100 lines | reservation | `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | — |
| QA-08 | 4+ parameters in a declaration | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"` | — |

- Scope: the files in each task diff, with `RG`, `core_files`, `hook_files`, and `in_process_files` defined as in `.agents/skills/sdd-create-techspec/references/quality-typescript.md`.
- Deleted files are out of scope.
- Escalation trigger: 8+ reservations, a touched file above 200 lines, or duplication in 3+ places.

### Terrain baseline

Measured on 2026-10-06 at `1474f54` across 110 existing target files: the 46 CLI and core files, plus 64 adapter, runtime, and wiring files. No blocking hit was found in any of them, and no `throw new Error(` reservation. Rows are listed only for files that crossed a structural threshold. Every other target file measured clean, under 100 lines, under 10 exports, with no 4+ parameter declaration and under 10 cases.

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/core/contracts/diagnostics.ts` | 69 | 16 | 0 | 0 | — | recorded; members are removed, not added |
| `src/core/contracts/harness.ts` | 50 | 29 | 0 | 0 | — | recorded |
| `src/core/contracts/auto-restart.ts` | 30 | 13 | 0 | 0 | — | recorded |
| `src/core/contracts/session-ledger.ts` | 82 | 31 | 0 | 0 | — | recorded; block-log members removed |
| `src/core/contracts/changes.ts` | 34 | 24 | 0 | 0 | — | recorded |
| `src/core/services/failure-policy.ts` | 98 | 11 | 0 | 0 | — | recorded; deny members removed |
| `src/infrastructure/runtime/runtime-composition.ts` | 85 | 10 | 0 | 0 | — | recorded; ports removed |
| `src/core/services/installation-service.ts` | 102 | 3 | 0 | 0 | `QA-07: 102 lines` | recorded; legacy preview removal shrinks it |
| `src/infrastructure/harnesses/pi/runtime.ts` | 89 | 4 | 1 | 0 | `QA-08: 1 declaration` | recorded |
| `src/infrastructure/harnesses/oh-my-pi/runtime.ts` | 90 | 4 | 1 | 0 | `QA-08: 1 declaration` | recorded |

- Preparatory refactoring: not recommended. Every structural hit is a count of exports or lines, and the feature's contact with those files removes members instead of extending a saturated structure (rule (a) only).

## Observability and rollout

- **Signals:** `doctor` shows the `snapshot` settings and the per-harness support level. The runtime error log is unchanged.
- **Migration and compatibility:** none (DEC-PD-03). The only install is this repository, which is moved by hand in S6 (DEC-15).
- **Rollout:** a single feature branch merged after HIL 3. Packaging is checked by `npm run package:smoke`.

## Risks and open items

- **Risk: the deletion breaks a surviving import that the graph scan missed**, such as a dynamic import or a test helper. Probability medium, impact low: typecheck catches it. Mitigation: each step ends with typecheck, lint, and tests.
- **Risk: the stale PreToolUse entry in another clone of this repository keeps invoking the hook.** Probability low, impact low: the hook maps nothing and returns neutral. Mitigation: DEC-07 neutral fallback; DEC-15 cleans this clone.
- **Risk: the suite is still slow during this feature (about 10 minutes).** Probability high, impact medium on iteration time. Mitigation: run the touched suites per task and the full coverage at the S-step boundaries. prd-13 follows.
- **Risk: the settings `SessionStart` hook may not fire after a mod-initiated `/clear`.** Only the typed `/clear` is documented (`harness-integrations.md:48,58`), and PRD-11 MA-01 never ran full mode (DEC-MA-02). Probability low-medium, impact medium: no resume text after an automatic restart. Mitigation: MA-01 step (d); if it fails, T07 records it and prd-14 moves the resume text into the mod seed.
- **Open item, needed at HIL 2:**
  - Amend FR-07's criterion so that no pre-tool hook is installed, instead of hooks that return neutral (DEC-07).
  - Owner: the user.
  - Affects FR-07, TC-09, and S4.
- **Open item:** renaming `session_boot` is deferred to prd-14, or dropped (DEC-08).

## Relevant files

**Delete — `src` (about 90 files):**
- `src/infrastructure/runner/**`
- `src/cli/commands/{plan,run,run-preflight,run-prompts,wrap}.ts`
- `src/cli/{plan-arguments,run-arguments}.ts`, `src/cli/output/run-text.ts`, `src/cli/shutdown.ts` (if orphaned)
- `src/core/contracts/{checkpoint-mode,light-mode,run-control,run-ports,run-records,run-summary,runner-configuration,state-checkpoint,task-plan,git}.ts`
- `src/core/validation/{checkpoint-validator,plan-validator,issues}.ts`
- `src/core/services/` (each `.ts`):
  - plan and boot: `boot-policy`, `boot-summary`, `plan-scaffold`, `plan-status`, `git-divergence`, `session-evaluation`, `session-record`, `session-watch`, `state-removal` (runtime part moves to `removal-service`)
  - deny: `block-message`, `brake-allowlist`, `brake-window-report`, `brake-mode`, `brake-session-checks`, `path-pattern`, `shell-command-matcher`
  - delegated and light mode: `delegated-guidance`, `delegated-protocol`, `delegated-diagnostics`, `light-guidance`, `light-mode-merge`, `light-default-findings`, `config-legacy-checks` if it only checks removed keys
  - support files: `gitignore-checks`, `gitignore-markers`, `gitignore-service`, `instruction-markers`, `instruction-service`, `legacy-preview`, `protocol-service`
  - runner: `run-approvals`, `run-context`, `run-lifecycle`, `run-limits`, `run-loop`, `run-preflight`, `run-session`, `run-step`, `run-summary`, `run-tracker`, `runner-prompt`
- `src/infrastructure/git/git-inspector.ts`, `src/infrastructure/runtime/{boot-reader,plan-presence,plan-validation-reader,tool-path-normalizer}.ts`, `src/infrastructure/storage/{checkpoint-store,plan-store}.ts`
- `src/infrastructure/harnesses/{claude-code,codex-cli}/{session-launcher,session-stream}.ts`, `src/infrastructure/harnesses/common/stream-line.ts`, `src/infrastructure/process/executable-command.ts`

**Delete — other:**
- `schemas/{task-plan,state-checkpoint,run-summary}.schema.json`
- `docs/context-brake-protocol.md`

**Modify — `src`:** the files in CMP-01 to CMP-10.

**Modify — other:**
- `scripts/{generate-schemas,check-schemas,check-package}.ts`, `package.json`
- `README.md`, `AGENTS.md`, `CLAUDE.md`, `.gitignore`, `context-brake.config.json`, `.claude/settings.json`
- `.agents/rules/{tests,javascript-typescript,node,harness-adapters,file-changes,code-standards}.md`
- `.agents/skills/sdd-snapshot/SKILL.md`, `.agents/skills/sdd-orchestrate-tasks/references/session-continuity.md`, `.agents/skills/sdd-plan-refactoring/references/cli-and-adapters.md`, `.agents/skills/sdd-triage/SKILL.md`, with each change mirrored in `.claude/skills/`
- `docs/research/harness-integrations.md` (one dated note)

**Tests**, classified on 2026-10-06 from about 459 files:
- **Delete, 146 files:**
  - unit: `boot-*`, `brake-allowlist`, `brake-engine-{boot,delegated,delegated-lifecycle,plan-actions}`, `brake-window-report`, `brake-mode`, `brake-session-checks`, `checkpoint-validator`, `delegated-install-support`, `failure-policy-delegated*`, `git-*`, `gitignore-*`, `harness-session-signals`, `in-process-opencode-deny`, `init-legacy-preview`, `instruction-*`, `launcher-registry`, `legacy-preview`, `path-pattern`, `plan-*`, `protocol-*`, `reference-block-roundtrip`, `run-*`, `runner-*`, `session-corrections`, `session-evaluation`, `session-stream`, `session-watch-window-trust`, `shell-command-matcher`, `state-removal`, `validation-output-tail`, `wrap-arguments`
  - integration: `boot-*`, `*-session-launcher`, `doctor-brake-window`, `doctor-delegated-snapshot`, `doctor-state-schema`, `doctor-brake-sessions`, `runtime-block-log`, `executable-command`, `git-*`, `gitignore-lifecycle`, `harness-session-*`, `init-delegated-snapshot`, `init-light-default`, `init-light-switch`, `instruction-policy`, `node-*`, `plan-*`, `protocol-content`, `run-*`, `runtime-delegated-snapshot`, `runtime-state-removal`, `shell-validation-executor`, `symlink-junction`, `wrap-*`
  - e2e: `e2e-delegated-snapshot`, `e2e-gitignore-lifecycle`, `e2e-legacy-preview`, `e2e-plan-*`, `e2e-run-*`, `e2e-simulated-boot`, `e2e-simulated-long-task`, `e2e-window-trust`, `e2e-measured-brake` (its non-deny telemetry is covered by `e2e-simulated-usage`)
  - helpers: `acceptance-scale`, `boot-fixture`, `fake-session`, `gitignore-fixtures`, `run-*`, `stream-fixtures`, `wrap-world`
  - `tests/support/fake-harness/**`
  - fixtures: `tests/fixtures/runner/**`, `tests/fixtures/instructions/**`, the Claude Code and Codex stream fixtures, and the pre-tool fixtures of every harness (`pre-tool-use*.json`, `tool-execute-before.json`, `tool-call.json`)
- **Modify, about 99 files:**
  - unit: the runtime, host, support, adapter, doctor, removal, config, guidance, telemetry, auto-restart, schemas, exit-code, and README tests
  - integration: `claude-mod-*`, `doctor-light-mode`, `init-light-mode`, `init-debug-mode*`, `invalid-config`, the runtime suites, `safe-removal`, `directory-pruner`, `statusline-default`, `docs-auto-restart`, `package-contents`, `change-applier`
  - e2e: `e2e-07-08`, `e2e-10-fixtures`, `e2e-brake`, `e2e-light-mode`, `e2e-09`
  - helpers and support: `delegated-fixtures`, `delegated-world`, `light-world`, and `tests/support/harness-simulator/*`
  - fixtures: `tests/fixtures/claude-mod-scene.ts`, plus the codex, cursor, and antigravity legacy and user-hook fixtures with PreToolUse entries
  - `tests/test-lanes.ts`
  - Whether `delegated-snapshot-config`, `light-mode-config`, and `light-mode-merge` are deleted or rewritten into `snapshot-config` tests is decided in the task
- **Keep, about 214 files.**
