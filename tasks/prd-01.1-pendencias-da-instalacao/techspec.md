# TechSpec — PRD 1.1 installation follow-ups

## Sources and traceability

- PRD: `tasks/prd-01.1-pendencias-da-instalacao/prd.md` (`OBJ-01`–`OBJ-05`, `US-01`–`US-07`, `FR-01`–`FR-13`, `NFR-01`–`NFR-05`).
- Parent feature: `tasks/prd-01-instalacao-deteccao-diagnostico/prd.md` (RF8, RF9, RF10, RF19–RF24, CA-12, CA-15, CA-18, CA-21) and its `techspec.md`. The `.gitignore` design is `DEC-02` and the `IgnoreBlock` model there; this document reuses it without redefining it.
- Downstream feature: `tasks/prd-02-telemetria-zonas-e-freio/techspec.md`. Its `DEC-10`, `DEC-11`, and `DEC-17` consume the capability model, the measurer, and the benchmark contract defined here.
- Applicable instructions, rules, and skills: `AGENTS.md`; `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`, `file-changes.md`, `cli-output.md`; `sdd-create-techspec` with its three references.
- Research: `docs/research/harness-integrations.md`, all eight harness sections. Vendor documentation rechecked on 2026-09-14: [Claude Code hooks](https://code.claude.com/docs/en/hooks), [Codex hooks](https://learn.chatgpt.com/docs/hooks), [Cursor hooks](https://cursor.com/docs/hooks), [GitHub Copilot hooks](https://docs.github.com/en/copilot/reference/hooks-reference), [OpenCode plugins](https://opencode.ai/docs/plugins/), [Pi extensions](https://raw.githubusercontent.com/badlogic/pi-mono/main/packages/coding-agent/docs/extensions.md), [Oh-My-Pi extension loading](https://raw.githubusercontent.com/can1357/oh-my-pi/main/docs/extension-loading.md), and [Antigravity hooks](https://antigravity.google/docs/hooks/).
- Product decisions (2026-09-14):
  - Full support requires an honored explicit deny, and timeout or failure behavior is a limitation.
  - Overhead above target stays informational.
  - Plan and checkpoint are git-ignored.
  - `git add` joins the allowlist.
- Evidence in existing code (HEAD `f2227e1`; `src/`, `assets/`, `scripts/`, and `tests/` are unchanged since `99643a5`):
  - `src/core/services/support-service.ts`: `deriveLevel` and `allCapabilities` require all five capabilities, and `gatedState` turns any non-`resolved` version into `unknown`.
  - `src/infrastructure/harnesses/*/adapter.ts`: `CAPABILITIES`, benchmark payloads with undocumented keys (`event`, `hookName`, `name`), and the `COPILOT_TIMEOUT_LIMITATION` finding.
  - `src/infrastructure/diagnostics/overhead-measurer.ts`: spawns the asset with no event argument, and the in-process mock keeps only the last `on` handler.
  - `src/infrastructure/harnesses/antigravity-cli/schemas.ts` reads `toolName`; `pi/schemas.ts` and `oh-my-pi/schemas.ts` read `name`.
  - `src/core/services/installation-builder.ts` defaults `packageVersion` to `1.0.0`, and `src/cli/commands/init.ts` never passes a version.
  - `src/cli/commands/init.ts` (`emitLegacyPreview`) and `src/cli/output/text.ts` both print `LEGACY_BLOCK_DETECTED`.
  - `src/infrastructure/storage/change-applier.ts` deletes files but never removes directories.
  - `tsconfig.check.json` excludes `assets/`.
  - The last review, `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_06/codereview.md`, is `REJECTED`, with corrections T23 and T24 archived and not re-reviewed.

## Solution summary

This feature closes the PRD-01 surface before PRD-02 builds on it. It corrects what `init` and `doctor` promise:
- A harness is `full` when it honors an explicit deny on every tool call and delivers post-tool context and session boot.
- Context usage and failure or timeout behavior become informational capabilities, shown as limitations in both reports.
- A new `tool_coverage` capability separates harnesses whose hooks miss some tools.

The doctor benchmark exercises the event, documented payload, and tool handler a harness actually uses, and adapter payload schemas follow the documented field names.

The manifest records the real package version. `doctor` flags runtime assets that are outdated or locally modified, and `init` refuses to overwrite a modified one. The feature also delivers:
- the PRD-01 RF24 `.gitignore` block, as already specified in the PRD-01 TechSpec;
- removal of runtime state only with `--remove-state`, with pruning of empty ContextBrake directories;
- a single legacy warning;
- the protocol text decided on 2026-09-14;
- verified version floors, where vendor sources exist;
- typecheck coverage for runtime assets;
- corrected documentation.

The feature ends with an approved re-review of the pending PRD-01 corrections and QA for PRD-01 and this feature. Telemetry, zones, and the brake stay in PRD-02.

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-01, OBJ-05, NFR-05 | Implement PRD-01 RF24 exactly as the PRD-01 TechSpec `DEC-02` and `IgnoreBlock` specify. That covers the marker block, escaping, create, append, or update behavior, conflicts on malformed markers, the `ignore_block` owner, removal only with `--remove-state`, and the `STATE_FILES_NOT_IGNORED` and `MALFORMED_GITIGNORE_MARKERS` findings. This spec adds only wiring order and test ownership. | The design is already approved and measured in the parent TechSpec; restating it would create two sources. | Redefine the block here: drift risk between the two TechSpecs. |
| DEC-02 | FR-02, FR-04, OBJ-02 | Add `tool_coverage` to `CAPABILITY_IDS`. Keep a module-private full-support set in `support-service.ts`: `pre_tool_block`, `tool_coverage`, `post_tool_telemetry`, and `session_boot`. Derive `cooperative` when `pre_tool_block` is not `supported`, `full` when the four are `supported`, and `partial` otherwise. `context_usage` and `timeout_fail_closed` never affect the level; they appear only in `capabilities` and, when not supported, in `limitations`. Adapter declarations follow the table under Contracts. | FR-02 is the product decision. `tool_coverage` lets Codex CLI stay `partial` while hosted tools bypass hooks, and gives PRD-02 a single brake-mode source (`pre_tool_block` and `tool_coverage`). The constant stays out of `harness.ts`, which already has 34 exports. | Fold coverage into `pre_tool_block`: Codex CLI would become `cooperative`, contradicting FR-02. Keep timeout in the level: rejected by the product owner. A separate brake-guarantee flag: a second source next to the capability profile. |
| DEC-03 | FR-03, US-02 | Failure and timeout behavior lives in each adapter's `timeout_fail_closed` state and impact text. `unknown` states say the behavior is not documented. `HarnessInstallPlan` gains `limitations`, taken from the same profile as `supportLevel`, so `init` text and JSON show them. `doctor` keeps printing `support.limitations`. No warning finding is emitted for them, and `COPILOT_TIMEOUT_LIMITATION` is removed. | FR-03 requires the limitation beside the level in both commands, without a warning or an exit-code change. `cli-output.md` requires text and JSON parity. No release tag exists yet, so the additive schema field has no published consumers. | A warning finding per harness: exits 1 for Claude Code, Codex CLI, and Copilot on every run. Text-only lines in `init`: breaks JSON parity. Renaming `timeout_fail_closed`: changes a published enum value for no behavior gain. |
| DEC-04 | FR-05, OBJ-03, US-04 | `BenchmarkFixture` gains `event: string`, and each adapter's `samplePayload` follows its documented pre-tool payload. Process assets are spawned with `[assetPath, event]`, as the registrations do. For in-process assets, the mock API records handlers by event name and the sampler runs only the handler for `event`: Pi and Oh-My-Pi `tool_call(event, ctx)` with a mock `ctx` (`getContextUsage`, `sessionManager.getSessionId`, `ui.notify`); OpenCode `tool.execute.before(input, output)`. The comparison status stays informational. | `overhead-measurer.ts` sends no event argument, so the process hooks fall back to undocumented payload keys, and the in-process mock overwrites the handler until the last registration (`before_agent_start`). The product owner decided that overhead stays informational. | Time every registered handler: not the per-tool-call cost the PRD targets. Keep payload-based event detection: depends on keys no harness sends. |
| DEC-05 | FR-06 | Payload schemas use documented field names, stay non-strict, and keep classic Zod (PRD-02 migrates to `zod/mini`). The field table is under Contracts; fixtures in `tests/fixtures/harnesses/<harness>/` are rewritten to match. | The Antigravity docs name `toolCall.name` and `toolCall.args`; Pi documents `toolName`, `toolCallId`, and `input`; OpenCode documents `(input, output)` with `output.args`; the Copilot docs show `toolArgs` as an object. | Accept both old and new names permanently: keeps undocumented shapes alive in fixtures. |
| DEC-06 | FR-07 | New `src/infrastructure/storage/package-metadata.ts` resolves the package's own `package.json` from candidate paths for the dist layout (`dist/src/infrastructure/storage/` → four levels up) and the source layout (three levels up). It parses `{ name: "context-brake", version }` with Zod and a `semver` check, and fails with `PackageMetadataError`. `init` and `remove` pass the version to planning, and `planManifestChange` requires it (the `1.0.0` default is removed). | The manifest currently records `1.0.0` for every install, so no upgrade can be detected. `loadRuntimeAsset` already resolves packaged files with the same candidate strategy. | `import pkg from '../../package.json' with { type: 'json' }`: Node 20 prints an experimental warning on stderr. A build-time generated constant: another generated file and stale-check. |
| DEC-07 | FR-08, OBJ-04, US-03 | New pure `src/core/services/asset-currency.ts` classifies each manifest `runtime_asset` from three hashes: installed file, manifest entry, and expected packaged content. It returns `ASSET_MODIFIED` when installed differs from the manifest, `ASSET_OUTDATED` when installed matches the manifest but not the expected content, and nothing when all three match. `doctor` gets expected content by calling the installed harness adapter's read-only `planInstall` and taking its `runtime_asset` changes. `installation-service` turns a planned runtime-asset write whose current hash differs from the manifest into the existing `MODIFIED_OWNED_ASSET` conflict, so user edits are never overwritten. Without a manifest, no check runs. | `planInstall` already loads the packaged asset through `loadRuntimeAsset` and resolves the installed path, so no adapter port changes. Removal already refuses modified assets with `MODIFIED_OWNED_ASSET`, and `init` currently overwrites them. | A new adapter port exposing asset metadata: changes eight adapters and the contract. Compare only `packageVersion`: existing manifests all say `1.0.0`, and same-version development builds would go unnoticed. |
| DEC-08 | FR-09, US-06 | `remove --remove-state` lists every file under `.context-brake/runtime/` (new `runtime-state-files.ts`, asynchronous recursive `readdir`), snapshots them, and plans one `delete` per file with the new owner `runtime_state`. After applying a plan, `NodeChangeApplier` removes directories left empty by applied deletes under `<root>/.context-brake/`, deepest first, including `.context-brake/` itself. A directory that still has entries, or cannot be removed, is kept and reported as a `skipped` outcome with the reason. Without the flag, runtime files are neither listed nor touched. | The change engine is file-based and precondition-hashed, so per-file deletes keep previews truthful and concurrent writes safe. Today `remove` leaves an empty `.context-brake/` directory after deleting the manifest. | A directory-level delete kind: a contract change that bypasses per-file preconditions. Leave empty directories: litter that contradicts "remove deletes only what ContextBrake created". |
| DEC-09 | FR-10, US-07 | `init` prints the legacy preview on stderr only when it will request confirmation (no `--yes` and no `--dry-run`). When the preview was printed, the text report omits those same findings, matched by code and path. JSON output is unchanged. | `emitLegacyPreview` writes the warnings before confirmation, then `renderInstallText` prints every finding again. The existing E2E expects the preview on stderr before a missing confirmation and the remediation on stdout with `--yes`. | Remove the preview: the user would confirm without seeing the proposed migration. Deduplicate inside the report model: would drop findings from JSON. |
| DEC-10 | FR-11 | `renderZoneRows` changes two texts. The `RED` row reads "If validation passes, commit the code changes with `checkpoint: <step title>`." The `CRITICAL` row reads "Only reading or writing the plan and checkpoint, running the validation command, `git status`, `git add`, and `git commit` are allowed." This repository's packaged `docs/context-brake-protocol.md` is regenerated in the same change. | PRD 1.1 FR-11 and the 2026-09-14 decisions. PRD-02 later derives the `CRITICAL` row from its allowlist module, keeping this default text. | Wait for PRD-02: installed protocols would contradict PRD-02 and PRD-03 until then. |
| DEC-11 | FR-12, RF9 | For each harness, the version-floor research task searches official release notes and changelogs for the first version that documents every registered mechanism. It records `floor, source, date` or `not documented, date` in the harness's research section. Adapters with a floor pass it to `probeExecutableVersion`. Gating changes so that only an `old` probe turns capabilities `unknown`; `unknown`, `malformed`, and `timed_out` probes keep the declared states and add the existing "could not be verified" limitation. | RF9 asks to warn about old versions. With today's gating, adding any floor would drop Claude Code to `cooperative` whenever its binary is not on `PATH`, as in CI. PRD-01 forbids invented floors. | Keep the current gating: floors would cause false downgrades. Declare floors from memory: forbidden by the PRD-01 TechSpec. |
| DEC-12 | FR-13 | The README shows `.omp/extensions/` for Oh-My-Pi, a three-line reference block, and support levels with limitations matching the adapter profiles. A unit test compares the README support table with `capabilityProfile().supportLevel` for all eight adapters. `docs/research/harness-integrations.md` records the 2026-09-14 facts listed under Integrations. | The README states a four-line pointer and `.omp/hooks/`, and nothing prevents the support table from drifting from the code again. | Review-only checks: the drift already happened once. |
| DEC-13 | NFR-01 | `tsconfig.check.json` includes `assets/**/*.ts`. The completion evidence includes five consecutive default `npm test` runs with zero failures, timeouts, or unhandled errors on Windows, plus the CI matrix. | `codereview_06/CR-01` rejected the gate for non-repeatability, and T23's lanes must be proven again after this feature's new process tests. | Coverage-only proof: does not show repeatability. |
| DEC-14 | OBJ-01 | Closure runs in three reviews:<br>1. A PRD-01 re-review (`codereview_07` in the PRD-01 folder) covering T23, T24, `e490569`, and `99643a5` runs before this feature's tasks start.<br>2. This feature gets its own `sdd-review-code` cycle and `sdd-execute-qa` report in its folder.<br>3. After both pass, a PRD-01 QA (`qa_01` in the PRD-01 folder) verifies RF1–RF24 and CA-01–CA-21 on the resulting revision. | `codereview_06` is `REJECTED`, and the review skills require prd, techspec, and tasks under one slug. Starting from an approved PRD-01 base keeps this feature's findings separate from inherited ones. | One combined review: mixes two manifests and makes the rejected findings hard to close. |
| DEC-15 | NFR-01 (size rules) | Absorbed preparation, each inside the task that touches the file:<br>- `installation-service.ts` (92 lines) moves the conflict-to-finding mapping and managed-asset list into `installation-findings.ts`.<br>- `doctor-service.ts` (86) moves `diagnoseHarness` and `deriveIntegrationState` into `harness-diagnosis.ts`.<br>- `removal-service.ts` (85) moves `planStateDeletions` into `state-removal.ts`.<br>- `overhead-measurer.ts` (81) moves the in-process sampler into `in-process-sampler.ts`. | Each file gains RF24, asset-currency, runtime-state, or event logic and would cross the 100-line limit. Each extraction is local, changes no public contract, and needs no characterization tests beyond the existing suites. | Prior refactoring feature: not justified for four local extractions. |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/core/contracts/harness.ts` | Modified | Add `tool_coverage` to `CAPABILITY_IDS`; no new export. | — |
| CMP-02 | `src/core/services/support-service.ts` | Modified | Full-support set and level derivation (DEC-02); version gating (DEC-11). | CMP-01 |
| CMP-03 | `src/infrastructure/harnesses/*/adapter.ts` (8) | Modified | Declare capability states and impacts; send documented benchmark fixtures with `event`; declare floors when researched; drop `COPILOT_TIMEOUT_LIMITATION`. | CMP-01, CMP-04 |
| CMP-04 | `src/core/contracts/adapter.ts` | Modified | `BenchmarkFixture.event`. | — |
| CMP-05 | `src/infrastructure/diagnostics/overhead-measurer.ts`, `in-process-sampler.ts` | Modified, new | Spawn with the event argument; run only the tool handler of in-process assets (DEC-04, DEC-15). | CMP-04 |
| CMP-06 | `src/infrastructure/harnesses/*/schemas.ts` (8) and `tests/fixtures/harnesses/*/` | Modified | Documented payload field names (DEC-05). | — |
| CMP-07 | `src/infrastructure/storage/package-metadata.ts`; `src/core/services/installation-builder.ts`; `src/cli/commands/init.ts`, `remove.ts` | New, modified | Read the package version; require it for the manifest (DEC-06). | — |
| CMP-08 | `src/core/services/asset-currency.ts`; `harness-diagnosis.ts`; `doctor-service.ts`; `src/cli/commands/doctor.ts` | New, modified | Classify runtime assets; collect expected content through `planInstall`; add findings (DEC-07, DEC-15). | CMP-07 |
| CMP-09 | `src/core/services/installation-service.ts`, `installation-findings.ts` | Modified, new | `.gitignore` plan (DEC-01); `MODIFIED_OWNED_ASSET` conflict for modified assets (DEC-07); harness limitations in the plan (DEC-03). | CMP-02, CMP-10 |
| CMP-10 | `src/core/services/gitignore-service.ts`, `gitignore-markers.ts`, `gitignore-checks.ts`; `src/cli/snapshot-helper.ts` | New, modified | PRD-01 RF24 as specified in PRD-01 `DEC-02`. | CMP-11 |
| CMP-11 | `src/core/contracts/changes.ts`, `src/core/contracts/diagnostics.ts`; `schemas/install-report.schema.json`, `schemas/doctor-report.schema.json` | Modified | Owners `ignore_block` and `runtime_state`; `HarnessInstallPlan.limitations`; capability enum; regenerated schemas. | CMP-01 |
| CMP-12 | `src/core/services/removal-service.ts`, `state-removal.ts`, `removal-helper.ts`; `src/infrastructure/storage/runtime-state-files.ts`; `src/infrastructure/storage/change-applier.ts` | Modified, new | `.gitignore` block and runtime-state removal with `--remove-state`; empty-directory pruning (DEC-08). | CMP-10, CMP-11 |
| CMP-13 | `src/cli/commands/init.ts`, `src/cli/output/text.ts` | Modified | Legacy preview once (DEC-09); limitation lines in the install text. | CMP-09 |
| CMP-14 | `src/core/services/protocol-service.ts`, `docs/context-brake-protocol.md` | Modified | Protocol text (DEC-10). | — |
| CMP-15 | `tsconfig.check.json`; `README.md`; `docs/research/harness-integrations.md` | Modified | Typecheck scope (DEC-13); documentation and floors (DEC-11, DEC-12). | CMP-03 |

Flow:

- **`init`:** the CLI reads the package version (CMP-07), loads the configuration and manifest, and snapshots files including `.gitignore` (CMP-10). Planning adds harness changes and turns modified runtime-asset writes into `MODIFIED_OWNED_ASSET` conflicts (CMP-09). It also adds the `.gitignore` block change and a manifest with the real version, and attaches `limitations` to each harness plan. Text output prints the legacy preview once and a limitation line per harness (CMP-13).
- **`doctor`:** besides today's checks, it runs `gitignore-checks`. For each installed harness it calls `planInstall` to collect expected runtime-asset content, then classifies each manifest asset (CMP-08). The measurer runs the fixture's event and tool handler (CMP-05). Limitations come from the derived profile (CMP-02, CMP-03).
- **`remove`:** default removal behaves as today and then prunes empty ContextBrake directories. With `--remove-state` it also plans the `.gitignore` block removal and per-file runtime-state deletes, applied and pruned the same way (CMP-12).

## Contracts and data

### Capability declarations (DEC-02, DEC-03, FR-02 to FR-04)

`S` = `supported`, `U` = `unsupported`, `?` = `unknown`. The level is derived; limitations list every capability that is not `S`, with the impact text below.

| Harness | `pre_tool_block` | `tool_coverage` | `post_tool_telemetry` | `session_boot` | `context_usage` | `timeout_fail_closed` | Level |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Claude Code | S | S | S | S | U | U | full |
| Codex CLI | S | U | S | S | U | U | partial |
| Cursor | S | S | S | S | U | S | full |
| GitHub Copilot CLI | S | S | S | S | U | U | full |
| OpenCode | S | ? | U | U | U | ? | partial |
| Pi | S | S | S | S | S | ? | full |
| Oh-My-Pi | S | S | S | S | S | ? | full |
| Antigravity CLI | S | ? | U | U | U | ? | partial |

Impact texts (English, exact):

| Harness | Capability | Impact |
| --- | --- | --- |
| Claude Code | `context_usage` | Context usage reaches the Claude Code status line, not hooks, so ContextBrake estimates it. |
| Claude Code | `timeout_fail_closed` | A hook timeout, or a hook failure without an explicit deny, lets the tool call proceed. |
| Codex CLI | `tool_coverage` | Hosted tools such as web search bypass Codex CLI hooks. |
| Codex CLI | `context_usage` | Context usage is not exposed to Codex CLI hooks. |
| Codex CLI | `timeout_fail_closed` | A hook error, invalid output, or timeout lets the tool call proceed. |
| Cursor | `context_usage` | Context usage reaches Cursor hooks only before compaction, so ContextBrake estimates it. |
| GitHub Copilot CLI | `context_usage` | Context usage is not exposed to GitHub Copilot CLI hooks. |
| GitHub Copilot CLI | `timeout_fail_closed` | A hook timeout lets the tool call proceed; a command failure without a timeout denies it. |
| OpenCode | `tool_coverage` | Whether tool.execute.before runs for every OpenCode tool is not documented. |
| OpenCode | `post_tool_telemetry` | Model visibility of post-tool output modification is unconfirmed in OpenCode. |
| OpenCode | `session_boot` | Stable boot injection is experimental in OpenCode. |
| OpenCode | `context_usage` | No documented API exposes context usage to OpenCode plugins. |
| OpenCode | `timeout_fail_closed` | Failure and timeout behavior of OpenCode plugins is not documented. |
| Pi | `timeout_fail_closed` | Timeout behavior of Pi extension handlers is not documented, and a throwing handler is logged without blocking. |
| Oh-My-Pi | `timeout_fail_closed` | Timeout behavior of Oh-My-Pi extension handlers is not documented. |
| Antigravity CLI | `tool_coverage` | Hook coverage in the Antigravity CLI is not confirmed by its documentation. |
| Antigravity CLI | `post_tool_telemetry` | Antigravity CLI PostToolUse accepts only empty output; telemetry is indirect via PreInvocation. |
| Antigravity CLI | `session_boot` | Session boot is indirect via PreInvocation. |
| Antigravity CLI | `context_usage` | Context usage is not exposed to Antigravity CLI hooks. |
| Antigravity CLI | `timeout_fail_closed` | Failure and timeout behavior of Antigravity hooks is not documented. |

### Report contracts (schema version 1, additive)

| Contract | Change | Compatibility |
| --- | --- | --- |
| `CapabilityId` in `doctor-report.schema.json` | Adds `tool_coverage` | Additive enum value; no release tag exists |
| `FileChange.owner` in `install-report.schema.json` | Adds `ignore_block` (PRD-01 `DEC-02`) and `runtime_state` | Additive enum values |
| `HarnessInstallPlan` in `install-report.schema.json` | Adds required `limitations: { capability, impact }[]` | Additive field in a strict object; producers only |
| `DiagnosticFinding.code` | New codes `ASSET_OUTDATED`, `ASSET_MODIFIED`, `STATE_FILES_NOT_IGNORED`, `MALFORMED_GITIGNORE_MARKERS`; removed `COPILOT_TIMEOUT_LIMITATION` | Codes are free-form under the existing regex |
| `InstallationManifest.packageVersion` | Holds the running package version | Schema unchanged |
| `BenchmarkFixture` (internal) | Adds required `event: string` | Internal port |

New findings:

| Code | Severity | Scope | Message and remediation |
| --- | --- | --- | --- |
| `ASSET_OUTDATED` | `warning` | `harness` | "The runtime asset `<path>` was installed by ContextBrake `<manifest version>` and differs from the asset in `<running version>`." Remediation: "Run context-brake init --yes." |
| `ASSET_MODIFIED` | `warning` | `harness` | "The runtime asset `<path>` differs from the installed version." Impact: "init and remove leave it untouched, so the harness runs the modified file." Remediation: "Restore or delete the file, then run context-brake init --yes." |

The `STATE_FILES_NOT_IGNORED` and `MALFORMED_GITIGNORE_MARKERS` findings follow the PRD-01 TechSpec `IgnoreBlock` model.

### Benchmark fixtures (DEC-04, DEC-05)

| Harness | `event` | Documented sample payload | Handler exercised |
| --- | --- | --- | --- |
| Claude Code | `PreToolUse` | `session_id`, `hook_event_name`, `tool_name: "Bash"`, `tool_input: { command }`, `tool_use_id`, `cwd` | process hook |
| Codex CLI | `PreToolUse` | `session_id`, `hook_event_name`, `tool_name: "Bash"`, `tool_input: { command }`, `tool_use_id`, `cwd` | process hook |
| Cursor | `preToolUse` | `conversation_id`, `hook_event_name`, `tool_name: "Shell"`, `tool_input: { command }`, `tool_use_id` | process hook |
| GitHub Copilot CLI | `preToolUse` | `sessionId`, `timestamp`, `cwd`, `toolName: "bash"`, `toolArgs: { command }` | process hook |
| Antigravity CLI | `PreToolUse` | `conversationId`, `toolCall: { name: "run_command", args: { CommandLine } }` | process hook |
| OpenCode | `tool.execute.before` | input `{ tool: "bash", sessionID, callID }`, output `{ args: { command } }` | returned hook function |
| Pi | `tool_call` | `{ toolName: "read", toolCallId, input: { path } }` with a mock `ctx` | registered handler |
| Oh-My-Pi | `tool_call` | `{ toolName: "read", input: { path } }` with a mock `ctx` | registered handler |

Payload schema fields (non-strict): Claude Code also reads `tool_use_id`, `agent_id`, and a post-tool `tool_output` or `tool_response`; Codex CLI reads `tool_input`, `tool_use_id`, `tool_response`; Cursor reads `tool_input`, `tool_use_id`, `tool_output`; Copilot reads `toolArgs` as an object and `toolResult.textResultForLlm`; Antigravity reads `toolCall.name` and `toolCall.args`; Pi and Oh-My-Pi read `toolName`, `toolCallId`, `input`, and `content`; OpenCode reads `input.tool`, `input.sessionID`, `input.callID`, and `output.args`.

### Protocol rows (DEC-10)

- `RED`: "Stop editing. Update `<planFile>` and `<checkpointFile>`. If validation passes, commit the code changes with `checkpoint: <step title>`. End the response with `[REQUEST_SESSION_RESET]`."
- `CRITICAL`: "Other tool calls are blocked. Only reading or writing the plan and checkpoint, running the validation command, `git status`, `git add`, and `git commit` are allowed. Complete the `RED` actions."

## Integrations and interfaces

- **Harness facts used, verified on 2026-09-14:**
  - Claude Code: a `PreToolUse` command hook that times out does not block, and a non-2 exit without deny proceeds.
  - Codex CLI: errors, invalid JSON, and timeouts fail open, and hosted tools bypass hooks.
  - Cursor: `failClosed: true` blocks on crash, timeout, or empty output.
  - GitHub Copilot CLI: timeouts always fail open, and non-timeout command failures deny; `toolArgs` is an object.
  - Pi: a throwing handler is logged and does not block; `tool_call` uses `toolName`, `toolCallId`, and `input`.
  - Oh-My-Pi: extensions load from `.omp/extensions/` (`.ts`, `.js`), and `tool_call` errors block.
  - OpenCode: `tool.execute.before(input, output)`; throwing blocks; no token API.
  - Antigravity CLI: `PreToolUse` uses `toolCall.name` and `toolCall.args`; failure and timeout behavior is undocumented.
- **Research file updates in the same change as CMP-03, CMP-05, and CMP-06:**
  - The summary table corrects the Oh-My-Pi registration to `.omp/extensions/` and the Codex failure column to fail-open.
  - Each harness section gets the facts above plus the version floor record (DEC-11).
  - The PRD-02-only facts (Stop payloads, `PreInvocation` step formats, new-session commands) are recorded now as well, so PRD-02 starts from current research.
- **Process execution:** the measurer keeps `spawn` with an argument array and its 2,000 ms per-sample timeout, and adds only the event argument. No shell is involved (`node.md`).
- **Idempotency:**
  - A second `init` with unchanged package and configuration plans no changes, including the manifest and `.gitignore`.
  - A second `remove --remove-state` finds nothing to delete and prunes nothing.
- **Failure policy (no hook runtime changes here):** a modified runtime asset blocks only its own write, so the other harness changes proceed. A runtime-state file that changes between preview and apply fails with `FILE_CHANGED_SINCE_PREVIEW`, and its directory is not pruned.

## Errors, security, and recovery

- **Errors and edges:**
  - A missing or invalid package metadata file throws `PackageMetadataError`, which `init` and `remove` report as `UNEXPECTED_ERROR`; this happens only with a broken installation.
  - `doctor` skips asset classification for a harness whose `planInstall` returns conflicts.
  - An asset listed in the manifest but missing on disk keeps the existing `ASSET_MISSING`.
  - Empty-directory pruning stops at the first non-empty directory and never follows symbolic links out of `.context-brake/`.
- **User files and sensitive data:**
  - `init` never overwrites a runtime asset the user changed.
  - Removal touches only files under `.context-brake/runtime/`, and only with `--remove-state`.
  - The `.gitignore` rules follow `file-changes.md`.
  - No new data leaves the machine.
- **Concurrency:** every write and delete keeps its SHA-256 precondition. Pruning checks emptiness right before removing each directory.
- **Rollback:**
  - Reinstalling the previous package with `init --yes` restores the previous assets and manifest.
  - `git` reverts the protocol and documentation files.
  - The additive schema fields need no migration.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| 0. PRD-01 re-review of T23, T24, `e490569`, `99643a5` (`codereview_07`) | — | `APPROVED`, or correction tasks completed and re-reviewed (DEC-14). |
| 1. Capability model, levels, limitations in reports, schemas | 0 | TC-01 to TC-03 and TC-15 pass; schemas regenerated. |
| 2. Payload schemas, fixtures, benchmark event and handler | 1 | TC-04 and TC-05 pass. |
| 3. Package version, asset currency, modified-asset conflict | 1 | TC-06 and TC-07 pass. |
| 4. PRD-01 RF24 `.gitignore` block, runtime-state removal, directory pruning | 1 | TC-08 and TC-09 pass. |
| 5. Legacy preview, protocol text, typecheck scope, README, research and floors | 1 to 4 | TC-10 to TC-14 pass. |
| 6. Completion gates, feature review and QA, PRD-01 QA | 2 to 5 | TC-16 to TC-18 recorded (DEC-13, DEC-14). |

## Test approach

- **Profile:**
  - Runtime surfaces: CLI commands `init`, `doctor`, and `remove`; the doctor benchmark spawns process hooks and imports in-process plugins. No hook or plugin behavior changes.
  - Toolchain: Node.js ≥ 20 (CI 20, 22, 24); TypeScript strict `NodeNext` ESM; Vitest 3 with the `parallel` and `process` lanes from `tests/test-lanes.ts`; 80% coverage thresholds.
  - Commands from `AGENTS.md`: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`, `npm run dependencies:check`, `npm run package:smoke`.
- **End-to-end:** the built CLI runs against temporary fixture repositories: Copilot support and limitations in `doctor --json`, outdated and modified assets, `.gitignore` idempotency (PRD-01 E2E-11), `remove --remove-state` with runtime files, and the single legacy preview.
- **Platforms:** Linux, macOS, and Windows (PowerShell and Git Bash) run TC-07, TC-08, TC-09, and TC-10, which touch paths, symbolic links, directory removal, and child processes.
- **Prerequisites:** `dist/` built before process-lane and E2E tests. PRD-01 IT-18 needs `git` and is skipped with the reason when it is unavailable.
- **Manual acceptance:** version-floor research review (TC-12), and review and QA records (TC-18). Owner: product owner.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-02, DEC-02 | unit | Every capability combination, including `unknown` in each position | `cooperative` without a supported block; `full` only with the four full-support capabilities; `context_usage` and `timeout_fail_closed` never change the level | `tests/unit/support-service.test.ts` |
| TC-02 | FR-02, FR-04, US-01, PRD-01 CA-15 | unit | Profiles of the eight adapters | States, levels, and exact impacts of the Contracts tables | `tests/unit/harness-adapters.test.ts` |
| TC-03 | FR-03, US-02, DEC-03 | unit, integration, and end-to-end | `init --json`, `init` text, `doctor --json`, and `doctor` text in a Copilot and Cursor fixture repository | Limitation lines and JSON arrays match; Copilot shows the timeout limitation and `full`; Cursor shows no timeout limitation; no limitation finding; exit code unaffected by limitations | `tests/unit/cli-output-text.test.ts`, `tests/integration/copilot-failure-policy.test.ts`, `tests/e2e/e2e-support-limitations.test.ts` |
| TC-04 | FR-05, OBJ-03, US-04, DEC-04 | unit and integration | Process fixture asset that exits non-zero unless its first argument equals the fixture event; in-process fixture registering `tool_call` and `before_agent_start` with call counters; installed Claude Code, OpenCode, and Pi assets | Samples succeed only with the event; only the tool handler runs; sample counts 20 and 100; status stays informational with no finding | `tests/unit/overhead-measurer.test.ts`, `tests/integration/doctor-benchmark.test.ts` |
| TC-05 | FR-06, DEC-05 | unit | Documented fixtures and every adapter's benchmark payload parsed by that adapter's schemas, including extra fields | All parse; Antigravity exposes `toolCall.name`; Pi exposes `toolName` | `tests/unit/harness-schemas-process.test.ts`, `tests/unit/harness-schemas-in-process.test.ts` |
| TC-06 | FR-07, DEC-06 | unit and end-to-end | Metadata from source and dist layouts, a missing file, a non-semver version; built `init --yes` | Version read or `PackageMetadataError`; the manifest `packageVersion` equals `package.json` | `tests/unit/package-metadata.test.ts`, `tests/e2e/e2e-01-02.test.ts` |
| TC-07 | FR-08, OBJ-04, US-03, DEC-07 | unit, integration, and end-to-end | Current, outdated (manifest `0.9.0` and old bytes), modified, missing, and no-manifest cases; `init --yes` over outdated and modified assets | No finding, `ASSET_OUTDATED`, `ASSET_MODIFIED`, `ASSET_MISSING`, and no check, respectively; `init` updates the outdated asset and reports `MODIFIED_OWNED_ASSET` with the modified bytes unchanged | `tests/unit/asset-currency.test.ts`, `tests/integration/doctor-asset-currency.test.ts`, `tests/e2e/e2e-asset-currency.test.ts` |
| TC-08 | FR-01, OBJ-05, US-05, PRD-01 CA-12 and CA-21 | unit, integration, and end-to-end | PRD-01 UT-21 to UT-25, IT-17, IT-18, E2E-11 | As specified in the PRD-01 TechSpec | suites named there |
| TC-09 | FR-09, US-06, DEC-08 | unit and integration | `remove` with and without `--remove-state` over nested runtime files, without a runtime directory, with a file changed after preview, and with a stray user file in `.context-brake/` | Default keeps runtime files and removes an empty `.context-brake/`; the flag deletes files and prunes empty directories; no directory means no change; the changed file fails and its directory stays; a non-empty directory stays with a `skipped` outcome | `tests/unit/state-removal.test.ts`, `tests/integration/safe-removal.test.ts` |
| TC-10 | FR-10, US-07, DEC-09 | unit and end-to-end | `init` non-TTY without `--yes`; `init --yes`; a confirmed interactive run with a fake prompt; `init --dry-run --json` | `LEGACY_BLOCK_DETECTED` appears once per file in the combined text output of each run; JSON keeps one finding per file | `tests/unit/init-legacy-preview.test.ts`, `tests/e2e/e2e-legacy-preview.test.ts` |
| TC-11 | FR-11, DEC-10 | unit | Render the protocol with defaults and custom state paths; compare the repository's `docs/context-brake-protocol.md` with `renderProtocol(DEFAULT_CONFIG)` | Exact `RED` and `CRITICAL` rows; the packaged file matches | `tests/unit/protocol-service.test.ts` |
| TC-12 | FR-12, RF9, DEC-11 | unit and manual | Gating with `old`, `unknown`, `malformed`, and `timed_out` probes and a floor; research sections for the eight harnesses | Only `old` turns capabilities `unknown`; the others keep states with the unverified limitation; each research section records a floor with source or "not documented" with date | `tests/unit/support-service.test.ts`, `tests/unit/adapter-version-probes.test.ts`, review |
| TC-13 | FR-13, DEC-12 | unit | README support table and text | Table levels equal the adapter profiles; README contains `.omp/extensions/` and describes a three-line block | `tests/unit/readme-support-table.test.ts` |
| TC-14 | NFR-01, DEC-13 | integration | Typecheck scope with a temporary type error in an asset source (local check), then the real tree | The local check fails on the asset; the real tree passes | `npm run typecheck` |
| TC-15 | NFR-02 | unit | Generated schemas compared with the previous version | Only the additive changes listed under Contracts; `schemas:check` clean | `tests/unit/schemas.test.ts`, `npm run schemas:check` |
| TC-16 | NFR-01, NFR-03, NFR-04 | end-to-end and CI | Five consecutive `npm test` runs on Windows; CI matrix; PRD-01 E2E-09 timing | Zero failures, timeouts, and unhandled errors; matrix green with run ID recorded; core `init` and `doctor` stay under 5 s | CI and `tests/e2e/e2e-09.test.ts` |
| TC-17 | NFR-05 | integration | Byte-preservation suites for `.gitignore`, runtime assets, and removal | Unowned bytes identical after one and two runs | `tests/integration/*` |
| TC-18 | OBJ-01, DEC-14 | manual | `codereview_07` (PRD-01), this feature's review and QA, PRD-01 `qa_01` | All `APPROVED`, with reports archived in their folders | review and QA reports |

## Quality profile

Rules this feature can violate. A blocking hit prevents task completion and rejects the review; a reservation becomes an optional improvement and counts toward escalation. A hit covered by `DEC-NN` is expected, not a finding.

```bash
RG=(rg -n --type ts -g '!node_modules/**' -g '!dist/**' -g '!coverage/**' -g '!**/*.d.ts')
files=()        # every TypeScript file in the task diff
core_files=()   # subset under src/core/
```

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `"${RG[@]}" ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | — |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `"${RG[@]}" '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-03 | Empty `catch` or `.catch(() => {})` | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | — |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-05 | `exec`, `execSync`, or `shell: true` (the measurer spawns processes) | blocking | `"${RG[@]}" '\bexecSync\(\|\bexec\(\|shell:\s*true' "${files[@]}"` | — |
| QA-06 | Generic `throw new Error(` where a dedicated class names a fixable failure | reservation | `"${RG[@]}" 'throw new Error\(' "${files[@]}"` | — |
| QA-07 | 4+ parameters in one declaration, or a `.ts` file above 100 lines | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"; rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | `DEC-15` (planned extractions) |

In the table, `\|` stands for a literal pipe; run the commands with plain `|`.

- Verification scope: the TypeScript files in each task diff; skip a command whose list is empty.
- Escalation trigger: eight or more reservation hits, a touched file above 200 lines, or the same block duplicated in three or more places. The eight adapters must keep their capability declarations as data rather than repeating derivation logic.

### Terrain baseline

Hits that already existed in the target files before implementation. A hit listed here is not a task finding; a new hit is. A target file without a row in this table counts as unmeasured, and every hit in it will be treated as new.

Measured on 2026-09-14 at `f2227e1`. No target has a declaration with 4+ parameters or a `case` statement. PRD-01 RF24 targets not repeated here keep the rows of the PRD-01 TechSpec baseline (`removal-helper.ts`, `snapshot-helper.ts`).

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/core/contracts/harness.ts` | 55 | 34 | ≤ 3 | 0 | structural: 34 exported members | recorded (one enum value, no new export) |
| `src/core/contracts/adapter.ts` | 53 | 5 | ≤ 3 | 0 | — | recorded |
| `src/core/contracts/changes.ts` | 33 | 24 | ≤ 3 | 0 | structural: 24 exported members | recorded (enum values and one field, no new export) |
| `src/core/contracts/diagnostics.ts` | 37 | 11 | ≤ 3 | 0 | structural: 11 exported members | recorded (enum values and one field, no new export) |
| `src/core/services/support-service.ts` | 62 | 2 | ≤ 3 | 0 | — | recorded |
| `src/core/services/installation-service.ts` | 92 | 3 | ≤ 3 | 0 | — | absorbed in `DEC-15` |
| `src/core/services/installation-builder.ts` | 60 | 4 | ≤ 3 | 0 | — | recorded |
| `src/core/services/doctor-service.ts` | 86 | 2 | ≤ 3 | 0 | — | absorbed in `DEC-15` |
| `src/core/services/removal-service.ts` | 85 | 3 | ≤ 3 | 0 | — | absorbed in `DEC-15` |
| `src/core/services/protocol-service.ts` | 51 | 2 | ≤ 3 | 0 | — | recorded |
| `src/cli/commands/init.ts` | 79 | 2 | ≤ 3 | 0 | — | recorded |
| `src/cli/commands/remove.ts` | 68 | 1 | ≤ 3 | 0 | — | recorded |
| `src/cli/commands/doctor.ts` | 52 | 1 | ≤ 3 | 0 | — | recorded |
| `src/cli/output/text.ts` | 49 | 4 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/diagnostics/overhead-measurer.ts` | 81 | 1 | ≤ 3 | 0 | — | absorbed in `DEC-15` |
| `src/infrastructure/storage/change-applier.ts` | 72 | 2 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/adapter.ts` | 77 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/codex-cli/adapter.ts` | 83 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/cursor/adapter.ts` | 70 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/github-copilot-cli/adapter.ts` | 80 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/antigravity-cli/adapter.ts` | 81 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/opencode/adapter.ts` | 76 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/pi/adapter.ts` | 70 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/oh-my-pi/adapter.ts` | 70 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/schemas.ts` | 45 | 7 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/codex-cli/schemas.ts` | 27 | 5 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/cursor/schemas.ts` | 23 | 4 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/github-copilot-cli/schemas.ts` | 26 | 4 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/antigravity-cli/schemas.ts` | 19 | 4 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/opencode/schemas.ts` | 18 | 3 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/pi/schemas.ts` | 15 | 3 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/oh-my-pi/schemas.ts` | 15 | 3 | ≤ 3 | 0 | — | recorded |
| `tests/unit/support-service.test.ts` | 53 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/harness-adapters.test.ts` | 39 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/doctor-service.test.ts` | 92 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/harness-schemas-process.test.ts` | 80 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/harness-schemas-in-process.test.ts` | 45 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/removal-service.test.ts` | 58 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/report-service.test.ts` | 59 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/cli-output-text.test.ts` | 91 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/protocol-service.test.ts` | 30 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/schemas.test.ts` | 16 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/adapter-version-probes.test.ts` | 34 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/manifest-store.test.ts` | 48 | 0 | ≤ 3 | 0 | `QA-03: tests/unit/manifest-store.test.ts:45` | recorded |
| `tests/integration/copilot-failure-policy.test.ts` | 51 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/integration/doctor-benchmark.test.ts` | 37 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/integration/safe-removal.test.ts` | 83 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/e2e/e2e-legacy-preview.test.ts` | 66 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/e2e/e2e-07-08.test.ts` | 55 | 0 | ≤ 3 | 0 | — | recorded |

Non-TypeScript targets: `tsconfig.check.json`, `README.md`, `docs/research/harness-integrations.md`, `docs/context-brake-protocol.md`, `schemas/*.json`, `tests/fixtures/harnesses/*/*.json`.

- Preparatory refactoring: not recommended. `harness.ts`, `changes.ts`, and `diagnostics.ts` cross the export threshold, but the change adds enum values and one field without new exports. The four files near the line limit get the local extractions absorbed in `DEC-15`.

## Observability and rollout

- **Signals:**
  - Limitation lines and arrays in `init` and `doctor`.
  - `ASSET_OUTDATED`, `ASSET_MODIFIED`, `STATE_FILES_NOT_IGNORED`, `MALFORMED_GITIGNORE_MARKERS`.
  - Informational overhead with the real event.
  - The manifest version.
- **Migration:**
  - Existing installs keep working. The next `doctor` shows `ASSET_OUTDATED` only when bytes differ, and `PROTOCOL_FILE_MISMATCH` until `init --yes` rewrites the protocol and adds the `.gitignore` block.
  - Copilot projects stop getting the `COPILOT_TIMEOUT_LIMITATION` warning and see `full` support with the limitation instead.
- **Rollout:**
  - Step 0 re-review first; this feature's tasks and gates; then this feature's review and QA; then PRD-01 `qa_01`.
  - PRD-02 remeasures its terrain baseline after this feature lands, as its TechSpec requires.
- **Rollback:** reinstall the previous package with `init --yes` and revert the documentation; the additive schemas need no migration.

## Risks and open items

- Risk: official release notes may not name the version that introduced each mechanism. Probability high, impact FR-12 changes nothing and `VERSION_FLOOR_UNVERIFIED` stays. Mitigation: record "not documented" with the date, as FR-12 allows.
- Risk: Copilot is `full` because its reference documents `preToolUse` for every tool; an undocumented tool path would break the guarantee. Probability low, impact a non-denied call. Mitigation: the limitation text, and a research update the moment coverage evidence changes.
- Risk: calling `planInstall` for every installed harness makes `doctor` slower. Probability low, impact NFR-04. Mitigation: planning is file reads plus asset loads; PRD-01 E2E-09 timing guards the limit.
- Risk: directory pruning on Windows can fail while antivirus or an editor holds a handle. Probability low, impact empty directories left. Mitigation: a `skipped` outcome with the reason; a later `remove` retries.
- Risk: removing `COPILOT_TIMEOUT_LIMITATION` changes the exit code for Copilot-only projects from 1 to 0 when nothing else warns. Probability certain, impact scripts relying on the old exit code. Mitigation: no release has been tagged, and the change is documented in the README.
- Open item: confirm that `sdd-orchestrate-flow` and the review skills accept the slug `01.1-pendencias-da-instalacao`. Owner: maintainer. Affects task planning for this feature.

## Relevant files

- Modify:
  - Contracts and services: `src/core/contracts/{harness,adapter,changes,diagnostics}.ts`, `src/core/services/{support-service,installation-service,installation-builder,doctor-service,removal-service,removal-helper,protocol-service}.ts`
  - CLI: `src/cli/commands/{init,remove,doctor}.ts`, `src/cli/output/text.ts`, `src/cli/snapshot-helper.ts`
  - Infrastructure: `src/infrastructure/diagnostics/overhead-measurer.ts`, `src/infrastructure/storage/change-applier.ts`
  - Harness adapters and schemas: `src/infrastructure/harnesses/{claude-code,codex-cli,cursor,github-copilot-cli,antigravity-cli,opencode,pi,oh-my-pi}/{adapter,schemas}.ts`
  - Generated and packaged files: `schemas/install-report.schema.json`, `schemas/doctor-report.schema.json`, `docs/context-brake-protocol.md`
  - Configuration and docs: `tsconfig.check.json`, `README.md`, `docs/research/harness-integrations.md`
  - Fixtures and tests: `tests/fixtures/harnesses/*/*.json` and the suites in the terrain baseline
- Create:
  - Core services: `src/core/services/{asset-currency,installation-findings,harness-diagnosis,state-removal,gitignore-service,gitignore-markers,gitignore-checks}.ts`
  - Infrastructure: `src/infrastructure/storage/{package-metadata,runtime-state-files}.ts`, `src/infrastructure/diagnostics/in-process-sampler.ts`
  - Tests: the new suites named in TC-01 to TC-16
