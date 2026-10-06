# Code review report — Automatic restart in interactive Claude Code (PRD-11), re-review after round 2

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `c7529c56dd243e08f48b7692cd6b8f566767e5b4..worktree`. HEAD equals the base, so the whole feature and the round 1 and round 2 corrections are uncommitted. `git status --porcelain` shows 66 lines (36 modified tracked paths and 30 untracked entries), the same count before and after this review's commands. `.agents/settings.local.json` was already there before the feature.
- Previous review: `tasks/prd-11-reinicio-automatico-no-claude-code/codereview_02/codereview.md` (correction T12 in `codereview_02/done/`)

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-11-reinicio-automatico-no-claude-code/prd.md` | read; sha256 `926099af…` matches `checkpoint.json#approved_sources` (DEC-PD-03) |
| TechSpec | `tasks/prd-11-reinicio-automatico-no-claude-code/techspec.md` | read; sha256 `60f053e9…` matches (DEC-HIL-02) |
| Manifest | `tasks/prd-11-reinicio-automatico-no-claude-code/tasks.md` | read; sha256 `0677629c…` matches (REC-T10); `## State` has T01 to T07 checked `[x]`, and all seven files are in `done/` |
| Handoffs | `done/task_01.md` to `task_07.md`; `codereview_01/done/task_08.md` to `task_11.md`; `codereview_02/done/task_12.md` | each has a `## Handoff` section, and `grep "^- \[ \]"` finds no unchecked work item in any of them; T12 read in full |
| Workflow | `workflow.md` (DEC-PD-00 to CORR-R2) | read |
| Snapshot | `context-snapshot.md` | loaded only through the independent-stage filter: header, next step brief, O-05, and the on-run entries L-04, L-06 and L-09. `git_head` c7529c5 matches HEAD. `covers_through` (T12 in `codereview_02/done/`) matches the stage source. No entry was used for judgement. |
| Implementation | worktree diff against the base: 65 TypeScript files plus schemas, docs, fixtures and README; T12 changes `auto-restart-planner.ts`, `auto-restart-planner.test.ts` and `e2e/auto-restart.test.ts` | delimited |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | `/clear` when a turn ends with the signal; nothing without it | `mod/restart-flow.ts:handleTurnComplete` (52-64), `queueClear` (48-50); `core/services/reset-notice.ts:endsWithResetSignal` | TC-01, TC-02, TC-09 | conformant | `restart-flow.ts:53` ignores subagent turns and turns that did not end with an answer; `claude-mod-restart` passes when run alone |
| FR-02 | One seed after the mod's own clear, with text per mode; no seed for a typed `/clear` | `restart-flow.ts:seedAfterClear` (34-37), `submitSeed` (26-32); `auto-restart-notices.ts:seedText` | TC-10, TC-11, TC-28 | conformant | the seed is tied to the `command.run` promise |
| FR-03 | Checkpoint gate in full mode; no state reads in light mode | `mod/restart-facts.ts:checkpointState` (32-40), `gatherFacts` (42-50) | TC-03, TC-12, TC-28 | conformant | `restart-facts.ts:48`: light mode returns `'valid'` without reading any file; OI-04 persists (optional) |
| FR-04 | Pause after N consecutive restarts; a typed prompt resets the count | `core/services/auto-restart-policy.ts:guardCode` (34-37); `mod/mod-guards.ts`; `hooks.ts:onPromptSubmit` | TC-04 | conformant | manual check waived (DEC-MA-03) |
| FR-05 | No restart when the seeded session did no work | `auto-restart-policy.ts:36`; `mod-guards.ts:foldToolCalls`, `markSeeded` | TC-05 | conformant | — |
| FR-06 | Stand down on the env switch, in a runner session, or when non-interactive | `restart-facts.ts:standDownFacts` (14-21) | TC-06 | conformant | `claude plugin validate` lists env reads `CONTEXT_BRAKE_AUTO_RESTART`, `CONTEXT_BRAKE_RUN_ID`, `DISABLE_AUTO_COMPACT` |
| FR-07 | Opt-in install through `init`; idempotent; nothing left when switched off | `cli/init-arguments.ts`, `init-config-updates.ts`, `core/services/auto-restart-merge.ts`, `claude-code/auto-restart-planner.ts` | TC-08, TC-17, TC-18, TC-20, TC-21, TC-25 | non-conformant | install and idempotency conform. The bridge-created file case is fixed (repros s1 and s2). However, `init --no-auto-restart` deletes a user-created local settings file that has no keys left after the mod keys are removed (s6, CR-01) |
| FR-09 | `remove` deletes what `init` wrote, and only that; edited files are reported | `auto-restart-planner.ts:settingsChange` (58-66), `removalChanges` (39-46); `planner.ts:75` | TC-19, TC-25 | non-conformant | CR-01: with the default bridge, `init --auto-restart` then `remove --yes` deletes a `.claude/settings.local.json` the user had created as `{}` or with only a comment (s3, s4, s8). The controls without `--auto-restart` keep that file (s5, s9) |
| FR-08 | `doctor` reports off, ready, and named problems; JSON validates | `claude-code/auto-restart-diagnostics.ts`; `adapter.ts:68-69` | TC-22, TC-23 | conformant | `auto-restart-doctor` and `e2e/auto-restart` pass |
| FR-10 | Log holds codes only; one-line notice | `mod/mod-log.ts`; `restart-flow.ts:report`; `contracts/auto-restart.ts` | TC-07, TC-14 | conformant | — |
| FR-11 | README, protocol doc, and research section with date and version | `README.md:297-310`, `docs/context-brake-protocol.md`, `docs/research/harness-integrations.md:57-59` | TC-26 | conformant | OI-06 (optional): research line 59 still says the first interactive trust prompt is unverified |
| NFR-01 | No shell, `setsid` or local server; no `node:` import in the mod | `mod/*.ts`, `assets/runtime/claude-code-mod.ts` | TC-15; QA-05 0 hits | conformant | Linux and macOS not run here (limitation) |
| NFR-02 | No conversation text stored; no network | `mod-log.ts`, `modLogSchema` | TC-07, TC-14 | conformant | validator: "env writes: nothing"; no network API among the listed calls |
| NFR-03 | Schema stays v1; only optional fields added | `contracts/configuration.ts`; `schemas/*.json` | TC-08, TC-24 | conformant | `npm run schemas:check` exit 0 |
| NFR-04 | Errors never block a tool call or leave a session half cleared | `hooks.ts` wrappers; `restart-flow.ts:seedAfterClear`, `abandonRestart` | TC-13 | conformant (code); see CR-02 for the test | its store-failure case failed once under the full coverage run and passed 3 of 3 runs alone |
| NFR-05 | Zero files and hooks when off | `auto-restart-planner.ts:fileChanges`; `mod-config.ts:36` | TC-18 | conformant | — |
| OBJ-01 / OBJ-02 | Restart without a keystroke; no discarded work, no loop | as above | TC-01 to TC-12, TC-27 | partially not verifiable | TC-27 ran in light mode on Windows only (DEC-MA-02, DEC-MA-03) |
| OBJ-03 / OBJ-04 | Safe install, doctor and remove; zero cost when off | as above | TC-17 to TC-25 | non-conformant | CR-01 |
| CMP-07 | Capability `auto_restart` | `core/contracts/harness.ts:22`; `claude-code/capabilities.ts:11`; seven other profiles | `tests/unit/harness-adapters.test.ts` | conformant | DEC-CR-04 |
| TC-27 | MA-01 manual acceptance | `done/task_07.md#Handoff` | manual | not verifiable (partially waived) | release gate "Windows and one POSIX system" not met; accepted gap for HIL 3 (DEC-MA-03) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` architecture | OK | QA-04 0 hits; mods API names appear only under `claude-code/` and `assets/runtime/` |
| `code-standards.md` (100 lines, 3 parameters) | NOT OK (reservation) | `src/core/services/installation-service.ts` 102 lines (QA-11, unchanged since round 1); `auto-restart-planner.ts` 87 lines |
| `javascript-typescript.md` | OK | QA-01/QA-02 0 hits; `npm run typecheck` exit 0 |
| `node.md` | OK | QA-05 0 hits; TC-15 |
| `harness-adapters.md` | OK | capability declared `unknown` for Claude Code |
| `file-changes.md` | NOT OK | CR-01. The rule says "`remove` deletes only what ContextBrake created" and asks to preserve "comments where the format allows them". The planner deletes a user-created local settings file, including one that holds a user comment |
| `cli-output.md` | OK | text labels in notices and findings; the remove plan prints `[delete] .claude/settings.local.json` |
| `tests.md` | NOT OK | No test covers a pre-existing user local settings file that has no keys left once the mod keys are removed: TC-20 and TC-25 seed a file that has a user key, and the T12 cases start with no file. One test depends on a fixed 20 ms wait (CR-02) |
| `sdd-review-code` state consistency | OK | manifest, `done/` folders, handoffs and approved hashes agree |

## Quality profile

Scope: the 65 TypeScript files in the diff (`git diff --name-only c7529c5 -- '*.ts'` plus untracked `*.ts`). `core_files` is the 10 of them under `src/core/`. `mod_files` is the 11 under `claude-code/mod/` plus `assets/runtime/claude-code-mod.ts`. All commands ran with `rg -n` in this session.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | No `any` | blocking | `rg -n ':\s*any\b\|\bas any\b\|<any>' $files` | 0 | OK |
| QA-02 | No ts/eslint suppressions | blocking | `rg -n '@ts-ignore\|@ts-nocheck\|eslint-disable' $files` | 0 | OK |
| QA-03 | No empty `catch` | blocking | `rg -n -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|…' $files` | 0 | OK |
| QA-04 | core imports no infrastructure/cli | blocking | `rg -n "from '(\.\./)+(infrastructure\|cli)/" $core_files` | 0 | OK |
| QA-05 | No `node:`/sync I/O/process in mod | blocking | `rg -n "from 'node:\|readFileSync\|…\|process\.(stdout\|env)" $mod_files` | 0 | OK |
| QA-06 | `$` used as `$.namespace.method` | blocking | `claude plugin validate` on `.context-brake/claude-mod` and `…/context-brake-restart` installed by the built CLI in scratch `s10` (Claude Code 2.1.291) | 0 failures | OK: "Validation passed" for both, with every `$.*` call listed. The validator also prints the informational "gating hook without .catch" for `tool.call` and `prompt.submit`, as in round 2 |
| QA-07 | No `exec`/`shell: true` | blocking | `rg -n '\bexecSync\(\|\bexec\(\|shell:\s*true' $files` | 0 | OK |
| QA-08 | Generic `throw new Error(` | reservation | `rg -n 'throw new Error\(' $files` | 3 new of 12 | 9 were there at the base: `scripts/check-package.ts` ×8 (8 at `c7529c5`) and `scripts/asset-bundler.ts:72` (1 at base). New: `tests/fixtures/claude-mod-host.ts:41,62,70` (test fake) |
| QA-09 | Clock/randomness in core | reservation | `rg -n 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' $core_files` | 0 | OK |
| QA-10 | 4+ parameters | reservation | TechSpec regex (`rg -P`) | 0 real of 2 | false positives: `auto-restart-settings.ts:26` (3 parameters; the regex counts a comma inside a generic), `tests/unit/auto-restart-policy.test.ts:45` (array literal) |
| QA-11 | File above 100 lines | reservation | `wc -l` over `$files`, `> 100` | 1 | `src/core/services/installation-service.ts` 102 lines (100 at base) |

- Terrain baseline: applied from the TechSpec (`QA-08: scripts/asset-bundler.ts:71`, now at :72) and checked against `git show c7529c5` for `scripts/check-package.ts`.
- Hits discounted by baseline: 9
- Reservations accumulated in the feature: 4 (QA-08 ×3, QA-11 ×1)
- Suggested escalation: no trigger fired (4 reservations, below 8; largest touched file 102 lines; no duplication found in 3 or more places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 trigger on `turn.complete` | YES | `restart-flow.ts:53-56` |
| DEC-02 un-awaited `/clear` | YES | `restart-flow.ts:48-50` |
| DEC-03 seed when the clear resolves | YES | `restart-flow.ts:49`, `34-37` |
| DEC-04 fixed seed text, per mode | YES | `auto-restart-notices.ts:4-5,24-26` |
| DEC-05 checkpoint gate | YES | `restart-facts.ts:32-40` |
| DEC-06 store guards | PARTIAL | raw root in the key, no `seededAt` (OI-01) |
| DEC-07 stand-down inputs | YES | `restart-facts.ts:14-21` |
| DEC-08 marketplace + `enabledPlugins` | YES | `auto-restart-settings.ts:20-24`; loader keys kept under the status line opt-out |
| DEC-09 optional `autoRestart` block | YES | `contracts/auto-restart.ts:18`, `configuration.ts:78` |
| DEC-10 per-session log | YES | `mod-log.ts` |
| DEC-11 failure containment | YES | `hooks.ts` wrappers; `register.ts` always returns `next(e)` |
| DEC-12 absorption | YES | `planner.ts` 77 lines, `claude-hooks-config.ts` |
| DEC-13 fixtures from a real session | YES | TC-16 |
| DEC-14 gate per mode | YES | `mod-config.ts:37-40`, `restart-facts.ts:48` |
| Errors, security, recovery: "User files: the planner edits only the `extraKnownMarketplaces.context-brake-local` and `enabledPlugins[…]` keys of `.claude/settings.local.json` … `file-changes.md` applies" | NO | CR-01: on switch-off the planner deletes the whole user file, not just those keys |
| Rollback: `init --no-auto-restart` removes the files, the two settings keys and the config block | YES for files that ContextBrake created (s2); NO for user files (s6) | CR-01 |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | real-session probe on 2.1.289, fixtures |
| T02 | `done/task_02.md` | COMPLETE | extraction; `planner.ts` 77 lines |
| T03 | `done/task_03.md` | COMPLETE | core policy, notices, contract |
| T04 | `done/task_04.md` | COMPLETE | mod glue, bundle, fake host; QA-06 re-run here on 2.1.291 |
| T05 | `done/task_05.md` | COMPLETE with a defect | its open item "Deleting a settings.local.json that becomes `{}` … also removes a user-created empty file" was never decided by a `DEC-*`; it is now part of CR-01 |
| T06 | `done/task_06.md` | COMPLETE | doctor findings, e2e |
| T07 | `done/task_07.md` | COMPLETE with waived manual scope | docs, TC-26, MA-01 light/Windows |
| T08 to T11 | `codereview_01/done/` | COMPLETE | verified in codereview_02; behavior unchanged (s7 and the CR-01 e2e case of codereview_01 pass) |
| T12 | `codereview_02/done/task_12.md` | COMPLETE with a defect | its own repros pass (s1, s2; planner it.each and the new e2e case pass). Removing the `base.existing === undefined` guard extended the deletion to user-created files in the default bridge flow (CR-01) |

## Executed validations

- Profile and scope: the CLI (`init`, `doctor`, `remove`) through unit, integration and built-CLI e2e tests, plus direct built-CLI runs in scratch repositories with `HOME`/`USERPROFILE` set to a scratch home; the mod through the fake host and `claude plugin validate`. No browser or UI checks (AGENTS.md).
- Validated state: worktree on `c7529c5` with the uncommitted feature diff, T08 to T11 and T12; Windows 11, Git Bash, Node via npm scripts; Claude Code 2.1.291 for QA-06.
- Reused evidence: the T01 and T07 real-session runs (a delegated reviewer has no interactive Claude Code session).
- Manual acceptance: MA-01 is recorded in `done/task_07.md` for light mode on Windows; full mode, the loop guard and POSIX were waived (DEC-MA-02, DEC-MA-03).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | CMP-05, package assets |
| `npm run coverage` (background, after the build) | failed: 320 files, 2040 passed, 1 failed, 3 skipped. The failure is `claude-mod-restart.test.ts` "sends the seed and logs an internal error when the store write fails after the clear" (`expected ['RESTARTED'] to deeply equal ['RESTARTED','ERROR_INTERNAL']`). Vitest printed no coverage table | TC-01 to TC-26, TC-28, existing suites; CR-02 |
| `npx vitest run tests/integration/claude-mod-restart.test.ts` ×3 | passed 9/9 each time | TC-09 to TC-13 |
| `npx vitest run` on `auto-restart-planner`, `auto-restart-removal`, `e2e/auto-restart` | passed 14/14 | TC-17 to TC-20, TC-25, T12 |
| `npm run lint` | passed | rules |
| `npm run typecheck` | exit 0 | rules |
| `npm run schemas:check` | exit 0 | TC-24, NFR-03 |
| `npm run package:smoke` (includes `assets:check`) | exit 0 | CMP-05 |
| quality profile commands above | see Quality profile | QA-01 to QA-11 |
| `claude plugin validate` on the marketplace and the plugin (2.1.291) | passed | QA-06, NFR-01, NFR-02 |
| built CLI s1: no local settings file; `init --yes --auto-restart`; `remove --yes` | local settings file absent afterwards | codereview_02/CR-01 (r2) |
| built CLI s2: no local settings file; `init --yes --auto-restart`; `init --yes --no-auto-restart --no-statusline-bridge` | file absent afterwards | codereview_02/CR-01 (r3) |
| built CLI s3: user file `{}\n`; `init --yes --auto-restart`; `remove --yes` | user file deleted | CR-01 |
| built CLI s4 / s8: user file `{\n  // keep me\n}\n`; `init --yes --auto-restart`; `remove` (`--dry-run` shows `[delete] .claude/settings.local.json (harness_entry)`) | user file and its comment deleted | CR-01 |
| built CLI s5 / s9 (controls): same user files; `init --yes` without `--auto-restart`; `remove --yes` | user file kept (s5 with its comment, s9 as `{}`) | CR-01 baseline |
| built CLI s6: comment-only user file; `init --yes --auto-restart --no-statusline-bridge`; `init --yes --no-auto-restart` | user file deleted (present since T05) | CR-01 |
| built CLI s7: user file `{}\n`; `init --yes --auto-restart`; `init --yes --no-auto-restart` (bridge stays on) | file kept with the bridge `statusLine` | FR-07 |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Medium | FR-09, FR-07, OBJ-03, `file-changes.md` ("`remove` deletes only what ContextBrake created"; preserve comments), TechSpec "Errors, security, and recovery — User files" | Cause: `src/infrastructure/harnesses/claude-code/auto-restart-planner.ts:62` sets `drop = !wanted && isEmptySettings(text)`. That check ignores who created the file. `isEmptySettings` (`auto-restart-settings.ts:36-38`) counts parsed keys, so a file holding only a JSONC comment also counts as empty. T12.1 removed the old `base.existing === undefined` guard. Since then, the status line restore's `update` of a user-created file (`statusline-restore.ts:35`, because `createdLocalFile` is false) is turned into a `delete`. The status line restore itself deletes only a file it created whose text is literally `{}` (`statusline-restore.ts:31`). Reproduced with the built CLI: s3 (`{}`), s4 and s8 (comment-only) in the default flow (introduced by T12), and s6 under `--no-statusline-bridge` (present since T05; noted as an open item in the T05 handoff, never decided). The controls s5 and s9 without `--auto-restart` keep the file. | `remove --yes` or `init --no-auto-restart` deletes a user file ContextBrake did not create, losing its user comments. The repository no longer matches its pre-install state | Delete the local settings file only when ContextBrake created it, for example from the bridge's `createdLocalFile` record or an equivalent record written when `init --auto-restart` creates the file. Treat "empty" as the text being literally `{}` apart from whitespace, as `statusline-restore.ts:31` does, so comments survive. Otherwise plan the `update` without the mod keys. Add planner and built-CLI cases that seed a user `{}\n` file and a comment-only file and check that each survives `remove --yes` and `init --no-auto-restart` (with and without the bridge), keeping the T12 cases for files ContextBrake created. A correction may need to read `statusline-restore.ts` or its state, which T12 left out of scope |
| CR-02 | Low | `tests.md`, TC-13, NFR-04 | `tests/integration/claude-mod-restart.test.ts:76-84` failed once in the full `npm run coverage` run (1 failed of 2044), and the failure suppressed the coverage table. It passed 3 of 3 runs alone. The test checks the log right after `settleClear`, which waits a fixed 20 ms (`tests/fixtures/claude-mod-scene.ts:67-70`, `claude-mod-host.ts:90-91`). In that branch the `ERROR_INTERNAL` record is written only after a store read, a rejected store write, and several real disk operations (`restart-flow.ts:35`, `mod-log.ts:34-38`, `claude-mod-host.ts:39-46`). | The mandatory full run is not reliably green, and coverage cannot be measured while the test fails. The product code path is not implicated | Cause still pending: the timing is consistent with the fixed 20 ms wait but was not proven by instrumentation. Candidate: wait for the expected log record (poll with a bound) instead of a fixed sleep |

Optional improvements (not blocking):

- OI-01 (DEC-06): `mod/mod-guards.ts:9-11` keys the store by the raw project root, and the record has no `seededAt`. Align the TechSpec or the code.
- OI-02 (QA-11): `src/core/services/installation-service.ts` is 102 lines.
- OI-03 (QA-08): `tests/fixtures/claude-mod-host.ts:41,62,70` throw a generic `Error` in the fake host.
- OI-04 (FR-03): `restart-facts.ts:37` skips the staleness check when this module instance saw no `turn.start`, so an old valid checkpoint passes after a reload mid-turn.
- OI-05 (FR-04): `restart-flow.ts:61-62` bumps `consecutive` before `report`. If the log write throws, no clear is queued, but the counter stays incremented.
- OI-06 (FR-11): `docs/research/harness-integrations.md:59` still lists the first interactive trust prompt as "Não verificado" (unverified), although DEC-MA-03 records that the human confirmed it works.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_02/CR-01 | resolved for its stated cases | `auto-restart-planner.ts:62,65`: a file the bridge created and that is left empty is now deleted. Built CLI s1 and s2 leave no local settings file; the planner `it.each` and the e2e case "restores the repository … after install and remove" pass. The fix widened deletion to user-created files: see CR-01 of this review |
| codereview_02/OI-01, OI-02, OI-04, OI-05 | persistent (optional) | `mod-guards.ts:9-11`; `installation-service.ts` 102 lines; `restart-facts.ts:37`; `restart-flow.ts:61-62` |
| codereview_02/OI-03 | persistent (optional) | `claude-mod-host.ts:41,62,70` |
| codereview_01/CR-01 to CR-04 | resolved (verified in codereview_02; no regression seen) | s7; `e2e/auto-restart` status line opt-out case passes; `auto_restart` capability present |

## Limitations and open items

- TC-27 / MA-01: full mode, the loop guard and the POSIX run were not executed by hand (DEC-MA-02, DEC-MA-03), so the TechSpec release gate "MA-01 passed on Windows and one POSIX system" is not met. The human accepted these gaps for HIL 3. This review does not count them as findings and cannot mark OBJ-01/OBJ-02 as manually verified.
- Real-session behavior was not re-run: a delegated reviewer has no interactive Claude Code session. The mod code did not change in round 2.
- The full `npm run coverage` run had one failing test (CR-02), so this review has no global coverage figure.
- Linux and macOS were not exercised; NFR-01 rests on the Windows runs here and on CI.
- `claude plugin validate` on 2.1.291 prints "gating hook without .catch" for `tool.call` and `prompt.submit` while passing. Both handlers are wrapped. Their meaning is not recorded in `docs/research/harness-integrations.md`, so this is not treated as a finding.
- For `workflow.md` (the caller records it): REV-03, delegated reviewer, `codereview_03/codereview.md`, status `REJECTED`. One Medium finding (CR-01, introduced in the default flow by T12 and present since T05 under `--no-statusline-bridge`) and one Low finding (CR-02, flaky test). The worktree has the same 66 `git status --porcelain` lines before and after this review. The only new path is `codereview_03/`; the build, test and scratch outputs went to `dist/`, `coverage/` and the system temp folder.

## Conclusion

Round 2 resolved codereview_02/CR-01 for files that ContextBrake created. Lint, typecheck, the schema check, package smoke and every blocking quality rule pass, and QA-06 passes on Claude Code 2.1.291. The review is REJECTED for two reasons. First, FR-09 and FR-07 are non-conformant: by deleting the local settings file whenever no keys remain, without checking who created it, T12 made `remove` (default bridge flow) and `init --no-auto-restart` delete a `.claude/settings.local.json` the user created, including its comments (CR-01, Medium, cause proven at `auto-restart-planner.ts:62`). Second, the mandatory full test run had one timing-sensitive failure (CR-02, Low). Manual acceptance stays partial by human decision and goes to HIL 3 as recorded.
