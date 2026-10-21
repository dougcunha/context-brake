# TechSpec — Manual handoff command in Claude Code

## Sources and traceability

- PRD: `tasks/prd-21-manual-handoff-command/prd.md` (approved, A-01).
- Applicable instructions, rules, and skills: `AGENTS.md`; `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`, `cli-output.md`; `sdd-create-techspec`.
- Research: `docs/research/harness-integrations.md`, Claude Code, "Mods (PRD-11)" and "Leitura de contexto pelo mod (PRD-18 T01)".
- Vendor sources, read on 2026-10-21: [Mods API, "Add a command"](https://code.claude.com/docs/en/plugins/mods/api#add-a-command) (register in `session.start`; serve with `command.run` filtered by `{ command }`; return `{ text }`; `$.command.register` throws for a built-in name; `immediate: true` lets the command run mid-turn); [Mods reference](https://code.claude.com/docs/en/plugins/mods/reference) (`command.run`, `session.end` reasons, hook limits; `$.clock.sleep` counts against the hook time, `$.clock.after` does not); type declarations written by Claude Code 2.1.301 (`claude-mods/session-info/.claude-plugin/types/claude-code/index.d.ts`: `CommandSpec`, `CommandRunInput { command, args, origin, presentation }`, `CommandRunResult { text? }`, `clock.after`); [official changelog](https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md) up to 2.1.306 (2.1.287 "Added Claude Mods"; no entry names `command.register`; no built-in `/handoff`).
- Live evidence from the sibling repository `claude-mods` (2.1.296, 2026-10-13): after `/clear` only `session.end` reaches the mod; `$.session.id()` reports the ended session for about 900 ms; `session-info` registers its commands only in `session.start` and polls `$.session.id()` with `$.clock.after` after a switch (`session-info/hooks/register.tsx` `afterSwitch`).
- Evidence in existing code: `src/infrastructure/harnesses/claude-code/mod/` (`host.ts`, `register.ts`, `hooks.ts`, `mod-config.ts`, `mod-info.ts`, `mod-log.ts`, `restart-flow.ts`, `restart-host.ts`, `restart-facts.ts`, `turn-state.ts`); `src/core/services/` (`zone-guidance.ts`, `auto-restart-policy.ts`, `auto-restart-notices.ts`, `restart-flow.ts`, `restart-guards.ts`, `restart-mode.ts`, `reset-notice.ts`); `src/core/contracts/configuration.ts` (`SnapshotConfig`); `tests/fixtures/claude-mod-scene.ts`, `tests/fixtures/claude-mod-host.ts`, `tests/integration/claude-mod-bundle.test.ts`, `tests/fixtures/harnesses/claude-code/mod/observed-events.json`.

## Solution summary

A pure `core` module builds the `/handoff` prompt from `SnapshotConfig`, the restart mode, the skill invocation format, and the focus, reusing the reset instruction that `zoneAction` gives at the trigger zone. The same module decides whether a manual request may run: it refuses when automatic restart is off and when a stand-down fact (kill switch or a surface that is not interactive) applies, with the existing reason codes. The Claude Code mod registers `/handoff [focus]` at the end of its `session.start` hook and serves it with a `command.run` hook filtered by the command name. On success the hook resets the consecutive-restart counter, submits the prompt without waiting for it, and answers one line. The agent's own turn then runs the snapshot skill (or writes the markdown handoff) and ends with `[REQUEST_SESSION_RESET]`, and the existing restart flow clears and seeds.

The seed path changes for every restart (manual and automatic): the mod reads the session id before it queues `/clear` and, after the clear resolves, waits until the id changes (poll every 100 ms, 3 s at most) before it submits the seed (NFR-04). No reason code, seed text, handoff format, schema, `doctor` finding, or `init` behavior changes.

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-04, FR-07, NFR-03 | New pure module `src/core/services/manual-handoff.ts` builds the prompt and normalizes the focus. `zone-guidance.ts` exports `resetAction(snapshot, invoke, isUrgent = false)`, the reset instruction now inside `zoneAction`: the snapshot action when `snapshot.command` is set, else the handoff sentence. `zoneAction` keeps its own checks (reset due; command set or mode `handoff`) and calls it, so the zone text does not change. The manual prompt derives its target from `snapshot.command`, which matches `restartMode` when `autoRestart` is set. The prompt uses the non-urgent form (no ` now`), whatever `triggerZone` is. | A-05: one wording for the agent; `zoneAction` needs a zone and `isResetDue`, which a manual request does not have (`zone-guidance.ts:24-33`). The prompt says "Do this now" itself. | Calling `zoneAction` with a synthetic zone and usage: couples the prompt to zone math and adds ` now` for a `CRITICAL` trigger. |
| DEC-02 | FR-05, FR-06, A-04, NFR-03 | `decideManualHandoff({ mode, standDown })` in the same core module returns `submit`, `refuse-off`, or `refuse` with a reason code. It uses `standDownCode`, now exported from `auto-restart-policy.ts`, so the manual and automatic paths give the same code. | The mod only wires facts and output; the decision stays testable with no host. `standDownCode` is the single source of `SKIP_DISABLED_ENV` and `SKIP_NON_INTERACTIVE` (`auto-restart-policy.ts:15-18`). | Calling `decideRestart` with fake handoff and guard facts: misleading facts and a hidden dependency on the order of its checks. |
| DEC-03 | FR-01, FR-02, FR-11, NFR-01, P-02 | Register `/handoff` once, as the last step of the existing `session.start` hook, in its own `try`/`catch`. Spec: `{ name: 'handoff', description: 'Save the session state and restart in a new session', argumentHint: '[focus]' }`, no `immediate`. No second registration after `/clear`. | The vendor page says to register in `session.start`; `session-info` registers only there and its commands keep working after `/clear`; changelog 2.1.305 ties commands to the loaded mod version, not to a conversation. A second `on('session.start')` would make the module fail to load (one hook per event without a matcher). FR-02 stays a live check (MA-02). | Registering again after the id switch: extra hook on `session.end`, more host calls, and no evidence that it is needed. |
| DEC-04 | FR-01, NFR-01, NFR-05, P-05 | A failed registration (a refused name, or an absent API on an old version) is caught: the mod prints one line with `$.ui.log` and records nothing in the restart log; the rest of the mod keeps working. No version gate beyond the mod floor 2.1.287. | The vendor page says `$.command.register` throws for a taken name and that a throwing `session.start` hook skips its remaining work. The changelog has no entry for the command API after 2.1.287, so no later floor is known (P-05 stays open in the research section). | A version gate at a guessed version: no source supports a number. |
| DEC-05 | FR-03, FR-05, FR-06, FR-10, NFR-05, NFR-06 | The `command.run` hook answers `{ text }` itself and never calls `next`. Order: read the config (none → `refuse-off` text, no log record, counter unchanged); read stand-down facts (`refuse` → record the code with `recordDecision` and answer the existing notice text; no `ui.log`, so the notice prints once); otherwise reset the counter with `resetConsecutive`, submit the prompt, and answer the accepted line. Any thrown error → record `ERROR_INTERNAL` (guarded) and answer the failure line; no prompt. | The vendor page: the returned `text` prints in the transcript. `reportRestart` both logs and `ui.log`s (`restart-flow.ts:12-20`), which would print the notice twice. The counter changes only after every check passes (FR-10). | Returning `{}` and printing with `ui.log`: the line would not be the command's output. |
| DEC-06 | FR-03, FR-08, FR-11 | The hook schedules the submit with `$.clock.after(HANDOFF_SUBMIT_DELAY_MS = 100)` and returns its line; the timer callback calls `$.prompt.submit({ text })` without `await`, with a rejection handler that records `ERROR_INTERNAL` and prints its notice. (Revised by qa_02 BUG-01: a direct submit inside the hook was refused.) | The host refuses a `$.prompt.submit` called from a `command.run` hook: "prompt.submit: called from a command.run hook, it would wait on the turn this hook is holding; submit from a later event (turn.complete) (host check)" (live run, H-05; reproduced with `claude plugin test` on 2.1.306, `qa_02/qa.md`). A submit from a `$.clock.after` timer reached `prompt.submit` in the same probe; the vendor page names a timer submit as "start a turn from a background job". | A direct submit inside the hook: refused by the host. Waiting for `turn.complete`: no turn runs while the session is idle. |
| DEC-07 | NFR-04, D-01 | `openAfterClear` reads `$.session.id()` before it queues `/clear`. After the clear resolves, `waitForSessionSwitch` polls `$.session.id()` with `$.clock.after(SEED_SWITCH_POLL_MS)` until the id differs or `SEED_SWITCH_LIMIT_MS` passes, then `onOpened` and the seed run as today. Constants in `mod-info.ts`: 100 ms and 3000 ms. A rejected clear keeps the current `onRejected` path. | 2.1.296 measurement (id old for about 900 ms) and the `session-info` `afterSwitch` pattern. `$.clock.after` does not count against a hook's time; `$.clock.sleep` does. The counter of waited time is local, not the clock, so a test fake that fires timers at once runs the 3 s cap in microtasks. | `$.clock.sleep` in a loop: counts against the budget of a dispatch that has already ended, which the docs do not cover. |
| DEC-08 | FR-12 | No new reason code, log field, or schema change. A manual restart logs `RESTARTED` and the skip codes of the automatic path. | FR-12 and P-01. | A `MANUAL_RESTARTED` code: out of scope. |
| DEC-09 | FR-13 | `MOD_VERSION` stays equal to the `package.json` version (invariant DEC-10 of PRD-11, `claude-mod-bundle.test.ts:44-47`). This feature does not change `package.json`; the next release bump changes `MOD_VERSION`, and `doctor` then reports `AUTO_RESTART_OUTDATED_MOD` for a project that has the earlier mod. | A release is not authorized (H-02), and breaking the invariant would break the drift check. The FR-13 criterion "greater than `1.0.0`" already holds (`1.2.0`). Recorded as AUTO-03 and as an accepted open item for HIL 3. | Bumping `package.json` now: a release action outside this feature. A separate mod version: breaks DEC-10 of PRD-11. |
| DEC-10 | FR-01, NFR-01 | `host.ts` grows only with documented members: `command.register(spec)`, `clock.after(ms, fn)` returning `{ cancel() }`, the `CommandSpec`, `CommandRunEvent`, `CommandRunResult`, and `HookFilter` types, and a `HookRegistrar` overload `(event, filter, handler)`. | Type declarations of 2.1.301 and the vendor page. | Importing the vendor declaration file: it is not part of this repository. |
| DEC-11 | FR-01 | The contract test TC-16 keeps the observed list honest: `observed-events.json` gets a `documented` section (`source`, `verifiedOn: 2026-10-21`, `events: ["command.run"]`, `commandRun.keys`), and the test asserts that the registered events equal the observed ones plus the documented ones. | `command.run` has documentation evidence, not a live capture. | Dropping the assertion: loses the drift check. |
| DEC-12 | NFR-02 | The focus and the prompt live only in memory: the mod passes them to `$.prompt.submit` and never to `recordDecision`, `ui.log`, or a file. | `.agents/rules/code-standards.md`, "Keep Sensitive Data Out of Code and Logs". | — |
| DEC-13 | Quality | Absorbed preparation: the new scene helper goes to a new fixture file (`tests/fixtures/claude-mod-command.ts`), because `claude-mod-scene.ts` already has 10 exports; the host fake's action ports move to `tests/fixtures/claude-mod-host-ports.ts`, because `claude-mod-host.ts` (93 lines) would pass 100 lines. | Terrain baseline below. | — |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/core/services/zone-guidance.ts` | Modified | Exports `resetAction`; `zoneAction` uses it | — |
| CMP-02 | `src/core/services/auto-restart-policy.ts` | Modified | Exports `standDownCode` | — |
| CMP-03 | `src/core/services/manual-handoff.ts` | New | `normalizeFocus`, `manualHandoffPrompt`, `decideManualHandoff`, and the command's lines | CMP-01, CMP-02 |
| CMP-04 | `src/infrastructure/harnesses/claude-code/mod/host.ts` | Modified | Documented command and timer members; registrar overload | — |
| CMP-05 | `mod/session-switch.ts` | New | `waitForSessionSwitch($, endedId)` | CMP-04 |
| CMP-06 | `mod/restart-host.ts`, `mod/mod-info.ts` | Modified | Seed after the id switch; poll constants; command name | CMP-05 |
| CMP-07 | `mod/mod-config.ts` | Modified | `ModConfig` also carries `snapshot: SnapshotConfig` | — |
| CMP-08 | `mod/handoff-command.ts` | New | `registerHandoffCommand($)` and `runHandoffCommand($, event)` | CMP-03, CMP-04, CMP-07 |
| CMP-09 | `mod/register.ts` | Modified | Calls `registerHandoffCommand` last in `session.start`; adds `on('command.run', { command: 'handoff' }, …)` | CMP-08 |
| CMP-10 | Test fixtures | Modified and new | Scene driver keyed by event and command; host fake with `command.register`, `clock.after`, and a scripted id switch | CMP-04 |
| CMP-11 | `README.md`, `docs/research/harness-integrations.md` | Modified | `/handoff` bullet; research record | CMP-09 |

Flow: `session.start` → existing work → `registerHandoffCommand`. Person types `/handoff focus` → when idle, `command.run` with `{ command: 'handoff', args }` → `runHandoffCommand` → `readModConfig` → `standDownFacts` → `decideManualHandoff` → `resetConsecutive` → `$.prompt.submit` (not awaited) → `{ text }`. The prompted turn → `turn.start` (`startTurn`) → agent runs the skill or writes `.context-brake/handoff.md` → `turn.complete` with the signal → `handleTurnComplete` → `handleTurnEnd` (unchanged) → `openAfterClear` → id read → `/clear` → `waitForSessionSwitch` → `onOpened` and seed.

## Contracts and data

- **Command spec (CMP-08):** name `handoff`; description `Save the session state and restart in a new session`; `argumentHint` `[focus]`; no `immediate`.
- **Prompt (CMP-03), exact text:** `ContextBrake: the user typed /handoff to continue this work in a new session. Do this now: <action>.` where `<action>` is `resetAction(snapshot, invoke)`:
  - `snapshot` mode with the Claude Code format: `run "/<skill>", then end reply with [REQUEST_SESSION_RESET]`.
  - `handoff` mode: `save handoff to .context-brake/handoff.md, end reply with [REQUEST_SESSION_RESET]`.
  - With a focus: the prompt adds ` In the <target>, stress this focus for the next session: "<focus>".` with `<target>` = `snapshot` or `handoff`.
- **Focus (FR-07):** `args.replace(/\s*\r?\n\s*/g, ' ').trim()`, cut to `MANUAL_HANDOFF_FOCUS_LIMIT` = 500 characters; an empty result is no focus.
- **Lines the command prints (NFR-06, `cli-output.md`):**
  - Accepted: `ContextBrake: asking the agent to save its state; the session restarts when the reply ends.`
  - Off: `ContextBrake: /handoff needs automatic restart. Run npx context-brake init --auto-restart and start a new session.`
  - Stand-down: `renderRestartNotice(code)` for `SKIP_DISABLED_ENV` or `SKIP_NON_INTERACTIVE` (existing text).
  - Internal failure: `ContextBrake: /handoff failed with an internal error. This session keeps running.`
  - Registration failure (`ui.log`): `ContextBrake: /handoff is not available in this session; automatic restart still works.`
- **Decision type (CMP-03):** `{ kind: 'submit' } | { kind: 'refuse-off' } | { kind: 'refuse'; code: RestartReasonCode }`. Input `{ mode: RestartMode; standDown: StandDownFacts }`; `mode: 'off'` means no `autoRestart` block or a config that does not parse.
- **Restart log, guard store, seed text, handoff file, `doctor` report, config schema:** unchanged.

## Integrations and interfaces

- **`command.run` hook:** input `{ command, args, origin, presentation }` (only `args` is read); output `{ text }`; it never calls `next`. It never throws (NFR-05). It does no file write and no `command.run` itself (FR-03).
- **`session.start` hook:** unchanged work, then the registration. A failed registration does not skip earlier work and does not throw.
- **Seed path:** `openSession` stays synchronous for `core` (`RestartHost.openSession(): void`); the mod runs the async chain inside it and sends every rejection to `onRejected` or to the guarded report.
- **Mod host rules (validator):** `$` is passed only to functions declared at the top level of a file and is never stored; one hook per event without a matcher. `claude plugin validate` of the built bundle must report no error.

## Errors, security, and recovery

- Errors and edges: no config or a config that does not parse → off line. Kill switch or non-interactive surface → notice and code. Store read or write failure, config read failure, or prompt build failure → failure line and `ERROR_INTERNAL`. A rejected submit → `ERROR_INTERNAL` and its notice. A reply without the signal, an aborted turn, or a subagent reply → nothing (FR-08). Handoff mode keeps the stale and missing checks (FR-09). The id never changes after `/clear` → seed after 3 s.
- User files and sensitive data: the command writes no file; the focus never reaches the log, the UI log, or a file (DEC-12).
- Concurrency and idempotency: the command is not `immediate`, so it runs only while idle (FR-11). A second `/handoff` before the reply ends submits a second prompt; the restart flow acts once per signal.
- Rollback or reversal: revert the change; `init` reinstalls the previous mod. No persisted format changes.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| 1. Core prompt, focus, and decision (CMP-01..03) | — | TC-01..TC-04 pass; zone-guidance tests unchanged and green |
| 2. Host types, seed after id switch, fakes (CMP-04..06, CMP-10 host part) | — | TC-05, TC-06 pass; existing mod restart tests green |
| 3. Command registration and handler (CMP-07..09, CMP-10 scene part, DEC-11) | 1, 2 | TC-07..TC-16 pass |
| 4. README and research section (CMP-11) | 3 | README and research diffs; TC-17 |

## Test approach

- Profile: runtime surfaces are `core` (pure functions) and the Claude Code mod (a plugin loaded inside the Claude Code process; no Node module imports and no synchronous I/O in the bundle). Node.js 20+, TypeScript strict ESM, Vitest. Commands from `AGENTS.md`: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run schemas:check`, `npm run build`. Mod tests run in process against `tests/fixtures/claude-mod-scene.ts` and the host fake (the "kit test" of the PRD); no child process.
- End-to-end: no new e2e test file (`tests/e2e/` stays the smoke set). CLI QA runs the built `init --auto-restart` against a temporary fixture repository and checks the installed bundle (QA-E2E-01 in the manual acceptance below).
- Platforms: the change touches no path, symlink, line ending, or child process logic; the suite runs on the development machine (Windows). Linux and macOS stay unverified for the live checks.
- Command prerequisites and exclusions: `claude` 2.1.306 is on the development machine for `claude plugin validate`; the live checks need a person in an interactive Claude Code session.
- Manual acceptance (owner: the user; essential, so HIL 3 cannot accept by itself):
  - QA-E2E-01 (delegated QA runner): `npm run build`; in a temporary git repository, run `node dist/src/cli/main.js init --harness claude-code --auto-restart --yes`; check that `.context-brake/claude-mod/` holds a bundle that registers `handoff` and serves `command.run`; run `claude plugin validate .context-brake/claude-mod` and expect no error; run `doctor` and expect no new finding.
  - MA-01 (person): in an interactive session with the new mod and `autoRestart` on, type `/handoff`. Expect the accepted line, the agent's snapshot turn ending with the signal, `/clear`, and the seed in the new session with no keystroke (FR-01, FR-03, OBJ-01, DEC-06).
  - MA-02 (person): in the session opened by MA-01, type `/handoff` again; expect the same behavior (FR-02, P-02).
  - MA-03 (person): type `/handoff` while a turn runs; expect it to run after the turn ends (FR-11).
  - MA-04 (person): check that the seed is the first prompt of the new session, not of the ended one (NFR-04, D-01), and record the timing in the research section.
  - MA-05 (person): `/handoff` without `autoRestart` prints the off line and starts no turn (FR-05).

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-04, NFR-03, A-05 | unit | Prompt in `snapshot` mode with `slashInvocation` and in `handoff` mode | Prompt contains `resetAction(...)` text equal to `zoneAction` at the trigger zone (non-urgent); does not start with `/` | `tests/unit/manual-handoff.test.ts` |
| TC-02 | FR-07 | unit | Focus `"  a\nb  "`, `""`, `"   "`, 600 characters | `a b` in the focus sentence; no focus sentence; no focus sentence; 500 characters | `tests/unit/manual-handoff.test.ts` |
| TC-03 | FR-05, FR-06, A-04 | unit | `decideManualHandoff` with mode `off`, env kill switch, non-interactive, all clear | `refuse-off`; `refuse SKIP_DISABLED_ENV`; `refuse SKIP_NON_INTERACTIVE`; `submit` | `tests/unit/manual-handoff.test.ts` |
| TC-04 | FR-04 (no regression) | unit | Existing zone action cases, including `CRITICAL` ` now` | Unchanged text | `tests/unit/zone-guidance.test.ts` |
| TC-05 | NFR-04 | integration | Restart where the fake id changes after 3 polls | No seed before the switch; one seed after it; `onOpened` once | `tests/integration/claude-mod-seed-switch.test.ts` |
| TC-06 | NFR-04 | integration | Restart where the fake id never changes | Seed sent after the 3000 ms cap (30 polls) | `tests/integration/claude-mod-seed-switch.test.ts` |
| TC-07 | FR-01, FR-11 | integration | `session.start` | One `command.register` with the exact spec and no `immediate`, also with no `autoRestart` | `tests/integration/claude-mod-handoff-command.test.ts` |
| TC-08 | FR-01, DEC-04 | integration | `command.register` rejects | One `ui.log` line; `session.start` resolves; mod log still written | same |
| TC-09 | FR-03, FR-10, A-03 | integration | `/handoff` with every check passed and `consecutive` 2 | One `{ text }` (accepted line), one `prompt.submit`, guard state equal to `IDLE_GUARD_STATE`, no `clear`, no handoff file written | same |
| TC-10 | FR-05 | integration | No `autoRestart` block; then a config that does not parse | Off line; zero `prompt.submit`; guard store unchanged | same |
| TC-11 | FR-06, FR-10 | integration | `CONTEXT_BRAKE_AUTO_RESTART=0`; `DISABLE_AUTO_COMPACT=1`; surfaces `[]` | Notice text as `{ text }`; one log record with the code; zero `prompt.submit`; no duplicate `ui.log`; counter unchanged | same |
| TC-12 | FR-08 | integration | `/handoff`, then a reply without the signal; then with the signal | No `clear`; then `clear` and the seed | `tests/integration/claude-mod-handoff-restart.test.ts` |
| TC-13 | FR-09 | integration | Handoff mode: file written before the prompted turn; file written during it | `SKIP_HANDOFF_STALE`; `RESTARTED` | `tests/integration/claude-mod-handoff-restart.test.ts` |
| TC-14 | FR-10 | integration | `consecutive` equal to `maxConsecutive`, `/handoff`, reply with the signal | `RESTARTED` | `tests/integration/claude-mod-handoff-restart.test.ts` |
| TC-15 | NFR-02, NFR-05 | integration | `/handoff` with a focus, then a restart; separately a store write failure | Log file has no focus or prompt text; failure line, `ERROR_INTERNAL`, zero `prompt.submit` | `tests/integration/claude-mod-handoff-restart.test.ts` |
| TC-16 | FR-01, FR-12, DEC-11 | integration | Registered events vs the observed and documented fixture; bundle | `command.run` is documented; bundle has no Node import or sync API; `MOD_VERSION` equals the package version | `tests/integration/claude-mod-bundle.test.ts` |
| TC-17 | FR-12, FR-14 | review | Schemas and README | `npm run schemas:check` passes; no change to `RESTART_REASON_CODES`, the restart-log schema, or `src/cli/assistant/`; README bullet present | `npm run schemas:check`, diff |

## Quality profile

Rules this feature can violate. A blocking hit prevents task completion and rejects the review; a reservation becomes an optional improvement and counts toward escalation. A hit covered by `DEC-NN` is expected, not a finding.

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `"${RG[@]}" ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | — |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `"${RG[@]}" '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-03 | empty `catch` or `.catch(() => {})` | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | — |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-05 | synchronous file or process API, Node module import, `process.env`, or `process.stdout` in the mod | blocking | `"${RG[@]}" '\b(readFileSync\|writeFileSync\|appendFileSync\|existsSync\|spawnSync)\b\|node:\|process\.(env\|stdout)' src/infrastructure/harnesses/claude-code/mod/` and TC-16 | — |
| QA-06 | prompt, focus, or reply text written to a log or file | blocking | review of `recordDecision`, `ui.log`, and `fs.write` call sites in the diff; TC-15 | — |
| QA-07 | clock or randomness in `core` | reservation | `"${RG[@]}" 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' "${core_files[@]}"` | — |
| QA-08 | 4+ parameters in one declaration; file above 100 lines; function above 30 lines | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"`; `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | — |

- Verification scope: every TypeScript file in the task diff (`files`), with `core_files` the subset under `src/core/`.
- Escalation trigger: 8+ reservation hits, a touched file above 200 lines, or the same block duplicated in 3+ places.

### Terrain baseline

Measured on 2026-10-21 at commit `c17fd0a`. No target file has a parameter list of 4+, a `switch` with cases, or a blocking hit.

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/core/services/zone-guidance.ts` | 42 | 6 | 3 | 0 | — | recorded |
| `src/core/services/auto-restart-policy.ts` | 35 | 6 | 1 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/mod/host.ts` | 40 | 8 | 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/mod/register.ts` | 30 | 1 | 1 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/mod/restart-host.ts` | 44 | 2 | 2 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/mod/mod-info.ts` | 6 | 4 | 0 | 0 | — | recorded |
| `src/infrastructure/harnesses/claude-code/mod/mod-config.ts` | 39 | 2 | 2 | 0 | — | recorded |
| `tests/fixtures/claude-mod-scene.ts` | 82 | 10 | 3 | 0 | 10 exports (structural) | absorbed in DEC-13 (new helper file) |
| `tests/fixtures/claude-mod-host.ts` | 93 | 4 | 2 | 0 | QA-08 risk (near 100 lines); 3 `throw new Error(` in fakes (lines 42, 63, 71) | absorbed in DEC-13 (ports file); fake errors recorded |
| `tests/integration/claude-mod-bundle.test.ts` | 48 | 0 | 1 | 0 | — | recorded |
| `tests/integration/claude-mod-restart.test.ts` | 78 | 0 | 2 | 0 | — | recorded; TC-05 and TC-06 go to a new file, so this file stays below 100 lines |

- Preparatory refactoring: not recommended. The only structural hits are in two test fixtures, and the preparation fits inside the feature tasks (DEC-13).

## Observability and rollout

- Signals: the restart log keeps only reason codes and versions; `doctor` is unchanged. A manual restart shows as `RESTARTED`.
- Migration and compatibility: no persisted format change. The new mod reaches a project when `init` runs again; until then the old mod has no `/handoff`.
- Rollout and rollback: ship with the next release (DEC-09); revert to roll back.

## Risks and open items

- Risk (revised by qa_02 BUG-01): the host refused a submit from inside the `command.run` hook; the submit now runs from a `$.clock.after` timer (DEC-06). On a host without `$.clock.after`, `/handoff` prints the failure line and records `ERROR_INTERNAL`, after the counter reset. Mitigation: MA-01 retest; P-05 stays open.
- Risk: another plugin registers `/handoff` (P-04). The vendor page says a second registration replaces the first; the behavior across 2 plugins is not verified. Impact: one of the two commands is hidden. Mitigation: recorded in the research section; the name stays (H-01).
- Risk: the command does not survive `/clear` (P-02). Mitigation: MA-02; if it fails, a follow-up registers again after the id switch.
- Open item: P-05, the first Claude Code version with `$.command.register`, stays unknown; DEC-04 makes an absent API harmless.
- Open item: FR-13 is met at the next release bump (DEC-09, AUTO-03).
- Open item: P-03, the seed text says "restarted automatically" also for a manual restart; kept by the PRD.

## Relevant files

- Modify: `src/core/services/zone-guidance.ts`, `src/core/services/auto-restart-policy.ts`, `src/infrastructure/harnesses/claude-code/mod/host.ts`, `register.ts`, `restart-host.ts`, `mod-info.ts`, `mod-config.ts`; `tests/fixtures/claude-mod-scene.ts`, `tests/fixtures/claude-mod-host.ts`, `tests/integration/claude-mod-bundle.test.ts`, `tests/fixtures/harnesses/claude-code/mod/observed-events.json`; `README.md`; `docs/research/harness-integrations.md`.
- Create: `src/core/services/manual-handoff.ts`, `src/infrastructure/harnesses/claude-code/mod/session-switch.ts`, `src/infrastructure/harnesses/claude-code/mod/handoff-command.ts`; `tests/unit/manual-handoff.test.ts`, `tests/integration/claude-mod-handoff-command.test.ts`, `tests/integration/claude-mod-handoff-restart.test.ts`, `tests/integration/claude-mod-seed-switch.test.ts`, `tests/fixtures/claude-mod-command.ts`, `tests/fixtures/claude-mod-host-ports.ts`.
