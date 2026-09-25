# TechSpec — Modo de snapshot delegado

## Sources and traceability

- PRD: `tasks/prd-06-modo-snapshot-delegado/prd.md` (approved in `DEC-HIL-01`; PD-01 is automatic activation, PD-03 keeps the brake with an allowlist).
- Rules: `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md` (Claude Code tool mapping), `file-changes.md` (`init` config and protocol), `cli-output.md` (`init`, `doctor`, `run` messages).
- Research: `docs/research/harness-integrations.md`, Claude Code section (PreToolUse payload, `tool_name` and `tool_input`). It says nothing about skill invocation; see the gap in `DEC-07`.
- Evidence in existing code:
  - `src/core/services/brake-engine.ts`: `handlePostTool` injects telemetry without reading the plan; `handlePreTool` builds the CRITICAL allowlist.
  - `src/core/services/zone-actions.ts`: `ZONE_ACTIONS`, `zoneActionClause`.
  - `src/core/services/block-message.ts`, `brake-allowlist.ts`, `failure-policy.ts#resolveFailure`.
  - `src/core/services/boot-policy.ts#decideBoot`: returns `none` when the plan is missing.
  - `src/core/services/protocol-service.ts#renderProtocol`, `installation-builder.ts#planConfigChange`.
  - `src/infrastructure/runtime/runtime-composition.ts#createRuntimePorts`, `src/infrastructure/runner/wrap-telemetry.ts`.
  - `src/infrastructure/harnesses/claude-code/runtime.ts`: tool mapping; a tool that is neither `Bash`, `Read` nor a write tool becomes `other`.
  - `src/cli/commands/run-preflight.ts#requireRunnablePlan`.

## Solution summary

A new optional top-level config section, `delegatedSnapshot`, holds the snapshot command, the trigger zone, the optional resume command, the allowed path patterns, and the allowed skills. Without that section, every code path is exactly what runs today. With it, a new core service resolves an **effective mode** per event: `delegated` when the configured plan file does not exist, otherwise `plan`. A **zone guidance** value built from that mode supplies the three mode-dependent pieces the engine uses today as constants: the action text per zone, the CRITICAL allowlist, and the deny message. Session reset uses the mode as well: resume text in delegated mode, the PRD-03 boot in plan mode.

The brake engine, the failure policy, and `wrap` ask for the guidance only when they are about to emit something: a telemetry block, a deny decision, or a session-start injection. That keeps the file check off the neutral path (NFR-03). Configuration-time surfaces (`init`, protocol, `doctor`, `run`) read the section directly. The harness adapter change is limited to Claude Code, whose `Skill` tool is mapped to a new `skill` tool category so the allowlist can recognize the configured command.

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-01, NFR-01 | Optional top-level `delegatedSnapshot` object in `configurationSchema`, with no default; `schemaVersion` stays `1`. | The addition is optional, so existing files parse unchanged and `planConfigChange` keeps writing configs without the key, which gives byte-identical output (NFR-01). | A `stateStorage.mode` field was rejected at HIL 1 (PD-01). Putting the fields under `stateStorage` would mix plan storage with delegated settings. |
| DEC-02 | FR-01, NFR-03 | The effective mode is resolved by a core function over a `PlanPresence` port (`exists(): Promise<boolean>`). With no section, the result is `plan` and the port is never called. With a section, the port is called at most once per event and only on emitting paths. An `ENOENT` means `delegated`; any other stat error means `plan`. | PD-01. A stat error falls back to today's behavior. An invalid but present plan keeps `plan` mode, so the PRD-03 repair boot still fires. | Caching the mode per session would miss plan creation mid-session (FR-01 says "no evento seguinte"). |
| DEC-03 | FR-03, FR-04, FR-05, NFR-05 | A `ZoneGuidance` type (`actionFor(zone)`, `allowlist`, `denyMessage(input)`) is built by `planGuidance(config)` and `delegatedGuidance(config)`. `renderTelemetryBlock` receives the action text instead of reading `ZONE_ACTIONS`. The delegated action is `run "<command>", then end reply with [REQUEST_SESSION_RESET]` for zones at or above the trigger zone. Below it, the action is the existing compact text. | Keeps the block format at v1 with the same fields (FR-05). With a 200-character command, the block stays under 400 characters (NFR-05, about 330). | Adding a new field to the block would require v2 of the block format. |
| DEC-04 | FR-06, NFR-02, NFR-04 | The CRITICAL allowlist in delegated mode is: `file_read` and `file_write` whose every path matches an `allowedPaths` pattern; `skill` calls whose skill name is in `allowedSkills`, or equals the first token of `snapshotCommand` or `resumeCommand` without a leading `/`; `git status`, `git add` and `git commit`; and `brake.additionalAllowedCommands`. There is no validation-command exception. Patterns use a small pure matcher in core with `*` (one segment), `**` (any segments) and `?`, compared against the tool paths that `tool-path-normalizer` already makes repo-relative with `/`. | No glob dependency is needed, since the `**`/`*`/`?` subset is enough. Normalized paths make the comparison identical on Windows (NFR-04). The pattern schema reuses the canonical relative path rule plus wildcards, which rejects `..` and absolute paths (NFR-02). | Node's `path.matchesGlob` is experimental on Node 20. Adding `picomatch` would add a dependency for a simple subset. |
| DEC-05 | FR-07 | The delegated deny message reads `[ContextBrake v1] BLOCKED tool=… zone=CRITICAL … reason=critical_ceiling. Allowed: read or write <patterns>, skill <names>, git status, git add, git commit[, extras]. Run "<command>", then end reply with [REQUEST_SESSION_RESET].` In the failure policy, when the section is set and the mode cannot be read, the allowlist is the union of both modes and the message is the delegated one. | The prefix and fields match `block-message.ts`, so log parsers keep working. Using the union avoids blocking a snapshot because of an integration failure. | Always using the plan message when the mode is unknown would contradict OBJ-01. |
| DEC-06 | FR-08 | In delegated mode, `session_reset` returns `{ kind: 'context', block: '[ContextBrake boot v1] Run "<resumeCommand>" before continuing.' }` when `resumeCommand` is set, and `neutral` otherwise. The existing harness capability and compaction gates in `handleSessionReset` apply first, unchanged. | Reuses the boot channel and the PRD-03 harness matrix. | Injecting the snapshot command itself at boot would be wrong: the new session has nothing to save. |
| DEC-07 | FR-06 | Only the Claude Code adapter maps a tool to the new `skill` category: `tool_name === 'Skill'`, with the name taken from `tool_input.skill`. Before implementing, the task re-checks the Claude Code hooks and tools docs and adds a subsection to `docs/research/harness-integrations.md`. The other harnesses keep mapping skills or commands to `other`. `doctor` reports that limitation for active harnesses without the mapping when the section is set. | `harness-adapters.md` requires documented payloads. Claude Code is the only harness whose skill invocation arrives as a tool call we can name today. Pi and Codex expand skills into the prompt, and OpenCode's `skill` tool is not documented in the research file. | Mapping every harness now would rest on undocumented payloads. The gap is recorded, and the path allowlist still lets the snapshot be written. |
| DEC-08 | FR-09, FR-10 | `init` gains `--snapshot-command`, `--snapshot-trigger`, `--resume-command`, `--snapshot-path` (repeatable), `--snapshot-skill` (repeatable) and `--no-delegated-snapshot`. `planConfigChange` merges them into the section: a flag replaces that field, `--no-delegated-snapshot` removes the whole key, and no flag keeps the current value. With the section set, `renderProtocol` appends a `## Delegated snapshot` section. Without it, the output is unchanged. The instruction reference block and `.gitignore` block stay the same in both modes. | The reference block already applies "when the plan exists or a telemetry block appears", which covers both modes. The plan entries in `.gitignore` are harmless without a plan and keep switching modes reversible (FR-10). | Rewriting the reference block per mode would churn every user's instruction files for no behavioral gain. |
| DEC-09 | FR-11, FR-13 | `doctor` adds a `checkpointMode` object to the report: `{ effective: 'plan' | 'delegated', reason: 'no_section' | 'plan_present' | 'plan_missing', delegatedSnapshot: <section> | null }`. It also adds the findings `DELEGATED_SNAPSHOT_NO_PATHS` (warning: no `allowedPaths`) and `DELEGATED_SKILL_UNRECOGNIZED` (info per active harness without skill mapping). An invalid section already fails config parsing with the field path. The existing protocol currency check reports an outdated protocol. | This is an additive field in `doctor-report.schema.json`, regenerated by `npm run schemas:generate`. `checkStateFiles` already skips missing files, so no plan warning appears today. | Doctor text only, without a JSON field, would fail FR-13. |
| DEC-10 | FR-12 | `requireRunnablePlan` keeps `RUN_PLAN_NOT_RUNNABLE` and its existing exit code. When the section is set and the plan is missing, the message becomes: `No plan exists at <file>; context-brake run needs a plan and does not support the delegated snapshot mode. Run context-brake plan init --task="<name>", …`. `wrap` resolves the mode through the same guidance. | The PRD's "código de uso" maps to the runner's existing non-runnable code, so we avoid a new exit code for the same condition. | A dedicated error code would add surface for no extra user value. |
| DEC-11 | NFR-03 | `brake-engine.ts` receives a `readGuidance: () => Promise<ZoneGuidance>` option and calls it only after it decides to emit. The mode and guidance logic lives in a new `zone-guidance.ts`, which keeps `brake-engine.ts` under 100 lines. | Absorbed preparation: a local extraction, no public contract change. | — |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/core/contracts/configuration.ts` | Modified | `delegatedSnapshotSchema` (`snapshotCommand`, `triggerZone`, `resumeCommand?`, `allowedPaths`, `allowedSkills`) and the optional key | DEC-01, DEC-04 |
| CMP-02 | `src/core/services/path-pattern.ts` | New | Pure `matchesPathPattern(path, pattern)` for `*`, `**`, `?` | DEC-04 |
| CMP-03 | `src/core/services/zone-guidance.ts` | New | `resolveCheckpointMode(config, presence)`, `planGuidance`, `delegatedGuidance`, `resolveGuidance` | DEC-02, DEC-03, DEC-05 |
| CMP-04 | `telemetry-block.ts`, `block-message.ts`, `brake-allowlist.ts` | Modified | Take the action text or allowlist as input; the plan-mode output stays identical | DEC-03, DEC-04, DEC-05 |
| CMP-05 | `brake-engine.ts`, `failure-policy.ts`, `session-zone.ts` | Modified | Use the guidance on emitting paths; delegated resume on `session_reset` | DEC-06, DEC-11 |
| CMP-06 | `src/core/contracts/runtime.ts` + `harnesses/claude-code/runtime.ts` | Modified | `ToolCategory` gains `'skill'`; `ToolCall` gains optional `skill?: string`; `Skill` mapping | DEC-07 |
| CMP-07 | `src/infrastructure/runtime/plan-presence.ts`, `runtime-composition.ts`, `runner/wrap-telemetry.ts` | New / modified | `NodePlanPresence` (stat), wiring of `readGuidance` | DEC-02 |
| CMP-08 | `protocol-service.ts`, `installation-builder.ts`, `argument-parser.ts`, `commands/init.ts` | Modified | CLI flags, config merge, and the protocol section | DEC-08 |
| CMP-09 | `src/core/services/delegated-diagnostics.ts`, `doctor-service.ts`, `contracts/diagnostics.ts`, `commands/doctor.ts` | New / modified | `checkpointMode` report field and findings | DEC-09 |
| CMP-10 | `src/cli/commands/run-preflight.ts` | Modified | Delegated hint in the missing-plan error | DEC-10 |
| CMP-11 | `README.md`, `docs/research/harness-integrations.md`, `schemas/*.json` | Modified | Config example, Claude Code `Skill` payload, regenerated schemas | DEC-07, DEC-09 |

Flow per hook event: the harness adapter normalizes the payload (CMP-06) and hands off to the engine (CMP-05). The engine classifies the zone as today. It returns neutral early wherever it does now. Before it emits, it calls `readGuidance()` (CMP-07 → CMP-03), which stats the plan file only when the section exists. It then renders the block, the deny message, or the resume text with that guidance (CMP-04).

## Contracts and data

### Configuration: `delegatedSnapshot` (optional)

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `snapshotCommand` | string | yes | 1–200 chars, no leading or trailing whitespace, no `\r` or `\n` |
| `triggerZone` | `'YELLOW' \| 'RED'` | no, default `'RED'` | enum |
| `resumeCommand` | string | no | same rule as `snapshotCommand` |
| `allowedPaths` | string[] | no, default `[]` | at most 20 entries, unique; each is a canonical repo-relative POSIX pattern (no leading `/`, no drive letter, no `\`, no `.` or `..` segment); wildcards `*`, `**`, `?` |
| `allowedSkills` | string[] | no, default `[]` | at most 20 entries, unique, matches `^[A-Za-z0-9][A-Za-z0-9:._-]*$` |

Example:

```json
"delegatedSnapshot": { "snapshotCommand": "/sdd-snapshot", "triggerZone": "RED", "resumeCommand": "/sdd-orchestrate-flow", "allowedPaths": ["tasks/**/context-snapshot.md", "tasks/**/checkpoint.json"], "allowedSkills": [] }
```

Derived skill names: the first whitespace-separated token of `snapshotCommand` or `resumeCommand`, when it starts with `/`, is added to the allowed skills without the `/`. For example, `/sdd-snapshot now` allows `sdd-snapshot`.

### Agent-facing text

- The telemetry block `action`, in delegated mode at or above the trigger zone, is `run "<snapshotCommand>", then end reply with [REQUEST_SESSION_RESET]`. Below the trigger zone, the action is the current compact text.
- Deny message: see DEC-05.
- Resume: `[ContextBrake boot v1] Run "<resumeCommand>" before continuing.`
- Protocol `## Delegated snapshot` section, only when the section is configured. It explains that when `<planFile>` does not exist, the RED and CRITICAL actions become "run `<command>`, then end the response with `[REQUEST_SESSION_RESET]`" starting at `<triggerZone>`. It lists what CRITICAL allows in that mode and says to run `<resumeCommand>` after `/clear` or `/new` when that command is set.

### `doctor --json`

`checkpointMode` is added as a top-level field (DEC-09). The `schemaVersion` stays `1`, and the field is additive.

### Runtime contract

`ToolCategory` = `'file_read' | 'file_write' | 'shell' | 'skill' | 'other'`. `ToolCall.skill?: string` is set only for `skill`.

## Integrations and interfaces

- **Claude Code PreToolUse and PostToolUse:** `tool_name: "Skill"`, `tool_input.skill: string`. This maps to `{ category: 'skill', skill, paths: [], command: null }`. The fixture is derived from vendor documentation re-checked in the task. If the docs disagree, the task records the difference in the research file and follows the docs.
- **Other harnesses:** there is no adapter change. When the section is set, `doctor` lists them under `DELEGATED_SKILL_UNRECOGNIZED`.
- **CLI:**
  - `init`: new flags from DEC-08. Invalid values exit with `invalidArguments` (64), using the existing `CliArgumentError` path.
  - `doctor`: the new field and findings.
  - `run`: the message from DEC-10.
  - `wrap`: its action follows the guidance.
- **Failure policy:** the mode is read tolerantly. If the read fails with the section set, the union allowlist and the delegated message apply (DEC-05). The internal deadline stays the same.

## Errors, security, and recovery

- **Errors and edges:**
  - A plan that is present but invalid stays in `plan` mode and gets the existing repair boot.
  - A plan created or deleted mid-session changes the mode on the next emitting event.
  - An empty `allowedPaths` blocks all file access in CRITICAL, and `doctor` warns about it.
  - A stat error other than `ENOENT` resolves to `plan`.
- **User files and sensitive data:**
  - ContextBrake never executes the command text (NFR-02); it only embeds it in text sent to the agent.
  - Patterns cannot escape the repository.
  - `init` writes the config through the existing change plan, preview, and confirmation (`file-changes.md`).
- **Concurrency:** the mode read is stateless per event, so there is nothing to lock.
- **Rollback:** `init --no-delegated-snapshot`, or deleting the key, restores today's behavior byte for byte.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| Config contract and pattern matcher | — | Schema tests; `npm run schemas:check` after regeneration |
| Core guidance and engine wiring | Config | Unit tests for block, deny, resume, and failure in both modes |
| Runtime wiring and Claude Code `Skill` mapping | Core | Integration tests with the hook process and fixtures |
| CLI (`init`, protocol, `doctor`, `run`) | Config (and core for protocol text) | Integration tests for `init` and `doctor` |
| End-to-end and docs | All | e2e with the built CLI; README example test |

## Test approach

- **Profile:**
  - Node.js ≥ 20, ESM, TypeScript per `tsconfig.json` / `tsconfig.check.json`, Vitest.
  - Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`.
  - Runtime surfaces: the hook run as one process per event (Claude Code and the other process harnesses), in-process plugins (OpenCode, Pi, Oh-My-Pi), which use the same engine, and CLI commands.
- **End-to-end:** the built CLI against temporary fixture repositories:
  - `init --snapshot-command … --snapshot-path … --yes`, then the Claude Code hook fed with simulated usage through the existing e2e simulated-usage helpers;
  - `doctor --json`;
  - removing the section with `init --no-delegated-snapshot`.
- **Platforms:** the CI matrix already runs Linux, macOS, and Windows. The pattern matcher and path normalization get explicit tests for Windows backslash inputs.
- **Prerequisites:** none beyond `npm install --ignore-scripts`.
- **Manual acceptance (optional, owner: user):** in Claude Code with a real skill configured, drive a session to RED and confirm that the agent invokes the skill and the `Skill` call is allowed in CRITICAL.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-01, FR-02, NFR-01, NFR-02 | unit | Config parse with and without the section; invalid command, pattern, and skill values | Valid inputs parse; each invalid one fails with its field path; the default config serializes unchanged | `tests/unit/configuration.test.ts` |
| TC-02 | FR-06, NFR-04 | unit | Pattern matcher with `*`, `**`, `?`, and non-matching and traversal cases | Matches as specified | `tests/unit/path-pattern.test.ts` |
| TC-03 | FR-01, FR-03, FR-04, FR-05, NFR-05 | unit | Mode resolution plus telemetry action per zone, for both trigger zones | Delegated text only at or above the trigger; v1 field pattern; length under 400 | `tests/unit/zone-guidance.test.ts` |
| TC-04 | FR-06, FR-07 | unit | Pre-tool in CRITICAL with the delegated allowlist | Allowed path, skill, and git pass; others are denied with the delegated message and no `task_plan` | `tests/unit/brake-engine-delegated.test.ts` |
| TC-05 | FR-08 | unit | `session_reset` in delegated mode with and without `resumeCommand`, and plan mode unchanged | Resume block, neutral, and the existing boot | `tests/unit/brake-engine-delegated.test.ts` |
| TC-06 | NFR-01, OBJ-04 | unit/integration | Existing suites with no section | Pass unchanged | `npm test` |
| TC-07 | NFR-03 | unit | Guidance reader call count on neutral and emitting paths | 0 calls when neutral or when there is no section; at most 1 per emitting event | `tests/unit/brake-engine-delegated.test.ts` |
| TC-08 | FR-06, DEC-05 | unit | Failure policy with the section set and an unreadable mode | Union allowlist; delegated message | `tests/unit/failure-policy.test.ts` |
| TC-09 | FR-06, DEC-07 | integration | Claude Code hook process with a `Skill` fixture in CRITICAL | Allowed when configured, denied otherwise | `tests/integration/runtime-delegated-snapshot.test.ts` |
| TC-10 | FR-01, FR-12 | integration | Plan file created and deleted between events; `wrap` action | Mode flips on the next event; `wrap` shows the delegated action | `tests/integration/runtime-delegated-snapshot.test.ts`, `wrap-command.test.ts` |
| TC-11 | FR-09, FR-10 | integration | `init` flags add, change, and remove the section; protocol section; user content preserved | Expected diffs; `task_plan.json` kept | `tests/integration/init-delegated-snapshot.test.ts` |
| TC-12 | FR-11, FR-13 | integration | `doctor` with the section and no plan, with no paths, and with an outdated protocol | Healthy, warning, or protocol drift; `checkpointMode` in JSON | `tests/integration/doctor-delegated-snapshot.test.ts` |
| TC-13 | FR-12 | integration | `run` with the section and no plan | `RUN_PLAN_NOT_RUNNABLE` with the delegated hint | `tests/integration/run-command-preflight.test.ts` |
| TC-14 | OBJ-01, OBJ-02, OBJ-03 | end-to-end | Built CLI: `init` with the section, hook to RED and CRITICAL, `doctor --json` | Blocks cite the command and never the plan; allowed write passes; denied write blocks | `tests/e2e/e2e-delegated-snapshot.test.ts` |
| TC-15 | FR-09 | unit | README config example parses | Passes | `tests/unit/readme-config-example.test.ts` |

## Quality profile

A blocking hit prevents task completion and rejects the review. A reservation becomes an optional improvement and counts toward escalation.

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `"${RG[@]}" ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | — |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `"${RG[@]}" '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-03 | Empty `catch` or `.catch(() => {})` | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | — |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-05 | Synchronous file API in in-process code | blocking | `"${RG[@]}" '\b(readFileSync\|writeFileSync\|existsSync\|statSync)\b' "${in_process_files[@]}"` (includes `plan-presence.ts`) | — |
| QA-06 | stdout writes on hook paths | blocking | `"${RG[@]}" 'console\.log\|process\.stdout\.write' "${hook_files[@]}"` | — |
| QA-07 | 4+ parameters in one declaration | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"` | — |
| QA-08 | File above 100 lines | reservation | `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | — |

- Verification scope: the TypeScript files in each task diff. `in_process_files` covers `plan-presence.ts`, `zone-guidance.ts`, and `runtime-composition.ts`; `hook_files` covers `brake-engine.ts`, `zone-guidance.ts`, and `claude-code/runtime.ts`.
- Escalation trigger: 8+ reservations, a touched file above 200 lines, or duplication in 3+ places.

### Terrain baseline

Measured at `3b94a9c`. There were no pre-existing QA-01 to QA-07 hits in any target file.

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/core/contracts/configuration.ts` | 61 | 6 | <4 | 0 | none | — |
| `src/core/contracts/runtime.ts` | 43 | 8 | <4 | 0 | none | — |
| `src/core/contracts/diagnostics.ts` | 61 | 15 | <4 | 0 | exports ≥ 10 (structural) | recorded; add a field, not an export |
| `src/core/services/brake-engine.ts` | 86 | 7 | <4 | 5 | none | growth absorbed in `DEC-11` |
| `src/core/services/zone-actions.ts` | 48 | 5 | <4 | 4 | none | — |
| `src/core/services/block-message.ts` | 28 | 3 | <4 | 0 | none | — |
| `src/core/services/brake-allowlist.ts` | 21 | 3 | <4 | 0 | none | — |
| `src/core/services/protocol-service.ts` | 64 | 3 | <4 | 0 | none | — |
| `src/core/services/failure-policy.ts` | 87 | 11 | <4 | 0 | exports ≥ 10 (structural) | recorded; one internal change, no new export |
| `src/core/services/telemetry-block.ts` | 18 | 3 | <4 | 0 | none | — |
| `src/core/services/session-zone.ts` | 24 | 6 | <4 | 0 | none | — |
| `src/core/services/installation-builder.ts` | 60 | 4 | <4 | 0 | none | — |
| `src/core/services/doctor-service.ts` | 98 | 2 | <4 | 0 | none | new checks go to `delegated-diagnostics.ts` |
| `src/core/validation/configuration-validator.ts` | 20 | 4 | <4 | 0 | none | — |
| `src/infrastructure/runtime/runtime-composition.ts` | 81 | 10 | <4 | 0 | exports ≥ 10 (structural) | recorded; no new export |
| `src/infrastructure/runner/wrap-telemetry.ts` | 41 | 5 | <4 | 0 | none | — |
| `src/infrastructure/harnesses/claude-code/runtime.ts` | 70 | 6 | <4 | 4 | none | — |
| `src/cli/argument-parser.ts` | 85 | 8 | <4 | 0 | none | new flags parsed in `init-arguments.ts` if the file passes 100 lines |
| `src/cli/commands/init.ts` | 89 | 4 | <4 | 0 | none | — |
| `src/cli/commands/doctor.ts` | 58 | 1 | <4 | 0 | none | — |
| `src/cli/commands/run-preflight.ts` | 46 | 4 | <4 | 0 | none | — |

- Preparatory refactoring: not recommended. The three structural files are touched in at most two places, and none of them gets a new export.

## Observability and rollout

- Signals:
  - `doctor` shows `checkpointMode`.
  - The block log keeps the `reason=critical_ceiling` records.
  - Runtime errors from the mode read go to the existing runtime error log with code `UNEXPECTED`.
- Migration: none. Existing configs stay valid, and the protocol is regenerated only when the section is added.
- Rollout and rollback: this ships in a minor release. To roll back, remove the key or run `init --no-delegated-snapshot`.

## Risks and open items

- Risk (medium probability, medium impact): the Claude Code `Skill` payload differs from `tool_input.skill`.
  - Mitigation: the task re-checks the vendor docs before implementing the mapping.
  - The path allowlist still lets the snapshot write its files.
- Risk (low, medium): a snapshot skill reads files outside `allowedPaths` in CRITICAL and gets blocked.
  - Mitigation: the default trigger `RED` gives the agent the whole RED band to finish before CRITICAL, and the protocol and README tell users to include the skill's read paths in `allowedPaths`.
- Open item (non-blocking; owner: a later feature): skill recognition for OpenCode, Copilot CLI, and Cursor once their payloads are documented.

## Relevant files

- Modify:
  - `src/core/contracts/configuration.ts`, `src/core/contracts/runtime.ts`, `src/core/contracts/diagnostics.ts`
  - `src/core/services/telemetry-block.ts`, `block-message.ts`, `brake-allowlist.ts`, `brake-engine.ts`, `failure-policy.ts`, `session-zone.ts`, `protocol-service.ts`, `installation-builder.ts`, `doctor-service.ts`
  - `src/infrastructure/runtime/runtime-composition.ts`, `src/infrastructure/runner/wrap-telemetry.ts`, `src/infrastructure/harnesses/claude-code/runtime.ts`
  - `src/cli/argument-parser.ts`, `src/cli/commands/init.ts`, `src/cli/commands/doctor.ts`, `src/cli/commands/run-preflight.ts`
  - `schemas/context-brake.config.schema.json`, `schemas/doctor-report.schema.json`, `README.md`, `docs/research/harness-integrations.md`
- Create:
  - `src/core/services/path-pattern.ts`, `src/core/services/zone-guidance.ts`, `src/core/services/delegated-diagnostics.ts`
  - `src/infrastructure/runtime/plan-presence.ts`
  - The tests named in the Test approach
