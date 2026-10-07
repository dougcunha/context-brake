# Code review report — prd-12-refatoracao-modo-leve-modo-unico (Light mode as the only mode), re-review after correction round 3

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `1474f541e9cfedcd3c759e39580065525e10fd20..uncommitted worktree` (549 `git status --porcelain` entries: 265 modified, 268 deleted (233 unstaged, 35 staged), 6 renamed, 10 untracked paths; codereview_03 had 548, plus the new untracked `tests/unit/cli-install-text.test.ts`). Includes the T01–T07 diff, correction round 1 (`codereview_01/done/task_08.md`, `task_09.md`), round 2 (`codereview_02/done/task_10.md`), and round 3 (`codereview_03/done/task_11.md`, `task_12.md`, `task_13.md`)
- Previous review: `tasks/prd-12-refatoracao-modo-leve-modo-unico/codereview_03/codereview.md`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-12-refatoracao-modo-leve-modo-unico/prd.md` | read; sha256 `cbe0bb94…` matches `approved_sources` (DEC-AMEND-01) |
| TechSpec | `tasks/prd-12-refatoracao-modo-leve-modo-unico/techspec.md` | read; sha256 `7394e6a5…` matches `approved_sources` (DEC-HIL-02) |
| Manifest | `tasks/prd-12-refatoracao-modo-leve-modo-unico/tasks.md` | read; State T01–T07 `[x] done`, each link resolves to `done/task_0N.md`; sha256 now `43116ad8…` (codereview_03: `b3142b33…`; approved `54681574…`); T13 changed line 43 (see limitations) |
| Handoffs | `done/task_01.md` … `done/task_07.md`, `codereview_01/done/task_08.md`, `task_09.md`, `codereview_02/done/task_10.md` | present; no mtime after codereview_03 |
| Correction tasks | `codereview_03/done/task_11.md`, `task_12.md`, `task_13.md` | read; numbered after T10, in `done/`, every work item checked, handoffs filled, each traced to a codereview_03 OI and DEC-HIL-RES-01. No correction manifest, as `sdd-plan-corrections` expects |
| Previous review | `codereview_03/codereview.md` | read; preserved |
| Workflow and checkpoint | `workflow.md`, `checkpoint.json` | read (`correction_round: 3`, `review_status: APPROVED WITH RESERVATIONS`, `active_work` scope `codereview_04`); DEC-HIL-RES-01 chooses OI-01, OI-03, OI-04 for correction and accepts OI-02 for prd-14 |
| Snapshot | `context-snapshot.md` (5,109 bytes, read whole) | loaded through the independent-stage filter: header, next step brief, open threads O-02/O-07, `on-run` learnings L-01, L-04, L-08. Decisions, code map, and other learnings skipped. Header validated: `git_head` 1474f54 = `git rev-parse HEAD`; `covers_through` (T11–T13 done) matches `codereview_03/done/`; worktree matches the described diff |
| Implementation | `git diff 1474f54` plus untracked `tests/helpers/session-telemetry.ts`, `tests/unit/{cli-install-text,configuration-snapshot,installation-summary,snapshot-merge}.test.ts` | delimited. Files newer than `codereview_03/codereview.md` (10:49:13), excluding `node_modules`, `.git`, `dist`, `coverage`, and live ledger lines: `src/cli/output/text.ts`; `tests/integration/runtime-{light-mode,overhead}.test.ts`; `tests/unit/cli-{install,output}-text.test.ts`; `schemas/*.json` (rewritten by T12's `npm run build`, content still passes `schemas:check`); the feature's `tasks.md`, `workflow.md`, `checkpoint*.json`, `context-snapshot.md`, and `task_11..13.md`. No other `src`, `scripts`, docs, config, or installed asset changed |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Plan mode, checkpoint, boot, `plan` command, plan/checkpoint schemas removed | deleted modules (T02); `argument-parser.ts` dispatches only init/doctor/remove | `tests/unit/schemas.test.ts` (TC-02), `tests/unit/main.test.ts:16` | conformant | coverage run prints `Unknown command 'plan'. Allowed commands: init, doctor, remove.`; plan/checkpoint schemas staged as deleted |
| FR-02 | No mode keys or flags; removed key named on failure | `configuration.ts:configurationSchema`, `configuration-validator.ts` | `configuration-snapshot.test.ts` (TC-04), `init-arguments.test.ts` (TC-06) | conformant | source unchanged since codereview_03; suites pass in this review's coverage run |
| FR-03 | `run`, `wrap`, `runner`, run summary schema, runner codes removed | runner tree deleted; `exit-codes.ts` | `main.test.ts:17-18`, package smoke | conformant | coverage run prints `Unknown command 'run'` / `'wrap'`; `npm run package:smoke` help lists only `init`, `doctor`, `remove` |
| FR-04 | `snapshot` section; init flags set and clear | `snapshotSchema`, `snapshot-merge.ts`, `init-arguments.ts` | `init-snapshot.test.ts` (TC-05), `snapshot-merge.test.ts` | conformant | source unchanged; suites pass |
| FR-05 | Action at/above trigger names command + marker; resume text on reset | `zone-guidance.ts:zoneAction,resumeText`; `session-reset-handler.ts` | `zone-guidance.test.ts` (TC-07), `runtime-light-mode.test.ts:52-56` | conformant | suites pass; this session receives live `[ContextBrake v3] … zone=YELLOW action=keep working; …` blocks matching the Contracts row YELLOW/trigger RED |
| FR-06 | Without command: header + generic action, no marker, no resume | `zoneAction`, `resumeText` | `runtime-light-mode.test.ts:36-50` (TC-08) | conformant | suite passes (5 tests) after T11 dropped the plan fixture; assertions unchanged |
| FR-07 | Advisory brake; no pre-tool hook installed or handled | `runtime.ts`, updaters/planners, `failure-policy.ts`, `process-hook-host.ts` | `runtime-*.test.ts`, `hook-registration-paths` (TC-09), `runtime-failure-policy` (TC-10) | conformant | source unchanged; installed hook byte-identical to the fresh build |
| FR-08 | No protocol, blocks, `.gitignore`, state files; no `--remove-state` | `removal-helper.ts`, `snapshot-helper.ts`, `CHANGE_OWNERS` | `e2e-07-08.test.ts` (TC-12), `removal-service.test.ts` | conformant | suites pass |
| FR-09 | Doctor drops removed findings, reports `snapshot` | `diagnostics.ts`, `doctor-report-extras.ts` | `doctor-light-mode.test.ts` (TC-13), `doctor-context-window.test.ts` (TC-14) | conformant | `doctor` here prints `snapshot: /sdd-snapshot at RED, resume: /sdd-orchestrate-flow`; `schemas:check` exit 0 |
| FR-10 | Mod restart gated on the signal only | `auto-restart-policy.ts:decideRestart` | `claude-mod-{gates,restart,guards}.test.ts` (TC-03) | conformant | suites pass; `AUTO_RESTART_READY` OK; installed mod `register.mjs` byte-identical (`cmp`) to `dist/assets/runtime/claude-code-mod.mjs` |
| FR-11 | This repository on the single mode; `doctor` reports no error | config, `.agents/settings.json`, `.agents/hooks/*.mjs`, manifest | TC-17 manual | conformant | after this review's `npm run build`, `cmp` shows `.agents/hooks/context-brake.mjs`, `context-brake-statusline.mjs`, and the mod identical to `dist/assets/runtime/`, before and after the coverage run; `node dist/src/cli/main.js doctor` exits 1 (warnings) with no `[ERROR]` and no `ASSET_OUTDATED`, three runs; TC-16 scan empty |
| FR-12 | Docs describe only the single mode | README, AGENTS, CLAUDE, rules, skills | `readme-*.test.ts` (TC-15), TC-16 scan | conformant | TC-16 `rg` returns nothing (exit 1) |
| NFR-01 | Platforms unchanged | deletions only | platform suites | not verifiable (Linux/macOS) | Windows 11 (Git Bash) verified here |
| NFR-02 | Lint, typecheck, coverage ≥ 80%, schemas check | — | full suite | conformant | eslint, typecheck, `schemas:check` exit 0; coverage 197 files, 1,052 tests, statements 94.51%, branches 89.54%, functions 95.97%, lines 94.51% |
| NFR-03 | Tests of removed features deleted, not skipped | T11 | `runtime-overhead`, `runtime-light-mode` | conformant | `rg task_plan` over both files empty; the remaining `task_plan.json` writes (`e2e-07-08.test.ts:24`, `e2e-light-mode.test.ts:54`, `safe-removal.test.ts:40`, `doctor-light-mode.test.ts:23`, `removal-service.test.ts:12`) back assertions that `remove` keeps and `doctor`/the runtime ignore a leftover user file, which is surviving behavior, not a removed feature |
| NFR-04 | Hook overhead does not grow | — | `runtime-overhead.test.ts` (4 tests, serial lane) | conformant (suite) | the suite `tasks.md` names passes; dogfood `doctor` figure under limitations |
| UX (PRD "User experience") | `init` reports the snapshot settings it wrote, or says only zone headers will be injected | `installation-builder.ts`; `text.ts:25` | `cli-install-text.test.ts:24-27`, `installation-summary.test.ts`, `init-snapshot.test.ts` | conformant | the `init` summary line is unchanged; `remove` no longer prints `Delete configuration file` (`cli-install-text.test.ts:28-33`); `text.ts` 100% statement and branch coverage |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` Architecture | OK | QA-01 over 29 changed `src/core` files: no hit |
| `AGENTS.md` Commands (lint, typecheck, coverage before finishing) | OK | all three run in this review, exit 0 |
| `code-standards.md` | OK | `text.ts:25` adds one condition; QA-07 shows no new file above 100 lines (T12 split the `init`/`remove` text tests into `cli-install-text.test.ts`, 34 lines, to keep `cli-output-text` under the limit) |
| `javascript-typescript.md` | OK | QA-02, QA-06: no hit; `npm run typecheck` exit 0 |
| `node.md` | OK | QA-05 over 16 in-process files: no hit |
| `tests.md` | OK | OI-01 resolved; the new file runs in the parallel lane (`tests/**/*.test.ts`, not in the process or serial lists) and passed (2 tests); the removed `cli-output-text` "success hint" test only asserted that stdout was written and is superseded by the stronger `cli-install-text.test.ts:24-27` |
| `harness-adapters.md` | OK | no adapter or hook source changed since codereview_03 |
| `file-changes.md` | OK | round 3 changed no user-file code path |
| `cli-output.md` | OK | OI-04 resolved; results still go to stdout; JSON output unchanged (summary stays in `preview`) |
| `sdd-snapshot` load protocol (independent stage) | OK | only header, brief, open threads, `on-run` loaded |
| `sdd-plan-corrections` / `sdd-execute-corrections` artifacts | OK | T11–T13 in `codereview_03/done/`, numbered after T10, traced to codereview_03 OI-01/OI-04/OI-03 and DEC-HIL-RES-01; no correction manifest |

## Quality profile

Scope: 240 changed or new `.ts` files in the reviewable set (`git diff --name-only --diff-filter=AMR 1474f54` plus untracked), codereview_03's 239 plus `tests/unit/cli-install-text.test.ts`; `core_files` 29, `in_process_files` 16 (OpenCode, Pi, Oh-My-Pi adapters and `runtime/in-process*`; codereview_03's 17 less `harnesses/common/in-process-support.ts`, unchanged since and clean there), `hook_files` 83. Commands from the TechSpec with `RG` per `quality-typescript.md`.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `core` importing `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | 0 new of 0 | OK |
| QA-02 | `any` in any form | blocking | `"${RG[@]}" ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | 0 new of 0 | OK |
| QA-03 | empty `catch` / `.catch(() => {})` | blocking | `"${RG[@]}" -U 'catch\s*(…)…' "${files[@]}"` | 0 new of 8 | pre-existing: test-cleanup `rm(...).catch(() => {})` in `e2e-symlinked-harness-config` (2), `symlinked-harness-config` (2), `linked-project-root` (1), `change-applier` (3), same as codereview_03 |
| QA-04 | `console.log` / `process.stdout.write` on hook path | blocking | `"${RG[@]}" 'console\.log\|process\.stdout\.write' "${hook_files[@]}"` | 0 new of 1 | OK: `process-hook-host.ts:29` `writeStdout` is the response writer the profile excludes |
| QA-05 | sync file/process API in in-process extension | blocking | `"${RG[@]}" '\b(readFileSync\|…\|spawnSync)\b' "${in_process_files[@]}"` | 0 new of 0 | OK |
| QA-06 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `"${RG[@]}" '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | 0 new of 0 | OK |
| QA-07 | file above 100 lines | reservation | `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | 0 new of 2 | pre-existing: `runtime-overhead.test.ts` 105 (107 at base, 2 lines shorter after T11), `process-hook-host.test.ts` 105 (105 at base) |
| QA-08 | 4+ parameters in a declaration | reservation | `"${RG[@]}" -P '\((?:[^(),]+,){3,}…' <non-test files>` | 0 new of 3 | pre-existing: `pi/runtime.ts:51`, `oh-my-pi/runtime.ts:51` (Terrain baseline); `diagnostics/in-process-sampler.ts:40` has 3 parameters (generic-comma false positive) |

- Terrain baseline: applied from TechSpec; test-file hits checked against `git show 1474f54:<file>`.
- Hits discounted by baseline: 13 (8 QA-03, 2 QA-07, 3 QA-08); 1 QA-04 hit excluded by profile scope.
- Reservations accumulated in the feature: 0 new.
- Suggested escalation: no trigger fired.

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01, DEC-02 config shape and `snapshot` section | YES | unchanged; this repository's config matches DEC-T07-01 |
| DEC-03 init flags | YES | `init-snapshot.test.ts` passes |
| DEC-04 `remove` always prunes owned runtime | YES | unchanged |
| DEC-05 single guidance module | YES | live telemetry text matches the Contracts table |
| DEC-06 no deny, neutral failures | YES | unchanged |
| DEC-07 no pre-tool hook | YES | unchanged; `ToolCall` members remain unread (OI-02, accepted for prd-14) |
| DEC-08 to DEC-14 | YES | unchanged since codereview_03 |
| DEC-15 repository moved by hand; `init` and `doctor` with the new build | YES | installed assets byte-identical to this review's build; `doctor` without error or `ASSET_OUTDATED` |
| DEC-16 tests and acceptance mode | YES | unchanged |
| Contracts: agent-facing and resume text | YES | `zone-guidance.ts` unchanged |
| Contracts: report schemas | YES | `npm run schemas:check` exit 0; `npm run build` regenerated byte-identical schemas |
| TC-01 traceability | YES | `tasks.md:43` now names `tests/unit/main.test.ts` and `npm run package:smoke`; `main.test.ts:16-18` asserts exit 64 for `plan`, `run`, `wrap`. TechSpec TC-01 still names `e2e-09` (approved source, out of T13 scope; `tests/e2e/e2e-09.test.ts` exists) |
| Relevant files — Delete list | YES | unchanged |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01–T06 | `done/task_01.md` … `task_06.md` | COMPLETE | unchanged since codereview_03 |
| T07 | `done/task_07.md` | COMPLETE | dogfood install still current |
| T08, T09 | `codereview_01/done/task_08.md`, `task_09.md` | COMPLETE | unchanged; T09's `init` summary preserved by T12 |
| T10 | `codereview_02/done/task_10.md` | COMPLETE | installed hook still byte-identical to the build |
| T11 | `codereview_03/done/task_11.md` | COMPLETE | acceptance re-verified: `rg -n task_plan` over both files empty; both suites pass. Its outcome sentence ("No test writes a `task_plan.json` file") is broader than its declared scope; the other writes are legitimate negative fixtures (NFR-03 row) |
| T12 | `codereview_03/done/task_12.md` | COMPLETE | `text.ts:25` gates the summary on `report.command === 'init'`; `cli-install-text.test.ts` covers both branches. The handoff records the new test file and the removed weak test, which its "Affected files" did not list; justified by the 100-line lint limit |
| T13 | `codereview_03/done/task_13.md` | COMPLETE | `tasks.md:43` row updated; IDs and tasks unchanged |

## Executed validations

- Profile and scope: CLI commands `init`, `doctor`, `remove`; process hooks; in-process extensions; Claude Code mod. End-to-end per `AGENTS.md`: the built CLI against temporary fixture repositories through the suite's e2e files, plus `doctor` on this repository.
- Validated state: worktree at `1474f54` plus the uncommitted T01–T13 changes; Windows 11, Git Bash, same Node environment as codereview_03.
- Reused evidence: MA-01 (a)–(d) from `done/task_07.md#Handoff` (pre-T08 build). Still valid: round 3 changed only `src/cli/output/text.ts` (CLI text, not on any hook or mod path) and tests; the installed hook, status line, and mod are byte-identical to this review's build. Manifest asset hashes from codereview_03 stand: no installed asset changed since.
- Manual acceptance: MA-01 not re-run (manual, interactive). O-07 stays open.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed; `schemas/*.json` sha256 unchanged by the generation | TC-17 prerequisite, FR-11 |
| `npm run schemas:check` | passed (exit 0) | NFR-02, FR-09 |
| `rtk proxy npx eslint .` | passed (exit 0, no output) | NFR-02 |
| `npm run typecheck` | passed (exit 0) | NFR-02 |
| `npm run coverage` | passed: 197 files, 1,052 tests; statements 94.51%, branches 89.54%, functions 95.97%, lines 94.51%; 354.1 s; `cli-install-text` 2, `cli-output-text` 3, `runtime-light-mode` 5, `runtime-overhead` 4 tests pass; `text.ts` 100% | NFR-02, NFR-03, NFR-04, TC-01..TC-15 suites, T11/T12 |
| `npm run package:smoke` | passed (exit 0); 590 packaged files; help lists `init`, `doctor`, `remove` | FR-03, TC-01 |
| Quality profile QA-01..QA-08 over 240 files | no new hit | QA-01..QA-08 |
| `cmp` installed hook, status line, and mod against `dist/assets/runtime/` | identical, before and after the coverage run | FR-11, DEC-15 |
| `node dist/src/cli/main.js doctor` in this repository (3 runs, after the suite) | exit 1, warnings only: `RUNTIME_ERRORS_RECORDED` (historical), `VERSION_FLOOR_UNVERIFIED`; `AUTO_RESTART_READY` OK; no `[ERROR]`, no `ASSET_OUTDATED`; Claude Code overhead 213.5, 197.2, 162.9 ms against the 100 ms target | FR-11, TC-17, NFR-04 (limitation) |
| TC-16 `rg -n "task_plan\|state_checkpoint\|context-brake-protocol\|fullMode\|lightMode\|delegatedSnapshot\|context-brake (run\|wrap\|plan)" README.md AGENTS.md CLAUDE.md .gitignore .agents package.json src` | empty (exit 1) | FR-11, FR-12 |
| `rg -n "Delete configuration file\|preview\.summary" tests src` | only `removal-service.ts:33` (the change), `text.ts:25`, and `cli-install-text.test.ts`; no integration or e2e test asserted the removed `remove` line | T12, OI-04 |
| `rg -n "TC-01" tasks.md` / `rg -n "'plan'\|'run'\|'wrap'" tests/unit/main.test.ts` | row 43 names the unit test and smoke; `main.test.ts:16-18` | T13, OI-03 |
| `.context-brake/runtime/errors.jsonl` last line before and after the review | `2026-10-06T22:23:04Z` both times | test hygiene |
| `git status --porcelain` before and after the review's commands | 549 entries, identical lists | scope |

## Findings

No actionable findings.

Optional improvements:

- OI-02 (persistent from codereview_01; DEC-07; accepted as an open item for prd-14 by DEC-HIL-RES-01): `ToolCall` (`src/core/contracts/runtime.ts:11-17`) still carries `category`, `paths`, `command`, and `skill`, classified by every adapter's `toolOf`; nothing reads them after T08.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_03/OI-01 | resolved | `rg -n task_plan tests/integration/runtime-overhead.test.ts tests/integration/runtime-light-mode.test.ts` empty; test renamed "injects nothing at session start" (`runtime-light-mode.test.ts:38`); both suites pass |
| codereview_03/OI-02 | persistent (accepted, DEC-HIL-RES-01) | `src/core/contracts/runtime.ts:11-17` |
| codereview_03/OI-03 | resolved | `tasks.md:43` names `tests/unit/main.test.ts` and `npm run package:smoke` |
| codereview_03/OI-04 | resolved | `src/cli/output/text.ts:25` keys the summary on `report.command === 'init'`; `tests/unit/cli-install-text.test.ts:28-33` asserts `remove` prints no summary |
| codereview_02/CR-01 | resolved | installed hook byte-identical to this review's build; no `ASSET_OUTDATED` |
| codereview_01/CR-01 | resolved | unchanged since codereview_02 |
| codereview_01/CR-02 | resolved | `init` summary still printed (`cli-install-text.test.ts:24-27`) |

## Limitations and open items

- `tasks.md` sha256 is now `43116ad8…` (codereview_03: `b3142b33…`; approved by DEC-HIL-02: `54681574…`). T13 added the line-43 change to the earlier drift; the feature folder is untracked, so the drift cannot be diffed. Not a finding; the HIL can re-hash.
- `tasks.md:68` (Coverage gate, "Validation profile") still lists `e2e-09` among the rewritten e2e files; the file exists, so the line is not false, and it was outside T13's declared scope. Observation only.
- Platforms: only Windows 11 (Git Bash) exercised; Linux and macOS unverified, as the TechSpec records (NFR-01).
- NFR-04: conformant only through the relative limits of `runtime-overhead`, the proof `tasks.md` names. The dogfood `doctor` overhead is 213.5, 197.2, and 162.9 ms against the 100 ms target (codereview_03: 222.8, 189.2, 213.3 ms). No pre-feature light-mode measurement exists, and checking out the base is outside the reviewer contract, so "does not grow" is not verifiable from this figure.
- MA-01 is manual and was not re-run; its evidence is reused for the reasons under Executed validations. O-07 (first (d) attempt without `/clear`) stays unexplained.
- `doctor` still warns `RUNTIME_ERRORS_RECORDED` (2,094 historical `INVALID_CONFIG` lines from 2026-10-06); no line was added during this review.
- During this review ContextBrake telemetry reported `YELLOW` with `action=keep working; …`; no snapshot or reset was due.
- Nothing for `workflow.md` beyond this report: no exception or missing source blocked the review.

## Conclusion

Correction round 3 resolves the three reservations DEC-HIL-RES-01 chose: the runtime tests no longer write plan fixtures (OI-01), `remove` no longer prints the config summary while `init` keeps it (OI-04), and the TC-01 traceability row names its real proof (OI-03). The only source change is one condition in `src/cli/output/text.ts`, fully covered. This review rebuilt the package and re-ran lint, typecheck, schemas check, package smoke, and the full coverage suite (1,052 tests, 94.51% statements) on Windows, all passing; the quality profile adds no hit, and the dogfood install stays byte-identical to the build with `doctor` reporting no error. Every obligation is conformant or carries a recorded platform or manual limitation. The only remaining reservation is OI-02, accepted for prd-14. The status is APPROVED WITH RESERVATIONS.
