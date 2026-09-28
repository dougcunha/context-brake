# TechSpec — Modo debug

## Sources and traceability

- PRD: `tasks/prd-08-modo-debug/prd.md` (`FR-01`–`FR-06`, `NFR-01`–`NFR-02`), level `sdd-lean` (`DEC-HIL-00`, `DEC-STOPS-01`), with product decisions from `DEC-PD-01`.
- Rules: `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `file-changes.md` (`init` edits the managed block in instruction files), and `cli-output.md` (`init` errors, the `doctor` line). `harness-adapters.md` does not apply because no adapter, payload, or harness config changes.
- Research: none needed. Injection is decided in the shared engine (`brake-engine.ts#telemetryDecision`) for every adapter.
- Evidence in existing code:
  - Telemetry block: `src/core/services/telemetry-block.ts#renderTelemetryBlock` (`v2`, fields `usage=`, `tokens=`, `source=`, `zone=`). `tests/unit/telemetry-block-budget.test.ts` measures tokens with `o200k_base`.
  - Injection: `src/core/services/injection-policy.ts#decideInjection`. Its only caller is `brake-engine.ts:63` (`telemetryDecision`), which light mode also goes through.
  - Managed block: `src/core/services/instruction-markers.ts#renderReferenceBlock(planFile, protocolFile, eol)`. Callers: `instruction-service.ts:32,39,66,79` and `legacy-preview.ts:8`. `planExistingInstruction` rewrites any block that differs from the target (`existing === target`), so a drifted block is repaired by the next `init`. Removal (`removal-helper.ts#planInstructionRemoval`, light-mode `support-files.ts#planLightSupport`) works by markers, not by content.
  - Configuration: `src/core/contracts/configuration.ts` (`configurationSchema`, `z.strictObject`; `lightMode` is an optional top-level section). `config-legacy-checks.ts#normalizeTurnLimits` rebuilds `telemetry` from named fields only, so a new key under `telemetry` would be dropped on every `init`.
  - Config merge: `installation-builder.ts#planConfigChange` (`applyLightMode(applyDelegatedSnapshot(...))`, `inSchemaOrder`, `configSummary`); `installation-service.ts:79` wires the updates, and `:80` plans the support files with the merged config.
  - `init` options: `src/cli/init-arguments.ts#INIT_OPTIONS` (paired `--light`/`--no-light`); `src/cli/init-config-updates.ts#planConfigUpdates` (`LIGHT_MODE_OPTIONS` rejects options in light mode); `light-mode-merge.ts` is the pattern for `keep | set | remove`.
  - `doctor`: `doctor-service.ts:98#buildDoctorReport`, `src/core/contracts/diagnostics.ts#doctorReportSchema`, `src/cli/output/text.ts:60`, and `src/cli/output/doctor-mode-text.ts#renderCheckpointModeLine`.
  - Schemas are generated from zod (`npm run schemas:generate`, checked by `npm run schemas:check`).

## Solution summary

`init --debug` sets the optional top-level config key `debug: true`, and `--no-debug` removes it. While `debug` is `true` and light mode is off, the rendered managed block gains one line telling the agent to end each reply that received telemetry with `📊 ContextBrake: …`. The engine also injects the telemetry block on every event, whatever `injectionMode` says. Every block writer already renders from the merged config, so enabling, disabling, and repairing the line all go through the existing plan → apply path. `remove` and the switch to light mode delete the block by markers.

`doctor` reports `debugMode: true` in `--json` and a `debug mode: on` line in text. Light mode rejects `--debug` with a usage error, and `init --light` asks for `--no-debug` while debug is on. The telemetry block format, zones, brake, and protocol file do not change.

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-01, FR-04 | Config key `debug`: optional top-level `z.optional(z.boolean())` in `configurationSchema`, placed after `lightMode` so `inSchemaOrder` keeps it before `runner`. It is on only when `true`; `init --debug` writes `true`, and `--no-debug` removes the key. | Optional sections are the existing on/off pattern (`lightMode`, `delegatedSnapshot`). A key under `telemetry` would be dropped by `normalizeTurnLimits`. | `telemetry.debug`: dropped on every `init` unless the normalizer changes. `z.literal(true)`: rejects a hand-written `false`. |
| DEC-02 | FR-01, FR-04, FR-05 | New `src/core/services/debug-mode-merge.ts`: `DebugModeFlags {debug, noDebug}`, `DebugModeUpdate = keep \| set \| remove`, `mergeDebugMode(current, flags)` (both flags → error `--debug cannot be combined with --no-debug.`), `applyDebugMode(config, update)`, `isDebugModeInEffect(config)` (`debug === true && lightMode === undefined`). | Mirrors `light-mode-merge.ts`, so `init-config-updates` and `installation-builder` compose it the same way. | Inline in `init-config-updates.ts`: mixes CLI and merge rules, and the file sits at 45 lines with room, but the merge belongs in `core`. |
| DEC-03 | FR-02, NFR-01 | `renderReferenceBlock` takes `(options: { planFile; protocolFile; debug }, eol)`. A new `referenceBlockFor(config, eol)` in `instruction-markers.ts` derives the options once through `isDebugModeInEffect`. The five call sites (`instruction-service.ts` ×4, `legacy-preview.ts` ×1) call `referenceBlockFor`. With `debug`, the line after the existing one is ``Debug mode: end each reply that received a ContextBrake telemetry block with the line `📊 ContextBrake: <usage>% · <used>/<window> · <source> · <ZONE>`, copied from the latest block.`` | One derivation point instead of a boolean threaded through each caller. A third positional parameter would hit the 4+ parameter reservation (`QA-05`). It also absorbs the `instruction-service.ts` 103-line baseline (see Terrain baseline). The placeholders `<used>`/`<window>`/`<ZONE>` are the English names of the PRD's `<usados>`/`<janela>`/`<ZONA>`. | Put the line in the protocol file: the protocol is shared by all modes and hashed in the manifest, and the user chose the managed block (`DEC-PD-01`). |
| DEC-04 | FR-03 | `InjectionInput` gains `debug: boolean`, and `decideInjection` returns `true` when `debug` is set. `telemetryDecision` passes `isDebugModeInEffect(options.config)` on the same line. The persisted `injectionMode` is untouched. | Single caller; light mode goes through the same call, so the light-mode gate lives in `isDebugModeInEffect`. `brake-engine.ts` stays at 97 lines. | Rewrite `config.telemetry.injectionMode` in memory: hides the override from tests and doctor. |
| DEC-05 | FR-05 | `init-config-updates.ts`: add `{ option: '--debug', used: (a) => a.debug === true }` to `LIGHT_MODE_OPTIONS`. In the light path, when `config.debug === true` and `--no-debug` is absent, throw `CliArgumentError` with the message ``Light mode does not use the debug mode, which is on in context-brake.config.json. Add --no-debug to turn it off.``. `ConfigUpdates` gains `debug: DebugModeUpdate`: `remove` for `--light --no-debug`, otherwise `mergeDebugMode`. | Reuses the existing light-mode option guard and error type (usage exit code). The check runs before any write. | Silently drop `debug` on `--light`: the user loses a setting without being told. |
| DEC-06 | FR-01, FR-06 | `installation-builder.ts#planConfigChange` applies `applyDebugMode` after `applyLightMode`. `configSummary` appends `set the debug mode (agent prints context usage)` or `remove the debug mode`. `ConfigChangeInput` and `InstallationInput` gain `debug?: DebugModeUpdate`, and `init.ts:74` passes `updates.debug` on the same line. | The `--dry-run` and `--json` plan already lists each change with its `preview.summary`; the instruction files show up as `Update ContextBrake reference block`. No schema change in the install report. | A new report field: more contract surface for no new information. |
| DEC-07 | FR-06 | `doctorReportSchema` gains `debugMode: z.optional(z.literal(true))`, which `doctor-service.ts:98` sets from `isDebugModeInEffect(config)`. `doctor-mode-text.ts` gains `renderModeLines(report)`, which returns the checkpoint-mode line plus `  - debug mode: on\n` when set; `text.ts:60` calls it in place of `renderCheckpointModeLine`. | An informational field, not a finding: a finding would change `doctor` status and exit code. The optional field is additive, so the schema stays `schemaVersion: 1`. `text.ts` (98 lines) and `doctor-service.ts` (99 lines) do not grow. | A `warning` finding: turns every debug session into `warnings` with exit code 1. |
| DEC-08 | FR-02, NFR-02 | No new file-writing code: enabling, disabling, and repairing the line use `planExistingInstruction`, which preserves `eol`, content outside the markers, and symlink targets (`realPath`). Tests cover LF, CRLF, and a symlinked `CLAUDE.md`. | `file-changes.md` is already satisfied by the existing writer, and the line lives inside the markers. | — |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/core/contracts/configuration.ts` | Modified | `debug` key (DEC-01) | — |
| CMP-02 | `src/core/services/debug-mode-merge.ts` | New | Merge, apply, and effective check (DEC-02) | CMP-01 |
| CMP-03 | `src/core/services/instruction-markers.ts`, `instruction-service.ts`, `legacy-preview.ts` | Modified | Render the block with the debug line (DEC-03) | CMP-02 |
| CMP-04 | `src/core/services/injection-policy.ts`, `brake-engine.ts` | Modified | Forced injection (DEC-04) | CMP-02 |
| CMP-05 | `src/cli/init-arguments.ts`, `src/cli/init-config-updates.ts`, `src/cli/commands/init.ts` | Modified | `--debug`/`--no-debug` parsing, conflicts, and wiring (DEC-05, DEC-06) | CMP-02 |
| CMP-06 | `src/core/services/installation-builder.ts`, `installation-service.ts` | Modified | Apply the update and summary (DEC-06) | CMP-02 |
| CMP-07 | `src/core/contracts/diagnostics.ts`, `doctor-service.ts`, `src/cli/output/doctor-mode-text.ts`, `text.ts` | Modified | `debugMode` in the doctor report and text (DEC-07) | CMP-02 |
| CMP-08 | `schemas/context-brake.config.schema.json`, `schemas/doctor-report.schema.json`, `README.md` | Regenerated / modified | Published contracts and user docs | CMP-01, CMP-07 |

Flow: `init --debug` → `parseInit` → `planConfigUpdates` returns `debug: set` → `planConfigChange` writes `debug: true` → `planSupportFiles(…, merged config)` → `referenceBlockFor` renders the extra line → the existing plan is printed or applied. At runtime, the hook reads the config → `telemetryDecision` → `decideInjection({…, debug: true})` → the block is injected on every event → the agent follows the managed-block line.

## Contracts and data

- `context-brake.config.json`: optional `debug` (boolean). Absent or `false` means off. It is written as `true` by `init --debug` and removed by `init --no-debug`. Older configs stay valid, and a config written with `debug` is rejected by older ContextBrake versions because of `strictObject`; that is acceptable because the version that writes it also reads it.
- Managed block (agent-facing text), with debug on:

  ```text
  <!-- CONTEXTBRAKE:START -->
  When `task_plan.json` exists or tool results include a ContextBrake telemetry block, follow `docs/context-brake-protocol.md`.
  Debug mode: end each reply that received a ContextBrake telemetry block with the line `📊 ContextBrake: <usage>% · <used>/<window> · <source> · <ZONE>`, copied from the latest block.
  <!-- CONTEXTBRAKE:END -->
  ```

  With debug off, the block is byte-for-byte the current one.
- `doctor --json`: optional `debugMode: true`, absent when off or in light mode. `schemaVersion` stays 1.
- `init` exit codes: usage errors reuse the existing `CliArgumentError` code. No new code.

## Errors, security, and recovery

- Errors: `--debug --no-debug`; `--light --debug`; `--debug` with light mode configured; `--light` with debug configured and without `--no-debug`. Each is a usage error printed to stderr in English that names the option and the fix, and nothing is written.
- Edges: a hand-edited `debug: true` together with `lightMode` is ignored at runtime and in doctor (`isDebugModeInEffect`), and the next `init` without `--no-light` hits the DEC-05 error. `--no-debug` when debug is off is a no-op (`keep`).
- User files: changes stay inside the markers; LF/CRLF and symlinks are preserved by the existing writer (DEC-08).
- Idempotency: a second `init --debug` plans no change (`existing === target`, the config is unchanged).
- Reversal: `init --no-debug` restores the pre-debug bytes (FR-04), and `remove` deletes the block by markers.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| T01 Core, config, and `init` (CMP-01–CMP-06, schema regeneration for config) | — | TC-01–TC-09 pass; `schemas:check` passes |
| T02 Doctor, end-to-end, and docs (CMP-07, CMP-08) | T01 | TC-10–TC-13 pass; full validation |

## Test approach

- Profile: runtime surfaces are the CLI (`init`, `doctor`) and the hook engine (one process per event). Node.js 20+, TypeScript ESM, and Vitest. Commands from `AGENTS.md`: `npm run build`, `npm run typecheck`, `npm run lint`, `npm run coverage`, and `npm run schemas:check`.
- End-to-end: the built CLI against fixture repositories in temporary directories (`tests/e2e/`, process lane by directory).
- Platforms: Windows locally, and Linux and macOS through CI. The symlink case uses the existing symlink fixture helper and is skipped where symlinks are unavailable, as existing tests do.
- Manual acceptance (optional, owner: user): in a repo with Claude Code, run `init --debug --yes`, then run a task with tool calls. Each reply should end with the `📊 ContextBrake:` line, and its percentage can be compared with `/context` or the status line.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-01, FR-04 | unit | `mergeDebugMode`/`applyDebugMode`/`isDebugModeInEffect`: each flag combination × current state, including light mode | `set`/`remove`/`keep`, the conflict error, and an effective flag that is false in light mode | `tests/unit/debug-mode-merge.test.ts` |
| TC-02 | FR-01, FR-04 | unit | `parseInit` with `--debug`, `--no-debug`, both, neither | Flags parsed; both give the conflict error through the merge | `tests/unit/init-arguments.test.ts` |
| TC-03 | FR-02, NFR-01 | unit | `referenceBlockFor` with debug on/off, LF and CRLF | Off matches the current block exactly; on adds the exact line; the line is at most 60 `o200k_base` tokens | `tests/unit/instruction-markers.test.ts` |
| TC-04 | FR-03 | unit | `decideInjection` with `threshold_only`, `GREEN`, 10%, and `debug` true/false | `true` / `false` | `tests/unit/injection-policy.test.ts` |
| TC-05 | FR-03 | integration | Engine post-tool event at 10% `GREEN` with config `debug: true`, `false`, and `true` + `lightMode` | Telemetry block, neutral, neutral; `injectionMode` unchanged | `tests/integration/debug-injection.test.ts` |
| TC-06 | FR-01, FR-02, FR-04, NFR-02 | integration | `init --debug --yes`, then `init --yes`, then `init --no-debug --yes` on a temp repo with `AGENTS.md` (LF), `CLAUDE.md` (CRLF), and a symlinked instruction file | Config has `debug: true` and passes the schema; blocks carry the line; the second run changes nothing; after `--no-debug`, bytes equal a fresh install without debug; the symlink survives | `tests/integration/init-debug-mode.test.ts` |
| TC-07 | FR-05 | integration | `--light --debug`; `--debug` with light configured; `--light` with debug configured; `--light --no-debug` with debug configured | First three: usage error naming the option, no file changes; last: light mode on and no `debug` key | `tests/integration/init-debug-mode.test.ts` |
| TC-08 | FR-06 | integration | `init --debug --dry-run --json` | The plan lists the config change with the debug summary and the instruction updates; the report passes `installReportSchema` | `tests/integration/init-debug-mode.test.ts` |
| TC-09 | FR-06 | integration | With debug on, remove the debug line by hand, then `init --yes` | The block returns to the FR-02 form | `tests/integration/init-debug-mode.test.ts` |
| TC-10 | FR-06 | unit | `renderModeLines` with/without `debugMode` and with a checkpoint mode | Text includes `  - debug mode: on` only when set | `tests/unit/doctor-mode-text.test.ts` |
| TC-11 | FR-06 | end-to-end | Built CLI: `init --debug --yes`, `doctor`, `doctor --json`, `remove --yes` | Text shows `debug mode: on`; JSON has `debugMode: true` and passes `doctorReportSchema`; the status does not change because of debug; after `remove`, no `Debug mode:` line in any file | `tests/e2e/e2e-debug-mode.test.ts` |
| TC-12 | FR-03 | end-to-end | Built hook entrypoint with a Claude Code post-tool fixture at low usage and `debug: true` | The response carries `[ContextBrake v2]` | `tests/e2e/e2e-debug-mode.test.ts` |
| TC-13 | FR-01, FR-06 | contract | Generated schemas include `debug` and `debugMode` | `npm run schemas:check` passes | `npm run schemas:check` |

## Quality profile

A blocking hit prevents task completion and rejects the review; a reservation becomes an optional improvement. Scope: TypeScript files in the task diff; `core_files` is the subset under `src/core/`; `hook_files` = `src/core/services/injection-policy.ts`, `src/core/services/brake-engine.ts`.

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `rg -n --type ts ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | — |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n --type ts '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-03 | `core` importing `infrastructure` or `cli` | blocking | `rg -n --type ts "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-04 | `console.log` / `process.stdout.write` on the hook path | blocking | `rg -n --type ts 'console\.log\|process\.stdout\.write' "${hook_files[@]}"` | — |
| QA-05 | 4+ parameters in one declaration | reservation | `rg -n --type ts '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"` | — |
| QA-06 | `throw new Error(` where `CliArgumentError` fits | reservation | `rg -n --type ts 'throw new Error\(' "${files[@]}"` | — |
| QA-07 | File above 100 lines | reservation | `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | — |

- Escalation trigger: 8+ reservation hits, a touched file above 200 lines, or the same block duplicated in 3+ places.

### Terrain baseline

Measured on 2026-09-28 at `791defe` (Git Bash, measures from `preparatory-refactoring.md`). No QA-01–QA-06 hits in any target file.

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/core/services/instruction-service.ts` | 103 | 3 | <4 | 0 | `QA-07: 103 lines` | absorbed in `DEC-03`: four `renderReferenceBlock(config.stateStorage.planFile, config.instructionFiles.protocolFile, …)` calls become `referenceBlockFor(config, …)`; the file must not grow |
| `src/core/contracts/diagnostics.ts` | 68 | 16 | <4 | 0 | 16 exports (structural only) | recorded; the feature adds a field, not an export |
| `src/core/services/doctor-service.ts` | 99 | 2 | <4 | 0 | — | recorded; DEC-07 keeps the change on line 98 |
| `src/cli/output/text.ts` | 98 | 7 | <4 | 0 | — | recorded; DEC-07 replaces one call |
| `src/core/services/installation-service.ts` | 98 | — | <4 | 0 | — | recorded; one input field line (≤ 99) |
| `src/core/services/brake-engine.ts` | 97 | 7 | <4 | 5 | — | recorded; DEC-04 edits line 63 in place |
| `src/cli/commands/init.ts` | 95 | 4 | <4 | 0 | — | recorded; DEC-06 edits line 74 in place |
| `src/core/contracts/configuration.ts` | 81 | 9 | <4 | 0 | — | recorded |
| `src/core/services/installation-builder.ts` | 81 | 4 | <4 | 0 | — | recorded |
| `src/cli/init-arguments.ts` | 64 | 3 | <4 | 0 | — | recorded |
| `src/cli/init-config-updates.ts` | 45 | 2 | <4 | 0 | — | recorded |
| `src/core/services/instruction-markers.ts` | 43 | 7 | 3 | 0 | — | recorded; DEC-03 replaces the positional parameters with an options object |
| `src/core/services/legacy-preview.ts` | 36 | 2 | <4 | 0 | — | recorded |
| `src/core/services/injection-policy.ts` | 13 | 2 | <4 | 0 | — | recorded |
| `src/cli/output/doctor-mode-text.ts` | 7 | 1 | <4 | 0 | — | recorded |

- Preparatory refactoring: not recommended. The one file that is both structural and in contact (`instruction-service.ts`: 103 lines, 4 call sites) is absorbed by DEC-03. The extraction is local, keeps the public contract, and fits T01.

## Observability and rollout

- Signals: `doctor` shows `debug mode: on`; the `init` plan summary names the debug change.
- Migration and compatibility: additive and optional; with debug off, the managed block and config are byte-for-byte unchanged, so existing installs see no drift.
- Rollout and rollback: `init --no-debug` or `remove`.

## Risks and open items

- Risk: the agent may skip the line on some replies (the PRD accepts this). Mitigation: the instruction lives in the always-loaded instruction files, and forced injection keeps a reading available.
- Risk: forced injection adds one telemetry block (≤60 tokens) per tool call while debug is on. This is intended for a diagnostic mode and documented in the README.
- Open item: none.

## Relevant files

- Modify: `src/core/contracts/configuration.ts`, `src/core/contracts/diagnostics.ts`, `src/core/services/instruction-markers.ts`, `src/core/services/instruction-service.ts`, `src/core/services/legacy-preview.ts`, `src/core/services/injection-policy.ts`, `src/core/services/brake-engine.ts`, `src/core/services/installation-builder.ts`, `src/core/services/installation-service.ts`, `src/core/services/doctor-service.ts`, `src/cli/init-arguments.ts`, `src/cli/init-config-updates.ts`, `src/cli/commands/init.ts`, `src/cli/output/doctor-mode-text.ts`, `src/cli/output/text.ts`, `schemas/context-brake.config.schema.json`, `schemas/doctor-report.schema.json`, `README.md`, tests listed above.
- Create: `src/core/services/debug-mode-merge.ts`, `tests/unit/debug-mode-merge.test.ts`, `tests/unit/instruction-markers.test.ts` (if absent), `tests/unit/doctor-mode-text.test.ts` (if absent), `tests/integration/debug-injection.test.ts`, `tests/integration/init-debug-mode.test.ts`, `tests/e2e/e2e-debug-mode.test.ts`.
