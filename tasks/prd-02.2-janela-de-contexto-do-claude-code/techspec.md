# TechSpec — PRD 2.2 real context window in Claude Code

## Sources and traceability

- PRD: `tasks/prd-02.2-janela-de-contexto-do-claude-code/prd.md`, including the 25/09/2026 decision that moved the bridge to `.claude/settings.local.json`.
- Applicable instructions, rules, and skills:
  - `AGENTS.md`;
  - `.agents/rules/code-standards.md`, `node.md`, `tests.md`, `harness-adapters.md`, and `file-changes.md`;
  - `sdd-create-techspec` with its TypeScript/Node and quality profiles.
- Research: `docs/research/harness-integrations.md#claude-code`. The Status line section is added in step 1 of the sequencing (see DEC-12).
- Evidence in existing code:
  - `src/core/services/session-zone.ts:14-25`: `readZone` and `isStale`.
  - `src/core/services/usage-resolver.ts:20-27`: `measured.contextWindow ?? contextWindowCeiling`.
  - `src/core/services/session-counters.ts:17-41`: `summarizeLedger` counts only lines after the last reset.
  - `src/core/contracts/session-ledger.ts:21-26, 43-49`: line schemas, the three-type union, and `SessionLedger`.
  - `src/infrastructure/runtime/node-session-ledger.ts:57-60`: append-only writes.
  - `src/infrastructure/runtime/runtime-paths.ts:20-22`: session key.
  - `src/infrastructure/runtime/process-hook-host.ts:8, 31, 50, 60`: stdin cap, 1,500 ms deadline, argv event, exit 0.
  - `src/infrastructure/harnesses/common/runtime-support.ts:18-30`: `assetProjectRoot`.
  - `src/infrastructure/harnesses/claude-code/planner.ts:15-98`: install and remove of `.claude/settings.json`.
  - `src/core/contracts/adapter.ts:12-17`: `HarnessContext` with `userHome`.
  - `src/cli/init-arguments.ts:13-43` and `src/core/services/delegated-snapshot-merge.ts:15-37`: init flag pattern.
  - `src/cli/snapshot-helper.ts:6-15`: snapshot list.
  - `src/core/contracts/changes.ts:5`: `runtime_state` owner.
  - `scripts/asset-bundler.ts:8-37` and `scripts/check-package.ts:17-35`: bundled assets and required package files.
  - `src/core/services/doctor-service.ts:51-99` and `src/core/contracts/diagnostics.ts:10-23`: doctor report.
- External, verified 25/09/2026:
  - [Status line](https://code.claude.com/docs/en/statusline):
    - `statusLine` is `{type: "command", command, padding?, refreshInterval?}`, and `command` runs in a shell.
    - On Windows it runs through Git Bash, or through PowerShell when Git Bash is absent. Paths use forward slashes.
    - stdin carries `session_id`, `workspace.project_dir`, `model.id`, and `context_window.{context_window_size, total_input_tokens, used_percentage, current_usage}`. `current_usage` is `null` before the first API call and after `/compact`.
    - It runs at session start or resume, on each assistant message, and after `/compact`, with a 300 ms debounce. An update cancels the in-flight run.
    - Non-zero exit or no output blanks the line, and workspace trust is required.
  - [Hooks](https://code.claude.com/docs/en/hooks): common input fields; `model` only on `SessionStart` and not always present.
  - [Model configuration](https://code.claude.com/docs/en/model-config): 1M models without the `[1m]` suffix.

## Solution summary

An opt-in bridge becomes the developer's local Claude Code status line. `init --statusline-bridge` writes `statusLine` into `.claude/settings.local.json` as a shell pipeline: `node "<abs>/.claude/hooks/context-brake-statusline.mjs" --pipe | ( <previous command> )`. The previous command is the one that was effective in the local, project, or user scope. The harness's own shell therefore still runs the user's command, with its semantics, environment, bytes, and exit code. The bridge copies stdin to stdout unchanged, then appends one `statusline` line to the session ledger: window, input tokens, used percentage, model, and time. With no previous command, the bridge prints nothing. Opt-in state and the previous local value live in `.context-brake/runtime/claude-statusline.json`, which is per machine and git-ignored.

Hooks already read the session ledger on every `PreToolUse` and `PostToolUse`, so `readZone` takes the window from the latest `statusline` line at no extra I/O cost. It uses the bridge's input tokens only when the transcript measurement of PRD 2.1 is missing, and it applies the same reset rule to them. The recorded window survives resets, so estimated readings also use it; `resolveUsage` changes only in its estimated branch, which takes the harness-reported window before the ceiling (DEC-06, amended 26/09/2026). The telemetry block format does not change. Without the bridge and without a harness-reported window, every path behaves as in PRD 2.1.

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-01, NFR-01, NFR-04 | New bundled asset `assets/runtime/claude-code-statusline.ts` → `dist/assets/runtime/claude-code-statusline.mjs`, installed as `.claude/hooks/context-brake-statusline.mjs` on every Claude Code install. It stays inert until the local `statusLine` references it. It is registered in `ASSET_ENTRIES`, in `REQUIRED_FILES` of `check-package.ts`, and in the snapshot list. | This reuses the hook pattern: a self-contained esbuild bundle with no package resolution (`asset-bundler.ts:8-37`). Installing it every time keeps the committed manifest identical across developers, whether or not each one opted in. | A CLI subcommand through `npx context-brake` costs package resolution and a CLI start on every refresh, which is over the 50 ms budget. Installing the asset only on opt-in makes the committed manifest flip between developers. |
| DEC-02 | FR-01, FR-02, NFR-06 | The local `statusLine` is `{type: "command", command}`, plus the `padding` and `refreshInterval` of the previous object when present. `command` depends on whether there is a previous command. With one, it is `node "<root>/.claude/hooks/context-brake-statusline.mjs" --pipe \| ( <previous command>` followed by a newline and `)`, so a trailing `#` comment in the previous command cannot swallow the closing parenthesis (amended 26/09/2026, codereview_01/CR-05; a command written in the earlier single-line form is still recognized as the bridge and is rewritten by the next `init`). Without one, it is `node "<root>/.claude/hooks/context-brake-statusline.mjs"`. `<root>` is `realpath(projectRoot)` with forward slashes. A root containing `"`, `` ` ``, `$`, or `\` after conversion gets the conflict `STATUSLINE_UNSUPPORTED_PATH`, and nothing is written. | The harness shell (sh, or Git Bash on Windows) runs the user's command exactly as before, so ContextBrake never needs `shell: true` (QA-04). The pipeline's exit code is the user's command's. The subshell keeps `;`, `&&`, and `\|` inside the previous command grouped. Absolute paths work from any `cwd`, which is why the scope moved to local. | The bridge could spawn the previous command itself, but that would have to reproduce Claude Code's shell choice (Git Bash or PowerShell) and would need `shell: true`. A relative path breaks when Claude Code starts in a subfolder. |
| DEC-03 | FR-02, FR-03, NFR-01, NFR-02 | `runClaudeStatuslineBridge(argv)` runs in four stages. (1) In `--pipe` mode, stdin chunks are written to stdout unchanged as they arrive, and the first 1 MiB is kept for parsing; without `--pipe`, stdout stays empty. (2) Recording runs inside `runWithinDeadline(…, 1500)`: it parses the buffered JSON with a loose schema, builds the `SessionKey` from `session_id` (harness `claude-code`, `agentId: null`), and appends a `statusline` line. (3) The project root comes from `assetProjectRoot()`, not from stdin. (4) The process always exits 0; failures go to `errors.jsonl` with event `StatusLine`. | Pass-through comes first, so a failure in recording cannot change what the user sees (OBJ-02). The deadline, the exit-0 policy, and the error log reuse `process-hook-host.ts` and `failure-policy.ts`. Trusting the bridge's own location keeps stdin from choosing where ContextBrake writes. | Parsing before pass-through adds latency to every refresh and couples the output to parse success. Using `workspace.project_dir` as the root is spoofable by payload and can differ from the install root. |
| DEC-04 | FR-03, NFR-03, NFR-04 | New contract file `src/core/contracts/statusline-line.ts` defines `statuslineLineSchema = strictObject({v, type: 'statusline', at, windowTokens: int > 0 \| null, inputTokens: int ≥ 0 \| null, usedPercentage: number 0..100 \| null, model: string ≤ 200 \| null})`. It joins the ledger union, and `SessionLedger` gains `appendStatuslineLine`. `inputTokens` is `null` when `current_usage` is `null` or `total_input_tokens` is 0. The payload maps to the line field by field (FR-03 names only). | This absorbs the structural debt of `session-ledger.ts` (31 exports): the new export lives in its own file, and `session-ledger.ts` only adds the member to the union and the interface. Append-only lines match the existing ledger, and unknown lines are already dropped by older readers (`parseLedgerLines`). | Putting the schema in `session-ledger.ts` raises its export count. A separate state file per session would need its own locking and reset handling. |
| DEC-05 | FR-04, FR-05, FR-06 | New `src/core/services/statusline-summary.ts` exposes `summarizeStatusline(lines, resetIndex)` → `{windowTokens, usage: {tokens, at} \| null}`. `windowTokens` is the last non-null value across all lines, resets included (FR-06 keeps the window). `usage` is the last non-null `inputTokens` after the last reset. `SessionSummary` gains `statusline`, filled by `summarizeLedger`. | The reset boundary and the de-duplicated tool scan already live in `summarizeLedger` (`session-counters.ts:17-41`). A separate module keeps that file under 100 lines and the rule testable alone. | Reading the ledger again in the adapter doubles the I/O on every hook. |
| DEC-06 | FR-04, FR-05, FR-06, OBJ-03 | `readZone` builds the measurement before calling `resolveUsage`. The window follows a per-harness precedence on measured and estimated readings alike: `contextWindow` is `measured.contextWindow ?? summary.statusline.windowTokens`, taken whether or not the reading is stale, because a reset drops usage but keeps the window (FR-06). `tokens` is the non-stale transcript measurement, otherwise the non-stale `summary.statusline.usage`. `isStale` applies unchanged to both token sources. The `resolveUsage` estimated branch uses `measured.contextWindow ?? contextWindowCeiling` (amended 26/09/2026, DEC-HIL-04 in `workflow.md`, finding codereview_01/CR-01). | This is harness-agnostic core logic with no new I/O. Each harness gets its most precise window: the harness-reported window (Pi, Oh-My-Pi), then the status line window (Claude Code with the bridge), then the configured ceiling. Before the amendment, an estimated reading always used the ceiling, so right after `/compact` the block showed 128,000 while 1,000,000 was recorded. Impact on PRD 2.1: Pi and Oh-My-Pi readings that report a window with `tokens: null` now use that window instead of the ceiling; harnesses with no window source and sessions with no `statusline` lines are unchanged (OBJ-03). | Passing the status line window as the ceiling only on the estimated path (option B) keeps Pi on the ceiling, which is less precise. Leaving `resolveUsage` unchanged fails FR-06 and OBJ-01. Preferring bridge tokens over the transcript would trade the per-call transcript reading for a status line that lags up to one response. |
| DEC-07 | FR-01, FR-02, FR-08 | Local state `.context-brake/runtime/claude-statusline.json`, owner `harness_entry` (amended 26/09/2026 from `runtime_state`, per the user decision of 25/09/2026, DEC-HIL-03 in `workflow.md`), written through the change plan: `{v: 1, installedCommand, previousLocal: object \| null, previousSource: 'local' \| 'project' \| 'user' \| null, previousCommand: string \| null, createdLocalFile: boolean}`. | The opt-in is per developer (PRD decision), and `runtime/` is already git-ignored (`runtime-paths.ts:26-30`). The committed manifest is strict and rebuilt on every `init` (`manifest.ts:34-51`, `installation-builder.ts:54-66`), so it cannot carry a per-machine value. `doctor` and `remove` call the planner without flags, so the state must survive between runs. Owner `harness_entry` is used because a `runtime_state` change makes `NodeChangeApplier` infer `removeState` and report `.context-brake/runtime` as not empty on removal. | A field in `context-brake.config.json` would be shared by the team. A manifest field breaks older readers. |
| DEC-08 | FR-01, FR-08 | `--statusline-bridge` and `--no-statusline-bridge` go in `INIT_OPTIONS`. Passing both is a `CliArgumentError`, and so is passing either when `claude-code` is not a target. The value travels as `HarnessContext.statuslineBridge?: 'install' \| 'remove'`, built in `detection-collector.ts`. Claude `planInstall` behaves as follows. With `install`, it plans the local entry and the state. With `remove`, it restores. With neither and a state file present, it re-plans the same entry, which is idempotent and refreshes the root when the repository moved. Claude `planRemove` restores whenever the state exists. | This follows the delegated snapshot flag flow (`init-arguments.ts:38-43`, `delegated-snapshot-merge.ts:15-37`). Keeping the planner authoritative makes `--dry-run`, `doctor` asset currency, and `remove` see the same plan (`file-changes.md`). | Handling the flag outside the planner would leave `doctor` and `remove` blind to the bridge. |
| DEC-09 | FR-02, FR-07 | The previous command is resolved from `statusLine` in `.claude/settings.local.json`, `.claude/settings.json`, and `<userHome>/.claude/settings.json`, in that order. The first object with `type: "command"` and a non-empty `command` wins, excluding the bridge's own command; on re-install, the previous command comes from the state. Invalid JSON is handled by scope. A local or project file that does not parse gets `INVALID_HARNESS_CONFIG` and no write (`file-changes.md`). A user-scope file that does not parse counts as absent and yields a finding, carried by the optional `AdapterPlan.findings` and collected by `installation-service.ts` (amended 26/09/2026, DEC-HIL-03). Managed settings are not read. | This mirrors Claude Code's precedence, local over project over user, so the output shown before install stays the output shown after (OBJ-02). ContextBrake only reads outside the repository. | Resolving the user scope at every refresh would put a file read outside the repository on the status line path. Instead, `doctor` detects drift (DEC-10). |
| DEC-10 | FR-07 | New `src/infrastructure/harnesses/claude-code/statusline-diagnostics.ts` returns warnings from the Claude `diagnose`, each with a remediation. `STATUSLINE_BRIDGE_INACTIVE`: state present, but the local `statusLine.command` differs from `installedCommand`. `STATUSLINE_BRIDGE_MISSING_SCRIPT`: the script is missing at the recorded root. `STATUSLINE_PREVIOUS_CHANGED`: the previous command resolved now (DEC-09) differs from `previousCommand`. `STATUSLINE_LOCAL_TRACKED`: `.claude/settings.local.json` is not ignored, checked with `git check-ignore` through the existing `ProcessRunner`. The report gains an optional `contextWindow` section, in the new file `src/core/contracts/context-window-report.ts`: `{bridge: 'absent' \| 'installed' \| 'inactive', source: 'statusline' \| 'contextWindowCeiling', lastWindowTokens: number \| null}`. `lastWindowTokens` is read from the most recently modified Claude Code ledger. `renderDoctorText` prints one line. | This follows the `checkpointMode` optional-section pattern (`diagnostics.ts:22`, `report-service.ts:75`). New exports go to a new file because `diagnostics.ts` already has 16 (absorbed). The Claude `diagnose` stays the per-harness entry point (`adapter.ts:40-66`). | Putting the checks inside `doctor-service.ts` (100 lines) pushes it over the limit. |
| DEC-11 | FR-01, FR-08 | `.claude/settings.local.json` and `.claude/hooks/context-brake-statusline.mjs` join `STANDARD_HARNESS_PATHS`. Edits use `setJsonProperty` and `removeJsonProperty` on `statusLine` only. Removal restores `previousLocal` exactly when it was present, and removes the key otherwise. It deletes the file when `createdLocalFile` is true and the result is `{}` apart from whitespace. The state file is deleted in the same plan. | Planned changes need snapshots (`change-plan-service.ts:47-49`), and in-place JSON edits keep formatting (`json-document-editor.ts`). | Rewriting the whole file loses the user's formatting and other keys. |
| DEC-12 | FR-09 | Documentation. `docs/research/harness-integrations.md#claude-code` records the Status line facts listed under Sources, with the check date, before any code (`AGENTS.md`, `harness-adapters.md`). The README gets the option, the footer effect, the 1M zone effect, the non-interactive limit, and the Windows PowerShell-only limit. `docs/telemetry-block.md` §5 lists the `statusline` ledger line. `CLAUDE_CAPABILITIES.context_usage` keeps `state: 'unknown'`; its impact text adds "the context window comes from the optional status line bridge". | Research comes first under the repository rules. The capability's measurement source is still undocumented. | — |
| DEC-13 | NFR-01 | The bridge budget is measured like the hook budget, with a new case in `tests/integration/runtime-overhead.test.ts`. The bridge runs in `--pipe` mode feeding `node -e "process.stdin.resume()"`, against the same user command alone. In CI, the p95 difference must be at most 50 ms, and locally it must be at most `max(50, baseline*3 + 150)`. The case uses 20 samples after 3 warmups, as existing cases do. | This reuses the p95 sampler and the CI/local split of existing cases (`runtime-overhead.test.ts:13-59`). Measuring against the user command isolates what the bridge adds. | Measuring against `node -e ''` counts the user command as overhead. |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `assets/runtime/claude-code-statusline.ts` | New | Asset entry that calls `runClaudeStatuslineBridge(process.argv)` | CMP-02 |
| CMP-02 | `src/infrastructure/harnesses/claude-code/statusline-bridge.ts` | New | Pass-through, bounded buffering, recording under deadline, exit 0 | CMP-03, CMP-04, `NodeSessionLedger`, `NodeRuntimeErrorLog`, `runWithinDeadline` |
| CMP-03 | `src/infrastructure/harnesses/claude-code/statusline-payload.ts` | New | Loose Zod schema for status line stdin and mapping to `StatuslineLineInput` | Zod mini |
| CMP-04 | `src/core/contracts/statusline-line.ts` and `session-ledger.ts` | New / modified | `statusline` line schema and type; union member; `appendStatuslineLine` | — |
| CMP-05 | `src/infrastructure/runtime/node-session-ledger.ts` | Modified | Implements `appendStatuslineLine` with the existing append | CMP-04 |
| CMP-06 | `src/core/services/statusline-summary.ts` and `session-counters.ts` | New / modified | `SessionSummary.statusline` from ledger lines | CMP-04 |
| CMP-07 | `src/core/services/session-zone.ts` | Modified | Merges transcript and status line measurements before `resolveUsage` | CMP-06 |
| CMP-07a | `src/core/services/usage-resolver.ts` | Modified (26/09/2026, CR-01) | Estimated branch uses `measured.contextWindow ?? contextWindowCeiling` | CMP-07 |
| CMP-08 | `src/infrastructure/harnesses/claude-code/statusline-planner.ts` and `planner.ts` | New / modified | Resolves the previous command, builds the local entry, plans install, restore, and the state file | CMP-09, `json-document-editor` |
| CMP-09 | `src/infrastructure/harnesses/claude-code/statusline-state.ts` | New | Schema, read, and serialization of `claude-statusline.json` | Zod mini |
| CMP-10 | `src/cli/init-arguments.ts`, `src/cli/detection-collector.ts`, `src/core/contracts/adapter.ts` | Modified | Flags, mutual exclusion, and `HarnessContext.statuslineBridge` | — |
| CMP-11 | `src/infrastructure/harnesses/claude-code/statusline-diagnostics.ts` and `adapter.ts` | New / modified | FR-07 warnings | CMP-09, `ProcessRunner` |
| CMP-12 | `src/core/contracts/context-window-report.ts`, `diagnostics.ts`, `report-service.ts`, `src/cli/output/text.ts`, `schemas/doctor-report.schema.json` | New / modified | `contextWindow` report section, text line, and regenerated schema | CMP-11 |
| CMP-13 | `src/cli/snapshot-helper.ts`, `scripts/asset-bundler.ts`, `scripts/check-package.ts`, `tests/helpers/built-hook.ts` | Modified | Snapshots, bundling, package check, and a test helper to spawn the built bridge | CMP-01 |
| CMP-14 | `docs/research/harness-integrations.md`, `README.md`, `docs/telemetry-block.md`, `capabilities.ts` | Modified | Documentation (DEC-12) | — |

**Status line refresh.**
1. Claude Code runs the local `command` in its shell.
2. CMP-02 copies stdin to the user's command through the pipe. The user's output is what Claude Code shows.
3. In parallel, CMP-02 parses the buffered JSON (CMP-03) and appends a `statusline` line to the main session ledger (CMP-05).

**Hook.**
1. `PreToolUse` or `PostToolUse` reads the ledger as today.
2. `summarizeLedger` fills `statusline` (CMP-06).
3. `readZone` (CMP-07) takes the window from it, and tokens from the transcript or, failing that, from the bridge.
4. The block renders unchanged.

**`init --statusline-bridge`.**
1. CMP-10 sets the context.
2. The Claude planner delegates to CMP-08. It reads the three scopes, builds the local entry, and plans the `settings.local.json` update and the state file.
3. Dry-run, confirmation, and apply follow the existing flow.

**`remove` / `--no-statusline-bridge`.** CMP-08 restores from CMP-09.

## Contracts and data

**Local `statusLine` (Claude Code settings, local scope).**

```json
{ "statusLine": { "type": "command", "command": "node \"D:/repo/.claude/hooks/context-brake-statusline.mjs\" --pipe | ( ~/.claude/statusline.sh )", "padding": 2 } }
```

**Status line stdin, the fields read.** All are optional; any other field is ignored.
- `session_id: string`
- `model.id: string`
- `context_window.context_window_size: int > 0`
- `context_window.total_input_tokens: int ≥ 0`
- `context_window.used_percentage: number | null`
- `context_window.current_usage: object | null`

**Ledger line** (`.context-brake/runtime/sessions/claude-code/<key>.jsonl`), schema `v: 1`. Older ContextBrake versions skip it as an unknown line.

```json
{"v":1,"type":"statusline","at":"2026-09-25T12:00:00.000Z","windowTokens":1000000,"inputTokens":200000,"usedPercentage":20,"model":"claude-opus-5-5"}
```

**Local state** (`.context-brake/runtime/claude-statusline.json`), `v: 1`. It is strict, and a file that does not parse is treated as absent, with a `doctor` warning.

```json
{"v":1,"installedCommand":"node \"D:/repo/.claude/hooks/context-brake-statusline.mjs\" --pipe | ( ~/.claude/statusline.sh )","previousLocal":null,"previousSource":"user","previousCommand":"~/.claude/statusline.sh","createdLocalFile":true}
```

**CLI.** The `init` flags `--statusline-bridge` and `--no-statusline-bridge` are mutually exclusive. Either one without `claude-code` among the targets exits with the existing argument error code.

**Doctor report.** It gains the optional `contextWindow` section of DEC-10, plus four warning codes. `schemaVersion` stays at 1. `schemas/doctor-report.schema.json` is regenerated by `npm run build` and checked by `schemas:check`. The configuration schema is unchanged.

## Integrations and interfaces

- **Status line bridge.**
  - Input: stdin JSON.
  - Output: stdin bytes in `--pipe` mode, and nothing otherwise.
  - Errors: logged, never shown.
  - Deadline: 1,500 ms for recording. Claude Code may cancel it earlier, which leaves at most a partial last line that the parser drops.
  - Exit code: 0.
  - Idempotency: one line per run.
- **Hooks.** No payload change. `readZone` consumes the new summary field.
- **`init`, `remove`, `doctor`.** Same commands and exit codes, plus the new flags, warnings, and report section.

## Errors, security, and recovery

- **Errors and edges.**
  - With no `session_id`, nothing is recorded.
  - Non-numeric or negative fields count as `null`.
  - `inputTokens: 0` counts as `null`.
  - If stdin exceeds 1 MiB, it is passed through in full and not recorded.
  - A ledger write failure goes to `errors.jsonl`.
  - A state file that does not parse means no restore, plus a `doctor` warning with remediation `context-brake init --statusline-bridge`.
  - A repository moved since install is repaired by the next `init` (DEC-08), and until then `doctor` reports `STATUSLINE_BRIDGE_MISSING_SCRIPT`.
- **User files and sensitive data.**
  - Only `statusLine` in `.claude/settings.local.json` is written. `.claude/settings.json` and user-scope files are only read.
  - The ledger stores the five FR-03 values plus the time. It never stores cost, paths, workspace, or output (NFR-03).
  - The previous command is stored only in the git-ignored runtime state.
- **Concurrency and idempotency.**
  - Status line and hook appends share the O_APPEND single-line writes already used by the ledger.
  - Readers drop partial lines.
  - Applying the same `init` plan twice changes nothing.
- **Rollback or reversal.** `init --no-statusline-bridge` or `remove` restores the previous local value. Reverting the release leaves `statusline` ledger lines that older versions ignore.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| 1. Research: Status line section in `harness-integrations.md`, plus the status line stdin fixture `tests/fixtures/harnesses/claude-code/statusline.json` | — | Section dated 25/09/2026; fixture follows the documented example |
| 2. Ledger line, summary, and zone merge (CMP-04 to CMP-07) | 1 | TC-01 to TC-05 pass; PRD 2.1 suites unchanged |
| 3. Bridge runtime and asset (CMP-01 to CMP-03, CMP-13 bundling) | 2 | TC-06 to TC-09 pass against the built asset |
| 4. Installer, state, and flags (CMP-08 to CMP-10, CMP-13 snapshots) | 3 | TC-10 to TC-15 pass; byte-for-byte preservation on reruns |
| 5. Doctor and report (CMP-11, CMP-12) | 4 | TC-16 to TC-18 pass; `schemas:check` green |
| 6. Documentation and capability text (CMP-14) | 5 | TC-19; README and telemetry docs updated |
| 7. Overhead and platform validation | 3, 4 | TC-20 and TC-21 green on the CI matrix |

## Test approach

- **Profile.**
  - Runtime surfaces: a new process entry point run by the harness per status line refresh (bridge); hooks run as one process per event (zone merge); CLI commands `init`, `remove`, `doctor`.
  - Toolchain: Node.js ≥ 20 (CI 20/22/24), ESM, TypeScript `NodeNext` strict (`tsconfig.json`, `tsconfig.check.json`), Vitest 3 with v8 coverage ≥ 80%.
  - Commands from `AGENTS.md`: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`, `npm run package:smoke`.
- **Test lanes.** Tests that spawn the built bridge or use process markers are added to `PROCESS_LANE_FILES` in `tests/test-lanes.ts`, which `tests/unit/test-lanes.test.ts` enforces.
- **End-to-end.** The built CLI runs `init --statusline-bridge`, `doctor --json`, and `remove` against temporary repositories (`tests/e2e/cli-runner.ts`).
- **Platforms.** Linux, macOS, and Windows in CI. Pipeline commands run under `sh` and Git Bash. PowerShell-only Windows is documented as unsupported (Risks) and is not verified.
- **Command prerequisites and exclusions.** `npm run build` runs before process-lane tests. Validations sharing `dist/` and `coverage/` run serially.
- **Manual acceptance** (owner: the user). On a Claude Code session with a 1M model and an existing status line:
  1. Run `init --statusline-bridge`.
  2. Start Claude Code and check that the status line looks the same.
  3. Check that after one tool call the block shows `tokens=…/1000000`.
  4. Run `/model` to a 200k model and check that the block shows `…/200000` after the next response.
  5. Run `remove` and check that the previous status line is back.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-03, NFR-04 | unit | `statuslineLineSchema` with valid, null, out-of-range, and 201-char `model` values; old parser on a ledger containing the line | Valid line accepted; invalid values rejected at mapping; unknown line skipped by `parseLedgerLines` | `tests/unit/statusline-line.test.ts` |
| TC-02 | FR-04, FR-06 | unit | `summarizeStatusline` over lines with window before and after a reset, and tokens before and after a reset | Window survives the reset; usage only after it; nulls do not overwrite | `tests/unit/statusline-summary.test.ts` |
| TC-03 | FR-04 | unit | `readZone` with window 1,000,000 from the status line and transcript tokens 200,000 | `usage=20%`, `tokens=200000/1000000`, `source=measured` | `tests/unit/session-zone-statusline.test.ts` |
| TC-04 | FR-05, FR-06 | unit | No transcript measurement; status line tokens after the reset, then before the reset | Measured from the status line; then estimated | same file |
| TC-05 | OBJ-03, FR-04 | unit | No status line lines; a Pi-reported window together with a status line window | PRD 2.1 results unchanged; Pi window wins | `tests/unit/usage-resolver.test.ts`, `session-zone-statusline.test.ts` |
| TC-06 | FR-02, OBJ-02 | integration | Built bridge in `--pipe` mode feeding a command that prints multi-line ANSI output and exits 3 | stdout byte-for-byte equal to the command alone; exit 3; one ledger line | `tests/integration/statusline-bridge.test.ts` |
| TC-07 | FR-02 | integration | Built bridge without `--pipe` | Empty stdout; exit 0; ledger line written | same file |
| TC-08 | NFR-02 | integration | Invalid JSON, missing `session_id`, unwritable ledger, stdin above 1 MiB | Output unchanged; exit 0; error logged only for the unwritable ledger | same file |
| TC-09 | NFR-03 | integration | Payload with cost, workspace, and output fields | Ledger line holds only the five values and `at` | same file |
| TC-10 | FR-01, FR-02 | unit | Planner with previous commands in the local, project, and user scopes, and with none | Pipeline wraps the highest-precedence command; `padding` and `refreshInterval` copied; no-previous command has no `--pipe` | `tests/unit/statusline-planner.test.ts` |
| TC-11 | FR-01 | unit | Root containing `"`, `$`, backtick, spaces, or accents; Windows root | Conflict for the first three; quoted forward-slash path for the rest | same file |
| TC-12 | FR-01, FR-08 | integration | `init --statusline-bridge` twice, then `init` without the flag, then `--no-statusline-bridge`, over a local file with other keys and comments | Second run and flagless run change nothing; removal restores the file byte for byte | `tests/integration/statusline-install.test.ts` |
| TC-13 | FR-08 | integration | Bridge created the local file; `remove` | File deleted; state file deleted | same file |
| TC-14 | FR-01, DEC-09 | integration | Local or project settings that do not parse; user settings that do not parse | Conflict and no write for local/project; install proceeds with a finding for user | same file |
| TC-15 | FR-01 | unit | Both flags; a flag without `claude-code` targeted; `--dry-run` | Argument errors; dry-run lists `settings.local.json` and the state file without writing | `tests/unit/init-arguments.test.ts` |
| TC-16 | FR-07 | unit | State present with a changed local command, a missing script, a changed previous command, and a tracked local file | Four warnings with remediation | `tests/unit/statusline-diagnostics.test.ts` |
| TC-17 | FR-07 | unit | Report and text with the bridge installed and absent | `contextWindow` section and one text line; absent section when Claude Code is not targeted | `tests/unit/doctor-service.test.ts`, `cli-output-text.test.ts` |
| TC-18 | FR-07, NFR-04 | integration | `doctor --json` validated against the regenerated schema | Valid; `schemaVersion: 1` | `tests/integration/doctor-state-schema.test.ts` |
| TC-19 | FR-09 | unit | README and docs mention the flag, the local scope, the non-interactive limit, and the ledger line | Assertions on the documented strings | `tests/unit/readme-config-example.test.ts` |
| TC-20 | NFR-01, OBJ-04 | integration | Bridge overhead (DEC-13) and hook overhead with 200 `statusline` lines in the ledger | p95 within 50 ms and 100 ms | `tests/integration/runtime-overhead.test.ts` |
| TC-21 | NFR-06 | end-to-end | `init --statusline-bridge`, `doctor --json`, and `remove` on a repository path with spaces and accents | Commands succeed; local file restored | `tests/e2e/e2e-statusline-bridge.test.ts` |
| TC-22 | FR-06, OBJ-01, DEC-06 | unit | Recorded status line window 1,000,000, a reset, a post-reset status line with null tokens, and a stale transcript reading; an in-process reading with `tokens: null` and `contextWindow: 200000` | `source=estimated` with `windowTokens` 1,000,000 and zone computed over it; the in-process estimate uses 200,000 | `tests/unit/session-zone-statusline.test.ts`, `tests/unit/usage-resolver.test.ts` |

## Quality profile

A blocking hit prevents task completion and rejects the review. A reservation becomes an optional improvement and counts toward escalation. A hit covered by `DEC-NN` is expected, not a finding.

The commands run from Git Bash with `RG=(rg -n --type ts -g '!node_modules/**' -g '!dist/**' -g '!coverage/**' -g '!**/*.d.ts')`.

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `"${RG[@]}" ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | — |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `"${RG[@]}" '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-03 | empty `catch` or `.catch(() => {})` | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | — |
| QA-04 | `exec`, `execSync`, or `shell: true` | blocking | `"${RG[@]}" '\bexecSync\(\|\bexec\(\|shell:\s*true' "${files[@]}"` | — (DEC-02 keeps the shell in the harness) |
| QA-05 | `core` importing `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-06 | stray stdout in the bridge or hook path | blocking | `"${RG[@]}" 'console\.log\|process\.stdout\.write' "${hook_files[@]}"` | The pass-through writer in `statusline-bridge.ts` is the response writer, excluded like `process-hook-host.ts:29` |
| QA-07 | `throw new Error(` | reservation | `"${RG[@]}" 'throw new Error\(' "${files[@]}"` | — |
| QA-08 | clock or randomness in `core` | reservation | `"${RG[@]}" 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' "${core_files[@]}"` | — |
| QA-09 | 4+ parameters in one declaration | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"` | — |
| QA-10 | file above 100 lines | reservation | `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | — |

- Verification scope:
  - `files`: every TypeScript file in the task diff.
  - `core_files`: the subset under `src/core/`.
  - `hook_files`: `statusline-bridge.ts`, `statusline-payload.ts`, `assets/runtime/claude-code-statusline.ts`, `session-zone.ts`, `statusline-summary.ts`, and `session-counters.ts`.
  - `in_process_files`: empty. No in-process adapter changes, so the synchronous I/O rule is not selected.
- Escalation trigger: 8+ reservations, a touched file above 200 lines, or duplication in 3+ places.

### Terrain baseline

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/infrastructure/harnesses/claude-code/planner.ts` | 98 | 5 | ≤ 3 | 0 | — | absorbed in DEC-10/CMP-08: statusline planning lives in `statusline-planner.ts`, and `planner.ts` gains only the delegation |
| `src/infrastructure/harnesses/claude-code/adapter.ts` | 84 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/capabilities.ts` | 10 | 1 | ≤ 3 | 0 | — | recorded |
| `src/core/contracts/session-ledger.ts` | 79 | 31 | ≤ 3 | 0 | — | absorbed in DEC-04: new export in `statusline-line.ts` |
| `src/core/services/session-counters.ts` | 41 | 3 | ≤ 3 | 0 | — | absorbed in DEC-05: logic in `statusline-summary.ts` |
| `src/core/services/session-zone.ts` | 30 | 6 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/runtime/node-session-ledger.ts` | 65 | 1 | ≤ 3 | 0 | — | recorded |
| `src/cli/init-arguments.ts` | 43 | 2 | ≤ 3 | 0 | — | recorded |
| `src/cli/commands/init.ts` | 100 | 4 | ≤ 3 | 0 | — | recorded; the flag reaches the context through `detection-collector.ts`, so `init.ts` must not grow (QA-10) |
| `src/core/contracts/adapter.ts` | 55 | 5 | ≤ 3 | 0 | — | recorded |
| `src/cli/snapshot-helper.ts` | 34 | 1 | ≤ 3 | 0 | — | recorded |
| `src/core/contracts/diagnostics.ts` | 63 | 16 | ≤ 3 | 0 | — | absorbed in DEC-10: new export in `context-window-report.ts` |
| `src/core/services/report-service.ts` | 93 | 7 | ≤ 3 | 0 | — | recorded; one optional field |
| `src/cli/output/text.ts` | 93 | 7 | ≤ 3 | 0 | — | recorded; one line |
| `src/core/services/doctor-service.ts` | 100 | 2 | ≤ 3 | 0 | — | recorded; the checks live in the Claude `diagnose`, so this file must not grow (QA-10) |
| `src/core/services/installation-service.ts` | 97 | 3 | ≤ 3 | 0 | — | recorded; no change expected |
| `src/cli/detection-collector.ts` | 34 | 2 | ≤ 3 | 0 | — | recorded |
| `scripts/asset-bundler.ts` | 71 | 7 | ≤ 3 | 0 | `QA-07: scripts/asset-bundler.ts:70` | recorded |
| `scripts/check-package.ts` | 84 | 1 | ≤ 3 | 0 | `QA-07: scripts/check-package.ts:40, 41, 42, 43, 49, 58, 62, 74` | recorded |
| `tests/helpers/built-hook.ts` | 47 | 5 | ≤ 3 | 0 | — | recorded |

- Preparatory refactoring: not recommended. The files at the size limit (`planner.ts`, `init.ts`, `doctor-service.ts`) and the export-saturated contracts (`session-ledger.ts`, `diagnostics.ts`) are absorbed by placing new logic in new files (DEC-04, DEC-05, DEC-10, CMP-08). No public contract changes, and each absorption fits its task.

## Observability and rollout

- **Signals.**
  - `errors.jsonl` entries with event `StatusLine`.
  - `doctor` shows the `contextWindow` line and the four warnings.
  - The telemetry block shows the real window.
- **Migration and compatibility.**
  - The feature is opt-in, so nothing changes without the flag.
  - Ledger v1 lines are additive.
  - Doctor `schemaVersion` stays at 1, and the new section is optional.
  - The config schema is unchanged.
- **Rollout and rollback.** The release gates are `release:check`, with the manual acceptance script above before publishing. Rollback is `--no-statusline-bridge` per developer.

## Risks and open items

- **PowerShell-only Windows.** Claude Code falls back to PowerShell when Git Bash is absent, and the `( … )` subshell in DEC-02 does not group a native command there. Probability is low, because Claude Code on native Windows normally runs with Git Bash. The impact is a blank status line. Mitigation: the README documents the requirement, and TC-11 covers only POSIX shells.
- **`session_id` divergence.** If the status line's `session_id` differs from the hooks', the window never reaches the zone. Probability is low. The impact is a silent fallback to `contextWindowCeiling`. Mitigation: the manual acceptance step 3, and `doctor`'s `lastWindowTokens` stays `null`.
- **Lag after `/model`.** The window updates after the next assistant message, as the PRD accepts.
- **Cancelled refreshes.** Claude Code cancels an in-flight bridge on a new update. At most one partial ledger line is dropped by the parser.
- **Open item.** None. The scope decision was resolved by the user on 25/09/2026.

## Relevant files

- **Modify:**
  - `src/core/contracts/session-ledger.ts`
  - `src/core/services/session-counters.ts`
  - `src/core/services/session-zone.ts`
  - `src/infrastructure/runtime/node-session-ledger.ts`
  - `src/infrastructure/harnesses/claude-code/planner.ts`
  - `src/infrastructure/harnesses/claude-code/adapter.ts`
  - `src/infrastructure/harnesses/claude-code/capabilities.ts`
  - `src/cli/init-arguments.ts`
  - `src/cli/detection-collector.ts`
  - `src/core/contracts/adapter.ts`
  - `src/cli/snapshot-helper.ts`
  - `src/core/contracts/diagnostics.ts`
  - `src/core/services/report-service.ts`
  - `src/cli/output/text.ts`
  - `scripts/asset-bundler.ts`
  - `scripts/check-package.ts`
  - `tests/helpers/built-hook.ts`
  - `tests/test-lanes.ts`
  - `tests/integration/runtime-overhead.test.ts`
  - `schemas/doctor-report.schema.json` (generated)
  - `docs/research/harness-integrations.md`
  - `README.md`
  - `docs/telemetry-block.md`
- **Create:**
  - `assets/runtime/claude-code-statusline.ts`
  - `src/infrastructure/harnesses/claude-code/statusline-bridge.ts`
  - `src/infrastructure/harnesses/claude-code/statusline-payload.ts`
  - `src/infrastructure/harnesses/claude-code/statusline-planner.ts`
  - `src/infrastructure/harnesses/claude-code/statusline-state.ts`
  - `src/infrastructure/harnesses/claude-code/statusline-diagnostics.ts`
  - `src/core/contracts/statusline-line.ts`
  - `src/core/contracts/context-window-report.ts`
  - `src/core/services/statusline-summary.ts`
  - `tests/fixtures/harnesses/claude-code/statusline.json`
  - the test files named in the table above
