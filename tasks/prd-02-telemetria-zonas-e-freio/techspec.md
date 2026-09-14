# TechSpec — Telemetry, zones, and brake

## Sources and traceability

- PRD: `tasks/prd-02-telemetria-zonas-e-freio/prd.md`. The PRD is written in Portuguese and keeps its legacy IDs (`RF1`–`RF22`, `CA-01`–`CA-23`); this document does not rename them. On 2026-09-14 the PRD absorbed the decisions from OI-01, OI-02, OI-03, OI-06, and OI-10 (RF11, RF13, RF16, RF18, objectives, CA-01, CA-02, CA-11, CA-15, CA-20, CA-21, and the new CA-22 and CA-23), and PRD-01, PRD-03, and PRD-04 were aligned the same day.
- Dependent PRDs: `tasks/prd-01.1-pendencias-da-instalacao/prd.md` and its `techspec.md` (support-level rule, capability model, overhead measurer, manifest version, `.gitignore` block; must land first); `tasks/prd-01-instalacao-deteccao-diagnostico/prd.md` (capability matrix, support levels, `doctor`) and its `techspec.md`; `tasks/prd-03-plano-checkpoint-e-boot/prd.md` (plan file with validation commands); `tasks/prd-04-runner-de-reinicio-automatico/prd.md` (out of scope, `wrap`).
- Applicable instructions, rules, and skills: `AGENTS.md`; `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`, `file-changes.md`, `cli-output.md`; skill `sdd-create-techspec` with `references/preparatory-refactoring.md`, `references/typescript-node.md`, and `references/quality-typescript.md`.
- Research: `docs/research/harness-integrations.md` (all eight harness sections), `docs/research/telemetry-self-pacing.md`, and `docs/research/contextops-spec-review.md` (inconsistencies 1 to 6, which this design must not repeat).
- Vendor documentation rechecked on 2026-09-14: [Claude Code hooks](https://code.claude.com/docs/en/hooks), [Codex hooks](https://learn.chatgpt.com/docs/hooks), [Cursor hooks](https://cursor.com/docs/hooks), [Cursor CLI](https://cursor.com/docs/cli/overview), [GitHub Copilot hooks](https://docs.github.com/en/copilot/reference/hooks-reference), [Copilot CLI commands](https://docs.github.com/en/copilot/reference/cli-command-reference), [OpenCode plugins](https://opencode.ai/docs/plugins/), [Pi extensions](https://raw.githubusercontent.com/badlogic/pi-mono/main/packages/coding-agent/docs/extensions.md), [Oh-My-Pi extensions](https://github.com/can1357/oh-my-pi/blob/main/docs/extensions.md) and [extension loading](https://raw.githubusercontent.com/can1357/oh-my-pi/main/docs/extension-loading.md), and [Antigravity hooks](https://antigravity.google/docs/hooks/). Divergences from the research file are listed under Integrations and interfaces.
- Evidence in existing code:
  - `assets/runtime/*.ts` are neutral stubs: `process-hook.ts` reads stdin and writes one fixed response per event.
  - `src/core/contracts/configuration.ts` already holds `telemetry.injectionMode`, `activationThresholdPercentage`, `contextWindowCeiling`, `turnCeiling`, and `zones` with ordering refinements.
  - `src/core/services/protocol-service.ts` renders the zone table from that configuration.
  - `src/core/services/support-service.ts` (`deriveLevel`, `allCapabilities`) derives support levels; `src/infrastructure/harnesses/*/adapter.ts` declares `CAPABILITIES`.
  - `src/infrastructure/diagnostics/overhead-measurer.ts` spawns process assets without an event argument. For in-process assets it measures whichever handler was registered last (`before_agent_start` for Pi and Oh-My-Pi).
  - `scripts/asset-bundler.ts` bundles the assets unminified with esbuild. `tsconfig.check.json` does not include `assets/`, and Vitest coverage includes only `src/**/*.ts`.
- Local measurement (2026-09-14, Windows 11, Node 24.19.0, esbuild minified bundles, 5 warm-ups plus 60 interleaved spawns each, nearest-rank). The machine was under load that day, so the absolute values are not representative; DEC-02 relies only on the relative cost of each bundle:

  | Bundle | Size | p50 | p95 |
  | --- | --- | --- | --- |
  | Empty Node process | — | 67.8 ms | 107.2 ms |
  | Current Claude Code stub | 0.6 KiB | 76.5 ms | 119.2 ms |
  | Classic Zod with `configurationSchema` | 445.7 KiB | 109.5 ms | 209.8 ms |
  | Equivalent `zod/mini` schema | 21.9 KiB | 74.2 ms | 118.7 ms |

## Solution summary

ContextBrake gains a runtime brake that runs inside the hooks and plugins PRD-01 already installs. One versioned engine in `src/core/` handles every harness. It counts completed tool calls per session in an append-only ledger on disk, resolves context usage (measured when the harness exposes it, estimated otherwise), classifies the session into `GREEN`, `YELLOW`, `RED`, or `CRITICAL` from the same configuration that renders the protocol, and returns one of three decisions: allow, deny with a block message, or deliver a telemetry block. Each harness adapter only maps its documented payloads to normalized runtime events and renders the engine's decision in its documented output fields. Vendor event names, payload shapes, and response formats stay inside `src/infrastructure/harnesses/<harness>/`. The asset entrypoints in `assets/runtime/` become thin bundles over typechecked, covered code in `src/`.

Above the critical ceiling, pre-tool events deny everything except the allowlist: plan and checkpoint file access, the active step's validation command, `git status`, `git add`, `git commit`, and configured extra commands. A failure inside the integration never blocks below the ceiling. At or above it, the hook denies based on the last zone recorded in the ledger. Doctor reports sessions that ran with a cooperative brake, plus recorded blocks and runtime errors, as findings in the existing report schema. The end-of-response signal `[REQUEST_SESSION_RESET]` produces a user-visible notice with the harness's new-session command where the harness documents both the response text and a user channel. Out of scope: automatic restarts and `wrap` (PRD-04), boot content (PRD-03), exact tokenizers, triggering native compaction, and any network or API-level interception.

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | RF12, RF15, RF17, RF19 | Runtime logic lives in `src/` as a core engine (`src/core/services/brake-engine.ts` and helpers) plus infrastructure hosts in `src/infrastructure/runtime/`. Each harness adds `runtime.ts` (payload mapping and response rendering) and `capabilities.ts` in its adapter directory. Files in `assets/runtime/*.ts` shrink to one call each, and `assets/runtime/process-hook.ts` is removed. PRD 1.1 (NFR-01) adds `assets/**/*.ts` to `tsconfig.check.json`. | `harness-adapters.md` requires agent-facing text built in `core` and shared by all adapters. Coverage and typecheck currently skip `assets/`, and a feature of this risk cannot sit outside both gates. | Keep logic in `assets/runtime/`: rejected, because it would be uncovered and untypechecked. One monolithic hook per harness: rejected, because the text would drift between harnesses. |
| DEC-02 | Overhead objective, CA-20, RF11 | Everything bundled into runtime assets validates with `zod/mini`. `configurationSchema` migrates to `zod/mini`, so the CLI, schema generation, and runtime keep one source; `z.toJSONSchema` accepts mini schemas. Each `src/infrastructure/harnesses/*/schemas.ts` migrates to `zod/mini`, using loose objects rather than `.strict()`. The five classic-Zod schema exports in `src/core/contracts/harness.ts` (`harnessIdSchema`, `capabilityIdSchema`, `capabilityStateSchema`, `detectionEvidenceSchema`, `versionProbeSchema`) have no callers and are deleted, leaving that module Zod-free. `configuration-validator.ts` imports `$ZodIssue` as a type only. A bundle guard test fails if any runtime asset includes classic Zod, `jsonc-parser`, `semver`, or `src/cli/`. | Local measurement: classic Zod with the config schema adds about 33 ms at p50 and doubles p95 (445.7 KiB); `zod/mini` stays within noise of the stub (21.9 KiB). The rule in `javascript-typescript.md` requires Zod for external data. | Classic Zod everywhere: fails the 100 ms budget. A hand-written mini duplicate of the config schema: two sources of truth that can drift from the published schema. Skipping validation in hooks: violates the Zod rule. |
| DEC-03 | RF9, RF10, RF11, CA-03, CA-04, CA-05, CA-23 | Usage percentage is the integer `floor(usedTokens × 100 / windowTokens)`, and classification uses that same integer. Checks run from the highest zone down (critical, red, yellow, green), so bands are complete by construction; the existing ordering refinements guarantee no overlap. Values above 100% classify as `CRITICAL`. A new cross-field rule requires `telemetry.turnCeiling` to equal `telemetry.zones.criticalTurn`; the turn ceiling shown in the block is `criticalTurn`. | Integer boundaries match the PRD values (49/50, 65/66, 74/75) and the protocol text ("below 50%", "above 65%"). Classifying the displayed integer avoids a block that shows 65% and says `RED`. The configuration currently carries both `turnCeiling` and `criticalTurn` with no rule linking them, an inconsistency the spec review flagged as item 2. | Classify the exact ratio: a 65.4% reading would be `RED` while the block shows 65%. Remove `turnCeiling`: a breaking change to config v1; the product owner chose the equality rule on 2026-09-14 (OI-02). |
| DEC-04 | RF1, RF2, RF3, RF4, CA-06, CA-07, CA-08 | Per-session state is an append-only JSONL ledger at `.context-brake/runtime/sessions/<harness>/<key>.jsonl`. `key` is the first 32 hex characters of `sha256(sessionId + "\0" + (agentId ?? ""))`. Turns are the `tool` lines after the last `reset` line, deduplicated by `toolUseId` when the harness sends one. Each post-tool event appends one line in a single `appendFile` call (well under 4 KiB) and never rewrites the file. Readers skip lines that fail the mini schema. A subagent with a harness-provided agent ID gets its own key. | Process hooks start fresh on every event (`harness-adapters.md`). Parallel calls (CA-06) run as concurrent processes, so single `O_APPEND` writes serialize without locks; each line counts once regardless of order. Hashing prevents path traversal from harness-controlled IDs. | A counter JSON file with locks: needs stale-lock recovery and a clock, and can lose increments on crash. SQLite: a native dependency on the hook path. A global in-memory daemon: violates the offline, no-service constraint. |
| DEC-05 | RF5, RF6, RF7, RF8, CA-09, CA-10, CA-11 | Usage is `measured` only when an integration API documents it: Pi `ctx.getContextUsage()` returning `{ tokens, contextWindow, percent }`, and Oh-My-Pi once a versioned fixture confirms the same shape. Everywhere else it is `estimated`: `baselineTokens + ceil(observedCharacters / 4) + turns × tokensPerTurn`. `observedCharacters` sums the character length of documented tool input and output fields since the last reset. `baselineTokens` (initially 15,000) and `tokensPerTurn` (initially 150) are provisional per-harness constants in the runtime descriptor, calibrated by TC-13. The window comes from the harness when measured (Pi `contextWindow`) and from `telemetry.contextWindowCeiling` otherwise. The ledger stores counts only. | The vendor docs rechecked on 2026-09-14 confirm that no process hook payload carries token usage. Tool I/O fields are documented for every process harness, whereas transcript formats are not documented as stable, and Claude Code writes the transcript asynchronously. Pi documents a usage API. | Parse transcripts: undocumented format, and asynchronous writes lag. File size of the transcript: inflated by metadata and never reset by compaction. Install a Claude Code status line bridge: `statusLine` is a single user-owned setting ContextBrake would overwrite (OI-09). A model-name-to-window table: an invented mapping ContextBrake would have to maintain. |
| DEC-06 | RF12, RF14, RF15, RF16, CA-01, CA-12, CA-13 | Telemetry block v1 is one plain-text line of `key=value` fields (see Contracts). Zone actions come from one core module (`zone-actions.ts`) that the protocol renderer also uses. Claude Code, Codex CLI, Cursor, and GitHub Copilot CLI deliver it only in their separate-context fields. Pi and Oh-My-Pi append a text part after the original result content. Antigravity delivers it through `PreInvocation` `injectSteps` as `ephemeralMessage`. OpenCode delivers none. The budget test counts tokens with the `js-tiktoken` `o200k_base` encoding as a new devDependency, asserting at most 50 tokens and 220 characters. | `harness-adapters.md` prefers added context over replacing results. The Antigravity docs now define `injectSteps` entries (`toolCall`, `userMessage`, `ephemeralMessage`). OpenCode has no documented post-tool context, and issue #13574 reports output changes are ignored. Claude's tokenizer is not public, so a 10-token margin under the PRD's 60 absorbs tokenizer variance. | A multi-line or Markdown block: more tokens. A JSON block: more tokens and harder to read. Estimating tokens as characters divided by 4 in tests: unreliable for digits and symbols. |
| DEC-07 | RF13, CA-01, CA-02, CA-22, cost objective, UX main flow | In `threshold_only` mode a block is delivered when the zone is not `GREEN` or the usage percentage reaches `activationThresholdPercentage`, whichever happens first; a `GREEN` session below the threshold receives nothing. In `always` mode every post-tool event delivers one. A session that turns `YELLOW` by turn count alone therefore receives telemetry. | Product owner decision on 2026-09-14 (OI-03): telemetry starts as soon as the session leaves `GREEN`, as in steps 1 and 2 of the PRD main flow. With the defaults, the threshold (50%) coincides with the start of `YELLOW`, so CA-01 and CA-02 hold. RF13, the cost objective, CA-02, and the main flow were aligned with this rule on the same day, and CA-22 covers the turn-driven case. | Usage threshold only: the literal reading of the objective, but a session red by turn count would learn it only when blocked. Zone only, ignoring the threshold: leaves `activationThresholdPercentage` as dead configuration. |
| DEC-08 | RF17, RF18, CA-14, CA-15 | At `CRITICAL`, a pre-tool call runs only if every target it touches is allowlisted. Allowlisted: (a) file reads and writes whose every path resolves to the configured plan or checkpoint file; (b) a shell command exactly equal, after trimming, to the active step's validation command; (c) `git status`, `git add`, or `git commit` with any arguments, provided the command has no shell operators (`;`, `&`, `\|`, backtick, `$(`, `<`, `>`, CR, LF); (d) commands whose leading tokens match an entry in the new `brake.additionalAllowedCommands` list, under the same operator rule. Unknown tools and unclassifiable inputs are denied. When no decision is needed, the neutral response is to omit the decision wherever the harness allows it. Cursor and Antigravity require a field, so they keep an explicit allow. | RF18 lists these entries and says the list is configurable; since 2026-09-14 (OI-01) it includes `git add`, because a commit records only staged changes. Plan and checkpoint files are local state kept on disk and git-ignored by `init` (PRD-01 RF24), so saving state above the ceiling never depends on committing them. Reads are included because Claude Code's `Write` and `Edit` refuse to overwrite a file the session has not read, so without read access the agent could not save state above the ceiling. The operator rule stops `git status && <anything>`. | Allow any command starting with `git`: allows destructive git commands. Only `git status` and `git commit`, as RF18 listed before 2026-09-14: the commit could not include new or unstaged files. A configurable replacement for the built-in list: could remove the state-saving floor. |
| DEC-09 | RF19, CA-16 | Every hook and plugin handler runs inside a failure boundary with a 1,500 ms internal deadline. On any exception, invalid configuration, or deadline expiry, the fallback reads the last recorded zone from the ledger, skipping bad lines. If that zone is `CRITICAL`, allowlisted calls still pass: the fallback classifies the tool and evaluates the allowlist with the loaded configuration, or with the default plan and checkpoint paths and no additional commands when the configuration is invalid, and denies with the failure variant of the block message only when the call is not allowlisted or cannot be classified. Otherwise, or when no zone is readable, it stays neutral. Process hooks always exit with code 0 and write at most one response. The failure is appended to `.context-brake/runtime/errors.jsonl` with metadata only. A missing `context-brake.config.json` means `DEFAULT_CONFIG`; an invalid one counts as a failure. | Claude Code and Codex fail open on errors, Copilot fails closed on a non-zero exit but open on timeout, and Cursor with `failClosed: true` blocks on crash, timeout, or empty output. A predictable fallback therefore needs an explicit response and exit code 0 below the ceiling. | Exit 2 on failure: blocks Copilot, Cursor, and Claude Code calls below the ceiling, violating RF19. Treat an unknown zone as critical: blocks healthy sessions whenever the ledger is new or corrupt. |
| DEC-10 | RF21, CA-17, US6 | The brake mode is derived from the PRD 1.1 capability model: `enforced` when `pre_tool_block` and `tool_coverage` are both `supported`, meaning the harness honors an explicit deny on every tool call; otherwise `cooperative`, with the first missing capability's `impact` as the reason. Timeout and failure behavior is a reported limitation and does not change the mode. Each harness's `CAPABILITIES` moves to `capabilities.ts`, imported by both `adapter.ts` and `runtime.ts`. The runtime writes the mode and reason in the ledger's `session` line. Doctor emits one `BRAKE_COOPERATIVE` warning per harness with recorded cooperative sessions, naming up to five of the most recent session IDs and the reason. `DoctorReport` schema v1 is unchanged. | This keeps a single source for support levels and brake guarantees; PRD 1.1 FR-02 and the updated RF21 define a guaranteed block as an explicit deny honored on every tool call. Findings already carry harness, message, and impact, and adding a report field would break strict consumers of the published schema. | Recompute the mode in doctor: loses what the session actually ran with after an upgrade. Add a `sessions` array to `DoctorReport`: a published schema change. |
| DEC-11 | RF8, honest-measurement objective | Delivered by PRD 1.1 (FR-02 to FR-04) before this feature: `full` derives from `pre_tool_block`, `tool_coverage`, `post_tool_telemetry`, and `session_boot`; `context_usage` and `timeout_fail_closed` are informational; Claude Code and Cursor declare `context_usage` as `unsupported`. This feature only consumes that profile. | Research and the README say Claude Code usage reaches only the status line and Cursor usage only `preCompact`, while this feature's blocks mark such usage `source=estimated`. The correction belongs to the PRD-01 surface, so PRD 1.1 owns it. | Change the derivation inside this feature: mixes a PRD-01 correction into the brake work and leaves the doctor's claims wrong until PRD-02 ships. |
| DEC-12 | RF20, CA-18, US8 | Blocks are appended to `.context-brake/runtime/blocks.jsonl`: time, harness, session ID, agent ID, tool name, zone, turn, percentage, source, and reason code. Tool input and output are never stored. Doctor emits a `BRAKE_BLOCKS_RECORDED` finding with severity `ok`, giving the count and path, and a `RUNTIME_ERRORS_RECORDED` warning when `errors.jsonl` has entries from the last 24 hours. | CA-18 asks for session, tool, zone, and reason; the privacy rules forbid content. A local file works offline and is easy to read. | A new `context-brake log` command: adds CLI surface the PRD does not require. Recording tool arguments: leaks paths, commands, and secrets. |
| DEC-13 | RF22, CA-19, US7 | The signal is recognized only as the final text of an assistant response, after trimming trailing whitespace. Supported where the harness documents both the response text and a user channel: Claude Code `Stop` (`last_assistant_message`, reply `systemMessage`, command `/clear`), Codex CLI `Stop` (`last_assistant_message`, `systemMessage`, `/new`), and Pi `message_end` for assistant messages (`ctx.ui.notify`, `/new`). Unsupported and not registered: Cursor, Copilot, OpenCode, Antigravity, and Oh-My-Pi. The new-session command lives in each runtime descriptor. | Checked 2026-09-14: Cursor `afterAgentResponse` has the text but no user-facing output, and no documented new-chat command; Copilot `agentStop` carries no response text; Antigravity `Stop` has none either; OpenCode has no documented event properties or toast API; Oh-My-Pi documents no new-session command. | Read transcripts for the last message: undocumented format. Use Cursor `stop.followup_message`: it would send the notice as a user message to the agent. |
| DEC-14 | RF3, CA-07, compaction and restart edge cases | Reset events per harness are listed under Integrations. New registrations: Claude Code `Stop`; Codex CLI `Stop`; Cursor `preCompact`; Copilot `preCompact`; Antigravity `PostToolUse` (for turn counting). Cursor and Copilot reset at `preCompact` because neither documents a post-compaction event. A `resume` start never resets. | The Claude and Codex `SessionStart` sources include `compact`; Pi documents `session_compact`; Cursor and Copilot document `preCompact` as observational, with no post event. Without Antigravity `PostToolUse` there is no turn count for its brake. | Reset only on a new session ID: turns would keep counting after compaction, failing CA-07. |
| DEC-15 | Isolated-execution constraint | The runtime project root is `CLAUDE_PROJECT_DIR` (Claude Code) or `CURSOR_PROJECT_DIR` (Cursor) when set, otherwise two directories above the installed asset, resolved with `realpath`. Runtime files are created only under `<root>/.context-brake/runtime/`. | Both variables are documented. Codex runs hooks in the session's working directory, which can be a subdirectory, and every installed asset sits at `<root>/<dir>/<dir>/context-brake.*`, as the last commit made its registration path. | `process.cwd()`: wrong in subdirectories. `git rev-parse` per event: spawns a process per event and fails without git. |
| DEC-16 | Privacy, offline, RF2 | `.context-brake/runtime/` gets a `.gitignore` containing `*` on first write. On new-session events (not on `resume` or compaction), ledger files untouched for 14 days are pruned. In-process hosts cache per-session summaries in memory and write through to the same ledger with async I/O only. | Ledgers must not reach commits. The retention bound keeps the directory small without a background process, and the shared format lets doctor read sessions from every harness. | A user cache directory under the home folder: doctor would need per-project mapping, and a project copy would lose its state. No retention: unbounded growth. |
| DEC-17 | CA-20, overhead objective | PRD 1.1 (FR-05) already makes the measurer pass the registered event to process assets and run the `tool_call` or `tool.execute.before` handler of in-process assets. This feature keeps doctor on the read-only pre-tool path, so project files are untouched. An automated process-lane test measures the built post-tool path and the `CRITICAL` pre-tool path, including allowlist evaluation, in a temporary repository. Bundles stay unminified unless TC-22 shows minification is needed. | Before PRD 1.1, the measurer omitted the event argument and timed the last registered in-process handler, which is not a tool handler. Readable assets help users review what they install and Codex's hash-based trust review. | Benchmark post-tool in doctor: writes ledgers in the user's project. Minify now: no measured need beyond noise, and reviewability drops. |
| DEC-18 | RF18, PRD-03 dependency | Until the PRD-03 TechSpec defines the plan schema, a provisional read-only reader parses the configured plan file with a loose mini schema: `currentStepId`, `steps[].id`, `steps[].status`, `steps[].validationCommand`. The active step is `currentStepId`, then the step `IN_PROGRESS`, then the last `COMPLETED` step. A missing or invalid plan yields no allowlisted validation command; the other allowlist entries still apply. The plan is read only when a `CRITICAL` pre-tool call is a shell command. | The protocol says to run "the validation command of the active step, or of the last completed step". Reading lazily keeps the plan off the common path. | Wait for PRD-03: blocks RF18. Snake_case names from the frozen SRS: the project's owned files use camelCase (PRD-01 config). |
| DEC-19 | CA-11, CA-21, efficacy objective, measurement objective | Long-task acceptance runs against a deterministic harness simulator instead of real agent sessions. The simulator installs ContextBrake with the built CLI in a temporary repository and plays a fixed catalog of scripted sessions. Claude Code and Cursor are driven by spawning the installed hooks with documented payloads, and a simulated tool runs only when the documented response allows it. Pi is driven by loading the built extension with a mock API whose `getContextUsage()` returns the `o200k_base` token count of the simulated context. Agent profiles cover compliant agents, agents that ignore `YELLOW` and `RED`, parallel batches, compaction, subagents, shell-operator tricks, and injected failures. | Product owner decision on 2026-09-14 (OI-06): 20 real long-task runs per harness are not viable in cost, time, or determinism, and they need a person to run `/clear`. Driving the built assets with documented payloads exercises the same contract a harness does, including process concurrency and the failure policy, and `tests.md` accepts fakes that follow the documented formats. | Real harness runs: not viable. Unit tests only: miss built assets, process concurrency, and the ledger on disk. Replaying recorded real sessions: no recordings exist, and they would contain prompt content. Trade-off: the simulation cannot verify model compliance or real harness prompt overhead; since the 2026-09-14 update, CA-11, CA-20, CA-21, and the efficacy and measurement objectives state simulated evidence explicitly. |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/core/contracts/zones.ts` | New | `ZONES`, `Zone`, `USAGE_SOURCES`, `UsageReading`, `ZoneInput`; no Zod. | — |
| CMP-02 | `src/core/contracts/runtime.ts` | New | `SessionKey`, `ToolCall` (category `file_read`, `file_write`, `shell`, `other`; paths; command), the `RuntimeEvent` union (`pre_tool`, `post_tool`, `session_reset`, `response_end`), the `RuntimeDecision` union (`neutral`, `deny`, `context`, `notify_user`), `BrakeMode`, `RuntimeDescriptor` (harness, capability definitions, estimation constants, new-session command or `null`). | CMP-01 |
| CMP-03 | `src/core/contracts/session-ledger.ts` | New | Ledger, block, and error log line types with `zod/mini` schemas (v1); ports `SessionLedger`, `BlockLog`, `RuntimeErrorLog`, `PlanReader`, `Clock`, `SessionLedgerReader`. | CMP-01, CMP-02 |
| CMP-04 | `src/core/services/zone-classifier.ts` | New | `usagePercentage`, `classifyZone` (exhaustive, highest zone first). | CMP-01, CMP-15 |
| CMP-05 | `src/core/services/usage-resolver.ts` | New | Choose measured or estimated usage; compute the estimate; choose the window. | CMP-01, CMP-02 |
| CMP-06 | `src/core/services/session-counters.ts` | New | Summarize ledger lines into turns since reset, observed characters, last reading, last zone, and the session line. | CMP-03 |
| CMP-07 | `src/core/services/zone-actions.ts`, `telemetry-block.ts`, `injection-policy.ts` | New | Short and long action text per zone; render block v1; decide injection. | CMP-01, CMP-15 |
| CMP-08 | `src/core/services/brake-allowlist.ts`, `shell-command-matcher.ts` | New | Classify a normalized `ToolCall` against state files, the validation command, git commands, and configured commands. | CMP-02, CMP-15 |
| CMP-09 | `src/core/services/block-message.ts`, `reset-notice.ts` | New | Block message v1 (normal and failure variants), user-facing block summary, reset signal detection, and notice text. | CMP-07 |
| CMP-10 | `src/core/services/brake-engine.ts`, `failure-policy.ts` | New | Handle each `RuntimeEvent` with injected ports and return a `RuntimeDecision`; fall back on failure. | CMP-03 to CMP-09 |
| CMP-11 | `src/core/services/brake-mode.ts`, `brake-session-checks.ts` | New | Derive `enforced` or `cooperative` from capabilities; build the `BRAKE_COOPERATIVE`, `BRAKE_BLOCKS_RECORDED`, and `RUNTIME_ERRORS_RECORDED` findings. | CMP-03, `harness.ts` types |
| CMP-12 | `src/core/contracts/configuration.ts` | Modified | Migrate to `zod/mini`; add optional `brake.additionalAllowedCommands` with a default; add the `turnCeiling` rule; update `DEFAULT_CONFIG`. | `harness.ts` constants |
| CMP-13 | `src/core/contracts/harness.ts`, `src/core/validation/configuration-validator.ts` | Modified | Delete unused classic schema exports; import `$ZodIssue` as a type only. | — |
| CMP-14 | `src/core/services/protocol-service.ts` | Modified | Render the `CRITICAL` row from `zone-actions.ts` and the allowlist (reads, `git add`, and configured commands). | CMP-07, CMP-12 |
| CMP-15 | `src/core/services/support-service.ts` | Unchanged | Consumed as delivered by PRD 1.1 (DEC-11). | PRD 1.1 |
| CMP-16 | `src/core/services/doctor-service.ts`, `src/core/contracts/adapter.ts` | Modified | Accept brake session summaries and add their findings; `BenchmarkFixture.event` comes from PRD 1.1. | CMP-11 |
| CMP-17 | `src/infrastructure/runtime/node-session-ledger.ts`, `node-runtime-logs.ts`, `runtime-paths.ts` | New | Async append and tolerant read, key hashing, `.gitignore`, 14-day pruning, block and error logs, root resolution (DEC-15), plus the doctor-side reader. | CMP-03 |
| CMP-18 | `src/infrastructure/runtime/plan-validation-reader.ts`, `tool-path-normalizer.ts` | New | Provisional plan reader (DEC-18); canonical project-relative tool paths (parent `realpath` plus basename, POSIX separators). | CMP-03, `path-boundary.ts` |
| CMP-19 | `src/infrastructure/runtime/process-hook-host.ts`, `in-process-host.ts`, `runtime-composition.ts` | New | Read stdin up to 16 MiB; take the event from the first argument; enforce the deadline; write one stdout response; exit 0. The in-process host adds a per-session cache. Composition wires the config store, ports, clock, and engine. | CMP-10, CMP-17, CMP-18, `project-config-store.ts` |
| CMP-20 | `src/infrastructure/harnesses/<harness>/runtime.ts` and `capabilities.ts` (8 harnesses) | New | Map documented payloads to `RuntimeEvent` (session key, tool classification, observed characters, measured usage); render `RuntimeDecision` in documented fields only; export `run<Harness>Hook` or the plugin factory. | CMP-02, CMP-19, CMP-21 |
| CMP-21 | `src/infrastructure/harnesses/*/schemas.ts` | Modified | Migrate to `zod/mini` loose objects; add the payload fields used (Stop, compaction, tool input and output, `toolCall`, `agent_id`). | DEC-02 |
| CMP-22 | Planners: `claude-code/planner.ts` and `claude-merger.ts`, `codex-cli/planner.ts`, `cursor/planner.ts`, `github-copilot-cli/planner.ts`, `antigravity-cli/planner.ts` | Modified | Register the events from DEC-14 idempotently, add manifest entries, and remove them on `remove`. | PRD-01 change engine |
| CMP-23 | `src/infrastructure/harnesses/*/adapter.ts` (8) | Modified | Import `CAPABILITIES` from `capabilities.ts`; benchmark fixtures with documented payloads and `event` come from PRD 1.1. | CMP-20, CMP-16 |
| CMP-24 | `src/infrastructure/diagnostics/overhead-measurer.ts`, `src/cli/commands/doctor.ts` | Modified | Read brake sessions and logs for doctor; the event argument and tool-handler selection come from PRD 1.1. | CMP-16, CMP-17 |
| CMP-25 | `assets/runtime/*.ts`, `scripts/asset-bundler.ts`, `package.json`, `tests/test-lanes.ts` | Modified | Thin entrypoints; expose the esbuild metafile for the bundle guard; add devDependency `js-tiktoken`; register new process-lane tests. `assets/runtime/process-hook.ts` is deleted. | CMP-19, CMP-20 |
| CMP-26 | `docs/telemetry-block.md` (new), `README.md`, `docs/research/harness-integrations.md`, `docs/context-brake-protocol.md`, `schemas/context-brake.config.schema.json` | New or modified | Document block v1, the block message, ledger and logs, allowlist, estimation, and per-harness guarantees; record the vendor divergences; regenerate the protocol and schema. | CMP-12, CMP-14 |
| CMP-27 | `tests/support/harness-simulator/` (`scenarios.ts`, `agent-profiles.ts`, `process-driver.ts`, `in-process-driver.ts`, `session-recorder.ts`) | New | Deterministic simulator for DEC-19: scenario catalog, scripted agent behaviors, drivers that honor each harness's documented responses, tokenizer-backed measured usage for Pi, and a recorder of attempted, executed, and denied calls per session. Test support only; not shipped. | CMP-19, CMP-20, built assets |

Process hook flow:

1. The harness runs `node <root>/<dir>/hooks/context-brake.mjs <Event>`. The host reads stdin (capped at 16 MiB), resolves the project root, starts the 1,500 ms deadline, and loads configuration.
2. The harness runtime adapter parses the payload with its mini schema and maps it to a `RuntimeEvent`. Events the adapter does not handle produce the neutral response.
3. `brake-engine` handles the event:
   - `pre_tool`: read the ledger, summarize, resolve usage (fresh measured value for in-process harnesses; otherwise the last reading or the baseline estimate), and classify. Below `CRITICAL`, return `neutral` without writing. At `CRITICAL`, classify the tool; read the plan only for shell calls. Allowlisted calls get `neutral`; others append a block record and return `deny`.
   - `post_tool`: skip duplicate `toolUseId`s; otherwise compute turns (existing tool lines plus 1), usage, and zone; append one `tool` line (writing the `session` line first if the ledger is empty); return `context` when the injection policy says so, else `neutral`.
   - `session_reset`: append a `reset` line, pruning old ledgers on new sessions only; return `neutral`.
   - `response_end`: return `notify_user` with the harness's new-session command when the text ends with the signal and the descriptor supports it, else `neutral`.
4. The adapter renders the decision in the vendor's documented fields. The host writes at most once and exits 0.
5. On a thrown error, invalid configuration, or deadline expiry, `failure-policy` reads the last zone, appends an error record, and the host renders `deny` (failure variant) or neutral as DEC-09 describes.

In-process plugins follow the same engine calls through `in-process-host`, with async I/O and a per-session cache. Doctor reads ledger `session` lines and log files through `SessionLedgerReader` and adds findings from `brake-session-checks`.

## Contracts and data

### Configuration (`context-brake.config.json`, schema version 1, additive)

| Field | Type | Required | Validation | Default |
| --- | --- | --- | --- | --- |
| `telemetry.turnCeiling` | integer | yes | positive; must equal `telemetry.zones.criticalTurn` (new rule, message `must equal telemetry.zones.criticalTurn`) | `12` |
| `telemetry.zones.*` | integers | yes | unchanged: `greenMax < yellowMax < critical` for both percentages and turns, percentages within `0..100` | unchanged |
| `brake` | object | no | strict object | `{ "additionalAllowedCommands": [] }` |
| `brake.additionalAllowedCommands` | string array | no | at most 20 unique entries; each trimmed and non-empty; no `;`, `&`, `\|`, backtick, `$(`, `<`, `>`, CR, or LF | `[]` |

- Compatibility: every valid v1 file stays valid, except files where `turnCeiling` differs from `criticalTurn`; those now fail with field, value, and rule. To change the turn ceiling, users edit both fields, and the error names the mismatch. `init` preserves an existing configuration and does not add `brake`, and the parsed configuration always carries the default.
- The published `schemas/context-brake.config.schema.json` is regenerated; `npm run schemas:check` verifies it.
- CA-05 is covered through the existing validator path, which reports issue `path`, `received`, and `rule`. A red band that starts before the yellow band means `yellowMax < greenMax`. The existing refinements report it as `yellowMaxPercentage` "must be greater than greenMaxPercentage" for percentages and as `greenMaxTurn` "must be less than yellowMaxTurn" for turns.

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

`ContextBrake: the agent requested a session reset. Run <command> to start a new session.` Here `<command>` is `/clear` (Claude Code) or `/new` (Codex CLI, Pi).

### Session ledger v1 (`.context-brake/runtime/sessions/<harness>/<key>.jsonl`)

| `type` | Fields | Written by |
| --- | --- | --- |
| `session` | `v: 1`, `at` (ISO 8601), `harness`, `sessionId`, `agentId` (string or null), `brakeMode` (`enforced` or `cooperative`), `brakeReason` (string or null) | First append to an empty ledger |
| `tool` | `v`, `at`, `toolUseId` (string or null), `observedCharacters` (integer ≥ 0), `turn`, `usedTokens`, `windowTokens`, `estimatedTokens`, `source`, `zone` | Each post-tool event |
| `reset` | `v`, `at`, `reason` (`new`, `clear`, or `compact`) | Session reset events |

Example tool line: `{"v":1,"type":"tool","at":"2026-09-14T12:00:00.000Z","toolUseId":"toolu_01","observedCharacters":1840,"turn":4,"usedTokens":16060,"windowTokens":128000,"estimatedTokens":16060,"source":"estimated","zone":"GREEN"}`. In a measured session, `estimatedTokens` holds the parallel estimate used by CA-11. Lines never contain prompts, tool inputs, tool outputs, paths, or commands. The files are LF-terminated and owned by ContextBrake; an incompatible change bumps `v`, and readers ignore lines with an unknown `v`.

### Block log and error log v1 (`.context-brake/runtime/blocks.jsonl`, `errors.jsonl`)

- Block line: `v`, `at`, `harness`, `sessionId`, `agentId`, `tool` (tool name only), `zone`, `turn`, `percentage` (integer or null), `source` (or null), `reason` (`critical_ceiling` or `integration_failure`).
- Error line: `v`, `at`, `harness`, `event`, `code` (`INVALID_CONFIG`, `PAYLOAD_INVALID`, `DEADLINE_EXCEEDED`, `LEDGER_UNREADABLE`, or `UNEXPECTED`), and `detail`. `detail` is limited to the error class name and a configuration issue path, and never includes payload values.

### Doctor findings (`DoctorReport` schema v1 unchanged)

| Code | Severity | Scope | Content |
| --- | --- | --- | --- |
| `BRAKE_COOPERATIVE` | `warning` | `harness` | Message names up to five of the most recent session IDs; `impact` holds the recorded reason; `remediation`: "Use a harness with an enforced brake for guaranteed blocking, or treat zone limits as advisory for this harness." |
| `BRAKE_BLOCKS_RECORDED` | `ok` | `project` | Count of block records; `path` is `.context-brake/runtime/blocks.jsonl`. |
| `RUNTIME_ERRORS_RECORDED` | `warning` | `project` | Count of error records from the last 24 hours, with their codes; `path` is `.context-brake/runtime/errors.jsonl`. |

Exit codes are unchanged: a warning yields 1. Text and JSON render the same findings.

### Provisional plan read contract (DEC-18)

The loose object `{ currentStepId?: string or integer, steps: [{ id: string or integer, status: string, validationCommand?: string }] }`. The PRD-03 TechSpec owns the final schema; `plan-validation-reader.ts` is the only module to change when it lands (OI-05).

### Internal contract change

None in this feature: `BenchmarkFixture.event` and the documented benchmark payloads arrive with PRD 1.1.

## Integrations and interfaces

| Harness | Registration change | Session key | Deny / neutral pre-tool | Telemetry channel | Reset events | Usage and window | End of response (RF22) | Brake |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Claude Code | Add `Stop` in exec form (`node`, `${CLAUDE_PROJECT_DIR}/.claude/hooks/context-brake.mjs`, `Stop`) | `session_id` plus `agent_id` | `hookSpecificOutput` with `hookEventName: "PreToolUse"`, `permissionDecision: "deny"`, `permissionDecisionReason` / no output | `hookSpecificOutput.additionalContext` with `hookEventName: "PostToolUse"` | `SessionStart` sources `startup`, `clear`, `compact` (not `resume`; `fork` has a new ID) | Estimated from `tool_input` and `tool_output` or `tool_response`; config window | `Stop` `last_assistant_message` → `{ "systemMessage": … }`, `/clear` | Enforced |
| Codex CLI | Add `Stop` group to `.codex/hooks.json` | `session_id` plus `agent_id` when present (fixture-gated) | Same shape as Claude Code / no output | JSON `hookSpecificOutput.additionalContext` | `SessionStart` sources `startup`, `clear`, `compact` | Estimated from `tool_input.command` and `tool_response`; config window | `Stop` `last_assistant_message` → `systemMessage`, `/new` | Cooperative (hosted tools bypass hooks; errors fail open) |
| Cursor | Add `preCompact` | `conversation_id` (subagents not identified in tool payloads) | `{ "permission": "deny", "agent_message", "user_message" }` / `{ "permission": "allow" }` | `{ "additional_context": … }` | `sessionStart`; `preCompact` | Estimated from `tool_input` and `tool_output`; config window | Unsupported | Enforced (`failClosed: true` on `preToolUse`) |
| GitHub Copilot CLI | Add `preCompact` to `.github/hooks/context-brake.json` | `sessionId` (subagents not identified) | `{ "permissionDecision": "deny", "permissionDecisionReason" }` / no output | `{ "additionalContext": … }` | `sessionStart` sources `startup`, `new`; `preCompact` | Estimated from `toolArgs` and `toolResult.textResultForLlm`; config window | Unsupported (`agentStop` has no text) | Enforced (timeouts fail open and are reported as a limitation) |
| Antigravity CLI | Add `PostToolUse` named `context-brake` | `conversationId` | `{ "decision": "deny", "reason" }` / `{ "decision": "allow" }` | `PreInvocation` `{ "injectSteps": [{ "ephemeralMessage": … }] }`, else `{ "injectSteps": [] }`; `PostToolUse` replies `{}` | New `conversationId` only | Estimated from `toolCall.args`; config window | Unsupported | Cooperative (hook coverage in the CLI unconfirmed) |
| OpenCode | None (plugin handlers) | `input.sessionID` (fixture-gated) | Throw `Error(<block message>)` in `tool.execute.before` / return | None | `event` hook for `session.created`, `session.compacted` (property names fixture-gated) | Estimated from `output.args` and `output.output`; config window | Unsupported | Cooperative (tool coverage undocumented) |
| Pi | None (extension handlers) | `ctx.sessionManager.getSessionId()` | `tool_call` → `{ block: true, reason }` / `undefined` | `tool_result` → `{ content: [...event.content, { type: "text", text }] }` | `session_start` reasons `startup`, `new`; `session_compact` | Measured `ctx.getContextUsage()` (`tokens`, `contextWindow`); estimated when it returns `undefined` | `message_end` assistant text → `ctx.ui.notify(text, "info")`, `/new` | Enforced |
| Oh-My-Pi | None (`.omp/extensions/context-brake.js`) | `ctx.sessionManager.getSessionId()` | `tool_call` → `{ block: true, reason }` | `tool_result` content append (fixture-gated) | `session_start`; `session_compact`, `auto_compaction_end` | Measured only after a fixture confirms the `getContextUsage()` shape; otherwise estimated | Unsupported (no documented command) | Enforced |

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
- Post-tool events are idempotent per `toolUseId` where the harness sends one (Claude Code, Codex CLI, Cursor, Pi `toolCallId`). Copilot and Antigravity send no call ID, so a harness retry of the same event would count twice.
- Registration changes reuse PRD-01's surgical editor and manifest entries. A third `init` run adds nothing, and `remove` deletes the new entries.

Research updates required in `docs/research/harness-integrations.md` in the implementation change:

- Claude Code: `Stop` and `SubagentStop` carry `last_assistant_message`; `systemMessage` reaches the user; `agent_id` and `agent_type` appear inside subagents; a timed-out `PreToolUse` hook does not block.
- Codex CLI: `Stop` carries `last_assistant_message` and `stop_hook_active`; `systemMessage` is shown as a warning; errors, invalid JSON, and timeouts fail open (previously recorded as undocumented).
- Cursor: fields for `preToolUse`, `postToolUse`, `afterAgentResponse` (`text`), `stop`, `preCompact`, and `subagentStart` and `subagentStop`; tool payloads do not identify subagents; `preCompact` is the only compaction event.
- Copilot: `toolArgs` is an object; `sessionStart` `source` is `startup`, `resume`, or `new`; `agentStop` has no response text; `preCompact` has no post event; `/clear`, `/new`, and `/reset` start a new conversation.
- Pi: the `getContextUsage()` shape; `tool_call`, `tool_result`, and `session_start` fields; `ctx.ui.notify`; `/new`. The Pi extensions page says handler exceptions are logged without blocking other handlers, which diverges from the hooks page line recorded in research. ContextBrake never relies on a throw to block.
- Oh-My-Pi: extensions load from `.omp/extensions/` (`.ts`, `.js`); `tool_call` errors block.
- OpenCode: handler signature `(input, output)`; no token API; no post-tool context.
- Antigravity: `PreToolUse` uses `toolCall.name` and `toolCall.args` (the current adapter schema and benchmark use `toolName` and `hookName`); `injectSteps` entries are `toolCall`, `userMessage`, or `ephemeralMessage`; `PostToolUse` receives `toolCall`, `stepIdx`, and `error`.

## Errors, security, and recovery

- Errors and edges:
  - Invalid or missing payload fields, unknown events, oversized stdin, invalid configuration, an unreadable plan, and ledger lines that fail the schema are handled by DEC-09 and never surface as uncaught exceptions.
  - A usage percentage above 100 classifies as `CRITICAL`.
  - A harness-reported window change (Pi model switch) takes effect on the next reading. Elsewhere the configured window applies for the whole session, a documented limitation.
  - A resumed session keeps its counts; a new session ID starts a new ledger.
  - An empty plan, no active step, or a step without a validation command removes only allowlist entry (b).
- User files and sensitive data:
  - The runtime writes only inside `<root>/.context-brake/runtime/`, never to harness configuration or instruction files.
  - Ledger and log lines hold metadata only (DEC-04, DEC-12); session IDs are stored because CA-17 and CA-18 require them. File names hash harness-provided IDs.
  - Configuration and plan values never reach logs.
  - The allowlist is a context brake against an agent that ignores zones, not a security boundary: an agent can edit the plan's validation command and then run it (see Risks).
- Concurrency and idempotency: single-line appends with no locks (DEC-04); readers tolerate partial and invalid lines; duplicate post-tool events are skipped by call ID where one exists. In-process caches are per process and write through to disk.
- Rollback or reversal: `context-brake remove` unregisters hooks and plugins, including the new events, which stops all runtime behavior. Reinstalling a previous package version with `init --yes` replaces the assets. `.context-brake/runtime/` can be deleted at any time without affecting plans, checkpoints, or harness configuration. The configuration change is additive apart from the `turnCeiling` rule, which a user fixes by aligning the two values.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| 1. Zod-free contracts and mini configuration: CMP-12, CMP-13, bundle guard, schema regeneration | — | `npm run schemas:check` passes; TC-03 and TC-24 pass; existing configuration tests pass. |
| 2. Pure core: CMP-01 to CMP-11 | 1 | TC-01, TC-02, TC-05 to TC-07, TC-10, TC-11, TC-15 to TC-17, TC-21, TC-25, TC-28, TC-30 pass with port fakes. |
| 3. Protocol and doctor core: CMP-14, CMP-16 | 2 | TC-02 and the doctor parts of TC-19 pass; `docs/context-brake-protocol.md` regenerated. |
| 4. Runtime infrastructure: CMP-17 to CMP-19 | 2 | TC-08, TC-18, TC-20, and TC-29 pass on a temporary filesystem. |
| 5. Process harness adapters: Claude Code, Codex CLI, Cursor, Copilot, Antigravity (CMP-20 to CMP-23), with fixtures and research updates | 4 | TC-09, TC-12, TC-14, TC-26, and TC-33 pass for each harness; research sections updated in the same change. |
| 6. In-process adapters: Pi, Oh-My-Pi, OpenCode | 4 | TC-11, TC-14, TC-32, and TC-33 pass; QA-05 is clean. |
| 7. Doctor wiring, assets, and bundler: CMP-24, CMP-25 | 5, 6 | TC-19, TC-22, and TC-24 pass; `npm run build`, `assets:check`, and `package:smoke` pass. |
| 8. End-to-end, docs, harness simulator: CMP-26, CMP-27 | 7 | TC-13, TC-23, and TC-27 pass in the CI matrix; README and `docs/telemetry-block.md` published. |

## Test approach

- Profile:
  - Runtime surfaces: `doctor` (CLI command); process hooks, one process per event, for Claude Code, Codex CLI, Cursor, GitHub Copilot CLI, and Antigravity CLI; in-process plugins and extensions for OpenCode, Pi, and Oh-My-Pi.
  - Platform: Node.js ≥ 20 (CI: 20, 22, 24); TypeScript 5.9 strict, `NodeNext` ESM, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`.
  - Vitest 3 with the `parallel` and `process` projects from `tests/test-lanes.ts`; V8 coverage thresholds of 80% on `src/**/*.ts`.
  - Commands from `AGENTS.md`: `npm install --ignore-scripts`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`, `npm run dependencies:check`, `npm run package:smoke`.
- End-to-end: the built CLI runs as a child process in temporary fixture repositories. `context-brake init --yes --harness <id>` installs the real assets; the test then spawns the installed hook with the documented fixture payload sequence and runs `context-brake doctor --json`. There is no browser or UI layer.
- Platforms: Linux, macOS, and Windows (PowerShell and Git Bash launchers) for TC-08, TC-18, TC-22, TC-23, TC-27, and TC-29, because they touch appends, paths, child processes, and line endings.
- Command prerequisites and exclusions:
  - `dist/` must be built before process-lane, end-to-end, and package tests, which run serially in the `process` project.
  - The `js-tiktoken` devDependency must pass `npm run dependencies:check`.
  - No installed harness, network, or real clock: `Clock` is injected, and retention tests set `mtime` with `utimes`.
- Manual acceptance: none required. CA-11 and CA-21 are verified by the simulator (DEC-19, TC-13, TC-23). Before a capability is advertised for a harness, its adapter task captures at least one real payload per registered event as a fixture and records the harness version in the research file; a short real session is optional.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | RF10, CA-03, zone objective | unit | Default zones at usage 49, 50, 65, 66, 74, 75 and turns 7, 8, 10, 11, 12, combined conditions, and 130% | Exact zones listed under Contracts; highest zone wins; 130% is `CRITICAL` | `tests/unit/zone-classifier.test.ts` |
| TC-02 | RF9, CA-04 | unit | Default and two custom zone configurations: render the protocol, parse the boundary numbers from each row, classify at those numbers and one below | Protocol boundaries and classifier boundaries match in every case | `tests/unit/protocol-zone-coherence.test.ts` |
| TC-03 | RF11, CA-05, CA-23, DEC-03 | unit | Yellow ≤ green, yellow ≥ critical (percentages and turns), `turnCeiling` ≠ `criticalTurn`, invalid `additionalAllowedCommands`, a v1 file without `brake` | Each invalid case reports field path, received value, and rule; the file without `brake` parses with the default | `tests/unit/configuration.test.ts` |
| TC-04 | CA-05, RF19 | integration | Built Claude Code hook with an invalid configuration: pre-tool below and at a recorded `CRITICAL` zone, then post-tool | Neutral / deny failure variant; no telemetry; `errors.jsonl` has `INVALID_CONFIG`; exit 0 | `tests/integration/runtime-invalid-config.test.ts` |
| TC-05 | RF13, CA-01, CA-02, CA-22, DEC-07 | unit | `threshold_only`: 55% with 3 turns; 30% with 3 turns; 30% with 8 turns; 40% with 3 turns and a threshold of 40. `always`: 30% with 3 turns | Block (`YELLOW`); none; block (`YELLOW`); block (`GREEN`); block (`GREEN`) | `tests/unit/injection-policy.test.ts` |
| TC-06 | RF12, RF15, RF16, CA-01, CA-09, CA-10 | unit | Render every zone with measured and estimated readings | Exact v1 strings from Contracts, including `source=` and the `RED` action | `tests/unit/telemetry-block.test.ts` |
| TC-07 | CA-13, cost objective | unit | Every zone with worst-case values (turn 999, 1,000,000-token window, 7-digit usage) | `o200k_base` count ≤ 50 and length ≤ 220 characters | `tests/unit/telemetry-block-budget.test.ts` |
| TC-08 | RF1, RF2, CA-06 | integration | Spawn three built post-tool hooks concurrently for one session, then one more; repeat 20 times on fresh ledgers | The fourth response reports `turn=4/12` every time; the ledger has 4 valid `tool` lines | `tests/integration/runtime-parallel-turns.test.ts` |
| TC-09 | RF3, CA-07, DEC-14 | unit and integration | 9 tool lines, then each harness's reset fixture (Claude Code `compact` and `clear`, Codex CLI `compact`, Cursor and Copilot `preCompact`, Pi `session_compact`), then one post-tool event; also Claude Code `resume` | Turn 1 and usage recomputed from characters since the reset; `resume` keeps counting | `tests/unit/session-counters.test.ts`, `tests/integration/runtime-session-reset.test.ts` |
| TC-10 | RF4, CA-08 | unit | Claude Code payloads with and without `agent_id` for the same `session_id` | Separate ledgers; main-session turns unchanged by subagent calls | `tests/unit/claude-runtime-session-key.test.ts` |
| TC-11 | RF5, RF7, RF8, CA-09 | unit | Pi context returns `{ tokens: 70000, contextWindow: 200000, percent: 35 }`, then `undefined`; a window change mid-session | `source=measured`, `tokens=70000/200000`, `usage=35%`; then `source=estimated` with the configured window; the next reading uses the new window | `tests/unit/pi-runtime-usage.test.ts` |
| TC-12 | RF6, RF8, CA-10 | unit | Post-tool fixtures for Claude Code, Codex CLI, Cursor, Copilot, Antigravity, OpenCode | `source=estimated`; `observedCharacters` equals the documented field lengths; no content in ledger lines | `tests/unit/runtime-estimation.test.ts` |
| TC-13 | CA-11, measurement objective, DEC-19 | end-to-end (simulated) | Simulated Pi sessions from the catalog (code, JSON, log, and prose outputs; assistant text between calls; windows of 128,000 and 200,000 tokens), with measured usage from the tokenizer-backed mock | In every reading, measured and estimated usage differ by at most 10 percentage points; otherwise the runtime descriptor constants are recalibrated | `tests/e2e/e2e-simulated-usage.test.ts` |
| TC-14 | RF14, CA-12 | unit | Render a `context` decision for each harness | Claude Code, Codex CLI, Cursor, Copilot: only the context field, no `updatedToolOutput`, `modifiedResult`, or `updated_mcp_tool_output`; Pi: original parts unchanged plus one text part | `tests/unit/runtime-rendering.test.ts` |
| TC-15 | RF17, CA-14 | unit | `CRITICAL` session; Claude Code `Read` of `src/app.ts` | `deny` with the exact block message; one block record | `tests/unit/brake-engine-pre-tool.test.ts` |
| TC-16 | RF18, CA-15, DEC-08 | unit | Allowed: checkpoint write, plan read, validation command, `git status`, `git add src/a.ts`, `git commit -m "checkpoint: x"`, configured `npm run typecheck`. Denied: `git status && rm -rf x`, `git push`, `npm test; curl x`, a patch touching a state file and `src/a.ts`, validation mismatch, no plan, unknown tool | Exact allow and deny outcomes | `tests/unit/brake-allowlist.test.ts`, `tests/unit/shell-command-matcher.test.ts` |
| TC-17 | RF19, CA-16, DEC-09 | unit | Failing usage resolver at 40%; failure with last zone `CRITICAL` for a `Read` of `src/a.ts`; the same failure for a checkpoint write and for `git add src/a.ts`; invalid configuration with last zone `CRITICAL` and a write to the default checkpoint path; unreadable ledger; deadline exceeded (fake timers) | Neutral; deny failure variant; neutral for both; neutral; neutral; fallback decision with an error record | `tests/unit/failure-policy.test.ts` |
| TC-18 | RF19, CA-16 | integration | Built hooks for Claude Code, Cursor, and Copilot with a corrupt ledger or configuration, below and above the ceiling | Exit 0; Cursor below the ceiling returns `permission: allow`; above the ceiling, each returns its deny shape | `tests/integration/runtime-failure-policy.test.ts` |
| TC-19 | RF21, CA-17, DEC-10 | unit and integration | Codex CLI ledgers for three sessions and a Claude Code ledger; run doctor | One `BRAKE_COOPERATIVE` warning for Codex CLI, with its session IDs and the hosted-tools reason; none for Claude Code; identical text and JSON findings | `tests/unit/brake-session-checks.test.ts`, `tests/integration/doctor-brake-sessions.test.ts` |
| TC-20 | RF20, CA-18, privacy constraint | integration | A blocked call whose input and output contain a sentinel secret | `blocks.jsonl` has session, tool, zone, reason; the sentinel appears in no file under `.context-brake/runtime/` | `tests/integration/runtime-block-log.test.ts` |
| TC-21 | RF22, CA-19, DEC-13 | unit | Claude Code `Stop` ending with the signal; the signal mid-text; Codex CLI `Stop`; Pi `message_end`; Cursor and Copilot descriptors | `systemMessage` with `/clear`; neutral; `/new`; notify with `/new`; no registration and no output | `tests/unit/reset-notice.test.ts` |
| TC-22 | CA-20, overhead objective, DEC-17 | integration | Built process assets: post-tool and `CRITICAL` pre-tool with allowlist evaluation (3 warm-ups, 20 samples); in-process `tool_call` handlers (10 warm-ups, 100 samples); doctor measurer with `event` | Process p95 ≤ 100 ms on every platform; in-process p95 ≤ 15 ms; the measurer invokes the tool handler | `tests/integration/runtime-overhead.test.ts`, `tests/integration/doctor-benchmark.test.ts` |
| TC-23 | CA-21, efficacy objective, DEC-19 | end-to-end (simulated) | 20 simulated sessions each for Claude Code, Cursor, and Pi: compliant agent, agent ignoring `YELLOW` and `RED`, parallel batches, compaction mid-session, a subagent, `git status && …` tricks, writes to other files, and an integration failure injected above the ceiling | Every session reaches `CRITICAL`; no call outside the allowlist runs at or after it; in all 20 sessions the save sequence (read and write the checkpoint, the validation command, `git status`, `git add`, `git commit`) runs and leaves a checkpoint that parses | `tests/e2e/e2e-simulated-long-task.test.ts` |
| TC-24 | DEC-02, CA-20 | unit | esbuild metafile for every runtime asset | No input from classic Zod, `jsonc-parser`, `semver`, or `src/cli/` | `tests/unit/runtime-bundle-imports.test.ts` |
| TC-25 | RF21, DEC-10 | unit | Brake mode for all eight capability definitions and for `unknown` block or coverage states | Claude Code, Cursor, GitHub Copilot CLI, Pi, and Oh-My-Pi are `enforced`; Codex CLI, OpenCode, and Antigravity CLI are `cooperative` with their reasons; an `unknown` block or coverage state is never `enforced` | `tests/unit/brake-mode.test.ts` |
| TC-26 | RF3, RF22, DEC-14 | integration | Install three times over fixtures with user hooks, then `remove` | One entry per new event (`Stop`, `preCompact`, `PostToolUse`); user entries byte-identical; `remove` deletes only ContextBrake entries | `tests/unit/adapter-planners.test.ts`, `tests/integration/claude-preservation.test.ts` |
| TC-27 | CA-01, CA-14, CA-15, CA-17, CA-18 | end-to-end | Built CLI installs Claude Code in a fixture repository with a 20,000-token window; drive hooks from `GREEN` to `CRITICAL`; attempt `Read`, checkpoint write, `git status`, `git add`; then `doctor --json`. A second repository with Codex CLI sessions | Blocks at `YELLOW` and `RED`; `Read` denied; allowlisted calls neutral; doctor reports `BRAKE_BLOCKS_RECORDED`, and `BRAKE_COOPERATIVE` for Codex CLI | `tests/e2e/e2e-brake.test.ts` |
| TC-28 | RF6, RF7, model-switch edge case | unit | Estimator arithmetic, window selection, percentage floor, zero window guard | Exact tokens, percentages, and sources | `tests/unit/usage-resolver.test.ts` |
| TC-29 | DEC-16, privacy constraint | integration | First runtime write; a new-session event with ledgers 15 and 13 days old | `.gitignore` containing `*` created; only the 15-day ledger removed | `tests/integration/runtime-retention.test.ts` |
| TC-30 | RF18, DEC-18 | unit | Plans with `currentStepId`, only `IN_PROGRESS`, only `COMPLETED`, invalid JSON, missing file | The expected validation command or none | `tests/unit/plan-validation-reader.test.ts` |
| TC-31 | RF9, RF11 | unit | Regenerated configuration schema and README example | `schemas:check` clean; the README example validates | `npm run schemas:check`, `tests/unit/readme-config-example.test.ts` |
| TC-32 | RF17, RF19, in-process rule | unit | OpenCode `tool.execute.before` at `CRITICAL` and below; Pi and Oh-My-Pi `tool_call` with a throwing dependency | Throws the block message / returns; `{ block: true }` only when the last zone is `CRITICAL` | `tests/unit/in-process-runtime.test.ts` |
| TC-33 | RF12, RF17, RF3, `harness-adapters.md` | unit | For every harness, documented payload fixtures in `tests/fixtures/harnesses/<harness>/` (including the new `stop.json`, `pre-compact.json`, `post-tool-use.json`, `pre-invocation.json`, `tool-result.json`) mapped and rendered | Expected `RuntimeEvent`s; responses use only documented fields; unknown extra payload fields are tolerated | `tests/unit/harness-runtime-contracts.test.ts` |

## Quality profile

Rules this feature can violate. A blocking hit prevents task completion and rejects the review; a reservation becomes an optional improvement and counts toward escalation. A hit covered by `DEC-NN` is expected, not a finding.

Scope, defined once in a POSIX shell:

```bash
RG=(rg -n --type ts -g '!node_modules/**' -g '!dist/**' -g '!coverage/**' -g '!**/*.d.ts')
files=()          # every TypeScript file in the task diff
core_files=()     # subset under src/core/
runtime_files=()  # subset under src/infrastructure/runtime/, src/infrastructure/harnesses/*/runtime.ts, src/infrastructure/harnesses/*/capabilities.ts, assets/runtime/
hook_files=()     # runtime_files on a hook response path, excluding src/infrastructure/runtime/process-hook-host.ts and node-runtime-logs.ts
```

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `"${RG[@]}" ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | — |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `"${RG[@]}" '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-03 | Empty `catch` or `.catch(() => {})`; the failure policy must record every failure | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | — |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-05 | Synchronous file or process API in runtime modules; the ledger, logs, and engine also run inside OpenCode, Pi, and Oh-My-Pi | blocking | `"${RG[@]}" '\b(readFileSync\|writeFileSync\|appendFileSync\|existsSync\|spawnSync\|statSync\|readdirSync)\b' "${runtime_files[@]}"` | — |
| QA-06 | `console.log` or `process.stdout.write` outside the response writer | blocking | `"${RG[@]}" 'console\.log\|process\.stdout\.write' "${hook_files[@]}"` | — |
| QA-07 | Runtime bundles pulling classic Zod, `jsonc-parser`, `semver`, or CLI code | blocking | `npx vitest run tests/unit/runtime-bundle-imports.test.ts` | `DEC-02` |
| QA-08 | Clock or randomness in `core` (timestamps come from the injected `Clock`) | reservation | `"${RG[@]}" 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' "${core_files[@]}"` | — |
| QA-09 | Generic `throw new Error(` where a dedicated error class names a fixable failure | reservation | `"${RG[@]}" 'throw new Error\(' "${files[@]}"` | — |
| QA-10 | 4+ parameters in one declaration, or a `.ts` file above 100 lines | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"; rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | — |

In the table, `\|` stands for a literal pipe; run the commands with plain `|`.

- Verification scope: the TypeScript files in each task diff, using the lists above; skip a command whose list is empty.
- Escalation trigger: eight or more reservation hits in the feature, a touched file above 200 lines, or the same symbol or block duplicated in three or more places in the diff. The five process-hook planners already repeat their install and remove skeleton; the new registrations must not add a fourth copy of shared logic to them.

### Terrain baseline

Hits that already existed in the target files before implementation. A hit listed here is not a task finding; a new hit is. A target file without a row in this table counts as unmeasured, and every hit in it will be treated as new.

Measured on 2026-09-14 at `99643a5` with the commands from `references/preparatory-refactoring.md` and the QA commands above. PRD 1.1 changes several of these files first (`support-service.ts`, the adapters and their schemas, `overhead-measurer.ts`, `adapter.ts`), so remeasure every target file after PRD 1.1 lands and before this feature's tasks are planned. No target file has a declaration with 4+ parameters or any `case` statement, and none triggered QA-01 to QA-06 or QA-08.

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/core/contracts/configuration.ts` | 25 | 6 | ≤ 3 | 0 | — | recorded |
| `src/core/contracts/harness.ts` | 55 | 34 | ≤ 3 | 0 | structural: 34 exported members | absorbed in `DEC-02` (five unused schema exports deleted; no export added) |
| `src/core/contracts/adapter.ts` | 53 | 5 | ≤ 3 | 0 | — | recorded |
| `src/core/validation/configuration-validator.ts` | 20 | 4 | ≤ 3 | 0 | — | recorded |
| `src/core/services/protocol-service.ts` | 51 | 2 | ≤ 3 | 0 | — | recorded |
| `src/core/services/support-service.ts` | 62 | 2 | ≤ 3 | 0 | — | recorded |
| `src/core/services/doctor-service.ts` | 86 | 2 | ≤ 3 | 0 | — | recorded |
| `src/core/services/doctor-checks.ts` | 69 | 4 | ≤ 3 | 0 | — | recorded (new checks go to `brake-session-checks.ts`) |
| `src/cli/commands/doctor.ts` | 52 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/diagnostics/overhead-measurer.ts` | 81 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/claude-merger.ts` | 50 | 6 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/planner.ts` | 83 | 5 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/schemas.ts` | 45 | 7 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/adapter.ts` | 77 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/codex-cli/planner.ts` | 79 | 5 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/codex-cli/schemas.ts` | 27 | 5 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/codex-cli/adapter.ts` | 83 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/cursor/planner.ts` | 75 | 5 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/cursor/schemas.ts` | 23 | 4 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/cursor/adapter.ts` | 70 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/github-copilot-cli/planner.ts` | 74 | 5 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/github-copilot-cli/schemas.ts` | 26 | 4 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/github-copilot-cli/adapter.ts` | 80 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/antigravity-cli/planner.ts` | 79 | 5 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/antigravity-cli/schemas.ts` | 19 | 4 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/antigravity-cli/adapter.ts` | 81 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/opencode/schemas.ts` | 18 | 3 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/opencode/adapter.ts` | 76 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/pi/schemas.ts` | 15 | 3 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/pi/adapter.ts` | 70 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/oh-my-pi/schemas.ts` | 15 | 3 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/oh-my-pi/adapter.ts` | 70 | 1 | ≤ 3 | 0 | — | recorded |
| `assets/runtime/process-hook.ts` | 41 | 4 | ≤ 3 | 0 | — | deleted (`DEC-01`) |
| `assets/runtime/claude-code-hook.ts` | 7 | 0 | ≤ 3 | 0 | — | recorded |
| `assets/runtime/codex-cli-hook.ts` | 7 | 0 | ≤ 3 | 0 | — | recorded |
| `assets/runtime/cursor-hook.ts` | 11 | 0 | ≤ 3 | 0 | — | recorded |
| `assets/runtime/github-copilot-cli-hook.ts` | 7 | 0 | ≤ 3 | 0 | — | recorded |
| `assets/runtime/antigravity-cli-hook.ts` | 10 | 0 | ≤ 3 | 0 | — | recorded |
| `assets/runtime/opencode-plugin.ts` | 11 | 2 | ≤ 3 | 0 | — | recorded |
| `assets/runtime/pi-extension.ts` | 13 | 2 | ≤ 3 | 0 | — | recorded |
| `assets/runtime/omp-extension.ts` | 13 | 2 | ≤ 3 | 0 | — | recorded |
| `scripts/asset-bundler.ts` | 64 | 6 | ≤ 3 | 0 | `QA-09: scripts/asset-bundler.ts:63` | recorded |
| `tests/test-lanes.ts` | 39 | 8 | ≤ 3 | 0 | — | recorded |
| `tests/unit/support-service.test.ts` | 53 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/protocol-service.test.ts` | 30 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/configuration.test.ts` | 39 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/doctor-service.test.ts` | 92 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/harness-adapters.test.ts` | 39 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/hook-registration-paths.test.ts` | 63 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/runtime-assets.test.ts` | 39 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/asset-bundler.test.ts` | 51 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/harness-schemas-process.test.ts` | 80 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/harness-schemas-in-process.test.ts` | 45 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/adapter-planners.test.ts` | 66 | 0 | ≤ 3 | 0 | — | recorded |
| `tests/unit/readme-config-example.test.ts` | 17 | 0 | ≤ 3 | 0 | `QA-09: tests/unit/readme-config-example.test.ts:9` | recorded |
| `tests/integration/doctor-benchmark.test.ts` | 37 | 0 | ≤ 3 | 0 | — | recorded |

Non-TypeScript targets have no measures: `tsconfig.check.json`, `package.json`, `README.md`, `docs/research/harness-integrations.md`, `docs/context-brake-protocol.md`, `schemas/context-brake.config.schema.json`.

- Preparatory refactoring: not recommended. The only structural threshold crossed is the export count of `src/core/contracts/harness.ts`, and the feature does not extend it: it deletes five unused exports as part of `DEC-02`. Every other target is below every threshold, so intense contact with them is ordinary feature work.

## Observability and rollout

- Signals:
  - Ledgers, `blocks.jsonl`, and `errors.jsonl` under `.context-brake/runtime/`.
  - Doctor findings `BRAKE_COOPERATIVE`, `BRAKE_BLOCKS_RECORDED`, and `RUNTIME_ERRORS_RECORDED`, plus the existing overhead measurement.
  - One stderr line per runtime failure (code only).
  - Nothing leaves the machine.
- Migration and compatibility:
  - Configuration stays at schema version 1 (additive `brake`, plus the `turnCeiling` rule).
  - Existing installations keep the stub assets until the user reruns `context-brake init --yes`. The protocol file then shows `PROTOCOL_FILE_MISMATCH` until the same rerun, because the `CRITICAL` row text changes. The README upgrade note must say so.
  - `DoctorReport` and `InstallReport` schemas are unchanged.
- Rollout and rollback:
  - Gates: lint, typecheck including `assets/`, tests with coverage ≥ 80%, `schemas:check`, `dependencies:check`, `assets:check`, `package:smoke`, and the Linux, macOS, and Windows × Node 20/22/24 CI matrix.
  - Adapter capability claims follow the version gates in `harness-adapters.md`; a harness without captured real payload fixtures keeps its fixture-gated items unsupported.
  - Rollback: `context-brake remove`, or reinstall the previous package version with `init --yes`.

## Risks and open items

- Risk: the 100 ms process target includes Node startup. Probability low on an unloaded machine, impact CA-20. Mitigation: `zod/mini`, a lazy plan read, no Zod work on the neutral path, and a CI measurement per OS (TC-22). The slow local run of 2026-09-14 is not treated as evidence against the target (OI-04).
- Risk: the estimated usage misses the 10-point target in real sessions, because it ignores system prompts, assistant text, and user prompts beyond fixed constants. Probability medium, impact zone accuracy. Mitigation: per-harness constants calibrated against the simulated sessions of TC-13, and the source always marked `estimated`. Real harness overhead (system prompts, caching, reasoning tokens) is never measured, because real long-task runs are out of scope (DEC-19).
- Risk: Claude Code releases the call if the hook process dies before replying (a crash outside the failure boundary, `node` missing, or its timeout). Probability low, impact a non-allowlisted call above the ceiling. Mitigation: explicit deny from the failure boundary, a deadline far below the timeout, and doctor overhead checks. Residual risk accepted for the `enforced` claim.
- Risk: Cursor, Oh-My-Pi, OpenCode, and Antigravity file-tool names and input fields are undocumented. Probability medium, impact the agent cannot save state above the ceiling in those harnesses. Mitigation: fixture-gated classification, and no efficacy claim until a captured real payload confirms the tool names and fields.
- Risk: the default ceiling of 12 turns means 12 completed tool calls, a short session for real coding work. Probability medium, impact frequent resets. Mitigation: the ceiling and every turn limit are already configurable (`telemetry.zones.greenMaxTurn`, `yellowMaxTurn`, `criticalTurn`, with `turnCeiling` equal to `criticalTurn`); the default stays 12, as the product owner confirmed on 2026-09-14; and the README documents how to change it.
- Risk: the allowlist is not a security boundary, because an agent can rewrite the plan's validation command and then run it. Probability low for cooperative agents, impact arbitrary commands above the ceiling. Mitigation: documented limitation; PRD-04 adds confirmation of changed commands for the runner.
- Risk: Windows antivirus or network filesystems can interleave or delay appends. Probability low, impact a miscounted turn. Mitigation: single-write lines under 4 KiB, a tolerant reader, and TC-08 on Windows CI.
- Risk: Cursor's `preToolUse` default timeout is unspecified, and with `failClosed: true` a timeout blocks even below the ceiling. Probability low, impact a false block. Mitigation: the 1,500 ms deadline; a research follow-up to confirm the default.
- Risk: the Pi extensions page says handler exceptions are logged rather than blocking, which contradicts research. Probability medium, impact Pi's `timeout_fail_closed` claim. Mitigation: the design never blocks by throwing; the research file records the divergence; a Pi fixture confirms behavior before release.
- Risk: Copilot and Antigravity send no tool call ID, so a harness retry double-counts. Probability low, impact one extra turn. Mitigation: documented.
- Risk: simulated acceptance proves the integration under documented harness semantics, not model compliance or undocumented vendor behavior. Probability medium, impact a harness that deviates from its documentation can break a guarantee unnoticed. Mitigation: payload fixtures captured from real harness versions, research updates with every adapter change, and doctor findings in the field.
- Resolved OI-01 (2026-09-14): the built-in allowlist has `git status`, `git add`, and `git commit`; plan and checkpoint files are local state that does not need a commit (DEC-08).
- Resolved OI-02 (2026-09-14): keep both `telemetry.turnCeiling` and `zones.criticalTurn`, with the equality rule in DEC-03.
- Resolved OI-03 (2026-09-14): telemetry starts when the session leaves `GREEN` (DEC-07, TC-05). The PRD was aligned the same day (RF13, cost objective, CA-01, CA-02, CA-22).
- Resolved OI-04 (2026-09-14): no platform exception; the 100 ms target applies to every platform, and the slow local measurement is not a reason to change it.
- Open item OI-05: the final plan field names from the PRD-03 TechSpec. Owner: tech lead of PRD-03. Affects DEC-18, `plan-validation-reader.ts`, and TC-30.
- Resolved OI-06 (2026-09-14): there is no real reference scenario; CA-11 and CA-21 are verified by the simulator (DEC-19). The same day, PRD-02 (objectives, CA-11, CA-20, CA-21), PRD-03 (objectives, CA-11, CA-17), and PRD-04 (autonomy objective, CA-14) were reworded to use simulated sessions.
- Resolved OI-07 (2026-09-14): moved to PRD 1.1. `remove` deletes `.context-brake/runtime/` only with `--remove-state` (FR-09), and doctor flags installed assets that differ from the packaged version (FR-07, FR-08), so users upgrading from the stubs learn to rerun `init`.
- Open item OI-08: confirm Cursor CLI coverage of `preToolUse`, `postToolUse`, and `preCompact`, and Oh-My-Pi's `getContextUsage()` shape, before claiming `enforced` or `measured` for them. Owner: implementer of each adapter task. Affects DEC-05, DEC-10, and the README table.
- Open item OI-09: an opt-in Claude Code status line bridge for measured usage, which would require composing with a user-owned `statusLine`. Owner: product owner, post-MVP. Affects DEC-05.
- Resolved OI-10 (2026-09-14): plan and checkpoint are local state. `init` adds them to `.gitignore` inside a ContextBrake block (PRD-01 RF24, CA-21), and `remove` takes the block out only together with the state files. PRD-03 no longer describes them as versioned, and ignoring them keeps the working tree clean for its RF14 check. No PRD-02 component depends on it; the PRD-01 TechSpec covers RF24 in its DEC-02 since the same day, and its implementation is pending.

## Relevant files

- Modify:
  - Contracts and validation: `src/core/contracts/configuration.ts`, `src/core/contracts/harness.ts`, `src/core/contracts/adapter.ts`, `src/core/validation/configuration-validator.ts`
  - Core services: `src/core/services/protocol-service.ts`, `src/core/services/support-service.ts`, `src/core/services/doctor-service.ts`
  - CLI and diagnostics: `src/cli/commands/doctor.ts`, `src/infrastructure/diagnostics/overhead-measurer.ts`
  - Claude Code: `src/infrastructure/harnesses/claude-code/{claude-merger,planner,schemas,adapter}.ts`
  - Codex CLI: `src/infrastructure/harnesses/codex-cli/{planner,schemas,adapter}.ts`
  - Cursor: `src/infrastructure/harnesses/cursor/{planner,schemas,adapter}.ts`
  - GitHub Copilot CLI: `src/infrastructure/harnesses/github-copilot-cli/{planner,schemas,adapter}.ts`
  - Antigravity CLI: `src/infrastructure/harnesses/antigravity-cli/{planner,schemas,adapter}.ts`
  - OpenCode, Pi, Oh-My-Pi: `src/infrastructure/harnesses/{opencode,pi,oh-my-pi}/{schemas,adapter}.ts`
  - Runtime assets: `assets/runtime/{claude-code-hook,codex-cli-hook,cursor-hook,github-copilot-cli-hook,antigravity-cli-hook,opencode-plugin,pi-extension,omp-extension}.ts`
  - Build and package: `scripts/asset-bundler.ts`, `tsconfig.check.json`, `package.json`, `package-lock.json`
  - Tests: `tests/test-lanes.ts`, and the unit and integration tests listed in the terrain baseline
  - Docs and schemas: `README.md`, `docs/research/harness-integrations.md`, `docs/context-brake-protocol.md`, `schemas/context-brake.config.schema.json`
- Delete: `assets/runtime/process-hook.ts`
- Create:
  - Core contracts: `src/core/contracts/{zones,runtime,session-ledger}.ts`
  - Core services: `src/core/services/{zone-classifier,usage-resolver,session-counters,zone-actions,telemetry-block,injection-policy,brake-allowlist,shell-command-matcher,block-message,reset-notice,brake-engine,failure-policy,brake-mode,brake-session-checks}.ts`
  - Runtime infrastructure: `src/infrastructure/runtime/{node-session-ledger,node-runtime-logs,runtime-paths,plan-validation-reader,tool-path-normalizer,process-hook-host,in-process-host,runtime-composition}.ts`
  - Harness runtime: `src/infrastructure/harnesses/<harness>/{runtime,capabilities}.ts` for all eight harnesses
  - Docs: `docs/telemetry-block.md`
  - Simulator: `tests/support/harness-simulator/{scenarios,agent-profiles,process-driver,in-process-driver,session-recorder}.ts`
  - Fixtures: `tests/fixtures/harnesses/<harness>/` payloads for `Stop`, `preCompact`, `PostToolUse`, `PreInvocation`, `tool_result`, `message_end`, and session events
  - Tests: the suites named in TC-01 to TC-33
