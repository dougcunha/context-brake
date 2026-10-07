# Code review report — prd-12-refatoracao-modo-leve-modo-unico (Light mode as the only mode)

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `1474f541e9cfedcd3c759e39580065525e10fd20..uncommitted worktree` (263 modified, 266 deleted, 6 renamed, 3 new test files; feature artifacts under `tasks/prd-12..14` untracked)
- Previous review: —

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-12-refatoracao-modo-leve-modo-unico/prd.md` | read; sha256 `cbe0bb94…` matches `approved_sources` (DEC-AMEND-01) |
| TechSpec | `tasks/prd-12-refatoracao-modo-leve-modo-unico/techspec.md` | read; sha256 `7394e6a5…` matches `approved_sources` (DEC-HIL-02) |
| Manifest | `tasks/prd-12-refatoracao-modo-leve-modo-unico/tasks.md` | read; sha256 `b3142b33…` differs from approved `54681574…` (see limitations) |
| Handoffs | `done/task_01.md` … `done/task_07.md` | read; all seven present, all work items checked, State T01–T07 `done` |
| Workflow | `workflow.md` | read (DEC-PD-01..03, DEC-HIL-02, DEC-AMEND-01, DEC-PROC-01/02, DEC-T05-01, DEC-T07-01/02, REC-T07-01) |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter (header, next step brief, open threads, `on-run` L-01/L-04/L-08 only). Header validated: `git_head` 1474f54 = `HEAD`; `covers_through` T07 matches the manifest; worktree matches the described diff |
| Implementation | `git diff 1474f54` plus untracked `tests/helpers/session-telemetry.ts`, `tests/unit/configuration-snapshot.test.ts`, `tests/unit/snapshot-merge.test.ts` | delimited |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Plan mode, checkpoint, boot, `plan` command, plan/checkpoint schemas removed | deleted modules (T02); `src/cli/argument-parser.ts:parseCliArgs` dispatches only init/doctor/remove | `tests/unit/schemas.test.ts` (TC-02), `tests/unit/main.test.ts` | conformant | `rg "task-plan\|state-checkpoint\|task_plan\|state_checkpoint\|planPresence\|readBoot" src schemas scripts` empty; built CLI `plan` exit 64; `schemas/{task-plan,state-checkpoint}.schema.json` deleted |
| FR-02 | No mode keys or flags; removed key named on failure | `src/core/contracts/configuration.ts:configurationSchema` (strictObject); `src/core/validation/configuration-validator.ts:toIssues` (one issue per unrecognized key, message names every issue) | `tests/unit/configuration-snapshot.test.ts` (TC-04), `tests/unit/init-arguments.test.ts` (TC-06) | conformant | built CLI `init --light` → `INVALID_ARGUMENTS` exit 64; schema has none of `fullMode/lightMode/stateStorage/delegatedSnapshot/brake/runner/instructionFiles` |
| FR-03 | `run`, `wrap`, `runner`, run summary schema, runner codes removed | runner tree deleted; `src/cli/exit-codes.ts` only healthy/warning/error/invalidArguments; `CLI_ERROR_COMMANDS` = init/remove/doctor | `tests/unit/main.test.ts`; `npm run package:smoke` | conformant | built CLI `run`/`wrap` exit 64 "Allowed commands: init, doctor, remove."; help lists three commands |
| FR-04 | `snapshot` section with trigger zone and optional commands; init flags set/clear | `configuration.ts:snapshotSchema`, `src/core/services/snapshot-merge.ts:mergeSnapshot`, `src/cli/init-arguments.ts` | `tests/integration/init-snapshot.test.ts` (TC-05), `tests/unit/snapshot-merge.test.ts` | conformant | temp fixture: `--snapshot-trigger YELLOW` alone wrote trigger; `--snapshot-command /sdd-snapshot --resume-command /resume` wrote both; `--no-snapshot-command` kept `triggerZone: YELLOW` and cleared both; combining with `--snapshot-command` → exit 64; doctor showed `snapshot: /sdd-snapshot at YELLOW, resume: /resume` |
| FR-05 | Action at/above trigger names command + marker; resume text on every reset | `src/core/services/zone-guidance.ts:zoneAction,resumeText`; `session-reset-handler.ts:handleSessionReset`; `failure-policy.ts:deadlineBootDecision` | `tests/unit/zone-guidance.test.ts` (TC-07), `tests/integration/runtime-light-mode.test.ts` | conformant | texts match the TechSpec Contracts table exactly; MA-01 (a) and (c) in `done/task_07.md#Handoff` |
| FR-06 | Without command: header + generic action, no marker, no resume, no extra file | `zoneAction` returns `GENERIC_ACTIONS[zone]` when `command === undefined`; `resumeText` null without `resumeCommand` | `tests/integration/runtime-light-mode.test.ts` (TC-08) | conformant | code path at `zone-guidance.ts:zoneAction`; temp-fixture `init` wrote only config, manifest, harness assets |
| FR-07 | Advisory brake; no pre-tool hook installed or handled; neutral on failure; deny artifacts gone | `RuntimeDecision` has no `deny`, `RuntimeEvent` no `pre_tool` (`src/core/contracts/runtime.ts`); registrations removed in all updaters/planners; `failure-policy.ts:resolveFailure` neutral | `tests/unit/runtime-*.test.ts`, `hook-registration-paths` (TC-09), `tests/integration/runtime-failure-policy.test.ts` (TC-10) | conformant | `rg "PreToolUse\|preToolUse\|tool\.execute\.before\|'tool_call'\|pre_tool" src` → only the Antigravity detector event list and legacy cleanup, both unchanged from base; temp-fixture `.claude/settings.json` has only PostToolUse/SessionStart/Stop. See CR-01 for leftover deny-only path normalization |
| FR-08 | No protocol, blocks, `.gitignore`, state files; no `instructionFiles`; no `--remove-state` | `removal-helper.ts` (runtime pruning always), `snapshot-helper.ts:collectProjectSnapshots`, `CHANGE_OWNERS` without protocol/instruction/ignore | `tests/e2e/e2e-07-08.test.ts` (TC-12), `tests/unit/removal-service.test.ts` | conformant | temp fixture: `CLAUDE.md` and `.gitignore` untouched by init; `remove --remove-state` exit 64; `remove` deleted `runtime/sessions/a.jsonl` and kept `task_plan.json` |
| FR-09 | Doctor drops removed findings and reports `snapshot` | `src/core/contracts/diagnostics.ts` (`snapshotReport`, no `checkpointMode`/`brakeWindow`); `doctor-report-extras.ts` bridge finding from `contextWindow.bridge` | `tests/integration/doctor-light-mode.test.ts` (TC-13), `tests/unit/doctor-context-window.test.ts` (TC-14) | conformant | `rg "brakeWindow\|checkpointMode\|BRAKE_COOPERATIVE\|BRAKE_BLOCKS" src schemas` empty |
| FR-10 | Mod restart gated on the signal only | `src/core/services/auto-restart-policy.ts:decideRestart`; `RESTART_REASON_CODES` without checkpoint codes | `tests/integration/claude-mod-{gates,restart,guards}.test.ts` (TC-03) | conformant | MA-01 (d) rerun: mod log `.context-brake/runtime/claude-mod/13404a65-….json` holds `RESTARTED`; debug log `~/.claude/debug/7a0aa04b-….txt:32-33` shows `SessionStart` returning the resume text (verified in this review) |
| FR-11 | This repository on the single mode | `context-brake.config.json` (`snapshot` per DEC-T07-01), `.agents/settings.json` without PreToolUse, protocol file deleted | TC-17 manual | conformant | `node dist/src/cli/main.js doctor` in this repo: exit 1, warnings only (`RUNTIME_ERRORS_RECORDED`, historical); `CLAUDE.md` = `@AGENTS.md`; no ContextBrake block in `.gitignore`/`AGENTS.md` |
| FR-12 | Docs describe only the single mode; README snapshot example | `README.md`, `AGENTS.md`, `CLAUDE.md`, `.agents/rules/*`, SDD skill texts, `docs/telemetry-block.md`, research note | `tests/unit/readme-*.test.ts` (TC-15), TC-16 scan | conformant | TC-16 `rg` empty; remaining hits are the SDD `checkpoint.json` concept, the README upgrade note and roadmap rows marking superseded PRDs, and "never denies" statements |
| NFR-01 | Platforms unchanged | no path, symlink, or line-ending code changed beyond deletions | platform suites in coverage | not verifiable (Linux/macOS) | Windows 11 verified in this review; Linux and macOS unverified, as the TechSpec records |
| NFR-02 | Lint, typecheck, coverage ≥ 80%, schemas check | — | full suite | conformant | see Executed validations |
| NFR-03 | Tests of removed features deleted, not skipped | 146+ test files deleted | — | conformant | skip/todo markers in `tests`: base 10, now 4; no new skip. Leftover plan setup noted as OI-01 |
| NFR-04 | Hook overhead does not grow | pre-tool process per call removed on 5 harnesses | `tests/integration/runtime-overhead.test.ts` (passes, relative p95 limits) | conformant (suite) | doctor here reports Claude Code overhead 355.5 ms / 100 ms target (fail); no base-commit measurement was taken, so absolute growth is not verifiable; CR-01 notes avoidable realpath work on the hook path |
| UX (PRD "User experience") | `init` reports the snapshot settings it wrote, or says only zone headers will be injected | `installation-builder.ts:snapshotSummary` feeds `preview.summary`, which only `--json` prints | — | non-conformant | see CR-02 |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` Architecture (core never imports infrastructure/cli) | OK | QA-01 over 29 changed `src/core` files: no hit |
| `code-standards.md` | OK | no changed `src` file above 100 lines; no new 4+ parameter declaration |
| `javascript-typescript.md` | OK | QA-02, QA-06: no hit; `npx tsc -p tsconfig.check.json --noEmit` exit 0 |
| `node.md` | OK | QA-05 over 15 in-process files: no hit |
| `tests.md` | OK with OI-01 | no new skip; `tests/integration/runtime-overhead.test.ts:73-74` keeps a plan fixture |
| `harness-adapters.md` | OK | no pre-tool registration; vendor research note dated in `docs/research/harness-integrations.md:25` |
| `file-changes.md` | OK | init/remove touch only config, manifest, harness assets, runtime files (temp-fixture run) |
| `cli-output.md` | OK | errors use `[ERROR] INVALID_ARGUMENTS: …` with allowed values |
| `sdd-snapshot` load protocol (independent stage) | OK | only header, brief, open threads, `on-run` loaded |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `core` importing `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` (29 files) | 0 new of 0 | OK |
| QA-02 | `any` in any form | blocking | over 236 changed `.ts` (src, tests, scripts, `vitest.config.ts`) | 0 new of 0 | OK |
| QA-03 | empty `catch` / `.catch(() => {})` | blocking | over 236 changed `.ts` | 0 new of 8 | pre-existing: 8 test-cleanup `rm(...).catch(() => {})` in `tests/e2e/e2e-symlinked-harness-config.test.ts`, `tests/integration/{linked-project-root,symlinked-harness-config,change-applier}.test.ts`, same count at base |
| QA-04 | `console.log` / `process.stdout.write` on hook path | blocking | over 33 changed runtime/harness hook files | 0 new of 0 | OK |
| QA-05 | sync file/process API in in-process extension | blocking | over 15 OpenCode/Pi/Oh-My-Pi files | 0 new of 0 | OK |
| QA-06 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | over 236 changed `.ts` | 0 new of 0 | OK |
| QA-07 | file above 100 lines | reservation | `rg -c -H '^' … \| awk -F: '$2 > 100'` | 0 new of 2 | pre-existing: `tests/unit/process-hook-host.test.ts` 105 and `tests/integration/runtime-overhead.test.ts` 107, same at base; no `src` hit (baseline `installation-service.ts` resolved at 87) |
| QA-08 | 4+ parameters in a declaration | reservation | over 104 changed non-test files | 0 new of 3 | pre-existing: `pi/runtime.ts:51`, `oh-my-pi/runtime.ts:51` (Terrain baseline); `diagnostics/in-process-sampler.ts:40` false positive (3 parameters, generic comma), same at base |

- Terrain baseline: applied from TechSpec. It covers only `src` target files; the test-file hits above were checked against `git show 1474f54:<file>` and are unchanged.
- Hits discounted by baseline: 13 (8 QA-03, 2 QA-07, 3 QA-08).
- Reservations accumulated in the feature: 0 new.
- Suggested escalation: no trigger fired.

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01, DEC-02 config shape and `snapshot` section | YES | `configuration.ts:configurationSchema,snapshotSchema` |
| DEC-03 init flags | YES | `init-arguments.ts:INIT_OPTIONS`; `--no-snapshot-command` exclusive with `--snapshot-command`/`--resume-command`, compatible with `--snapshot-trigger` (reading of "the other two flags") |
| DEC-04 `remove` always prunes owned runtime | YES | temp-fixture `remove` deleted `runtime/sessions/a.jsonl` |
| DEC-05 single guidance module | YES | `zone-guidance.ts`; `light-guidance`, `delegated-guidance`, `checkpoint-mode`, `zone-actions` deleted |
| DEC-06 no deny, no block log, neutral failures | YES | `runtime.ts`, `failure-policy.ts`, `session-ledger.ts` |
| DEC-07 no pre-tool hook | PARTIAL | registrations and handlers removed; `tool-path-normalizer.ts` (listed under Relevant files — Delete) still runs on every process hook (CR-01) |
| DEC-08 capabilities and support levels | YES | `harness.ts:SUPPORT_LEVELS = ['full','partial']`, 4 capability IDs; `support-service.ts:deriveLevel`, floor on `post_tool_telemetry` |
| DEC-09 window trust | YES | only `acceptsDeclaredWindow` remains |
| DEC-10 doctor | YES | `snapshot` field, removed fields/findings, bridge finding from `contextWindow.bridge` |
| DEC-11 install without support files | YES | `support-files.ts`, protocol/instruction/gitignore services deleted |
| DEC-12 mod signal-only | YES | `auto-restart-policy.ts:decideRestart` |
| DEC-13, DEC-14 deletions and wiring | YES | `main.ts`, `argument-parser.ts`, `composition-root.ts`, `runtime-composition.ts` |
| DEC-15 repository moved by hand | YES | config, `.agents/settings.json`, `.gitignore`, protocol file, rules and skills; `.claude` is a junction to `.agents` |
| DEC-16 tests and acceptance mode | YES | `test:acceptance`, `TEST_MODE_VARIABLE`, `acceptance-scale.ts` gone; `release:check` without `--mode acceptance` |
| Contracts: agent-facing text table and resume text | YES | `zone-guidance.ts` strings match the table and `[ContextBrake resume v1] Run "<cmd>" before continuing.` |
| Contracts: report schemas | YES | `npm run schemas:check` exit 0; support enum `full\|partial`; owner enum without removed owners |
| TC-01 level (e2e `e2e-09`) | PARTIAL | proven in process (`tests/unit/main.test.ts`) and by `npm run package:smoke` against the built CLI; `tasks.md` traceability still names `e2e-09` |
| Relevant files — Delete list | PARTIAL | every listed `src` file is gone except `src/infrastructure/runtime/tool-path-normalizer.ts` (CR-01) |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | runner, `run`/`wrap`, `runner` key, run-summary schema, `RUN_*` removed; verified by scans and built CLI |
| T02 | `done/task_02.md` | COMPLETE | plan/checkpoint/boot and mod gate removed; T02 scan empty |
| T03 | `done/task_03.md` | COMPLETE | `snapshot` section, flags, guidance, doctor field; verified in temp fixture |
| T04 | `done/task_04.md` | INCOMPLETE | deny, block log, allowlists, `brake` key, brake window removed; `tool-path-normalizer.ts` is in the T04 delete list "if it is orphaned" and its output now has no reader, but it was neither deleted nor justified in the handoff (CR-01) |
| T05 | `done/task_05.md` | COMPLETE | no pre-tool registration on 8 harnesses; 3 remaining `rg` hits are the unchanged Antigravity detector and legacy cleanup |
| T06 | `done/task_06.md` | COMPLETE | init/remove without support files; the handoff's lint claim was corrected in T07 (recorded there) |
| T07 | `done/task_07.md` | COMPLETE | docs, rules, skills, acceptance mode, dogfooding; MA-01 (a)–(d) pass, (d) on the DEC-T07-02 rerun |

## Executed validations

- Profile and scope: CLI commands `init`, `doctor`, `remove`; process hooks; in-process extensions; Claude Code mod. End-to-end per `AGENTS.md`: built CLI against temporary fixture repositories (suite e2e files plus a temp fixture run in this review).
- Validated state: worktree at `1474f54` plus the uncommitted T01–T07 diff, including the post-coverage help-text change T07 recorded; Windows 11, Git Bash, Node from the local install.
- Reused evidence: MA-01 from `done/task_07.md#Handoff` (manual, interactive Claude Code); spot-verified here through the mod log `RESTARTED` record and the new session's debug log `SessionStart` resume text.
- Manual acceptance: MA-01 (a)–(d) pass per T07; O-07 (first (d) attempt without `/clear`) remains unexplained.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run schemas:check` | passed (exit 0, before and after build; `schemas/` unchanged by the build) | NFR-02, FR-09, DEC-08 |
| `npx eslint .` (via `rtk proxy`) | passed (exit 0, no output) | NFR-02 |
| `npx tsc -p tsconfig.check.json --noEmit` | passed (exit 0) | NFR-02 |
| `npm run build` | passed | TC-17 prerequisite |
| `npm run coverage` | passed: 196 files, 1,049 tests; statements 94.52%, branches 89.57%, functions 95.99%, lines 94.52%; 316.6 s | NFR-02, TC-01..TC-15 suites |
| `npm run package:smoke` | passed; `plan`/`run`/`wrap` rejected by the built CLI; help lists init, doctor, remove | FR-01, FR-03, TC-01 |
| TC-16 `rg` (README, AGENTS, CLAUDE, .gitignore, .agents, package.json, src) | empty | FR-11, FR-12 |
| T01/T02/T04/T05/T06 acceptance scans | empty except documented false positives (`ProcessRunner`, `CONTEXT_BRAKE_*`, `INVALID_CONTEXTBRAKE_CONFIG`) and the Antigravity detector/legacy cleanup | FR-01..FR-03, FR-07, FR-08 |
| Built CLI temp fixture: `run`/`wrap`/`plan`, `init --light`, `init`, snapshot flags, `doctor`, `remove --remove-state`, `remove` | as expected (see matrix) | FR-02..FR-04, FR-08, FR-09, TC-05, TC-12 |
| `node dist/src/cli/main.js doctor` in this repository | exit 1, warnings only, no error | FR-11, TC-17 |
| `.context-brake/runtime/errors.jsonl` after the coverage run | no line newer than 2026-10-06T22:23Z; the suite wrote nothing into this repository's runtime | test hygiene |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Medium | TechSpec Relevant files (Delete — `src/infrastructure/runtime/{…,tool-path-normalizer}.ts`), T04 scope ("if it is orphaned"), DEC-07 (deny-shaped adapter code), NFR-03 | `src/infrastructure/runtime/process-hook-host.ts:7,74` — `dispatchHook` calls `normalizeEventToolPaths` on every process-hook event; for each post-tool event whose tool carries a path (read/write/edit-class tools; it returns early at `tool-path-normalizer.ts:6` when `paths` is empty) it runs `realpath` on the project root and each path's parent (`:11-19`). Its output has no reader: `brake-engine.ts:handlePostTool` reads only `toolUseId`, and `rg "event\.tool\|\.tool\.(paths\|category\|command\|skill)" src` hits only the normalizer, the two `toolUseId` reads in `brake-engine.ts:33,39` (prefix match), and the adapter `toolOf` producers; no module reads `category`, `paths`, `command`, or `skill`. The only consumer was the deleted `brake-allowlist.ts` (base `:14-20`). `tests/unit/tool-path-normalizer.test.ts` (including a `state_checkpoint.json` path) and `tests/integration/runtime-light-mode.test.ts:10` still exercise it. T04's handoff neither deletes it nor records why it stays | A deny-only module survives against the approved deletion list; every path-bearing post-tool hook does avoidable async filesystem work before loading the config, on the path NFR-04 bounds; a test for a removed feature remains | Delete `src/infrastructure/runtime/tool-path-normalizer.ts` and `tests/unit/tool-path-normalizer.test.ts`; in `process-hook-host.ts:dispatchHook` use `input.adapter.mapEvent(...)` directly and drop the import; remove the normalizer from `tests/integration/runtime-light-mode.test.ts`; drop the lane entry if any. Whether the now unread `ToolCall` members (`category`, `paths`, `command`, `skill`) stay for prd-14 is a separate decision (OI-02) |
| CR-02 | Low | PRD "User experience" (`init` reports the snapshot skill settings it wrote, or says that only zone headers will be injected) | `src/core/services/installation-builder.ts:59-69` builds `preview.summary` (`set the snapshot command … at …` / `… (zone headers only)`), but the text renderer never prints it (`rg summary src/cli/output/text.ts` empty); only `init --json` carries it. Temp fixture: `init --yes --snapshot-command /sdd-snapshot …` text output lists file changes only. With no snapshot flag (fresh install), the summary has no snapshot part at all, so neither output says that only zone headers will be injected | A user running `init` in a terminal does not see which snapshot settings were written or that no snapshot command is configured; `doctor` is the only text surface that shows them | Print the preview summary in the `init` text output, and on a fresh install (or whenever the written config has no `snapshot.command`) include the "zone headers only" summary; cover with an `init-snapshot` text assertion |

Optional improvements:

- OI-01 (tests.md, NFR-03): `tests/integration/runtime-overhead.test.ts:73-74` still writes a `task_plan.json` plan fixture in `beforeEach`; no code reads it after T02.
- OI-02 (DEC-07): `ToolCall` (`src/core/contracts/runtime.ts:9-17`) and every adapter's `toolOf` still classify `category`, `paths`, `command`, and `skill`, which only the removed deny consumed. Keep only if prd-14 needs them; otherwise reduce to `name`.
- OI-03 (traceability): `tasks.md` maps TC-01 to `e2e-09`; the proof is `tests/unit/main.test.ts` plus `package:smoke`. Update the row when the manifest is next touched.

## Previous findings (re-review only)

Not applicable: first review.

## Limitations and open items

- `tasks.md` sha256 `b3142b33…` differs from the approved `54681574…` (DEC-HIL-02). The feature folder is untracked, so the drift cannot be diffed; `done/task_06.md#Handoff` attributes it to State checkboxes, links, and `Problems and solutions`, and the DAG and traceability tables read consistent with the TechSpec. Not treated as a finding; the HIL can re-hash.
- Platforms: only Windows 11 (Git Bash) was exercised; Linux and macOS are unverified, as the TechSpec records (NFR-01).
- NFR-04: verified only through the relative limits of `runtime-overhead`; no measurement at the base commit was taken. `doctor` here reports Claude Code overhead 355.5 ms against the 100 ms target (T07 recorded 287 ms), on this machine.
- MA-01 is manual and was not re-run; its evidence is reused from T07 and spot-checked on disk. O-07 (first (d) attempt, session `e02e2b55`, no `/clear` and no mod record) stays unexplained, as the snapshot and T07 record.
- `doctor` in this repository warns `RUNTIME_ERRORS_RECORDED` (2,094 `INVALID_CONFIG` lines from 2026-10-06, written by pre-T05 tests and the old config); no new line was written during this review.
- During this review the ContextBrake telemetry (estimated against the configured 128,000-token window) reached `RED` and `CRITICAL` and asked for `/sdd-snapshot`; under the delegated-reviewer contract the snapshot was not written and no session pause ran.
- Nothing for `workflow.md` beyond this report: no exception or missing source blocked the review.

## Conclusion

The feature delivers its outcomes: one mode with one behavior per zone, the snapshot section and flags, the resume text, an advisory brake with no pre-tool hook on any harness, a smaller surface, and this repository running on the new install. Lint, typecheck, schemas, the full coverage run (94.52% statements), and the package smoke pass on Windows, and the quality profile adds no hit. The review is REJECTED because one approved obligation is incomplete: `tool-path-normalizer.ts`, on the TechSpec deletion list and conditioned in T04 on being orphaned, survives with no reader of its output and still runs on every path-bearing post-tool hook (CR-01). CR-02 (init text output does not report the snapshot settings) is a Low PRD UX gap. Both corrections are small and local; a correction round followed by a re-review should be enough.
