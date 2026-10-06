# Code review report — Automatic restart in interactive Claude Code (PRD-11)

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `c7529c56dd243e08f48b7692cd6b8f566767e5b4..worktree` (HEAD equals the base; the whole feature is uncommitted: 24 modified and 36 new paths from `git status --porcelain`, excluding the pre-existing `.agents/settings.local.json`)
- Previous review: `—`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-11-reinicio-automatico-no-claude-code/prd.md` | read; sha256 `926099af…` matches `checkpoint.json#approved_sources` (DEC-PD-03) |
| TechSpec | `tasks/prd-11-reinicio-automatico-no-claude-code/techspec.md` | read; sha256 `60f053e9…` matches (DEC-HIL-02) |
| Manifest | `tasks/prd-11-reinicio-automatico-no-claude-code/tasks.md` | read; sha256 `e2952f92…` differs from the approved `3567b592…` (state edits); `## State` inconsistent with `done/` (CR-02) |
| Handoffs | `done/task_01.md` to `done/task_07.md` | read; all seven in `done/` |
| Workflow | `workflow.md` (DEC-PD-00 to DEC-MA-03) | read |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter (header, next step brief, open threads, on-run L-04/L-06/L-09). `covers_through` (T07.1-T07.3) is behind the stage source (T07 in `done/` with MA-01 recorded): next step brief treated as stale. `git_head` c7529c5 matches HEAD |
| Implementation | worktree diff against the base, all `src/`, `assets/`, `scripts/`, `schemas/`, docs and test files listed in the handoffs | delimited |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | `/clear` on a turn ending with the signal; nothing without it | `mod/restart-flow.ts:handleTurnComplete` (49-59), `queueClear` (44-46); `core/services/reset-notice.ts:endsWithResetSignal` | TC-01, TC-02 (`unit/auto-restart-policy`), TC-09 (`integration/claude-mod-restart`) | conformant | one `command.run('clear')` per signal; subagent and non-answer turns ignored (`restart-flow.ts:49`) |
| FR-02 | One seed after the mod's own clear; per-mode text; none for a typed `/clear` | `restart-flow.ts:seedAfterClear` (26-33); `auto-restart-notices.ts:seedText` | TC-10, TC-11 (`claude-mod-restart`), TC-28 (`claude-mod-gates`), notices unit | conformant | seed tied to the `command.run` promise; MA-01 light-mode run on Windows saw one plugin prompt (task_07 handoff) |
| FR-03 | Full mode: checkpoint exists, valid, newer than turn start, step when a plan exists; light mode: no state read | `mod/restart-facts.ts:checkpointState` (32-40), `gatherFacts` (48); `mod-config.ts` gate from `isLightModeInEffect` | TC-03, TC-12 (`claude-mod-gates` it.each missing/invalid/stale, no-step), TC-28 | conformant | light mode reads only the config (`restart-facts.ts:48`); see optional improvement OI-04 on an unknown turn start |
| FR-04 | Pause after N consecutive restarts; typed prompt resets | `core/services/auto-restart-policy.ts:guardCode` (34-37); `mod/mod-guards.ts`; `hooks.ts:onPromptSubmit` | TC-04 (unit and `claude-mod-guards`) | conformant | `consecutive >= max` pauses; `composer`/`bridge` origins reset. Manual check waived (DEC-MA-03) |
| FR-05 | No restart when the seeded session did no work | `auto-restart-policy.ts:36`; `mod-guards.ts:foldToolCalls`, `markSeeded` | TC-05 (unit and `claude-mod-guards`) | conformant | — |
| FR-06 | Stand down: env switch, runner session, non-interactive; log line naming it | `restart-facts.ts:standDownFacts` (14-21); notices | TC-06 (unit order; `claude-mod-guards` it.each env/runner, surfaces) | conformant | `CONTEXT_BRAKE_RUN_ID` is set by the runner (`core/services/run-session.ts:32`) |
| FR-07 | Opt-in install through `init`, idempotent, removed when off, config validates | `cli/init-arguments.ts`, `init-config-updates.ts`, `core/services/auto-restart-merge.ts`, `claude-code/auto-restart-planner.ts`, `auto-restart-settings.ts` | TC-08, TC-17, TC-18, TC-20, TC-21, TC-25 | non-conformant | CR-01: `init --auto-restart --no-statusline-bridge` installs the mod files and config block but drops the loader keys; a second `init` then changes files |
| FR-08 | `doctor` off / ready / named problems with remediation; JSON validates | `claude-code/auto-restart-diagnostics.ts:diagnoseAutoRestart`; `adapter.ts:68-69`; `cli/commands/doctor.ts:41` | TC-22, TC-23 (`integration/auto-restart-doctor`, 8 tests) | conformant | `disableAllHooks`/policy reported as causes inside `AUTO_RESTART_NOT_LOADED`, as the TechSpec (Integrations, last bullet) allows |
| FR-09 | `remove` deletes only what `init` wrote; edited file reported | `auto-restart-planner.ts:removalChanges` (39-46); `planner.ts:75-76` | TC-19 (`integration/auto-restart-removal`), TC-25 | conformant | `MODIFIED_OWNED_ASSET` conflict for a hash mismatch |
| FR-10 | Log codes only; one-line notice for restart and skip | `mod/mod-log.ts`; `restart-flow.ts:report`; `contracts/auto-restart.ts:modLogSchema` (strict) | TC-07, TC-14 | conformant | strict record `{ at, code }`, cap 50 |
| FR-11 | README, protocol doc, research section with date and version | `README.md:297-…`; `core/services/protocol-service.ts` + regenerated `docs/context-brake-protocol.md`; `docs/research/harness-integrations.md:58-59` | TC-26 (`integration/docs-auto-restart`) | conformant | "no documented hook opens a new session" no longer present |
| NFR-01 | No shell, `setsid`, server; no `node:` in the mod | `mod/*.ts`, `assets/runtime/claude-code-mod.ts` | TC-15 (`claude-mod-bundle`) ; QA-05 empty | conformant | Linux/macOS only through CI, not run here (limitation) |
| NFR-02 | No conversation text stored; no network | `mod-log.ts`, `modLogSchema` | TC-07, TC-14 | conformant | — |
| NFR-03 | Schema v1, optional fields only | `contracts/configuration.ts` (`autoRestart: z.optional`) ; `schemas/context-brake.config.schema.json` | TC-08, TC-24 | conformant | see Executed validations for `schemas:check` |
| NFR-04 | Errors never block, lose a checkpoint, or leave a session half cleared | `hooks.ts` wrappers; `restart-flow.ts:abandonRestart`, `seedAfterClear` | TC-13 (`claude-mod-restart`) | non-conformant (Low) | CR-03: a store failure in `markSeeded` after the clear resolved suppresses the seed |
| NFR-05 | Zero files and zero hooks when off | `auto-restart-planner.ts:fileChanges`; `mod-config.ts:36` | TC-18 | conformant | — |
| OBJ-01 / OBJ-02 | Restart without keystroke; no discard, no loop | as above | TC-01 to TC-12, TC-27 | partially not verifiable | TC-27 (MA-01) ran in light mode on Windows only; full mode, loop guard and POSIX waived by DEC-MA-02 / DEC-MA-03 |
| OBJ-03 / OBJ-04 | Safe install/doctor/remove; zero cost off | as above | TC-17 to TC-25 | non-conformant | CR-01 |
| DEC-06 | Store key is a hash of the project root; record `{ consecutive, seededAt, toolCallsSinceSeed }` | `mod/mod-guards.ts:9-11`, `guardSchema` | `claude-mod-guards` | PARTIAL | raw root in the key, no `seededAt` (OI-01) |
| CMP-07 | Capability `auto_restart` | not implemented | — | non-conformant | CR-04 |
| TC-27 | MA-01 manual acceptance | `done/task_07.md#Handoff` | manual | not verifiable (partially waived) | release gate "Windows and one POSIX system" not met; accepted gap for HIL 3 per DEC-MA-03 |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` architecture (core imports no infrastructure/cli; harness names inside the adapter) | OK | QA-04 empty; mods API names only under `claude-code/` and `assets/runtime/` |
| `code-standards.md` (100 lines, 3 parameters) | NOT OK (reservation) | `src/core/services/installation-service.ts` 100 → 102 lines (QA-11) |
| `javascript-typescript.md` (no `any`, Zod, unions) | OK | QA-01/QA-02 empty; reason codes as one `as const` union |
| `node.md` (no sync I/O in-process) | OK | QA-05 empty; TC-15 |
| `harness-adapters.md` (fixtures from real sessions) | OK | `tests/fixtures/harnesses/claude-code/mod/observed-events.json`, `local-marketplace-loader.json`; TC-16 |
| `file-changes.md` (plan first, preserve user bytes, report edited owned files) | NOT OK | CR-01 (plan drops the loader keys); other paths OK (TC-20 byte preservation) |
| `cli-output.md` | OK | text labels in notices and doctor findings |
| `tests.md` | OK | unit, integration with fake host and temp dirs, built-CLI e2e |
| `sdd-review-code` state consistency | NOT OK | CR-02 |

## Quality profile

Scope: the 56 TypeScript files in the diff (`git diff --name-only c7529c5 -- '*.ts'` plus untracked `*.ts`). `core_files` = files under `src/core/`; `mod_files` = `claude-code/mod/*.ts` and `assets/runtime/claude-code-mod.ts`. Commands run with `rg -n` in this session.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | No `any` | blocking | `rg -n ':\s*any\b\|\bas any\b\|<any>' $files` | 0 | OK |
| QA-02 | No ts/eslint suppressions | blocking | `rg -n '@ts-ignore\|@ts-nocheck\|eslint-disable' $files` | 0 | OK |
| QA-03 | No empty `catch` | blocking | `rg -n -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|…' $files` | 0 | OK |
| QA-04 | core imports no infrastructure/cli | blocking | `rg -n "from '(\.\./)+(infrastructure\|cli)/" $core_files` | 0 | OK |
| QA-05 | No `node:`/sync I/O/process in mod | blocking | `rg -n "from 'node:\|readFileSync\|…\|process\.(stdout\|env)" $mod_files` | 0 | OK |
| QA-06 | `$` used as `$.namespace.method` | blocking | `claude plugin validate` (manual gate) | not run here | reused: T04 handoff records `claude plugin validate` passing on Claude Code 2.1.289; `claude` binary not used by this review (limitation) |
| QA-07 | No `exec`/`shell: true` | blocking | `rg -n '\bexecSync\(\|\bexec\(\|shell:\s*true' $files` | 0 | OK |
| QA-08 | Generic `throw new Error(` | reservation | `rg -n 'throw new Error\(' $files` | 2 new of 11 | 9 pre-existing (`scripts/check-package.ts` 8 at base, `scripts/asset-bundler.ts:72`); new: `tests/fixtures/claude-mod-host.ts:40,69` (test fake) |
| QA-09 | Clock/randomness in core | reservation | `rg -n 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' $core_files` | 0 | OK |
| QA-10 | 4+ parameters | reservation | regex from the TechSpec | 0 real of 2 | false positives: `auto-restart-settings.ts:26` (3 parameters, comma in a generic), `tests/unit/auto-restart-policy.test.ts:45` (array literal) |
| QA-11 | File above 100 lines | reservation | `wc -l $files \| awk '$1>100'` | 1 new | `src/core/services/installation-service.ts` 102 lines (100 at base; not listed in the Terrain baseline) |

- Terrain baseline: applied from TechSpec (`QA-08: scripts/asset-bundler.ts:71`, now :72); `scripts/check-package.ts` throws are also pre-existing at the base (8), outside the TechSpec baseline table but verified with `git show c7529c5:scripts/check-package.ts`.
- Hits discounted by baseline: 9
- Reservations accumulated in the feature: 3 (QA-08 ×2, QA-11 ×1)
- Suggested escalation: no trigger fired (3 < 8 reservations; no touched file above 200 lines; no duplication in 3+ places found)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 trigger on `turn.complete` | YES | `restart-flow.ts:49-52` |
| DEC-02 un-awaited `/clear` | YES | `restart-flow.ts:44-46`; T01 and MA-01 observed it working |
| DEC-03 seed on clear resolution | YES | `restart-flow.ts:45` |
| DEC-04 fixed seed text, per mode | YES | `auto-restart-notices.ts:4-5,24-26` |
| DEC-05 checkpoint gate | YES | `restart-facts.ts:32-40` |
| DEC-06 store guards | PARTIAL | key holds the raw root, no hash; no `seededAt` (OI-01) |
| DEC-07 stand-down inputs | YES | `restart-facts.ts:14-21` |
| DEC-08 marketplace + `enabledPlugins` | PARTIAL | layout correct; CR-01 loses the keys in one flag combination |
| DEC-09 optional `autoRestart` block | YES | `contracts/auto-restart.ts:18`, `configuration.ts` |
| DEC-10 per-session log | YES | `mod-log.ts` |
| DEC-11 failure containment | PARTIAL | wrappers present; CR-03 |
| DEC-12 absorption | YES | `planner.ts` 79 lines, `claude-hooks-config.ts`, `HarnessOptions` |
| DEC-13 fixtures from a real session | YES | TC-16 |
| DEC-14 gate per mode | YES | `mod-config.ts:37-40` |
| CMP-07 capability `auto_restart` | NO | CR-04 |
| Contracts: reason codes, log shape, finding codes | YES | `RESTART_REASON_CODES`; doctor codes match "Observability and rollout" |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | probe on Claude Code 2.1.289, fixtures, DEC-03/DEC-08 amended and confirmed (DEC-AMEND-02) |
| T02 | `done/task_02.md` | COMPLETE | extraction; line counts verified |
| T03 | `done/task_03.md` | COMPLETE | core policy, notices, contract |
| T04 | `done/task_04.md` | COMPLETE | mod glue, bundle, fake host |
| T05 | `done/task_05.md` | INCOMPLETE | T05.3 marked done without the `auto_restart` capability (CR-04); CR-01 in its planner |
| T06 | `done/task_06.md` | COMPLETE (manifest says pending, CR-02) | doctor findings, e2e |
| T07 | `done/task_07.md` | COMPLETE with waived manual scope (manifest says pending, CR-02) | docs, TC-26, MA-01 light/Windows; stale "Superseded open item … stays at the root" line kept in the handoff |

## Executed validations

- Profile and scope: CLI (`init`, `doctor`, `remove`) through unit, integration and the built-CLI e2e; the mod through the fake host. No browser or UI checks (AGENTS.md).
- Validated state: worktree on `c7529c5` plus the uncommitted feature diff, Windows 11, Git Bash, Node via npm scripts.
- Reused evidence: T04 `claude plugin validate` (QA-06) and T01/T07 real-session runs, which this review cannot repeat without an interactive Claude Code session.
- Manual acceptance: MA-01 recorded in `done/task_07.md` for light mode on Windows (RESTARTED, one seed, work continued, first-launch trust prompt works); full mode, loop guard and POSIX waived (DEC-MA-02, DEC-MA-03).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | CMP-05, package assets |
| `node dist/src/cli/main.js init --statusline-bridge --yes` then `init --auto-restart --no-statusline-bridge --yes` in a scratch repository (scratchpad `repro1`) | reproduced CR-01: plan shows `[delete] .claude/settings.local.json` plus four `[create]` mod files; afterwards no settings file, mod files and `autoRestart` present; a following plain `init --yes` writes the two keys | FR-07, DEC-08 |
| quality profile commands above | see Quality profile | QA-01 to QA-11 |
| `npm run coverage` (run once in the background, after the build) | passed: 320 test files, 2035 passed, 3 skipped, 0 failed; all files 96.03% statements, 91.68% branches, 96.98% functions | TC-01 to TC-26, TC-28 and the existing suites |
| `npm run lint` | passed | rules |
| `npm run typecheck` | passed | rules |
| `npm run schemas:check` | passed | TC-24, NFR-03 |
| `npm run package:smoke` (includes `assets:check`) | passed | CMP-05, package contents |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Medium | FR-07, DEC-08, OBJ-03, `file-changes.md` | `src/infrastructure/harnesses/claude-code/auto-restart-planner.ts:76` `planAutoRestart` returns `base` plus the mod files without a settings change whenever `base` already deletes `.claude/settings.local.json`, whatever `wanted` is. The status line opt-out deletes that file when the bridge created it (`statusline-restore.ts:31-32`). Reproduced with the built CLI: `init --auto-restart --no-statusline-bridge --yes` after `init --statusline-bridge` leaves the mod files and `autoRestart` but no `extraKnownMarketplaces`/`enabledPlugins` keys; the next plain `init` writes them | `init` reports success while Claude Code cannot load the mod, so automatic restart silently does not work until another `init`; the FR-07 idempotency criterion ("a second `init` changes nothing") fails for this input | When `wanted` is true and `base` deletes the local settings file, replace that delete with a create/update whose content is `withModKeys` applied to the restored text (or `{}`), and add a planner test for this flag combination |
| CR-02 | Low | `sdd-review-code` state consistency; `tasks.md` | `tasks.md:92-93` mark T06 and T07 `[ ] pending` while both files are in `done/` with completed handoffs; `done/task_07.md:85` still says "The task stays at the root until the maintainer records the result" next to the MA-01 close record | the manifest, the files and the handoff disagree on the stage state; a resumed flow can re-run or re-open finished tasks | mark T06 and T07 done in `## State` (T07 with the DEC-MA-02/03 waiver) and drop or mark resolved the superseded open item in the T07 handoff |
| CR-03 | Low | NFR-04, DEC-11 | `src/infrastructure/harnesses/claude-code/mod/restart-flow.ts:26-33` `seedAfterClear` awaits `markSeeded` before `$.prompt.submit`; when the store write throws, the catch logs `ERROR_INTERNAL` and the seed is never sent, although the `/clear` already ran | the session is cleared and waits for a keystroke, the "half cleared" outcome NFR-04 excludes; only under a `$.store` failure | submit the seed first (or independently of the store write) and log the store failure separately; add a TC-13 variant with a store failure after the clear |
| CR-04 | Low | CMP-07, `done/task_05.md` T05.3 | no `auto_restart` capability in `src/infrastructure/harnesses/claude-code/capabilities.ts` (file unchanged from the base); the T05 handoff records the omission as a deviation, T05.3 is checked, and `workflow.md` has no human decision for it | the TechSpec component contract and the task state disagree without an authorized decision | either record a decision (HIL) that amends CMP-07 to "state reported through doctor findings" or add the capability |

Optional improvements (not blocking):

- OI-01 (DEC-06): `mod/mod-guards.ts:9-11` uses the raw project root in the store key instead of a hash, and the record has no `seededAt`. Functionally equivalent; align the TechSpec or the code.
- OI-02 (QA-11): `src/core/services/installation-service.ts` grew from 100 to 102 lines.
- OI-03 (QA-08): `tests/fixtures/claude-mod-host.ts:40,69` throw generic `Error` in the fake host.
- OI-04 (FR-03): `restart-facts.ts:37` skips the staleness check when no `turn.start` was seen in this module instance (for example after a mod reload mid-turn), so an old valid checkpoint passes. Consider treating an unknown turn start as stale.
- OI-05 (FR-04): `restart-flow.ts:57-58` bumps `consecutive` before `report`; if the log write throws, no clear is queued but the counter stays incremented, so the loop guard pauses one restart early.

## Limitations and open items

- TC-27 / MA-01: full mode, the loop guard and the POSIX run were not executed manually (DEC-MA-02, DEC-MA-03); the TechSpec release gate "MA-01 passed on Windows and one POSIX system" is not met. The human listed these as accepted gaps for HIL 3; this review does not count them as findings but cannot mark OBJ-01/OBJ-02 manually verified.
- QA-06 (`claude plugin validate`) and real-session behavior were not re-run: no interactive Claude Code session in a delegated reviewer. Evidence reused from T01/T04/T07 handoffs.
- Linux and macOS were not exercised; NFR-01 rests on Windows runs here and on CI.
- The snapshot is behind its stage source (`covers_through` T07.1-T07.3); only filtered entries were loaded, none relied on for judgement.
- `tasks.md` hash differs from the approved hash; the difference could not be attributed line by line because the approved version is not stored, but the visible changes are in `## State` and `## Problems and solutions`.

## Conclusion

The core policy, the mod glue, doctor, docs and tests follow the TechSpec and cover FR-01 to FR-06 and FR-08 to FR-11 with automated evidence. The review is REJECTED because FR-07 is non-conformant for the proven flag combination in CR-01 (the mod is installed without its loader keys and a second `init` changes files), the manifest state is inconsistent (CR-02), and CMP-07 was dropped without a recorded decision (CR-04). CR-03 is a narrow NFR-04 gap. Manual acceptance stays partial by human decision and goes to HIL 3 as recorded.
