# Code review report — prd-24-doctor-fix-command (`context-brake fix`)

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `419c0bd328b2cd209ed98846e6b50b73ef4664fd..worktree` (uncommitted and untracked files on 2026-10-21). `HEAD` is `419c0bd`. The worktree also holds the uncommitted prd-22 and prd-23 diffs (`workflow.md#context`). This review attributes changes to prd-24 through the 8 handoffs (T01 to T06, T07, T08) and the TechSpec file list.
- Previous review: `tasks/prd-24-doctor-fix-command/codereview_02/codereview.md` (APPROVED WITH RESERVATIONS, OI-01 to OI-03)

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-24-doctor-fix-command/prd.md` | read; sha256 `82f97a24…3019` equals the A-01 approval |
| TechSpec | `tasks/prd-24-doctor-fix-command/techspec.md` | read; sha256 `a4326cc4…3c60` equals the A-02 approval |
| Manifest | `tasks/prd-24-doctor-fix-command/tasks.md` | read; sha256 `bf6a362a…5e2e`, the same value as in codereview_01 and codereview_02. It differs from the A-02 approval `cfff25cf…91d0` only in the `State` and `Problems and solutions` sections (mutable state) |
| Tasks and handoffs | `done/task_01.md` to `done/task_06.md` | read; 6 of 6 in `done/`, manifest State `[x]`, 1 `Produced result` handoff line in each |
| Correction tasks | `codereview_01/done/task_07.md`, `codereview_02/done/task_08.md` | read; both in `done/`, handoffs filled |
| Previous reviews | `codereview_01/codereview.md`, `codereview_02/codereview.md` | read; codereview_01/CR-01; codereview_02/OI-01 to OI-03 and open items 1 to 4 |
| Workflow, checkpoint, decisions | `workflow.md`, `checkpoint.json`, `autonomous-decisions.md` | read; mode `auto`; H-01, A-01 to A-05, R-01, R-02; AUTO-01 to AUTO-06; `correction_round` 2; `active_work` reviewer `codereview_03` |
| Snapshot | `context-snapshot.md` | not present |
| Implementation | git diff from `419c0bd`, untracked prd-24 files, handoffs | delimited (shared worktree with prd-22 and prd-23, see limitations) |

Files changed after `codereview_02/codereview.md` was written (`find -newer` over `src`, `tests`, `scripts`, `schemas`, `README.md`, `docs`, `.agents`, `package.json`, before any command of this review): `tests/integration/fix-command.test.ts`, `tests/integration/fix-interactive.test.ts`, `tests/unit/doctor-fix-pointer.test.ts`, `tests/unit/doctor-text.test.ts`. These 4 files equal the T08 handoff list. No production file changed after codereview_02. The DEC and FR rows below therefore reuse the codereview_01 and codereview_02 code reading for production code. This review ran every command again.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | `fix.group` on each warning or error finding; none on `ok` | `src/core/services/fix-groups.ts:assignFixGroups`, `CORE_FIX_GROUPS`; `claude-code/fix-groups.ts`; `common/restart-fix-groups.ts`; `src/cli/doctor-diagnosis.ts` | `tests/unit/fix-groups.test.ts` (TC-01, TC-02); `tests/integration/doctor-fix-groups.test.ts` (TC-05) | conformant | Code unchanged since codereview_02; suites pass in this run |
| FR-02 | `Fix: run context-brake fix` and `, N fixable` | `src/cli/output/doctor-rows.ts` (`FIX_COMMAND_TEXT`); `doctor-text.ts` | `tests/unit/doctor-fix-pointer.test.ts:20-36` (TC-03, moved by T08 from `doctor-text.test.ts`) | conformant | 3 cases: header `WARN (0 errors, 2 warnings, 1 fixable)`; 1 `Fix: run context-brake fix` line and the manual remediation kept; no count when nothing is fixable. Suite passes |
| FR-03 | Plan reruns `init`, keeps configuration choices | `src/cli/init-plan.ts:planInit`; `src/cli/fix-steps.ts` | `fix-command.test.ts:33-40` (TC-10); init suites (TC-24) | conformant | `autoRestart` kept and mod files reinstalled; suites pass |
| FR-04 | Plan shown before confirmation on a TTY | `src/cli/commands/fix-interactive.ts` | `fix-interactive.test.ts:22-31` (TC-11) | conformant | `Plan` before `Nothing was written.`; watched hashes unchanged |
| FR-05 | One question per decision | `src/cli/fix-prompts.ts`; `fix-decisions.ts` | `fix-interactive.test.ts:43-82` (TC-12) | conformant | Answers `y`/`n`, `r`/`f`/`s`, `claude-code`/empty. The `s` case now runs inside a `.git` folder and keeps `.gitignore` byte-identical with the bridge path listed (`:60-71`) |
| FR-06 | `--yes` skips decisions; `--yes --force` takes the first option; `--harness` | `src/cli/fix-decisions.ts` | `fix-command.test.ts:54-70,74-90` (TC-13) | conformant | `--yes` keeps the modified file; `--yes --force` replaces it; `--harness claude-code` installs; `--yes --force` on an inactive bridge gives `fixed` and the local status line points to the bridge (`:85-90`, new in T08) |
| FR-07 | No TTY, no `--yes`: `CONFIRMATION_REQUIRED`, no change | `src/cli/commands/fix.ts` | `fix-stops.test.ts` (TC-14) | conformant | Suite passes |
| FR-08 | `--dry-run` changes nothing | `src/cli/commands/fix.ts` | `fix-stops.test.ts` (TC-15); `tests/e2e/e2e-fix.test.ts` (TC-21) | conformant | Suites pass on the built CLI |
| FR-09 | Outcome per finding | `src/core/services/fix-outcomes.ts` | `fix-outcomes.test.ts` (TC-08); `fix-command.test.ts:42-50` (TC-16) | conformant | `fixed`, `skipped`, `manual`; exit 1. See open item 4 |
| FR-10 | Restart note | `fix-outcomes.ts`; `src/cli/output/harness-labels.ts` | `fix-text.test.ts` (TC-17); `fix-command.test.ts:37` | conformant | `Restart Claude Code to load the new mod.` |
| FR-11 | No installation: change nothing, name `init` | `fix-steps.ts` | `fix-stops.test.ts` (TC-18) | conformant | Suite passes; codereview_02 probe A on the same production code |
| FR-12 | Nothing to fix: change nothing, list manual findings | `fix-steps.ts`; `fix-text.ts` | `fix-stops.test.ts` (TC-19); `fix-command.test.ts:29-30` | conformant | Second `fix --yes` gives `nothing_to_fix` and equal hashes |
| FR-13 | Exit codes 0, 1, 2, 64; cancel = first diagnosis | `fix-outcomes.ts:exitCodeOf`; `fix-arguments.ts` | `fix-command.test.ts`; `fix-stops.test.ts`; `fix-arguments.test.ts`; `fix-interactive.test.ts:28` | conformant | Suites pass |
| FR-14 | `fix --json` and `schemas/fix-report.schema.json` | `src/core/contracts/fix-report.ts`; `schemas/fix-report.schema.json` | `e2e-fix.test.ts` (TC-21); `schemas.test.ts` (TC-22) | conformant | `npm run schemas:check` exit 0; e2e passes |
| FR-15 | Doctor schema optional `fix`; `schemaVersion` 1 | `src/core/contracts/diagnostics.ts`; `schemas/doctor-report.schema.json`, `install-report.schema.json` | `schemas.test.ts` (TC-04) | conformant | Suite passes; `schemas:check` exit 0 |
| FR-16 | README and help | `README.md`; `src/cli/composition-root.ts` | TC-23 (review of the diff, codereview_02) | conformant | Unchanged since codereview_02 |
| NFR-01 | Writes only through the `init` plan; `.gitignore` marked block lists owned files in full | `fix-steps.ts` (`NodeChangeApplier`); `claude-code/planner.ts` (`keptBridgeAssets`) | TC-24 suites; `fix-command.test.ts:74-83`; `fix-interactive.test.ts:60-71` | conformant | Manifest and `.gitignore` byte-identical after a skipped bridge decision, on the `--yes` path and on the TTY path |
| NFR-02 | No change to a user-modified file without an answer or `--force` | `asset-currency.ts`; `fix-decisions.ts` | `asset-currency.test.ts` (TC-06); TC-12; TC-13 | conformant | Suites pass |
| NFR-03 | Output rules | `fix-rows.ts`; `fix.ts` (`isInteractive`) | `fix-text.test.ts`; `fix-interactive.test.ts:33-39` | conformant | Text labels for every outcome; no prompt with `--yes` |
| NFR-04 | Linux, macOS, Windows | existing planner and applier | Windows local only | not verifiable | The TechSpec assigns Linux and macOS to CI; not run here |
| NFR-05 | Exit codes from `EXIT_CODES`; doctor codes unchanged | `fix-steps.ts`; `fix-outcomes.ts` | TC-08 | conformant | Unchanged since codereview_02; suites pass |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` architecture (core never imports infrastructure or cli) | OK | QA-04: 0 hits over the `src/core/` files of the scope |
| `code-standards.md`, `javascript-typescript.md` | OK | `npm run lint` exit 0; `npm run typecheck` exit 0; QA-01 to QA-03: 0 hits; every file of the scope at or below 100 lines (largest: `doctor-text.test.ts` 94, `adapter.ts` 94, `statusline-planner.ts` 92, `fix-command.test.ts` 91) |
| `harness-adapters.md` | OK | No adapter change after codereview_02 |
| `file-changes.md` | OK | `fix-command.test.ts:74-83` and `fix-interactive.test.ts:60-71` assert the marked `.gitignore` block byte for byte |
| `cli-output.md` | OK | Unchanged since codereview_02; suites pass |
| `tests.md` (IDs in test names, in-process tests, coverage) | OK | T08 tests cite FR-02, TC-03, FR-06, OI-02, OI-03; they run through `runInProcessCli` with `fakeProcessRunner` (`tests/helpers/in-process-cli.ts:20`). Coverage exit 0, 96.31 % statements |
| `tests.md` (time budget) | NOT OK (open item) | `npm run test:budget` exit 1: 215.2 s against 180 s, and 1 pre-existing timing test failed in that run (see open item 2) |

## Quality profile

Scope: 55 TypeScript files: the 17 new prd-24 source files, the prd-24-touched source files of the TechSpec list and the handoffs (including `claude-code/planner.ts`, `common/restart-fix-groups.ts`, `init-config-updates.ts`), the 3 scripts, and the prd-24 tests including the new `tests/unit/doctor-fix-pointer.test.ts`. `core_files` = the 8 files under `src/core/`. codereview_02 counted 53 files without a file list; this list comes from the 8 handoff `Changed files` lines plus the TechSpec list, so the 2 extra files can come from a different count, not from new code.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | `rg -n ':\s*any\b\|\bas any\b\|<any>' files` | 0 new of 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n '@ts-ignore\|@ts-nocheck\|eslint-disable' files` | 0 new of 0 | OK |
| QA-03 | Empty `catch` | blocking | `rg -n -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' files` | 0 new of 0 | OK |
| QA-04 | `core` imports `infrastructure` or `cli` | blocking | `rg -n "from '(\.\./)+(infrastructure\|cli)/" core_files` | 0 new of 0 | OK |
| QA-05 | `throw new Error(` | reservation | `rg -n 'throw new Error\(' files` | 0 new of 9 | pre-existing: `scripts/check-schemas.ts:17`, `scripts/check-package.ts:41-44,50,59,63,75` (baseline lines shifted by the inserted schema list lines) |
| QA-06 | 4+ parameters | reservation | `rg -n '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' files` | 0 new of 1 | pre-existing: `tests/unit/asset-currency.test.ts:12`, `it.each` callback with 1 destructured parameter |
| QA-07 | File above 100 lines | reservation | `rg -c -H '^' files \| awk -F: '$2 > 100'` | 0 new of 0 | OK. `doctor-text.test.ts` is back to 94 lines (codereview_02: 112) |

- Terrain baseline: applied from TechSpec.
- Hits discounted by baseline: 10 (QA-05: 9; QA-06: 1).
- Reservations accumulated in the feature: 0 profile hits.
- Suggested escalation: 1 trigger fired, "the same block in 3+ places". The `finding(code, severity)` test factory exists in 3 files: `tests/unit/doctor-fix-pointer.test.ts:8-10` (new in T08), `tests/unit/doctor-text.test.ts:9-11` (byte-identical body), and `tests/unit/doctor-rows.test.ts:8-10` (same body plus an `extra` spread). `report()` is also identical in `doctor-fix-pointer.test.ts:12-14` and `doctor-text.test.ts:13-15`. Count: 3 places, 1 from prd-24 and 2 from prd-23. Suggestion to the HIL, not executed: `ts-tests` for one shared doctor report fixture helper in `tests/helpers/`. This is test-only and low risk (OI-01).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 to DEC-16 | YES | No production file changed after codereview_02, which recorded YES for each decision with `path:line` evidence. The suites that prove each decision pass in this run |
| DEC-05 (`'keep'`) | YES | Now also proven on the TTY path inside a Git project: `fix-interactive.test.ts:60-71` (1 question, owned hashes equal, `.gitignore` lists the bridge) |
| Test approach TC-03 location | YES | TC-03 moved from `tests/unit/doctor-text.test.ts` (TechSpec location) to `tests/unit/doctor-fix-pointer.test.ts` by T08, which A-05 and AUTO-06 approved to close QA-07. Not a finding |
| Fix report contract | YES | `fixReportSchema` unchanged; `e2e-fix.test.ts` validates the document on the built CLI |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | Fix groups, doctor text, schema field; code unchanged since codereview_02 |
| T02 | `done/task_02.md` | COMPLETE | `planInit`, `overwritePaths`, `'keep'` |
| T03 | `done/task_03.md` | COMPLETE | Report contract, outcome service, `parseFix` |
| T04 | `done/task_04.md` | COMPLETE | Command without prompts |
| T05 | `done/task_05.md` | COMPLETE | TTY flow |
| T06 | `done/task_06.md` | COMPLETE | Published schema, e2e smoke, README |
| T07 | `codereview_01/done/task_07.md` | COMPLETE | `keptBridgeAssets`; resolved codereview_01/CR-01 |
| T08 | `codereview_02/done/task_08.md` | COMPLETE | The changed-file list equals the files changed after codereview_02. Acceptance: the 4 touched suites pass in the coverage run; line counts 94, 36, 91, 83 (all at or below 100); lint and typecheck exit 0. No production code changed |

## Executed validations

- Profile and scope: CLI command surface (`src/cli/`, `src/core/`) and the Claude Code install planner. In-process integration tests and the e2e smoke on the built CLI. No new built-CLI probe: no production code changed after the codereview_02 probes.
- Validated state: worktree at `419c0bd` plus uncommitted changes, Windows 11, Git Bash, 2026-10-21. `git status --porcelain`: 88 entries before and after the commands; codereview_02 recorded 87, and the 1 new entry is `?? tests/unit/doctor-fix-pointer.test.ts`. `npm run build` runs `schemas:generate`, so the 4 files under `schemas/` got a new modification time; `schemas:check` passed after the build and the schema diff against the base is unchanged.
- Reused evidence: the codereview_02 production code reading and its built-CLI probes A and B, because no production file changed after that report. No command result is reused.
- Manual acceptance: not run. The TechSpec manual TTY script belongs to CLI QA (A-03).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed (exit 0) | rules |
| `npm run typecheck` | passed (exit 0) | rules |
| `npm run build` | passed (exit 0) | FR-14 e2e precondition |
| `npm run schemas:check` | passed (exit 0) | FR-14, FR-15, TC-22 |
| `npm run coverage` | passed (exit 0): 288 files, 1540 passed, 1 skipped; 96.31 % statements, 93.25 % branches, 97.36 % functions; vitest `Duration 146.28s`, wall 151 s | FR-01 to FR-16, TC-01 to TC-25, T07, T08 |
| `npm run test:budget` | failed (exit 1): 215.2 s of 180 s, and `TEST_RUN_FAILED` from 1 test: `tests/integration/node-process-runner.test.ts` "returns a timed-out probe and stops descendants when the parent times out". Slowest: `statusline-shell` 33.3 s, `init-assistant-equivalence` 31.8 s, `e2e-doctor` 25.8 s, `codex-hook-command-shells` 25.2 s, `e2e-fix` 23.1 s | `tests.md` budget; open item 2 |
| `npx vitest run tests/integration/node-process-runner.test.ts` | passed (8 of 8, 4.5 s) | open item 2 (the failed test passes alone and in the coverage run) |
| Quality profile QA-01 to QA-07 | passed; 0 blocking, 0 reservation hits | Quality profile |

## Findings

No finding in this review.

Optional improvements (not blocking):

| ID | Source | Evidence | Recommendation |
| --- | --- | --- | --- |
| OI-01 | Escalation trigger "same block in 3+ places" (`techspec.md#quality-profile`) | `finding()` test factory in `tests/unit/doctor-fix-pointer.test.ts:8-10`, `doctor-text.test.ts:9-11`, `doctor-rows.test.ts:8-10`; `report()` in `doctor-fix-pointer.test.ts:12-14` and `doctor-text.test.ts:13-15`. T08 added the third copy | Optional: move the doctor finding and report factories to one helper in `tests/helpers/` (see the escalation suggestion) |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_01/CR-01 | resolved | Production code unchanged since codereview_02; `fix-command.test.ts:74-83` and `fix-interactive.test.ts:60-71` pass; `statusline-keep.test.ts` passes |
| codereview_02/OI-01 | resolved | `tests/unit/doctor-text.test.ts` 94 lines; TC-03 in `tests/unit/doctor-fix-pointer.test.ts` (36 lines); QA-07 0 hits |
| codereview_02/OI-02 | resolved | `fix-interactive.test.ts:61` creates `.git`; `:64` adds `.gitignore` to the owned files; `:68` asserts equal hashes and 1 question; `:69` asserts the bridge path in `.gitignore` |
| codereview_02/OI-03 | resolved | `fix-command.test.ts:85-90`: `fix --yes --force` on an inactive bridge gives `STATUSLINE_BRIDGE_INACTIVE` `fixed`, and `.claude/settings.local.json` contains `context-brake-statusline` |

## Limitations and open items

- Open item 1 (PRD decision, accepted in A-05): after `--no-statusline-bridge`, or after the `forget` answer, `STATUSLINE_BRIDGE_ABSENT` stays in group `automatic` (FR-01 table), and `fix` reports it `FAILED` with an empty plan. This follows the approved PRD.
- Open item 2 (repository owner, accepted in A-05): `npm run test:budget` failed at 215.2 s against 180 s (codereview_02: 219.6 s). The same run also failed 1 pre-existing timing test, `tests/integration/node-process-runner.test.ts` (timed-out probe). prd-24 does not touch that test or its code (`git status` shows no change for it). The test passed in the coverage run of this review and passed alone (8 of 8). `npm run coverage` took 151 s of wall time, within budget. CPU load was 77 % after the runs, with 19 `node` and 13 `claude` processes. The repository owner must decide whether to rerun the budget on an idle machine. The status does not count it as a failing feature test.
- Open item 3 (repository owner, accepted in A-05): the e2e list in `.agents/rules/tests.md` names init, doctor, and remove; `tests/e2e/e2e-fix.test.ts` follows the per-command pattern.
- Open item 4 (TechSpec owner, accepted in A-05): DEC-06 extends a skipped `STATUSLINE_BRIDGE_INACTIVE` only to `claude-code` codes that start with `STATUSLINE_`. An `ASSET_OUTDATED` on the bridge asset in the same run reports `failed`, not `skipped`.
- Not verifiable: Linux and macOS (NFR-04) were not run here; the TechSpec assigns them to CI. This is why the status is not `APPROVED`: one NFR stays `not verifiable` in the matrix, as in codereview_02, although the TechSpec does not require it in the local review.
- Not verifiable: the `askUi` select path of the clack prompt port has no automated test (DEC-13; `ScriptedPrompts` has no `askUi`). The manual TTY acceptance script belongs to CLI QA.
- Scope limitation: the worktree holds the uncommitted prd-22 and prd-23 diffs on the same files. This review attributes the prd-24 part through the handoffs and the TechSpec file list. `tests/unit/doctor-text.test.ts` is untracked (created by prd-23), so its T08 change shows only through the line count and content, not through `git diff`.
- State note: every `- [ ]` work item in `done/task_01.md` to `done/task_06.md`, `codereview_01/done/task_07.md`, and `codereview_02/done/task_08.md` stays unchecked. The `done/` location, the manifest State `[x]`, and the filled handoffs prove completion.
- State note: `codereview_02/` holds no corrections manifest; `workflow.md` A-05 and `autonomous-decisions.md#AUTO-06` record the T08 plan. `workflow.md` has no entry for the T08 execution; the T08 handoff and the file changes after codereview_02 agree. The flow owner can add the entry.

## Conclusion

The 3 optional improvements of codereview_02 are resolved, by test and by line count, and codereview_01/CR-01 stays resolved. T08 changed tests only, and no production file changed after codereview_02. Every FR and NFR that this environment can verify is conformant, T01 to T08 are complete, and lint, typecheck, build, schemas check, coverage (1540 passed), and the e2e smoke pass. The quality profile has 0 blocking hits and 0 reservation hits. One escalation trigger fired on a duplicated test factory (OI-01, optional). The test time budget failed again on a loaded machine, with 1 pre-existing timing test that passes alone; A-05 routes the budget to the repository owner. NFR-04 stays not verifiable here and belongs to CI. Status: APPROVED WITH RESERVATIONS. Next step per A-03: CLI QA (`sdd-execute-qa`), after the HIL decides on OI-01.
