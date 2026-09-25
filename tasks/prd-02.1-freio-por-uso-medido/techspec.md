# TechSpec — PRD 2.1 brake by measured context usage

## Sources and traceability

- PRD: `tasks/prd-02.1-freio-por-uso-medido/prd.md` (`OBJ-01`–`OBJ-04`, `US-01`–`US-05`, `FR-01`–`FR-10`, `NFR-01`–`NFR-06`), approved as `DEC-HIL-01` in `workflow.md`.
- Parent feature: `tasks/prd-02-telemetria-zonas-e-freio/prd.md` (`RF1`–`RF22`, `CA-01`–`CA-23`) and its `techspec.md`. This TechSpec changes only the turn axis, the Claude Code usage source, the window fallback, and the `YELLOW`/`RED` actions.
- Applicable instructions and rules: `AGENTS.md`; `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`, `file-changes.md`, `cli-output.md`; `sdd-create-techspec` and its three references.
- Research: `docs/research/harness-integrations.md`, section `Claude Code` (common input carries `transcript_path`; no token or window field in hooks; transcript written asynchronously).
- Evidence in existing code (HEAD `3b94a9c`):
  - `src/core/services/zone-classifier.ts:11` puts a session in `CRITICAL` when `turns >= criticalTurn`; `src/core/contracts/configuration.ts:47-56` requires the three turn fields and `turnCeiling === criticalTurn`.
  - `src/core/services/session-counters.ts:16-33` counts one turn per distinct tool line after the last reset line; it keeps no reset timestamp.
  - `src/core/services/usage-resolver.ts:20-28` returns `measured` only when `measured.tokens !== null`, and then uses `measured.contextWindow` as the window; `MeasuredUsage.contextWindow` is a required `number` (`session-zone.ts:9`).
  - `src/infrastructure/harnesses/claude-code/runtime.ts:49-53` (`mapClaudeInput`) is synchronous, returns `{}` for `PreToolUse`, and never reads `transcript_path`; `claudePayloadSchema` does not declare it (`schemas.ts:19-28`).
  - `src/infrastructure/runtime/process-hook-host.ts:79` calls `adapter.mapInput` synchronously inside a 1,500 ms deadline (`:31`).
  - `src/core/services/zone-actions.ts:12-17` holds one `YELLOW` and one `RED` action, both about plan steps; `telemetry-block.ts:17` and `block-message.ts:18` print `turn=<t>/<turnCeiling>`.
  - `src/infrastructure/harnesses/claude-code/capabilities.ts:9` declares `context_usage` as `unsupported`.
  - `src/core/services/installation-builder.ts:22-23` copies the current configuration as-is on `init`.
- Local evidence for `FR-04`: Claude Code transcripts on 2026-09-25 (`~/.claude*/projects/<project>/<session>.jsonl`) contain `type: "assistant"` lines with `timestamp`, `isSidechain`, `requestId`, `message.model`, and `message.usage` with `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, and `output_tokens`. There is no window field. One API response can span several lines that share a `requestId` and carry the same `usage`.

## Solution summary

Zones become usage-driven. `CRITICAL`, and therefore every block, depends only on the usage percentage. Turn limits become an optional pair (`greenMaxTurn`, `yellowMaxTurn`) that can raise a session to `YELLOW` or `RED`. Legacy fields `criticalTurn` and `turnCeiling` are still accepted, ignored, reported by `doctor`, and removed by `init --yes`. The telemetry block and the block message move to `v2`: the turn shows a ceiling only when turn limits are on. For `YELLOW` and `RED`, the action text comes in two variants, chosen by whether the plan file exists.

For Claude Code, the process adapter becomes able to produce input asynchronously. On `PreToolUse` and `PostToolUse`, it reads the tail of `transcript_path` and returns the latest main-thread assistant `usage` sum with its timestamp. Core drops that measurement when it predates the last reset, and uses `contextWindowCeiling` when the harness reports no window. Any read problem falls back to the existing estimate.

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-01, FR-02 | `classifyZone`: `CRITICAL` iff `usage >= criticalPercentage`. `RED` iff `usage > yellowMaxPercentage` or (turn limits on and `turns > yellowMaxTurn`). `YELLOW` iff `usage > greenMaxPercentage` or (turn limits on and `turns > greenMaxTurn`). Turn limits are on when both `greenMaxTurn` and `yellowMaxTurn` are present. | Satisfies "turns never reach `CRITICAL`" with the smallest change to `zone-classifier.ts:10-15`; the field names already mean "last turn of the zone". | New field names (`yellowFromTurn`, `redFromTurn`) read better but force every existing config to migrate before it validates. |
| DEC-02 | FR-02, FR-09, NFR-04 | Configuration schema, still `schemaVersion: 1`: `zones.greenMaxTurn` and `zones.yellowMaxTurn` become optional, must appear together, and must satisfy `greenMaxTurn < yellowMaxTurn`. `zones.criticalTurn` and `telemetry.turnCeiling` become optional deprecated fields: accepted, not validated against each other, and ignored at runtime. `DEFAULT_CONFIG` omits all four. | Keeps configs written by PRD-02 valid (`FR-09`) under the `strictObject` schemas. Optional fields are an additive change to `schemas/context-brake.config.schema.json`. | Rejecting legacy fields breaks every installed project on upgrade, since the hooks would load an invalid config and fall back to `INVALID_CONFIG` behavior. |
| DEC-03 | FR-09 | `doctor` adds the warning `LEGACY_TURN_LIMITS` when the config has `criticalTurn` or `turnCeiling`. With the old defaults (7, 10, 12), the message says the turn limits are the retired defaults. Otherwise it says `criticalTurn` and `turnCeiling` are ignored. Remediation: `context-brake init --yes`. `planConfigChange` normalizes the telemetry section. It always drops `criticalTurn` and `turnCeiling`, and it also drops `greenMaxTurn` and `yellowMaxTurn` when they equal 7 and 10. The planned change is an `update` with a preview. | A single normalization point, in `installation-builder.ts`, reached by `init`. Finding codes are free-form strings (`diagnostics.ts:7`), so the report schema is unchanged. | A `migrate` command adds a surface the PRD does not ask for. |
| DEC-04 | FR-03, NFR-04 | The telemetry block becomes `[ContextBrake v2] turn=<t>[/<yellowMaxTurn+1 red start>] usage=…`. The ceiling suffix appears only when turn limits are on and shows the turn where `RED` starts. The block message uses the same `v2` prefix and turn rendering. `TELEMETRY_BLOCK_VERSION = 2`. The boot summary is unchanged. `docs/telemetry-block.md` documents v2 and the change from v1. | The meaning of the turn ceiling changed (it no longer triggers the block), and `NFR-04` requires a version bump for any change in field meaning. Nothing in `src/` parses the prefix. | Keeping v1 with a different meaning of `/<n>` silently changes the contract. |
| DEC-05 | FR-08 | `ZONE_ACTIONS` keeps `GREEN` and `CRITICAL`. `YELLOW` and `RED` get a `withPlan` variant (the current text) and a `withoutPlan` variant. Compact text: `YELLOW` → `keep working; finish the current unit before large new explorations`; `RED` → `finish or pause the current unit, record progress, end reply with [REQUEST_SESSION_RESET]`. `renderTelemetryBlock` and `zoneActionClause` take `planPresent: boolean`. The protocol row for each of these zones prints both variants: "With `<planFile>`: … Without it: …". | The protocol is a static file, so it must carry both. The block is per call and prints only the matching one. Both come from one table (`RF9` of PRD-02, `protocol-zone-coherence.test.ts`). | Printing both variants in every block would exceed the 60-token budget (`telemetry-block-budget.test.ts`). |
| DEC-06 | FR-08 | Revised by `DEC-HIL-04` after the prd-06 merge (`5492604`). Plan presence comes from the single prd-06 port `PlanPresence.exists()` (`NodePlanPresence`: the plan file exists, valid or not). `resolveGuidance` reads it at most once per emitting event: with a `delegatedSnapshot` section, whenever it renders an action or evaluates a `CRITICAL` call (prd-06 NFR-03); without the section, only to render a `YELLOW` or `RED` action (the caller passes the zone). This is the smallest deviation from prd-06 NFR-03 that `FR-08` requires, recorded under `DEC-HIL-04`. With a `delegatedSnapshot` section and no plan, delegated guidance applies (its actions below the trigger use `withoutPlan`). Otherwise `planGuidance(sources, planPresent)` renders `withPlan` or `withoutPlan`. Without a wired port, the plan is treated as present. `readPlanPresence`/`hasPlan` from the original T02 are removed. | One source of truth for "a plan exists" shared with the delegated mode of prd-06 (FR-01 there: an invalid plan still counts as present). One `stat` per injection is negligible against the hook budget. | Keeping a second port (`hasPlan`, valid plan only) gives two meanings of "plan" and two reads; rejected in `DEC-HIL-04`. |
| DEC-07 | FR-04, FR-05, NFR-01, NFR-02, NFR-03 | New `src/infrastructure/harnesses/claude-code/transcript-usage.ts` exports `readTranscriptUsage(path): Promise<TranscriptUsage | null>`. It reads backwards from the end with `fs/promises` `open`/`read` in 64 KiB chunks, up to 4 MiB. It splits complete lines and walks them from last to first. It skips blank or unparseable lines, which is where a partially written last line lands. It returns the first line with `type === 'assistant'`, `isSidechain !== true`, finite non-negative `input_tokens`, `cache_creation_input_tokens` and `cache_read_input_tokens`, and a string `timestamp`, as `{ tokens: sum, at: timestamp }`. A missing path, `ENOENT`, no match within 4 MiB, or a schema mismatch returns `null`. Other I/O errors propagate as `TranscriptUnreadableError`, which the adapter catches: it records `UNEXPECTED` with detail `TranscriptUnreadableError` in the runtime error log, and the hook falls back to the estimate. No message text is read into any output. | Bounded work, independent of transcript size, satisfies the 20 MB target. The assistant line with the latest usage is almost always in the last chunk. Skipping partial lines silently is correct, because an asynchronous writer produces them routinely, and logging them would flood the error log. | Streaming the whole file is linear in size and breaks `NFR-01`. Logging every unparseable line was rejected at HIL 2 (`DEC-HIL-03`). |
| DEC-08 | FR-04 | Subagent hooks (`agent_id` present) do not read the transcript and keep the estimate. | The main transcript's latest assistant line belongs to the main thread, so it must not count as a subagent's usage (`RF4`, `CA-08` of PRD-02). | Mapping subagent transcripts depends on an undocumented file layout. |
| DEC-09 | FR-06 | `MeasuredUsage` gains an optional `at: string`. `summarizeLedger` exposes `lastResetAt` (the `at` of the last reset line). `readZone` drops a measurement whose `at` is not later than `lastResetAt`, compared as parsed epoch milliseconds, and uses the estimate instead. | Both timestamps come from the same machine clock in ISO-8601 UTC. This works for `clear`, `compact`, and `new` without reading harness-specific compact markers. | Parsing the transcript's `compact_boundary` entries ties core behavior to another undocumented detail. |
| DEC-10 | FR-07 | `MeasuredUsage.contextWindow` becomes `number | null`. `resolveUsage` uses `contextWindowCeiling` when it is `null`. Claude Code always passes `null`. Pi and Oh-My-Pi keep passing their number. | The transcript has no window (see evidence), and `RF7` already defines this fallback. | Deriving the window from `message.model` is out of scope in the PRD. |
| DEC-11 | FR-04 | `ProcessHarnessAdapter.mapInput` returns `RuntimeInput | Promise<RuntimeInput>`, and `dispatchHook` awaits it inside the existing deadline. `mapClaudeInput` becomes async. On `PreToolUse` and `PostToolUse` without `agent_id`, it reads `transcript_path` (added to `claudePayloadSchema` as an optional string) and returns `measured: { tokens, contextWindow: null, at }` when it finds one. | `PreToolUse` must see the measurement, because it is the call that blocks (`brake-engine.ts:35-42`). The other process adapters keep synchronous `mapInput` unchanged. | Putting transcript reading in core breaks the rule that harness file formats stay in adapters (`AGENTS.md`). |
| DEC-12 | FR-10 | `context_usage` for Claude Code becomes `state: 'unknown'`, with the impact text "Read from the session transcript, whose format is undocumented; falls back to an estimate." The Claude Code section in `harness-integrations.md` records the `usage` fields, the check date, and that this is undocumented. This is a scoped deviation from the `harness-adapters.md` rule "treat undocumented behavior as unsupported", authorized by `DEC-REQ-01`. The capability is never reported as `supported`, and every failure falls back to the documented-safe estimate. | Honest diagnosis without a guarantee. PRD 1.1 `FR-04` says this capability never changes the support level. | Keeping `unsupported` would make `doctor` contradict the runtime's `source=measured`. |
| DEC-13 | FR-01, OBJ-01 | The runner (`wrap-telemetry.ts`) and `failure-policy.ts` need no logic change. They follow the new classifier through `readZone`. `failure-policy` still denies only when the last recorded zone was `CRITICAL`, which is now usage-only. | Single classification path. | — |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/core/contracts/configuration.ts` | Modified | Optional turn pair, deprecated `criticalTurn` and `turnCeiling`, defaults without turn fields | DEC-02 |
| CMP-02 | `src/core/services/zone-classifier.ts` | Modified | Usage-only `CRITICAL`, optional turn axis up to `RED`; helper `turnLimits(zones)` returning `{ greenMaxTurn, yellowMaxTurn } | null` | DEC-01 |
| CMP-03 | `src/core/services/session-counters.ts` | Modified | `lastResetAt` in `SessionSummary` | DEC-09 |
| CMP-04 | `src/core/services/session-zone.ts`, `usage-resolver.ts` | Modified | Nullable window, stale-measurement drop | DEC-09, DEC-10 |
| CMP-05 | `src/core/services/zone-actions.ts` | Modified | Plan and no-plan variants for `YELLOW` and `RED` | DEC-05 |
| CMP-06 | `src/core/services/telemetry-block.ts`, `block-message.ts` | Modified | v2 prefix, optional turn ceiling, plan-aware action | DEC-04, DEC-05 |
| CMP-07 | `src/core/services/protocol-service.ts` | Modified | Usage conditions, turn conditions only when on, both action variants | DEC-01, DEC-05 |
| CMP-08 | `src/core/services/brake-engine.ts` | Modified | Action from `ZoneGuidance.actionFor` (plan-aware) on every injection | DEC-06 |
| CMP-09 | `src/core/services/doctor-checks.ts`, `installation-builder.ts` | Modified | `LEGACY_TURN_LIMITS` finding; normalization on `init` | DEC-03 |
| CMP-10 | `src/infrastructure/harnesses/claude-code/transcript-usage.ts` | New | Bounded backward read of the transcript | DEC-07 |
| CMP-11 | `src/infrastructure/harnesses/claude-code/runtime.ts`, `schemas.ts`, `capabilities.ts` | Modified | Async input with measured usage, `transcript_path` field, capability `unknown` | DEC-08, DEC-11, DEC-12 |
| CMP-12 | `src/infrastructure/runtime/process-hook-host.ts`, `src/core/services/zone-guidance.ts`, `delegated-guidance.ts` | Modified | Await `mapInput` and pass the error log; plan-aware actions through `ZoneGuidance` | DEC-06, DEC-11 |
| CMP-13 | `README.md`, `docs/telemetry-block.md`, `docs/context-brake-protocol.md`, `docs/research/harness-integrations.md`, `schemas/context-brake.config.schema.json` | Modified | Documentation, regenerated protocol, and schema | FR-10 |

Flow for a Claude Code `PreToolUse`: the host reads the payload, maps the event, loads the config, and awaits `mapClaudeInput`, which calls `readTranscriptUsage` (CMP-10). The engine reads the ledger summary (CMP-03), and `readZone` (CMP-04) either uses the measurement or drops it as stale and estimates. `classifyZone` (CMP-02) decides the zone, and `CRITICAL` alone reaches the allowlist and the deny path. `PostToolUse` follows the same path, appends the tool line with the resolved source, and, when it injects a block, takes the action from `resolveGuidance`, which chooses the variant by plan presence (CMP-05, CMP-06).

## Contracts and data

- **Configuration (`context-brake.config.json`, `schemaVersion: 1`):**
  - `telemetry.turnCeiling`: optional positive integer, deprecated and ignored.
  - `telemetry.zones.greenMaxTurn` and `yellowMaxTurn`: optional positive integers. Either both are present or neither is, with `greenMaxTurn < yellowMaxTurn`. The error rules are `must be set together with yellowMaxTurn` or `…with greenMaxTurn`, and `must be less than yellowMaxTurn`.
  - `telemetry.zones.criticalTurn`: optional positive integer, deprecated and ignored.
  - Percentage fields and their rules are unchanged, and the default drops the four turn fields. `npm run schemas:check` fails until `schemas/context-brake.config.schema.json` is regenerated.
- **Telemetry block v2:** `[ContextBrake v2] turn=<t>[/<r>] usage=<p>% tokens=<used>/<window> source=<measured|estimated> zone=<ZONE> action=<text>`, where `<r> = yellowMaxTurn + 1` is present only with turn limits. The limit stays at 60 tokens.
- **Block message v2:** same prefix and turn rendering; everything else unchanged.
- **Ledger:** no new line types. Tool lines already store `source`, and reset lines already store `at`.
- **Runtime error log:** reuses code `UNEXPECTED` with detail `TranscriptUnreadableError`. No enum change.
- **Claude Code payload:** `transcript_path?: string` read by the adapter; the schema stays loose.
- **Transcript (consumed, undocumented):** JSON Lines. The fields used are `type`, `isSidechain`, `timestamp`, and `message.usage.{input_tokens, cache_creation_input_tokens, cache_read_input_tokens}`. Everything else is ignored.

## Integrations and interfaces

- **Claude Code hooks:** `PreToolUse` and `PostToolUse` now open the transcript read-only. There is no write to any harness file. Timeout budget: the existing 1,500 ms internal deadline. On deadline, the existing failure policy applies (`RF19`).
- **`doctor`:** new warning `LEGACY_TURN_LIMITS` (scope `project`, path `context-brake.config.json`). The Claude Code capability line changes from unavailable to `unknown`, with its impact text. Exit-code rules follow existing warning handling.
- **`init --yes`:** config `update` change with the normalized telemetry section; `--dry-run` shows it without writing; other keys are preserved.

## Errors, security, and recovery

- Errors and edges:
  - A missing `transcript_path`, a missing file, an empty file, no main-thread assistant line within 4 MiB, a partial last line, or a line with non-numeric usage all lead to the estimate.
  - A stale measurement after a reset leads to the estimate (`FR-06`).
  - Parallel tool calls each read independently and may see the same `usage`, which is correct because it is the same API request.
- User files and sensitive data: the transcript is opened read-only. Only the three token counts and the timestamp leave the reader. No text is logged (`NFR-03`). The config rewrite on `init` follows `file-changes.md` (plan, preview, byte preservation of other keys through the existing store).
- Concurrency and idempotency: reading the transcript while Claude Code appends to it is safe, because the reader tolerates a torn tail. `init` normalization is idempotent.
- Rollback or reversal: reinstalling the previous package restores v1 hooks. A config normalized by `init` stays valid for the previous version only if the turn fields are restored. This is documented in the README upgrade note.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| S1 Config schema and classifier | — | TC-01–TC-04 pass; schema regenerated |
| S2 Block v2, plan-aware actions, protocol, plan-presence port | S1 | TC-05–TC-09 pass; `docs/context-brake-protocol.md` regenerated |
| S3 Measurement contracts in core (`at`, nullable window, `lastResetAt`) | S1 | TC-10–TC-12 pass |
| S4 Transcript reader and Claude adapter async input | S3 | TC-13–TC-18 pass |
| S5 Doctor and init migration; capability; docs and research | S1, S4 | TC-19–TC-23 pass |

## Test approach

- Profile: the affected surfaces are the hook run as one process per event (Claude Code) and the CLI commands `doctor` and `init`. The in-process adapters are touched only through the shared contract. Node.js ≥ 20 (local 24), TypeScript ESM, Vitest with coverage thresholds of 80%. Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run schemas:check`, `npm run build`, `npm run package:smoke`.
- End-to-end: the built CLI hook runs against a fixture repository with a fixture transcript. This extends `tests/e2e/e2e-brake.test.ts` or `e2e-simulated-usage.test.ts`.
- Platforms: Linux, macOS, and Windows through the CI matrix. Transcript paths with spaces and non-ASCII characters are covered in the integration test (`NFR-06`).
- Command prerequisites and exclusions: fixtures `tests/fixtures/harnesses/claude-code/transcript-*.jsonl` are built from the documented-by-observation shape, with synthetic text only. The 20 MB file for NFR-01 is generated at test time in a temp dir.
- Manual acceptance: in a real Claude Code session with the built package installed in a scratch repo, run 30+ tool calls with usage below 50%. Expected: no block injected, no deny, and a `YELLOW` block with `source=measured` once usage passes 50%. Owner: the user.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-01 | unit | Defaults: 74% with 500 turns; 75% with 1 turn | `RED` (74 > 65), not `CRITICAL`; `CRITICAL` | `tests/unit/zone-classifier.test.ts` |
| TC-02 | FR-02 | unit | Limits 59/99 (yellow from 60, red from 100): 60 turns at 10% → `YELLOW`; 100 → `RED`; 10,000 → `RED` | As stated | `tests/unit/zone-classifier.test.ts` |
| TC-03 | FR-02, FR-09 | unit | Config: only `greenMaxTurn`; `greenMaxTurn >= yellowMaxTurn`; legacy config with 7/10/12 and `turnCeiling` 12; `turnCeiling` ≠ `criticalTurn` | Rejected with path and rule; rejected; accepted; accepted | `tests/unit/configuration.test.ts` |
| TC-04 | OBJ-01 | integration | Engine with defaults, 200 `post_tool` and `pre_tool` events at 30% estimated usage | 0 denies, no block injected | `tests/unit/brake-engine-pre-tool.test.ts`, `brake-engine-lifecycle.test.ts` |
| TC-05 | FR-03 | unit | Block with limits off and on | `turn=12` and `turn=12/100`, with the `v2` prefix | `tests/unit/telemetry-block.test.ts` |
| TC-06 | NFR-04 | unit | Longest v2 block with each action variant | ≤ 60 tokens | `tests/unit/telemetry-block-budget.test.ts` |
| TC-07 | FR-08 | unit | `YELLOW` and `RED` injection with plan present and absent | `withPlan` and `withoutPlan` texts respectively; no-plan texts contain no "do not start" | `tests/unit/brake-engine-lifecycle.test.ts` |
| TC-08 | FR-08 | unit | Protocol render with defaults and with turn limits | Both variants per zone; turn conditions only when on; coherent with the classifier at the boundaries | `tests/unit/protocol-service.test.ts`, `protocol-zone-coherence.test.ts` |
| TC-09 | FR-08 | unit | `resolveGuidance` in plan mode with the plan present or absent, and without a port | `withPlan`, `withoutPlan`, `withPlan` | `tests/unit/zone-guidance.test.ts`; the file port is covered by `tests/unit/plan-presence.test.ts` (prd-06) |
| TC-10 | FR-07 | unit | Measured with `contextWindow: null` | Window = `contextWindowCeiling`, source `measured` | `tests/unit/usage-resolver.test.ts` |
| TC-11 | FR-06 | unit | Measurement `at` before, equal to, and after the last reset | Estimated, estimated, measured | `tests/unit/session-zone.test.ts` |
| TC-12 | FR-06 | unit | `summarizeLedger` with two reset lines | `lastResetAt` is the last one | `tests/unit/session-counters.test.ts` |
| TC-13 | FR-04 | integration | Fixture whose last assistant line has 2 + 784 + 193,645 | `{ tokens: 194431, at }` | `tests/integration/claude-transcript-usage.test.ts` |
| TC-14 | FR-04 | integration | Last assistant line `isSidechain: true`, an earlier main line | Earlier main-line usage | same |
| TC-15 | FR-05, NFR-02 | integration | Missing file; empty file; torn last line; non-numeric usage; no assistant line | `null` each time; no throw | same |
| TC-16 | NFR-01, NFR-06 | integration | 20 MB generated transcript at a path with spaces and accents | Correct result; p95 of 50 reads no worse than 2x the p95 of the same tail alone + 10 ms (work independent of size); built-hook `PostToolUse` p95 against the 20 MB transcript within the overhead limit | `tests/integration/claude-transcript-usage.test.ts`, `tests/integration/runtime-overhead.test.ts` |
| TC-17 | FR-04, FR-05 | integration | Claude `PreToolUse` and `PostToolUse` payloads with `transcript_path`, and with `agent_id` | `source=measured` in the block and in the ledger tool line; estimate for the subagent | `tests/unit/runtime-claude.test.ts` |
| TC-18 | FR-01, FR-04 | end-to-end | Built hook, fixture repo, transcript at 80% of 128,000 tokens | `PreToolUse` on `Read` of a code file is denied; at 40% it is allowed after 50 prior calls | `tests/e2e/e2e-brake.test.ts` |
| TC-19 | FR-09 | unit | `doctor` with 7/10/12; with 20/30/40; without legacy fields | Retired-defaults warning; ignored-fields warning; no finding | `tests/unit/doctor-checks.test.ts` |
| TC-20 | FR-09 | integration | `init --yes` on a legacy config with 7/10/12, then again | Turn fields removed and other keys intact; second run makes no change | `tests/integration/` init suite |
| TC-21 | FR-10 | unit | Claude capabilities | `context_usage` `unknown`, with impact text | `tests/unit/` capability or support suite |
| TC-22 | FR-10 | unit | README config example and protocol file | The README example validates; `docs/context-brake-protocol.md` equals `renderProtocol(DEFAULT_CONFIG)` | `readme-config-example.test.ts`, `protocol-content.test.ts` |
| TC-23 | NFR-05 | gate | Full gates | All pass, coverage ≥ 80% | `npm run lint && npm run typecheck && npm run coverage && npm run schemas:check && npm run package:smoke` |

## Quality profile

Rules this feature can violate. A blocking hit prevents task completion and rejects the review; a reservation becomes an optional improvement and counts toward escalation. A hit covered by `DEC-NN` is expected, not a finding.

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `"${RG[@]}" ':\s*any\b|\bas any\b|<any>' "${files[@]}"` | — |
| QA-02 | Suppressions (`@ts-ignore`, `eslint-disable`) | blocking | `"${RG[@]}" '@ts-ignore|@ts-nocheck|eslint-disable' "${files[@]}"` | — |
| QA-03 | Empty `catch` | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | — |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure|cli)/" "${core_files[@]}"` | — |
| QA-05 | stdout writes on the hook path | blocking | `"${RG[@]}" 'console\.log|process\.stdout\.write' "${hook_files[@]}"` | — |
| QA-06 | Synchronous fs in the hook path (transcript reader) | blocking | `"${RG[@]}" '\b(readFileSync|openSync|readSync|existsSync|statSync)\b' src/infrastructure/harnesses/claude-code/transcript-usage.ts` | — |
| QA-07 | Clock in `core` | reservation | `"${RG[@]}" 'Date\.now\(\)|new Date\(\)' "${core_files[@]}"` | `Date.parse` of stored timestamps in DEC-09 is not a clock read |
| QA-08 | Parameter list with 4+ parameters; file above 100 lines | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{|=>)' "${files[@]}"`; `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | — |

- Verification scope: the TypeScript files in each task diff. `hook_files` = `src/infrastructure/harnesses/claude-code/runtime.ts`, `transcript-usage.ts`, and `src/infrastructure/runtime/process-hook-host.ts`, excluding `writeDecision` and the default context (the response writer).
- Escalation trigger: 8+ reservation hits, a touched file above 200 lines, or duplication in 3+ places.

### Terrain baseline

Measured at HEAD `3b94a9c` with the commands in `preparatory-refactoring.md`. No blocking-rule hits and no 4+ parameter declarations were found in any target file.

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/core/contracts/configuration.ts` | 61 | 6 | <4 | 0 | — | recorded |
| `src/core/services/zone-classifier.ts` | 15 | 3 | <4 | 0 | — | recorded |
| `src/core/services/session-counters.ts` | 39 | 3 | <4 | 0 | — | recorded |
| `src/core/services/session-zone.ts` | 24 | 6 | <4 | 0 | — | recorded |
| `src/core/services/usage-resolver.ts` | 30 | 5 | <4 | 0 | — | recorded |
| `src/core/services/telemetry-block.ts` | 18 | 3 | <4 | 0 | — | recorded |
| `src/core/services/block-message.ts` | 28 | 3 | <4 | 0 | — | recorded |
| `src/core/services/zone-actions.ts` | 48 | 5 | <4 | 4 | — | recorded |
| `src/core/services/protocol-service.ts` | 64 | 3 | <4 | 0 | — | recorded |
| `src/core/services/brake-engine.ts` | 86 | 7 | <4 | 5 | — | recorded |
| `src/core/services/doctor-checks.ts` | 98 | 4 | <4 | 0 | QA-08: 98 lines, near the limit | recorded; `LEGACY_TURN_LIMITS` goes in a new `config-legacy-checks.ts` if the file would pass 100 lines |
| `src/core/services/installation-builder.ts` | 60 | 4 | <4 | 0 | — | recorded |
| `src/core/services/failure-policy.ts` | 87 | 11 | <4 | 0 | Structural: 11 exports | recorded (only read by this feature) |
| `src/infrastructure/harnesses/claude-code/runtime.ts` | 70 | 6 | <4 | 4 | — | recorded |
| `src/infrastructure/harnesses/claude-code/capabilities.ts` | 10 | 1 | <4 | 0 | — | recorded |
| `src/infrastructure/runtime/process-hook-host.ts` | 100 | 6 | <4 | 0 | QA-08: at the 100-line limit | recorded; the change must stay line-neutral (one `await` inside an existing expression) |
| `src/infrastructure/runtime/runtime-composition.ts` | 81 | 10 | <4 | 0 | Structural: 10 exports | recorded; the new port extends the existing `RuntimePorts` type, with no new export |
| `src/infrastructure/runtime/plan-validation-reader.ts` | 40 | 1 | <4 | 0 | — | recorded |
| `src/infrastructure/runner/wrap-telemetry.ts` | 41 | 5 | <4 | 0 | — | recorded |

- Preparatory refactoring: not recommended. The structural hits (`failure-policy.ts`, `runtime-composition.ts`) either are not modified or get one contact point that does not extend the saturated export list.

## Observability and rollout

- Signals: tool lines in the ledger carry `source` (`measured` or `estimated`), so `doctor`'s brake-session summary shows whether measurement works. Transcript I/O failures appear in the runtime error log as `UNEXPECTED` / `TranscriptUnreadableError`.
- Migration and compatibility: old configs keep validating. `doctor` shows `LEGACY_TURN_LIMITS` along with the existing outdated-asset and protocol-mismatch findings, and one `init --yes` fixes all three.
- Rollout and rollback: ships in the next minor release. The README gets an upgrade note (run `init --yes`). Rollback means pinning the previous version and restoring the turn fields.

## Risks and open items

- Risk: Claude Code changes the transcript format (medium probability, low impact). Measurement silently falls back to the estimate, and TC-13 through TC-15 pin the parsing. The research section is re-checked when adapters are touched (`AGENTS.md`).
- Risk: `contextWindowCeiling` = 128,000 is small against Claude windows of 200,000 or 1,000,000 tokens (high probability, medium impact). With a real measurement, `CRITICAL` fires at 96,000 tokens, while a Claude Code session starts around 20,000–40,000. The PRD keeps the default, and the README explains that it is a budget. The user can raise it.
- Risk: the transcript lags one request behind (high probability, low impact). The reading can be off by one tool result. That is acceptable, and `PostToolUse` also adds nothing on top of the measurement.
- Resolved at HIL 2 (`DEC-HIL-03`): `DEC-07` skips unparseable transcript lines without logging them; `NFR-02` was updated to match.

## Relevant files

- Modify: `src/core/contracts/configuration.ts`, `src/core/services/zone-classifier.ts`, `session-counters.ts`, `session-zone.ts`, `usage-resolver.ts`, `zone-actions.ts`, `telemetry-block.ts`, `block-message.ts`, `protocol-service.ts`, `brake-engine.ts`, `doctor-checks.ts` or a new sibling, `installation-builder.ts`; `src/infrastructure/harnesses/claude-code/runtime.ts`, `schemas.ts`, `capabilities.ts`; `src/infrastructure/runtime/process-hook-host.ts`, `runtime-composition.ts`, `plan-validation-reader.ts`; `schemas/context-brake.config.schema.json`; `README.md`; `docs/telemetry-block.md`; `docs/context-brake-protocol.md`; `docs/research/harness-integrations.md`.
- Create: `src/infrastructure/harnesses/claude-code/transcript-usage.ts`; `tests/integration/claude-transcript-usage.test.ts`; `tests/fixtures/harnesses/claude-code/transcript-*.jsonl`.
