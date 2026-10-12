# TechSpec — Mod as the context source for Claude Code

## Sources and traceability

- PRD: `tasks/prd-18-mod-como-fonte-do-contexto/prd.md` (approved at HIL 1, D-07).
- Applicable instructions, rules, and skills: `AGENTS.md`; `.agents/rules/` `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`, `file-changes.md`, `cli-output.md`; skills `ts-tests`, `commit`.
- Research: `docs/research/harness-integrations.md` (Claude Code: status line, Mods, user config directory); the 2.1.296 mod types for `$.session.usage()`, `SessionContextUsage`, `$.fs`, `$.process` (read from the plugin-authoring skill's `claude-code.d.ts`, since it ships with the binary).
- Evidence in existing code: `src/core/services/session-zone.ts:mergeMeasurements` (transcript tokens before bridge tokens; window from `measured` or the bridge); `src/infrastructure/harnesses/claude-code/runtime.ts:mapClaudeInput` (transcript measurement, `contextWindow: null`); `statusline-planner.ts:planStatuslineEntry`; `auto-restart-planner.ts:planAutoRestart` (`wanted = context.autoRestart === true`); `mod/hooks.ts`, `mod/restart-flow.ts:handleTurnComplete`, `mod/mod-config.ts:readModConfig` (no `autoRestart` block means no restart); `mod/host.ts:ModHost`; `statusline-context-window.ts:readClaudeContextWindow`; `src/core/contracts/context-window-report.ts`.

## Solution summary

The mod publishes, per session, a small JSON file with the context reading that `$.session.usage()` returns. The hook process reads that file in `mapClaudeInput` and hands the core the same `MeasuredUsage` it already accepts, now with a real window size. The core, the ledger, and the telemetry block do not change, and the bridge keeps writing `statusline` ledger lines that the core still uses when the mod has nothing.

`init` probes the Claude Code version once. At or above the minimum version, a plain `init` (and `--no-statusline-bridge`) installs the mod without any restart configuration and leaves `statusLine` alone; an installed bridge is migrated away with the existing restore code. Below it, or with an undetectable version, or with `--statusline-bridge`, everything works as today. `doctor` reports which source feeds the reading.

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-01, NFR-01 | The mod writes one file per session, `.context-brake/runtime/context-readings/claude-code/<sessionId>.json`, replaced on each publish with `$.fs.write`. The file name is the session id only when it matches `^[A-Za-z0-9_-]{1,128}$` (a UUID does); the mod and the reader apply the same check, because the hooks' `requireIdentifier` only rejects empty ids and would let `..` or a separator through. | `ModHost.fs` has `write` (replace) and no append, so appending ledger lines would mean read-modify-write against hook processes that append to the same ledger (`node-session-ledger.ts:append`). A single writer per file removes write-write races. The ledger hash name (`sessionLedgerHash`) needs `node:crypto`, which the bundle forbids. | Append to the ledger through `$.process.run` (starts a process per publish, couples the mod to the CLI path). Reuse the mod log file (mixes restart and reading concerns). |
| DEC-02 | FR-01, NFR-01, NFR-02 | The file content is a strict schema `contextReadingSchema` in `src/core/contracts/context-reading.ts`: `v: 1`, `at` (ISO), `windowTokens` (positive integer or null), `inputTokens` (non-negative integer or null), `usedPercentage` (0 to 100 or null). A reader that finds the file absent, unparsable, or invalid treats it as no reading. | A torn or partial write cannot parse as a valid object, so a reader never merges two readings; T01 saw no partial content in 351,709 reads concurrent with 400 rewrites (Windows only), and the reader still validates. Only counts and a timestamp are stored (NFR-02). | A checksum field (adds nothing over strict parsing of a single JSON object). |
| DEC-03 | FR-02, D-06 | `mapClaudeInput` picks the fresher of the transcript measurement and the mod reading by `at` (the mod wins a tie), takes `contextWindow` from the mod reading when present, and passes the result as `measured`. `mergeMeasurements` in the core is not changed, so the bridge still supplies tokens and window only when `measured` lacks them. | Today the transcript gives tokens and never a window; the bridge's real contribution is the window (`session-zone.ts:30`). Keeping the core untouched keeps the telemetry text and every zone test stable. | Change the core merge to a three-way freshest pick (breaks the existing transcript-over-bridge precedence and its tests for no user-visible gain). See PRD-A1. |
| DEC-04 | FR-01, FR-09 | The mod publishes on `session.start`, `turn.start`, `tool.call`, and `turn.complete`, and only when `(tokens, window)` differs from the last value it published in the module. A failure, or a missing window, publishes nothing and reports `ERROR_INTERNAL` through `reportSafely`, once until another record follows it (the restart log keeps a bounded number of records). Before its first write the mod makes sure `.context-brake/runtime/.gitignore` exists (CR-02, `mod-reading-git-status.test.ts`). | T01 (2.1.296): at `tool.call` the reading is the one of the response that asked for the tool, and the mod's handler ran 0.55 to 2.7 s before the settings `PostToolUse` hook of that call; `turn.complete` ran after the `Stop` hook, so it cannot feed that hook but covers the next turn; `usage()` returns only `{ window }` before the first response and after `/clear`, and no `session.start` fires after `/clear`, so `turn.start` publishes the window early. Publishing cost 1 to 3 ms. Every publish runs inside `try/catch`, and every handler returns `next(e)` (`claude plugin validate` warns about an unguarded `tool.call` hook). The publisher is a top-level function that keeps no state in the module: `claude plugin validate` refuses `$` passed to a function that is not declared at the top of the file, so it skips an unchanged pair by comparing with the file already written. | Poll with `$.clock` (extra wakeups, no gain); publish only at `turn.complete` (the hook would read one turn behind). |
| DEC-05 | FR-03, FR-05 | `decideContextSource` in a new `context-source.ts` (and `detectContextSource`, which probes `claude --version` with its own `NodeProcessRunner` when the context has no runner, because the real CLI injects none and `doctor` showed `version: null`) returns `mod` when the request is `default` or `remove`, the probed version is valid, and it is at or above `CONTEXT_MOD_MINIMUM_CLAUDE_VERSION`; otherwise `bridge`. `install` always returns `bridge`. The constant is `2.1.287` (`MODS_MINIMUM_CLAUDE_VERSION`): T01 found `usage()` working on 2.1.287, 2.1.289, and 2.1.296, and 2.1.287 is also the first version with mods on by default. | The adapter already probes the version for auto restart (`adapter.ts:probeVersion`); an undetectable version falls to the bridge, as FR-03 requires. | Detect mods by a feature probe inside Claude Code (not possible from `init`). |
| DEC-06 | FR-04, D-03, D-04 | The mod install gate becomes `autoRestart || source === 'mod'`. `planAutoRestart` takes an options object (`deleteFiles`, `forModFirst`) instead of a fourth parameter. Restart behavior stays gated by the `autoRestart` config block that `readModConfig` already requires. | `wanted` today equals `context.autoRestart === true` (`auto-restart-planner.ts:80`); the mod does nothing about restarts without the config block (`mod-config.ts:readModConfig`). | A second mod only for readings (two entries in `enabledPlugins`, more files to own and remove). |
| DEC-07 | FR-04, FR-06, D-05 | In mod-first mode the statusline planner returns no `statusLine` change and no bridge asset; when a bridge state exists, it returns `planStatuslineRestore` plus the deletion of the bridge script, and leaves the opt-out marker alone. The logic lives in a new `statusline-migration.ts`. | `planStatuslineRemove` already restores byte for byte (`statusline-planner.ts:32`); the migration reuses it except for the marker, so a later fall back to the bridge keeps the user's earlier choice. | Call `planStatuslineRemove` as it is (it clears the opt-out marker). |
| DEC-08 | FR-07, FR-08 | `ContextWindowReport` gains `mod: 'absent' \| 'installed' \| 'reporting'` and `source` gains `'mod'`. `readClaudeContextWindow` (with the new `context-readings-scan.ts`) reads the readings directory and the mod files, and `doctor-report-extras.ts` in the core emits `CONTEXT_MOD_READY` or `CONTEXT_MOD_SILENT` from the report (no separate diagnostics file). `STATUSLINE_BRIDGE_ABSENT` fires only when `bridge` is absent and `mod` is absent. `remove` needs no new code: `.context-brake/runtime/` and the mod files are already removed. | `doctor-report.schema.json` is generated from the zod schemas (`npm run schemas:generate`); `readClaudeContextWindow` already scans the runtime directory. | Reuse `bridge` states for the mod (a wrong name for a different mechanism). |
| DEC-09 | US-01, FR-03 | The interactive setup skips the bridge question when the context source is `mod`, and its summary reads `Context source: mod`. `AssistantContext` gains `contextSource`, computed with `decideContextSource`. | `questions-misc.ts:askBridge` otherwise maps a "yes" to `--statusline-bridge`, which forces the bridge against the new default. | Keep asking (a user would force the bridge by habit). |
| DEC-10 | NFR-03 | The mod stays under the bundle rules: it imports `contextReadingSchema` (zod) and no Node module; the file path is built as a string (as `mod-log.ts` does). The mod version follows the package version (`mod-info.ts`). | `tests/integration/claude-mod-bundle.test.ts` forbids `node:` imports and sync I/O. | Duplicate the schema in the mod (drift risk). |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/core/contracts/context-reading.ts` | New | Strict reading schema and the runtime file path pieces (directory name, validated session id). | — |
| CMP-02 | `mod/context-reading.ts`, `mod/hooks.ts`, `mod/register.ts`, `mod/host.ts` | New and modified | Call `$.session.usage()`, skip unchanged values, write the file, report failures; `ModHost` gains `session.usage`. | CMP-01 |
| CMP-03 | `claude-code/mod-reading.ts`, `claude-code/runtime.ts` | New and modified | Read and validate the file; `freshestMeasured(transcript, reading)` used by `mapClaudeInput`. | CMP-01 |
| CMP-04 | `claude-code/context-source.ts`, `adapter.ts`, `planner.ts` | New and modified | Version-based decision and its use in `planInstall`; passes the source to the two planners. | DEC-05 |
| CMP-05 | `auto-restart-planner.ts` | Modified | Mod install gate and options object (DEC-06). | CMP-04 |
| CMP-06 | `statusline-planner.ts`, `statusline-migration.ts` | Modified and new | No `statusLine` change in mod-first, migration plan (DEC-07). | CMP-04 |
| CMP-07 | `statusline-context-window.ts`, `context-readings-scan.ts`, `context-window-report.ts`, `doctor-report-extras.ts`, `capabilities.ts` | Modified and new | Doctor source and findings, capability text (DEC-08). | CMP-01, CMP-03 |
| CMP-08 | `src/cli/assistant/*` | Modified | Skip the bridge question in mod-first (DEC-09). | CMP-04 |

Flow: at `tool.call` the mod reads `usage()`, and if the pair changed it writes the file; the `PostToolUse` hook process reads the transcript and the file, picks the fresher, and returns `measured` to the unchanged core; the core merges the bridge's ledger lines only where `measured` is empty.

## Contracts and data

- Runtime file: `.context-brake/runtime/context-readings/claude-code/<sessionId>.json`, `{"v":1,"at":"…","windowTokens":1000000,"inputTokens":54452,"usedPercentage":5}`; nullable fields are `null`, never `0`. Session ids that fail the identifier check are not written.
- `doctor --json`: `contextWindow.source` adds `mod`; `contextWindow.mod` is new and required with values `absent`, `installed`, `reporting`. The schema file is regenerated; `npm run schemas:check` guards it.
- Findings: `CONTEXT_MOD_READY` (ok) and `CONTEXT_MOD_SILENT` (warning, with the causes from `NOT_LOADED_CAUSES` in `auto-restart-diagnostics.ts`).
- `init` plan summaries: `Install the mod as the context source`, `Restore the status line the bridge wrapped`.

## Integrations and interfaces

- Mod hooks `session.start`, `tool.call`, `turn.complete` (existing events); no new event. Each publish is awaited inside a `try/catch` that cannot block `next(e)`.
- `PostToolUse` hook: one more `readFile` of a file under 200 bytes, inside the existing hook deadline; no new process.
- `init`, `doctor`, `remove`: no new flag.

## Errors, security, and recovery

- Errors and edges: a null `usage().context.tokens` (before the first response, after `/compact`) is written as null; the reader then falls back to the transcript and the bridge. An invalid file is ignored. `/clear` changes the session id, so the old file is never read for the new session; `remove` deletes the whole runtime directory.
- User files and sensitive data: mod-first `init` touches no `statusLine` key; migration restores the earlier `statusLine` with the existing restore code and `file-changes.md` rules. The file holds counts and a timestamp only.
- Concurrency and idempotency: one writer per file, readers validate, the mod skips unchanged values; a second `init` plans no change.
- Rollback or reversal: `init --statusline-bridge` returns to the bridge (mod-first's mod stays installed and harmless); `remove` returns the repository to its pre-install bytes.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| T01 Probe on a real Claude Code session; fix the minimum version, the order of the mod and settings hooks, freshness, session id equality (also after `/clear`), and `$.fs.write` behavior; record it in `docs/research/harness-integrations.md`. (Done: see the "Leitura de contexto pelo mod" bullet.) | — | Research section updated; `CONTEXT_MOD_MINIMUM_CLAUDE_VERSION` decided (`2.1.287`); TechSpec assumptions confirmed or amended. |
| T02 Reading path: CMP-01, CMP-02, CMP-03. | T01 | TC-01 to TC-04, TC-11, TC-12, TC-13 pass. |
| T03 Installation and diagnostics: CMP-04 to CMP-08, docs, README, regenerated schema. | T02 | TC-05 to TC-10, TC-14 to TC-16 pass; `npm run schemas:check` passes. |

## Test approach

- Profile: TypeScript strict on Node 20+ with Vitest; the mod runs inside the Claude Code process (bundle rules, NFR-03), the hook runs one process per event, the CLI runs in `src/cli/`. Commands from `AGENTS.md`: `npm run lint`, `npm run typecheck`, `npm run coverage`, `npm run schemas:check`, `npm run package:smoke`, `npm run test:budget`.
- End-to-end: the existing built-CLI smoke set stays; add no new e2e file. The init, migration, doctor, and remove scenarios run in process through `tests/helpers/statusline-world.ts` (extended with a fake Claude Code version through the injected runner) and `fake-process-runner.ts`.
- Platforms: Linux, macOS, Windows (PowerShell and Git Bash) through the existing CI matrix; the new paths use `node:path` and forward slashes inside the mod, as `mod-log.ts` does. Symlinked settings files reuse the existing fixture.
- Command prerequisites and exclusions: T01 needs the installed `claude` (2.1.296 on this machine) and a throwaway mod folder outside the repository; its captures stay out of the repository and only the findings go into the research file. Anything the probe cannot show stays recorded as a gap.
- Manual acceptance: with a real session on this machine (`CLAUDE_CONFIG_DIR` set), run `context-brake init` in a scratch repository, confirm `statusLine` is untouched, work until a few tool calls pass, and read `doctor` (source `mod`, window `1000000`). Owner: the user, once, after review.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-01, NFR-02 | unit | Fake host publishes on tool call, again only after a change; null values stay null | One write with the strict fields, none for an unchanged pair | `tests/integration/claude-mod-reading.test.ts` |
| TC-02 | FR-09 | unit | `usage()` rejects, or returns no window | No throw, no write, `ERROR_INTERNAL` reported | `tests/integration/claude-mod-reading.test.ts` |
| TC-03 | FR-02 | unit | Transcript older, newer, equal, absent; reading absent | Fresher wins, the mod wins a tie, window from the reading, `null` otherwise | `tests/unit/freshest-measured.test.ts` |
| TC-04 | FR-02, D-06 | integration | Hook run with a bridge ledger line and no reading file | `source=measured`, window from the bridge, unchanged block text | `tests/integration/claude-hook-mod-reading.test.ts` |
| TC-05 | FR-03, FR-05 | unit | Versions below, at, above the minimum; undetectable; each bridge request | `mod` or `bridge` per DEC-05 | `tests/unit/context-source.test.ts` |
| TC-06 | FR-04, D-04 | integration | Plain `init` at a compatible version | No `statusLine` key, no bridge file or state, mod files and keys present, no `autoRestart` block; a second run plans nothing | `tests/integration/init-mod-first.test.ts` |
| TC-07 | FR-05 | integration | `--statusline-bridge` and `--no-statusline-bridge` at a compatible version | Bridge installed, then not installed with the opt-out recorded | `tests/integration/init-mod-first.test.ts` |
| TC-08 | FR-06, OBJ-03 | integration | Bridge over a user status line, `init` and `init --dry-run` | Bytes of `settings.local.json` restored (or the file removed when the install created it); the dry-run plan equals the run | `tests/integration/init-mod-migration.test.ts` |
| TC-09 | FR-07 | integration | Doctor with a reading, with mod files and no reading, bridge only, nothing | Source `mod`, `CONTEXT_MOD_SILENT`, today's output, today's output | `tests/integration/doctor-context-source.test.ts`, `npm run schemas:check` |
| TC-10 | FR-08 | integration | `init` then `remove` in mod-first | Fixture bytes equal the pre-install bytes | `tests/integration/init-mod-first.test.ts` |
| TC-11 | NFR-01 | unit | Reader on a truncated, empty, wrong-version, and valid file | Invalid ones read as no reading | `tests/integration/claude-hook-mod-reading.test.ts` |
| TC-12 | NFR-02 | unit | Schema with an extra field | Rejected (strict) | `tests/unit/context-reading-schema.test.ts` |
| TC-13 | NFR-03 | integration | Built mod bundle | No `node:` import, no sync I/O | `tests/integration/claude-mod-bundle.test.ts` |
| TC-14 | NFR-04, NFR-05 | integration | Hook with an unreadable reading file | Falls back to the transcript, no exception; Windows run in CI | `tests/integration/claude-hook-mod-reading.test.ts` |
| TC-15 | DEC-09 | unit | Assistant at a compatible version | No bridge question; summary line `Context source: mod` | `tests/unit/assistant-questions.test.ts` (existing file, extended) |
| TC-16 | FR-03 | manual | T01 probe findings | Research file updated; constant decided | `docs/research/harness-integrations.md` |

## Quality profile

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | No `any`, `@ts-ignore`, `eslint-disable` | blocking | `"${RG[@]}" ':\s*any\b|\bas any\b|<any>\|@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-02 | No empty `catch` | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | `mod/hooks.ts` catches and reports through `reportSafely`; the existing pattern stays |
| QA-03 | `core` never imports `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-04 | No synchronous file or process API in the mod and the hook | blocking | `"${RG[@]}" '\b(readFileSync\|writeFileSync\|appendFileSync\|existsSync\|spawnSync)\b' "${in_process_files[@]}"` | — |
| QA-05 | No `console.log` or `process.stdout.write` on the hook path | blocking | `"${RG[@]}" 'console\.log\|process\.stdout\.write' "${hook_files[@]}"` | — |
| QA-06 | File size above 100 lines | reservation | `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | — |
| QA-07 | Four or more parameters | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"` | — |

- Verification scope: every TypeScript file in the task diff. `in_process_files` is the mod folder; `hook_files` is `claude-code/runtime.ts` and `mod-reading.ts`; `core_files` is `src/core/`.
- Escalation trigger: 8+ reservations, a touched file above 200 lines, or duplication in 3+ places.

### Terrain baseline

Measured on 11/10/2026 with the commands of the quality reference. No file has a blocking hit.

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `claude-code/adapter.ts` | 91 | 1 | 3 | 0 | none | recorded; growth capped at 9 lines, new logic goes to new files (DEC-04, DEC-05) |
| `claude-code/planner.ts` | 76 | 5 | 3 | 0 | none | recorded |
| `claude-code/statusline-planner.ts` | 88 | 2 | 3 | 0 | none | recorded; the migration goes to `statusline-migration.ts` (DEC-07) |
| `claude-code/auto-restart-planner.ts` | 89 | 2 | 3 | 0 | none | recorded; the options object replaces a fourth parameter (DEC-06) |
| `claude-code/statusline-context-window.ts` | 59 | 3 | 2 | 0 | none | recorded |
| `claude-code/runtime.ts` | 86 | 6 | 3 | 3 | none | recorded; selection goes to `mod-reading.ts` (DEC-03) |
| `claude-code/mod/hooks.ts` | 44 | 5 | 2 | 0 | none | recorded |
| `claude-code/mod/register.ts` | 25 | 1 | 1 | 0 | none | recorded |
| `claude-code/mod/host.ts` | 36 | 6 | 1 | 0 | none | recorded |
| `claude-code/capabilities.ts`, `mod/mod-info.ts` | 8, 6 | 1, 4 | 0 | 0 | none | recorded |
| `core/contracts/context-window-report.ts` | 12 | 4 | 0 | 0 | none | recorded |
| `core/services/doctor-report-extras.ts` | 33 | 2 | 2 | 0 | none | recorded |
| `cli/assistant/questions-misc.ts` | 27 | 2 | 3 | 0 | none | recorded |

- Preparatory refactoring: not recommended. No target file crosses a structural threshold, so structural debt and contact do not coincide; the three files near 90 lines get their new logic in new files.

## Observability and rollout

- Signals: `ERROR_INTERNAL` in the mod log, the two doctor findings, `doctor --json` `contextWindow.source` and `contextWindow.mod`.
- Migration and compatibility: an installed bridge migrates at the next `init` (D-05); a reader that finds no reading falls back to the ledger and the transcript, so a mod that is off costs accuracy and nothing else. The package version bump that ships this feature also bumps `MOD_VERSION`, which makes `doctor` flag sessions still running the old mod.
- Release checklist (codereview_01/CR-06): bump the package version and `MOD_VERSION` together in the release commit, so `doctor` can flag a session still running a previous mod build.
- Rollout and rollback: ship in the next release; users who prefer the bridge pass `--statusline-bridge` (rollback of one user), and the release can restore the previous default by flipping `decideContextSource`.

## Risks and open items

- Risk (mitigated by T01): the mod writes after the settings hook reads. T01 saw the mod first in every `tool.call`; on a slower machine the transcript covers one call of lag.
- Risk: `$.fs.write` is not atomic on macOS or Linux. Probability low; impact: an ignored reading. Mitigation: DEC-02 validation; those platforms stay unverified.
- Risk (closed by T01): `$.session.id()` differs from the hooks' `session_id`. It matched in every run, also after `/clear`; `doctor` still reports `CONTEXT_MOD_SILENT` if a future version breaks it.
- Risk (found in the end-to-end run): Claude Code keeps one marketplace named `context-brake-local` per user, so in a second repository the mod of the first repository loads (and may be older). Probability high for users with several repositories; impact: `CONTEXT_MOD_SILENT` until the loaded copy is updated. Mitigation here: the finding names the cause. A per-project marketplace name changes the prd-11 install and needs its own decision.
- Risk: `usage().context.tokens` after a response was observed only on 2.1.296 (2.1.287 and 2.1.289 ran without login). Mitigation: the reader and the merge accept a reading without tokens (window only).
- Risk: the usage file sits in a directory without the runtime `.gitignore` the ledger writer creates. Probability medium; impact: a stray untracked path. Mitigation: the project `.gitignore` block already covers `.context-brake/runtime/` (prd-17); T03 adds a test that `git status` stays clean after a publish.
- Resolved PRD-A1 (D-09): FR-02 now reads "fresher of the mod's and the transcript's reading, window from the mod, then the bridge, then the estimate", which matches DEC-03.
- Resolved PRD-A2 (D-09): NFR-01 now reads "a reader never merges two readings; an invalid file counts as no reading", which matches DEC-02.
- Closed by T01: the minimum version constant is `2.1.287`.

## Relevant files

- Modify: `src/infrastructure/harnesses/claude-code/adapter.ts`, `planner.ts`, `statusline-planner.ts`, `auto-restart-planner.ts`, `statusline-context-window.ts`, `runtime.ts`, `capabilities.ts`, `mod/hooks.ts`, `mod/register.ts`, `mod/host.ts`, `mod/mod-info.ts`; `src/core/contracts/context-window-report.ts`; `src/core/services/doctor-report-extras.ts`; `src/cli/assistant/assistant-context.ts`, `questions-misc.ts`, `summary.ts`, `types.ts`; `schemas/doctor-report.schema.json` (generated); `README.md`; `docs/research/harness-integrations.md`.
- Create: `src/core/contracts/context-reading.ts`; `src/infrastructure/harnesses/claude-code/context-source.ts`, `mod-reading.ts`, `statusline-migration.ts`, `context-readings-scan.ts`, `project-root.ts`, `mod/context-reading.ts`; the test files listed under Test approach.
