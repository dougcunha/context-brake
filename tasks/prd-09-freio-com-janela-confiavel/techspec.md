# TechSpec — Freio só com janela confiável

## Sources and traceability

- PRD: `tasks/prd-09-freio-com-janela-confiavel/prd.md` (`FR-01`–`FR-09`, `NFR-01`–`NFR-03`), level `sdd-lean` (`DEC-HIL-00`, `DEC-STOPS-01`), product decisions `DEC-PD-00`, `DEC-PD-01`, `DEC-PD-02`.
- Rules: `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md` (Claude Code status line and harness capability states), `file-changes.md` (`init` writes `.claude/settings.local.json` by default), `cli-output.md` (`doctor` lines and findings, `init` plan).
- Research: `docs/research/harness-integrations.md`, the "Uso de contexto" column and the Claude Code section (`:41-44`: the status line runs only in interactive sessions, so `claude -p` does not run it).
- Evidence in existing code (verified in this session or cited by read-only explorers and spot-checked):
  - Window path: `session-zone.ts:22-28` (`mergeMeasurements`: `contextWindow = inputs.measured?.contextWindow ?? statusline.windowTokens`); `usage-resolver.ts:24,26` (`?? contextWindowCeiling`; `source` covers tokens only); `statusline-summary.ts:6-14` (last non-null bridge window in the session ledger, before or after a reset).
  - Harness window sources: Pi and Oh-My-Pi pass `ctx.getContextUsage().contextWindow` (`pi/runtime.ts:31-33`, `oh-my-pi/runtime.ts:31-33`, `common/in-process-support.ts:46-49`); Claude Code sends `contextWindow: null` from the transcript (`claude-code/runtime.ts:64`) and gets the window only from the bridge; OpenCode, Codex, Cursor, GitHub Copilot, and Antigravity supply none. The `context_usage` capability states match: `supported` (Pi, Oh-My-Pi), `unknown` (Claude Code), `unsupported` (the other five).
  - Deny sites: `brake-engine.ts:42-46` (`critical_ceiling` when `zone === 'CRITICAL'`) and `failure-policy.ts:58-61` (`integration_failure` when `lastRecordedZone` is `CRITICAL`, read from the last `tool` ledger line, `session-counters.ts:26-37`).
  - Only the usage percentage reaches `CRITICAL`; turn limits raise a zone to `RED` at most (`zone-classifier.ts:20-23`), so every path to a deny passes through the window.
  - Ledger: `toolLineSchema` is a `strictObject` with `v: z.literal(1)`, and lines that fail to parse are dropped (`session-ledger.ts:18,23,80`).
  - Telemetry: `telemetry-block.ts` (`TELEMETRY_BLOCK_VERSION = 2`); `docs/telemetry-block.md:38` requires a new version for any added field; `[ContextBrake v2]` is hard-coded 35 times in 16 files (docs and tests); the CRITICAL plan-mode action says "other tools are blocked" (`zone-actions.ts:31`, protocol text `:18-19`).
  - Bridge planner: `statusline-planner.ts:38-44` (`isRequested = statuslineBridge === 'install'`); flags and target errors in `init-arguments.ts:49-57` and `init.ts:76` (`assertStatuslineBridgeTarget`); `STATUSLINE_UNSUPPORTED_PATH` conflict (`statusline-planner.ts:65`); doctor findings in `statusline-diagnostics.ts:20-30` (none when the bridge was never installed).
  - Config: `telemetrySchema` is strict (`configuration.ts:75`), and `normalizeTurnLimits` rebuilds `telemetry` from named fields (`config-legacy-checks.ts:33-34`), so a new key must be added there too.
  - Runner: Claude Code runner sessions run `claude -p` (`claude-code/session-launcher.ts:5`), and the runner ends a session once the ledger zone is `CRITICAL` (`session-watch.ts:35,82-86`).

## Solution summary

Every usage reading gains a window origin: `harness` when the harness reported the window for the session (the Pi and Oh-My-Pi hook value or the Claude Code bridge record), `declared` when it comes from a new optional `telemetry.declaredContextWindow` that is honored only for harnesses whose `context_usage` capability is `unsupported`, and `config` for the `contextWindowCeiling` fallback. Zones and telemetry keep working with any origin; the two deny paths require `harness` or `declared`. The origin is written on each `tool` ledger line, so the integration-failure policy can check the last recorded reading, and it is shown in a new telemetry block version (`v3`, field `window=`), in the debug line, and in `doctor`.

For Claude Code in full mode, `init` installs the status line bridge by default. `--no-statusline-bridge` opts out and the opt-out is remembered in the local bridge state, so a later plain `init` does not reinstall it; `--statusline-bridge` clears it. `doctor` reports, per active harness, whether the brake can deny and why, and warns when Claude Code has no bridge. Light mode keeps the bridge opt-in, since it never denies.

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-01 | `UsageReading` (`contracts/zones.ts`) gains `windowOrigin: 'harness' \| 'declared' \| 'config'`. `resolveUsage` sets it: a measured window (hook or bridge, already merged by `mergeMeasurements`) is `harness`; otherwise `declaredContextWindow` when the input allows it; otherwise `config`. `UsageResolutionInput` gains `declaredContextWindow?: number` (already filtered by the caller), so the resolver stays harness-agnostic. | One place computes the window today (`usage-resolver.ts:24,26`); every consumer (engine, `wrap`, doctor) already goes through it. | Derive the origin at each deny site: duplicates the rule and misses `wrap` and telemetry. |
| DEC-02 | FR-01, FR-05 | `readZone` passes `declaredContextWindow` only when the descriptor's `context_usage` capability is `unsupported` (new pure helper `acceptsDeclaredWindow(capabilities)` in the new module `src/core/services/window-trust.ts`). `ZoneSettings.descriptor` gains `capabilities`. | `DEC-PD-02`: the declaration applies only to harnesses with no source. The capability states already encode that split (Pi `supported`, Claude Code `unknown`, five `unsupported`). | A per-harness list in core: duplicates the capability data the adapters own. |
| DEC-03 | FR-02 | `handlePreTool` returns neutral unless `zone === 'CRITICAL' && isTrustedWindow(reading)` (`window-trust.ts`: origin is `harness` or `declared`), edited in place on `brake-engine.ts:42`. No block is logged when the deny is skipped. Telemetry and guidance are unchanged except for DEC-06. | Single `critical_ceiling` site. Only the percentage reaches `CRITICAL` (`zone-classifier.ts:20-23`), so the gate also covers `DEC-PD-02` (turns never deny). | Downgrade the zone to `RED` when untrusted: the agent would lose the honest `CRITICAL` reading the PRD requires. |
| DEC-04 | FR-03 | `toolLineSchema` gains optional `windowOrigin` (same enum), written by `handlePostTool` from the reading; `v` stays `1`. The session summary exposes the last recorded origin next to `lastZone`. `resolveFailure` denies only when the last line is `CRITICAL` and its origin is trusted; a line without `windowOrigin` (written before this feature) counts as `config`. | The failure path has no live reading (`failure-policy.ts:58`), so the origin must be persisted. Treating legacy lines as untrusted fails safe for the user's rule. | Bump the ledger to `v: 2`: every reader and fixture changes, and an older hook in the same repo would drop all lines. With the optional field, an older binary drops only new lines until it is updated (same repo, one hook version after `init`). |
| DEC-05 | FR-05, NFR-02 | Config: `telemetry.declaredContextWindow: z.optional(positiveInt)`, absent from `DEFAULT_CONFIG`, passed through `normalizeTurnLimits` only when defined; schemas regenerated. `contextWindowCeiling` keeps its name and default. | Strict schema and normalizer (`configuration.ts:75`, `config-legacy-checks.ts:33-34`). A separate key keeps the fallback and the declaration apart, as the PRD requires. | Reuse `contextWindowCeiling` with a flag: the incident came from trusting that very value. |
| DEC-06 | FR-06, NFR-02 | Telemetry block `v3`: `TELEMETRY_BLOCK_VERSION = 3`, field `window=<harness\|declared\|config>` right after `source=`. With origin `config` in `CRITICAL`, `telemetryDecision` and `renderSessionTelemetry` replace the plan-mode CRITICAL action (`ZONE_ACTIONS.CRITICAL.compact`, the only text that promises blocking) with the fixed text ``not blocked (no harness window, see context-brake doctor); finish the RED actions`` (shortened during T01 to fit the existing 60-token and 220-character block budget of `tests/unit/telemetry-block-budget.test.ts`; the first draft measured 65 tokens); other zones keep their action. `docs/telemetry-block.md` and `docs/context-brake-protocol.md` document `v3`, and tests use `TELEMETRY_BLOCK_PREFIX` instead of the literal where they build expectations. | `docs/telemetry-block.md:38` requires a version bump for a new field. Only the CRITICAL action promises blocking (`zone-actions.ts:31`). | Keep `v2` and add the field: breaks the documented contract. Change every guidance `actionFor`: touches plan, delegated, and light guidance for one text. |
| DEC-07 | FR-06, NFR-01 (PRD-08) | `DEBUG_MODE_LINE` becomes ``Debug mode: end each reply that received a ContextBrake telemetry block with the line `📊 ContextBrake: <usage>% · <used>/<window> (<window origin>) · <source> · <ZONE>`, copied from the latest block.``; the origin comes from `window=`. The PRD-08 60-token test keeps its budget. | FR-06 asks the debug line to repeat the origin. | A separate line: two lines per reply. |
| DEC-08 | FR-04 | Bridge default in full mode: `init-arguments.ts` keeps `'install' \| 'remove'` for the explicit flags and passes `undefined` otherwise; `statusline-planner.ts#planStatuslineEntry` treats `undefined` as install when claude-code is a detected target, not in light mode, and the local bridge state does not record an opt-out. `STATUSLINE_TARGET_ERROR` and `assertStatuslineBridgeTarget` still apply only to the explicit flags. In the default case, `STATUSLINE_UNSUPPORTED_PATH` becomes a warning finding instead of a conflict, so a plain `init` never fails because of the bridge. | Planner already resolves the previous status line and is idempotent (`statusline-planner.ts:44-74`); the explicit-flag checks stay as PRD-02.2 specified them. Light mode never denies, so the rule needs no bridge there. | Default in the CLI parser: the target and detection errors would fire on every plain `init` without claude-code. |
| DEC-09 | FR-04 | Opt-out memory: a marker file `.context-brake/runtime/claude-statusline-opt-out.json` (`{ v: 1, optedOut: true }`, `statusline-default.ts`) next to the bridge state; T02 moved it out of `claude-statusline.json` because an opt-out record there would fail `parseStatuslineState` and raise `STATUSLINE_STATE_INVALID`. `--no-statusline-bridge` removes the bridge as today and writes the opt-out; `--statusline-bridge` replaces it with the installed state; `remove` deletes the file as today. | The bridge is per machine (`settings.local.json`), and the runtime directory is already local state. Without memory, the next plain `init` would undo the opt-out. | A config key: the config is versioned and shared, while the bridge choice is per machine. |
| DEC-10 | FR-07 | Doctor: new optional `brakeWindow` array in `doctorReportSchema`, one item per active harness: `{ harness, canDeny: boolean, reason: 'harness' \| 'declared' \| 'bridge' \| 'bridge_absent' \| 'no_source' }`, built by a new core function in `window-trust.ts` from the harness capabilities, the config, and the Claude Code window report (`bridge` state). New warning `STATUSLINE_BRIDGE_ABSENT` in `statusline-diagnostics.ts` when claude-code is a target in full mode and no bridge is installed, remediation `Run context-brake init.` (and `--statusline-bridge` after an opt-out). Text output adds one line per harness through `doctor-mode-text.ts`. | `diagnoseStatusline` returns `[]` without state today (`:30`). An informational array keeps `doctor` status unchanged for harnesses that can only warn; the Claude Code warning is the one FR-07 asks for. | A finding per warning-only harness: every Codex install would exit with warnings. |
| DEC-11 | NFR-01, code standards | New logic goes to new modules (`window-trust.ts` in core, `brake-window-report.ts` if the doctor assembly needs it); no new export in the modules with ten or more exports (`failure-policy.ts` 11, `session-ledger.ts` 31, `diagnostics.ts` 16, `instruction-markers.ts` 10, `run-ports.ts` 25). `brake-engine.ts` (98), `doctor-service.ts` (100), `text.ts` (97), `failure-policy.ts` (95), and `init.ts` (95) are edited in place; when an edit needs a new import in a file at 100 lines, the task extracts the doctor report assembly from `doctor-service.ts:99` into its own module first (absorbed refactoring). | Terrain baseline below; avoids repeating PRD-08's `codereview_01/CR-02`. | Preparatory refactoring feature: the extraction is local and fits the task. |
| DEC-12 | FR-09 | Runner: `LedgerReading` (`run-ports.ts`) gains `windowOrigin`, filled by `readingFromLedger` (`node-ledger-watcher.ts:9-13`) from the last `tool` line (absent → `config`). `isCriticalGraceOver` (`session-watch.ts`) starts the grace only when `zone === 'CRITICAL'` and `isTrustedWindow`; `finalZone` still reports the zone. | The runner cut is the same incident as a session end. The origin is already on the ledger line after DEC-04. | Leave the runner out: headless Claude Code sessions keep ending at the 128000 fallback. |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/core/contracts/zones.ts`, `usage-resolver.ts`, `session-zone.ts` | Modified | Window origin on every reading (DEC-01, DEC-02) | — |
| CMP-02 | `src/core/services/window-trust.ts` | New | `acceptsDeclaredWindow`, `isTrustedWindow`, the warning-only CRITICAL action, and the doctor `brakeWindow` builder (DEC-02, DEC-03, DEC-06, DEC-10) | CMP-01 |
| CMP-03 | `src/core/services/brake-engine.ts`, `failure-policy.ts`, `session-counters.ts`, `src/core/contracts/session-ledger.ts` | Modified | Deny gates and persisted origin (DEC-03, DEC-04) | CMP-02 |
| CMP-04 | `src/core/contracts/configuration.ts`, `config-legacy-checks.ts`, `schemas/context-brake.config.schema.json` | Modified / regenerated | `declaredContextWindow` (DEC-05) | — |
| CMP-05 | `src/core/services/telemetry-block.ts`, `instruction-markers.ts`, `docs/telemetry-block.md`, `docs/context-brake-protocol.md` | Modified | Block `v3`, debug line (DEC-06, DEC-07) | CMP-01 |
| CMP-06 | `src/infrastructure/harnesses/claude-code/statusline-planner.ts`, `statusline-state.ts`, `src/cli/init-arguments.ts`, `src/cli/commands/init.ts` | Modified | Default bridge and opt-out memory (DEC-08, DEC-09) | — |
| CMP-07 | `statusline-diagnostics.ts`, `src/core/contracts/diagnostics.ts`, `doctor-service.ts`, `src/cli/output/doctor-mode-text.ts`, `schemas/doctor-report.schema.json` | Modified / regenerated | `brakeWindow`, `STATUSLINE_BRIDGE_ABSENT` (DEC-10) | CMP-02 |
| CMP-08 | `README.md`, `docs/research/harness-integrations.md` | Modified | User docs and per-harness window source (FR-08) | all |
| CMP-09 | `src/core/contracts/run-ports.ts`, `src/infrastructure/runner/node-ledger-watcher.ts`, `src/core/services/session-watch.ts` | Modified | Runner ends a session at `CRITICAL` only with a trusted window (DEC-12) | CMP-03 |

Flow: hook event → adapter supplies `measured` (Pi and Oh-My-Pi window, Claude Code transcript tokens) → `readZone` merges the bridge window and resolves `windowOrigin` → post-tool writes it on the ledger line and renders `v3` → pre-tool denies only in `CRITICAL` with a trusted origin → on an integration failure, `resolveFailure` reads the last line's zone and origin.

## Contracts and data

- `context-brake.config.json`: optional `telemetry.declaredContextWindow` (positive integer). Absent by default. Honored only by harnesses whose `context_usage` capability is `unsupported`. `schemaVersion` stays 1; older configs stay valid.
- Session ledger `tool` line: optional `windowOrigin` (`harness | declared | config`); `v` stays 1. Absent means `config` for the failure policy.
- Bridge state `.context-brake/runtime/claude-statusline.json`: accepts `{ "v": 1, "optedOut": true }` besides the installed state.
- Telemetry block (agent-facing): `[ContextBrake v3] turn=… usage=<p>% tokens=<used>/<window> source=<measured|estimated> window=<harness|declared|config> zone=<ZONE> action=<text>`. With `window=config` in `CRITICAL`, the action is the DEC-06 text.
- Debug line (agent-facing): DEC-07 text.
- `doctor --json`: optional `brakeWindow` array (DEC-10); new warning code `STATUSLINE_BRIDGE_ABSENT`; `schemaVersion` stays 1.
- `init`: without flags, in full mode with claude-code detected, the plan includes the `.claude/settings.local.json` `statusLine` change unless opted out. Exit codes unchanged.

## Errors, security, and recovery

- Errors and edges: first tool calls of a Claude Code session before any bridge record, subagents (own ledger key, no bridge line), and `claude -p` resolve to `config` and only warn. A Pi reading with `contextWindow` 0 or missing already falls back to `config`. A declared window on Claude Code, Pi, or Oh-My-Pi is ignored. A project path the bridge cannot quote yields a warning, and `init` continues without the bridge.
- User files: the bridge writes only `statusLine` in `.claude/settings.local.json` and preserves the previous status line (PRD-02.2 FR-02, FR-08).
- Concurrency and idempotency: the ledger stays append-only; a second plain `init` plans no change; the opt-out record is rewritten only by the explicit flags.
- Rollback: `init --no-statusline-bridge` or `remove`; a config without `declaredContextWindow` returns to warning-only.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| T01 Window origin, deny gates, ledger field, declared window, telemetry `v3`, debug line, telemetry and protocol docs (CMP-01–CMP-05) | — | TC-01–TC-08, TC-12, TC-15 pass; `schemas:check` passes |
| T02 Default bridge with opt-out memory, doctor `brakeWindow` and warning, runner gate, README and research docs (CMP-06–CMP-09) | T01 | TC-09–TC-11, TC-13, TC-14, TC-16 pass; full validation |

## Test approach

- Profile: surfaces are the hook engine (one process per event for Claude Code, Codex, Cursor, Copilot, Antigravity; in-process for Pi, Oh-My-Pi, OpenCode) and the CLI (`init`, `doctor`). Node.js 20+, TypeScript ESM, Vitest. Commands from `AGENTS.md`: `npm run build`, `npm run typecheck`, `npm run lint`, `npm run coverage`, `npm run schemas:check`, `npm run package:smoke`.
- End-to-end: the built CLI and hook against fixture repositories in temporary directories (`tests/e2e/`, process lane by directory).
- Performance: NFR-01 relies on the existing overhead suites (TC-15); the origin is resolved from data `readZone` already loads, with no new file read on the hook path.
- Platforms: Windows locally; Linux and macOS through CI.
- Existing tests to update: the 16 files with `[ContextBrake v2]`; the opt-in assertions in `tests/integration/statusline-install.test.ts:26,34-38,60-72` and `tests/unit/init-arguments.test.ts:9-19`; `tests/unit/session-zone-statusline.test.ts:75` and `session-zone-reset-window.test.ts:43` (deny with the fallback window); `tests/unit/statusline-context-window.test.ts:28`, `doctor-context-window.test.ts:52-53`, `readme-config-example.test.ts:37-47`, `symlinked-harness-config.test.ts:36`.
- Manual acceptance (optional, owner: user): in TokenHound, `context-brake init --yes`, then a Claude Code session: the first blocks show `window=config` until the status line runs, then `window=harness`; `doctor` shows `canDeny: true` for claude-code.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-01, FR-05 | unit | `resolveUsage` and `readZone` with a measured window, a declared window with `context_usage` `unsupported`, a declared window with `supported`/`unknown`, and neither | `harness`; `declared`; `config` (declaration ignored); `config` | `tests/unit/window-origin.test.ts` |
| TC-02 | FR-02 | unit | Incident replay: pre-tool `Bash` and `Edit`, 98000 measured tokens, window 128000 from the fallback, `CRITICAL` | Neutral, no block logged; the same with a bridge record of 128000 denies with `critical_ceiling` | `tests/unit/brake-engine-window-trust.test.ts` |
| TC-03 | FR-03 | unit | `resolveFailure` with a last `CRITICAL` line of origin `config`, `harness`, and no origin | Neutral and error recorded; deny; neutral | `tests/unit/failure-policy-window-trust.test.ts` |
| TC-04 | FR-03 | unit | Ledger `tool` line with and without `windowOrigin` | Both parse; the summary exposes the origin (absent → `config`) | `tests/unit/session-ledger*.test.ts` |
| TC-05 | FR-05, NFR-02 | unit | `normalizeTurnLimits` and `configurationSchema` with `declaredContextWindow` | The key survives a rewrite and validates; absent by default | `tests/unit/config-legacy-checks.test.ts`, `tests/unit/schemas.test.ts` |
| TC-06 | FR-06, NFR-02 | unit | `renderTelemetryBlock` for each origin | Exact `v3` string with `window=`; the field adds at most 10 `o200k_base` tokens; block budget test still passes | `tests/unit/telemetry-block.test.ts`, `telemetry-block-budget.test.ts` |
| TC-07 | FR-06 | unit | CRITICAL action with origin `config` and `harness` in plan and delegated modes | `config`: DEC-06 text, no "blocked"; `harness`: current action | `tests/unit/window-trust.test.ts` |
| TC-08 | FR-06 | unit | `DEBUG_MODE_LINE` | Exact DEC-07 text, at most 60 tokens | `tests/unit/instruction-markers.test.ts` |
| TC-09 | FR-04 | integration | Plain `init --yes` with Claude Code detected; repeated; `--no-statusline-bridge`; later plain `init`; `--statusline-bridge`; light mode; project without claude-code; unsupported path; malformed `.claude/settings.local.json` with a plain `init` and with `--statusline-bridge` | Bridge installed; no change; bridge removed and opt-out stored; still no bridge; bridge back; no bridge; no bridge and no error; warning and no bridge, exit 1 (`status: warnings`), never exit 2; `STATUSLINE_SETTINGS_INVALID` warning, hooks installed, file untouched, exit 1, and with the flag the `INVALID_HARNESS_CONFIG` conflict, exit 2 | `tests/integration/statusline-install.test.ts`, `statusline-default.test.ts` |
| TC-10 | FR-07 | unit | `brakeWindow` builder for Pi, Claude Code with and without bridge, Codex with and without declaration | `harness`/`bridge`/`bridge_absent`/`declared`/`no_source` with matching `canDeny` | `tests/unit/window-trust.test.ts` |
| TC-11 | FR-07 | integration | `doctor` and `doctor --json` on Claude Code without bridge and with bridge | Warning `STATUSLINE_BRIDGE_ABSENT` with remediation, `canDeny: false`; no warning, `canDeny: true`; report passes `doctorReportSchema` | `tests/integration/doctor-brake-window.test.ts` |
| TC-12 | FR-02, FR-05 | end-to-end | Built Codex hook at `CRITICAL` (estimate) with and without `declaredContextWindow`; built Claude Code hook with transcript usage and no bridge record | Deny with the declaration, neutral without; Claude Code pre-tool neutral and post-tool block has `window=config` | `tests/e2e/e2e-window-trust.test.ts` |
| TC-13 | FR-05, FR-07 | contract | Generated schemas include `declaredContextWindow` and `brakeWindow` | `npm run schemas:check` passes | `npm run schemas:check` |
| TC-14 | FR-08 | unit and review | README, `docs/context-brake-protocol.md`, `docs/telemetry-block.md`, and `docs/research/harness-integrations.md` | README states the default bridge, `window=`, and `declaredContextWindow`, asserted by the README test; the protocol and telemetry docs describe `v3` and the warning-only rule; the research table lists each harness window source (checked in review) | `tests/unit/readme-config-example.test.ts` |
| TC-15 | NFR-01 | integration | Existing hook overhead suites with the new origin resolution, the `windowOrigin` ledger field, and 200 `statusline` lines | p95 within 100 ms without the bridge and 120 ms with 200 `statusline` lines, as today | `tests/integration/runtime-overhead.test.ts`, `tests/integration/statusline-overhead.test.ts`, `tests/integration/claude-transcript-usage.test.ts` |
| TC-16 | FR-09 | unit | Session watch with a `CRITICAL` reading of origin `config`, `harness`, and legacy (no origin), past the grace | No `critical_ceiling` end; `critical_ceiling`; no `critical_ceiling` end | `tests/unit/session-watch-window-trust.test.ts` |

## Quality profile

A blocking hit prevents task completion and rejects the review; a reservation becomes an optional improvement. Scope: TypeScript files in the task diff; `core_files` is the subset under `src/core/`; `in_process_files` = Pi, Oh-My-Pi, and OpenCode adapter files in the diff; `hook_files` = `brake-engine.ts`, `failure-policy.ts`, `session-zone.ts`, `window-trust.ts`.

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `rg -n --type ts ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | — |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n --type ts '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-03 | Empty `catch` | blocking | `rg -n --type ts -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | — |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `rg -n --type ts "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-05 | stdout on the hook path | blocking | `rg -n --type ts 'console\.log\|process\.stdout\.write' "${hook_files[@]}"` | — |
| QA-06 | Synchronous file API in in-process adapters | blocking | `rg -n --type ts '\b(readFileSync\|writeFileSync\|appendFileSync\|existsSync\|spawnSync)\b' "${in_process_files[@]}"` | — |
| QA-07 | Clock or randomness in `core` | reservation | `rg -n --type ts 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' "${core_files[@]}"` | — |
| QA-08 | 4+ parameters | reservation | `rg -n --type ts '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"` | — |
| QA-09 | File above 100 lines | reservation | `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | — |

- Escalation trigger: 8+ reservation hits, a touched file above 200 lines, or the same block duplicated in 3+ places.

### Terrain baseline

Measured on 2026-09-28 at `e0a9604` (Git Bash, measures from `preparatory-refactoring.md`). No QA-01–QA-08 hits in any target file except the one pre-existing QA-07 hit listed below; no declaration with 4+ parameters.

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/core/services/session-watch.ts` | 87 | 2 | <4 | 4 | `QA-07: session-watch.ts:36` (`new Date(now)` over the injected clock value) | recorded; DEC-12 edits `isCriticalGraceOver` in place |
| `src/core/contracts/run-ports.ts` | 86 | 25 | <4 | 0 | 25 exports (structural) | recorded; DEC-12 adds a field, not an export |
| `src/infrastructure/runner/node-ledger-watcher.ts` | 72 | 3 | <4 | 0 | — | recorded |
| `src/core/services/doctor-service.ts` | 100 | <10 | <4 | 0 | — | absorbed in DEC-11 if an import is needed |
| `src/core/services/brake-engine.ts` | 98 | <10 | <4 | 5 | — | recorded; DEC-03 edits line 42 in place |
| `src/cli/output/text.ts` | 97 | <10 | <4 | 0 | — | recorded; not modified unless DEC-10 needs it |
| `src/core/services/failure-policy.ts` | 95 | 11 | <4 | 0 | 11 exports (structural) | recorded; DEC-04 adds no export |
| `src/cli/commands/init.ts` | 95 | <10 | <4 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/statusline-planner.ts` | 82 | <10 | <4 | 0 | — | recorded |
| `src/core/contracts/session-ledger.ts` | 81 | 31 | <4 | 0 | 31 exports (structural) | recorded; DEC-04 adds a field, not an export |
| `src/core/contracts/configuration.ts` | 81 | <10 | <4 | 0 | — | recorded |
| `src/core/services/zone-actions.ts` | 73 | <10 | <4 | 4 | — | recorded |
| `src/infrastructure/harnesses/claude-code/statusline-diagnostics.ts` | 72 | <10 | <4 | 0 | — | recorded |
| `src/core/contracts/diagnostics.ts` | 68 | 16 | <4 | 0 | 16 exports (structural) | recorded; DEC-10 adds a field, not an export |
| `src/cli/init-arguments.ts` | 64 | <10 | <4 | 0 | — | recorded |
| `src/core/services/instruction-markers.ts` | 54 | 10 | <4 | 0 | 10 exports (structural) | recorded; DEC-07 changes a constant only |
| `src/infrastructure/harnesses/claude-code/statusline-context-window.ts` | 48 | <10 | <4 | 0 | — | recorded |
| `src/core/services/session-counters.ts` | 43 | <10 | <4 | 0 | — | recorded |
| `src/core/services/session-zone.ts` | 39 | <10 | <4 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/statusline-state.ts` | 37 | <10 | <4 | 0 | — | recorded |
| `src/core/services/config-legacy-checks.ts` | 35 | <10 | <4 | 0 | — | recorded |
| `src/core/services/usage-resolver.ts` | 30 | <10 | <4 | 0 | — | recorded |
| `src/core/services/telemetry-block.ts` | 22 | <10 | <4 | 0 | — | recorded |
| `src/core/contracts/zones.ts` | 18 | <10 | <4 | 0 | — | recorded |
| `src/core/contracts/context-window-report.ts` | 12 | <10 | <4 | 0 | — | recorded |
| `src/cli/output/doctor-mode-text.ts` | 11 | <10 | <4 | 0 | — | recorded |

- Preparatory refactoring: not recommended. No target file crosses 100 lines; the five modules with ten or more exports get no new export (DEC-11), so structure and contact do not coincide. The `doctor-service.ts` extraction, if needed, is local and absorbed in T02.

## Observability and rollout

- Signals: `window=` in every telemetry block; `doctor` `brakeWindow` and `STATUSLINE_BRIDGE_ABSENT`; `blocks.jsonl` only for real denies.
- Migration and compatibility: existing installs keep working; the next plain `init` installs the Claude Code bridge; old ledger lines count as `config` for the failure policy; agents reading the block see `v3` (documented).
- Rollout and rollback: `init --no-statusline-bridge`, `remove`, or removing `declaredContextWindow`.

## Risks and open items

- Accepted (`DEC-HIL-01`): `STATUSLINE_LOCAL_TRACKED` (PRD-02.2) warns when `.claude/settings.local.json` is not ignored by Git; with the bridge on by default, more repositories will see it. Adding the file to the managed `.gitignore` block stays out of scope.
- Risk: Claude Code subagents never have a bridge record (own ledger key), so their tool calls only warn. Using the parent session window would be wrong when the subagent runs another model.
- Risk: an older hook binary still installed in the same repository would drop `tool` lines that carry `windowOrigin`; mitigated because `init` installs one hook version per repository.

## Relevant files

- Create: `src/core/services/window-trust.ts`, the tests named in the Test approach.
- Modify: files in the Terrain baseline, `src/core/contracts/run-ports.ts`, `src/infrastructure/runner/node-ledger-watcher.ts`, `src/core/services/session-watch.ts`, `schemas/context-brake.config.schema.json`, `schemas/doctor-report.schema.json`, `docs/telemetry-block.md`, `docs/context-brake-protocol.md`, `README.md`, `docs/research/harness-integrations.md`, and the existing tests listed in the Test approach.
