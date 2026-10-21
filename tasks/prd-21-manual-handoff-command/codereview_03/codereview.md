# Code review report — Manual handoff command in Claude Code (PRD-21)

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `c17fd0a23ed18791ed995e3babaac77314267334..working tree` (HEAD is the base; all changes are unstaged tracked changes and untracked files, listed in "Sources and scope")
- Previous review: `tasks/prd-21-manual-handoff-command/codereview_02/codereview.md` (APPROVED WITH RESERVATIONS, no finding). Correction input: `tasks/prd-21-manual-handoff-command/qa_02/qa.md` (REJECTED, BUG-01)

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-21-manual-handoff-command/prd.md` | read; sha256 `4ed9669b…` equals `approved_sources` (A-01) |
| TechSpec | `tasks/prd-21-manual-handoff-command/techspec.md` | read; sha256 `d0884d23…` equals `approved_sources` (R-08, DEC-06 revised by qa_02) |
| Manifest | `tasks/prd-21-manual-handoff-command/tasks.md` | read; sha256 `c31a4836…` equals `approved_sources` (R-04); T01..T04 checked |
| Tasks and handoffs | `done/task_01.md` .. `done/task_04.md`; `codereview_01/done/task_05.md`; `qa_02/done/task_06.md` | read; 6 of 6 in `done/` folders; every work item checked; every handoff filled |
| Correction reports | `qa_02/qa.md` (BUG-01), `qa_02/evidence/kit-probe.test.ts.txt`; `qa_01/qa.md` | read |
| Flow state | `workflow.md` (R-06, R-07, H-04, H-05, R-08), `autonomous-decisions.md` (AUTO-06, AUTO-07), `checkpoint.json` | read only |
| Snapshot | `context-snapshot.md` | loaded with the independent-stage filter (header, next step brief, open threads, `on-run` entries L-01..L-03). The header says `covers_through: qa_01`, but the stage source shows `qa_02` and T06 done. The snapshot is behind, so this review treats the next step brief as stale. `Decisions`, `Code map`, and other learnings were not loaded |
| Implementation | `git diff c17fd0a` (14 tracked files) plus 9 untracked code and test files: `src/core/services/manual-handoff.ts`, `mod/handoff-command.ts`, `mod/session-switch.ts`, `tests/fixtures/claude-mod-command.ts`, `tests/fixtures/claude-mod-host-ports.ts`, `tests/integration/claude-mod-handoff-command.test.ts`, `tests/integration/claude-mod-handoff-restart.test.ts`, `tests/integration/claude-mod-seed-switch.test.ts`, `tests/unit/manual-handoff.test.ts` | delimited |

`mod/` paths below are under `src/infrastructure/harnesses/claude-code/`. No change in `package.json`, `schemas/`, `src/cli/assistant/`, or `src/core/contracts/auto-restart.ts`.

The 14th tracked change, `.gitignore`, is not feature code. It removes 3 statusline lines inside the managed `context-brake` block. Its modification time (18:48) equals that of `.context-brake/manifest.json`, and a fresh built `init` in a temporary repository writes 0 statusline lines. So an `init` run in this repository wrote it (for the live retest, H-05). This review does not judge it as part of the feature (see limitations).

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Register `/handoff` with description and `[focus]` in every session, also without `autoRestart` | `mod/handoff-command.ts:15-24` `HANDOFF_COMMAND`, `registerHandoffCommand`; `mod/register.ts` | TC-07, TC-08 (`claude-mod-handoff-command.test.ts`); TC-16 | conformant (in process); live typeahead not verifiable (MA-01) | Exact spec for `autoRestart` true and false; validator lists `command.run{command=?}` |
| FR-02 | Command available after `/clear` | Single registration in `session.start` (DEC-03) | — | not verifiable | MA-02, owner the user |
| FR-03 | One line, counter reset, one prompt; no file, fork, or `clear` | `handoff-command.ts:39-43` `startHandoff`, `:35-37` `submitAfterCommand` | TC-09; BUG-01 test (`claude-mod-handoff-command.test.ts`, "submits after its hook returns") | conformant | One `{ text }`, one submit from the timer, `IDLE_GUARD_STATE`, no clear, no `handoff.md` access. Kit probe on the current build: one `prompt.submit` with the exact prompt, after the hook returned |
| FR-04 | Prompt per mode with the trigger-zone text; does not start with `/` | `core/services/manual-handoff.ts`; `zone-guidance.ts` `resetAction` | TC-01, TC-04 | conformant | `manual-handoff` 14 tests and `zone-guidance` 19 tests green |
| FR-05 | Refusal without `autoRestart` or with a bad config | `handoff-command.ts:50-56`; `decideManualHandoff` | TC-03, TC-10 | conformant | Off line, zero submit, guard unchanged |
| FR-06 | Refusal by kill switch or non-interactive surface, with the code logged | `handoff-command.ts:45-48`; `auto-restart-policy.ts` `standDownCode` | TC-03, TC-11 | conformant | Notice as `{ text }`, one log code, no `ui.log`, zero submit |
| FR-07 | Focus normalization and 500-character cut | `manual-handoff.ts` `normalizeFocus` | TC-02 | conformant | `"  a\nb  "` → `a b`; blank → none; 600 → 500 |
| FR-08 | Restart only on the signal | Existing flow unchanged | TC-12 | conformant | No clear without the signal; clear and seed with it |
| FR-09 | Handoff stale and missing checks unchanged | Existing flow unchanged | TC-13 | conformant | `SKIP_HANDOFF_STALE` and `RESTARTED` |
| FR-10 | Guards unchanged; reset only on submit | `handoff-command.ts:40` after every check | TC-09, TC-11, TC-14 | conformant (see optional improvement 1) | Refusals leave the counter; `RESTARTED` at the limit. A throwing `$.clock.after` resets the counter with no submit (probe); the acceptance criterion names only refusals (FR-05, FR-06) |
| FR-11 | Not `immediate`; runs when idle | `HANDOFF_COMMAND` has no `immediate` | TC-07 | conformant (spec); live part not verifiable | MA-03, owner the user |
| FR-12 | Existing reason codes only | No change to codes, restart-log schema, or doctor schema | TC-17 | conformant | `npm run schemas:check` exit 0 in this review |
| FR-13 | `MOD_VERSION` changes for the `doctor` drift | `mod-info.ts:3` stays `1.2.0` | TC-16 (version invariant) | pending (accepted) | DEC-09, AUTO-03, A-02; accepted open item for HIL 3 |
| FR-14 | README bullet; wizard unchanged | `README.md` "Manual handoff" bullet | TC-17 diff | conformant | Both modes, refusals, loop-guard reset; no diff in `src/cli/assistant/` |
| NFR-01 | Documented API members only | `mod/host.ts` | review; TC-16 | conformant | `command.register`, `command.run` filter, `prompt.submit`, `clock.after` (DEC-10) |
| NFR-02 | Focus and prompt never stored | `handoff-command.ts:26-43`; only codes reach `recordDecision` | TC-15 | conformant | Log has `RESTARTED`, no focus, no `/handoff` |
| NFR-03 | Pure `core` prompt builder | `core/services/manual-handoff.ts` | TC-01; QA-04, QA-07 | conformant | No infrastructure import; no clock |
| NFR-04 | Seed reaches the new session (wait for the id, 100 ms, 3 s cap) | `mod/session-switch.ts`; `mod/restart-host.ts`; `mod-info.ts` | TC-05, TC-06 and 5 failure cases (`claude-mod-seed-switch.test.ts`, 7 tests) | conformant (in process); live timing not verifiable (MA-04) | Suite green in this run |
| NFR-05 | No uncaught exception in the command hook | `handoff-command.ts:58-69`; timer rejection to `reportSafely` (`:31-33`) | TC-15 (store write failure; rejected submit); probe with a throwing `$.clock.after` | conformant | Failure line and `ERROR_INTERNAL`; rejected submit gives `ERROR_INTERNAL` and its notice |
| NFR-06 | `ContextBrake: ` lines in English | `manual-handoff.ts` line constants | TC-08..TC-11 | conformant | Lines equal the TechSpec text |
| NFR-07 | Claude Code 2.1.287+ on all platforms | DEC-04; seed fallback | TC-08; seed-switch failure cases | conformant for an absent `command.register`; platforms and versions not verifiable | Linux and macOS not run; P-05 open; `/handoff` now needs `$.clock.after` (see limitations) |
| DEC-06 (revised) | Submit from a `$.clock.after(100)` timer after the hook returns; rejection → `ERROR_INTERNAL` | `handoff-command.ts:31-37`; `mod-info.ts:10` `HANDOFF_SUBMIT_DELAY_MS` | BUG-01 test; fake `prompt.submit` rejects with the host text while `isCommandHookRunning` (`claude-mod-host-ports.ts`, `claude-mod-scene.ts` `driver`) | conformant | Kit probe on Claude Code 2.1.306: 0 submits after the hook returns and after 50 ms; 1 submit after 500 ms |
| OBJ-01, OBJ-04, MA-01..MA-05 | Live acceptance | — | — | not verifiable | Owner the user (HIL 3); MA-01 failed in `qa_02` before T06 |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` architecture (core has no infrastructure import; harness shapes in the adapter) | OK | QA-04 no hit; command and event types only in `mod/host.ts` |
| `code-standards.md` (sensitive data out of logs; small units) | OK | QA-06 review; largest touched file 99 lines (`tests/fixtures/claude-mod-scene.ts`) |
| `javascript-typescript.md` (no `any`, no suppressions; no catch only to ignore) | OK | QA-01..QA-03 no hit; `npm run lint`, `npm run typecheck` exit 0; `handoff-command.ts` catches print a line or record a code |
| `node.md` / mod host rules (no Node import or sync API in the mod; `$` only to top-level functions) | OK | QA-05 no hit; TC-16 green; `claude plugin validate` passed on the current build |
| `tests.md` (in process; temporary directories; fake timers) | OK | Fake `clock.after` runs as a macrotask (`setImmediate`); fake host check models the vendor refusal; no child process in the suite |
| `harness-adapters.md` (research section, adapter, and fixtures in the same change) | OK | `docs/research/harness-integrations.md:62` records the host check text and the timer submit; fixtures model it |
| `cli-output.md` | OK | Lines unchanged from `codereview_02`; English, `ContextBrake: ` prefix |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `rg -n ':\s*any\b\|\bas any\b\|<any>' files` | 0 of 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n '@ts-ignore\|@ts-nocheck\|eslint-disable' files` | 0 of 0 | OK |
| QA-03 | empty `catch` or `.catch(() => {})` | blocking | `rg -nU 'catch\s*(\([^)]*\))?\s*\{\s*\}\|…' files` | 0 of 0 | OK |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `rg -n "from '(\.\./)+(infrastructure\|cli)/" core_files` | 0 of 0 | OK |
| QA-05 | sync API, Node import, `process.env`/`process.stdout` in the mod | blocking | ripgrep over `src/infrastructure/harnesses/claude-code/mod/`; TC-16 | 0 of 0 | OK |
| QA-06 | prompt, focus, or reply text written to a log or file | blocking | review of `recordDecision`, `ui.log`, `fs.write`, `reportSafely` sites in `handoff-command.ts`, `restart-host.ts`, `session-switch.ts`, `register.ts`; TC-15 | 0 (only reason codes and constant lines) | OK |
| QA-07 | clock or randomness in `core` | reservation | `rg -n 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' core_files` | 0 of 0 | OK |
| QA-08 | 4+ parameters; file above 100 lines; function above 30 lines | reservation | parameter regex; `rg -c -H '^' files \| awk -F: '$2 > 100'`; reading of the longest functions | 0 (largest file 99 lines) | OK |

- Verification scope: 19 TypeScript files of the diff; `core_files` = `auto-restart-policy.ts`, `manual-handoff.ts`, `zone-guidance.ts`.
- Terrain baseline: applied from the TechSpec (commit `c17fd0a`).
- Hits discounted by baseline: 0.
- Reservations accumulated in the feature: 0 profile hits.
- Suggested escalation: no trigger fired (0 reservation hits, no touched file above 200 lines, no block duplicated 3 times). `tests/fixtures/claude-mod-scene.ts` is at 99 lines, 1 line below the QA-08 limit.

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01..DEC-05 | YES | Unchanged since `codereview_02`; suites green |
| DEC-06 (revised by qa_02) submit from a `$.clock.after(HANDOFF_SUBMIT_DELAY_MS = 100)` timer, not awaited, rejection to `ERROR_INTERNAL` | YES | `handoff-command.ts:31-37`; `mod-info.ts:10`; BUG-01 test; kit probe |
| DEC-07 seed after the id switch, 100 ms poll, 3 s cap | YES | `session-switch.ts`; seed-switch suite 7 tests |
| DEC-08, DEC-09, DEC-10, DEC-11, DEC-12 | YES | Diff; TC-16; TC-15 |
| DEC-13 fixture split | YES | `claude-mod-command.ts` 33 lines, `claude-mod-host-ports.ts` 56 lines, `claude-mod-host.ts` 77 lines, `claude-mod-scene.ts` 99 lines |
| "Integrations and interfaces": the `command.run` hook never throws, writes no file, runs no `command.run` | YES | `handoff-command.ts:63-69`; TC-09 |
| "Risks and open items", first risk | PARTIAL (text only) | The text still describes a submit "from inside the command run"; DEC-06 replaced that mechanism. No code impact |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | Core prompt, focus, decision; 14 unit tests green |
| T02 | `done/task_02.md` | COMPLETE | Seed wait, host types, fake ports; seed-switch suite green |
| T03 | `done/task_03.md` | COMPLETE | Registration and handler; command suite 10 tests, restart suite 7 tests green |
| T04 | `done/task_04.md` | COMPLETE | README bullet and research entry present; `schemas:check` exit 0 |
| T05 | `codereview_01/done/task_05.md` | COMPLETE | Seed fallbacks; seed-switch failure cases green |
| T06 | `qa_02/done/task_06.md` | COMPLETE | T06.1..T06.5 checked. Deferred submit in code; fake host check and macrotask timers in fixtures; BUG-01 test; DEC-06 and research text updated; T06.5 probe reproduced in this review. The requirement "a throwing `$.clock.after` gives the failure line" has no suite test; this review verified it with a probe |

## Executed validations

- Profile and scope: runtime surfaces `core` and the Claude Code mod; in-process tests (CLI policy in `AGENTS.md`); no new e2e file. The built CLI and bundle were run against a temporary repository in the scratchpad.
- Validated state: working tree on base `c17fd0a` as listed above. `git status --porcelain` (24 entries) and the 3 source hashes were the same at the start and at the end of the review. Windows 11, Node 24.20.0, Claude Code 2.1.306, `dist/` rebuilt in this review.
- Reused evidence: none. Every result below comes from this review.
- Manual acceptance: MA-01..MA-05 open (owner the user). The installed mod in this repository (`.context-brake/claude-mod/context-brake-restart/hooks/register.mjs`) differs from the current `dist/assets/runtime/claude-code-mod.mjs` (`cmp`: first difference at byte 707727), so the live retest needs `init` again first.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed (exit 0) | QA-01, QA-02, rules |
| `npm run typecheck` | passed (exit 0) | NFR-01, DEC-10 |
| `npm run schemas:check` | passed (exit 0) | FR-12, TC-17 |
| `npm run build` | passed (exit 0) | TC-16 prerequisite |
| `npm run coverage` | passed (exit 0): 292 files, 1578 passed, 1 skipped; 96.38% statements, 93.35% branches; 158.9 s. `claude-mod-handoff-command` 10, `claude-mod-handoff-restart` 7, `claude-mod-seed-switch` 7, `claude-mod-bundle` 3, `manual-handoff` 14, `zone-guidance` 19 tests | TC-01..TC-16, T05, T06, regression |
| `node dist/src/cli/main.js init --harness claude-code --auto-restart --yes` in a temporary git repository | passed (exit 0); installed `register.mjs` byte-equal to `dist/assets/runtime/claude-code-mod.mjs` | QA-E2E-01 prerequisite |
| `claude plugin test .` on a copy of the installed plugin folder with `qa_02/evidence/kit-probe.test.ts.txt` as stored | 1 pass: the accepted line; 1 `prompt.submit` with the exact prompt. `LOGS` has 1 `ERROR_INTERNAL` notice, already present after `session.start` | qa_02/BUG-01, DEC-06 |
| Same probe with `session.id` and `fs.stat` mocked and stage logging | 1 pass: 0 logs; 0 submits after the hook returned and after 50 ms; 1 submit with the exact prompt after 500 ms | qa_02/BUG-01, DEC-06, FR-03 |
| `claude plugin validate .` on the same copy | "Validation passed" (plugin-directory icon warning only) | NFR-01, mod host rules |
| `npx tsx` probe (scratchpad): scene with `clockFailure = true`, `consecutive` 2, `/handoff parser bug` | failure line; `ERROR_INTERNAL`; 0 submits; 0 `ui.log` lines; guard `{ consecutive: 0 }` | NFR-05, FR-10, T06 requirement |
| Quality profile QA-01..QA-08 | 0 hits | Quality profile |

The `ERROR_INTERNAL` notice in the first probe run comes from the probe, not from the mod. The stored probe file does not mock `session.id` and `fs.stat`, so the `session.start` hook fails. With both mocked, the notice is gone. The T06 handoff says the probe gave "no `ui.log` line", which does not match a run of the evidence file as stored.

## Findings

No finding in this review.

Optional improvements (not findings; no requirement acceptance criterion or profile rule depends on them):

1. `handoff-command.ts:39-43`: `startHandoff` awaits `resetConsecutive` and then calls `$.clock.after`. When `$.clock.after` throws (absent on an older host, P-05), the command answers the failure line and records `ERROR_INTERNAL` with no submit, but the counter is already reset (probe above). FR-10 says the command resets the counter "only when it submits its prompt". The FR-10 acceptance criterion names only refusals, and A-03 treats the typed command as the person's request, so this review does not reject on it. A correction can reset the counter inside the timer callback before the submit, or schedule the timer first and cancel it when the reset fails. It can also add a command-path test with `clockFailure`, which today only the seed-path suite uses.
2. `qa_02/evidence/kit-probe.test.ts.txt`: add the `session.id` and `fs.stat` mocks so that the stored evidence runs without the `session.start` error notice.

Accepted optional improvements from `codereview_02` (AUTO-06) are not repeated.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| qa_02/BUG-01 | resolved | `handoff-command.ts:35-37` submits from a `$.clock.after` timer. The fake `prompt.submit` rejects with the host text while a `command.run` hook runs, and the BUG-01 test and TC-09 pass with it. Kit probe on Claude Code 2.1.306 with the current build: 1 `prompt.submit` with the exact prompt, after the hook returned. Live confirmation stays with MA-01 |
| codereview_02 (no finding) | — | The 2 optional improvements are accepted open items (AUTO-06) |
| codereview_01/CR-01, CR-02 | resolved (unchanged) | Resolved in `codereview_02`; seed-switch suite green; source hashes equal `approved_sources` |

## Limitations and open items

- MA-01..MA-05 are not verifiable in this review. The TechSpec assigns them to the user as essential manual acceptance. FR-02, the live parts of FR-11 and NFR-04, and OBJ-01 and OBJ-04 stay open until then. The live retest needs `init` again, because the installed mod in this repository is older than `dist/`.
- New dependency from T06: `/handoff` now needs `$.clock.after`. Before T06, only the seed wait used it, with a fallback (codereview_01/CR-01). On a host without `$.clock.after`, every `/handoff` answers the failure line and records `ERROR_INTERNAL`. This is safe by DEC-04 and NFR-05. The first Claude Code version with `$.clock.after` and `$.command.register` stays unknown (P-05, NFR-07).
- FR-13 stays pending by DEC-09, AUTO-03, and A-02 until the next release bump.
- NFR-07: Linux and macOS are not verified.
- `.gitignore` (managed block, 3 statusline lines removed) is in the diff but is not feature code. It comes from an `init` run in this repository. Item for `workflow.md` (this reviewer does not write it): keep it out of the feature commit, or accept it as the output of the current `init`.
- `context-snapshot.md` is behind (`covers_through: qa_01`; the stage source shows `qa_02` and T06 done). Item for `workflow.md`: refresh the snapshot at the next pause.
- TechSpec "Risks and open items" still describes the pre-T06 submit from inside the command run. Item for `workflow.md`: update the text to the timer submit of DEC-06. No code impact.
- The T06 handoff says the stored probe gave no `ui.log` line; a run of that file as stored gives 1 line from `session.start` (missing mocks). Evidence-accuracy note; the code is correct.

## Conclusion

The re-review finds no finding. qa_02/BUG-01 is resolved: the command now submits its prompt from a `$.clock.after` timer after the hook returns. The fake host models the vendor refusal, the BUG-01 test and TC-09 pass, and a kit probe on Claude Code 2.1.306 with the current build shows 1 `prompt.submit` with the exact prompt. The quality profile has 0 hits. Lint, typecheck, schemas check, build, coverage (1578 tests), and `claude plugin validate` pass.

The status is APPROVED WITH RESERVATIONS for the same reasons as `codereview_02`. FR-13 is pending by DEC-09. FR-02 and the live parts of FR-11, NFR-04, OBJ-01, and OBJ-04 are not verifiable in process; the TechSpec assigns them to the user. 2 optional improvements are recorded: the counter reset before a failed timer schedule, and the incomplete stored probe. Next: a QA run (`qa_03`), then `init` again and the live retest MA-01..MA-05.
