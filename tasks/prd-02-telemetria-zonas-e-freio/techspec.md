# TechSpec — Telemetry, zones, and brake

## Sources and traceability

- PRD: `tasks/prd-02-telemetria-zonas-e-freio/prd.md`. The PRD is written in Portuguese and keeps its legacy IDs (`RF1`–`RF22`, `CA-01`–`CA-23`); this document does not rename them.
- Dependent features: `tasks/prd-01-instalacao-deteccao-diagnostico/prd.md` and its `techspec.md` (capability matrix, support levels, `doctor`, runtime assets, manifest); `tasks/prd-01.1-pendencias-da-instalacao/prd.md` and its `techspec.md` (support-level rule, documented payload fields, asset currency, `.context-brake/runtime/` removal via `--remove-state`; `APPROVED WITH RESERVATIONS` in `codereview_02`, implemented at `a26e45a`, review of the parent feature at `codereview_09`); `tasks/prd-03-plano-checkpoint-e-boot/prd.md` (plan and checkpoint schemas, boot; not implemented yet); `tasks/prd-04-runner-de-reinicio-automatico/prd.md` (out of scope, `wrap`).
- Applicable instructions, rules, and skills: `AGENTS.md`; `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`, `file-changes.md`, `cli-output.md`; skill `sdd-create-techspec` with `references/preparatory-refactoring.md`, `references/typescript-node.md`, and `references/quality-typescript.md`.
- Research: `docs/research/harness-integrations.md` (all eight harness sections), `docs/research/telemetry-self-pacing.md` (zones, telemetry, guillotine), and `docs/research/contextops-spec-review.md` (inconsistencies 1 to 8, which this design must not repeat).
- Vendor documentation rechecked on 2026-09-15: [Claude Code hooks](https://code.claude.com/docs/en/hooks), [Codex hooks](https://learn.chatgpt.com/docs/hooks), [Cursor hooks](https://cursor.com/docs/hooks), [GitHub Copilot hooks](https://docs.github.com/en/copilot/reference/hooks-reference), [OpenCode plugins](https://opencode.ai/docs/plugins/) and [SDK](https://opencode.ai/docs/sdk/), [Pi extensions](https://raw.githubusercontent.com/badlogic/pi-mono/main/packages/coding-agent/docs/extensions.md) and `packages/coding-agent/src/core/extensions/types.ts`, [Oh-My-Pi extensions](https://raw.githubusercontent.com/can1357/oh-my-pi/main/docs/extensions.md) and `packages/coding-agent/src/extensibility/extensions/types.ts`, and [Antigravity hooks](https://antigravity.google/docs/hooks/). The research file is silent about end-of-response payloads and Antigravity response semantics; the re-check results are recorded under Integrations and interfaces and must be written back to the research file in the same implementation change (`harness-adapters.md`).
- Evidence in existing code (HEAD `b9647e9`):
  - `assets/runtime/*.ts` are neutral stubs: `process-hook.ts:37-41` maps a fixed response per event; the Pi, Oh-My-Pi, and OpenCode assets register empty handlers.
  - `src/core/contracts/configuration.ts:21` already holds `telemetry.injectionMode`, `activationThresholdPercentage`, `contextWindowCeiling`, `turnCeiling`, and `zones` with ordering refinements; `DEFAULT_CONFIG` has `turnCeiling: 12` and `zones.criticalTurn: 12` but no rule linking them.
  - `src/core/services/protocol-service.ts:4-36` renders the zone table from that configuration; `tests/unit/protocol-service.test.ts:47-50` pins the packaged protocol byte-for-byte.
  - `src/core/services/support-service.ts:46-56` derives the support level from `pre_tool_block`, `tool_coverage`, `post_tool_telemetry`, and `session_boot`; each adapter declares `CAPABILITIES` (Claude Code `adapter.ts:15-22`, Codex `:20-27`, Cursor `:14-21`, Copilot `:14-21`, Antigravity `:14-21`, OpenCode `:14-21`, Pi `:14-21`, Oh-My-Pi `:14-21`). PRD-01.1 rule: Codex partial (`tool_coverage` unsupported because hosted tools bypass hooks), OpenCode partial (`tool_coverage` unknown), Antigravity cooperative (only `PreInvocation` is installed by PRD-01).
  - `src/infrastructure/harnesses/*/planner.ts` and `common/{claude-merger,codex-hooks-updater,cursor-hooks-updater,antigravity-hooks-updater}.ts` register `PreToolUse`, `PostToolUse`, and `SessionStart` only.
  - `src/infrastructure/diagnostics/overhead-measurer.ts:66-80` measures the installed asset for the registered event (PRD-01.1 FR-05); `in-process-sampler.ts:28-34` still passes a fake usage context `{ usedTokens, maxTokens }` that matches neither Pi's `ContextUsage` (`{ tokens: number | null, contextWindow: number, percent: number | null }`) nor Oh-My-Pi's (`{ tokens: number, contextWindow: number, percent: number }`).
  - `src/infrastructure/storage/runtime-state-files.ts:4` fixes `RUNTIME_STATE_RELATIVE_DIR = '.context-brake/runtime'`, the directory PRD-01.1 FR-09 removes with `--remove-state`.
  - `scripts/asset-bundler.ts:21-40` bundles assets without a metafile; `tsconfig.check.json:4` already includes `assets/**/*.ts`; `vitest.config.ts:13` limits coverage to `src/**/*.ts`, so runtime logic outside `src/` would be uncovered.
  - Tests that pin current behavior and must move with the change: `tests/unit/readme-support-table.test.ts:60-64` (Antigravity must show `cooperative` with a `PreInvocation` limitation), `tests/unit/runtime-assets.test.ts:12-16` (process assets contain `runProcessHook`), `tests/unit/asset-bundler.test.ts:9` (nine runtime assets), `tests/unit/in-process-sampler.test.ts:31-35` (OpenCode handler signature `(input, output)`).

## Solution summary

ContextBrake gains the runtime brake that PRD-01 already installs hooks for. One versioned engine in `src/core/` serves all eight harnesses: it counts completed tool calls per session in an append-only JSONL ledger on disk, resolves context usage (measured where the host API documents it, estimated otherwise), classifies the session into `GREEN`, `YELLOW`, `RED`, or `CRITICAL` from the same configuration that renders the protocol, and returns one of four decisions — neutral, deny with a block message, deliver the telemetry block, or notify the user. Each harness adapter only maps its documented payloads to normalized runtime events and renders the engine's decision in documented output fields; vendor event names, payload shapes, and response formats stay inside `src/infrastructure/harnesses/<harness>/`. The `assets/runtime/` entrypoints become thin bundles over typechecked, covered code in `src/`.

Above the critical ceiling, pre-tool events deny everything except the allowlist: plan and checkpoint file access, the active step's validation command, `git status`, `git add`, `git commit`, and configured extra commands. Below the ceiling a failure inside the integration never blocks; at or above it, the hook denies from the last zone recorded in the ledger, and keeps the allowlist available even when the configuration is invalid. Doctor reports sessions that ran with a cooperative brake plus recorded blocks and runtime errors through the existing report schema. The end-of-response signal `[REQUEST_SESSION_RESET]` produces a user-visible notice with the harness's new-session command where the vendor documents both the response text and a user channel. Out of scope: automatic restarts and `wrap` (PRD-04), boot content (PRD-03), exact tokenizers, triggering native compaction, and any network or API-level interception.

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | RF12, RF15, RF17, RF19 | Runtime logic lives in `src/` as a core engine (`src/core/services/brake-engine.ts` and helpers) plus infrastructure hosts in `src/infrastructure/runtime/`. Each harness adds `runtime.ts` (payload mapping and response rendering) and `capabilities.ts`; planners, updaters, and adapters import `capabilities.ts`. `assets/runtime/*.ts` shrink to one call each and `assets/runtime/process-hook.ts` is deleted. | `harness-adapters.md` requires agent-facing text built in `core` and shared by all adapters. Coverage includes only `src/**/*.ts` (`vitest.config.ts:13`), and this feature cannot sit outside typecheck and coverage. | Keep logic in `assets/runtime/`: uncovered and only typechecked by `tsconfig.check.json`. One hook per harness: the block and message text would drift between harnesses. |
| DEC-02 | RF12, RF15, overhead objective, CA-20 | Everything bundled into runtime assets validates with `zod/mini`. `configurationSchema` and `zonesSchema` migrate to `zod/mini` (`strictObject`, `.check(...)`), preserving field paths and rule messages asserted by `tests/unit/configuration.test.ts`. Each `harnesses/*/schemas.ts` migrates to `zod/mini` loose objects. The five unused classic exports in `src/core/contracts/harness.ts:50-54` are deleted, leaving the module Zod-free. `scripts/generate-schemas.ts` keeps using `z.toJSONSchema`, which accepts mini schemas. A bundle guard test fails if any runtime asset includes classic `zod`, `jsonc-parser`, `semver`, `node:child_process`, or `src/cli/`. | Local measurement on 2026-09-14 (Windows 11, Node 24, minified esbuild bundles, interleaved spawns): classic Zod with the config schema added about 33 ms at p50 and doubled p95 (445.7 KiB); `zod/mini` stayed within noise of the stub (21.9 KiB). The rule in `javascript-typescript.md` requires Zod for external data; mini is still Zod. | Classic Zod everywhere: risks the 100 ms process budget. A hand-written duplicate schema: two sources of truth that can drift from the published schema. |
| DEC-03 | RF9, RF10, RF11, CA-03, CA-04, CA-05, CA-23 | Usage percentage is the integer `floor(usedTokens × 100 / windowTokens)`, and classification uses that same integer. Classification runs from the highest zone down (critical, red, yellow, green), so bands are complete by construction. Values above 100% classify as `CRITICAL`. A new cross-field rule requires `telemetry.turnCeiling` to equal `telemetry.zones.criticalTurn` (`must equal telemetry.zones.criticalTurn`). The ceiling shown in the block is `criticalTurn`. | Integer boundaries match the PRD values (49/50, 65/66, 74/75) and the protocol wording ("below 50%", "above 65%"). Classifying the displayed integer avoids a block that shows 65% and says `RED`. The two fields exist with no linking rule — inconsistency 2 of `contextops-spec-review.md`; CA-23 requires the rejection. | Classify the exact ratio: a 65.4% reading would be `RED` while the block shows 65%. Remove `turnCeiling`: a breaking change to config v1. |
| DEC-04 | RF1, RF2, RF3, RF4, CA-06, CA-07, CA-08, isolated-execution constraint | Per-session state is an append-only JSONL ledger at `.context-brake/runtime/sessions/<harness>/<key>.jsonl`. `key` is the first 32 hex characters of `sha256(sessionId + "\0" + (agentId ?? ""))`. Turns are the `tool` lines after the last `reset` line, deduplicated by `toolUseId` when the harness sends one; the reported turn is `existing tool lines + 1`, never a stored counter. Each post-tool event appends one line in a single `appendFile` call (well under 4 KiB) and never rewrites the file. Readers skip lines that fail the mini schema. A subagent with a harness-provided agent ID gets its own key. | Process hooks start fresh on every event (`harness-adapters.md`). Parallel calls (CA-06) run as concurrent processes, so single `O_APPEND` writes serialize without locks; the isolated call that follows reads every line and reports 4. Hashing prevents path traversal from harness-controlled IDs. The directory is the one PRD-01.1 FR-09 already removes. | A counter JSON file with locks: stale-lock recovery and a clock needed, increments lost on crash. SQLite: a native dependency on the hook path. An in-memory daemon: violates the offline, no-service constraint. |
| DEC-05 | RF5, RF6, RF7, RF8, CA-09, CA-10, CA-11, honest-measurement objective | Usage is `measured` only when an integration API documents it: Pi `ctx.getContextUsage()` and Oh-My-Pi `ctx.getContextUsage()`, returning `{ tokens, contextWindow, percent }` (verified 2026-09-15 in both extensions' `types.ts`; Pi allows `null` tokens/percent). Everywhere else it is `estimated`: `baselineTokens + ceil(observedCharacters / 4) + turns × tokensPerTurn`. `observedCharacters` sums the character length of documented tool input and output fields since the last reset. `baselineTokens` (initially 15,000) and `tokensPerTurn` (initially 150) are provisional per-harness constants in the runtime descriptor, calibrated by TC-13. The window comes from the harness when measured (`contextWindow`) and from `telemetry.contextWindowCeiling` otherwise. The ledger stores counts only, plus the parallel estimate used by CA-11. | The vendor docs rechecked on 2026-09-15 confirm that no process hook payload carries token usage; Claude Code usage reaches only the status line, Cursor only `preCompact`, and Codex only `/status`. Tool I/O fields are documented for every process harness, whereas transcript formats are not documented as stable and Claude Code writes the transcript asynchronously. Pi and Oh-My-Pi expose a usage API. | Parse transcripts: undocumented format and asynchronous writes. A Claude Code status line bridge: `statusLine` is a single user-owned setting (open item). A model-to-window table: an invented mapping. |
| DEC-06 | RF12, RF14, RF15, RF16, CA-01, CA-12, CA-13, cost objective | Telemetry block v1 is one plain-text line of `key=value` fields (see Contracts). Zone actions come from one core module (`zone-actions.ts`) that also feeds the protocol renderer, so the protocol sentences and the compact block actions cannot diverge. The block is documented in `docs/telemetry-block.md`, published with the package, and covered by `tests/integration/package-contents.test.ts`. The budget test counts tokens with `js-tiktoken` (`o200k_base`, new devDependency) and asserts at most 50 tokens and 220 characters, a 10-token margin under the PRD's 60. | `harness-adapters.md` prefers added context over replacing results. The tokenizer rule in `javascript-typescript.md` is satisfied in tests; the runtime never tokenizes. Claude's tokenizer is not public, so the margin absorbs tokenizer variance. | A multi-line or Markdown block: more tokens. A JSON block: more tokens and harder to read. Estimating tokens as characters divided by 4 in tests: unreliable for digits and symbols. |
| DEC-07 | RF13, CA-01, CA-02, CA-22, cost objective, UX main flow | In `threshold_only` mode a block is delivered when the zone is not `GREEN` or the usage percentage reaches `activationThresholdPercentage`, whichever happens first; a `GREEN` session below the threshold receives nothing. In `always` mode every post-tool event delivers one. A session that turns `YELLOW` by turn count alone receives telemetry. | RF13 and the PRD main flow: telemetry starts as soon as the session leaves `GREEN`. With the defaults the threshold (50%) coincides with the start of `YELLOW`, so CA-01 and CA-02 hold; CA-22 covers the turn-driven case. | Usage threshold only: a session red by turn count would learn it only when blocked. Zone only: leaves `activationThresholdPercentage` as dead configuration. |
| DEC-08 | RF17, RF18, CA-14, CA-15 | At `CRITICAL`, a pre-tool call runs only if every target it touches is allowlisted. Allowlisted: (a) file reads and writes whose every path resolves to the configured plan or checkpoint file; (b) a shell command exactly equal, after trimming, to the active step's validation command; (c) `git status`, `git add`, or `git commit` with any arguments, provided the command has no shell operators (`;`, `&`, `\|`, backtick, `$(`, `<`, `>`, CR, LF); (d) commands whose leading tokens match an entry in the new `brake.additionalAllowedCommands` list, under the same operator rule. Unknown tools and unclassifiable inputs are denied. Below the ceiling no classification runs; the neutral response omits the decision wherever the harness allows it. Cursor and Antigravity require a decision field and keep an explicit allow. | RF18 lists these entries and makes the list configurable. Reads are included because Claude Code's `Write` and `Edit` refuse to overwrite a file the session has not read. The operator rule stops `git status && <anything>`. Plan and checkpoint are git-ignored local state since PRD-01.1 FR-01, so saving state never depends on committing them. | Allow any command starting with `git`: allows destructive git commands. A configurable replacement for the built-in list: could remove the state-saving floor. |
| DEC-09 | RF19, CA-16 | Every hook and plugin handler runs inside a failure boundary with a 1,500 ms internal deadline. On any exception, invalid configuration, or deadline expiry, the fallback reads the last recorded zone from the ledger, skipping bad lines. If that zone is `CRITICAL`, allowlisted calls still pass: the fallback classifies the tool and evaluates the allowlist with the loaded configuration, or with the default plan and checkpoint paths and no additional commands when the configuration is invalid, and denies with the failure variant of the block message only when the call is not allowlisted or cannot be classified. Otherwise, or when no zone is readable, it stays neutral. Process hooks always exit with code 0 and write at most one response. The failure is appended to `.context-brake/runtime/errors.jsonl` with metadata only. | Claude Code, Codex, and Copilot fail open on errors or timeouts; Cursor with `failClosed: true` blocks on crash, timeout, or empty output. A predictable fallback therefore needs an explicit response and exit code 0 below the ceiling. | Exit 2 on failure: blocks Claude Code, Copilot, and Cursor calls below the ceiling, violating RF19. Treat an unknown zone as critical: blocks healthy sessions whenever the ledger is new or corrupt. |
| DEC-10 | RF21, CA-17, US6 | The brake mode is derived from the PRD-01.1 capability model: `enforced` when `pre_tool_block` and `tool_coverage` are both `supported`, otherwise `cooperative`, with the first missing or unknown capability's `impact` as the reason (Codex: hosted tools bypass hooks; OpenCode: tool coverage unconfirmed; Antigravity: hook coverage in the CLI unconfirmed). Timeout and failure behavior is a reported limitation and does not change the mode. Each harness's `CAPABILITIES` moves to `capabilities.ts`, imported by `adapter.ts` and `runtime.ts`. The runtime writes the mode and reason in the ledger's `session` line. Doctor emits one `BRAKE_COOPERATIVE` warning per harness with recorded cooperative sessions, naming up to five recent session IDs and the reason. `DoctorReport` schema v1 is unchanged. | PRD-01.1 FR-02 and RF21 define a guaranteed block as an explicit deny honored on every tool call; a single source for support levels and brake guarantees avoids drift. Findings already carry harness, message, and impact; adding a report field would break strict consumers of the published schema. | Recompute the mode in doctor: loses what the session actually ran with after an upgrade. Add a `sessions` array to `DoctorReport`: a published schema change. |
| DEC-11 | RF20, CA-18, US8 | Blocks are appended to `.context-brake/runtime/blocks.jsonl`: time, harness, session ID, agent ID, tool name, zone, turn, percentage, source, and reason code. Tool input and output are never stored. Doctor emits a `BRAKE_BLOCKS_RECORDED` finding with severity `ok`, giving the count and path, and a `RUNTIME_ERRORS_RECORDED` warning when `errors.jsonl` has entries from the last 24 hours. | CA-18 asks for session, tool, zone, and reason; the privacy rules forbid content. A local file works offline and is easy to read. | A new `context-brake log` command: CLI surface the PRD does not require. Recording tool arguments: leaks paths, commands, and secrets. |
| DEC-12 | RF22, CA-19, US7 | The signal is recognized only as the final text of an assistant response, after trimming trailing whitespace. Supported where the vendor documents both the response text and a user channel: Claude Code `Stop` (`last_assistant_message` → `systemMessage`, command `/clear`), Codex CLI `Stop` (`last_assistant_message` → `systemMessage`, `/new`), Pi `message_end` for assistant messages (`ctx.ui.notify`, `/new`), Oh-My-Pi `session_stop` (`last_assistant_message`, `ctx.ui.notify`, `/new`). Unsupported and not registered for this purpose: Cursor (no new-session command documented), Copilot (`agentStop` has no response text; only `subagentStop` does), OpenCode (no documented event properties), Antigravity (`Stop` has no assistant text). The new-session command lives in each runtime descriptor. | Vendor docs checked 2026-09-15; the research file does not yet record these payloads and is updated in the same change. | Read transcripts for the last message: undocumented format. Use Cursor `stop.followup_message`: it sends the notice as a prompt to the agent. |
| DEC-13 | RF3, CA-07, compaction and restart edge cases | Reset events per harness are listed under Integrations. New registrations: Claude Code `Stop`; Codex CLI `Stop`; Cursor `preCompact`; Copilot `preCompact`; Antigravity `PreToolUse` and `PostToolUse`; OpenCode `session.created` and `session.compacted` events; Pi `session_compact`. Cursor and Copilot reset at `preCompact` because neither documents a post-compaction event. A `resume` start never resets; a new session ID starts a new ledger. | Claude and Codex `SessionStart` sources include `compact`; Pi documents `session_compact`; Oh-My-Pi documents `session_compact` and `auto_compaction_end`. Without Antigravity `PostToolUse` there is no turn count for its brake. | Reset only on a new session ID: turns would keep counting after compaction, failing CA-07. |
| DEC-14 | RF17, RF21, PRD-01.1 FR-02 | Antigravity CLI registers `PreToolUse` (deny above the ceiling, `allow` below) in addition to `PreInvocation` and `PostToolUse`. Because the response field is required and there is no neutral verdict, `allow` auto-approves the call and bypasses the harness's normal permission flow; that cost is recorded as a product open item and must be confirmed at the technical HIL. `pre_tool_block` becomes `supported` and `tool_coverage` stays `unknown`, so the harness moves from cooperative to partial support while the brake stays cooperative. The README support row and `tests/unit/readme-support-table.test.ts` move with it. | PRD-01.1 FR-02 states that selective per-tool denial arrives with PRD-02, and PRD-01.1's acceptance says Antigravity is cooperative only because PRD-01 does not register `PreToolUse`. The vendor docs (2026-09-15) confirm `decision` is required with `allow`/`deny`/`ask`/`force_ask`/`deny_unless_prior_grant`. | Do not register `PreToolUse`: Antigravity keeps no blocking at all and stays fully cooperative; the PRD-01.1 forward reference is not honored. Register with `ask` below the ceiling: forces a user prompt on every tool call. |
| DEC-15 | Isolated-execution constraint, RF2 | The runtime project root is `CLAUDE_PROJECT_DIR` (Claude Code) or `CURSOR_PROJECT_DIR`, with its `CLAUDE_PROJECT_DIR` alias (Cursor), when set; `ctx.cwd` for Pi and Oh-My-Pi; the plugin's `directory` or `worktree` input for OpenCode; otherwise two directories above the installed asset, resolved with `realpath`. Runtime files are created only under `<root>/.context-brake/runtime/`. | The environment variables are documented. Codex runs hooks in the session's working directory, which can be a subdirectory, and every installed asset sits at `<root>/<dir>/<subdir>/context-brake.*`. OpenCode documents `directory` and `worktree` in the plugin factory input. | `process.cwd()`: wrong in subdirectories. `git rev-parse` per event: spawns a process per event and fails without git. |
| DEC-16 | Privacy, offline, RF2 | `.context-brake/runtime/.gitignore` containing `*` is created on first write. On new-session events (not on `resume` or compaction), ledger files untouched for 14 days are pruned. In-process hosts cache per-session summaries in memory and write through to the same ledger with async I/O only; the cache is invalidated on session start and compaction. | Ledgers must not reach commits. The retention bound keeps the directory small without a background process, and the shared format lets doctor read sessions from every harness. The directory is removed by `remove --remove-state` (PRD-01.1 FR-09). | A user cache directory under the home folder: doctor would need per-project mapping, and a project copy would lose its state. No retention: unbounded growth. |
| DEC-17 | CA-20, overhead objective | PRD-01.1 FR-05 already makes the measurer pass the registered event to process assets and run the `tool_call` or `tool.execute.before` handler of in-process assets. This feature updates the in-process sampler's benchmark context to the real `ContextUsage` shape and keeps doctor on the read-only neutral pre-tool path, so project files are untouched. An automated process-lane test measures the built post-tool path and the `CRITICAL` pre-tool path, including allowlist evaluation, in a temporary repository with a pre-seeded ledger. Bundles stay unminified. | Before PRD-01.1 the measurer omitted the event argument and timed the last registered in-process handler. Readable assets help users review what they install and Codex's hash-based trust review. | Benchmark the post-tool path in doctor: writes ledgers in the user's project. Minify now: no measured need beyond noise, and reviewability drops. |
| DEC-18 | RF18, PRD-03 dependency | Until the PRD-03 TechSpec defines the plan schema, a provisional read-only reader parses the configured plan file with a loose mini schema: `{ currentStepId?: string | number, steps: [{ id: string | number, status: string, validationCommand?: string }] }`. The active step is `currentStepId`, then the step `IN_PROGRESS`, then the last `COMPLETED` step. A missing or invalid plan yields no allowlisted validation command; the other allowlist entries still apply. The plan is read only when a `CRITICAL` pre-tool call is a shell command. | The protocol says to run "the validation command of the active step, or of the last completed step". Reading lazily keeps the plan off the common path. | Wait for PRD-03: blocks RF18. Snake_case names from the frozen SRS: this project's owned files use camelCase. |
| DEC-19 | CA-11, CA-21, efficacy objective, measurement objective | Long-task acceptance runs against a deterministic harness simulator instead of real agent sessions. The simulator installs ContextBrake with the built CLI in a temporary repository and plays a fixed catalog of scripted sessions for every full-level harness (Claude Code, Cursor, Copilot, Pi, Oh-My-Pi). Process harnesses are driven by spawning the installed hooks with documented payloads, and a simulated tool runs only when the documented response allows it. Pi and Oh-My-Pi are driven by loading the built extension with a mock API whose `getContextUsage()` returns the `o200k_base` token count of the simulated context. Agent profiles cover compliant agents, agents that ignore `YELLOW` and `RED`, parallel batches, compaction, subagents, shell-operator tricks, writes outside the allowlist, and injected failures. | Product decision from the PRD (`Verificação por simulação`): real long-task runs are not viable in cost, time, or determinism, and they need a person to run `/clear`. Driving the built assets with documented payloads exercises the same contract a harness does, including process concurrency and the failure policy, and `tests.md` accepts fakes that follow the documented formats. | Real harness runs: not viable. Unit tests only: miss built assets, process concurrency, and the ledger on disk. Replaying recorded sessions: no recordings exist, and they would contain prompt content. Trade-off: the simulation cannot verify model compliance or undocumented vendor behavior. |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/core/contracts/zones.ts` | New | `ZONES`, `Zone`, `USAGE_SOURCES`, `UsageReading`, `ZoneInput`; no Zod. | — |
| CMP-02 | `src/core/contracts/runtime.ts` | New | `SessionKey`, `ToolCall` (category `file_read`, `file_write`, `shell`, `other`; paths; command), the `RuntimeEvent` union (`pre_tool`, `post_tool`, `pre_invocation`, `session_reset`, `response_end`), the `RuntimeDecision` union (`neutral`, `deny`, `context`, `notify_user`), `BrakeMode`, `RuntimeDescriptor` (harness, capability definitions, estimation constants, new-session command or `null`). | CMP-01 |
| CMP-03 | `src/core/contracts/session-ledger.ts` | New | Ledger, block, and error log line types with `zod/mini` schemas (v1); ports `SessionLedger`, `BlockLog`, `RuntimeErrorLog`, `PlanReader`, `Clock`, `SessionLedgerReader`. | CMP-01, CMP-02 |
| CMP-04 | `src/core/services/zone-classifier.ts` | New | `usagePercentage`, `classifyZone` (exhaustive, highest zone first). | CMP-01, CMP-12 |
| CMP-05 | `src/core/services/usage-resolver.ts` | New | Choose measured or estimated usage; compute the estimate; choose the window. | CMP-01, CMP-02 |
| CMP-06 | `src/core/services/session-counters.ts` | New | Summarize ledger lines into turns since reset, observed characters, last reading, last zone, and the session line. | CMP-03 |
| CMP-07 | `src/core/services/zone-actions.ts`, `telemetry-block.ts`, `injection-policy.ts` | New | Protocol sentences and compact block actions per zone from one record; render block v1; decide injection. | CMP-01, CMP-12 |
| CMP-08 | `src/core/services/brake-allowlist.ts`, `shell-command-matcher.ts` | New | Classify a normalized `ToolCall` against state files, the validation command, git commands, and configured commands. | CMP-02, CMP-12 |
| CMP-09 | `src/core/services/block-message.ts`, `reset-notice.ts` | New | Block message v1 (normal and failure variants), user-facing block text, reset signal detection, and notice text. | CMP-07 |
| CMP-10 | `src/core/services/brake-engine.ts`, `failure-policy.ts` | New | Handle each `RuntimeEvent` with injected ports and return a `RuntimeDecision`; fall back on failure. | CMP-03 to CMP-09 |
| CMP-11 | `src/core/services/brake-mode.ts`, `brake-session-checks.ts` | New | Derive `enforced` or `cooperative` from capabilities; build the `BRAKE_COOPERATIVE`, `BRAKE_BLOCKS_RECORDED`, and `RUNTIME_ERRORS_RECORDED` findings. | CMP-03, `harness.ts` types |
| CMP-12 | `src/core/contracts/configuration.ts`, `src/core/validation/configuration-validator.ts` | Modified | Migrate to `zod/mini`; add optional `brake.additionalAllowedCommands` with a default; add the `turnCeiling` equality rule; update `DEFAULT_CONFIG`. Validator behavior and issue paths/messages stay identical. | `harness.ts` constants |
| CMP-13 | `src/core/contracts/harness.ts` | Modified | Delete the five unused classic schema exports; no export added. | — |
| CMP-14 | `src/core/services/protocol-service.ts` | Modified | Render the zone rows from `zone-actions.ts`; the `CRITICAL` row appends configured additional commands when the list is non-empty, so the default protocol text stays byte-identical. | CMP-07, CMP-12 |
| CMP-15 | `src/infrastructure/runtime/node-session-ledger.ts`, `node-runtime-logs.ts`, `runtime-paths.ts` | New | Async append and tolerant read, key hashing, `.gitignore`, 14-day pruning, block and error logs, root resolution (DEC-15). | CMP-03 |
| CMP-16 | `src/infrastructure/runtime/plan-validation-reader.ts`, `tool-path-normalizer.ts`, `runtime-state-reader.ts` | New | Provisional plan reader (DEC-18); canonical project-relative tool paths (parent `realpath` plus basename, POSIX separators); doctor-side reader of session, block, and error logs. | CMP-03, `path-boundary.ts` |
| CMP-17 | `src/infrastructure/runtime/process-hook-host.ts`, `in-process-host.ts`, `runtime-composition.ts` | New | Read stdin up to 16 MiB; take the event from the first argument; enforce the deadline; write one stdout response; exit 0. The in-process host adds a per-session cache. Composition wires the config store, ports, clock, and engine. | CMP-10, CMP-15, CMP-16, `project-config-store.ts` |
| CMP-18 | `src/infrastructure/harnesses/<harness>/runtime.ts` and `capabilities.ts` (8 harnesses) | New | Map documented payloads to `RuntimeEvent` (session key, tool classification, observed characters, measured usage); render `RuntimeDecision` in documented fields only; export `run<Harness>Hook` or the plugin/extension factory. | CMP-02, CMP-17 |
| CMP-19 | `src/infrastructure/harnesses/*/schemas.ts` | Modified | Migrate to `zod/mini` loose objects; add the payload fields used (Stop, compaction, session start, tool input and output, `toolCall`, `agent_id`, `tool_response`). | DEC-02 |
| CMP-20 | Planners and updaters: `claude-code/{planner,claude-merger}.ts`, `codex-cli/planner.ts`, `cursor/planner.ts`, `github-copilot-cli/planner.ts`, `antigravity-cli/planner.ts`, `common/{codex,cursor,antigravity}-hooks-updater.ts` | Modified | Register the events from DEC-13 idempotently, add manifest entries, and remove them on `remove`. | PRD-01 change engine |
| CMP-21 | `src/infrastructure/harnesses/*/adapter.ts` (8) | Modified | Import `CAPABILITIES` from `capabilities.ts`; benchmark fixtures stay documented; Antigravity capability states move per DEC-14. | CMP-18 |
| CMP-22 | `src/infrastructure/diagnostics/in-process-sampler.ts` | Modified | Benchmark context returns the real `ContextUsage` shape and a session manager; existing OpenCode `(input, output)` invocation is preserved. | CMP-18 |
| CMP-23 | `src/core/services/doctor-service.ts`, `src/cli/commands/doctor.ts` | Modified | Read brake sessions and logs for doctor and add their findings; no report schema change. | CMP-11, CMP-16 |
| CMP-24 | `assets/runtime/*.ts` (9), `scripts/asset-bundler.ts` | Modified | Thin entrypoints; expose the esbuild metafile for the bundle guard; `assets/runtime/process-hook.ts` is deleted. | CMP-17, CMP-18 |
| CMP-25 | `docs/telemetry-block.md` (new), `README.md`, `docs/context-brake-protocol.md`, `docs/research/harness-integrations.md`, `schemas/context-brake.config.schema.json`, `package.json`, `package-lock.json` | New or modified | Document block v1, the block message, ledger and logs, allowlist, estimation, and per-harness guarantees; record the 2026-09-15 vendor re-check; regenerate the protocol and the config schema; add `js-tiktoken` (dev) and publish `docs/telemetry-block.md`. | CMP-12, CMP-14 |
| CMP-26 | `tests/support/harness-simulator/` (`scenarios.ts`, `agent-profiles.ts`, `process-driver.ts`, `in-process-driver.ts`, `session-recorder.ts`) | New | Deterministic simulator for DEC-19: scenario catalog, scripted agent behaviors, drivers that honor each harness's documented responses, tokenizer-backed measured usage for Pi and Oh-My-Pi, and a recorder of attempted, executed, and denied calls per session. Test support only; not shipped. | CMP-17, CMP-18, built assets |
| CMP-27 | Unit, integration, and end-to-end suites named in Test approach; `tests/test-lanes.ts` | New and modified | Cover every TC; register process-lane suites that spawn built assets or the CLI. | CMP-26 |

Process hook flow:

1. The harness runs `node <root>/<dir>/context-brake.mjs <Event>`. The host reads stdin (capped at 16 MiB), resolves the project root, starts the 1,500 ms deadline, and loads configuration.
2. The harness runtime adapter parses the payload with its mini schema and maps it to a `RuntimeEvent`. Events the adapter does not handle produce the neutral response.
3. `brake-engine` handles the event:
   - `pre_tool`: read the ledger, summarize, resolve usage (fresh measured value for in-process harnesses; otherwise the last reading or the baseline estimate), and classify. Below `CRITICAL`, return `neutral` without writing. At `CRITICAL`, classify the tool; read the plan only for shell calls. Allowlisted calls get `neutral`; others append a block record and return `deny`.
   - `post_tool`: skip duplicate `toolUseId`s; otherwise compute turns (existing tool lines plus 1), usage, and zone; append one `tool` line (writing the `session` line first if the ledger is empty); return `context` when the injection policy says so, else `neutral`.
   - `pre_invocation` (Antigravity CLI): summarize the ledger and return `context` when the injection policy says so, without appending a tool line.
   - `session_reset`: append a `reset` line, pruning old ledgers on new sessions only; return `neutral`.
   - `response_end`: return `notify_user` with the harness's new-session command when the text ends with the signal and the descriptor supports it, else `neutral`.
4. The adapter renders the decision in the vendor's documented fields. The host writes at most once and exits 0.
5. On a thrown error, invalid configuration, or deadline expiry, `failure-policy` reads the last zone, appends an error record, and the host renders `deny` (failure variant) or neutral as DEC-09 describes.

In-process plugins follow the same engine calls through `in-process-host`, with async I/O and a per-session cache. PRD-03 will add boot delivery on the `session_reset` path and the boot summary text; this feature only resets counts there. Doctor reads ledger `session` lines and log files through `runtime-state-reader` and adds findings from `brake-session-checks`.

## Contracts and data

### Configuration (`context-brake.config.json`, schema version 1, additive)

| Field | Type | Required | Validation | Default |
| --- | --- | --- | --- | --- |
| `telemetry.turnCeiling` | integer | yes | positive; must equal `telemetry.zones.criticalTurn` (new rule, message `must equal telemetry.zones.criticalTurn`) | `12` |
| `telemetry.zones.*` | integers | yes | unchanged: `greenMax < yellowMax < critical` for both percentages and turns, percentages within `0..100` | unchanged |
| `brake` | object | no | strict object | `{ "additionalAllowedCommands": [] }` |
| `brake.additionalAllowedCommands` | string array | no | at most 20 unique entries; each trimmed and non-empty; no `;`, `&`, `\|`, backtick, `$(`, `<`, `>`, CR, or LF | `[]` |

- Compatibility: every valid v1 file stays valid, except files where `turnCeiling` differs from `criticalTurn`; those now fail with field, value, and rule. To change the turn ceiling, users edit both fields, and the error names the mismatch. `init` preserves an existing configuration and does not add `brake`; the parsed configuration always carries the default.
- The published `schemas/context-brake.config.schema.json` is regenerated; `npm run schemas:check` verifies it.
- CA-05 is covered through the existing validator path, which reports issue `path`, `received`, and `rule`. A red band that starts before the yellow band means `yellowMax < greenMax`; the existing refinements report it as `yellowMaxPercentage` "must be greater than greenMaxPercentage" for percentages and as `greenMaxTurn` "must be less than yellowMaxTurn" for turns. CA-23 is the new equality rule on `telemetry.turnCeiling`.

### Zone classification

Given `p = floor(used × 100 / window)` and `t` = completed turns since the last reset: `CRITICAL` if `p ≥ criticalPercentage` or `t ≥ criticalTurn`; otherwise `RED` if `p > yellowMaxPercentage` or `t > yellowMaxTurn`; otherwise `YELLOW` if `p > greenMaxPercentage` or `t > greenMaxTurn`; otherwise `GREEN`. With the defaults: 49%/7 turns is `GREEN`, 50% or 8 is `YELLOW`, 65% or 10 is `YELLOW`, 66% or 11 is `RED`, 74% is `RED`, 75% or 12 is `CRITICAL`. A pre-tool call is evaluated with the turns already completed, so the call after the twelfth completed call is blocked.

### Telemetry block v1 (agent-facing)

One line, ASCII, fields in this fixed order, single spaces, integers without separators:

`[ContextBrake v1] turn=<t>/<criticalTurn> usage=<p>% tokens=<used>/<window> source=<measured|estimated> zone=<GREEN|YELLOW|RED|CRITICAL> action=<text>`

| Zone | `action` text |
| --- | --- |
| `GREEN` | `work normally` |
| `YELLOW` | `finish the current edit, start no new step, run the step validation` |
| `RED` | `save plan and checkpoint, commit if validation passes, end reply with [REQUEST_SESSION_RESET]` |
| `CRITICAL` | `other tools are blocked; finish the RED actions` |

Example: `[ContextBrake v1] turn=9/12 usage=55% tokens=70400/128000 source=estimated zone=YELLOW action=finish the current edit, start no new step, run the step validation`

Versioning: field names, field order, and action texts are the v1 contract, documented in `docs/telemetry-block.md`. Any change to them increments the version in the header. The texts may be shortened before the first release only if TC-07 fails, and must be updated in this document when that happens. PRD-03 may make the commit clause conditional on `stateStorage.instructCheckpointCommit`; it will do so in `zone-actions.ts`, so the protocol and the block stay coherent (RF9).

### Block message v1 (agent-facing)

`[ContextBrake v1] BLOCKED tool=<name> zone=CRITICAL turn=<t>/<criticalTurn> usage=<p>% tokens=<used>/<window> source=<source> reason=critical_ceiling. Allowed: read or write <planFile> and <checkpointFile>, the step validation command, git status, git add, git commit<, extra commands>. Save plan and checkpoint, commit if validation passes, end reply with [REQUEST_SESSION_RESET].`

The failure variant replaces the reason with `reason=integration_failure` and the values with `last recorded zone=CRITICAL`. Where the harness shows a separate user message (Cursor `user_message`), the text is `ContextBrake blocked <name>: the session is above the critical ceiling.` No emoji, no color.

### Reset notice (user-facing)

`ContextBrake: the agent requested a session reset. Run <command> to start a new session.` Here `<command>` is `/clear` (Claude Code) or `/new` (Codex CLI, Pi, Oh-My-Pi).

### Session ledger v1 (`.context-brake/runtime/sessions/<harness>/<key>.jsonl`)

| `type` | Fields | Written by |
| --- | --- | --- |
| `session` | `v: 1`, `at` (ISO 8601), `harness`, `sessionId`, `agentId` (string or null), `brakeMode` (`enforced` or `cooperative`), `brakeReason` (string or null) | First append to an empty ledger |
| `tool` | `v`, `at`, `toolUseId` (string or null), `observedCharacters` (integer ≥ 0), `turn`, `usedTokens`, `windowTokens`, `estimatedTokens`, `source`, `zone` | Each post-tool event |
| `reset` | `v`, `at`, `reason` (`new`, `clear`, or `compact`) | Session reset events |

Example tool line: `{"v":1,"type":"tool","at":"2026-09-15T12:00:00.000Z","toolUseId":"toolu_01","observedCharacters":1840,"turn":4,"usedTokens":16060,"windowTokens":128000,"estimatedTokens":16060,"source":"estimated","zone":"GREEN"}`. In a measured session, `estimatedTokens` holds the parallel estimate used by CA-11. Lines never contain prompts, tool inputs, tool outputs, paths, or commands. The files are LF-terminated and owned by ContextBrake; an incompatible change bumps `v`, and readers ignore lines with an unknown `v`. The parent directory carries `.gitignore` with `*`.

### Block log and error log v1 (`.context-brake/runtime/blocks.jsonl`, `errors.jsonl`)

- Block line: `v`, `at`, `harness`, `sessionId`, `agentId`, `tool` (tool name only), `zone`, `turn`, `percentage` (integer or null), `source` (or null), `reason` (`critical_ceiling` or `integration_failure`).
- Error line: `v`, `at`, `harness`, `event`, `code` (`INVALID_CONFIG`, `PAYLOAD_INVALID`, `DEADLINE_EXCEEDED`, `LEDGER_UNREADABLE`, or `UNEXPECTED`), and `detail`. `detail` is limited to the error class name and a configuration issue path, and never includes payload values.

### Doctor findings (`DoctorReport` schema v1 unchanged)

| Code | Severity | Scope | Content |
| --- | --- | --- | --- |
| `BRAKE_COOPERATIVE` | `warning` | `harness` | Message names up to five of the most recent session IDs; `impact` holds the recorded reason; `remediation`: "Use a harness with an enforced brake for guaranteed blocking, or treat zone limits as advisory for this harness." |
| `BRAKE_BLOCKS_RECORDED` | `ok` | `project` | Count of block records; `path` is `.context-brake/runtime/blocks.jsonl`. |
| `RUNTIME_ERRORS_RECORDED` | `warning` | `project` | Count of error records from the last 24 hours, with their codes; `path` is `.context-brake/runtime/errors.jsonl`. |

Exit codes are unchanged: a warning yields 1. Text and JSON render the same findings. `doctor` reads the runtime state directly; it is not part of `collectProjectSnapshots` and no file under `.context-brake/runtime/` is written.

### Provisional plan read contract (DEC-18)

The loose object `{ currentStepId?: string | number, steps: [{ id: string | number, status: string, validationCommand?: string }] }`. The PRD-03 TechSpec owns the final schema; `plan-validation-reader.ts` is the only module to change when it lands (open item).

### Internal contract changes

- `BenchmarkFixture` is unchanged; PRD-01.1 already carries the registered event and documented payload (open item in PRD-01.1 TechSpec closed).
- `DoctorInput` gains a runtime state reading (sessions, blocks, errors); `DoctorReport`, `InstallReport`, and `CliErrorDocument` are unchanged.
- New `ManagedEntry` identities: `claude-code` `Stop|*|<file>`; `codex-cli` `Stop|*|<file>`; `cursor` `preCompact|<file>`; `github-copilot-cli` `preCompact|<file>`; `antigravity-cli` `PreToolUse|context-brake|<file>` and `PostToolUse|context-brake|<file>`; OpenCode and Pi/Oh-My-Pi keep plugin/extension identities (no registration entries).
- `CHANGE_OWNERS` already includes `runtime_state`; no new owner is needed.

## Integrations and interfaces

| Harness | Registration change | Session key | Deny / neutral pre-tool | Telemetry channel | Reset events | Usage and window | End of response (RF22) | Brake |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Claude Code | Add `Stop` group in exec form (`node`, `${CLAUDE_PROJECT_DIR}/.claude/hooks/context-brake.mjs`, `Stop`) | `session_id` plus `agent_id` | `hookSpecificOutput` with `hookEventName: "PreToolUse"`, `permissionDecision: "deny"`, `permissionDecisionReason` / no output | `hookSpecificOutput.additionalContext` with `hookEventName: "PostToolUse"` | `SessionStart` sources `startup`, `clear`, `compact` (not `resume`) | Estimated from `tool_input` and `tool_response`; config window | `Stop` `last_assistant_message` → `{ "systemMessage": … }`, `/clear` | Enforced |
| Codex CLI | Add `Stop` group to `.codex/hooks.json` with the git-root command and `commandWindows` | `session_id` plus `agent_id` when present (fixture-gated) | Same shape as Claude Code / no output | JSON `hookSpecificOutput.additionalContext` | `SessionStart` sources `startup`, `clear`, `compact` | Estimated from `tool_input` and `tool_response`; config window | `Stop` `last_assistant_message` → `systemMessage`, `/new` | Cooperative (hosted tools bypass hooks; errors fail open, timeout behavior undocumented) |
| Cursor | Add `preCompact` | `conversation_id` (subagents not identified in tool payloads) | `{ "permission": "deny", "agent_message", "user_message" }` / `{ "permission": "allow" }` | `{ "additional_context": … }` | `sessionStart`; `preCompact` | Estimated from `tool_input` and `tool_output`; config window | Unsupported | Enforced (`failClosed: true` on `preToolUse`; `preToolUse` timeout default unspecified) |
| GitHub Copilot CLI | Add `preCompact` to `.github/hooks/context-brake.json` | `sessionId` (subagents not identified) | `{ "permissionDecision": "deny", "permissionDecisionReason" }` / no output | `{ "additionalContext": … }` | `sessionStart` sources `startup`, `new`; `preCompact` | Estimated from `toolArgs` and `toolResult.textResultForLlm`; config window | Unsupported (`agentStop` has no response text) | Enforced (timeouts fail open and are reported as a limitation) |
| Antigravity CLI | Add `PreToolUse` and `PostToolUse` named `context-brake`; keep `PreInvocation` | `conversationId` | `{ "decision": "deny", "reason" }` / `{ "decision": "allow" }` (required field; `allow` auto-approves, DEC-14) | `PreInvocation` `{ "injectSteps": [{ "ephemeralMessage": … }] }`, else `{ "injectSteps": [] }`; `PostToolUse` replies `{}` | New `conversationId` only | Estimated from `toolCall.args`; config window | Unsupported (`Stop` has no assistant text) | Cooperative (hook coverage in the CLI unconfirmed) |
| OpenCode | None (plugin handlers) | `input.sessionID` (fixture-gated; fallback documented as a gap) | Throw `Error(<block message>)` in `tool.execute.before` / return | None | `session.created`, `session.compacted` events | Estimated from `output.args`; tool output arguments undocumented; config window | Unsupported | Cooperative (tool coverage undocumented) |
| Pi | None (extension handlers) | `ctx.sessionManager.getSessionId()` | `tool_call` → `{ block: true, reason }` / `undefined` | `tool_result` → `{ content: [...event.content, { type: "text", text }] }` | `session_start` reasons `new`, `startup`; `session_compact` | Measured `ctx.getContextUsage()` (`{ tokens, contextWindow, percent }`); estimated when it returns `undefined` or `tokens` is `null` | `message_end` assistant text → `ctx.ui.notify(text, "info")`, `/new` | Enforced |
| Oh-My-Pi | None (`.omp/extensions/context-brake.js`) | `ctx.sessionManager.getSessionId()` | `tool_call` → `{ block: true, reason }` | `tool_result` content append | `session_start`; `session_compact`, `auto_compaction_end` | Measured `ctx.getContextUsage()` (`{ tokens, contextWindow, percent }`); estimated when absent | `session_stop` `last_assistant_message` → `ctx.ui.notify`, `/new` | Enforced |

Tool classification per adapter, all fixture-based, with unknown names falling into `other`:

- Claude Code: `Write`, `Edit`, `MultiEdit`, `NotebookEdit` (`file_path`) as writes; `Read` (`file_path`) as reads; `Bash` (`command`) as shell.
- Codex CLI: `apply_patch` as writes, with paths parsed from the `*** Add File:`, `*** Update File:`, `*** Delete File:`, and `*** Move to:` lines of `tool_input.command`; `Bash` as shell.
- Cursor: `Shell` (`command`) as shell; file tools only after a recorded fixture shows their names and `tool_input` path field.
- Copilot: `bash` (`command`) as shell; `edit` and `create` (`path`) as writes; `view` (`path`) as reads.
- Pi: `bash`, `write`, `edit`, `read` with `path`.
- Oh-My-Pi and OpenCode: Pi-compatible and `filePath` names, respectively, gated by fixtures.
- Antigravity: `run_command` (`CommandLine`) as shell; file tools gated by fixtures.

A harness whose file-write tools are not classified cannot reach the efficacy objective. Doctor and the README must not claim otherwise.

Failure, timeout, and idempotency:

- Every process hook exits 0 and writes at most one response, within the 1,500 ms internal deadline, below all documented defaults: Claude Code 600 s, Codex CLI 600 s, Copilot 30 s, Antigravity 30 s. Cursor's default is "platform default" (a risk).
- Post-tool events are idempotent per `toolUseId` where the harness sends one (Claude Code `tool_use_id`, Codex CLI, Cursor `tool_use_id` when present, Pi `toolCallId`, Oh-My-Pi `toolCallId`). Copilot and Antigravity send no call ID, so a harness retry of the same event would count twice.
- Registration changes reuse PRD-01's surgical editor and manifest entries. A third `init` run adds nothing, and `remove` deletes the new entries.
- Research updates required in `docs/research/harness-integrations.md` in the implementation change (checked 2026-09-15):
  - Claude Code: `PostToolUse` input field is `tool_response` (the research file says `tool_output`); `Stop` carries `last_assistant_message` and `stop_hook_active`; `systemMessage` reaches the user; `SessionStart` sources include `fork`; a timed-out `command` hook does not block `PreToolUse`.
  - Codex CLI: `Stop` carries `last_assistant_message` and `stop_hook_active`; `systemMessage` is surfaced as a warning; `PostToolUse` ignores plain stdout and `additionalContextLimit` defaults to 2500 tokens; error and timeout behavior for `PreToolUse` is undocumented.
  - Cursor: `preCompact` carries `context_usage_percent`, `context_tokens`, `context_window_size`, `trigger`, and `is_first_compaction`; `postToolUse` carries `tool_output` and `additional_context`; there is no post-compaction event; no new-session command is documented.
  - Copilot: `sessionStart` `source` is `startup`, `resume`, or `new`; `preCompact` exists; `agentStop` has no response text (`subagentStop` does); `postToolUse` appends `additionalContext` to `toolResult.textResultForLlm` with a 10 KB cap; command-hook timeouts always fail open.
  - OpenCode: handler signature `(input, output)`; `input.tool` and `output.args` are documented for `tool.execute.before`; `tool.execute.after` arguments, session id, and any token API are undocumented.
  - Pi: `ContextUsage` is `{ tokens: number | null; contextWindow: number; percent: number | null }`; `/new` is the documented new-session command.
  - Oh-My-Pi: `ContextUsage` is `{ tokens: number; contextWindow: number; percent: number }`; `session_stop` carries `last_assistant_message`; `/new` and `/clear` are documented.
  - Antigravity: `PreToolUse` payload is `{ toolCall: { name, args }, stepIdx }` and `decision` is required, with `allow` auto-approving; `PostToolUse` receives `toolCall`, `stepIdx`, and optional `error`, and returns `{}`; `PreInvocation` `injectSteps` entries use `toolCall`, `userMessage`, or `ephemeralMessage`; `Stop` carries `executionNum`, `terminationReason`, `error`, `fullyIdle`; hook failure behavior is undocumented and the default timeout is 30 s.

## Errors, security, and recovery

- Errors and edges:
  - Invalid or missing payload fields, unknown events, oversized stdin, invalid configuration, an unreadable plan, and ledger lines that fail the schema are handled by DEC-09 and never surface as uncaught exceptions.
  - A usage percentage above 100 classifies as `CRITICAL`.
  - A harness-reported window change (Pi or Oh-My-Pi model switch) takes effect on the next reading. Elsewhere the configured window applies for the whole session, a documented limitation.
  - A resumed session keeps its counts; a new session ID starts a new ledger.
  - An empty plan, no active step, or a step without a validation command removes only allowlist entry (b).
  - A failed hook deadline leaves the response neutral below the ceiling and denies non-allowlisted calls above it only where the last zone is readable; the error record names `DEADLINE_EXCEEDED`.
- User files and sensitive data:
  - The runtime writes only inside `<root>/.context-brake/runtime/`, never to harness configuration or instruction files.
  - Ledger and log lines hold metadata only (DEC-04, DEC-11); session IDs are stored because CA-17 and CA-18 require them. File names hash harness-provided IDs.
  - Configuration and plan values never reach logs.
  - The allowlist is a context brake against an agent that ignores zones, not a security boundary: an agent can edit the plan's validation command and then run it (see Risks).
- Concurrency and idempotency: single-line appends with no locks (DEC-04); readers tolerate partial and invalid lines; duplicate post-tool events are skipped by call ID where one exists. In-process caches are per process and write through to disk. Runtime-state removal and retention use the same per-file hash and mtime preconditions as every other managed change.
- Rollback or reversal: `context-brake remove` unregisters hooks and plugins, including the new events, which stops all runtime behavior; `remove --remove-state` deletes `.context-brake/runtime/`. Reinstalling a previous package version with `init --yes` replaces the assets. The configuration change is additive apart from the `turnCeiling` rule, which a user fixes by aligning the two values.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| 1. Zod-mini contracts and configuration: CMP-12, CMP-13; bundle guard skeleton | — | `npm run schemas:check` passes; TC-03, TC-24, and the existing configuration tests pass; `DEFAULT_CONFIG` output schema is unchanged apart from `brake`. |
| 2. Pure core: CMP-01 to CMP-11 | 1 | TC-01, TC-02, TC-05 to TC-07, TC-10, TC-11, TC-15 to TC-17, TC-21, TC-25, TC-28, TC-30, TC-32 pass with port fakes. |
| 3. Protocol and doctor core: CMP-14, CMP-23 | 2 | TC-02 and the doctor parts of TC-19 pass; `docs/context-brake-protocol.md` regenerated byte-for-byte for the defaults. |
| 4. Runtime infrastructure: CMP-15 to CMP-17 | 2 | TC-08, TC-18, TC-20, and TC-29 pass on a temporary filesystem. |
| 5. Process harness adapters: Claude Code, Codex CLI, Cursor, Copilot, Antigravity (CMP-18 to CMP-21), fixtures, research updates | 4 | TC-09, TC-12, TC-14, TC-26, TC-33, and TC-34 pass for each harness; research sections updated in the same change. |
| 6. In-process adapters: Pi, Oh-My-Pi, OpenCode (CMP-18 to CMP-21) | 4 | TC-11, TC-14, TC-32, and TC-33 pass; QA-05 is clean. |
| 7. Doctor wiring, assets, bundler: CMP-22, CMP-24, CMP-25 | 5, 6 | TC-19, TC-22, and TC-24 pass; `npm run build`, `assets:check`, `schemas:check`, and `package:smoke` pass. |
| 8. End-to-end, docs, simulator: CMP-25 to CMP-27 | 7 | TC-13, TC-23, and TC-27 pass in the CI matrix; README support table, `docs/telemetry-block.md`, and the protocol are published. |

## Test approach

- Profile:
  - Runtime surfaces: `doctor` (CLI command); process hooks, one process per event, for Claude Code, Codex CLI, Cursor, GitHub Copilot CLI, and Antigravity CLI; in-process plugins and extensions for OpenCode, Pi, and Oh-My-Pi.
  - Platform: Node.js ≥ 20 (CI: 20, 22, 24); TypeScript 5.9 strict, `NodeNext` ESM, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`.
  - Vitest 3 with the `parallel` and `process` projects from `tests/test-lanes.ts`; V8 coverage thresholds of 80% on `src/**/*.ts`.
  - Commands from `AGENTS.md`: `npm install --ignore-scripts`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`, `npm run dependencies:check`, `npm run package:smoke`.
- End-to-end: the built CLI runs as a child process in temporary fixture repositories. `context-brake init --yes --harness <id>` installs the real assets; the test then spawns the installed hook with the documented fixture payload sequence and runs `context-brake doctor --json`. There is no browser or UI layer.
- Platforms: Linux, macOS, and Windows (PowerShell and Git Bash launchers) for TC-08, TC-18, TC-22, TC-23, TC-27, and TC-29, because they touch appends, paths, child processes, and line endings.
- Command prerequisites and exclusions:
  - `dist/` must be built before process-lane, end-to-end, and package tests, which run serially in the `process` project; new suites that spawn built assets or the CLI are registered in `PROCESS_LANE_FILES`.
  - The `js-tiktoken` devDependency must pass `npm run dependencies:check`.
  - No installed harness, network, or real clock: `Clock` is injected, and retention tests set `mtime` with `utimes`.
  - The simulator seeds ledgers and payloads directly so the ticket-expensive long-task sessions stay deterministic and fast.
- Manual acceptance: none required. CA-11 and CA-21 are verified by the simulator (DEC-19, TC-13, TC-23). Before a capability is advertised for a harness, its adapter task captures at least one real payload per registered event as a fixture and records the harness version in the research file; a short real session is optional.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | RF10, CA-03, zone objective | unit | Default zones at usage 49, 50, 65, 66, 74, 75 and turns 7, 8, 10, 11, 12, combined conditions, and 130% | Exact zones listed under Contracts; highest zone wins; 130% is `CRITICAL` | `tests/unit/zone-classifier.test.ts` |
| TC-02 | RF9, CA-04 | unit | Default and two custom zone configurations: render the protocol, parse the boundary numbers from each row, classify at those numbers and one below | Protocol boundaries and classifier boundaries match in every case | `tests/unit/protocol-zone-coherence.test.ts` |
| TC-03 | RF11, CA-05, CA-23, DEC-03 | unit | Yellow ≤ green, yellow ≥ critical (percentages and turns), `turnCeiling` ≠ `criticalTurn`, invalid `additionalAllowedCommands`, a v1 file without `brake` | Each invalid case reports field path, received value, and rule; the file without `brake` parses with the default; existing issue paths and messages are unchanged | `tests/unit/configuration.test.ts` |
| TC-04 | CA-16, RF19 | integration | Built Claude Code hook with an invalid configuration: pre-tool below and at a recorded `CRITICAL` zone, then post-tool | Neutral / deny failure variant; no telemetry; `errors.jsonl` has `INVALID_CONFIG`; exit 0 | `tests/integration/runtime-invalid-config.test.ts` |
| TC-05 | RF13, CA-01, CA-02, CA-22, DEC-07 | unit | `threshold_only`: 55% with 3 turns; 30% with 3 turns; 30% with 8 turns; 40% with 3 turns and a threshold of 40. `always`: 30% with 3 turns | Block (`YELLOW`); none; block (`YELLOW`); block (`GREEN`); block (`GREEN`) | `tests/unit/injection-policy.test.ts` |
| TC-06 | RF12, RF15, RF16, CA-01, CA-09, CA-10 | unit | Render every zone with measured and estimated readings | Exact v1 strings from Contracts, including `source=` and the `RED` action | `tests/unit/telemetry-block.test.ts` |
| TC-07 | CA-13, cost objective | unit | Every zone with worst-case values (turn 999, 1,000,000-token window, 7-digit usage) | `o200k_base` count ≤ 50 and length ≤ 220 characters | `tests/unit/telemetry-block-budget.test.ts` |
| TC-08 | RF1, RF2, CA-06 | integration | Spawn three built post-tool hooks concurrently for one session, then one more; repeat 20 times on fresh ledgers | The fourth response reports `turn=4/12` every time; the ledger has 4 valid `tool` lines | `tests/integration/runtime-parallel-turns.test.ts` |
| TC-09 | RF3, CA-07, DEC-13 | unit and integration | 9 tool lines, then each harness's reset fixture (Claude Code `compact` and `clear`, Codex CLI `compact`, Cursor and Copilot `preCompact`, Antigravity new conversation ID, OpenCode `session.compacted`, Pi `session_compact`), then one post-tool event; also Claude Code `resume` | Turn 1 and usage recomputed from characters since the reset; `resume` keeps counting | `tests/unit/session-counters.test.ts`, `tests/integration/runtime-session-reset.test.ts` |
| TC-10 | RF4, CA-08 | unit | Claude Code payloads with and without `agent_id` for the same `session_id` | Separate ledgers; main-session turns unchanged by subagent calls | `tests/unit/claude-runtime-session-key.test.ts` |
| TC-11 | RF5, RF7, RF8, CA-09 | unit | Pi and Oh-My-Pi `getContextUsage()` return the documented shapes, then `undefined` (and Pi `tokens: null`); a window change mid-session | `source=measured`, values match the API; then `source=estimated` with the configured window; the next reading uses the new window | `tests/unit/pi-runtime-usage.test.ts`, `tests/unit/omp-runtime-usage.test.ts` |
| TC-12 | RF6, RF8, CA-10 | unit | Post-tool fixtures for Claude Code, Codex CLI, Cursor, Copilot, Antigravity, OpenCode | `source=estimated`; `observedCharacters` equals the documented field lengths; no content in ledger lines | `tests/unit/runtime-estimation.test.ts` |
| TC-13 | CA-11, measurement objective, DEC-19 | end-to-end (simulated) | Simulated Pi and Oh-My-Pi sessions from the catalog (code, JSON, log, and prose outputs; assistant text between calls; windows of 128,000 and 200,000 tokens), with measured usage from the tokenizer-backed mock | In every reading, measured and estimated usage differ by at most 10 percentage points; otherwise the runtime descriptor constants are recalibrated | `tests/e2e/e2e-simulated-usage.test.ts` |
| TC-14 | RF14, CA-12 | unit | Render a `context` decision for each harness | Claude Code, Codex CLI, Cursor, Copilot: only the context field, no `updatedToolOutput`, `modifiedResult`, or `updated_mcp_tool_output`; Pi and Oh-My-Pi: original parts unchanged plus one text part; Antigravity: `injectSteps` with one `ephemeralMessage` | `tests/unit/runtime-rendering.test.ts` |
| TC-15 | RF17, CA-14 | unit | `CRITICAL` session; Claude Code `Read` of `src/app.ts` | `deny` with the exact block message; one block record | `tests/unit/brake-engine-pre-tool.test.ts` |
| TC-16 | RF18, CA-15, DEC-08 | unit | Allowed: checkpoint write, plan read, validation command, `git status`, `git add src/a.ts`, `git commit -m "checkpoint: x"`, configured `npm run typecheck`. Denied: `git status && rm -rf x`, `git push`, `npm test; curl x`, a patch touching a state file and `src/a.ts`, validation mismatch, no plan, unknown tool | Exact allow and deny outcomes | `tests/unit/brake-allowlist.test.ts`, `tests/unit/shell-command-matcher.test.ts` |
| TC-17 | RF19, CA-16, DEC-09 | unit | Failing usage resolver at 40%; failure with last zone `CRITICAL` for a `Read` of `src/a.ts`; the same failure for a checkpoint write and for `git add src/a.ts`; invalid configuration with last zone `CRITICAL` and a write to the default checkpoint path; unreadable ledger; deadline exceeded (fake timers) | Neutral; deny failure variant; neutral for both; neutral; neutral; fallback decision with an error record | `tests/unit/failure-policy.test.ts` |
| TC-18 | RF19, CA-16 | integration | Built hooks for Claude Code, Cursor, and Copilot with a corrupt ledger or configuration, below and above the ceiling | Exit 0; Cursor below the ceiling returns `permission: allow`; above the ceiling, each returns its deny shape | `tests/integration/runtime-failure-policy.test.ts` |
| TC-19 | RF21, CA-17, DEC-10 | unit and integration | Codex CLI and Antigravity ledgers for three sessions each and a Claude Code ledger; run doctor | One `BRAKE_COOPERATIVE` warning per cooperative harness, with session IDs and the hosted-tools/coverage reason; none for Claude Code; identical text and JSON findings | `tests/unit/brake-session-checks.test.ts`, `tests/integration/doctor-brake-sessions.test.ts` |
| TC-20 | RF20, CA-18, privacy constraint | integration | A blocked call whose input and output contain a sentinel secret | `blocks.jsonl` has session, tool, zone, reason; the sentinel appears in no file under `.context-brake/runtime/` | `tests/integration/runtime-block-log.test.ts` |
| TC-21 | RF22, CA-19, DEC-12 | unit | Claude Code `Stop` ending with the signal; the signal mid-text; Codex CLI `Stop`; Pi `message_end`; Oh-My-Pi `session_stop`; Cursor, Copilot, OpenCode, and Antigravity descriptors | `systemMessage` with `/clear`; neutral; `/new`; notify with `/new`; notify with `/new`; no registration and no output | `tests/unit/reset-notice.test.ts` |
| TC-22 | CA-20, overhead objective, DEC-17 | integration | Built process assets: post-tool and `CRITICAL` pre-tool with allowlist evaluation (3 warm-ups, 20 samples); in-process `tool_call` handlers (10 warm-ups, 100 samples); doctor measurer with `event` and the real `ContextUsage` shape | Process p95 ≤ 100 ms on every platform; in-process p95 ≤ 15 ms; the measurer invokes the tool handler | `tests/integration/runtime-overhead.test.ts`, `tests/integration/doctor-benchmark.test.ts` |
| TC-23 | CA-21, efficacy objective, DEC-19 | end-to-end (simulated) | 20 simulated sessions for each full-level harness (Claude Code, Cursor, Copilot, Pi, Oh-My-Pi): compliant agent, agent ignoring `YELLOW` and `RED`, parallel batches, compaction mid-session, a subagent, `git status && …` tricks, writes to other files, and an integration failure injected above the ceiling | Every session reaches `CRITICAL`; no call outside the allowlist runs at or after it; in all sessions the save sequence (read and write the checkpoint, the validation command, `git status`, `git add`, `git commit`) runs and leaves a checkpoint that parses | `tests/e2e/e2e-simulated-long-task.test.ts` |
| TC-24 | DEC-02, CA-20 | unit | esbuild metafile for every runtime asset | No input from classic Zod, `jsonc-parser`, `semver`, `node:child_process`, or `src/cli/` | `tests/unit/runtime-bundle-imports.test.ts` |
| TC-25 | RF21, DEC-10 | unit | Brake mode for all eight capability definitions and for `unknown` block or coverage states | Claude Code, Cursor, GitHub Copilot CLI, Pi, and Oh-My-Pi are `enforced`; Codex CLI, OpenCode, and Antigravity CLI are `cooperative` with their reasons; an `unknown` block or coverage state is never `enforced` | `tests/unit/brake-mode.test.ts` |
| TC-26 | RF3, RF22, DEC-13 | integration | Install three times over fixtures with user hooks, then `remove` | One entry per new event (`Stop`, `preCompact`, `PreToolUse`, `PostToolUse`); user entries byte-identical; `remove` deletes only ContextBrake entries | `tests/unit/adapter-planners.test.ts`, `tests/integration/claude-preservation.test.ts` |
| TC-27 | CA-01, CA-14, CA-15, CA-17, CA-18 | end-to-end | Built CLI installs Claude Code in a fixture repository with a small window; drive hooks from `GREEN` to `CRITICAL`; attempt `Read`, checkpoint write, `git status`, `git add`; then `doctor --json`. A second repository with Codex CLI sessions | Blocks at `YELLOW` and `RED`; `Read` denied; allowlisted calls neutral; doctor reports `BRAKE_BLOCKS_RECORDED`, and `BRAKE_COOPERATIVE` for Codex CLI | `tests/e2e/e2e-brake.test.ts` |
| TC-28 | RF6, RF7, model-switch edge case | unit | Estimator arithmetic, window selection, percentage floor, zero window guard | Exact tokens, percentages, and sources | `tests/unit/usage-resolver.test.ts` |
| TC-29 | DEC-16, privacy constraint | integration | First runtime write; a new-session event with ledgers 15 and 13 days old | `.gitignore` containing `*` created; only the 15-day ledger removed | `tests/integration/runtime-retention.test.ts` |
| TC-30 | RF18, DEC-18 | unit | Plans with `currentStepId`, only `IN_PROGRESS`, only `COMPLETED`, invalid JSON, missing file | The expected validation command or none | `tests/unit/plan-validation-reader.test.ts` |
| TC-31 | RF9, RF11 | unit | Regenerated configuration schema and README example | `schemas:check` clean; the README example validates | `npm run schemas:check`, `tests/unit/readme-config-example.test.ts` |
| TC-32 | RF17, RF19, in-process rule | unit | OpenCode `tool.execute.before` at `CRITICAL` and below; Pi and Oh-My-Pi `tool_call` with a throwing dependency | Throws the block message / returns; `{ block: true }` only when the last zone is `CRITICAL` | `tests/unit/in-process-runtime.test.ts` |
| TC-33 | RF12, RF17, RF3, `harness-adapters.md` | unit | For every harness, documented payload fixtures in `tests/fixtures/harnesses/<harness>/` (including the new `stop.json`, `pre-compact.json`, `session-start.json`, `tool-result.json`, `message-end.json`, `session-stop.json`, `post-invocation.json`, and session-event fixtures) mapped and rendered | Expected `RuntimeEvent`s; responses use only documented fields; unknown extra payload fields are tolerated | `tests/unit/harness-runtime-contracts.test.ts` |
| TC-34 | RF21, DEC-14, PRD-01.1 FR-02 | unit and integration | Antigravity adapter after the change: capability profile, README row, and installation plan | `pre_tool_block` supported and `tool_coverage` unknown, support level `partial`, brake cooperative; `PreToolUse` and `PostToolUse` registered with their identities; `tests/unit/readme-support-table.test.ts` asserts the new level and limitation | `tests/unit/harness-adapters.test.ts`, `tests/unit/readme-support-table.test.ts`, `tests/unit/adapter-planners.test.ts` |

## Quality profile

Rules this feature can violate. A blocking hit prevents task completion and rejects the review; a reservation becomes an optional improvement and counts toward escalation. A hit covered by `DEC-NN` is expected, not a finding.

Scope, defined once in a POSIX shell:

```bash
RG=(rg -n --type ts -g '!node_modules/**' -g '!dist/**' -g '!coverage/**' -g '!**/*.d.ts')
files=()          # every TypeScript file in the task diff
core_files=()     # subset under src/core/
runtime_files=()  # subset under src/core/services/brake-*.ts, src/core/contracts/{zones,runtime,session-ledger}.ts,
                  # src/infrastructure/runtime/, src/infrastructure/harnesses/*/runtime.ts, assets/runtime/
hook_files=()     # runtime_files on a hook response path, excluding src/infrastructure/runtime/process-hook-host.ts
in_process_files=() # runtime_files that load inside a harness process (OpenCode, Pi, Oh-My-Pi), including core engine modules
```

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `"${RG[@]}" ':\s*any\b\|as any\b\|<any>' "${files[@]}"` | — |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `"${RG[@]}" '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-03 | Empty `catch` or `.catch(() => {})`; the failure policy must record every failure | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | — |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-05 | Synchronous file or process API in runtime modules; the ledger, logs, and engine also run inside OpenCode, Pi, and Oh-My-Pi | blocking | `"${RG[@]}" '\b(readFileSync\|writeFileSync\|appendFileSync\|existsSync\|spawnSync\|statSync\|readdirSync)\b' "${in_process_files[@]}"` | — |
| QA-06 | `console.log` or `process.stdout.write` outside the response writer | blocking | `"${RG[@]}" 'console\.log\|process\.stdout\.write' "${hook_files[@]}"` | — |
| QA-07 | `exec`, `execSync`, or `shell: true` in runtime or test code that drives built assets | blocking | `"${RG[@]}" '\bexecSync\(\|\bexec\(\|shell:\s*true' "${files[@]}"` | — |
| QA-08 | Runtime bundles pulling classic Zod, `jsonc-parser`, `semver`, `node:child_process`, or CLI code | blocking | `npx vitest run tests/unit/runtime-bundle-imports.test.ts` | `DEC-02` |
| QA-09 | Clock or randomness in `core` (timestamps come from the injected `Clock`) | reservation | `"${RG[@]}" 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' "${core_files[@]}"` | — |
| QA-10 | Generic `throw new Error(` where a dedicated error class names a fixable failure | reservation | `"${RG[@]}" 'throw new Error\(' "${files[@]}"` | existing hits listed in the baseline |
| QA-11 | 4+ parameters in one declaration, or a `.ts` file above 100 lines | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"`; `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | `DEC-01` |

In the table, `\|` stands for a literal pipe; run the commands with plain `|`.

- Verification scope: the TypeScript files in each task diff, using the lists above; skip a command whose list is empty.
- Escalation trigger: eight or more reservation hits in the feature, a touched file above 200 lines, or the same symbol or block duplicated in three or more places in the diff. The five process-hook planners and the three shared updaters already repeat their install and remove skeleton; the new registrations must extend them, not add a fourth copy of shared logic.

### Terrain baseline

Hits that already existed in the target files before implementation. A hit listed here is not a task finding; a new hit is. A target file without a row in this table counts as unmeasured, and every hit in it will be treated as new.

Measured on 2026-09-15 at `b9647e9` with the commands from `references/preparatory-refactoring.md` and the QA commands above. No target file has a declaration with 4+ parameters (the single regex match, `in-process-sampler.ts:36`, is the false positive of a generic type argument) and none has a `case` statement. Files with no `Pre-existing hits` cell are clean under QA-01 to QA-11.

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/core/contracts/configuration.ts` | 25 | 6 | ≤ 3 | 0 | — | recorded |
| `src/core/contracts/harness.ts` | 56 | 34 | ≤ 3 | 0 | structural: 34 exported members | absorbed in `DEC-02` (five unused schema exports deleted; no export added) |
| `src/core/validation/configuration-validator.ts` | 20 | 4 | ≤ 3 | 0 | — | recorded |
| `src/core/services/protocol-service.ts` | 51 | 2 | ≤ 3 | 0 | — | recorded |
| `src/core/services/doctor-service.ts` | 95 | 2 | ≤ 3 | 0 | — | recorded (new checks go to `brake-session-checks.ts`) |
| `src/cli/commands/doctor.ts` | 56 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/diagnostics/in-process-sampler.ts` | 68 | 3 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/adapter.ts` | 92 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/claude-merger.ts` | 50 | 6 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/planner.ts` | 87 | 5 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/schemas.ts` | 45 | 7 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/codex-cli/adapter.ts` | 107 | 1 | ≤ 3 | 0 | structural: 107 lines; contact is fewer than three distinct places and does not extend a saturated structure | recorded |
| `src/infrastructure/harnesses/codex-cli/planner.ts` | 88 | 5 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/codex-cli/schemas.ts` | 28 | 5 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/cursor/adapter.ts` | 84 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/cursor/planner.ts` | 72 | 5 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/cursor/schemas.ts` | 23 | 4 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/github-copilot-cli/adapter.ts` | 84 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/github-copilot-cli/planner.ts` | 74 | 5 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/github-copilot-cli/schemas.ts` | 26 | 4 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/antigravity-cli/adapter.ts` | 98 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/antigravity-cli/planner.ts` | 66 | 5 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/antigravity-cli/schemas.ts` | 26 | 5 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/opencode/adapter.ts` | 81 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/opencode/planner.ts` | 30 | 4 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/opencode/schemas.ts` | 18 | 3 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/pi/adapter.ts` | 78 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/pi/planner.ts` | 30 | 4 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/pi/schemas.ts` | 17 | 3 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/oh-my-pi/adapter.ts` | 78 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/oh-my-pi/planner.ts` | 30 | 4 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/oh-my-pi/schemas.ts` | 17 | 3 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/common/codex-hooks-updater.ts` | 79 | 6 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/common/cursor-hooks-updater.ts` | 58 | 3 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/common/antigravity-hooks-updater.ts` | 48 | 4 | ≤ 3 | 0 | — | recorded |
| `assets/runtime/process-hook.ts` | 41 | 4 | ≤ 3 | 0 | `QA-06: process-hook.ts:40` is the response writer itself | deleted (`DEC-01`) |
| `assets/runtime/claude-code-hook.ts` | 7 | 0 | ≤ 3 | 0 | — | recorded |
| `assets/runtime/codex-cli-hook.ts` | 7 | 0 | ≤ 3 | 0 | — | recorded |
| `assets/runtime/cursor-hook.ts` | 11 | 0 | ≤ 3 | 0 | — | recorded |
| `assets/runtime/github-copilot-cli-hook.ts` | 7 | 0 | ≤ 3 | 0 | — | recorded |
| `assets/runtime/antigravity-cli-hook.ts` | 7 | 0 | ≤ 3 | 0 | — | recorded |
| `assets/runtime/opencode-plugin.ts` | 11 | 2 | ≤ 3 | 0 | — | recorded |
| `assets/runtime/pi-extension.ts` | 13 | 2 | ≤ 3 | 0 | — | recorded |
| `assets/runtime/omp-extension.ts` | 13 | 2 | ≤ 3 | 0 | — | recorded |
| `scripts/asset-bundler.ts` | 64 | 6 | ≤ 3 | 0 | `QA-10: scripts/asset-bundler.ts:63` | recorded |
| `tests/test-lanes.ts` | 45 | 8 | ≤ 3 | 0 | — | recorded |
| `tests/unit/configuration.test.ts` | 39 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/protocol-service.test.ts` | 51 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/support-service.test.ts` | 89 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/doctor-service.test.ts` | 95 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/harness-adapters.test.ts` | 62 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/hook-registration-paths.test.ts` | 67 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/runtime-assets.test.ts` | 39 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/asset-bundler.test.ts` | 51 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/harness-schemas-process.test.ts` | 89 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/harness-schemas-in-process.test.ts` | 67 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/adapter-planners.test.ts` | 66 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/readme-config-example.test.ts` | 17 | 0 | ≤ 3 | 0 | `QA-10: tests/unit/readme-config-example.test.ts:9` | recorded |
| `tests/unit/readme-support-table.test.ts` | 65 | 0 | ≤ 3 | 0 | — | recorded (level assertion moves with `DEC-14`) |
| `tests/unit/in-process-sampler.test.ts` | 49 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/overhead-measurer.test.ts` | 63 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/schemas.test.ts` | 33 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/integration/doctor-benchmark.test.ts` | 76 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/integration/doctor-asset-currency.test.ts` | 79 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/integration/package-contents.test.ts` | 64 | 0 | ≤ 3 | 0 | — | recorded (new required file `docs/telemetry-block.md`) |
| `tests/integration/package-assets.test.ts` | 89 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/e2e/e2e-09.test.ts` | 68 | 0 | ≤ 3 | 0 | — | recorded |

Non-TypeScript targets have no measures: `package.json`, `package-lock.json`, `README.md`, `docs/research/harness-integrations.md`, `docs/context-brake-protocol.md`, `schemas/context-brake.config.schema.json`.

- Preparatory refactoring: not recommended. The only structural thresholds crossed are the export count of `src/core/contracts/harness.ts` (34) and the 107 lines of `src/infrastructure/harnesses/codex-cli/adapter.ts`; the feature does not extend either structure — it deletes five unused exports from `harness.ts` and touches the Codex adapter in fewer than three distinct places. Every other target is below every threshold, so intense contact with them is ordinary feature work.

## Observability and rollout

- Signals:
  - Ledgers, `blocks.jsonl`, and `errors.jsonl` under `.context-brake/runtime/`.
  - Doctor findings `BRAKE_COOPERATIVE`, `BRAKE_BLOCKS_RECORDED`, and `RUNTIME_ERRORS_RECORDED`, plus the existing overhead measurement.
  - One stderr line per runtime failure (code only) in process hooks; in-process hosts log nothing to stdout.
  - Nothing leaves the machine.
- Migration and compatibility:
  - Configuration stays at schema version 1: `brake` is additive, and the `turnCeiling` equality rule rejects the previously accepted mismatch with field, value, and rule.
  - Existing installations keep the stub assets until the user reruns `context-brake init --yes`. The protocol file can then show `PROTOCOL_FILE_MISMATCH` until the same rerun, because the `CRITICAL` row may gain configured additional commands. The README upgrade note must say so.
  - `DoctorReport` and `InstallReport` schemas are unchanged; `docs/telemetry-block.md` joins the published files.
  - Antigravity moves from cooperative to partial support (DEC-14); the README support table and the API of `init`/`doctor` summaries change accordingly.
- Rollout and rollback:
  - Gates: lint, typecheck including `assets/`, tests with coverage ≥ 80%, `schemas:check`, `dependencies:check`, `assets:check`, `package:smoke`, and the Linux, macOS, and Windows × Node 20/22/24 CI matrix.
  - Adapter capability claims follow the version gates in `harness-adapters.md`; a harness without captured real payload fixtures keeps its fixture-gated items unsupported.
  - Rollback: `context-brake remove`, or reinstall the previous package version with `init --yes`.

## Risks and open items

- Risk: the 100 ms process target includes Node startup. Probability low on an unloaded machine, impact CA-20. Mitigation: `zod/mini`, a lazy plan read, no Zod work on the neutral path, and a CI measurement per OS (TC-22). The load-dependent local measurement of 2026-09-14 is not treated as evidence for or against the target.
- Risk: the estimated usage misses the 10-point target in real sessions, because it ignores system prompts, assistant text, and user prompts beyond fixed constants. Probability medium, impact zone accuracy. Mitigation: per-harness constants calibrated against the simulated sessions of TC-13, and the source always marked `estimated`. Real harness overhead is never measured, because real long-task runs are out of scope (DEC-19).
- Risk: Claude Code releases the call if the hook process dies before replying (a crash outside the failure boundary, missing `node`, or its timeout). Probability low, impact a non-allowlisted call above the ceiling. Mitigation: explicit deny from the failure boundary, a deadline far below the timeout, and doctor overhead checks. Residual risk accepted for the `enforced` claim.
- Risk: Antigravity `PreToolUse`'s required `decision` makes `allow` auto-approve, bypassing the harness's normal permission flow (DEC-14). Probability certain when registered, impact user consent. Mitigation: recorded product open item; the limitation text states the harness remains cooperative; if the HIL rejects the trade-off, the fallback is to not register `PreToolUse` and keep Antigravity fully cooperative.
- Risk: Cursor, Oh-My-Pi, OpenCode, and Antigravity file-tool names and input fields are undocumented. Probability medium, impact the agent cannot save state above the ceiling in those harnesses. Mitigation: fixture-gated classification, and no efficacy claim until a captured real payload confirms the tool names and fields.
- Risk: the default ceiling of 12 turns means 12 completed tool calls, a short session for real coding work. Probability medium, impact frequent resets. Mitigation: the ceiling and every turn limit are already configurable (`telemetry.zones.greenMaxTurn`, `yellowMaxTurn`, `criticalTurn`, with `turnCeiling` equal to `criticalTurn`); the default stays 12 as the PRD sets, and the README documents how to change it.
- Risk: the allowlist is not a security boundary, because an agent can rewrite the plan's validation command and then run it. Probability low for cooperative agents, impact arbitrary commands above the ceiling. Mitigation: documented limitation; PRD-04 adds confirmation of changed commands for the runner.
- Risk: Windows antivirus or network filesystems can interleave or delay appends. Probability low, impact a miscounted turn. Mitigation: single-write lines under 4 KiB, a tolerant reader, and TC-08 on Windows CI.
- Risk: Cursor's `preToolUse` default timeout is unspecified, and with `failClosed: true` a timeout blocks even below the ceiling. Probability low, impact a false block. Mitigation: the 1,500 ms deadline and a recorded-limitation entry.
- Risk: Copilot and Antigravity send no tool call ID, so a harness retry double-counts. Probability low, impact one extra turn. Mitigation: documented.
- Risk: Pi project-local discovery is documented for `.pi/extensions/*.ts`, while the installer writes `context-brake.js`; Oh-My-Pi's loading rules allow `.ts` and `.js` per the research file, but the Pi case is unverified. Probability medium, impact Pi and Oh-My-Pi in-process runtime never loads. Mitigation: the adapter task captures a real load before claiming `enforced`; if `.js` does not load, switch the installed filename to the documented extension (open item).
- Risk: simulated acceptance proves the integration under documented harness semantics, not model compliance or undocumented vendor behavior. Probability medium, impact a harness that deviates from its documentation can break a guarantee unnoticed. Mitigation: payload fixtures captured from real harness versions, research updates with every adapter change, and doctor findings in the field.
- Open item OI-01: Antigravity `PreToolUse` registration trade-off (DEC-14). Owner: product owner at the technical HIL. Affects `capabilities.ts`, the README support table, and TC-34; the fallback is to keep Antigravity fully cooperative.
- Open item OI-02: the final plan field names from the PRD-03 TechSpec. Owner: tech lead of PRD-03. Affects DEC-18, `plan-validation-reader.ts`, and TC-30.
- Open item OI-03: Pi project-local `.js` extension discovery (risk above). Owner: implementer of the Pi adapter task. Affects DEC-13, the research file, and TC-32.
- Open item OI-04: confirm Cursor CLI coverage of `preToolUse`, `postToolUse`, and `preCompact`, and Oh-My-Pi's extension loading path, before claiming `enforced`. Owner: implementer of each adapter task. Affects DEC-10 and the README table.
- Open item OI-05: OpenCode `tool.execute.after` arguments, session identifier, and any token API. Owner: implementer of the OpenCode adapter task. Affects DEC-04, DEC-05, and the reset detection for OpenCode.
- Open item OI-06: an opt-in Claude Code status line bridge for measured usage, which would require composing with a user-owned `statusLine`. Owner: product owner, post-MVP. Affects DEC-05.
- Open item OI-07: Codex `PreToolUse` timeout behavior is undocumented; the research file records it as such. This keeps Codex cooperative regardless.

## Relevant files

- Modify:
  - Contracts and validation: `src/core/contracts/configuration.ts`, `src/core/contracts/harness.ts`, `src/core/validation/configuration-validator.ts`
  - Core services: `src/core/services/protocol-service.ts`, `src/core/services/doctor-service.ts`
  - CLI and diagnostics: `src/cli/commands/doctor.ts`, `src/infrastructure/diagnostics/in-process-sampler.ts`
  - Claude Code: `src/infrastructure/harnesses/claude-code/{claude-merger,planner,schemas,adapter}.ts`
  - Codex CLI: `src/infrastructure/harnesses/codex-cli/{planner,schemas,adapter}.ts`
  - Cursor: `src/infrastructure/harnesses/cursor/{planner,schemas,adapter}.ts`
  - GitHub Copilot CLI: `src/infrastructure/harnesses/github-copilot-cli/{planner,schemas,adapter}.ts`
  - Antigravity CLI: `src/infrastructure/harnesses/antigravity-cli/{planner,schemas,adapter}.ts`
  - OpenCode, Pi, Oh-My-Pi: `src/infrastructure/harnesses/{opencode,pi,oh-my-pi}/{schemas,adapter}.ts`
  - Common updaters: `src/infrastructure/harnesses/common/{codex-hooks-updater,cursor-hooks-updater,antigravity-hooks-updater}.ts`
  - Runtime assets: `assets/runtime/{claude-code-hook,codex-cli-hook,cursor-hook,github-copilot-cli-hook,antigravity-cli-hook,opencode-plugin,pi-extension,omp-extension}.ts`
  - Build and package: `scripts/asset-bundler.ts`, `package.json`, `package-lock.json`
  - Tests: `tests/test-lanes.ts`, and the unit, integration, and end-to-end tests listed in the terrain baseline and Test approach
  - Docs and schemas: `README.md`, `docs/research/harness-integrations.md`, `docs/context-brake-protocol.md`, `schemas/context-brake.config.schema.json`
- Delete: `assets/runtime/process-hook.ts`
- Create:
  - Core contracts: `src/core/contracts/{zones,runtime,session-ledger}.ts`
  - Core services: `src/core/services/{zone-classifier,usage-resolver,session-counters,zone-actions,telemetry-block,injection-policy,brake-allowlist,shell-command-matcher,block-message,reset-notice,brake-engine,failure-policy,brake-mode,brake-session-checks}.ts`
  - Runtime infrastructure: `src/infrastructure/runtime/{node-session-ledger,node-runtime-logs,runtime-paths,plan-validation-reader,tool-path-normalizer,runtime-state-reader,process-hook-host,in-process-host,runtime-composition}.ts`
  - Harness runtime: `src/infrastructure/harnesses/<harness>/{runtime,capabilities}.ts` for all eight harnesses
  - Docs: `docs/telemetry-block.md`
  - Simulator: `tests/support/harness-simulator/{scenarios,agent-profiles,process-driver,in-process-driver,session-recorder}.ts`
  - Fixtures: `tests/fixtures/harnesses/<harness>/` payloads for `Stop`, `preCompact`, `PostToolUse`, `PostInvocation`, `tool_result`, `message_end`, `session_stop`, and session events
  - Tests: the suites named in TC-01 to TC-34
