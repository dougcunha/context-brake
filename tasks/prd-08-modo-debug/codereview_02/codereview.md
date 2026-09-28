# Code review report — prd-08-modo-debug

## Summary

- Status: APPROVED
- Git scope: `791defe2f6651f6595f701e7494c797cdfc58e81..working tree` (feature diff uncommitted; new files marked intent-to-add), limited to `src/`, `tests/`, `schemas/`, and `README.md`. Pre-existing changes listed in `workflow.md#Feature Summary` are excluded.
- Previous review: `tasks/prd-08-modo-debug/codereview_01/codereview.md` (APPROVED WITH RESERVATIONS), with correction round 1 (`codereview_01/done/task_03.md`)

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-08-modo-debug/prd.md` (sha256 d8bd29be…f7bf7b940, matches `DEC-HIL-12`) | read |
| TechSpec | `tasks/prd-08-modo-debug/techspec.md` (sha256 c2e612f4…822d2299, matches `DEC-HIL-12`) | read |
| Manifest | `tasks/prd-08-modo-debug/tasks.md` (hash differs from `DEC-HIL-12` only by the State and `Problems and solutions` updates written during execution); `done/task_01.md`, `done/task_02.md`, `codereview_01/done/task_03.md` | read |
| Implementation | `git diff 791defe` over 32 files (17 `src/`, 12 `tests/`, 2 `schemas/`, `README.md`): 481 insertions, 43 deletions | delimited |

Re-review scope. Compared with `codereview_01` (30 files, 436 insertions, 43 deletions), the diff gained exactly two test files: `tests/integration/init-debug-mode-disable.test.ts` (new, 35 lines) and `tests/integration/doctor-light-mode.test.ts` (+10). 436 + 35 + 10 = 481, and deletions did not change. Three `src/` files have modification times later than `codereview_01`: `debug-mode-merge.ts`, `installation-builder.ts`, and `instruction-service.ts`. These are the three files T03's break check changed and then restored. Their full diffs against the base were read in this review. They contain the reviewed behavior (`DEBUG_SUMMARY.remove` = `remove the debug mode`, `isDebugModeInEffect` checks `lightMode === undefined`, `planExistingInstruction` keeps `existing === target`), so none of the break-check changes remain.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | `init --debug` persists the mode and the config is schema-valid; a later `init` keeps it and changes nothing | `debug-mode-merge.ts:mergeDebugMode,applyDebugMode`; `configuration.ts:76`; `init-config-updates.ts` | `init-debug-mode.test.ts`, `debug-mode-merge.test.ts`, `init-arguments.test.ts` | conformant | Unchanged since `codereview_01`; rerun green in this session |
| FR-02 | Managed block gains the exact line; bytes outside the markers and EOL preserved; symlink | `instruction-markers.ts:DEBUG_MODE_LINE,referenceBlockFor`; five call sites | `instruction-markers.test.ts`, `init-debug-mode.test.ts` (LF, CRLF, symlink) | conformant | Unchanged; rerun green |
| FR-03 | Forced injection while on; `injectionMode` unchanged | `injection-policy.ts:12`, `brake-engine.ts:64` | `injection-policy.test.ts`, `brake-engine-debug.test.ts` (TC-05), `e2e-debug-mode.test.ts` (TC-12) | conformant | Unchanged; rerun green |
| FR-04 | `--no-debug` restores the bytes; both flags → usage error | `debug-mode-merge.ts` | `init-debug-mode.test.ts` (byte-for-byte restore, exit 64) | conformant | Unchanged; rerun green |
| FR-05 | Light-mode conflicts; `--light --no-debug` | `init-config-updates.ts:21,32` | `init-debug-mode.test.ts` "init debug conflicts", "switches … with --light --no-debug" | conformant | Unchanged; rerun green |
| FR-06 | Plan shows enabling and disabling; `doctor` shows the mode; missing or extra line repaired; `remove` clears the line | `installation-builder.ts:12,60`; `doctor-service.ts:99`; `report-service.ts:82`; `doctor-mode-text.ts`; `text.ts:59`; `instruction-service.ts:66-67` | TC-08–TC-11, plus the T03 cases: `init-debug-mode-disable.test.ts` "init --no-debug plan (codereview_01/CR-01, FR-06, DEC-06)" and "init debug drift with the mode off (codereview_01/CR-01, FR-06, DEC-08)"; `doctor-light-mode.test.ts` "doctor with a debug key in light mode (codereview_01/CR-01, FR-06, DEC-07)" | conformant | The disable preview, the extra-line drift, and the doctor absence in light mode now have direct assertions (see Previous findings) |
| NFR-01 | Line ≤ 60 `o200k_base` tokens; telemetry `v2` unchanged | `instruction-markers.ts:DEBUG_MODE_LINE` | `instruction-markers.test.ts` token budget | conformant | `telemetry-block.ts` untouched |
| NFR-02 | Linux, macOS, Windows; symlinks | Existing writer | Symlink and CRLF tests; e2e | conformant (Windows); Linux and macOS not verifiable locally | Windows 11 local run; Linux and macOS through CI |
| DEC-01–DEC-08 | See TechSpec adherence | — | — | conformant | — |
| TC-01–TC-13 | Test cases | Test files above | All named files ran and passed | conformant | TC-05 at the unit level, as accepted in `codereview_01` |
| T03 | Regression tests for `codereview_01/CR-01` | `tests/integration/init-debug-mode-disable.test.ts`, `tests/integration/doctor-light-mode.test.ts:60-68` | The three cases above | conformant | Each case cites `codereview_01/CR-01` and `FR-06` in its `describe`; both files are under 100 lines (35, 68); no `src/` change |
| QA-01–QA-07 | Quality profile | — | Profile commands | conformant | See Quality profile |
| Manual acceptance | Optional (owner: user): a real Claude Code session prints the line | — | — | not verifiable (optional, not executed) | Not essential per `techspec.md#test-approach` |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` | OK | New test file is 35 lines; `doctor-light-mode.test.ts` is 68; the new case sits in its own `describe`, within the 30-line function limit (`npm run lint` exit 0); no comments added |
| `tests.md` | OK | Test names cite the finding and `FR-06`. The drift case asserts byte equality (`toBe(plain)`) with the plain install, and the preview case asserts an unchanged tree (`changedPaths(...)` is `[]`) and parses with `installReportSchema` |
| `javascript-typescript.md` | OK | Typecheck exit 0 |
| Test lanes (`tests/test-lanes.ts`) | OK | `init-debug-mode-disable.test.ts` runs in-process through `dispatchCommand` (`tests/helpers/delegated-world.ts:24`), so it needs no lane entry; `doctor-light-mode.test.ts` was already in `PROCESS_LANE_FILES` |
| `file-changes.md`, `cli-output.md`, architecture | OK | No production change since `codereview_01`; its evidence still holds |

## Quality profile

Run in this session over the 29 TypeScript files in the diff (12 under `src/core/`).

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | TechSpec command over `files` | 0 | OK |
| QA-02 | `@ts-ignore`/`@ts-nocheck`/`eslint-disable` | blocking | TechSpec command over `files` | 0 | OK |
| QA-03 | `core` → `infrastructure`/`cli` | blocking | TechSpec command over `core_files` | 0 | OK |
| QA-04 | stdout on the hook path | blocking | TechSpec command over `hook_files` | 0 | OK |
| QA-05 | 4+ parameters | reservation | TechSpec regex over `files` | 0 | OK |
| QA-06 | `throw new Error(` | reservation | TechSpec command over `files` | 0 | OK |
| QA-07 | File above 100 lines | reservation | `rg -c -H '^' … \| awk -F: '$2 > 100'` | 1 of 1 pre-existing (`instruction-service.ts:103`, 103 at base) | pre-existing |

- Terrain baseline: applied from TechSpec.
- Hits discounted by baseline: 1 (`instruction-service.ts`).
- Reservations accumulated in the feature: 1 open item (`codereview_01/CR-02`, accepted by `DEC-HIL-13`); no profile reservation hits.
- Suggested escalation: no trigger fired (under 8 reservation hits, no touched file above 200 lines, no block duplicated in 3+ places).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01, DEC-02, DEC-03, DEC-05, DEC-08 | YES | Unchanged since `codereview_01`; the restored `debug-mode-merge.ts` and `instruction-service.ts` match the contract |
| DEC-04, DEC-06, DEC-07 | PARTIAL (line budgets only) | Behavior as specified. The line budgets were exceeded as recorded in `codereview_01`: `brake-engine.ts` 98, and `installation-service.ts`, `doctor-service.ts`, `report-service.ts` at 100 each, measured again in this session. Accepted open item `codereview_01/CR-02` (`DEC-HIL-13`) |
| TC-05 level | PARTIAL (accepted) | Unit-level with port fakes, accepted in `codereview_01` |
| Contracts (config, block text, `doctor --json`, exit codes) | YES | `schemas:check` exit 0 |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` (linked, State `[x]`) | COMPLETE | TC-01–TC-09 rerun green |
| T02 | `done/task_02.md` (linked, State `[x]`) | COMPLETE | TC-10–TC-13 rerun green. The light-mode half of its first criterion is now covered by T03's doctor case |
| T03 | `codereview_01/done/task_03.md` | COMPLETE | Both work items checked; the three cases exist and pass; files stay under 100 lines; lint, typecheck, and full coverage pass in this session. The handoff's break check was not reproduced here. The reviewer instead read each assertion against the behavior it covers (see Previous findings) |

## Executed validations

- Profile and scope: CLI (`init`, `doctor`, `remove`) and the Claude Code hook engine; end-to-end runs the built CLI and hook against temporary fixture repositories, per `AGENTS.md`.
- Validated state: working tree at `791defe` plus the feature diff and the T03 test diff, Windows 11, Node 24, run in this review session.
- Reused evidence: none. Every command below was run in this session. The T03 handoff's full-suite run came before its lint-driven test move, so the run below is the only full-suite evidence on the final test code.
- Manual acceptance: optional, not executed (owner: user).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed (exit 0) | CLI and hook assets |
| `npm run typecheck` | passed (exit 0) | all |
| `npm run lint` | passed (exit 0) | all, including the T03 files |
| `npm run schemas:check` | passed (exit 0) | TC-13, FR-01, FR-06 |
| `npm run coverage` | passed (exit 0): 287 files, 1,824 passed, 3 skipped, 95.61% lines, 91.4% branches; 454 s | TC-01–TC-12, T03 cases, all FR/NFR |
| `npm run package:smoke` | passed (exit 0) | built package |
| Quality profile QA-01–QA-07 | passed (only the pre-existing QA-07 hit) | QA-01–QA-07 |

## Findings

No new findings.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_01/CR-01 | resolved | (1) Disable preview: `tests/integration/init-debug-mode-disable.test.ts` "init --no-debug plan …" parses the `--dry-run --json --no-debug` report with `installReportSchema`, asserts the config summary contains `remove the debug mode`, asserts `AGENTS.md` and `CLAUDE.md` are in the plan, and asserts an unchanged tree. (2) Extra-line drift: "init debug drift with the mode off …" adds `DEBUG_MODE_LINE` before `CURRENT_END_MARKER`, runs `init`, asserts exit 0, and asserts `AGENTS.md` equals the plain install byte for byte. (3) Light-mode doctor: `tests/integration/doctor-light-mode.test.ts:60-68` adds `debug: true` next to `lightMode` and asserts that `doctor --json` has no `debugMode` and that `doctor` text has no `debug mode:`. All three passed in this session's coverage run. |
| codereview_01/CR-02 | persistent (accepted open item, `DEC-HIL-13`) | `installation-service.ts`, `doctor-service.ts`, and `report-service.ts` are still at 100 lines, and `brake-engine.ts` at 98. This is not a correction target |

## Limitations and open items

- Independence: this review ran in the same harness session ID as the authoring sessions (`owner_session` `session_012UFSLu4nVNJ5SBBZyBqZJP`), as `codereview_01` did. The context was cleared with `/clear` after `DEC-PAUSE-CR01`, and this context wrote no feature or test code. Following the snapshot Load protocol for independent stages, it loaded only the header, next step brief, open threads, and `on-run` entries, and it did not open `jev-log.jsonl` before writing this report.
- The preview case checks that `AGENTS.md` and `CLAUDE.md` are in the plan, not that their `kind` is `update`. Since both files exist after the first `init`, a `create` is not reachable here, so this gap is not a finding.
- Platforms: Windows only; Linux and macOS depend on CI.
- Manual acceptance (optional, owner: user) was not executed.
- CLI QA was skipped by `DEC-HIL-12`; the end-to-end cases TC-11 and TC-12 ran here as part of `npm run coverage`.
- Accepted open item: `codereview_01/CR-02` (line budgets), per `DEC-HIL-13`.

## Conclusion

`codereview_01/CR-01` is resolved: the three behaviors it named now have direct assertions, and those assertions passed in this session. The implementation changed only by adding these tests. The three source files touched by the break check contain the reviewed behavior again. All obligations are conformant, all three tasks are complete, and links and state are consistent. Build, typecheck, lint, schema check, full coverage, and the package smoke all pass. The quality profile has no new hits. This review raises no new findings. The only open item is `codereview_01/CR-02`, which the human already accepted in `DEC-HIL-13`, so it does not call for another reservations HIL. The status is APPROVED.
