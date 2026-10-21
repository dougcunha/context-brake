# Code review report — prd-24-doctor-fix-command (`context-brake fix`)

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `419c0bd328b2cd209ed98846e6b50b73ef4664fd..worktree` (uncommitted and untracked files on 2026-10-21). `HEAD` is `419c0bd`. The worktree also holds the uncommitted prd-22 and prd-23 diffs (`workflow.md#context`). This review attributes changes to prd-24 through the 9 handoffs (T01 to T06, T07, T08, T09) and the TechSpec file list.
- Previous review: `tasks/prd-24-doctor-fix-command/codereview_03/codereview.md` (APPROVED WITH RESERVATIONS, OI-01)

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-24-doctor-fix-command/prd.md` | read; sha256 `82f97a24…3019` equals the A-01 approval |
| TechSpec | `tasks/prd-24-doctor-fix-command/techspec.md` | read; sha256 `a4326cc4…3c60` equals the A-02 approval |
| Manifest | `tasks/prd-24-doctor-fix-command/tasks.md` | read; sha256 `bf6a362a…5e2e`, the same value as in codereview_01 to codereview_03. It differs from the A-02 approval `cfff25cf…91d0` only in the `State` and `Problems and solutions` sections (mutable state) |
| Tasks and handoffs | `done/task_01.md` to `done/task_06.md` | read; 6 of 6 in `done/`, manifest State `[x]`, `Produced result` and `Changed files` handoff lines filled |
| Correction tasks | `codereview_01/done/task_07.md`, `codereview_02/done/task_08.md`, `codereview_03/done/task_09.md` | read; all 3 in `done/`, handoffs filled; T09 work items `[x]` |
| Previous reviews | `codereview_01/codereview.md` to `codereview_03/codereview.md` | codereview_03 read in full; earlier IDs taken from codereview_03 and checked against current code and tests |
| Workflow, checkpoint, decisions | `workflow.md`, `checkpoint.json`, `autonomous-decisions.md` | read; mode `auto`; H-01, A-01 to A-06, R-01 to R-03; AUTO-01 to AUTO-07; `correction_round` 3; `active_work` reviewer `codereview_04` |
| Snapshot | `context-snapshot.md` | not present |
| Implementation | git diff from `419c0bd`, untracked prd-24 files, handoffs | delimited (shared worktree with prd-22 and prd-23, see limitations) |

Files changed after `codereview_03/codereview.md` was written (`find -newer` over `src`, `tests`, `scripts`, `schemas`, `README.md`, `docs`, `.agents`, `package.json`, before any command of this review): `tests/helpers/doctor-fixtures.ts`, `tests/unit/doctor-fix-pointer.test.ts`, `tests/unit/doctor-rows.test.ts`, `tests/unit/doctor-text.test.ts`. These 4 files equal the T09 handoff list. No production file changed after codereview_03. The FR, NFR, and DEC rows below therefore reuse the production code reading of codereview_01 to codereview_03, plus the spot checks named in the rows. This review ran every command again.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | `fix.group` on each warning or error finding; none on `ok` | `src/core/services/fix-groups.ts:assignFixGroups`, `CORE_FIX_GROUPS`; `claude-code/fix-groups.ts`; `common/restart-fix-groups.ts`; `src/cli/doctor-diagnosis.ts` | `tests/unit/fix-groups.test.ts` (TC-01, TC-02); `tests/integration/doctor-fix-groups.test.ts` (TC-05) | conformant | Code unchanged since codereview_03; suites pass in this coverage run |
| FR-02 | `Fix: run context-brake fix` and `, N fixable` | `src/cli/output/doctor-rows.ts`; `doctor-text.ts` | `tests/unit/doctor-fix-pointer.test.ts:18-28` (TC-03) | conformant | 3 cases unchanged by T09: header `WARN (0 errors, 2 warnings, 1 fixable)`; 1 `Fix: run context-brake fix` line, manual remediation kept; no count when nothing is fixable. Suite passes |
| FR-03 | Plan reruns `init`, keeps configuration choices | `src/cli/init-plan.ts:planInit`; `src/cli/fix-steps.ts` | `fix-command.test.ts` (TC-10); init suites (TC-24) | conformant | Suites pass |
| FR-04 | Plan shown before confirmation on a TTY | `src/cli/commands/fix-interactive.ts` | `fix-interactive.test.ts` (TC-11) | conformant | Suite passes |
| FR-05 | One question per decision | `src/cli/fix-prompts.ts`; `fix-decisions.ts` | `fix-interactive.test.ts` (TC-12) | conformant | Suite passes; `askUi` select path see limitations |
| FR-06 | `--yes` skips decisions; `--yes --force` takes the first option; `--harness` | `src/cli/fix-decisions.ts` | `fix-command.test.ts` (TC-13) | conformant | Suite passes |
| FR-07 | No TTY, no `--yes`: `CONFIRMATION_REQUIRED`, no change | `src/cli/commands/fix.ts` | `fix-stops.test.ts` (TC-14) | conformant | Suite passes |
| FR-08 | `--dry-run` changes nothing | `src/cli/commands/fix.ts` | `fix-stops.test.ts` (TC-15); `tests/e2e/e2e-fix.test.ts` (TC-21) | conformant | Suites pass on the built CLI (build in this review) |
| FR-09 | Outcome per finding | `src/core/services/fix-outcomes.ts` | `fix-outcomes.test.ts` (TC-08); `fix-command.test.ts` (TC-16) | conformant | Suites pass |
| FR-10 | Restart note | `fix-outcomes.ts`; `src/cli/output/harness-labels.ts` | `fix-text.test.ts` (TC-17) | conformant | Suite passes |
| FR-11 | No installation: change nothing, name `init` | `fix-steps.ts` | `fix-stops.test.ts` (TC-18) | conformant | Suite passes |
| FR-12 | Nothing to fix: change nothing, list manual findings | `fix-steps.ts`; `fix-text.ts` | `fix-stops.test.ts` (TC-19); `fix-command.test.ts` | conformant | Suites pass |
| FR-13 | Exit codes 0, 1, 2, 64; cancel = first diagnosis | `fix-outcomes.ts:exitCodeOf`; `fix-arguments.ts` | `fix-command.test.ts`; `fix-stops.test.ts`; `fix-arguments.test.ts`; `fix-interactive.test.ts` | conformant | Suites pass |
| FR-14 | `fix --json` and `schemas/fix-report.schema.json` | `src/core/contracts/fix-report.ts`; `schemas/fix-report.schema.json` | `e2e-fix.test.ts` (TC-21); `schemas.test.ts` (TC-22) | conformant | `npm run schemas:check` exit 0; e2e passes |
| FR-15 | Doctor schema optional `fix`; `schemaVersion` 1 | `src/core/contracts/diagnostics.ts`; `schemas/doctor-report.schema.json`, `install-report.schema.json` | `schemas.test.ts` (TC-04) | conformant | Suite passes; `schemas:check` exit 0; schema diff against the base: 2 files, 34 insertions, as before |
| FR-16 | README and help | `README.md`; `src/cli/composition-root.ts` | TC-23 (review of the diff, codereview_02) | conformant | Unchanged since codereview_02 |
| NFR-01 | Writes only through the `init` plan; `.gitignore` marked block lists owned files in full | `fix-steps.ts` (`NodeChangeApplier`); `claude-code/planner.ts:28` (`keptBridgeAssets`) | TC-24 suites; `fix-command.test.ts`; `fix-interactive.test.ts` | conformant | Suites pass |
| NFR-02 | No change to a user-modified file without an answer or `--force` | `asset-currency.ts`; `fix-decisions.ts` | `asset-currency.test.ts` (TC-06); TC-12; TC-13 | conformant | Suites pass |
| NFR-03 | Output rules | `fix-rows.ts`; `fix.ts` (`isInteractive`) | `fix-text.test.ts`; `fix-interactive.test.ts` | conformant | Suites pass |
| NFR-04 | Linux, macOS, Windows | existing planner and applier | Windows local only | not verifiable | The TechSpec assigns Linux and macOS to CI; not run here |
| NFR-05 | Exit codes from `EXIT_CODES`; doctor codes unchanged | `fix-steps.ts`; `fix-outcomes.ts` | TC-08 | conformant | Suites pass |
| codereview_03/OI-01 (T09) | One helper for the doctor finding and report test factories | `tests/helpers/doctor-fixtures.ts:3-9` (`doctorFinding`, `doctorReport`) | `doctor-rows.test.ts:4`, `doctor-text.test.ts:5`, `doctor-fix-pointer.test.ts:5` import it | conformant | No local doctor `finding()` or `report()` in the 3 files (search over `tests/`); the 3 suites pass with 22 tests (9, 10, 3), the same count as the T09 handoff |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` architecture (core never imports infrastructure or cli) | OK | QA-04: 0 hits over the 8 `src/core/` files of the scope |
| `code-standards.md`, `javascript-typescript.md` | OK | `npm run lint` exit 0; `npm run typecheck` exit 0; QA-01 to QA-03: 0 hits; every file of the scope at or below 100 lines (largest: `claude-code/adapter.ts` 94, `statusline-planner.ts` 92, `fix-command.test.ts` 91). The helper has 2 functions with at most 3 parameters (`doctor-fixtures.ts:3`) |
| `harness-adapters.md` | OK | No adapter change after codereview_02 |
| `file-changes.md` | OK | Unchanged since codereview_03; `fix-command.test.ts` and `fix-interactive.test.ts` pass |
| `cli-output.md` | OK | Unchanged since codereview_02; suites pass |
| `tests.md` (IDs in test names, in-process tests, helpers, coverage) | OK | The T09 helper is in `tests/helpers/`, next to the other shared helpers. `doctor-fix-pointer.test.ts:13` keeps `FR-02, TC-03`. Coverage exit 0, 96.31 % statements, 93.23 % branches |
| `tests.md` (time budget) | NOT OK (open item) | `npm run test:budget` passed: 167.6 s of 180 s. `npm run coverage` took 216 s of wall time (vitest `Duration 212.62s`), above the 180 s that `tests.md` sets for coverage too. See open item 2 |

## Quality profile

Scope: 57 TypeScript files: the `.ts` paths in the `Changed files` lines of the 9 handoffs, plus the TechSpec files `claude-code/adapter.ts`, `pi/adapter.ts`, `oh-my-pi/adapter.ts`. `claude-code/context-source.ts` is in the TechSpec list but has no diff against the base, so it is not in the scope (DEC-05: `decideContextSource` treats `'keep'` as `'default'` without a change, `context-source.ts:14-18`). `core_files` = the 8 files under `src/core/`. codereview_03 counted 55 files; T09 adds `tests/helpers/doctor-fixtures.ts`, and the other difference comes from the file list source, not from new code.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | `rg -n ':\s*any\b\|\bas any\b\|<any>' files` | 0 new of 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n '@ts-ignore\|@ts-nocheck\|eslint-disable' files` | 0 new of 0 | OK |
| QA-03 | Empty `catch` | blocking | `rg -n -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' files` | 0 new of 0 | OK |
| QA-04 | `core` imports `infrastructure` or `cli` | blocking | `rg -n "from '(\.\./)+(infrastructure\|cli)/" core_files` | 0 new of 0 | OK |
| QA-05 | `throw new Error(` | reservation | `rg -n 'throw new Error\(' files` | 0 new of 9 | pre-existing: `scripts/check-schemas.ts:17`, `scripts/check-package.ts:41-44,50,59,63,75` (baseline lines shifted by the inserted schema list lines) |
| QA-06 | 4+ parameters | reservation | `rg -n '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' files` | 0 new of 1 | pre-existing in the base, not in the TechSpec baseline table: `tests/unit/asset-currency.test.ts:12` (line 9 at `419c0bd`; not in the diff), an `it.each` callback with 1 destructured parameter |
| QA-07 | File above 100 lines | reservation | `rg -c -H '^' files \| awk -F: '$2 > 100'` | 0 new of 0 | OK |

- Terrain baseline: applied from TechSpec.
- Hits discounted by baseline: 9 (QA-05). 1 QA-06 hit is pre-existing in the base (`asset-currency.test.ts`), outside the TechSpec baseline table.
- Reservations accumulated in the feature: 0 profile hits.
- Suggested escalation: no trigger fired. Reservation hits: 0 of 8. Largest touched file: 94 lines (limit 200). Same block in 3+ places: the doctor `finding()` and `report()` factories now exist once (`tests/helpers/doctor-fixtures.ts`). The other local `finding()` factories in `tests/unit/fix-outcomes.test.ts:9`, `tests/unit/fix-groups.test.ts:15`, and `tests/unit/cli-install-text.test.ts:31` have different inputs and bodies (object input with a group, object input with a severity default, a fixed code), so they are not the same block; `cli-install-text.test.ts` also has no diff against the base. The local `format()` wrapper is in 2 files (`doctor-text.test.ts:10-12`, `doctor-fix-pointer.test.ts:9-11`), below the trigger.

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 to DEC-16 | YES | No production file changed after codereview_03 (and after codereview_02), which recorded YES for each decision with `path:line` evidence. The suites that prove each decision pass in this run |
| DEC-05 (`'keep'`) | YES | Spot check: `adapter.ts:13` adds `'keep'`; `statusline-planner.ts:24` returns `EMPTY_PLAN`; `planner.ts:28` keeps the bridge asset only for `'keep'`; `context-source.ts:15` treats every request other than `install` like `'default'` |
| Test approach TC-03 location | YES | TC-03 is in `tests/unit/doctor-fix-pointer.test.ts`, moved by T08 under A-05 and AUTO-06. Not a finding |
| Quality profile duplication trigger | YES | codereview_03/OI-01 closed by T09 (A-06, AUTO-07) |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | Fix groups, doctor text, schema field; code unchanged |
| T02 | `done/task_02.md` | COMPLETE | `planInit`, `overwritePaths`, `'keep'` |
| T03 | `done/task_03.md` | COMPLETE | Report contract, outcome service, `parseFix` |
| T04 | `done/task_04.md` | COMPLETE | Command without prompts |
| T05 | `done/task_05.md` | COMPLETE | TTY flow |
| T06 | `done/task_06.md` | COMPLETE | Published schema, e2e smoke, README |
| T07 | `codereview_01/done/task_07.md` | COMPLETE | `keptBridgeAssets`; resolved codereview_01/CR-01 |
| T08 | `codereview_02/done/task_08.md` | COMPLETE | Resolved codereview_02/OI-01 to OI-03 |
| T09 | `codereview_03/done/task_09.md` | COMPLETE | The changed-file list equals the files changed after codereview_03. Acceptance: no local doctor factory in the 3 files; the 3 suites pass (22 tests); lint and typecheck exit 0. Line counts: helper 9, `doctor-rows.test.ts` 55, `doctor-text.test.ts` 87, `doctor-fix-pointer.test.ts` 29. No production code changed |

## Executed validations

- Profile and scope: CLI command surface (`src/cli/`, `src/core/`) and the Claude Code install planner. In-process integration tests and the e2e smoke on the built CLI. No new built-CLI probe: no production code changed after codereview_02.
- Validated state: worktree at `419c0bd` plus uncommitted changes, Windows 11, Git Bash, 2026-10-21. `git status --porcelain`: 89 entries before and after the commands, with equal content; codereview_03 recorded 88, and the 1 new entry is `?? tests/helpers/doctor-fixtures.ts`. `npm run build` runs `schemas:generate`; `schemas:check` passed after the build and the schema diff against the base is unchanged.
- Reused evidence: the production code reading and built-CLI probes of codereview_02 and codereview_03, because no production file changed after those reports. No command result is reused.
- Manual acceptance: not run. The TechSpec manual TTY script belongs to CLI QA (A-03).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed (exit 0) | rules, T09 |
| `npm run typecheck` | passed (exit 0) | rules, T09 |
| `npm run build` | passed (exit 0) | FR-14 e2e precondition |
| `npm run schemas:check` | passed (exit 0) | FR-14, FR-15, TC-22 |
| `npm run coverage` | passed (exit 0): 288 files, 1540 passed, 1 skipped; 96.31 % statements, 93.23 % branches, 97.36 % functions, 96.31 % lines; vitest `Duration 212.62s`, wall 216 s | FR-01 to FR-16, TC-01 to TC-25, T07 to T09 |
| `npm run test:budget` | passed (exit 0): 167.6 s of 180 s. Slowest: `init-assistant-equivalence` 29.0 s, `statusline-shell` 26.1 s, `codex-hook-command-shells` 15.7 s, `fix-command` 14.4 s, `fix-interactive` 14.0 s | `tests.md` budget for `npm test` |
| `npx vitest run tests/unit/doctor-rows.test.ts tests/unit/doctor-text.test.ts tests/unit/doctor-fix-pointer.test.ts` | passed (3 files, 22 tests) | T09, FR-02, TC-03 |
| Quality profile QA-01 to QA-07 | passed; 0 blocking, 0 new reservation hits | Quality profile |

## Findings

No finding in this review.

No optional improvement in this review.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_01/CR-01 | resolved | Production code unchanged since codereview_02; `planner.ts:28` keeps the bridge asset for `'keep'`; `fix-command.test.ts`, `fix-interactive.test.ts`, and `statusline-keep.test.ts` pass |
| codereview_02/OI-01 | resolved | `tests/unit/doctor-text.test.ts` 87 lines; QA-07 0 hits |
| codereview_02/OI-02 | resolved | `fix-interactive.test.ts:61` creates `.git`; `:64` adds `.gitignore` to the owned files; `:68` asserts 1 question and equal hashes; `:69` asserts the bridge path in `.gitignore`. Suite passes |
| codereview_02/OI-03 | resolved | `fix-command.test.ts:85-90`: `fix --yes --force` on an inactive bridge gives `STATUSLINE_BRIDGE_INACTIVE` `fixed`, and `.claude/settings.local.json` contains `context-brake-statusline`. Suite passes |
| codereview_03/OI-01 | resolved | `tests/helpers/doctor-fixtures.ts:3-9`; imports at `doctor-rows.test.ts:4`, `doctor-text.test.ts:5`, `doctor-fix-pointer.test.ts:5`; no local doctor `finding()` or `report()` remains in `tests/` (search for `${code} message` and `function (finding|report)(` finds only the helper and the different factories named in the quality profile) |

## Limitations and open items

- Open item 1 (PRD decision, accepted in A-05): after `--no-statusline-bridge`, or after the `forget` answer, `STATUSLINE_BRIDGE_ABSENT` stays in group `automatic` (FR-01 table), and `fix` reports it `FAILED` with an empty plan. This follows the approved PRD.
- Open item 2 (repository owner, accepted in A-05): `npm run test:budget` passed in this run (167.6 s), but `npm run coverage` took 216 s of wall time, above the 180 s that `.agents/rules/tests.md` sets for coverage. codereview_03 measured 151 s for coverage and 215.2 s for the budget, so the 2 times change with machine load. No test failed in either run of this review. prd-24 adds `fix-command` (14.4 s), `fix-interactive` (14.0 s), and `e2e-fix` (9.6 s) among the 10 slowest files. The status does not count it as a feature failure.
- Open item 3 (repository owner, accepted in A-05): the e2e list in `.agents/rules/tests.md` names init, doctor, and remove; `tests/e2e/e2e-fix.test.ts` follows the per-command pattern.
- Open item 4 (TechSpec owner, accepted in A-05): DEC-06 extends a skipped `STATUSLINE_BRIDGE_INACTIVE` only to `claude-code` codes that start with `STATUSLINE_`. An `ASSET_OUTDATED` on the bridge asset in the same run reports `failed`, not `skipped`.
- Not verifiable: Linux and macOS (NFR-04) were not run here; the TechSpec assigns them to CI. This is the reservation of this review: one NFR stays `not verifiable` in the matrix, so the status cannot be `APPROVED` under the skill rule "all obligations conformant". This is the same rule that codereview_02 and codereview_03 applied. The TechSpec does not require the 2 platforms in the local review, so it is not essential evidence that would reject the feature.
- Not verifiable: the `askUi` select path of the clack prompt port has no automated test (DEC-13; `ScriptedPrompts` has no `askUi`). The manual TTY acceptance script belongs to CLI QA.
- Scope limitation: the worktree holds the uncommitted prd-22 and prd-23 diffs on the same files. This review attributes the prd-24 part through the handoffs and the TechSpec file list. The 3 doctor test files and the helper are untracked, so the T09 change shows only through content, line counts, and test counts, not through `git diff`.
- State note: every `- [ ]` work item in `done/task_01.md` to `done/task_06.md`, `codereview_01/done/task_07.md`, and `codereview_02/done/task_08.md` stays unchecked. The `done/` location, the manifest State `[x]`, and the filled handoffs prove completion. T09 has its 2 work items checked.
- State note: `codereview_03/` holds no corrections manifest; `workflow.md` A-06 and `autonomous-decisions.md#AUTO-07` record the T09 plan. `workflow.md` has no entry for the T08 or T09 execution; the handoffs and the file changes agree. The flow owner can add the entries.

## Conclusion

codereview_03/OI-01 is resolved: the doctor finding and report factories are in one helper, and the 3 doctor text test files import it with 22 passing tests. The earlier findings stay resolved. T09 changed tests only, and no production file changed after codereview_02. Every FR and NFR that this environment can verify is conformant, and T01 to T09 are complete. Lint, typecheck, build, schemas check, coverage (1540 passed), the e2e smoke, and the test budget (167.6 s) pass. The quality profile has 0 blocking hits and 0 new reservation hits, and no escalation trigger fired. The reservation is NFR-04 (Linux and macOS), which stays not verifiable here and belongs to CI. Coverage wall time (216 s) stays an accepted open item for the repository owner. Status: APPROVED WITH RESERVATIONS. Next step per A-03: CLI QA (`sdd-execute-qa`).
