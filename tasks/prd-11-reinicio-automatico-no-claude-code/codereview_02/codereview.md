# Code review report — Automatic restart in interactive Claude Code (PRD-11), re-review after round 1

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `c7529c56dd243e08f48b7692cd6b8f566767e5b4..worktree` (HEAD equals the base; the whole feature and the round 1 corrections are uncommitted: 36 modified tracked paths and the untracked feature paths from `git status --porcelain`, 66 lines, unchanged before and after this review's commands; `.agents/settings.local.json` is pre-existing)
- Previous review: `tasks/prd-11-reinicio-automatico-no-claude-code/codereview_01/codereview.md` (corrections T08 to T11 in `codereview_01/done/`)

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-11-reinicio-automatico-no-claude-code/prd.md` | read; sha256 `926099af…` matches `checkpoint.json#approved_sources` (DEC-PD-03) |
| TechSpec | `tasks/prd-11-reinicio-automatico-no-claude-code/techspec.md` | read; sha256 `60f053e9…` matches (DEC-HIL-02) |
| Manifest | `tasks/prd-11-reinicio-automatico-no-claude-code/tasks.md` | read; sha256 `0677629c…` matches (REC-T10); `## State` T01 to T07 `[x]`, all seven in `done/` |
| Handoffs | `done/task_01.md` to `done/task_07.md`; `codereview_01/done/task_08.md` to `task_11.md` | read; every task and correction task in `done/` with a completed handoff and all work items checked |
| Workflow | `workflow.md` (DEC-PD-00 to CORR-R1, including DEC-CR-04 and REC-T10) | read |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter only (header, next step brief, O-05, on-run L-04/L-06/L-09). `git_head` c7529c5 matches HEAD; `covers_through` (T08 to T11 in `codereview_01/done/`) matches the stage source; no entry relied on for judgement |
| Implementation | worktree diff against the base: 65 TypeScript files plus schemas, docs, fixtures and README | delimited |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | `/clear` on a turn ending with the signal; nothing without it | `mod/restart-flow.ts:handleTurnComplete` (52-64), `queueClear` (48-50); `core/services/reset-notice.ts:endsWithResetSignal` | TC-01, TC-02, TC-09 | conformant | subagent and non-answer turns ignored (`restart-flow.ts:53`); `claude-mod-restart` passes |
| FR-02 | One seed after the mod's own clear; per-mode text; none for a typed `/clear` | `restart-flow.ts:seedAfterClear` (34-37), `submitSeed` (26-32); `auto-restart-notices.ts:seedText` | TC-10, TC-11, TC-28 | conformant | seed tied to the `command.run` promise; MA-01 light/Windows saw one plugin prompt (`done/task_07.md`) |
| FR-03 | Full mode checkpoint gate; light mode reads no state | `mod/restart-facts.ts:checkpointState` (32-40), `gatherFacts` (42-50) | TC-03, TC-12, TC-28 | conformant | light mode returns `'valid'` without reads (`restart-facts.ts:48`); OI-04 persists (optional) |
| FR-04 | Pause after N consecutive restarts; typed prompt resets | `core/services/auto-restart-policy.ts`; `mod/mod-guards.ts`; `hooks.ts:onPromptSubmit` | TC-04 | conformant | manual check waived (DEC-MA-03) |
| FR-05 | No restart when the seeded session did no work | `auto-restart-policy.ts`; `mod-guards.ts:foldToolCalls`, `markSeeded` | TC-05 | conformant | — |
| FR-06 | Stand down on env switch, runner session, non-interactive | `restart-facts.ts:standDownFacts` | TC-06 | conformant | — |
| FR-07 | Opt-in install through `init`, idempotent, removed when off | `cli/init-arguments.ts`, `init-config-updates.ts`, `core/services/auto-restart-merge.ts`, `claude-code/auto-restart-planner.ts` | TC-08, TC-17, TC-18, TC-20, TC-21, TC-25, CR-01 cases | non-conformant | install and idempotency conformant (CR-01 of `codereview_01` resolved); switching off with `--no-auto-restart --no-statusline-bridge` leaves an empty `.claude/settings.local.json` the install created (CR-01 below) |
| FR-08 | `doctor` off / ready / named problems; JSON validates | `claude-code/auto-restart-diagnostics.ts`; `adapter.ts:68-69` | TC-22, TC-23 | conformant | built-CLI `doctor --json` reports `AUTO_RESTART_NOT_LOADED` and the `auto_restart` capability |
| FR-09 | `remove` deletes what `init` wrote; repository matches pre-install state; edited file reported | `auto-restart-planner.ts:settingsChange` (58-66), `removalChanges` (39-46); `planner.ts:75` | TC-19, TC-25 | non-conformant | CR-01: default `init --auto-restart` (bridge on by default) then `remove --yes` leaves `.claude/settings.local.json` as `{\n\n}\n` where none existed; the control without `--auto-restart` deletes it |
| FR-10 | Log codes only; one-line notice | `mod/mod-log.ts`; `restart-flow.ts:report`; `contracts/auto-restart.ts` | TC-07, TC-14 | conformant | — |
| FR-11 | README, protocol doc, research section with date and version | `README.md`, `core/services/protocol-service.ts:55`, `docs/context-brake-protocol.md`, `docs/research/harness-integrations.md` | TC-26 | conformant | — |
| NFR-01 | No shell, `setsid`, server; no `node:` in the mod | `mod/*.ts`, `assets/runtime/claude-code-mod.ts` | TC-15; QA-05 0 hits | conformant | Linux and macOS not run here (limitation) |
| NFR-02 | No conversation text stored; no network | `mod-log.ts`, `modLogSchema` | TC-07, TC-14 | conformant | `claude plugin validate`: env writes nothing, no network API listed |
| NFR-03 | Schema v1, optional fields only | `contracts/configuration.ts`; `schemas/*.json` (capability enum gains `auto_restart`) | TC-08, TC-24 | conformant | `npm run schemas:check` passed |
| NFR-04 | Errors never block or leave a session half cleared | `hooks.ts` wrappers; `restart-flow.ts:seedAfterClear`, `abandonRestart` | TC-13 (incl. store failure after clear) | conformant | CR-03 of `codereview_01` resolved |
| NFR-05 | Zero files and hooks when off | `auto-restart-planner.ts:fileChanges`; `mod-config.ts` | TC-18 | conformant | — |
| OBJ-01 / OBJ-02 | Restart without keystroke; no discard, no loop | as above | TC-01 to TC-12, TC-27 | partially not verifiable | TC-27 ran in light mode on Windows only (DEC-MA-02, DEC-MA-03) |
| OBJ-03 / OBJ-04 | Safe install/doctor/remove; zero cost off | as above | TC-17 to TC-25 | non-conformant | CR-01 |
| DEC-06 | Store key hash; record with `seededAt` | `mod/mod-guards.ts:9-11` | `claude-mod-guards` | PARTIAL | OI-01 persists (optional, unchanged) |
| CMP-07 | Capability `auto_restart` | `core/contracts/harness.ts:22`; `claude-code/capabilities.ts:11`; seven other profiles | `tests/unit/harness-adapters.test.ts` | conformant | DEC-CR-04 branch B; Claude Code declares `unknown`, others `unsupported`; built-CLI `doctor --json` lists it |
| TC-27 | MA-01 manual acceptance | `done/task_07.md#Handoff` | manual | not verifiable (partially waived) | release gate "Windows and one POSIX system" not met; accepted gap for HIL 3 (DEC-MA-03) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` architecture | OK | QA-04 0 hits; mods API names only under `claude-code/` and `assets/runtime/` |
| `code-standards.md` (100 lines, 3 parameters, 30-line functions) | NOT OK (reservation) | `src/core/services/installation-service.ts` 102 lines (QA-11, unchanged from round 1); every correction file under 100 (`auto-restart-planner.ts` 87, `restart-flow.ts` 64) |
| `javascript-typescript.md` | OK | QA-01/QA-02 0 hits; `npm run typecheck` passed |
| `node.md` | OK | QA-05 0 hits; TC-15 |
| `harness-adapters.md` | OK | capability `auto_restart` is `unknown` for Claude Code (no version floor proves support), matching the `context_usage` pattern |
| `file-changes.md` | NOT OK | CR-01: switching the feature off rewrites a file ContextBrake created to `{}` instead of deleting it; the T05 handoff states that a settings file that becomes empty is dropped |
| `cli-output.md` | OK | text labels in notices, findings and the new capability lines |
| `tests.md` | NOT OK | TC-19 and TC-25 seed a pre-existing local settings file (`tests/e2e/auto-restart.test.ts:39`, the statusline world), so the default path where `init` creates the file is not covered |
| `sdd-review-code` state consistency | OK | manifest, `done/`, handoffs and approved hashes agree |

## Quality profile

Scope: the 65 TypeScript files in the diff (`git diff --name-only c7529c5 -- '*.ts'` plus untracked `*.ts`); `core_files` = 10 files under `src/core/`; `mod_files` = 11 files under `claude-code/mod/` and `assets/runtime/claude-code-mod.ts`. Commands run with `rg -n` in this session.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | No `any` | blocking | `rg -n ':\s*any\b\|\bas any\b\|<any>' $files` | 0 | OK |
| QA-02 | No ts/eslint suppressions | blocking | `rg -n '@ts-ignore\|@ts-nocheck\|eslint-disable' $files` | 0 | OK |
| QA-03 | No empty `catch` | blocking | `rg -n -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|…' $files` | 0 | OK |
| QA-04 | core imports no infrastructure/cli | blocking | `rg -n "from '(\.\./)+(infrastructure\|cli)/" $core_files` | 0 | OK |
| QA-05 | No `node:`/sync I/O/process in mod | blocking | `rg -n "from 'node:\|readFileSync\|…\|process\.(stdout\|env)" $mod_files` | 0 | OK |
| QA-06 | `$` used as `$.namespace.method` | blocking | `claude plugin validate` on the marketplace and the plugin installed by the built CLI (Claude Code 2.1.291) | 0 failures | OK: "Validation passed" for both; every `$.*` call listed with its caller; env reads only the three literal names. The validator also prints "gating hook without .catch: tool.call" and "…: prompt.submit" as informational lines (see limitations) |
| QA-07 | No `exec`/`shell: true` | blocking | `rg -n '\bexecSync\(\|\bexec\(\|shell:\s*true' $files` | 0 | OK |
| QA-08 | Generic `throw new Error(` | reservation | `rg -n 'throw new Error\(' $files` | 3 new of 12 | 9 pre-existing (`scripts/check-package.ts` 8, `scripts/asset-bundler.ts:72`); new: `tests/fixtures/claude-mod-host.ts:41,62,70` (test fake; `:62` added by T09) |
| QA-09 | Clock/randomness in core | reservation | `rg -n 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' $core_files` | 0 | OK |
| QA-10 | 4+ parameters | reservation | regex from the TechSpec (`rg -P`) | 0 real of 2 | false positives: `auto-restart-settings.ts:26` (3 parameters, comma in a generic), `tests/unit/auto-restart-policy.test.ts:45` (array literal) |
| QA-11 | File above 100 lines | reservation | `wc -l` over `$files`, `> 100` | 1 | `src/core/services/installation-service.ts` 102 lines (100 at base) |

- Terrain baseline: applied from TechSpec (`QA-08: scripts/asset-bundler.ts:71`, now :72); the 8 `scripts/check-package.ts` throws exist at the base (verified in round 1, file only gained one asset line).
- Hits discounted by baseline: 9
- Reservations accumulated in the feature: 4 (QA-08 ×3, QA-11 ×1)
- Suggested escalation: no trigger fired (4 < 8 reservations; largest touched file 102 lines; no duplication in 3+ places found)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 trigger on `turn.complete` | YES | `restart-flow.ts:53-56` |
| DEC-02 un-awaited `/clear` | YES | `restart-flow.ts:48-50` |
| DEC-03 seed on clear resolution | YES | `restart-flow.ts:49`, `34-37` |
| DEC-04 fixed seed text, per mode | YES | `auto-restart-notices.ts` |
| DEC-05 checkpoint gate | YES | `restart-facts.ts:32-40` |
| DEC-06 store guards | PARTIAL | raw root in the key, no `seededAt` (OI-01) |
| DEC-07 stand-down inputs | YES | `restart-facts.ts:standDownFacts` |
| DEC-08 marketplace + `enabledPlugins` | YES | keys kept under the status line opt-out (`auto-restart-planner.ts:80-82`) |
| DEC-09 optional `autoRestart` block | YES | `contracts/auto-restart.ts`, `configuration.ts` |
| DEC-10 per-session log | YES | `mod-log.ts` |
| DEC-11 failure containment | YES | `hooks.ts` wrappers; `seedAfterClear` no longer depends on the store write |
| DEC-12 absorption | YES | `planner.ts` 77 lines, `claude-hooks-config.ts`, `HarnessOptions` |
| DEC-13 fixtures from a real session | YES | TC-16 |
| DEC-14 gate per mode | YES | `mod-config.ts`, `restart-facts.ts:48` |
| CMP-07 capability `auto_restart` | YES | DEC-CR-04 branch B |
| Errors, security, recovery: "Rollback: `init --no-auto-restart` removes the files, the two settings keys and the config block" | PARTIAL | keys removed, but a bridge-created file reduced to `{}` stays (CR-01) |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | real-session probe on 2.1.289, fixtures, DEC-AMEND-02 |
| T02 | `done/task_02.md` | COMPLETE | extraction; line counts verified |
| T03 | `done/task_03.md` | COMPLETE | core policy, notices, contract |
| T04 | `done/task_04.md` | COMPLETE | mod glue, bundle, fake host; QA-06 re-run here on 2.1.291 |
| T05 | `done/task_05.md` | COMPLETE with a defect | capability deviation linked to DEC-CR-04; its claim "dropping a settings file that becomes empty" does not hold when the status line restore also touches the file (CR-01) |
| T06 | `done/task_06.md` | COMPLETE | doctor findings, e2e |
| T07 | `done/task_07.md` | COMPLETE with waived manual scope | docs, TC-26, MA-01 light/Windows; superseded open item marked resolved |
| T08 | `codereview_01/done/task_08.md` | COMPLETE | planner change at `auto-restart-planner.ts:73-86`; planner and e2e CR-01 cases; built-CLI repro re-run here |
| T09 | `codereview_01/done/task_09.md` | COMPLETE | `seedAfterClear` with `Promise.all`; TC-13 store-failure case |
| T10 | `codereview_01/done/task_10.md` | COMPLETE | manifest state, task_07 line, REC-T10, hash verified |
| T11 | `codereview_01/done/task_11.md` | COMPLETE | branch B under DEC-CR-04; schemas regenerated; `harness-adapters` TC-02 table |

## Executed validations

- Profile and scope: CLI (`init`, `doctor`, `remove`) through unit, integration and the built-CLI e2e, plus direct built-CLI runs in scratch repositories; the mod through the fake host and `claude plugin validate`. No browser or UI checks (AGENTS.md).
- Validated state: worktree on `c7529c5` plus the uncommitted feature diff and T08 to T11; Windows 11, Git Bash, Node via npm scripts; Claude Code 2.1.291 for QA-06.
- Reused evidence: T01/T07 real-session runs (no interactive Claude Code session in a delegated reviewer).
- Manual acceptance: MA-01 recorded in `done/task_07.md` for light mode on Windows; full mode, loop guard and POSIX waived (DEC-MA-02, DEC-MA-03).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | CMP-05, package assets |
| `npm run coverage` (background, after the build) | passed: 320 files, 2038 passed, 3 skipped, 0 failed; all files 96.06% statements, 91.77% branches, 96.98% functions | TC-01 to TC-26, TC-28, existing suites |
| `npm run lint` | passed | rules |
| `npm run typecheck` | passed | rules |
| `npm run schemas:check` | passed | TC-24, NFR-03, T11 |
| `npm run package:smoke` (includes `assets:check`) | passed | CMP-05 |
| quality profile commands above | see Quality profile | QA-01 to QA-11 |
| `claude plugin validate .context-brake/claude-mod` and `…/context-brake-restart` (2.1.291) on the files the built CLI installed | passed | QA-06, NFR-01, NFR-02 |
| built CLI, scratch `r4`: `init --statusline-bridge`, then `init --auto-restart --no-statusline-bridge`, then plain `init --json` | `[update] .claude/settings.local.json` with only the two loader keys; plain `init` plans 0 changes; `doctor --json` lists `auto_restart` `unknown` and `AUTO_RESTART_NOT_LOADED` | codereview_01/CR-01, CR-04; FR-07, DEC-08 |
| built CLI, scratch `r2`: no local settings file; `init --statusline-bridge --auto-restart --yes`, then `remove --yes` | reproduced CR-01: remove plans `[update] .claude/settings.local.json`; afterwards the file exists with `{\n\n}\n` | FR-09 |
| built CLI, scratch `r3`: no local settings file; `init --auto-restart --yes` (bridge on by default), then `init --no-auto-restart --no-statusline-bridge --yes` | reproduced CR-01: same `{\n\n}\n` file left | FR-07 |
| built CLI, scratch `r5` (control): `init --statusline-bridge --yes`, then `remove --yes`, no auto-restart | `[delete] .claude/settings.local.json`; file gone, so the residue is introduced by this feature | FR-09 baseline |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Low | FR-09, FR-07, OBJ-03, TechSpec "Rollback", `file-changes.md`, TC-19, TC-25 | `src/infrastructure/harnesses/claude-code/auto-restart-planner.ts:62` sets `drop` only when `base.existing === undefined`. When the status line bridge created `.claude/settings.local.json` and the mod keys share it, `statusline-restore.ts:31` sees a non-empty restored text (the mod keys are still there) and emits an `update`; `settingsChange` then strips the mod keys from that text, gets `{}`, and keeps the `update` (`:64`, kind from `base.existing`), with the bridge's preview summary (`:65`). Reproduced with the built CLI in the default flow (`init --auto-restart` then `remove --yes`, scratch `r2`) and in the combined opt-out (`r3`); the control without `--auto-restart` deletes the file (`r5`). The tests miss it because TC-25 writes a pre-existing local file (`tests/e2e/auto-restart.test.ts:39`) | after removal the repository does not match its pre-install state: an empty `.claude/settings.local.json` that ContextBrake created stays behind; harmless to Claude Code, but contradicts the FR-09 criterion and the T05 handoff claim | when `wanted` is false, `base.existing` is the bridge restore of a file the bridge created, and the text without the mod keys is empty, plan a `delete` for the local settings file instead of the `update`; add planner and built-CLI cases that start without `.claude/settings.local.json` for `init --auto-restart` then `remove --yes` and for `--no-auto-restart --no-statusline-bridge` |

Optional improvements (not blocking):

- OI-01 (DEC-06): `mod/mod-guards.ts:9-11` still keys the store by the raw project root and the record has no `seededAt`. Align the TechSpec or the code.
- OI-02 (QA-11): `src/core/services/installation-service.ts` is 102 lines.
- OI-03 (QA-08): `tests/fixtures/claude-mod-host.ts:41,62,70` throw generic `Error` in the fake host (one more than round 1, from T09).
- OI-04 (FR-03): `restart-facts.ts:37` skips the staleness check when no `turn.start` was seen in this module instance, so an old valid checkpoint passes after a mid-turn reload.
- OI-05 (FR-04): `restart-flow.ts:61-62` bumps `consecutive` before `report`; if the log write throws, no clear is queued but the counter stays incremented.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_01/CR-01 | resolved | `auto-restart-planner.ts:73-86` replaces the base delete with an `update` holding the loader keys when `wanted`; `tests/integration/auto-restart-planner.test.ts:70-71` and `tests/e2e/auto-restart.test.ts:66-78` pass; built-CLI repro `r4` shows `[update]` and a following plain `init` plans 0 changes |
| codereview_01/CR-02 | resolved | `tasks.md#State` T01 to T07 `[x]`, matching `done/`; `done/task_07.md` superseded item prefixed "Resolved by DEC-MA-03" without the stays-at-root sentence; `tasks.md` sha256 `0677629c…` equals `approved_sources` under REC-T10 |
| codereview_01/CR-03 | resolved | `restart-flow.ts:34-37` starts `markSeeded` and `submitSeed` independently and awaits both; `claude-mod-restart.test.ts:76-77` (store failure after the clear still seeds, `ERROR_INTERNAL` logged) passes |
| codereview_01/CR-04 | resolved | `core/contracts/harness.ts:22` adds `auto_restart`; Claude Code `unknown`, seven other harnesses `unsupported`; schemas regenerated and `schemas:check` passes; `doctor --json` lists it; human decision DEC-CR-04 |
| codereview_01/OI-01, OI-02, OI-04, OI-05 | persistent (optional) | see Optional improvements |
| codereview_01/OI-03 | persistent (optional) | now 3 hits |

## Limitations and open items

- TC-27 / MA-01: full mode, the loop guard and the POSIX run were not executed manually (DEC-MA-02, DEC-MA-03); the TechSpec release gate "MA-01 passed on Windows and one POSIX system" is not met. The human accepted these gaps for HIL 3; this review does not count them as findings and cannot mark OBJ-01/OBJ-02 manually verified.
- Real-session behavior was not re-run (no interactive Claude Code session in a delegated reviewer); T01/T07 evidence predates T09, whose change is covered only by the fake host and by `claude plugin validate`.
- `claude plugin validate` on Claude Code 2.1.291 prints "gating hook without .catch" for `tool.call` and `prompt.submit` while passing. Both handlers are wrapped (`mod/hooks.ts:24-26`, `36-43`; `register.ts:13-24`), and the T04 run on 2.1.289 recorded no such lines. Their meaning is not in `docs/research/harness-integrations.md`; not treated as a finding.
- Linux and macOS were not exercised; NFR-01 rests on Windows runs here and on CI.
- The `{\n\n}\n` formatting of a local settings file created from empty text predates PRD-11 (status line bridge) and is not judged here.

## Conclusion

All four round 1 findings are resolved with code, tests and built-CLI evidence, and the full suite, lint, typecheck, schema check, package smoke and every blocking quality rule pass. The review is still REJECTED because FR-09 is non-conformant in the default flow: with the status line bridge on (the default), `init --auto-restart` followed by `remove --yes`, or by `init --no-auto-restart --no-statusline-bridge`, leaves an empty `.claude/settings.local.json` that the install created (CR-01, Low, cause proven at `auto-restart-planner.ts:62`). Manual acceptance stays partial by human decision and goes to HIL 3 as recorded.
