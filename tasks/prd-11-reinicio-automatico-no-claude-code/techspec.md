# TechSpec — Automatic restart in interactive Claude Code

## Sources and traceability

- PRD: `tasks/prd-11-reinicio-automatico-no-claude-code/prd.md` (approved, `DEC-HIL-01`, `DEC-PD-01`, `DEC-PD-02`)
- Instructions and rules: `AGENTS.md`; `.agents/rules/{code-standards,javascript-typescript,node,tests,harness-adapters,file-changes,cli-output}.md`; skills `sdd-create-techspec`, `sdd-snapshot`.
- Research: `docs/research/harness-integrations.md#Claude Code` (restart: "no documented hook opens a new session", to be replaced, FR-11). Vendor docs checked 2026-10-04 at Claude Code v2.1.289: `code.claude.com/docs/en/plugins/mods/{overview,reference,create,events}` and `/plugins/host-marketplace`.
- Evidence in existing code: `src/core/services/reset-notice.ts:7` (`endsWithResetSignal`), `src/infrastructure/harnesses/claude-code/planner.ts:55-99` (install/remove plan), `statusline-planner.ts:21-37` (opt-in file plan pattern), `src/core/services/run-context.ts:10` (`CONTEXT_BRAKE_RUN_ID`), `src/core/contracts/configuration.ts:77` (config schema), `src/cli/init-config-updates.ts:22`, `scripts/asset-bundler.ts:8` (runtime asset entries), `schemas/state-checkpoint.schema.json`.

## Solution summary

The feature is a Claude Code mod: a plugin directory that `init --auto-restart` writes under `.context-brake/claude-mod/` and registers for the developer in `.claude/settings.local.json`, the same per-developer file the status line bridge uses. The mod is one bundled ES module built from TypeScript like the other runtime assets. It runs inside the Claude Code process and has three jobs: at `turn.complete`, decide with a pure core policy whether the final answer ends with `[REQUEST_SESSION_RESET]` and the restart is safe; if yes, queue `$.command.run({ command: 'clear' })` after the hook returns; when that clear resolves, submit one short seed prompt.

The decision logic (`restart policy`, notice texts, seed text, configuration shape) lives in `src/core/` with no `$` access and is unit-tested with port fakes. The Claude-specific glue (event wiring, `$.fs`, `$.store`, `$.command`, `$.prompt`) lives in the Claude Code adapter folder and is bundled with the core pieces. Everything user-visible follows the existing `init`/`doctor`/`remove` plan-and-confirm machinery. The mods API names stay inside `src/infrastructure/harnesses/claude-code/` and `assets/runtime/`.

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-01, DEC-PD-02 | Trigger on the `turn.complete` mod event, using `e.answer` (final text) with core `endsWithResetSignal`, only when `e.reason === 'answer'` and `e.agentId` is unset. | `events` doc: `turn.complete` carries `answer`, `isAborted`, `agentId`; `reset-notice.ts:7` already defines the match. A settings-hook `Stop` would also need `last_assistant_message` parsing and a second process. | `classic.Stop`: works, but adds a payload schema and no benefit. Matching on measured zone: rejected by `DEC-PD-02`. |
| DEC-02 | FR-01, NFR-04 | The `/clear` is queued from `turn.complete` without awaiting: `void $.command.run({ command: 'clear' }).catch(onClearRejected)` after the hook returns its result. | `$.command.run` "queued and run once the session is idle", and "rejects … inside a hook the turn is waiting on" (types, `command.run`). The reference project does the same un-awaited call. | Awaiting inside the hook would reject. A timer (`$.clock.after`) adds nothing. |
| DEC-03 | FR-02 | The seed is submitted when the `$.command.run({ command: 'clear' })` promise queued by `DEC-02` resolves: the mod calls `$.prompt.submit({ text })` un-awaited with the fixed seed. No settings-hook event and no pending record are used, and a clear typed by the person never seeds because only the mod's own call reaches this code. | T01 (Claude Code 2.1.289, interactive, full logs): `session.end` reason `clear`, then the promise resolves `{text:""}` about 70 ms after the turn, the new session id differs, and the submitted seed arrives with origin `{kind:"plugin",name}` and is answered; repeated in two runs. `classic.*` events never fired in interactive sessions (only under `-p`), with or without a SessionStart settings hook, so they cannot carry the seed. The submit goes through every hook except the calling plugin's own. | `classic.SessionStart` seed with a pending record: not delivered interactively. Waiting for `session.start`: documented as not firing after `/clear`. |
| DEC-04 | FR-02, US-05 | The seed is a fixed text from core: `ContextBrake: this session was restarted automatically. Continue the previous work from the state it recorded.` plus, in full mode, `Follow the boot summary above.` It never carries conversation text. The boot itself still arrives through the existing `SessionStart` hook (PRD-03), which already fires on `clear`. | `planner.ts:21,35`: `SessionStart` with matcher `clear` is already registered. Context from `SessionStart` stdout enters the context but starts no turn, so a prompt is still needed to make the agent act. | Re-injecting a summary: duplicates the boot and risks stale text. |
| DEC-05 | FR-03 | In full mode the policy requires a valid checkpoint: the mod reads `context-brake.config.json` and the checkpoint file with `$.fs.read`, validates the checkpoint with the core checkpoint parser (bundled, Zod), requires `mtime` newer than the start of the signalling turn (`turn.start` timestamp from `$.clock.now()`), and, when `task_plan.json` exists, a named active step. | `schemas/state-checkpoint.schema.json`; `$.fs.stat` exists (reference). Matches the state the existing RED action tells the agent to write. | Trusting the signal alone: acceptable only where the mode forbids reading state (see `OI-01`). |
| DEC-06 | FR-04, FR-05 | Loop guards live in `$.store` under `contextbrake:autorestart:<projectKey>`: `{ consecutive, seededAt, toolCallsSinceSeed }`. `projectKey` is a hash of the resolved project root. `consecutive` resets on `prompt.submit` with `e.origin.kind` of `composer` or `bridge` (a person-typed prompt); the seed arrives as `plugin`. `tool.call` increments `toolCallsSinceSeed`. | Origin kinds `composer`, `bridge`, `plugin` (types `~1888-1899`). Store is shared by all sessions of the machine, so the key includes the project. | A module variable: resets on reload and hides loops after reload. |
| DEC-07 | FR-06 | Stand-down inputs: `$.env.get('CONTEXT_BRAKE_AUTO_RESTART') === '0'`; `$.env.get('CONTEXT_BRAKE_RUN_ID')` set (the runner sets it for its sessions, `run-context.ts:10`); `$.env.get('DISABLE_AUTO_COMPACT')` set; and no prompt box (`$.prompt.read()` returns the empty default in `-p`/SDK runs, so the check is `$.session.surfaces()` not containing `terminal` or `desktop`). | Env names are literal strings, as the host lists them. Runner sessions are `claude -p` (`session-launcher.ts:5`) and cannot continue after a clear. | Reading `CLAUDE_CODE_*` internals: undocumented. |
| DEC-08 | FR-07, FR-09 | Layout owned by ContextBrake: `.context-brake/claude-mod/` is a local marketplace root holding `.claude-plugin/marketplace.json` (name `context-brake-local`, one plugin `context-brake-restart` with a relative source) and the plugin directory `context-brake-restart/` (`.claude-plugin/plugin.json`, `hooks/hooks.json`, `hooks/register.mjs`). Loader: two keys in `.claude/settings.local.json`, `extraKnownMarketplaces.context-brake-local.source = { source: "directory", path: "<absolute path>" }` and `enabledPlugins["context-brake-restart@context-brake-local"] = true`. | T01 headless runs: project-scoped settings cannot set `CLAUDE_CODE_PLUGIN_DIRS` (the debug log warns it is ignored; allowed in user or managed settings or as a real environment variable); the two keys above loaded the mod on the first run with no `plugin install`, and a directory marketplace plugin is read in place, so a rewritten file takes effect without a version bump. The local settings file is untracked, so the absolute path is fine, as for the status line bridge. The plugin name must not start with `claude-`. | `CLAUDE_CODE_PLUGIN_DIRS` in user settings: edits a file ContextBrake does not own for a whole machine. `--plugin-dir`: needs a flag on every launch. `claude plugin install`: shells out and copies by version. |
| DEC-09 | FR-07 | Configuration gains optional `autoRestart: { maxConsecutiveRestarts }` (default 2, 1 to 10). Presence means on; absence means off. `schemaVersion` stays 1; JSON schema regenerated by `npm run schemas:generate`. The mod re-reads the file at turn end, so a stale installed mod obeys `init --no-auto-restart` immediately. | `configuration.ts:77` uses `z.optional` for `debug`, `lightMode`; NFR-03. | A separate state file: one more thing to drift. |
| DEC-10 | FR-08, FR-10 | The mod writes `.context-brake/runtime/claude-mod/<sessionId>.json` through `$.fs.write` (one writer per session): a capped list (50) of `{ at, code, detail? }` records and a `loaded` header `{ modVersion, claudeVersion }` written at `session.start`. `doctor` reads these files to report "loaded", "drifted" (mod version differs from package version) and the last skip. No prompt, reply or tool text is stored. | `reference`: `$.fs.write` is not atomic and not for data several sessions change; per-session files avoid that. `$.session.version()` gives the Claude Code version. | `$.store`: not readable from outside the process, so `doctor` could not see it. |
| DEC-11 | NFR-01, NFR-04 | The mod uses only `$.*` calls (async), the bundle imports no `node:` module, and every hook body is wrapped so an error becomes a logged skip and `next(e)`; `turn.complete` and `prompt.submit` hooks always return `next(e)` or its result. `.catch` handlers re-raise nothing. | Failure rule in `reference` ("a hook that fails doesn't break the session"); `node.md` forbids sync I/O in-process. | None. |
| DEC-12 | FR-03, NFR-03 | Preparatory absorption (not a refactoring task): `planner.ts` is at 99 lines, `init.ts` at 97 and `buildHarnessContext` has three parameters, so each edit would cross a `code-standards.md` limit. Absorb by (a) moving `HOOK_EVENTS`, `parseHooks`, `applyEvent` and `applyHooks` from `planner.ts` into `claude-hooks-config.ts`, and (b) turning the `statuslineBridge` parameter of `buildHarnessContext` into a `HarnessOptions` object. | `preparatory-refactoring` absorb test: no public contract change, no new characterization tests (existing planner and init tests cover them), fits in one task. | Recommending a refactoring feature: disproportionate. |
| DEC-14 | FR-02, FR-03, NFR-03 | The policy takes `gate: 'checkpoint' \| 'signal-only'`, derived from the configuration (`lightMode` present gives `signal-only`). The mod reads only `context-brake.config.json` in light mode. | `DEC-PD-03`; PRD-07 FR-02 and NFR-02 forbid light-mode hooks from reading plan or checkpoint. | Full mode only, or reading state in light mode: rejected by the human. |
| DEC-13 | FR-11 | Anything that proves a mods API fact is recorded as a fixture under `tests/fixtures/harnesses/claude-code/mod/` (a captured `turn.complete`, `session.end`, `command.run` result) from a real session in spike T01, and the research file is updated in the same change. | `harness-adapters.md`: implement only what the docs and research confirm; fixtures follow the documented format. | Fakes written from the docs only: they would not prove the contract. |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/core/services/auto-restart-policy.ts` | New | Pure `decideRestart(facts)` returning `restart` or `skip` with a reason code | DEC-01, DEC-05, DEC-06, DEC-07 |
| CMP-02 | `src/core/services/auto-restart-notices.ts` | New | Reason codes, one-line notices, seed text, log record shape (no conversation text) | CMP-01 |
| CMP-03 | `src/core/contracts/auto-restart.ts` | New | Zod schemas: `autoRestart` config block, mod log file, heartbeat header | DEC-09, DEC-10 |
| CMP-04 | `src/infrastructure/harnesses/claude-code/mod/*.ts` | New | Hook wiring and `$` glue: facts gathering, store keys, clear and seed calls, log writer | CMP-01, CMP-02, CMP-03 |
| CMP-05 | `assets/runtime/claude-code-mod.ts` and `scripts/asset-bundler.ts` entry | New / modified | Entry `export const register`, bundled to `dist/assets/runtime/claude-code-mod.mjs` | CMP-04 |
| CMP-06 | `src/infrastructure/harnesses/claude-code/auto-restart-planner.ts` | New | Plans the three mod files and the marketplace and `enabledPlugins` keys in local settings, install and remove, idempotent | CMP-05, DEC-08 |
| CMP-07 | `claude-hooks-config.ts`, `planner.ts`, `adapter.ts`, `capabilities.ts` | New / modified | Absorbed extraction (DEC-12); adapter calls CMP-06 and a new `diagnoseAutoRestart`; capability `auto_restart` | CMP-06 |
| CMP-08 | `src/cli/init-arguments.ts`, `init-config-updates.ts`, `detection-collector.ts`, `commands/init.ts` | Modified | `--auto-restart` / `--no-auto-restart`, config update, context option | CMP-03, CMP-07 |
| CMP-09 | `src/core/services/doctor-checks.ts` area, `schemas/doctor-report.schema.json` | Modified | Findings `AUTO_RESTART_*`, JSON schema stays valid | CMP-07 |
| CMP-10 | `README.md`, `docs/context-brake-protocol.md`, `docs/research/harness-integrations.md` | Modified | FR-11 documentation | all |

Flow. (1) `session.start`: write the loaded header (DEC-10). (2) `turn.start`: remember the start time. (3) `tool.call`: count calls since seed. (4) `turn.complete`: gather facts (config, checkpoint stat and read, store record, env, surfaces), call `decideRestart`; on `skip` log the code and show the notice; on `restart` increment `consecutive`, show the notice, queue `/clear` (DEC-02). (5) When the queued clear resolves: reset the progress counter and submit the seed with `$.prompt.submit` (DEC-03). (6) `prompt.submit` from a person: reset `consecutive`.

## Contracts and data

- Configuration (`context-brake.config.json`): `autoRestart?: { maxConsecutiveRestarts: int 1..10, default 2 }`. Optional, so existing files stay valid at `schemaVersion: 1`; strict object, so unknown keys fail. Example: `"autoRestart": { "maxConsecutiveRestarts": 2 }`.
- Reason codes (stable, used in logs, notices, `doctor --json`): `RESTARTED`, `SKIP_NO_SIGNAL` (not logged), `SKIP_DISABLED_ENV`, `SKIP_RUNNER_SESSION`, `SKIP_NON_INTERACTIVE`, `SKIP_CHECKPOINT_MISSING`, `SKIP_CHECKPOINT_INVALID`, `SKIP_CHECKPOINT_STALE`, `SKIP_NO_ACTIVE_STEP`, `PAUSED_LOOP_GUARD`, `SKIP_NO_PROGRESS`, `ERROR_CLEAR_REJECTED`, `ERROR_INTERNAL`.
- Mod log `.context-brake/runtime/claude-mod/<sessionId>.json`: `{ v: 1, modVersion, claudeVersion, records: [{ at, code }] }`, at most 50 records, no free text.
- `doctor-report.schema.json`: new finding codes only; the finding shape does not change.
- Agent-facing text: the seed (DEC-04). Its token budget is added to the fixtures (under 60 `o200k_base` tokens) and asserted exactly.

## Integrations and interfaces

- Claude Code mod events used: `session.start`, `turn.start`, `tool.call`, `turn.complete`, `prompt.submit`, `session.end` (log only). Mods API: `$.command.run`, `$.prompt.submit`, `$.fs.{read,write,stat}`, `$.store.{get,set,delete}`, `$.env.get`, `$.session.{id,cwd,surfaces,version}`, `$.ui.log`, `$.clock.now`. Each call is written as `$.namespace.method(...)` so `claude plugin validate` can list it; `$` is passed only to top-level functions of the bundled file.
- Time and failure: each hook runs well under the 10 s limit (reads are two small files); a hook error is caught, logged as `ERROR_INTERNAL`, and the event is passed on. A rejected `/clear` is logged as `ERROR_CLEAR_REJECTED`, and the session continues.
- Idempotency: `init` plans nothing when the plugin files, the marketplace file and the two settings keys already match; the seed is submitted once per resolved clear.
- `init --auto-restart` requires Claude Code among the target harnesses, like `--statusline-bridge` (`init-arguments.ts:49`).
- Mods are not available in Desktop WSL sessions and are off under `disableAllHooks`, `--safe-mode`, `--bare` or managed policy; `doctor` cannot see those, so it reports "mod never seen loaded" with these causes listed as remediation.

## Errors, security, and recovery

- Errors and edges: stale or invalid checkpoint, no config, unreadable files, store unavailable, a person's own `/clear` (no pending record, no seed), a second signal while a clear is queued (the pending record blocks it), hot reload mid-restart (store keeps state), subagent turns (ignored), aborted turns (ignored).
- User files: the planner edits only the `extraKnownMarketplaces.context-brake-local` and `enabledPlugins["context-brake-restart@context-brake-local"]` keys of `.claude/settings.local.json` through the existing JSON editor (preserving other keys, key order, indentation) and creates files under `.context-brake/claude-mod/`; `file-changes.md` applies (plan first, symlinks resolved, atomic write, LF). A user-edited mod file is reported by `remove`, not deleted.
- Security: mods run with the user's permissions and can submit prompts as the person. The submit uses `asUser: false` (default), so the model sees the plugin name as sender. The mod performs no network call and starts no process. Opt-in only (`DEC-PD-01`).
- Concurrency: several sessions in one repository share the store record; the `consecutive` counter is per project. The seed is tied to the promise of the clear the mod itself queued, so another session cannot consume it.
- Rollback: `init --no-auto-restart` removes the files, the two settings keys and the config block; `CONTEXT_BRAKE_AUTO_RESTART=0` stops one session; deleting `.context-brake/claude-mod/` stops it on the next reload.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| T01 Spike in a real Claude Code session (>= 2.1.287): confirm `turn.complete.answer`, `$.command.run('clear')` after a turn, seed delivery, and the loader; save fixtures | — | Done on 2026-10-04 (Claude Code 2.1.289): results in `DEC-03`, `DEC-08` and `task_01.md#Handoff`; fixtures in `tests/fixtures/harnesses/claude-code/mod/` |
| T02 Absorption (DEC-12) | — | Existing tests pass unchanged; `planner.ts` below 100 lines with room |
| T03 Core: policy, notices, contracts, schema regeneration | T01 | Unit tests TC-01 to TC-08; `npm run schemas:check` |
| T04 Mod glue, entry, bundler entry, fake `$` host | T03 | TC-09 to TC-16; `npm run assets:check` |
| T05 Planner, flags, config update, adapter, doctor | T02, T04 | TC-17 to TC-24 |
| T06 Documentation and E2E | T05 | TC-25 to TC-27, FR-11 |

## Test approach

- Profile: TypeScript strict, ESM, Node.js 20+, Vitest, Zod. Surfaces: CLI (`init`, `doctor`, `remove`) and a plugin loaded inside the Claude Code process (the mod). Commands from `AGENTS.md`: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run schemas:check`, `npm run package:smoke`.
- Simulated host: `tests/fixtures/claude-mod-host.ts` implements the used namespaces over an in-memory store, filesystem and clock, and records `command.run` and `prompt.submit` calls. Its shapes come from the fixtures captured in T01; a fake that diverges from them fails a contract test (TC-16).
- End-to-end: the built CLI against fixture repositories for `init --auto-restart`, a second `init`, `doctor`, `remove`.
- Platforms: Linux, macOS, Windows (PowerShell 5.1, 7, Git Bash) for the planner and path handling (absolute directory path with backslashes escaped in JSON on Windows). The mod itself uses no paths from the OS beyond what `$.fs` receives.
- Prerequisites and exclusions: `claude plugin validate` and `claude plugin test` need the `claude` binary, so they are a manual or optional gate (MA-01), not part of `npm test`.
- Manual acceptance (MA-01, owner: maintainer): in a full-mode repository with `init --auto-restart`, run a plan until the agent ends a reply with `[REQUEST_SESSION_RESET]`; expect a notice, a cleared session, one seed, and work continuing from the checkpoint; then type a prompt and confirm the counter reset (`.context-brake/runtime/claude-mod/*.json`). Repeat on Windows PowerShell.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-01 | unit | Policy with signal, valid facts | `restart` | `tests/unit/auto-restart-policy.test.ts` |
| TC-02 | FR-01 | unit | No signal at any usage | `skip` `SKIP_NO_SIGNAL` | same |
| TC-03 | FR-03 | unit | Checkpoint missing, invalid, stale, no step | one skip code each | same |
| TC-04 | FR-04 | unit | Limit 2, third consecutive signal; person prompt resets | `PAUSED_LOOP_GUARD`, then `restart` | same |
| TC-05 | FR-05 | unit | Signal with zero tool calls since seed | `SKIP_NO_PROGRESS` | same |
| TC-06 | FR-06 | unit | Env off, runner id, non-interactive, `DISABLE_AUTO_COMPACT` | one skip code each | same |
| TC-07 | FR-10, NFR-02 | unit | Notice and record builders | no free text, stable codes | `tests/unit/auto-restart-notices.test.ts` |
| TC-08 | FR-07 | unit | Config schema accepts block, rejects out-of-range and unknown keys | as stated | `tests/unit/auto-restart-contract.test.ts` |
| TC-09 | FR-01, DEC-02 | integration | Fake host: turn ends with signal | one `command.run('clear')` after the hook returns | `tests/integration/claude-mod.test.ts` |
| TC-10 | FR-02, DEC-03 | integration | The mod queues a clear and the host resolves it | exactly one `prompt.submit` with the fixed seed, issued after the resolution; no seed when the person types `/clear` (`session.end` without a mod call) | same |
| TC-11 | FR-02 | integration | Person-typed `/clear` | no seed | same |
| TC-12 | FR-03 | integration | Real checkpoint files in a temp dir (valid, stale, invalid) | clear only for the valid one | same |
| TC-13 | NFR-04 | integration | `$.fs` throws, `$.command.run` rejects | session unaffected, `ERROR_*` logged, no pending record left | same |
| TC-14 | FR-10, NFR-02 | integration | Log file after restart, skip, pause | records with codes only, at most 50 | same |
| TC-15 | NFR-01 | integration | Bundle contains no `node:` import, no sync I/O | grep gate passes | `tests/integration/claude-mod-bundle.test.ts` |
| TC-16 | DEC-13 | integration | Fake host shapes versus captured fixtures | match | same |
| TC-17 | FR-07 | integration | Planner creates the marketplace, plugin files and the two settings keys; second run plans nothing | idempotent, other settings bytes unchanged | `tests/integration/auto-restart-planner.test.ts` |
| TC-18 | FR-07, NFR-05 | integration | Plain `init` | no mod files, no settings keys | same |
| TC-19 | FR-09 | integration | `remove` after install; edited mod file | restored state; edited file reported | same |
| TC-20 | FR-07 | integration | Existing `extraKnownMarketplaces` and `enabledPlugins` entries of the user | kept byte for byte; only the ContextBrake keys are added and later removed | same |
| TC-21 | FR-07 | unit | Flags: both flags, harness excluded | `CliArgumentError` | `tests/unit/init-arguments.test.ts` |
| TC-22 | FR-08 | integration | One fixture per doctor problem and the ready state | finding and remediation each | `tests/integration/auto-restart-doctor.test.ts` |
| TC-23 | FR-08 | integration | `doctor --json` | validates against schema | same |
| TC-24 | NFR-03 | integration | Existing configs and schemas | still valid | `npm run schemas:check` |
| TC-25 | FR-07, FR-08, FR-09 | end-to-end | Built CLI: init, init again, doctor, remove | stated outputs and exit codes | `tests/e2e/auto-restart.test.ts` |
| TC-26 | FR-11 | integration | Docs mention the topics and date/version | present | `tests/integration/docs-auto-restart.test.ts` |
| TC-27 | OBJ-01, OBJ-02 | manual | MA-01 | described above | manual |
| TC-28 | FR-02, FR-03 | integration | Light mode with plan and checkpoint present | the fake host records zero reads of them, one clear on a valid signal, generic seed | `tests/integration/claude-mod.test.ts` |

## Quality profile

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | No `any` | blocking | `"${RG[@]}" ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | — |
| QA-02 | No `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `"${RG[@]}" '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-03 | No empty `catch` | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | `DEC-11`: handlers log a code, never stay empty |
| QA-04 | `core` does not import `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-05 | No `node:` import, sync I/O or process API in the mod files | blocking | `"${RG[@]}" "from 'node:\|readFileSync\|writeFileSync\|existsSync\|spawnSync\|execSync\|process\.(stdout\|env)" "${mod_files[@]}"` | `mod_files` is the set under `claude-code/mod/` and `assets/runtime/claude-code-mod.ts`; env comes from `$.env` |
| QA-06 | `$` is used as `$.namespace.method(...)`, never aliased | blocking | `claude plugin validate .context-brake/claude-mod` after `npm run build` (manual or optional gate) | — |
| QA-07 | No `exec`, `execSync`, `shell: true` | blocking | `"${RG[@]}" '\bexecSync\(\|\bexec\(\|shell:\s*true' "${files[@]}"` | — |
| QA-08 | Generic `throw new Error(` | reservation | `"${RG[@]}" 'throw new Error\(' "${files[@]}"` | — |
| QA-09 | Clock or randomness in `core` | reservation | `"${RG[@]}" 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' "${core_files[@]}"` | `now` is injected into facts |
| QA-10 | 4+ parameters in a declaration | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"` | — |
| QA-11 | File above 100 lines | reservation | `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | — |

- Verification scope: every TypeScript file in the task diff.
- Escalation trigger: 8+ reservation hits, a touched file above 200 lines, or duplication in 3+ places.

### Terrain baseline

Measured 2026-10-04 at `c7529c5`. No pre-existing hit of QA-01 to QA-05, QA-07, QA-09 or QA-10 in the target files. Pre-existing QA-08: `scripts/asset-bundler.ts:71` (a `throw new Error(` outside this feature's edits).

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/infrastructure/harnesses/claude-code/planner.ts` | 99 | 5 | 1 | 0 | none | absorbed in `DEC-12` (at the limit) |
| `src/infrastructure/harnesses/claude-code/adapter.ts` | 86 | 1 | 1 | 0 | none | recorded; the new calls fit under 100, otherwise the diagnose step moves to a helper |
| `src/infrastructure/harnesses/claude-code/capabilities.ts` | 10 | 1 | 0 | 0 | none | recorded |
| `src/cli/init-arguments.ts` | 64 | 3 | 2 | 0 | none | recorded |
| `src/cli/init-config-updates.ts` | 52 | 2 | 2 | 0 | none | recorded |
| `src/cli/detection-collector.ts` | 35 | 2 | 3 | 0 | none | absorbed in `DEC-12` (options object) |
| `src/cli/commands/init.ts` | 97 | 4 | 2 | 0 | none | absorbed in `DEC-12`; wiring adds at most 2 lines |
| `src/core/contracts/adapter.ts` | 59 | 6 | 0 | 0 | none | recorded |
| `src/core/contracts/configuration.ts` | 85 | 9 | 1 | 0 | none | recorded; the new block goes in `contracts/auto-restart.ts`, adding one property |
| `src/core/services/installation-builder.ts` | 86 | 4 | 1 | 0 | none | recorded |
| `scripts/asset-bundler.ts` | 72 | 7 | 2 | 0 | `QA-08: scripts/asset-bundler.ts:71` | recorded; one entry added |

- Preparatory refactoring: not recommended. Local absorption only (`DEC-12`).

## Observability and rollout

- Signals: per-session record file (DEC-10), the one-line transcript notice (`$.ui.log`), `doctor` findings `AUTO_RESTART_OFF`, `AUTO_RESTART_READY`, `AUTO_RESTART_NOT_LOADED`, `AUTO_RESTART_OUTDATED_MOD`, `AUTO_RESTART_CLAUDE_TOO_OLD`, `AUTO_RESTART_LAST_SKIP`.
- Migration and compatibility: additive and optional; no change for installations without the flag. The mod version equals the package version, so `init` rewrites the three files when they drift.
- Rollout and rollback: ship behind the flag (off by default). Gate before release: T01 spike results recorded, MA-01 passed on Windows and one POSIX system. Roll back by `init --no-auto-restart` or by not shipping the asset.

## Risks and open items

- Risk (medium): the directory marketplace loader was verified headless and with `--plugin-dir` only; the interactive first launch (trust prompt) is untested. Mitigation: MA-01 in T07 covers it; `doctor` states the cause when the mod was never seen loaded.
- Risk (medium): the mods API is documented but new (v2.1.287+); event shapes can change between releases. Mitigation: fixtures, tolerant parsing, version recorded in the loaded header, research file dated.
- Risk (low): `claude plugin validate` may reject the bundled module if esbuild changes `$` usage. Mitigation: QA-06 on the built file, bundle options pinned.
- Risk (low): the `consecutive` counter is per project, not per session; two parallel sessions can share it. Accepted.
- Resolved (`DEC-PD-03`, `DEC-14`): light mode. The human chose both modes with a gate per mode, and the PRD was amended (FR-02, FR-03, NFR-03). `DEC-05` and `DEC-04` apply in full mode; in light mode the policy takes `gate: 'signal-only'`, the mod reads no plan, checkpoint or snapshot file (the config file it reads is not one of those), and the seed omits the boot sentence. Test cases TC-03 and TC-10 gain a light-mode variant and TC-28 asserts that no state file is read in light mode.
- Resolved (T01): OI-02. The loader is the directory marketplace of `DEC-08`.
- Resolved (T01): OI-03. `turn.complete.answer` holds the full text; the tail was intact at 15,496 characters.

## Relevant files

- Modify: `src/infrastructure/harnesses/claude-code/{planner,adapter,capabilities}.ts`, `src/cli/{init-arguments,init-config-updates,detection-collector}.ts`, `src/cli/commands/init.ts`, `src/core/contracts/{adapter,configuration}.ts`, `src/core/services/doctor-checks.ts` (or the doctor service that aggregates adapter findings), `scripts/asset-bundler.ts`, `schemas/{context-brake.config,doctor-report}.schema.json`, `README.md`, `docs/context-brake-protocol.md`, `docs/research/harness-integrations.md`
- Create: `src/core/services/{auto-restart-policy,auto-restart-notices}.ts`, `src/core/contracts/auto-restart.ts`, `src/infrastructure/harnesses/claude-code/{claude-hooks-config,auto-restart-planner}.ts`, `src/infrastructure/harnesses/claude-code/mod/*.ts`, `assets/runtime/claude-code-mod.ts`, `tests/unit/auto-restart-*.test.ts`, `tests/integration/{claude-mod,claude-mod-bundle,auto-restart-planner,auto-restart-doctor,docs-auto-restart}.test.ts`, `tests/e2e/auto-restart.test.ts`, `tests/fixtures/claude-mod-host.ts`, `tests/fixtures/harnesses/claude-code/mod/*`
