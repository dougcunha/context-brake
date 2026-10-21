# Code review report — Manual handoff command in Claude Code (PRD-21)

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `c17fd0a23ed18791ed995e3babaac77314267334..working tree` (HEAD is the base; all changes are unstaged tracked changes and untracked files, listed in "Sources and scope")
- Previous review: `—`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-21-manual-handoff-command/prd.md` | read; sha256 `4ed9669b…` equals the approved hash (A-01) |
| TechSpec | `tasks/prd-21-manual-handoff-command/techspec.md` | read; sha256 `0bbfb744…` differs from the approved hash `d406b9bd…` (R-01), see CR-02 |
| Manifest | `tasks/prd-21-manual-handoff-command/tasks.md` | read; sha256 `c31a4836…` differs from the approved hash `d07efe7f…` (A-03); the State checkboxes changed, which can explain the difference |
| Tasks and handoffs | `done/task_01.md` .. `done/task_04.md` | read; 4 of 4 in `done/`, every work item checked, every handoff filled |
| Flow state | `workflow.md`, `autonomous-decisions.md`, `checkpoint.json` | read only |
| Snapshot | `context-snapshot.md` | not present |
| Implementation | `git diff c17fd0a` (13 tracked files) plus 10 untracked files: `src/core/services/manual-handoff.ts`, `mod/handoff-command.ts`, `mod/session-switch.ts`, `tests/fixtures/claude-mod-command.ts`, `tests/fixtures/claude-mod-host-ports.ts`, `tests/integration/claude-mod-handoff-command.test.ts`, `tests/integration/claude-mod-handoff-restart.test.ts`, `tests/integration/claude-mod-seed-switch.test.ts`, `tests/unit/manual-handoff.test.ts` | delimited |

No change in `package.json`, `schemas/`, `src/cli/assistant/`, `src/core/contracts/auto-restart.ts`, or the restart-log contract.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Register `/handoff` with description and `[focus]` in every session, also without `autoRestart` | `mod/handoff-command.ts:15-24` `HANDOFF_COMMAND`, `registerHandoffCommand`; `mod/register.ts:11` | TC-07, TC-08 (`claude-mod-handoff-command.test.ts:16-30`), TC-16 | conformant (in process); live typeahead not verifiable (MA-01) | Exact spec asserted for `autoRestart` true and false |
| FR-02 | Command available after `/clear` | Single registration in `session.start` (DEC-03) | — | not verifiable | Live check MA-02, owner the user |
| FR-03 | One line, counter reset, one prompt; no file, fork, or `clear` | `handoff-command.ts:35-39` `startHandoff` | TC-09 (`claude-mod-handoff-command.test.ts:32-42`) | conformant | One `{ text }`, one submit, `IDLE_GUARD_STATE`, no clear, no `handoff.md` access |
| FR-04 | Prompt per mode with the trigger-zone text, not starting with `/` | `core/services/manual-handoff.ts:26-31`; `zone-guidance.ts:24-33` `resetAction` | TC-01, TC-04 (`manual-handoff.test.ts:12-36`, `zone-guidance.test.ts` 19 tests) | conformant | Exact text per TechSpec "Contracts and data" |
| FR-05 | Refusal without `autoRestart` or with a bad config | `handoff-command.ts:46-52`; `manual-handoff.ts:33-37` | TC-03, TC-10 | conformant | Off line, zero submit, guard unchanged |
| FR-06 | Refusal by kill switch or non-interactive surface, with the code logged | `handoff-command.ts:41-44`; `auto-restart-policy.ts:15` `standDownCode` exported | TC-03, TC-11 | conformant | Notice as `{ text }`, one log code, no `ui.log`, zero submit |
| FR-07 | Focus normalization and 500-character cut | `manual-handoff.ts:21-24` | TC-02 | conformant | `"  a\nb  "` → `a b`; blank → none; 600 → 500 |
| FR-08 | Restart only on the signal | Existing flow unchanged | TC-12 (`claude-mod-handoff-restart.test.ts:21-30`) | conformant | No clear without the signal; clear and seed with it |
| FR-09 | Handoff stale and missing checks unchanged | Existing flow unchanged | TC-13 (`claude-mod-handoff-restart.test.ts:40-51`) | conformant | `SKIP_HANDOFF_STALE` and `RESTARTED` |
| FR-10 | Guards unchanged; reset only on submit | `handoff-command.ts:36` after every check | TC-09, TC-11, TC-14 | conformant | Refusals leave `BUSY`; `RESTARTED` at the limit |
| FR-11 | Not `immediate`; runs when idle | `HANDOFF_COMMAND` has no `immediate` | TC-07 | conformant (spec); live part not verifiable | MA-03, owner the user |
| FR-12 | Existing reason codes only | No change to codes, schema, or doctor schema | TC-17: `npm run schemas:check` exit 0; diff | conformant | `git diff --stat c17fd0a` |
| FR-13 | `MOD_VERSION` changes for the `doctor` drift | `mod-info.ts:3` stays `1.2.0` | TC-16 (version invariant) | pending | Deferred to the next release by DEC-09, AUTO-03, A-02; accepted open item for HIL 3, not a finding; criterion "greater than 1.0.0" holds |
| FR-14 | README bullet; wizard unchanged | `README.md` "Manual handoff" bullet | TC-17 diff | conformant | Both modes, refusals, loop-guard reset; no diff in `src/cli/assistant/` |
| NFR-01 | Documented API members only | `mod/host.ts` `command.register`, `clock.after`, `HookFilter` overload | review, TC-16 | conformant | Members match the TechSpec DEC-10 sources |
| NFR-02 | Focus and prompt never stored | `handoff-command.ts:31-38`; only codes reach `recordDecision` | TC-15 (`claude-mod-handoff-restart.test.ts:54-63`) | conformant | Log has `RESTARTED`, no focus, no `/handoff` |
| NFR-03 | Pure `core` prompt builder | `core/services/manual-handoff.ts` | TC-01; QA-04 | conformant | No import from `infrastructure` or `cli` |
| NFR-04 | Seed reaches the new session (wait for the id, 100 ms, 3 s cap) | `mod/session-switch.ts`, `mod/restart-host.ts:32-44` | TC-05, TC-06 (`claude-mod-seed-switch.test.ts`) | non-conformant (error path, CR-01); live timing not verifiable (MA-04) | A rejection of the wait is lost; see CR-01 |
| NFR-05 | No uncaught exception in the command hook | `handoff-command.ts:59-65` | TC-15 | conformant | Failure line, `ERROR_INTERNAL`, zero submit |
| NFR-06 | `ContextBrake: ` lines in English | `manual-handoff.ts:10-14` | TC-09..TC-11 | conformant | Lines equal the TechSpec text |
| NFR-07 | Claude Code 2.1.287+ on all platforms | DEC-04 (register guarded) | — | not verifiable | First version of `$.command.register` and `$.clock.after` unknown (P-05); CR-01 makes an absent `clock.after` break every restart |
| TechSpec "Integrations and interfaces", seed path | `openSession` sends every rejection to `onRejected` or to the guarded report | `restart-host.ts:37-44` | none for a failed wait | non-conformant | CR-01 |
| OBJ-01, OBJ-04, MA-01..MA-05, QA-E2E-01 | Live and built-bundle acceptance | — | — | not verifiable | Owned by QA and the user at HIL 3 by the TechSpec |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` architecture (core has no infrastructure import; harness shapes in the adapter) | OK | QA-04 no hit; event types only in `mod/host.ts` |
| `code-standards.md` (sensitive data out of logs; small units) | OK | QA-06 review; largest touched file 91 lines |
| `javascript-typescript.md` (no `any`, no suppressions) | OK | QA-01, QA-02 no hit; `npm run lint`, `npm run typecheck` exit 0 |
| `node.md` / mod host rules (no Node import or sync API in the mod; `$` only to top-level functions) | OK | QA-05 no hit; TC-16 green; `claude plugin validate` passed in T03 |
| `tests.md` (in process; own temporary directory; no real clock, fake timers) | OK | New suites use the scene and the host fake with a fake `clock.after` port (`claude-mod-host-ports.ts:35-44`); no child process, so no `PROCESS_LANE_FILES` entry is needed |
| `harness-adapters.md` (only documented behavior; research section, adapter, and fixtures in the same change) | OK | `docs/research/harness-integrations.md:62` new PRD-21 entry; `observed-events.json` `documented` section; adapter in the same diff |
| `cli-output.md` (English; what happened and how to fix; status in words) | OK | Its `paths` cover `src/cli/**`, so it applies here only by the TechSpec reference; `manual-handoff.ts:10-14` lines meet it (the off line names the fix) |
| Error handling of async chains (`code-standards.md`, TechSpec seed path) | NOT OK | CR-01 |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `rg -n ':\s*any\b\|\bas any\b\|<any>' files` | 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n '@ts-ignore\|@ts-nocheck\|eslint-disable' files` | 0 | OK |
| QA-03 | empty `catch` or `.catch(() => {})` | blocking | `rg -nU 'catch\s*(\([^)]*\))?\s*\{\s*\}\|…' files` | 0 | OK |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `rg -n "from '(\.\./)+(infrastructure\|cli)/" core_files` | 0 | OK |
| QA-05 | sync API, Node import, `process.env`/`process.stdout` in the mod | blocking | `rg -n '…\|node:\|process\.(env\|stdout)' src/infrastructure/harnesses/claude-code/mod/`; TC-16 | 0 | OK |
| QA-06 | prompt, focus, or reply text written to a log or file | blocking | review of `recordDecision`, `ui.log`, `fs.write` sites; TC-15 | 0 (only codes and constant lines) | OK |
| QA-07 | clock or randomness in `core` | reservation | `rg -n 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' core_files` | 0 | OK |
| QA-08 | 4+ parameters; file above 100 lines; function above 30 lines | reservation | parameter regex; `rg -c -H '^' files \| awk -F: '$2 > 100'`; reading of the longest functions | 0 (largest file 91 lines; longest functions under 15 lines) | OK |

- Verification scope: 19 TypeScript files of the diff (10 under `src/`, 9 under `tests/`); `core_files` = `auto-restart-policy.ts`, `zone-guidance.ts`, `manual-handoff.ts`.
- Terrain baseline: applied from the TechSpec (commit `c17fd0a`).
- Hits discounted by baseline: 0. The `throw new Error(` lines in the test fakes that the T02 handoff lists are not a QA rule of this profile and are not counted.
- Reservations accumulated in the feature: 0.
- Suggested escalation: no trigger fired (0 reservations, no touched file above 200 lines, no block duplicated 3 times).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 `resetAction`, `zoneAction` text unchanged | YES | `zone-guidance.ts:24-33`; zone-guidance suite 19 tests green |
| DEC-02 `decideManualHandoff` with exported `standDownCode` | YES | `manual-handoff.ts:33-37`; `auto-restart-policy.ts:15` |
| DEC-03 register last in `session.start`, no `immediate` | YES | `register.ts:8-13`; earlier steps catch their own errors (`hooks.ts:26-32`, `context-reading.ts` `publishContextReading`) |
| DEC-04 failed registration prints one line, no throw | YES | `handoff-command.ts:18-24`; TC-08 |
| DEC-05 order of checks and answers | YES | `handoff-command.ts:46-65` |
| DEC-06 submit not awaited, rejection to `ERROR_INTERNAL` | YES | `handoff-command.ts:31-33`; test `claude-mod-handoff-restart.test.ts:72-78` |
| DEC-07 seed after the id switch | PARTIAL | Wait and cap correct (TC-05, TC-06); a rejected wait is not handled (CR-01) |
| DEC-08 no new reason code | YES | diff |
| DEC-09 `MOD_VERSION` equals package version | YES | `mod-info.ts:3`, TC-16 |
| DEC-10 host type members | YES | `host.ts` diff |
| DEC-11 `documented` section and TC-16 assertion | YES | `observed-events.json`; `claude-mod-bundle.test.ts:34-42` |
| DEC-12 focus and prompt only in memory | YES | TC-15 |
| DEC-13 fixture split | YES | `claude-mod-command.ts`, `claude-mod-host-ports.ts`; host fake 74 lines |
| "Integrations and interfaces", seed path: every rejection to `onRejected` or the guarded report | NO | CR-01 |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | Core prompt, focus, decision; 14 unit tests green in this run. The work item T01.1 text still names `resetAction(snapshot, options)`; DEC-01 was aligned (R-01), the item text was not (no impact on code) |
| T02 | `done/task_02.md` | COMPLETE | Seed wait and fakes; 4 tests green. The failed-wait path is CR-01 |
| T03 | `done/task_03.md` | COMPLETE | Command registration and handler; 9 + 7 tests green; `claude plugin validate` passed on 2.1.306 |
| T04 | `done/task_04.md` | COMPLETE | README bullet and research entry present; `schemas:check` exit 0 |

## Executed validations

- Profile and scope: runtime surfaces `core` and the Claude Code mod; in-process tests only (CLI policy in `AGENTS.md`); no new e2e file.
- Validated state: working tree on base `c17fd0a` as listed above, Windows 11, Node 24.20.0, `dist/` rebuilt in this review.
- Reused evidence: `claude plugin validate` of the installed mod (Claude Code 2.1.306, "Validation passed") from the T03 handoff. It stays valid because the T04 handoff and scope list only `README.md` and `docs/research/harness-integrations.md`; the working tree cannot show the order of changes, so this rests on the handoffs.
- Rules read in this review: `cli-output.md` in full; `tests.md`, `node.md`, `harness-adapters.md` by targeted search; `code-standards.md` and `javascript-typescript.md` through the quality profile, lint, and typecheck, not read line by line.
- Manual acceptance: MA-01..MA-05 open (owner the user, HIL 3); QA-E2E-01 open (delegated QA).
- Probe (scratchpad, not in the repository): `tsx probe-clock.ts` calls `createModRestartHost(...).openSession(...)` with a host whose `clock.after` throws. Result: `unhandledRejection: TypeError: $.clock.after is not a function`; no seed, no `onOpened`, no `onRejected`, no log record, no notice.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed (exit 0) | QA-01, QA-02, rules |
| `npm run typecheck` | passed (exit 0) | NFR-01, DEC-10 |
| `npm run build` | passed (exit 0) | TC-16 prerequisite |
| `npm run schemas:check` | passed (exit 0) | FR-12, TC-17 |
| `npm run coverage` | passed: 292 files, 1574 passed, 1 skipped; 96.4% statements, 93.36% branches; 151.5 s | TC-01..TC-16 and regression |
| Quality profile QA-01..QA-08 (`rg`) | 0 hits | Quality profile |
| Probe of the seed path with a throwing `clock.after` | failure reproduced | CR-01, NFR-04, NFR-07 |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | High | TechSpec "Integrations and interfaces" (seed path), DEC-07, NFR-04, NFR-07 | `src/infrastructure/harnesses/claude-code/mod/session-switch.ts:12-14` `delay` turns a throw of `$.clock.after` into a rejected promise; `waitForSessionSwitch` (`:16-21`) does not catch it; `restart-host.ts:32-35` `seedAfterSwitch` propagates it; `restart-host.ts:39` routes only a rejected `clear` to `onRejected`; `restart-host.ts:43` `void clearAndSeed(...)` drops the rejection. Before this diff the chain had no such path (`onOpened` is guarded in `core/services/restart-flow.ts:49`, `submitSeed` catches). Probe output: one unhandled rejection, no seed, no `onOpened`, no log code, no notice | On any host where `$.clock.after` is absent or throws, every restart (automatic and manual) clears the session and never sends the seed, and nothing records why. The first Claude Code version with `$.clock.after` is unknown (only 2.1.301 declarations were read), and NFR-07 requires 2.1.287+. No test covers a failed wait | Catch a failure of the wait (in `waitForSessionSwitch` or around it in `seedAfterSwitch`) so the seed still goes out at once, or route the error to the guarded report (`reportRestart(..., 'ERROR_INTERNAL')`); add a seed-switch test with a throwing `clock.after` |
| CR-02 | Low | Flow state (`checkpoint.json` `approved_sources`, `workflow.md`) | `techspec.md` sha256 `0bbfb744…` differs from the approved `d406b9bd…` (R-01); the T03 handoff says that the TechSpec test table names `claude-mod-handoff-restart.test.ts`, and `workflow.md` has no revision entry after R-01. `tasks.md` also differs (`c31a4836…` vs `d07efe7f…`), likely from the State checkboxes | An approved source changed with no recorded decision; a later stage cannot tell which TechSpec text was approved | Record the TechSpec revision (what changed, same scope) in `workflow.md` and refresh the approved hashes in the checkpoint |

Optional improvement (not a finding): `UNKNOWN_SESSION_ID` is `''` (`mod-info.ts:9`). If the id read before `/clear` fails once and a later read succeeds, `hasSwitched` is true at the first poll even when the id is still the ended session's id, so the seed can go out at about 100 ms, inside the 900 ms window of the 2.1.296 measurement. The TechSpec does not define this case; the test covers only an id read that always fails.

## Limitations and open items

- MA-01..MA-05 (live `/handoff`, command after `/clear`, mid-turn queue, seed timing, off line) are not verifiable in this review. The TechSpec assigns them to the user at HIL 3; they do not drive this status.
- QA-E2E-01 (built `init --auto-restart` in a temporary repository, `claude plugin validate`, `doctor`) belongs to the delegated QA runner; this review reused the T03 validator result.
- FR-13 stays pending by DEC-09 and A-02 until the next release bump.
- NFR-07: Linux and macOS are not verified; the first Claude Code versions with `$.command.register` and `$.clock.after` are unknown (P-05).
- No `context-snapshot.md` exists; nothing was loaded from a snapshot.
- Items for `workflow.md` (this reviewer does not write it): CR-02 (TechSpec hash differs from R-01 with no revision entry).

## Conclusion

The implementation meets FR-01, FR-03..FR-12, FR-14 and NFR-01..NFR-03, NFR-05, NFR-06 with passing in-process tests, a clean quality profile (0 blocking, 0 reservation hits), and green lint, typecheck, build, schemas check, and coverage. The review is REJECTED because of CR-01: the new seed wait adds an error path that the TechSpec seed-path contract requires to reach `onRejected` or the guarded report, and the probe proves that a failure there loses the seed silently on every restart. CR-02 is a traceability gap in the flow state. After the correction of CR-01, a new review and then QA-E2E-01 and MA-01..MA-05 remain.
