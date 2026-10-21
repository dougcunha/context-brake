# TechSpec — `context-brake fix` command

## Sources and traceability

- PRD: `tasks/prd-24-doctor-fix-command/prd.md` (approved, workflow A-01)
- Applicable instructions and rules: `AGENTS.md`; `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`, `file-changes.md`, `cli-output.md`
- Research: `docs/research/harness-integrations.md` is not changed: `fix` adds no harness behavior; it reruns the existing `init` plan
- Evidence in existing code (worktree at `419c0bd` plus the uncommitted prd-22 and prd-23 diffs):
  - Finding schema `.strict()` with 8 fields: `src/core/contracts/diagnostics.ts:9`; `CLI_ERROR_COMMANDS`: `:29`
  - No central finding factory; about 20 creation sites (core services, `common/diagnostic-helpers.ts`, `claude-code/statusline-diagnostics.ts:76`, `claude-code/auto-restart-diagnostics.ts:60`, `common/restart-diagnostics.ts:34`)
  - `init` planning and rendering are mixed in `executeInit`: `src/cli/init-flow.ts:56-77`; doctor diagnosis and rendering are mixed in `runDoctor`: `src/cli/commands/doctor.ts:38-62`
  - `planInstallation` defaults missing config updates to KEEP: `src/core/services/installation-builder.ts:37-40`
  - Modified owned assets always become a `MODIFIED_OWNED_ASSET` conflict and are never written: `src/core/services/asset-currency.ts:152-179`, called at `installation-service.ts:76`; no force option exists
  - Status line request `'default'` without an opt-out file reinstalls the bridge: `claude-code/statusline-planner.ts:28-33`; mod source (Claude Code 2.1.287 or later, request not `install`) restores the previous status line and deletes the bridge: `claude-code/context-source.ts:14-18`, `claude-code/statusline-migration.ts:21-25`
  - `STATUSLINE_BRIDGE_INACTIVE` condition: `claude-code/statusline-diagnostics.ts:38`
  - Restart-gated finding: `AUTO_RESTART_OUTDATED_MOD` from the session log version (`claude-code/auto-restart-diagnostics.ts:23-25`, `common/restart-diagnostics.ts:39`) stays until the harness restarts
  - Unrecognized-keys-only config errors carry `UNRECOGNIZED_KEYS_REMEDIATION`: `src/core/validation/configuration-validator.ts:6-11`; doctor copies it into the finding: `src/core/services/doctor-checks.ts:8-17`
  - `--harness <id>` makes an undetected harness `project`: `src/core/services/detection-service.ts:29`, `harness-exclusion.ts:12-18`
  - Prompt port and test fake: `src/cli/assistant/prompt-port.ts:4-51`, `src/cli/assistant/ui-prompt.ts:5-9`, `tests/helpers/scripted-prompts.ts`; terminal injection: `CommandEnv.terminal` (`init-flow.ts:26`), `tests/helpers/in-process-cli.ts:11-27`
  - Schema lists hard-coded in 5 places: `scripts/generate-schemas.ts`, `scripts/check-schemas.ts`, `scripts/check-package.ts:19-21`, `tests/unit/schemas.test.ts:4`, `tests/integration/package-contents.test.ts:15-16`
  - Doctor text from prd-23: `src/cli/output/doctor-rows.ts:32-37` (problem row notes array, prd-23 DEC-06), `src/cli/output/doctor-text.ts:24-33` (header)

## Solution summary

Doctor classifies every `warning` and `error` finding into a fix group (`automatic`, `decision`, `manual`) after the diagnosis, from a core map for the cross-harness codes and an optional map on each harness adapter for its own codes. The doctor JSON gets the optional `fix` field, and the doctor text points fixable problems to `context-brake fix`.

`context-brake fix` runs the same diagnosis, resolves each `decision` finding (prompt on a TTY, flags otherwise), and builds one change plan through the existing `init` planner with the current configuration plus the decision overrides. It shows the plan, asks for confirmation, applies the plan with the existing change applier, runs the diagnosis again, and reports one outcome per finding. Two narrow planner inputs make the decisions possible: a set of modified asset paths that the user allowed to overwrite, and a status line request `keep` that plans no status line change.

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-01, FR-15 | The finding schema gains `fix: { group }` as an optional strict object. Groups are assigned once, after the doctor diagnosis, by `assignFixGroups(findings, adapters)`: severity `ok` gets no `fix`; otherwise the group comes from the adapter map of `finding.harness`, then the core map, then `manual`. Producers do not change. | PRD constraint: harness-specific codes keep their classification in their adapter; the adapter map does that. One assignment point keeps `fix` out of `init` and `remove` reports. No producer edit across about 20 creation sites | Each producer sets `fix`: 15+ edits, and `init` reports would carry the field. A single core map: violates the adapter constraint |
| DEC-02 | FR-01 | Core map (`CORE_FIX_GROUPS`): `automatic` for `ASSET_MISSING`, `ASSET_OUTDATED`, `INTEGRATION_MISSING`, `CONFIG_MISSING`, `LEGACY_TURN_LIMITS`; `decision` for `ASSET_MODIFIED`, `NO_PROJECT_HARNESS`. `INVALID_CONTEXTBRAKE_CONFIG` is `automatic` only when `finding.remediation === UNRECOGNIZED_KEYS_REMEDIATION`, else `manual`. Claude Code map: `automatic` for `STATUSLINE_BRIDGE_OUTDATED`, `STATUSLINE_BRIDGE_MISSING_SCRIPT`, `STATUSLINE_STATE_INVALID`, `STATUSLINE_PREVIOUS_CHANGED`, `STATUSLINE_BRIDGE_ABSENT`, `AUTO_RESTART_OUTDATED_MOD`; `decision` for `STATUSLINE_BRIDGE_INACTIVE`. Pi and Oh-My-Pi maps: `automatic` for `AUTO_RESTART_OUTDATED_MOD`. Every other code is `manual`. | PRD classification table. The validator sets that remediation only for unrecognized keys (`configuration-validator.ts:11`), the cause that `init` repairs (`configuration-sanitizer.ts:23-33`) | Expose the issue list on the finding: a schema change for one code |
| DEC-03 | FR-03, NFR-01 | New `planInit(env, request)` in `src/cli/init-plan.ts` returns the `InstallationResult` and the extra findings without printing. `executeInit` calls it. `fix` calls it with `harness` from the `NO_PROJECT_HARNESS` decision, `statuslineBridge` from the `STATUSLINE_BRIDGE_INACTIVE` decision (default `'default'`), `overwritePaths` from the `ASSET_MODIFIED` decisions, and no config update (`undefined`, read as KEEP). `ctx.autoRestart` stays `isAutoRestartWanted(config?.autoRestart, KEEP)`. | One planner for `init` and `fix` (`file-changes.md`: plan before writing); config choices stay because every update is KEEP (`installation-builder.ts:37-40`) | Build a fake `ParsedInitArgs` with no flags: couples `fix` to the init parser |
| DEC-04 | FR-05, FR-06, NFR-02 | `InstallationInput` gains `overwritePaths?: ReadonlySet<string>`. `protectModifiedAssets` takes one options object `{ manifest, snapshots, overwritePaths }` and keeps a modified asset change when its path is in the set. The kept asset gets the new manifest hash like any written asset. | The only path that writes a modified owned asset, and only with an explicit answer or `--force` | A post-plan patch in `fix`: duplicates the asset logic |
| DEC-05 | FR-05, FR-06 | `StatuslineBridgeRequest` gains `'keep'`. `planStatuslineInstall` returns an empty status line plan for `'keep'` before it picks the bridge or the mod source (no bridge asset, no entry, no restore, no deletion). `decideContextSource` treats `'keep'` as `'default'`. `init` never produces `'keep'`. Answers: reinstall gives `'install'`, forget gives `'remove'`, skip gives `'keep'`. | Skip must change nothing; `'default'` reinstalls the bridge (`statusline-planner.ts:30`) or migrates to the mod (`statusline-migration.ts:21-25`) | Filter status line paths out of the plan in `fix`: the CLI would know adapter paths |
| DEC-06 | FR-05, FR-09 | When `STATUSLINE_BRIDGE_INACTIVE` is skipped, the other `claude-code` findings whose code starts with `STATUSLINE_` are `skipped` with reason `Skipped with STATUSLINE_BRIDGE_INACTIVE: the status line stays as it is.` | The adapter plans the status line as one unit, so `'keep'` also skips their changes | Report them `failed`: wrong cause |
| DEC-07 | FR-09, FR-10 | Outcome per finding of the first diagnosis, matched to the second diagnosis by `code`, `harness`, and `path`: `manual` (group `manual`, detail = remediation); `skipped` (decision not taken, or DEC-06, or DEC-10; detail = reason); `failed` (a plan change with the same path has applier status `failed`, detail = applier detail; or the finding is still reported, detail `Still reported after the fix: <message>`); else `fixed`. Exception: a restart-gated code (`AUTO_RESTART_OUTDATED_MOD`) that is still reported and has no failed change is `fixed`. A `fixed` restart-gated finding has the detail `Restart <harness label> to load the new mod.`. In a dry run, findings that would be fixed are `planned`. | FR-09 outcomes; the session log keeps the old mod version until the harness restarts | Report restart-gated codes `failed`: the plan did all that `fix` can do |
| DEC-08 | FR-13, NFR-05 | Exit code: applied run = `max(final doctor exit code, 2 if an applier outcome is failed)`. Dry run, cancelled run, not installed (FR-11), and nothing to fix (FR-12) = first doctor exit code. Invalid arguments = 64 through `CliArgumentError`. All values from `EXIT_CODES`. | FR-13 | — |
| DEC-09 | FR-04, FR-06, FR-07, FR-14, NFR-03 | Arguments: `--dry-run`, `--yes`/`-y`, `--force`, `--harness <id>` (repeatable, validated), `--json`. `--json` without `--yes` or `--dry-run` is invalid (64). `--force` without `--yes` or `--dry-run` is invalid (64). `--harness` answers `NO_PROJECT_HARNESS` on a TTY and with `--yes`, with or without `--force`. A run is interactive when stdin and stdout are TTYs and neither `--yes`, `--dry-run`, nor `--json` is set; only then does `fix` prompt. | `cli-output.md`: never prompt without a TTY, every confirmation has a flag. `--harness` names the harness, which is the explicit consent FR-06 asks for | Accept `--force` on a TTY and skip its questions: two ways to consent on one run |
| DEC-10 | FR-11, FR-12, FR-09 | Order of checks: (1) parse; (2) first diagnosis; (3) not installed: no `context-brake.config.json` and no manifest → report `stopped: not_installed`; (4) nothing in `automatic` or `decision` → `stopped: nothing_to_fix`; (5) first diagnosis has a `manual` `INVALID_CONTEXTBRAKE_CONFIG` → no plan, every `automatic` and `decision` finding `skipped` with `context-brake.config.json cannot be read. Fix it first.`; (6) decisions; (7) plan; (8) dry run → report; (9) not interactive and no `--yes` and the plan has changes → `ConfirmationRequiredError` (exit 2, nothing written); (10) interactive and the plan has changes → confirm, a `no` prints `Nothing was written.`; (11) apply; (12) second diagnosis; (13) report. | Check 3 runs before planning, because `planInstallation` returns before the config is planned when no harness is active (`installation-service.ts:71`). Check 5 avoids the planner exception from `loadInitConfigState` (`init-config-state.ts:18-21`) | — |
| DEC-11 | FR-02 | Doctor text: a problem in group `automatic` or `decision` replaces its `Fix: <remediation>` note with `Fix: run context-brake fix`. The header summary adds `, N fixable` when N is at least 1, where N counts `automatic` and `decision` problems. JSON keeps `remediation` unchanged. | prd-23 DEC-06 keeps `notes` as an array for this; two `Fix:` lines on one problem would conflict | Add a second note: two fixes for one problem |
| DEC-12 | FR-04, FR-05, FR-09 | Text output uses `renderCard` cards like doctor (prd-23 DEC-01): summary line `ContextBrake fix: <a> fixable, <d> need a decision, <m> manual`; on a TTY one question per decision; cards `Plan` (rows `create`/`update`/`delete` + path, with the code of a finding that has the same path), `Conflicts` (when present), `Manual` (code + remediation); confirmation `Apply the plan? [y/N]`; card `Result` (labels `FIXED`, `SKIPPED`, `MANUAL`, `FAILED`, `PLANNED`, notes = detail); then the doctor header line of the final report. A dry run prints `Dry run: no file was changed.` before the doctor line. | One visual language with doctor; text labels for every status (NFR-03) | Bare text as in the PRD sample: the PRD sample is an example |
| DEC-13 | FR-05 | Questions use `PromptPort`. `ASSET_MODIFIED`: `confirmWithPort` with `Replace the modified file <path> with the installed version?` (no = keep). `STATUSLINE_BRIDGE_INACTIVE`: `askUi` select with `reinstall`, `forget`, `skip` (initial `skip`); without `askUi`, text `The status line bridge is inactive. Reinstall (r), forget (f), or skip (s)? [s] `. `NO_PROJECT_HARNESS`: select of the harness ids plus `skip`; text fallback `No harness is active. Type a harness id to install, or press Enter to skip: `; an unknown id is `skipped` with `Unknown harness '<id>'.`. A `null` answer (input closed) is skip. | `ScriptedPrompts` has no `askUi`, so tests drive the text path; the readline and clack ports keep working | `authorizeWrite`: private readline, not testable with the fake |
| DEC-14 | FR-14, FR-15 | New `src/core/contracts/fix.ts` (groups, outcomes, `fix` field schema) and `src/core/contracts/fix-report.ts` (`fixReportSchema`). `diagnostics.ts` only imports the field schema and adds `fix` to `CLI_ERROR_COMMANDS`; it gets no new export. The fix report holds its own plan summary schema. Published file `schemas/fix-report.schema.json`; the 5 schema lists gain it. `doctor-report.schema.json` and `install-report.schema.json` regenerate with the optional field; `schemaVersion` stays 1. | `diagnostics.ts` already has 14 exports (terrain baseline); a new file absorbs the growth | Export the module-local `plan` schema: one more export on a saturated module |
| DEC-15 | FR-16 | `renderHelp` adds `context-brake fix [options]` to Usage and `fix      Correct the problems that doctor finds and ContextBrake can fix` to Commands, with no option list (same form as the other commands, prd-23 DEC-11). The README command table gets a `fix` row; the Diagnostics text explains the groups, the `fix` field, and the `Fix: run context-brake fix` line. | FR-16 acceptance names the README table; help keeps one form | An options block for `fix` only: inconsistent help |
| DEC-16 | FR-10 | The harness label for the restart note comes from one map in `src/cli/output/` (`claude-code` → `Claude Code`, `pi` → `Pi`, `oh-my-pi` → `Oh-My-Pi`); other ids print as the id. Reuse an existing label map in `src/` if the implementer finds one. | The restart specs hold labels in infrastructure (`common/restart-diagnostics.ts`); the CLI must not import adapter internals for text | — |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/core/contracts/fix.ts` | New | `FIX_GROUPS`, `FixGroup`, `FIX_OUTCOMES`, `fixFieldSchema` | — |
| CMP-02 | `src/core/contracts/diagnostics.ts` | Modified | Optional `fix` on findings; `fix` in `CLI_ERROR_COMMANDS` | CMP-01 |
| CMP-03 | `src/core/contracts/fix-report.ts` | New | `fixReportSchema`, `FixReport` type | CMP-01, CMP-02 |
| CMP-04 | `src/core/contracts/adapter.ts` | Modified | `HarnessAdapter.fixGroups?`; `StatuslineBridgeRequest` adds `'keep'` | CMP-01 |
| CMP-05 | `src/core/services/fix-groups.ts` | New | `CORE_FIX_GROUPS`, `assignFixGroups` (DEC-01, DEC-02) | CMP-01, CMP-04 |
| CMP-06 | `src/infrastructure/harnesses/claude-code/fix-groups.ts`, `claude-code/adapter.ts`, `pi/adapter.ts`, `oh-my-pi/adapter.ts` | New and modified | Adapter fix maps (DEC-02) | CMP-04 |
| CMP-07 | `src/infrastructure/harnesses/claude-code/statusline-planner.ts`, `context-source.ts` | Modified | `'keep'` request (DEC-05) | CMP-04 |
| CMP-08 | `src/core/services/asset-currency.ts`, `installation-service.ts` | Modified | `overwritePaths` (DEC-04) | — |
| CMP-09 | `src/cli/init-plan.ts`, `src/cli/init-flow.ts` | New and modified | `planInit` without output (DEC-03) | CMP-08 |
| CMP-10 | `src/cli/doctor-diagnosis.ts`, `src/cli/commands/doctor.ts` | New and modified | `diagnoseDoctor(env, harness)`: config read, diagnosis, restart findings, `assignFixGroups`; `runDoctor` renders it | CMP-05 |
| CMP-11 | `src/cli/output/doctor-rows.ts`, `doctor-text.ts` | Modified | FR-02 note and header count (DEC-11) | CMP-02 |
| CMP-12 | `src/core/services/fix-outcomes.ts` | New | Pure: group the findings, apply DEC-06 and DEC-07, compute the exit code (DEC-08), build the report through `fixReportSchema` | CMP-03 |
| CMP-13 | `src/cli/fix-arguments.ts`, `src/cli/argument-parser.ts` | New and modified | `parseFix` and validation (DEC-09) | — |
| CMP-14 | `src/cli/fix-decisions.ts` | New | Resolve decisions from prompts or flags into planner overrides and skip reasons (DEC-05, DEC-09, DEC-13) | CMP-04 |
| CMP-15 | `src/cli/commands/fix.ts` | New | `runFix`: DEC-10 sequence | CMP-09, CMP-10, CMP-12, CMP-14, CMP-16 |
| CMP-16 | `src/cli/output/fix-text.ts` (split into `fix-rows.ts` if above 100 lines) | New | Text format (DEC-12, DEC-16) | CMP-03 |
| CMP-17 | `src/cli/composition-root.ts`, `src/cli/main.ts` | Modified | Dispatch `fix`, help (DEC-15); `handleParseError` maps `fix` | CMP-13, CMP-15 |
| CMP-18 | `scripts/generate-schemas.ts`, `scripts/check-schemas.ts`, `scripts/check-package.ts`, `schemas/*.schema.json`, `README.md` | Modified and new | Published schema and docs (DEC-14, DEC-15) | CMP-03 |

Flow of `context-brake fix`: the parser builds `ParsedFixArgs`; `runFix` calls `diagnoseDoctor` (same function as `doctor`, so both see the same findings and groups), applies the DEC-10 checks, resolves decisions with `fix-decisions`, calls `planInit` with the overrides, prints or reports the plan, confirms, applies through `NodeChangeApplier`, calls `diagnoseDoctor` again, and passes both reports, the decisions, and the applier outcomes to `buildFixReport`. The text renderer or `renderJsonOutput` writes the result to stdout.

## Contracts and data

### Doctor finding (`doctor-report.schema.json`, `install-report.schema.json`)

- New optional field `fix: { group: 'automatic' | 'decision' | 'manual' }`, strict. Doctor sets it on every `warning` and `error` finding and never on `ok`. `init` and `remove` never set it; the shared finding schema makes it optional in both published schemas.
- `schemaVersion` stays 1. A document without `fix` validates (FR-15).

### Fix report (`schemas/fix-report.schema.json`, new)

| Field | Type | Notes |
| --- | --- | --- |
| `schemaVersion` | `1` | — |
| `command` | `'fix'` | — |
| `mode` | `'dry_run' \| 'applied'` | `applied` for every non-dry run, also when `stopped` is set |
| `stopped` | `null \| 'not_installed' \| 'nothing_to_fix'` | FR-11, FR-12; JSON never prompts, so no cancel state |
| `status` | `'healthy' \| 'warnings' \| 'errors'` | From `exitCode` |
| `exitCode` | `0 \| 1 \| 2` | DEC-08 |
| `plan` | `{ changes: { path, kind, owner, summary }[], conflicts: { path, code, detail }[] }` | Empty arrays when no plan was built |
| `outcomes` | `{ code, harness, path, group, outcome, detail }[]` | `outcome` in `fixed`, `skipped`, `manual`, `failed`, `planned`; `detail` string or null; one item per `warning` or `error` finding of the first diagnosis |
| `doctor` | doctor report | Final diagnosis; the first diagnosis for a dry run or a stopped run |

### Errors

- `CLI_ERROR_COMMANDS` adds `fix`. `CONFIRMATION_REQUIRED` (exit 2) and `INVALID_ARGUMENTS` (exit 64) reuse the existing error documents. `main.ts` `handleParseError` maps a `fix` first argument to `command: 'fix'`.

## Integrations and interfaces

- CLI: `context-brake fix [--dry-run] [--yes|-y] [--force] [--harness <id>]... [--json]`.
- Files: written only by `NodeChangeApplier` from the `init` plan (atomic write, symlink target, hash check between plan and apply; `file-changes.md`). No instruction file, no user settings, no Git index.
- Harnesses: no new hook or event. The Claude Code adapter adds the `'keep'` planner branch and its fix map; Pi and Oh-My-Pi add their fix maps.

## Errors, security, and recovery

- A failed write is an applier outcome `failed`; `fix` reports it, exit 2, and the second diagnosis shows the remaining state.
- A config file that cannot be read stops planning (DEC-10 step 5); `fix` changes nothing.
- An unexpected exception follows `composition-root` handling with `command: 'fix'`.
- User files: a modified owned asset is written only after a `yes` answer or `--yes --force` (NFR-02). `ASSET_MODIFIED` default answer is no.
- Concurrency: none beyond `init` today; the applier refuses a file whose hash changed after planning.
- Reversal: `context-brake remove` and Git; `fix` writes nothing that `init` would not write, except the overwritten modified asset the user allowed.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| 1. Fix groups: CMP-01, CMP-02, CMP-04 (field only), CMP-05, CMP-06, CMP-10, CMP-11, schema regeneration for doctor and install | — | Unit tests per classification source; doctor JSON has `fix`; doctor text shows the fix line and count; `npm run schemas:check` passes |
| 2. Planner inputs: CMP-04 (`'keep'`), CMP-07, CMP-08, CMP-09 | — | Unit and integration tests: `overwritePaths` writes the modified asset; `'keep'` plans no status line change on both sources; `init` output unchanged |
| 3. Fix core: CMP-03, CMP-12, CMP-13 | 1 | Unit tests for outcomes, exit codes, argument rules |
| 4. Fix command: CMP-14, CMP-15, CMP-16, CMP-17 | 2, 3 | Integration tests FR-03 to FR-13 in process |
| 5. Publication: CMP-18, e2e smoke | 4 | `schemas:check`, `tests/e2e/e2e-fix.test.ts`, README |

## Test approach

- Profile: CLI command surface only (`src/cli/`, `src/core/`); the Claude Code planner change runs inside `init` and `fix`, not in a hook. Node.js 20+, ESM TypeScript (`tsconfig.json`), Vitest. Commands from `AGENTS.md`: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run schemas:check`, `npm run build`, `npm run test:budget`.
- In process: integration tests use `runInProcessCliWith` with `terminal` and `ScriptedPrompts` overrides, `fakeOverheadMeasurer`, and `fakeProcessRunner`. One shared world in `tests/helpers/fix-world.ts` installs a Claude Code fixture with `init --yes` and then changes it: an outdated asset (asset content and manifest hash set to an older content), a modified asset (asset content changed, manifest unchanged), removed mod files with `autoRestart` on, a config with an unrecognized key, an inactive bridge (local `statusLine` changed).
- End-to-end: `tests/e2e/e2e-fix.test.ts` runs the built CLI `fix --dry-run --json` on an installed fixture with 1 outdated asset, validates the document with `fixReportSchema`, checks exit code = `exitCode`, and checks file hashes are unchanged. `.agents/rules/tests.md` names init, doctor, and remove in the e2e list; the new file follows the same per-command rule (open item for the rule text).
- CLI QA (`sdd-execute-qa`) runs after the review: this TechSpec has an end-to-end case and the TTY flow (FR-04, FR-05) has a manual acceptance script below.
- Platforms: tests run on Windows locally; paths go through the existing planner and applier, which handle symlinks and line endings. Linux and macOS stay unverified locally and are covered by CI.
- Budget: `test:budget` was 193.9 s against 180 s in prd-23 under machine load. Keep new integration tests to the cases below, share one world per file, and run `npm run test:budget` at the end; a result above budget goes to the review as an open item for the repository owner, as in prd-23.
- Manual acceptance (QA owner): in a fixture with an outdated asset, a modified asset, and an inactive bridge, run `context-brake fix` on a real terminal; answer `n` to the replace question, `s` to the bridge question, `y` to apply. Expected: the plan before the confirmation, `FIXED` for the outdated asset, `SKIPPED` for the 2 decisions, the doctor line last, and the modified file unchanged.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-01, DEC-02 | unit | Each code of the PRD table through `assignFixGroups` with the core map and each adapter map; `ok` finding | Listed group; no `fix` on `ok`; unknown warning code is `manual` | `tests/unit/fix-groups.test.ts` |
| TC-02 | FR-01 | unit | `INVALID_CONTEXTBRAKE_CONFIG` with `UNRECOGNIZED_KEYS_REMEDIATION` and with the syntax remediation | `automatic`; `manual` | `tests/unit/fix-groups.test.ts` |
| TC-03 | FR-02, DEC-11 | unit | Report with 1 automatic and 1 manual warning | Header `(0 errors, 2 warnings, 1 fixable)`; 1 `Fix: run context-brake fix` note; the manual problem keeps its remediation | `tests/unit/doctor-text.test.ts` |
| TC-04 | FR-15 | unit | Doctor document without `fix` and with `fix` | Both validate; `schemaVersion` 1 | `tests/unit/schemas.test.ts` |
| TC-05 | FR-01 | integration | `doctor --json` on the world with an outdated asset | Finding `ASSET_OUTDATED` has `fix.group: automatic` | `tests/integration/doctor-fix-groups.test.ts` |
| TC-06 | DEC-04 | unit | `protectModifiedAssets` with and without the path in `overwritePaths` | Change kept; conflict otherwise | `tests/unit/asset-currency.test.ts` (existing file if present) |
| TC-07 | DEC-05 | integration | Claude Code planner with `'keep'` on bridge source and mod source | No status line change on either source | `tests/integration/statusline-keep.test.ts` |
| TC-08 | DEC-07, DEC-08, FR-13 | unit | `buildFixReport` with fixed, still reported, applier failed, restart-gated, skipped, manual, dry run | Outcomes and exit codes per DEC-07 and DEC-08 | `tests/unit/fix-outcomes.test.ts` |
| TC-09 | DEC-09, FR-13 | unit | `parseFix` with `--json` alone, `--force` alone, unknown harness, valid sets | 64 cases throw `CliArgumentError`; valid sets parse | `tests/unit/fix-arguments.test.ts` |
| TC-10 | FR-03, OBJ-01 | integration | Auto-restart on, mod files removed, outdated asset; `fix --yes` | `autoRestart` kept; mod reinstalled; outcomes `fixed`; `doctor` exits 0 | `tests/integration/fix-command.test.ts` |
| TC-11 | FR-04, OBJ-02 | integration | TTY, `ScriptedPrompts(['n'])` on the outdated asset world | Plan printed; file hashes unchanged; `Nothing was written.`; exit = first diagnosis | `tests/integration/fix-interactive.test.ts` |
| TC-12 | FR-05 | integration | TTY with `ASSET_MODIFIED` answered `y` and `n`; `STATUSLINE_BRIDGE_INACTIVE` answered `r`, `f`, `s`; `NO_PROJECT_HARNESS` answered `claude-code` and empty | Replace and keep; bridge reinstalled, forgotten, unchanged; harness installed and skipped | `tests/integration/fix-interactive.test.ts` |
| TC-13 | FR-06, NFR-02 | integration | `--yes` with a modified asset; `--yes --force`; `--yes --force --harness claude-code` on an empty-harness world with a config | Modified file kept and `skipped`; replaced; claude-code installed | `tests/integration/fix-command.test.ts` |
| TC-14 | FR-07 | integration | No TTY, no `--yes`, outdated asset | Exit 2, `CONFIRMATION_REQUIRED`, hashes unchanged | `tests/integration/fix-command.test.ts` |
| TC-15 | FR-08 | integration | `--dry-run` | Hashes unchanged; outcomes `planned` and `skipped` | `tests/integration/fix-command.test.ts` |
| TC-16 | FR-09 | integration | 1 automatic, 1 decision, 1 manual finding, `--yes` | Outcomes `fixed`, `skipped`, `manual` | `tests/integration/fix-command.test.ts` |
| TC-17 | FR-10 | unit | Fix text for a fixed `AUTO_RESTART_OUTDATED_MOD` on claude-code | Note `Restart Claude Code to load the new mod.` | `tests/unit/fix-text.test.ts` |
| TC-18 | FR-11 | integration | Empty fixture | No file created; message names `context-brake init`; `stopped: not_installed` in JSON | `tests/integration/fix-command.test.ts` |
| TC-19 | FR-12 | integration | Installed world with only a manual finding | Nothing written; `stopped: nothing_to_fix`; manual list printed | `tests/integration/fix-command.test.ts` |
| TC-20 | FR-13 | integration | Exit 0 after a full fix, 1 with a remaining warning, 2 with an applier failure (read-only target or injected applier failure), 64 for `fix --json` | Exit codes match | `tests/integration/fix-command.test.ts` |
| TC-21 | FR-14 | e2e | Built CLI `fix --dry-run --json` | Valid `fixReportSchema` document; exit = `exitCode`; hashes unchanged | `tests/e2e/e2e-fix.test.ts` |
| TC-22 | FR-14, FR-15 | unit | `schemas:check` lists | `fix-report.schema.json` published and current | `npm run schemas:check`, `tests/unit/schemas.test.ts` |
| TC-23 | FR-16 | manual (review) | README table and help | `fix` row with `--dry-run`, `--yes`, `--force`, `--harness`, `--json`; help lists `fix` | README diff |
| TC-24 | NFR-01, DEC-03 | integration | `init` output and plan unchanged after the `planInit` extraction | Existing init suites pass | `tests/integration/init-*.test.ts` touched suites |
| TC-25 | DEC-10 | integration | Config with a JSON syntax error and an outdated asset | No plan; `ASSET_OUTDATED` `skipped` with the config reason; exit 2 | `tests/integration/fix-command.test.ts` |

## Quality profile

Rules this feature can violate. A blocking hit prevents task completion and rejects the review; a reservation becomes an optional improvement and counts toward escalation. A hit covered by `DEC-NN` is expected, not a finding.

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `"${RG[@]}" ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | — |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `"${RG[@]}" '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-03 | Empty `catch` or `.catch(() => {})` | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | — |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-05 | Generic `throw new Error(` | reservation | `"${RG[@]}" 'throw new Error\(' "${files[@]}"` | Pre-existing in `scripts/` (baseline) |
| QA-06 | 4+ parameters in one declaration | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"` | — |
| QA-07 | File above 100 lines | reservation | `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | — |

- Verification scope: TypeScript files in the task diff; `core_files` = the subset under `src/core/`.
- Escalation trigger: 8+ reservation hits in the feature, a touched file above 200 lines, or the same block in 3+ places.

### Terrain baseline

Measured on 2026-10-21 over the worktree (prd-22 and prd-23 diffs included).

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/core/contracts/diagnostics.ts` | 47 | 14 | <4 | 0 | — | recorded; growth absorbed in `fix.ts` and `fix-report.ts` (DEC-14) |
| `src/core/contracts/adapter.ts` | 61 | 6 | <4 | 0 | — | recorded |
| `src/core/services/asset-currency.ts` | 88 | 5 | 3 (`protectModifiedAssets`) | 0 | — | absorbed in DEC-04 (options object instead of a 4th parameter) |
| `src/core/services/installation-service.ts` | 89 | 3 | <4 | 0 | — | recorded |
| `src/cli/init-flow.ts` | 77 | 2 | <4 | 0 | — | absorbed in DEC-03 (`planInit` in a new file) |
| `src/cli/commands/doctor.ts` | 62 | 1 | <4 | 0 | — | absorbed (CMP-10 moves the diagnosis out) |
| `src/cli/argument-parser.ts` | 50 | 6 | <4 | 0 | — | recorded (`parseFix` in `fix-arguments.ts`) |
| `src/cli/composition-root.ts` | 63 | 1 | <4 | 0 | — | recorded |
| `src/cli/main.ts` | 60 | 1 | <4 | 0 | — | recorded |
| `src/cli/output/doctor-rows.ts` | 79 | 5 | <4 | 0 | — | recorded |
| `src/cli/output/doctor-text.ts` | 68 | 4 | <4 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/statusline-planner.ts` | 91 | 2 | <4 | 0 | — | recorded; the `'keep'` branch adds at most 2 lines |
| `src/infrastructure/harnesses/claude-code/context-source.ts` | 23 | 5 | <4 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/adapter.ts` | 92 | 1 | <4 | 0 | — | recorded; the map lives in `fix-groups.ts` |
| `src/infrastructure/harnesses/pi/adapter.ts` | 73 | 1 | <4 | 0 | — | recorded |
| `src/infrastructure/harnesses/oh-my-pi/adapter.ts` | 73 | 1 | <4 | 0 | — | recorded |
| `scripts/generate-schemas.ts` | 19 | 0 | <4 | 0 | — | recorded |
| `scripts/check-schemas.ts` | 16 | 0 | <4 | 0 | QA-05: `scripts/check-schemas.ts:15` | recorded |
| `scripts/check-package.ts` | 84 | 1 | <4 | 0 | QA-05: `scripts/check-package.ts:40-43,49,58,62,74` | recorded |

- Preparatory refactoring: not recommended. Only `diagnostics.ts` crosses a threshold (14 exports), and DEC-14 keeps the contact to 2 places with no new export.

## Observability and rollout

- Signals: the `fix` text and JSON report; `doctor` shows the `fix` group.
- Migration and compatibility: additive. The new optional field keeps `schemaVersion` 1 for doctor and install reports; existing exit codes do not change.
- Rollout and rollback: ships with the next release; revert the feature commit to roll back. No persisted format changes.

## Risks and open items

- Risk (medium probability, low impact): an `automatic` code that plain `init` does not correct in some state (for example `ASSET_MISSING` for a harness that is no longer detected). Mitigation: DEC-07 reports it `failed` with the doctor message; the PRD allows moving the code to `manual` later.
- Risk (low, medium): the Claude Code status line result depends on the Claude Code version (bridge or mod source). `fix` follows `init` for the version found; the second diagnosis decides the outcome. TC-07 covers both sources for `'keep'`.
- Risk (known, pre-existing): restart extras (`extras.changes`) bypass `protectModifiedAssets` (`installation-service.ts:82`), so `init` and `fix` overwrite a modified mod file. Not changed by this feature.
- Risk (medium, low): test budget above 180 s (prd-23 R-02). Mitigation in Test approach.
- Open item: `.agents/rules/tests.md` lists e2e commands init, doctor, remove; the repository owner can add `fix` to that list.

## Relevant files

- Modify: `src/core/contracts/diagnostics.ts`, `src/core/contracts/adapter.ts`, `src/core/services/asset-currency.ts`, `src/core/services/installation-service.ts`, `src/cli/init-flow.ts`, `src/cli/commands/doctor.ts`, `src/cli/argument-parser.ts`, `src/cli/composition-root.ts`, `src/cli/main.ts`, `src/cli/output/doctor-rows.ts`, `src/cli/output/doctor-text.ts`, `src/infrastructure/harnesses/claude-code/statusline-planner.ts`, `src/infrastructure/harnesses/claude-code/context-source.ts`, `src/infrastructure/harnesses/claude-code/adapter.ts`, `src/infrastructure/harnesses/pi/adapter.ts`, `src/infrastructure/harnesses/oh-my-pi/adapter.ts`, `scripts/generate-schemas.ts`, `scripts/check-schemas.ts`, `scripts/check-package.ts`, `schemas/doctor-report.schema.json`, `schemas/install-report.schema.json`, `tests/unit/schemas.test.ts`, `tests/integration/package-contents.test.ts`, `README.md`
- Create: `src/core/contracts/fix.ts`, `src/core/contracts/fix-report.ts`, `src/core/services/fix-groups.ts`, `src/core/services/fix-outcomes.ts`, `src/infrastructure/harnesses/claude-code/fix-groups.ts`, `src/cli/init-plan.ts`, `src/cli/doctor-diagnosis.ts`, `src/cli/fix-arguments.ts`, `src/cli/fix-decisions.ts`, `src/cli/commands/fix.ts`, `src/cli/output/fix-text.ts`, `schemas/fix-report.schema.json`, `tests/helpers/fix-world.ts`, `tests/unit/fix-groups.test.ts`, `tests/unit/fix-outcomes.test.ts`, `tests/unit/fix-arguments.test.ts`, `tests/unit/fix-text.test.ts`, `tests/integration/doctor-fix-groups.test.ts`, `tests/integration/statusline-keep.test.ts`, `tests/integration/fix-command.test.ts`, `tests/integration/fix-interactive.test.ts`, `tests/e2e/e2e-fix.test.ts`
