# TechSpec — Modo leve

## Sources and traceability

- PRD: `tasks/prd-07-modo-leve/prd.md`. It was approved in `DEC-HIL-01`, then revised twice:
  - During the first TechSpec draft: the block is `v2`, FR-09 follows the `.gitignore` rule, and FR-10 rejects the options that write instruction files.
  - After HIL 2 feedback: light mode has no snapshot command and uses generic action text (FR-04, FR-05, FR-10, FR-12, PD-03), and `doctor` shows the active sessions' usage (FR-14, OBJ-05, US-06, NFR-05, PD-05).
- Rules: `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `file-changes.md` (`init` removes managed blocks and the protocol), `cli-output.md` (`init`, `doctor`, `run` messages). `harness-adapters.md` does not apply because no adapter changes.
- Research: none needed. No harness payload, event, or config format changes, and the engine is shared by every adapter.
- Evidence in existing code:
  - Mode seam: `src/core/services/zone-guidance.ts` (`resolveCheckpointMode`, `resolveGuidance`, `resolveFailureGuidance`, `unionGuidance`) is the seam PRD-06 added. `delegated-guidance.ts` is the model for a guidance value.
  - Brake engine, `src/core/services/brake-engine.ts`:
    - `handlePreTool` reads the ledger, then consults the guidance only in `CRITICAL`.
    - `handleSessionReset` branches on `guidance.mode === 'delegated'`.
    - `telemetryDecision` renders through `readGuidance(...).actionFor`.
  - Failure policy: `src/core/services/failure-policy.ts#deadlineBootDecision` branches on `mode !== 'delegated'`.
  - Telemetry block and budget:
    - `src/core/services/telemetry-block.ts` has `TELEMETRY_BLOCK_VERSION = 2`.
    - `tests/unit/telemetry-block-budget.test.ts` enforces 60 tokens (`o200k_base`) and 220 characters in the worst case.
    - `zone-actions.ts` has `ZONE_ACTIONS.YELLOW.withoutPlan.compact`.
  - Install planning:
    - `src/core/services/installation-service.ts#planInstallation` always plans the protocol, the instruction blocks, and the `.gitignore` block.
    - `installation-findings.ts#buildManagedAssets` always lists the protocol.
    - `removal-helper.ts` has `planInstructionRemoval` and `planAssetDeletions`; `gitignore-service.ts` has `planGitignoreRemoval`.
  - Doctor:
    - `src/core/services/doctor-service.ts#diagnoseProject`, at 100 lines.
    - `delegated-diagnostics.ts#checkpointModeReport`.
    - `src/core/contracts/diagnostics.ts:23` (`checkpointMode`).
    - `report-service.ts#buildDoctorReport`.
  - Runtime state and ledger:
    - `src/infrastructure/runtime/runtime-state-reader.ts` already reads every ledger in `.context-brake/sessions/<harness>/*.jsonl`, but keeps only session lines.
    - `session-counters.ts#summarizeLedger` and `statusline-summary.ts` give the last tool reading and the last status line usage after the last reset.
    - `zone-classifier.ts` has `usagePercentage` and `classifyZone`.
  - CLI: `src/cli/init-arguments.ts`, `src/cli/commands/init.ts#delegatedUpdate`, `src/cli/snapshot-helper.ts#collectProjectSnapshots`, `src/cli/commands/run-preflight.ts#requireRunnablePlan`, and `src/cli/output/text.ts` (95 lines).

## Solution summary

A new optional top-level config section, `lightMode: { triggerZone }`, turns light mode on. Its presence is the switch (PD-01).

- **Mode resolution:** `resolveCheckpointMode` returns `light` before it looks at the plan or the delegated section. It never calls `PlanPresence`, the validation-command reader, or the boot reader.
- **Guidance:** `lightGuidance` supplies only generic action text, with no skill, command, or file name. It allows every tool call, and its resume text is `null`.
- **Brake engine:** `pre_tool` returns neutral at once in light mode, before any ledger read. `session_reset` records the reset line as today and injects nothing.
- **Failure policy:** it never denies and never injects at session start in light mode.
- **Install:** `init` gains `--light` and `--no-light`. With light mode in effect, the install planner replaces the protocol, instruction-block, and `.gitignore` steps with a light step. That step removes the unmodified managed protocol and the reference blocks. It removes the `.gitignore` block only when neither state file exists. The manifest stops listing the protocol.
- **Doctor in light mode:** it skips the protocol, instruction, `.gitignore`, and state-file checks. It reports leftovers and the inactive delegated section, and it exposes `checkpointMode.effective = "light"`.
- **Commands:** `run` refuses light mode. `wrap` works through the guidance.

Separately, `doctor` in every mode lists the repository's active sessions with their current context usage. The data comes from the ledgers it already reads: an active session has its last ledger activity within 30 minutes, and at most 10 are listed. The newest reading after the last reset wins, either the status line bridge reading or the last tool line. The list and its JSON field appear only when an active session exists.

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-01, FR-04, NFR-01 | Add an optional top-level `lightMode: { triggerZone: 'YELLOW' \| 'RED' }` to `configurationSchema`, with default `'RED'`, no other field, and no default section. `schemaVersion` stays `1`. The presence of the section means light mode. | An optional key leaves existing files parsing unchanged, and `planConfigChange` writes configs without it byte for byte (NFR-01). A section gives the trigger zone a home. | A `mode: "light"` field would need a default written into every config. Reusing `delegatedSnapshot` would drag in the command and the allowlist, which PD-03 rules out. |
| DEC-02 | FR-04, NFR-01 | `lightModeSchema` and `LightModeConfig` go in a new `src/core/contracts/light-mode.ts`. `SNAPSHOT_TRIGGER_ZONES` moves to `zones.ts`, and `configuration.ts` re-exports it with `export { … } from`, so its importers keep working. | `configuration.ts` already has 10 exports (structural). This adds no exported declaration there, and `light-mode.ts` can import the zones without an import cycle. | Declaring the schema in `configuration.ts` would add an 11th export to a saturated module. |
| DEC-03 | FR-01, FR-02, NFR-02 | `CHECKPOINT_MODES` becomes `['plan', 'delegated', 'light']`. `resolveCheckpointMode` and `resolveGuidance` check `config.lightMode` first and return `light` or `lightGuidance` without calling any port. `resolveFailureGuidance` and `unionGuidance` return `lightGuidance` directly. | The check is one property read, so light mode adds no I/O. It wins over plan presence and over the delegated section (FR-01). | Resolving light mode after the plan check would stat the plan file on every emitting event (FR-02). |
| DEC-04 | FR-03, FR-05, NFR-04 | The `lightGuidance(section)` actions by zone:<br>• `GREEN`: `work normally`.<br>• `YELLOW` below the trigger: `ZONE_ACTIONS.YELLOW.withoutPlan.compact`.<br>• `YELLOW` at the trigger, and `RED`: `save your snapshot or checkpoint now, then end reply with [REQUEST_SESSION_RESET]`.<br>• `CRITICAL`: `save your snapshot or checkpoint immediately, then end reply with [REQUEST_SESSION_RESET]`.<br>`renderTelemetryBlock` is unchanged, so the block keeps the `[ContextBrake v2]` format and fields. | `RED` is always at or above the trigger. None of the texts contains `/`, `task_plan`, `state_checkpoint`, `validation`, `commit`, or `blocked`. The worst-case `CRITICAL` block (`turn=99999/100000`, `tokens=9999999/1000000`, `source=estimated`) is 197 characters and 51 `o200k_base` tokens, within the 220 / 60 budget (NFR-04). | Naming a skill was removed at HIL 2. Saying only "snapshot" would not match flows that call it a checkpoint. |
| DEC-05 | FR-06, NFR-02 | In `brake-engine.ts`, `handlePreTool` returns neutral when `config.lightMode` is set, before `readSummary`. In `failure-policy.ts`, `resolveFailure` returns neutral for `pre_tool` in light mode, before it reads the ledger. `lightGuidance.allows` returns `true`. | Light mode adds no ledger read to the pre-tool path, and no failure can produce a deny (FR-06). | Relying only on `allows: true` would still work, but it pays a ledger read on every call. |
| DEC-06 | FR-07 | `handleSessionReset` keeps appending the reset line and pruning stale sessions. Its mode branch becomes `guidance.mode !== 'plan'`, which returns `resumeText` or neutral. `deadlineBootDecision` renders the boot omission only for `mode === 'plan'`. Light guidance has `resumeText: null`. | Two comparisons change, and delegated mode is unchanged. The reset line is kept because `session-zone.ts#isStale` and DEC-12 use it. | Short-circuiting before the reset line would leave stale usage visible after `/clear`. |
| DEC-07 | FR-01, FR-04, FR-10 | `init` gains `--light` and `--no-light`. Light mode is in effect for an `init` run when `--light` is passed, or when the config has `lightMode` and `--no-light` is absent. Rules:<br>• While light mode is in effect, `--snapshot-trigger` updates `lightMode.triggerZone`.<br>• `--light` with `--no-light` is a `CliArgumentError` (exit 64) naming the options.<br>• With light mode in effect, each of `--snapshot-command`, `--snapshot-path`, `--snapshot-skill`, `--resume-command`, `--create-instructions`, `--migrate-legacy`, and `--instruction-file` is a `CliArgumentError` (exit 64) naming the option.<br>• `--no-light` removes the section.<br>• An existing `delegatedSnapshot` section is kept.<br>A new `src/core/services/light-mode-merge.ts` holds the merge, and a new `src/cli/init-config-updates.ts` holds the routing, which also takes `delegatedUpdate` out of `init.ts`. | These are the FR-10 rules. `init.ts` is at 100 lines, and this extraction is absorbed. | A separate `--light-trigger` flag would duplicate `--snapshot-trigger`. |
| DEC-08 | FR-08, FR-09, NFR-03 | A new `src/core/services/support-files.ts#planSupportFiles(input, config)` owns the three non-adapter file groups.<br>• **Full mode:** the current protocol, instruction, and `.gitignore` planning, moved as is.<br>• **Light mode, protocol:** delete the file only when the previous manifest lists it as a `protocol` asset and its hash matches (`planAssetDeletions`). A modified file is kept and reported with `LIGHT_MODE_ASSET_KEPT` (warning). An unmanaged file is left untouched.<br>• **Light mode, instruction blocks:** remove the reference blocks (`planInstructionRemoval`).<br>• **Light mode, `.gitignore`:** remove the block (`planGitignoreRemoval`) only when both state snapshots report `exists: false`.<br>`buildManagedAssets` omits the protocol in light mode. | `planInstallation` is at 100 lines, and this extraction is absorbed. `file-changes.md` allows removing the `.gitignore` block only together with the state files (revised FR-09). `removal-helper.ts` resolves symlinked instruction files through `realPath` (NFR-03). | Deleting a modified protocol would destroy user edits. Removing the `.gitignore` block while a plan exists breaks the rule. |
| DEC-09 | FR-02, FR-11 | `collectProjectSnapshots` gains `{ includeState: boolean }`, default `true`. `doctor` passes `false` when the config has `lightMode`. `init` still reads the state files, because DEC-08 needs to know whether they exist. | FR-02 is met for hooks and `doctor`. `init` writes nothing to the state files, which is what FR-02 checks for it. | A stat-only probe for `init` would duplicate the snapshot path. |
| DEC-10 | FR-11, FR-12, NFR-01 | `doctor` in light mode:<br>• A new `src/core/services/project-file-checks.ts#projectFileFindings(input, config)` runs the four current checks in full mode, or the light checks.<br>• The light checks report `LIGHT_MODE_LEFTOVER` (warning, remediation `Run context-brake init --yes.`) for each instruction file with a reference block, and when the manifest lists a `protocol`. They report `DELEGATED_SNAPSHOT_INACTIVE` (`ok`) when a `delegatedSnapshot` section exists.<br>• `delegatedSnapshotFindings` returns `[]` in light mode.<br>• `checkpointMode.effective` gains `light`, `reason` gains `light_mode`, and an optional `lightMode` field is present only in light mode.<br>• The text output shows `checkpoint mode: light (trigger: <zone>)`. | This is an additive schema change, and `doctor-service.ts` stays at or under 100 lines. The `.gitignore` block is not flagged in light mode, because DEC-08 may keep it on purpose. | Always emitting `lightMode: null` would change every doctor JSON output (NFR-01). |
| DEC-11 | FR-13 | `requireRunnablePlan` checks `config.lightMode` first and throws `RUN_PLAN_NOT_RUNNABLE` (existing code and status): `context-brake run needs the full mode, but this repository uses the light mode. Run context-brake init --no-light, then create a plan with context-brake plan init --task="<name>", ${RERUN}.` | This mirrors PRD-06 DEC-10. The check precedes the plan read. | A new exit code would add surface with no user value. |
| DEC-12 | FR-14, OBJ-05, NFR-01, NFR-05 | Active sessions in `doctor`, in every mode:<br>• **Reader:** `NodeRuntimeStateReader.read()` also returns `ledgers: { harness, lines }[]`, parsed from the files it already reads, with the harness taken from the `sessions/<harness>/` directory.<br>• **Service:** the pure `src/core/services/active-sessions.ts#activeSessions(ledgers, { now, zones })` computes `lastActivityAt` as the max `at` of all lines. It keeps the ledgers whose last activity is within `ACTIVE_SESSION_WINDOW_MINUTES = 30`, sorts them by recency, and keeps at most `ACTIVE_SESSION_LIMIT = 10`.<br>• **Usage:** over `summarizeLedger`, the reading is the newer of the status line usage (`tokens`, window `statusline.windowTokens ?? lastReading.windowTokens`, zone from `classifyZone`, source `measured`) and the last tool line (its own values). It is `null` when there is no reading after the last reset.<br>• **Output:** `buildDoctorReport` adds an optional `activeSessions` only when the list is non-empty. A new `src/cli/output/doctor-sessions-text.ts` prints the section, which keeps `text.ts` at or under 100 lines. | The ledger is the only local source of per-session usage. It is pruned after 14 days and is already read by `doctor`, so it adds no new I/O kind (NFR-05). No transcript is read, and no process is probed. A process check would need per-harness PID discovery, which is not documented, so recency stands in for "running" (PRD out of scope). `now` comes from the injected clock. | Re-running `readZone` with each harness's estimation constants would recompute what the hook already stored. The stored reading is the one the agent saw. |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/core/contracts/light-mode.ts`, `zones.ts`, `configuration.ts`, `checkpoint-mode.ts` | New / modified | `lightModeSchema`, the trigger zone enum, the optional key, the `'light'` mode | DEC-01, DEC-02, DEC-03 |
| CMP-02 | `src/core/services/light-guidance.ts` | New | `lightAction(zone, section)`, `lightGuidance(section)` | DEC-04 |
| CMP-03 | `src/core/services/zone-guidance.ts` | Modified | Light-first resolution in every entry point | DEC-03 |
| CMP-04 | `brake-engine.ts`, `failure-policy.ts` | Modified | Pre-tool short-circuit, reset branch, failure neutrality | DEC-05, DEC-06 |
| CMP-05 | `src/core/services/light-mode-merge.ts`, `installation-builder.ts` | New / modified | Section merge (`keep`/`set`/`remove`) and config change preview | DEC-07 |
| CMP-06 | `src/cli/init-arguments.ts`, `src/cli/init-config-updates.ts`, `src/cli/commands/init.ts` | Modified / new | Flags, routing, and rejections | DEC-07 |
| CMP-07 | `src/core/services/support-files.ts`, `installation-service.ts`, `installation-findings.ts` | New / modified | Full or light planning of the protocol, blocks, and `.gitignore`; manifest assets | DEC-08 |
| CMP-08 | `src/cli/snapshot-helper.ts`, `src/cli/commands/doctor.ts` | Modified | Skip the state snapshots in light mode | DEC-09 |
| CMP-09 | `src/core/services/project-file-checks.ts`, `doctor-service.ts`, `delegated-diagnostics.ts`, `src/core/contracts/diagnostics.ts`, `src/cli/output/text.ts` | New / modified | Light findings, the `checkpointMode` report, the mode text line | DEC-10 |
| CMP-10 | `src/cli/commands/run-preflight.ts` | Modified | Light refusal | DEC-11 |
| CMP-11 | `runtime-state-reader.ts`, `brake-session-checks.ts` (`RuntimeStateReading`), `src/core/services/active-sessions.ts`, `report-service.ts`, `diagnostics.ts`, `src/cli/output/doctor-sessions-text.ts` | New / modified | Active-session usage in `doctor` | DEC-12 |
| CMP-12 | `README.md`, `schemas/context-brake.config.schema.json`, `schemas/doctor-report.schema.json` | Modified | Light mode section, active sessions note, regenerated schemas | DEC-01, DEC-10, DEC-12 |

### Hook event flow

1. The adapter normalizes the payload and calls the engine (CMP-04).
2. `pre_tool` returns neutral at once in light mode.
3. `post_tool` and `pre_invocation` read the ledger and zone as today, append the tool line, and apply the injection policy.
4. When the policy injects, `resolveGuidance` (CMP-03) returns `lightGuidance` (CMP-02) without I/O, and the block carries its action.
5. `session_reset` appends the reset line and returns neutral.

### `init` flow

1. CMP-06 turns the flags into the delegated and light updates.
2. `planConfigChange` (CMP-05) produces the final config.
3. `planSupportFiles` (CMP-07) plans the full or light files from that config.
4. The adapters plan their hooks as today. The manifest omits the protocol in light mode.

### `doctor` flow

1. The runtime state reader returns the session lines, blocks, errors, and ledgers.
2. `activeSessions` (CMP-11) selects the recent ledgers and derives their usage.
3. The report adds `activeSessions` when the list is non-empty.
4. The text renderer prints the list.

## Contracts and data

### Configuration: `lightMode` (optional)

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `triggerZone` | `'YELLOW' \| 'RED'` | no, default `'RED'` | enum; no other field is allowed (strict object) |

```json
"lightMode": { "triggerZone": "RED" }
```

### Agent-facing text

See DEC-04. Example at `RED`:

`[ContextBrake v2] turn=42 usage=67% tokens=670000/1000000 source=measured zone=RED action=save your snapshot or checkpoint now, then end reply with [REQUEST_SESSION_RESET]`

Light mode produces no deny, boot, or resume text.

### `doctor --json`

- `checkpointMode.effective` is `'plan' | 'delegated' | 'light'`, and `checkpointMode.reason` adds `'light_mode'`.
- `checkpointMode.lightMode` is optional and present only in light mode.
- `activeSessions` is optional and present only when non-empty. It is an array, sorted by `lastActivityAt` descending, with at most 10 items, each of this shape:

  ```json
  { "harness": "claude-code", "sessionId": "abc", "lastActivityAt": "2026-09-26T12:00:00.000Z",
    "usage": { "percentage": 67, "usedTokens": 670000, "windowTokens": 1000000, "zone": "RED", "source": "measured", "at": "2026-09-26T11:59:40.000Z" } }
  ```

  `sessionId` is `null` when the ledger has no session line, which happens with bridge-only lines. `usage` is `null` when there is no reading after the last reset.
- `schemaVersion` stays `1`.
- New finding codes: `LIGHT_MODE_LEFTOVER` (warning), `LIGHT_MODE_ASSET_KEPT` (warning, from `init`), `DELEGATED_SNAPSHOT_INACTIVE` (ok).

### `doctor` text

The mode line is printed only in light mode. The session section is printed only when the list is non-empty:

```
  - checkpoint mode: light (trigger: RED)
  - active sessions:
    * claude-code abc: 67% (670000/1000000, RED, measured), last activity 2 min ago
    * codex-cli def: usage unknown since last reset, last activity 12 min ago
```

### Install manifest

In light mode, no asset of kind `protocol` is listed.

## Integrations and interfaces

- **Hooks and plugins (all eight harnesses):** no payload or registration change.
- **CLI:**
  - `init`: DEC-07 and DEC-08.
  - `doctor`: DEC-09, DEC-10, and DEC-12.
  - `run`: DEC-11.
  - `wrap`: shows the light action.
  - `remove`: unchanged.
- **Failure policy:** DEC-05 and DEC-06. The deadline is unchanged.

## Errors, security, and recovery

- **Errors and edges:**
  - An invalid `lightMode` value, including an unknown field such as `snapshotCommand`, fails config parsing with the field path in `init` and `doctor`.
  - With an unparseable config, the runtime cannot know it is in light mode, so the failure policy uses the plan-mode fallback. It can deny only when the ledger's last zone is `CRITICAL`, and `doctor` reports the config error. This risk is accepted.
  - A corrupt ledger line is skipped by `parseLedgerLines`, as today.
  - A ledger with unparseable timestamps is left out of `activeSessions`.
- **User files:**
  - `init` removes only marker blocks and a managed protocol, and only when the protocol is unmodified.
  - The plan, checkpoint, and snapshot files are never deleted.
  - `init` changes go through the change plan, `--dry-run`, and confirmation.
  - `doctor` writes nothing.
- **Idempotency:** a second `init --light` plans no change.
- **Rollback:** `init --no-light` restores the full install.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| Config contract and merge | — | Schema and merge unit tests; `npm run schemas:check` |
| Runtime behavior | Config | Unit tests per zone and event; hook-process integration test |
| `init` flags and install planning | Config | `init` integration tests, including symlinks |
| `doctor` light mode | Config | `doctor` integration tests and JSON schema |
| `doctor` active sessions | `doctor` light mode (same files) | Unit tests for the service; `doctor` integration test with fixture ledgers |
| End-to-end and README | All | e2e with the built CLI; README example test |

## Test approach

- **Profile:**
  - Node.js ≥ 20, ESM, TypeScript per `tsconfig.json` and `tsconfig.check.json`, and Vitest.
  - Commands from `AGENTS.md`: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`.
  - Runtime surfaces:
    - the hook, run as one process per event (Claude Code, Codex, Cursor, Copilot, Antigravity);
    - the in-process plugins (OpenCode, Pi, Oh-My-Pi), which go through the same engine;
    - the CLI commands `init`, `doctor`, `run`, and `wrap`.
- **End-to-end:** the built CLI runs against temporary fixture repositories that contain `CLAUDE.md`, `AGENTS.md`, and `.claude/`:
  1. `init --light --yes`, then check the inventory.
  2. Feed the Claude Code hook simulated usage up to `YELLOW`, `RED`, and `CRITICAL`, then send `SessionStart`.
  3. `doctor --json`, including `activeSessions` for the session just driven.
  4. Full install, then `init --light --yes`, then `init --no-light --yes`.
- **Platforms:** the CI matrix covers Linux, macOS, and Windows. The symlinked instruction case runs where links can be created.
- **Prerequisites:** `npm install --ignore-scripts`. Rebuild `dist/` before e2e.
- **Manual acceptance (optional, owner: user):**
  1. Switch this repository to `init --light` and drive an SDD session to `RED`. Confirm the generic action and that no tool is blocked in `CRITICAL`.
  2. With a session open, run `context-brake doctor` and compare its usage with the status line.
- **CLI QA:** skipped by the HIL 2 answer. TC-13 runs the built CLI end to end.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-01, FR-04, NFR-01 | unit | `lightMode` parse: absent, `{}`, `YELLOW`, invalid trigger, and an extra `snapshotCommand` field | Valid input parses. Each invalid input fails with its `lightMode.<field>` path. `DEFAULT_CONFIG` serializes unchanged. | `tests/unit/light-mode-config.test.ts` |
| TC-02 | FR-03, FR-05, NFR-04 | unit | `lightAction` for each zone and trigger; worst-case rendered block | Exact DEC-04 texts. The pattern is `[ContextBrake v2] … action=…`. No forbidden substring. At most 60 `o200k_base` tokens and 220 characters. | `tests/unit/light-guidance.test.ts` |
| TC-03 | FR-01, FR-02, NFR-02 | unit | `resolveCheckpointMode` and `resolveGuidance` with light mode, a present plan, and a delegated section, using counting port fakes | Returns `light`, with 0 port calls | `tests/unit/light-guidance.test.ts` |
| TC-04 | FR-06, FR-07, NFR-02 | unit | Engine in light mode: `pre_tool` in `CRITICAL` for every tool category; `session_reset` with a present plan and a delegated `resumeCommand` | Neutral in every case. No block-log append. `pre_tool` does not read the ledger. The reset line is appended. | `tests/unit/brake-engine-light.test.ts` |
| TC-05 | FR-06, FR-07 | unit | Failure policy in light mode: `pre_tool` with an unreadable ledger; `session_reset` past the deadline | Neutral | `tests/unit/failure-policy-light.test.ts` |
| TC-06 | FR-01, FR-04, FR-10 | unit | `light-mode-merge`: set with and without a trigger; keep; remove; invalid trigger; `--light` together with `--no-light` | The expected update, or an error that names the field or option | `tests/unit/light-mode-merge.test.ts` |
| TC-07 | FR-01, FR-10 | unit | `parseInit` and routing: each forbidden option, with `--light` and with an existing section; `--snapshot-trigger` routed to `lightMode` | `CliArgumentError` naming the option; correct updates | `tests/unit/init-light-arguments.test.ts` |
| TC-08 | FR-08, FR-09, NFR-01, NFR-03 | integration | `runInit` on temporary repositories:<br>• fresh `--light`: inventory and `--dry-run`;<br>• full → light, with and without `task_plan.json`;<br>• modified managed protocol, and an unmanaged protocol;<br>• symlinked `AGENTS.md`;<br>• `--no-light`;<br>• a second run. | Only the OBJ-01 files change. Blocks are removed and user bytes are kept. The `.gitignore` block is kept exactly when a state file exists. A modified protocol is kept with `LIGHT_MODE_ASSET_KEPT`. The symlink survives. A second run changes nothing. `--no-light` equals a fresh full install. | `tests/integration/init-light-mode.test.ts` |
| TC-09 | FR-02, FR-11, FR-12, NFR-01 | integration | `doctor` in light mode:<br>• a clean install;<br>• a leftover instruction block;<br>• a leftover protocol in the manifest;<br>• a delegated section;<br>• an invalid `task_plan.json` present.<br>Also `doctor --json` without light mode. | Healthy; `LIGHT_MODE_LEFTOVER`; `DELEGATED_SNAPSHOT_INACTIVE`; no state-file finding; `checkpointMode.lightMode` only in light mode. Without light mode, the JSON is unchanged. | `tests/integration/doctor-light-mode.test.ts` |
| TC-10 | FR-03, FR-05, FR-06, FR-07, FR-13 | integration | Claude Code hook process and the OpenCode in-process plugin, in light mode:<br>• `SessionStart` with a present plan;<br>• `PostToolUse` at `RED`;<br>• `PreToolUse` in `CRITICAL` writing any path;<br>• `wrap`. | No boot output; a light block; allow; the light action in `wrap` | `tests/integration/runtime-light-mode.test.ts` |
| TC-11 | FR-13 | integration | `run` in light mode, with and without `task_plan.json` | `RUN_PLAN_NOT_RUNNABLE` with the DEC-11 message | `tests/integration/run-light-mode.test.ts` |
| TC-12 | OBJ-04, NFR-01 | unit/integration | The existing suites | Pass unchanged | `npm test` |
| TC-13 | OBJ-01, OBJ-02, OBJ-03, OBJ-05, FR-09 | end-to-end | Built CLI: `init --light`; hook up to `CRITICAL`; `SessionStart`; `doctor --json`; full → light → full | Exact inventory; light blocks; no deny; no boot; `effective: light`; `activeSessions[0]` matches the last hook reading; the full install is restored | `tests/e2e/e2e-light-mode.test.ts` |
| TC-14 | FR-08 | unit | The README light config example parses | Passes | `tests/unit/readme-light-example.test.ts` |
| TC-15 | FR-12, FR-14, DEC-01 | unit | Schemas are current | `npm run schemas:check` passes | `npm run schemas:check` |
| TC-16 | FR-14, NFR-05 | unit | `activeSessions` with a fake clock:<br>• two recent ledgers and one 31 minutes old;<br>• 12 recent ledgers;<br>• status line newer than the tool line, and the reverse;<br>• a reset with no later reading;<br>• no session line;<br>• an unparseable timestamp. | Only recent ledgers, newest first, at most 10. The newer reading wins, with a zone from `classifyZone` for status line readings. `usage: null` after the reset. `sessionId: null` without a session line. The unparseable ledger is excluded. | `tests/unit/active-sessions.test.ts` |
| TC-17 | FR-14, NFR-01 | integration | `doctor` with fixture ledgers written relative to the current time, then without recent ledgers | The text section and `activeSessions` JSON appear as specified. Without recent ledgers, the text and JSON are identical to the current output. | `tests/integration/doctor-active-sessions.test.ts` |

## Quality profile

A blocking hit prevents task completion and rejects the review. A reservation becomes an optional improvement and counts toward escalation.

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `"${RG[@]}" ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | — |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `"${RG[@]}" '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-03 | Empty `catch` or `.catch(() => {})` | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | — |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-05 | stdout writes on hook paths | blocking | `"${RG[@]}" 'console\.log\|process\.stdout\.write' "${hook_files[@]}"` | — |
| QA-06 | Synchronous file API in in-process code | blocking | `"${RG[@]}" '\b(readFileSync\|writeFileSync\|appendFileSync\|existsSync\|spawnSync)\b' "${in_process_files[@]}"` | — |
| QA-07 | Clock or randomness in `core` | reservation | `"${RG[@]}" 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' "${core_files[@]}"` (`active-sessions.ts` takes `now` as input) | — |
| QA-08 | 4+ parameters in one declaration | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"` | — |
| QA-09 | File above 100 lines | reservation | `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | — |

- Verification scope: the TypeScript files in each task diff.
  - `core_files`: the subset under `src/core/`.
  - `hook_files`: `brake-engine.ts`, `failure-policy.ts`, `zone-guidance.ts`, and `light-guidance.ts`.
  - `in_process_files`: `zone-guidance.ts` and `light-guidance.ts`.
- Escalation trigger: 8+ reservations, a touched file above 200 lines, or duplication in 3+ places.

### Terrain baseline

Measured at `c3fb6a8`. No target file has a pre-existing hit for QA-01 to QA-08.

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/core/contracts/configuration.ts` | 79 | 10 | <4 | 0 | exports ≥ 10 (structural) | absorbed in `DEC-02`: no new exported declaration |
| `src/core/contracts/zones.ts` | 17 | 6 | <4 | 0 | none | — |
| `src/core/contracts/checkpoint-mode.ts` | 25 | 5 | <4 | 0 | none | — |
| `src/core/contracts/diagnostics.ts` | 64 | 16 | <4 | 0 | exports ≥ 10 (structural) | recorded: fields, not exports |
| `src/core/services/zone-guidance.ts` | 60 | 6 | <4 | 0 | none | — |
| `src/core/services/brake-engine.ts` | 96 | 7 | <4 | 5 | none | recorded: two one-line changes; above 100 lines, move `readSummary` and `ensureSessionLine` to `session-counters.ts` |
| `src/core/services/failure-policy.ts` | 95 | 11 | <4 | 0 | exports ≥ 10 (structural) | recorded: one guard and one comparison, no export |
| `src/core/services/installation-service.ts` | 100 | 3 | <4 | 0 | at the limit | absorbed in `DEC-08` |
| `src/core/services/installation-findings.ts` | 27 | 2 | <4 | 0 | none | — |
| `src/core/services/installation-builder.ts` | 67 | 3 | <4 | 0 | none | — |
| `src/core/services/doctor-service.ts` | 100 | 2 | <4 | 0 | at the limit | absorbed in `DEC-10` |
| `src/core/services/delegated-diagnostics.ts` | 34 | 2 | <4 | 0 | none | — |
| `src/core/services/report-service.ts` | 96 | 7 | <4 | 0 | none | recorded: one spread line |
| `src/core/services/brake-session-checks.ts` | 70 | 7 | <4 | 0 | none | recorded: one type field |
| `src/infrastructure/runtime/runtime-state-reader.ts` | 83 | 1 | <4 | 0 | none | — |
| `src/cli/init-arguments.ts` | 62 | 3 | <4 | 0 | none | — |
| `src/cli/commands/init.ts` | 100 | 4 | <4 | 0 | at the limit | absorbed in `DEC-07` |
| `src/cli/commands/doctor.ts` | 59 | 1 | <4 | 0 | none | — |
| `src/cli/snapshot-helper.ts` | 35 | 1 | <4 | 0 | none | — |
| `src/cli/output/text.ts` | 95 | 7 | <4 | 0 | none | absorbed in `DEC-12` (`doctor-sessions-text.ts`) |
| `src/cli/commands/run-preflight.ts` | 47 | 4 | <4 | 0 | none | — |

- Preparatory refactoring: not recommended. The saturated modules get no new export. The files at or near 100 lines are relieved by local extractions inside this feature (`DEC-07`, `DEC-08`, `DEC-10`, `DEC-12`), and no public contract changes.

## Observability and rollout

- **Signals:**
  - `doctor` shows the mode, the leftovers, and the active sessions with their usage.
  - The ledger keeps recording tool, session, reset, and status line lines.
  - Light mode writes no block-log records.
- **Migration:** none.
- **Rollout and rollback:** ship in a minor release. To roll back light mode, run `init --no-light`. The active-session list is additive.

## Risks and open items

- **Risk (low probability, medium impact):** with light mode and an unparseable config, the failure policy can deny a tool in `CRITICAL`. Mitigation: `init` never writes an invalid config, and `doctor` reports the error.
- **Risk (medium probability, low impact):** "active" is a heuristic. A session idle for more than 30 minutes is hidden, and a session closed less than 30 minutes ago is still shown. The text and README say "last activity".
- **Risk (low, low):** agents outside SDD receive the action without a written protocol (PD-04).
- **Open item:** the HIL 2 re-approval of the revised PRD (PD-03 and PD-05, FR-14) and of this TechSpec.

## Relevant files

- Modify:
  - `src/core/contracts/configuration.ts`, `zones.ts`, `checkpoint-mode.ts`, `diagnostics.ts`
  - `src/core/services/zone-guidance.ts`, `brake-engine.ts`, `failure-policy.ts`, `installation-service.ts`, `installation-findings.ts`, `installation-builder.ts`, `doctor-service.ts`, `delegated-diagnostics.ts`, `report-service.ts`, `brake-session-checks.ts`
  - `src/infrastructure/runtime/runtime-state-reader.ts`
  - `src/cli/init-arguments.ts`, `src/cli/commands/init.ts`, `src/cli/commands/doctor.ts`, `src/cli/snapshot-helper.ts`, `src/cli/output/text.ts`, `src/cli/commands/run-preflight.ts`
  - `schemas/context-brake.config.schema.json`, `schemas/doctor-report.schema.json`, `README.md`
- Create:
  - `src/core/contracts/light-mode.ts`
  - `src/core/services/light-guidance.ts`, `light-mode-merge.ts`, `support-files.ts`, `project-file-checks.ts`, `active-sessions.ts`
  - `src/cli/init-config-updates.ts`, `src/cli/output/doctor-sessions-text.ts`
  - the tests named in the Test approach
