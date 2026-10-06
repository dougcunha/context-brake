# Code review report — Automatic restart in interactive Claude Code (PRD-11), re-review after round 3

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `c7529c56dd243e08f48b7692cd6b8f566767e5b4..worktree`. HEAD equals the base, so the whole feature and the correction rounds 1 to 3 are uncommitted. `git status --porcelain` shows 68 lines before and after this review's commands (36 modified tracked paths, 32 untracked entries). The 2 lines added since round 3 are the T13 files `auto-restart-ownership.ts` and `tests/integration/auto-restart-user-settings.test.ts`. `.agents/settings.local.json` was already there before the feature.
- Previous review: `tasks/prd-11-reinicio-automatico-no-claude-code/codereview_03/codereview.md` (corrections T13 and T14 in `codereview_03/done/`)

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-11-reinicio-automatico-no-claude-code/prd.md` | read; sha256 `926099af…` matches `checkpoint.json#approved_sources` (DEC-PD-03) |
| TechSpec | `tasks/prd-11-reinicio-automatico-no-claude-code/techspec.md` | read; sha256 `60f053e9…` matches (DEC-HIL-02) |
| Manifest | `tasks/prd-11-reinicio-automatico-no-claude-code/tasks.md` | read; sha256 `0677629c…` matches (REC-T10). `## State` has T01 to T07 checked `[x]`, and all seven files are in `done/` |
| Handoffs | `done/task_01.md` to `task_07.md`; `codereview_01/done/task_08.md` to `task_11.md`; `codereview_02/done/task_12.md`; `codereview_03/done/task_13.md`, `task_14.md` | T13 and T14 read in full. Every work item is checked, and each has a `## Handoff` section |
| Workflow | `workflow.md` (DEC-PD-00 to CORR-R3, including IMPL-T13) | read |
| Snapshot | `context-snapshot.md` | The file is under 8 KiB, so it was read whole (load.md step 1). Only the independent-stage subset was used: the header, the next step brief, O-05, and the on-run entries L-04, L-06, L-09 and L-12. `git_head` c7529c5 matches HEAD. `covers_through` (T13 and T14 in `codereview_03/done/`) matches the stage source. The header's `worktree: 66` is behind the current 68 lines; the difference is the two T13 files. No entry was used for judgement |
| Implementation | the worktree diff against the base: 67 TypeScript files plus schemas, docs, fixtures and README. Files changed after `codereview_03/codereview.md` (by mtime): `auto-restart-ownership.ts` (new), `auto-restart-planner.ts`, `auto-restart-settings.ts`, `src/cli/snapshot-helper.ts`, `tests/e2e/auto-restart.test.ts`, `tests/fixtures/claude-mod-scene.ts`, `tests/integration/{auto-restart-planner,auto-restart-user-settings,claude-mod-restart}.test.ts`. These match the files T13 and T14 list. No file under `claude-code/mod/` changed | delimited |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | `/clear` when a turn ends with the signal; nothing without it | `mod/restart-flow.ts:handleTurnComplete` (52-64), `queueClear` (48-50); `core/services/reset-notice.ts:endsWithResetSignal` | TC-01, TC-02, TC-09 | conformant | mod code unchanged since round 3. `claude-mod-restart` passes in the full run and 3 of 3 runs alone |
| FR-02 | One seed after the mod's own clear, with text per mode; no seed for a typed `/clear` | `restart-flow.ts:seedAfterClear` (34-37), `submitSeed` (26-32); `auto-restart-notices.ts:seedText` | TC-10, TC-11, TC-28 | conformant | the seed is tied to the `command.run` promise (`restart-flow.ts:49`) |
| FR-03 | Checkpoint gate in full mode; no state reads in light mode | `mod/restart-facts.ts:checkpointState` (32-40), `gatherFacts` | TC-03, TC-12, TC-28 | conformant | OI-04 persists (optional) |
| FR-04 | Pause after N consecutive restarts; a typed prompt resets the count | `core/services/auto-restart-policy.ts:guardCode`; `mod/mod-guards.ts`; `hooks.ts:onPromptSubmit` | TC-04 | conformant | the manual check was waived (DEC-MA-03) |
| FR-05 | No restart when the seeded session did no work | `auto-restart-policy.ts`; `mod-guards.ts:foldToolCalls`, `markSeeded` | TC-05 | conformant | — |
| FR-06 | Stand down on the env switch, in a runner session, or when non-interactive | `restart-facts.ts:standDownFacts` | TC-06 | conformant | `claude plugin validate` lists the env reads `CONTEXT_BRAKE_AUTO_RESTART`, `CONTEXT_BRAKE_RUN_ID`, `DISABLE_AUTO_COMPACT` |
| FR-07 | Opt-in install through `init`; idempotent; nothing left when switched off | `cli/init-arguments.ts`, `init-config-updates.ts`, `core/services/auto-restart-merge.ts`, `claude-code/auto-restart-planner.ts`, `auto-restart-ownership.ts` | TC-08, TC-17, TC-18, TC-20, TC-21, TC-25, `auto-restart-user-settings` | conformant | s11: a second `init --auto-restart --dry-run --json` plans `[]`, so the ownership record is stable (`change-plan-service.ts:54` drops a change whose content is unchanged). s2, s6, s7 and s13 behave as expected. `claude-mod-install.json` is absent after every switch-off. OI-07 and OI-08 are optional |
| FR-09 | `remove` deletes what `init` wrote, and only that; edited files are reported | `auto-restart-planner.ts:settingsChange` (59-67, `drop` at 63), `removalChanges` (40-47), `fileChanges` (69-73); `auto-restart-ownership.ts:isLocalSettingsOwned` (29-31), `createdLocalFile` (33-36); `auto-restart-settings.ts:isEmptySettings` (36-38) | TC-19, TC-25, `auto-restart-user-settings` (8 cases), e2e "keeps a user-created empty local settings file" | conformant | A user `{}` or comment-only file now survives `remove` and `--no-auto-restart`, with the bridge on or off (s3, s4, s6). A file ContextBrake created is still deleted (s1, s2, s12, s13). Whitespace differences go to OI-07, because the base already has them (controls c5, c9) |
| FR-08 | `doctor` reports off, ready, and named problems; JSON validates | `claude-code/auto-restart-diagnostics.ts`; `adapter.ts` | TC-22, TC-23 | conformant | `auto-restart-doctor` and `e2e/auto-restart` pass in the full run |
| FR-10 | Log holds codes only; one-line notice | `mod/mod-log.ts`; `restart-flow.ts:report`; `contracts/auto-restart.ts` | TC-07, TC-14 | conformant | — |
| FR-11 | README, protocol doc, and research section with date and version | `README.md`, `docs/context-brake-protocol.md`, `docs/research/harness-integrations.md:57-59` | TC-26 | conformant | OI-06 persists (optional) |
| NFR-01 | No shell, `setsid` or local server; no `node:` import in the mod | `mod/*.ts`, `assets/runtime/claude-code-mod.ts` | TC-15; QA-05 0 hits | conformant | Linux and macOS not run here (limitation) |
| NFR-02 | No conversation text stored; no network | `mod-log.ts`, `modLogSchema` | TC-07, TC-14 | conformant | validator: "env writes: nothing" |
| NFR-03 | Schema stays v1; only optional fields added | `contracts/configuration.ts`; `schemas/*.json` | TC-08, TC-24 | conformant | `npm run schemas:check` exit 0 |
| NFR-04 | Errors never block a tool call or leave a session half cleared | `hooks.ts` wrappers; `restart-flow.ts:seedAfterClear`, `abandonRestart` | TC-13 | conformant | The store-failure test now waits for its record with a bound (`claude-mod-scene.ts:79-87`). It passed in the full coverage run and 3 of 3 runs alone |
| NFR-05 | Zero files and hooks when off | `auto-restart-planner.ts:fileChanges`; `mod-config.ts` | TC-18 | conformant | — |
| OBJ-01 / OBJ-02 | Restart without a keystroke; no discarded work, no loop | as above | TC-01 to TC-12, TC-27 | conformant (automated); manual part partially waived | TC-27 ran in light mode on Windows only (DEC-MA-02, DEC-MA-03) |
| OBJ-03 / OBJ-04 | Safe install, doctor and remove; zero cost when off | as above | TC-17 to TC-25 | conformant | codereview_03/CR-01 is resolved |
| CMP-07 | Capability `auto_restart` | `core/contracts/harness.ts`; `claude-code/capabilities.ts`; the other harness profiles | `tests/unit/harness-adapters.test.ts` | conformant | DEC-CR-04 |
| TC-27 | MA-01 manual acceptance | `done/task_07.md#Handoff` | manual | not verifiable (partially waived by human decision) | The release gate "Windows and one POSIX system" is not met. This is an accepted gap for HIL 3 (DEC-MA-03) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` architecture | OK | QA-04 0 hits. The mods API names appear only under `claude-code/` and `assets/runtime/`. `snapshot-helper.ts` imports `MOD_FILES` from the adapter, as the CLI composition layer is allowed to |
| `code-standards.md` (100 lines, 3 parameters) | NOT OK (reservation) | `src/core/services/installation-service.ts` is 102 lines (QA-11, unchanged since round 1). `auto-restart-planner.ts` is 89 lines and `auto-restart-ownership.ts` is 46 |
| `javascript-typescript.md` | OK | QA-01 and QA-02 0 hits; `npm run typecheck` exit 0. The ownership record is validated with Zod (`auto-restart-ownership.ts:12`) |
| `node.md` | OK | QA-05 0 hits; TC-15. The planner uses async `fs/promises` only |
| `harness-adapters.md` | OK | capability declared for Claude Code |
| `file-changes.md` | PARTIAL | "`remove` deletes only what ContextBrake created" now holds (s3, s4, s6 against s1, s2, s12, s13). "Byte for byte" does not hold for a kept user file: `{}\n` becomes `{\n}\n`, and a blank line appears before a leading comment. The same drift happens at the base through the status line bridge (controls c5, c9). The cause is the shared `json-document-editor.ts:removeJsonProperty`, so this is recorded as pre-existing (OI-07) |
| `cli-output.md` | OK | text labels in notices and plan summaries ("Record who created the local settings", "Delete the automatic restart ownership record") |
| `tests.md` | PARTIAL | The new user-file cases compare with whitespace stripped (`auto-restart-user-settings.test.ts:20-22,29`, `e2e/auto-restart.test.ts:96`). That is weaker than the byte-for-byte assertion the rule requires; see OI-07. `waitForCodes` uses `Date.now()` only as an upper bound, not as an assertion input. The fixed-wait flake is gone (codereview_03/CR-02) |
| `sdd-review-code` state consistency | OK | manifest, `done/` folders, handoffs and approved hashes agree |

## Quality profile

Scope: the 67 TypeScript files in the diff (`git diff --name-only c7529c5 -- '*.ts'` plus untracked `*.ts`). `core_files` is the 10 of them under `src/core/`. `mod_files` is the 11 under `claude-code/mod/` plus `assets/runtime/claude-code-mod.ts`. Every command ran with `rg -n` in this session.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | No `any` | blocking | `rg -n ':\s*any\b\|\bas any\b\|<any>' $files` | 0 | OK |
| QA-02 | No ts/eslint suppressions | blocking | `rg -n '@ts-ignore\|@ts-nocheck\|eslint-disable' $files` | 0 | OK |
| QA-03 | No empty `catch` | blocking | `rg -n -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|…' $files` | 0 | OK. The new `auto-restart-ownership.ts:15,20` handlers return `null` and are not empty |
| QA-04 | core imports no infrastructure/cli | blocking | `rg -n "from '(\.\./)+(infrastructure\|cli)/" $core_files` | 0 | OK |
| QA-05 | No `node:`/sync I/O/process in mod | blocking | `rg -n "from 'node:\|readFileSync\|…\|process\.(stdout\|env)" $mod_files` | 0 | OK |
| QA-06 | `$` used as `$.namespace.method` | blocking | `claude plugin validate` on `.context-brake/claude-mod` and `…/context-brake-restart`, installed by the built CLI in scratch `s11` (Claude Code 2.1.291) | 0 failures | OK: "Validation passed" for both |
| QA-07 | No `exec`/`shell: true` | blocking | `rg -n '\bexecSync\(\|\bexec\(\|shell:\s*true' $files` | 0 | OK |
| QA-08 | Generic `throw new Error(` | reservation | `rg -n 'throw new Error\(' $files` | 3 new of 12 | 9 were there at the base: `scripts/check-package.ts` ×8 (8 at `c7529c5`) and `scripts/asset-bundler.ts:72` (1 at the base). New: `tests/fixtures/claude-mod-host.ts:41,62,70` (test fake) |
| QA-09 | Clock/randomness in core | reservation | `rg -n 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' $core_files` | 0 | OK |
| QA-10 | 4+ parameters | reservation | TechSpec regex (`rg -P`) | 0 real of 2 | false positives: `auto-restart-settings.ts:26` (3 parameters; the regex counts a comma inside a generic) and `tests/unit/auto-restart-policy.test.ts:45` (array literal) |
| QA-11 | File above 100 lines | reservation | `wc -l` over `$files`, `> 100` | 1 | `src/core/services/installation-service.ts` 102 lines (100 at the base) |

- Terrain baseline: applied from the TechSpec (`QA-08: scripts/asset-bundler.ts:71`, now at :72), and checked against `git show c7529c5` for `scripts/check-package.ts` (8 hits) and `installation-service.ts` (100 lines).
- Hits discounted by baseline: 9
- Reservations accumulated in the feature: 4 (QA-08 ×3, QA-11 ×1)
- Suggested escalation: no trigger fired (4 reservations, below 8; largest touched file 102 lines; no duplication found in 3 or more places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 trigger on `turn.complete` | YES | `restart-flow.ts:53-56` |
| DEC-02 un-awaited `/clear` | YES | `restart-flow.ts:48-50` |
| DEC-03 seed when the clear resolves | YES | `restart-flow.ts:49`, `34-37` |
| DEC-04 fixed seed text, per mode | YES | `auto-restart-notices.ts` |
| DEC-05 checkpoint gate | YES | `restart-facts.ts:32-40` |
| DEC-06 store guards | PARTIAL | raw root in the key (`mod-guards.ts:9-11`), no `seededAt` (OI-01) |
| DEC-07 stand-down inputs | YES | `restart-facts.ts` `standDownFacts` |
| DEC-08 marketplace + `enabledPlugins` | YES | `auto-restart-settings.ts:20-24`; s11 settings bytes |
| DEC-09 optional `autoRestart` block | YES | `contracts/auto-restart.ts`, `configuration.ts` |
| DEC-10 per-session log | YES | `mod-log.ts` |
| DEC-11 failure containment | YES | `hooks.ts` wrappers; `restart-flow.ts:18-24` |
| DEC-12 absorption | YES | `planner.ts`, `claude-hooks-config.ts` |
| DEC-13 fixtures from a real session | YES | TC-16 |
| DEC-14 gate per mode | YES | `mod-config.ts`, `restart-facts.ts` |
| Errors, security, recovery: "User files: the planner edits only the `extraKnownMarketplaces.context-brake-local` and `enabledPlugins[…]` keys of `.claude/settings.local.json` … `file-changes.md` applies" | YES, with the inherited whitespace drift | `auto-restart-planner.ts:63` deletes the file only when it is owned (`isLocalSettingsOwned`) and literally `{}`; otherwise it updates the file without the mod keys. The extra runtime file `.context-brake/runtime/claude-mod-install.json` is an implementation record (IMPL-T13) under the ContextBrake-owned runtime folder, and it is removed with the mod |
| Rollback: `init --no-auto-restart` removes the files, the two settings keys and the config block | YES | s2, s6, s7, s13 |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 to T07 | `done/task_01.md` to `task_07.md` | COMPLETE (T07 with waived manual scope) | verified in earlier rounds; the code they cover is unchanged except for the planner files T13 touched |
| T08 to T11 | `codereview_01/done/` | COMPLETE | s7 and the status line opt-out planner case (`auto-restart-planner.test.ts:71-84`) still pass |
| T12 | `codereview_02/done/task_12.md` | COMPLETE | its cases still delete the created file (s1, s2; `auto-restart-planner.test.ts:86-96`, which now also asserts that no ownership record is left) |
| T13 | `codereview_03/done/task_13.md` | COMPLETE | Acceptance: s3, s4 and s6 keep the user file; s1 and s2 still remove the created file; no `claude-mod-install.json` is left; the auto-restart, status line and doctor suites pass. The outcome sentence "survives byte for byte" is met only up to whitespace. The handoff states this as an open item, and it is OI-07 here |
| T14 | `codereview_03/done/task_14.md` | COMPLETE | `waitForCodes` (`claude-mod-scene.ts:79-87`) is bounded at 2 000 ms, and `settleClear` is unchanged. The test passed in the full run and 3 of 3 runs alone |

## Executed validations

- Profile and scope: the CLI (`init`, `doctor`, `remove`) through unit, integration and built-CLI e2e tests, plus direct built-CLI runs in scratch git repositories under the system temp folder, with `HOME` and `USERPROFILE` set to a scratch home. The mod was checked through the fake host and `claude plugin validate`. No browser or UI checks (AGENTS.md).
- Validated state: the worktree on `c7529c5` with the uncommitted feature diff and the round 1 to 3 corrections; Windows 11, Git Bash, Node via the npm scripts; Claude Code 2.1.291 for QA-06.
- Reused evidence: the T01 and T07 real-session runs, because a delegated reviewer has no interactive Claude Code session and the mod code did not change in round 3.
- Manual acceptance: MA-01 is recorded in `done/task_07.md` for light mode on Windows. Full mode, the loop guard and POSIX were waived (DEC-MA-02, DEC-MA-03).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | CMP-05, package assets |
| `npx vitest run --coverage` (background, after the build) | passed: 321 files, 2050 passed, 3 skipped, 0 failed, 638 s. All files: 96.07% statements, 91.89% branches, 97.07% functions. `auto-restart-ownership.ts` 94.59% statements (uncovered 21-22: the JSON parse `catch`) | TC-01 to TC-26, TC-28, existing suites |
| `npx vitest run tests/integration/claude-mod-restart.test.ts tests/integration/auto-restart-user-settings.test.ts` ×3 | passed 17/17 each time | TC-09 to TC-13, T13, T14 |
| `npm run lint` | exit 0 | rules |
| `npm run typecheck` | exit 0 | rules |
| `npm run schemas:check` | exit 0 | TC-24, NFR-03 |
| `npm run package:smoke` (includes `assets:check`) | exit 0 | CMP-05 |
| quality profile commands above | see Quality profile | QA-01 to QA-11 |
| `claude plugin validate` on the marketplace and the plugin (2.1.291, scratch s11) | passed | QA-06, NFR-01, NFR-02 |
| built CLI s1: no local file; `init --yes --auto-restart`; `remove --yes` | local file absent; no files left under `.context-brake/` (empty folders remain, OI-08) | codereview_02/CR-01, FR-09 |
| built CLI s2: no local file; `init --yes --auto-restart`; `init --yes --no-auto-restart --no-statusline-bridge` | local file absent; no ownership record | FR-07 |
| built CLI s3: user `{}\n`; `init --yes --auto-restart`; `remove --yes` | user file kept (`{\n}\n`) | codereview_03/CR-01 |
| built CLI s4: user `{\n  // keep me\n}\n`; `init --yes --auto-restart`; `remove --yes` | user file and comment kept (blank line added after `{`) | codereview_03/CR-01 |
| built CLI s6: same comment-only file; `init --yes --auto-restart --no-statusline-bridge`; `init --yes --no-auto-restart` | user file and comment kept (blank line added) | codereview_03/CR-01 |
| built CLI s7: user `{}\n`; `init --yes --auto-restart`; `init --yes --no-auto-restart` | file kept with the bridge `statusLine` | FR-07 |
| built CLI s11: user `{}\n`; `init --yes --auto-restart`; again with `--dry-run --json` | second plan `changes: []`; record `{ "v": 1, "createdLocalFile": false }` | FR-07 idempotency |
| built CLI s12: no local file; `init --yes`; `init --yes --auto-restart`; `remove --yes` | local file absent (bridge-created file seen as owned) | FR-09 |
| built CLI s13: no local file; `init --yes --auto-restart`; `init --yes --no-statusline-bridge`; `init --yes --no-auto-restart` | local file absent | FR-07, FR-09 |
| built CLI controls c5 (comment-only), c9 (`{}`): `init --yes` without `--auto-restart`; `remove --yes` | same whitespace drift as s3 and s4 | OI-07 baseline |
| built CLI control c10 (`{}`): `init --yes --no-statusline-bridge`; `remove --yes` | `{}\n` kept byte for byte | OI-07 baseline |

## Findings

No actionable finding in this round.

Optional improvements (not blocking):

| ID | Origin | Evidence | Note |
| --- | --- | --- | --- |
| OI-01 | DEC-06 | `mod/mod-guards.ts:9-11` | The store key holds the raw project root, and the record has no `seededAt`. Align the TechSpec or the code (persistent since codereview_02) |
| OI-02 | QA-11 | `src/core/services/installation-service.ts` 102 lines | persistent |
| OI-03 | QA-08 | `tests/fixtures/claude-mod-host.ts:41,62,70` | generic `Error` in the test fake; persistent |
| OI-04 | FR-03 | `restart-facts.ts:37` | The staleness check is skipped when this module instance saw no `turn.start`, for example after a reload mid-turn; persistent |
| OI-05 | FR-04 | `restart-flow.ts:61-62` | `consecutive` is bumped before `report`. If the log write throws, no clear is queued but the counter stays incremented; persistent |
| OI-06 | FR-11 | `docs/research/harness-integrations.md:59` | The first interactive trust prompt is still listed as "Não verificado" (unverified), although DEC-MA-03 records that it works; persistent |
| OI-07 | `file-changes.md` (byte for byte), `tests.md` (byte-for-byte assertion) | s3 `{}\n` → `{\n}\n`; s4 and s6 add a blank line before the user comment. Cause: `withoutModKeys` → `json-document-editor.ts:removeJsonProperty` | Pre-existing at the base: the status line bridge flow without the feature drifts the same way (c5, c9, through `statusline-restore.ts:30`). It is not counted against FR-07 or FR-09 for that reason. The new tests compare with whitespace stripped (`auto-restart-user-settings.test.ts:20-22`, `e2e/auto-restart.test.ts:96`), which hides the drift. The T13 handoff names this as an open item. A byte-exact fix would belong in the shared editor or would need the original text stored |
| OI-08 | FR-07 ("no mod file remains"), FR-09 | s1: after `remove`, the empty `.context-brake/claude-mod/…` folders remain; there are no files | Pre-existing pattern: the applier deletes files, not folders, and control c9 also leaves an empty `.context-brake/runtime/` |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_03/CR-01 | resolved | `auto-restart-planner.ts:63` (`drop = !wanted && base.owned && isEmptySettings(text)`), `auto-restart-ownership.ts:29-36`, `auto-restart-settings.ts:37` (literal `{}` ignoring whitespace). Built CLI s3, s4 and s6 keep the user file and its comment; s1, s2, s12 and s13 still delete the file ContextBrake created; no `claude-mod-install.json` is left. `auto-restart-user-settings.test.ts` (8 cases) passes. The remaining whitespace drift is pre-existing (OI-07) |
| codereview_03/CR-02 | resolved | `tests/fixtures/claude-mod-scene.ts:79-87` `waitForCodes`, used at `claude-mod-restart.test.ts:83`. It passed in the full coverage run (0 failed) and in 3 of 3 runs alone |
| codereview_03/OI-01 to OI-06 | persistent (optional) | OI-01 to OI-06 above |
| codereview_02/CR-01 | resolved (no regression) | s1, s2; `auto-restart-planner.test.ts:86-96` |
| codereview_01/CR-01 to CR-04 | resolved (no regression seen) | s7; status line opt-out planner case; `auto_restart` capability present |

## Limitations and open items

- TC-27 / MA-01: full mode, the loop guard and the POSIX run were not executed by hand (DEC-MA-02, DEC-MA-03). The TechSpec release gate "MA-01 passed on Windows and one POSIX system" is therefore not met. The human accepted these gaps for HIL 3, together with the per-harness `auto_restart` limitation line (O-05). This review does not count them as findings, and it cannot mark OBJ-01 or OBJ-02 as manually verified.
- Real-session behavior was not re-run, because a delegated reviewer has no interactive Claude Code session. No mod source file changed in round 3.
- Linux and macOS were not exercised; NFR-01 rests on the Windows runs here and on CI.
- `npm run build` regenerated `schemas/*.json`. The content is unchanged (`schemas:check` exit 0, and the porcelain count is unchanged). Outputs of this review's commands went to `dist/`, `coverage/` and the system temp folder (scratch repositories).
- For `workflow.md` (the caller records it): REV-04, delegated reviewer, `codereview_04/codereview.md`, status `APPROVED WITH RESERVATIONS`. codereview_03/CR-01 (Medium) and CR-02 (Low) are resolved, and there is no new actionable finding. That is a reduction from 2 findings to 0. Optional improvements: OI-01 to OI-06 persist, and OI-07 and OI-08 are new, both pre-existing at the base. The worktree has the same 68 `git status --porcelain` lines before and after this review. The only new path is `codereview_04/`, inside the already untracked feature folder.

## Conclusion

Round 3 resolved both findings of codereview_03. A user-created `.claude/settings.local.json` now survives `remove` and `init --no-auto-restart`, with the status line bridge on or off. The file is deleted only when the new ownership record or the bridge state says ContextBrake created it and it is literally `{}`. The flaky store-failure test now waits for its record with a bound. The full coverage run is green (2050 passed, 0 failed). Lint, typecheck, schema check, package smoke, every blocking quality rule and QA-06 on Claude Code 2.1.291 pass. Every PRD obligation is conformant in the automated evidence. What remains are optional improvements: six carried over, and two new ones (whitespace drift in kept user files, empty folders after removal) that already happen at the base through the shared editor and applier. The manual acceptance stays partial by recorded human decision and goes to HIL 3. Status: APPROVED WITH RESERVATIONS.
