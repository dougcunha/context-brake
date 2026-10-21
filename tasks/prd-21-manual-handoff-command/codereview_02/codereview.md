# Code review report — Manual handoff command in Claude Code (PRD-21)

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `c17fd0a23ed18791ed995e3babaac77314267334..working tree` (HEAD is the base; all changes are unstaged tracked changes and untracked files, listed in "Sources and scope")
- Previous review: `tasks/prd-21-manual-handoff-command/codereview_01/codereview.md` (REJECTED: CR-01, CR-02, 1 optional improvement)

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-21-manual-handoff-command/prd.md` | read; sha256 `4ed9669b…` equals `approved_sources` (A-01) |
| TechSpec | `tasks/prd-21-manual-handoff-command/techspec.md` | read; sha256 `0bbfb744…` equals `approved_sources` (R-04) |
| Manifest | `tasks/prd-21-manual-handoff-command/tasks.md` | read; sha256 `c31a4836…` equals `approved_sources` (R-04); T01..T04 checked |
| Tasks and handoffs | `done/task_01.md` .. `done/task_04.md` | read; 4 of 4 in `done/`, every work item checked, every handoff filled |
| Correction tasks | `codereview_01/done/task_05.md` | read; T05.1..T05.4 checked; handoff filled |
| Flow state | `workflow.md` (R-03, R-04, R-05), `autonomous-decisions.md` (AUTO-05), `checkpoint.json` | read only |
| Snapshot | `context-snapshot.md` | not present |
| Implementation | `git diff c17fd0a` (13 tracked files) plus 9 untracked code and test files: `src/core/services/manual-handoff.ts`, `mod/handoff-command.ts`, `mod/session-switch.ts`, `tests/fixtures/claude-mod-command.ts`, `tests/fixtures/claude-mod-host-ports.ts`, `tests/integration/claude-mod-handoff-command.test.ts`, `tests/integration/claude-mod-handoff-restart.test.ts`, `tests/integration/claude-mod-seed-switch.test.ts`, `tests/unit/manual-handoff.test.ts` | delimited |

No change in `package.json`, `schemas/`, `src/cli/assistant/`, `src/core/contracts/auto-restart.ts`, or the restart-log contract. `mod/` paths below are under `src/infrastructure/harnesses/claude-code/`.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Register `/handoff` with description and `[focus]` in every session, also without `autoRestart` | `mod/handoff-command.ts:15-24` `HANDOFF_COMMAND`, `registerHandoffCommand`; `mod/register.ts:11` | TC-07, TC-08 (`claude-mod-handoff-command.test.ts:16-30`); TC-16 | conformant (in process); live typeahead not verifiable (MA-01) | Exact spec asserted for `autoRestart` true and false; validator lists `$.command.register (via registerHandoffCommand)` |
| FR-02 | Command available after `/clear` | Single registration in `session.start` (DEC-03) | — | not verifiable | Live check MA-02, owner the user (HIL 3) |
| FR-03 | One line, counter reset, one prompt; no file, fork, or `clear` | `handoff-command.ts:35-39` `startHandoff` | TC-09 (`claude-mod-handoff-command.test.ts:32-42`) | conformant | One `{ text }`, one submit, `IDLE_GUARD_STATE`, no clear, no `handoff.md` access |
| FR-04 | Prompt per mode with the trigger-zone text; does not start with `/` | `core/services/manual-handoff.ts:26-31`; `zone-guidance.ts:24-34` `resetAction` | TC-01 (`manual-handoff.test.ts:12-35`), TC-04 (`zone-guidance.test.ts`, 19 tests) | conformant | Exact text per TechSpec "Contracts and data"; prompt contains `zoneAction` output |
| FR-05 | Refusal without `autoRestart` or with a bad config | `handoff-command.ts:46-52`; `manual-handoff.ts:33-37` | TC-03, TC-10 (`claude-mod-handoff-command.test.ts:50-62`) | conformant | Off line, zero submit, guard unchanged |
| FR-06 | Refusal by kill switch or non-interactive surface, with the code logged | `handoff-command.ts:41-44`; `auto-restart-policy.ts:15` `standDownCode` exported | TC-03, TC-11 (`claude-mod-handoff-command.test.ts:63-75`) | conformant | Notice as `{ text }`, one log code, no `ui.log`, zero submit |
| FR-07 | Focus normalization and 500-character cut | `manual-handoff.ts:21-24` | TC-02 (`manual-handoff.test.ts:38-49`) | conformant | `"  a\nb  "` → `a b`; blank → none; 600 → 500 |
| FR-08 | Restart only on the signal | Existing flow unchanged | TC-12 (`claude-mod-handoff-restart.test.ts:21-30`) | conformant | No clear without the signal; clear and seed with it |
| FR-09 | Handoff stale and missing checks unchanged | Existing flow unchanged | TC-13 (`claude-mod-handoff-restart.test.ts:40-51`) | conformant | `SKIP_HANDOFF_STALE` and `RESTARTED` |
| FR-10 | Guards unchanged; reset only on submit | `handoff-command.ts:36` after every check | TC-09, TC-11, TC-14 | conformant | Refusals leave `BUSY`; `RESTARTED` at the limit |
| FR-11 | Not `immediate`; runs when idle | `HANDOFF_COMMAND` has no `immediate` | TC-07 | conformant (spec); live part not verifiable | MA-03, owner the user |
| FR-12 | Existing reason codes only | No change to codes, restart-log schema, or doctor schema | TC-17 | conformant | `npm run schemas:check` exit 0 in this review; `git diff --stat c17fd0a` |
| FR-13 | `MOD_VERSION` changes for the `doctor` drift | `mod-info.ts:3` stays `1.2.0` | TC-16 (version invariant) | pending (accepted) | Deferred to the next release bump by DEC-09, AUTO-03, A-02; accepted open item for HIL 3; criterion "greater than 1.0.0" holds |
| FR-14 | README bullet; wizard unchanged | `README.md` "Manual handoff" bullet | TC-17 diff | conformant | Both modes, refusals, loop-guard reset, mid-turn queue; no diff in `src/cli/assistant/` |
| NFR-01 | Documented API members only | `mod/host.ts:3-4,26-35,40-44,53-54` | review; TC-16 | conformant | Members match DEC-10 (2.1.301 declarations, vendor page) |
| NFR-02 | Focus and prompt never stored | `handoff-command.ts:31-38`; only codes reach `recordDecision` | TC-15 (`claude-mod-handoff-restart.test.ts:54-63`) | conformant | Log has `RESTARTED`, no focus, no `/handoff` |
| NFR-03 | Pure `core` prompt builder | `core/services/manual-handoff.ts` | TC-01; QA-04 | conformant | No import from `infrastructure` or `cli`; no clock |
| NFR-04 | Seed reaches the new session (wait for the id, 100 ms, 3 s cap) | `mod/session-switch.ts:4-31`; `mod/restart-host.ts:31-43`; `mod-info.ts:7-8` | TC-05, TC-06 and 5 failure cases (`claude-mod-seed-switch.test.ts`, 7 tests) | conformant (in process); live timing not verifiable (MA-04) | Switch after 3 polls; cap at 30 polls; failed wait seeds at once; unknown ended id waits the cap |
| NFR-05 | No uncaught exception in the command hook | `handoff-command.ts:54-65` | TC-15 (`claude-mod-handoff-restart.test.ts:64-78`) | conformant | Failure line, `ERROR_INTERNAL`, zero submit; rejected submit → `ERROR_INTERNAL` and its notice |
| NFR-06 | `ContextBrake: ` lines in English | `manual-handoff.ts:10-13` | TC-09..TC-11, TC-08 | conformant | Lines equal the TechSpec text |
| NFR-07 | Claude Code 2.1.287+ on all platforms | DEC-04 (registration guarded); failed timer wait handled (`session-switch.ts:25-31`) | TC-08; seed-switch failure cases; probe | conformant for an absent API; platforms and versions not verifiable | Probe with no `clock.after` member: clear, `onOpened`, seed; Linux and macOS not run; P-05 open |
| TechSpec "Integrations and interfaces", seed path | `openSession` sends every rejection to `onRejected` or to the guarded report | `restart-host.ts:36-43` | `claude-mod-seed-switch.test.ts:41-48,72-78` | conformant | Rejected clear and a clear that cannot be queued → `ERROR_RESTART_REJECTED`; the seed part cannot reject (`onOpened` guarded in `core/services/restart-flow.ts:49`, `submitSeed` catches) |
| OBJ-01, OBJ-04, MA-01..MA-05, QA-E2E-01 | Live and built-bundle acceptance | — | — | not verifiable | Owned by the delegated QA runner and the user at HIL 3 by the TechSpec |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` architecture (core has no infrastructure import; harness shapes in the adapter) | OK | QA-04 no hit; command and event types only in `mod/host.ts` |
| `code-standards.md` (sensitive data out of logs; small units) | OK | QA-06 review; largest touched file 91 lines (`claude-mod-scene.ts`) |
| `javascript-typescript.md` (no `any`, no suppressions; never catch an error only to ignore it) | OK | QA-01, QA-02 no hit; `npm run lint`, `npm run typecheck` exit 0. The catches in `session-switch.ts:8,28` choose a fallback (not switched; seed at once), so they do not only ignore the error |
| `node.md` / mod host rules (no Node import or sync API in the mod; `$` only to top-level functions) | OK | QA-05 no hit; TC-16 green; `claude plugin validate` passed on the current build (this review) |
| `tests.md` (in process; own temporary directory; fake timers) | OK | New suites use the scene and the host fake with a fake `clock.after` port (`claude-mod-host-ports.ts:35-45`); no child process |
| `harness-adapters.md` (documented behavior; research section, adapter, and fixtures in the same change; failure policy) | OK | `docs/research/harness-integrations.md:62` PRD-21 entry; `observed-events.json` `documented` section; every new hook path catches its errors (NFR-05, CR-01 resolved) |
| `cli-output.md` (English; what happened and how to fix; status in words) | OK | Applies by the TechSpec reference; `manual-handoff.ts:10-13` lines meet it |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `rg -n ':\s*any\b\|\bas any\b\|<any>' files` | 0 of 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n '@ts-ignore\|@ts-nocheck\|eslint-disable' files` | 0 of 0 | OK |
| QA-03 | empty `catch` or `.catch(() => {})` | blocking | `rg -nU 'catch\s*(\([^)]*\))?\s*\{\s*\}\|…' files` | 0 of 0 | OK |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `rg -n "from '(\.\./)+(infrastructure\|cli)/" core_files` | 0 of 0 | OK |
| QA-05 | sync API, Node import, `process.env`/`process.stdout` in the mod | blocking | `rg -n '…\|node:\|process\.(env\|stdout)' src/infrastructure/harnesses/claude-code/mod/`; TC-16 | 0 of 0 | OK |
| QA-06 | prompt, focus, or reply text written to a log or file | blocking | review of `recordDecision`, `ui.log`, `fs.write`, `reportSafely`, `reportRestart` sites in `handoff-command.ts`, `restart-host.ts`, `session-switch.ts`, `register.ts`; TC-15 | 0 (only reason codes and constant lines) | OK |
| QA-07 | clock or randomness in `core` | reservation | `rg -n 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' core_files` | 0 of 0 | OK |
| QA-08 | 4+ parameters; file above 100 lines; function above 30 lines | reservation | parameter regex; `rg -c -H '^' files \| awk -F: '$2 > 100'`; reading of the longest functions | 0 (largest file 91 lines; longest function under 15 lines) | OK |

- Verification scope: 19 TypeScript files of the diff (10 under `src/`, 9 under `tests/`); `core_files` = `auto-restart-policy.ts`, `zone-guidance.ts`, `manual-handoff.ts`.
- Terrain baseline: applied from the TechSpec (commit `c17fd0a`).
- Hits discounted by baseline: 0.
- Reservations accumulated in the feature: 0.
- Suggested escalation: no trigger fired (0 reservations, no touched file above 200 lines, no block duplicated 3 times).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 `resetAction`, `zoneAction` text unchanged | YES | `zone-guidance.ts:24-34`; zone-guidance suite 19 tests green |
| DEC-02 `decideManualHandoff` with exported `standDownCode` | YES | `manual-handoff.ts:33-37`; `auto-restart-policy.ts:15` |
| DEC-03 register last in `session.start`, own `try`/`catch`, no `immediate` | YES | `register.ts:8-13`; `handoff-command.ts:18-24` |
| DEC-04 failed registration prints one line, no throw | YES | TC-08 |
| DEC-05 order of checks and answers | YES | `handoff-command.ts:46-65` |
| DEC-06 submit not awaited, rejection to `ERROR_INTERNAL` | YES | `handoff-command.ts:31-33`; `claude-mod-handoff-restart.test.ts:72-78` |
| DEC-07 seed after the id switch, 100 ms poll, 3 s cap | YES | `session-switch.ts`; `restart-host.ts:31-39`; TC-05, TC-06; failed wait and unknown id handled (T05) |
| DEC-08 no new reason code | YES | diff |
| DEC-09 `MOD_VERSION` equals package version | YES | `mod-info.ts:3`; TC-16 |
| DEC-10 host type members | YES | `host.ts` diff |
| DEC-11 `documented` section and TC-16 assertion | YES | `observed-events.json`; `claude-mod-bundle.test.ts:34-42` |
| DEC-12 focus and prompt only in memory | YES | TC-15 |
| DEC-13 fixture split | YES | `claude-mod-command.ts` (33 lines), `claude-mod-host-ports.ts` (55 lines); host fake 76 lines |
| "Integrations and interfaces", seed path: every rejection to `onRejected` or the guarded report | YES | `restart-host.ts:36-43`; probe and seed-switch failure cases |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | Core prompt, focus, decision; 14 unit tests green in this run. The work item T01.1 text still names `resetAction(snapshot, options)`; the handoff and DEC-01 record the implemented signature (no impact on code) |
| T02 | `done/task_02.md` | COMPLETE | Seed wait, host types, fake ports; seed-switch suite green |
| T03 | `done/task_03.md` | COMPLETE | Registration and handler; 9 + 7 tests green; validator result re-run on the current build in this review |
| T04 | `done/task_04.md` | COMPLETE | README bullet and research entry present; `schemas:check` exit 0 |
| T05 | `codereview_01/done/task_05.md` | COMPLETE | Failed wait seeds at once; unknown ended id waits the cap; clear that cannot be queued → `onRejected`; 3 new tests green (seed-switch suite 7 tests) |

## Executed validations

- Profile and scope: runtime surfaces `core` and the Claude Code mod; in-process tests only (CLI policy in `AGENTS.md`); no new e2e file.
- Validated state: working tree on base `c17fd0a` as listed above (no change during the review), Windows 11, Node 24.20.0, Claude Code 2.1.306, `dist/` rebuilt in this review.
- Reused evidence: none. Every result below comes from this review.
- Manual acceptance: MA-01..MA-05 open (owner the user, HIL 3); QA-E2E-01 open (delegated QA runner).
- Probe (scratchpad, outside the repository): `npx tsx probe-absent-clock.ts` calls `createModRestartHost(...).openSession(...)` with a host that has no `clock.after` member. Result: `clear`, `onOpened`, one seed; no `onRejected`, no unhandled rejection. Before T05, the same scenario gave an unhandled rejection and no seed (codereview_01).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed (exit 0) | QA-01, QA-02, rules |
| `npm run typecheck` | passed (exit 0) | NFR-01, DEC-10 |
| `npm run schemas:check` | passed (exit 0) | FR-12, TC-17 |
| `npm run build` | passed (exit 0) | TC-16 prerequisite |
| `npm run coverage` | passed (exit 0): 292 files, 1577 passed, 1 skipped; 96.38% statements, 93.35% branches; 214.8 s. `claude-mod-seed-switch` 7, `claude-mod-handoff-command` 9, `claude-mod-handoff-restart` 7, `claude-mod-bundle` 3, `manual-handoff` 14, `zone-guidance` 19 tests | TC-01..TC-16, T05, regression |
| `node dist/src/cli/main.js init --harness claude-code --auto-restart --yes` in a temporary git repository (scratchpad) | passed (exit 0); `.context-brake/claude-mod/context-brake-restart` written | QA-E2E-01 prerequisite (partial) |
| `claude plugin validate .context-brake/claude-mod/context-brake-restart` (2.1.306) | "Validation passed"; hooks `session.start, turn.start, tool.call, turn.complete, prompt.submit, command.run{command=?}`; calls include `$.command.register` and `$.clock.after (via delay)` | NFR-01, FR-01, mod host rules |
| Quality profile QA-01..QA-08 (`rg`) | 0 hits | Quality profile |
| Probe of the seed path with no `clock.after` member | seed sent, `onOpened` ran | codereview_01/CR-01, NFR-04, NFR-07 |

The validator also prints `gating hook without .catch: command.run{command=?}` (as for `tool.call` and `prompt.submit`, a pre-existing note) and plugin-directory notes (README, LICENSE, icon) that do not apply to a local mod. The `command.run` handler catches every error itself (`handoff-command.ts:59-65`, NFR-05).

## Findings

No finding in this review.

Optional improvements (not findings; no requirement or profile rule depends on them):

- A failed timer wait (`$.clock.after` absent or throwing) falls back to the seed at once and leaves `RESTARTED` as the only record (`session-switch.ts:25-31`), so `doctor` cannot tell such a host from a normal restart. T05 chose this on purpose ("no reason code is added", FR-12). A later feature can add a diagnostic if the live checks show hosts without `clock.after`.
- `session-switch.ts:8-10` (an id read that fails during the poll after a successful read before `/clear`) is the only uncovered branch of the new seed path (coverage 92.3% for the file). The behavior is correct by reading: the poll continues to the cap.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_01/CR-01 | resolved | `session-switch.ts:25-31` catches any failure of the wait and returns `false`; `restart-host.ts:31-34` then runs `onOpened` and the seed; `restart-host.ts:36-43` sends only a rejected or unqueued clear to `onRejected`. Tests `claude-mod-seed-switch.test.ts:52-60` (throwing `clock.after`: zero ticks, one seed, `toolCallsSinceSeed` 0) and `:72-78` (clear that cannot be queued). Probe with an absent `clock.after` member: seed sent, no unhandled rejection |
| codereview_01/CR-02 | resolved | `workflow.md` R-04 records the TechSpec revision (TC-12..TC-15 in `claude-mod-handoff-restart.test.ts`); R-05 refreshes the hashes; `sha256sum` of `techspec.md` and `tasks.md` in this review equals `checkpoint.json` `approved_sources` |
| codereview_01, optional improvement (unknown session id `''`) | resolved | `UNKNOWN_SESSION_ID` removed; `restart-host.ts:37` gives `undefined`; `session-switch.ts:5` never counts an unknown id as switched; test `claude-mod-seed-switch.test.ts:62-70` (first read fails, later reads work → 30 ticks) |

## Limitations and open items

- MA-01..MA-05 (live `/handoff`, command after `/clear`, mid-turn queue, seed timing, off line) are not verifiable in this review. The TechSpec assigns them to the user at HIL 3 as essential manual acceptance. They are the reservation of this status: FR-02, the live part of FR-11 and NFR-04, and OBJ-01 and OBJ-04 stay open until then.
- In process, the host fake fires `clock.after` callbacks at once. Whether a `$.clock.after` timer set by the ended session's dispatch still fires after `/clear` resets the mod state (about 80 ms after `session.end` on 2.1.296) is not tested; MA-04 covers it.
- FR-13 stays pending by DEC-09, AUTO-03, and A-02 until the next release bump (accepted open item for HIL 3).
- QA-E2E-01 belongs to the delegated QA runner. Its TechSpec text names `node dist/cli/index.js`, but the built CLI entry is `dist/src/cli/main.js` (`package.json` `bin`); the first path fails with `MODULE_NOT_FOUND`. Item for `workflow.md` (this reviewer does not write it): the QA runner must use `dist/src/cli/main.js` or the TechSpec text needs a correction. This is a TechSpec text defect, not a code finding.
- NFR-07: Linux and macOS are not verified; the first Claude Code versions with `$.command.register` and `$.clock.after` are unknown (P-05). An absent API is now harmless for both (TC-08; probe).
- No `context-snapshot.md` exists; nothing was loaded from a snapshot.

## Conclusion

The re-review finds no finding. CR-01 is resolved: a failed seed wait now sends the seed at once, and the probe and 3 new tests prove it. CR-02 and the unknown-id improvement are resolved. The implementation meets FR-01, FR-03..FR-12, FR-14, and NFR-01..NFR-06 with passing in-process tests. The quality profile has 0 blocking and 0 reservation hits. Lint, typecheck, build, schemas check, coverage (1577 tests), and `claude plugin validate` on the current build pass.

The status is APPROVED WITH RESERVATIONS, not APPROVED, because not every obligation is conformant yet. FR-13 is pending by the approved decision DEC-09. FR-02 and the live parts of FR-11, NFR-04, OBJ-01, and OBJ-04 are not verifiable in process. The TechSpec routes each of these items to a later stage: QA-E2E-01 to the delegated QA runner, MA-01..MA-05 and FR-13 to HIL 3. A correction round cannot produce this evidence, so these items do not reject the review. Next: QA-E2E-01 with the corrected CLI path, then MA-01..MA-05 at HIL 3.
