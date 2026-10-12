# Code review report — Mod as the context source for Claude Code (prd-18), re-review

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `63fd5cb5a4855d6147690fdefc016e0b3a23a408..current worktree` (tracked changes, staged and unstaged, plus untracked source, test, and `tasks/` files; 56 changed paths, 52 TypeScript files)
- Previous review: `tasks/prd-18-mod-como-fonte-do-contexto/codereview_01/codereview.md` (REJECTED, CR-01 blocking)

The blocking finding of codereview_01 (FR-09 / DEC-04) is corrected in code and test, and the other corrected findings hold. No requirement, security, or essential-evidence item is pending. Two optional improvements remain (one new reservation hit, one carried over), plus the unverified non-Windows platforms.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-18-mod-como-fonte-do-contexto/prd.md` | read |
| TechSpec | `tasks/prd-18-mod-como-fonte-do-contexto/techspec.md` | read (amended by the correction round: DEC-04 report-once rule, CMP-07, rollout checklist) |
| Manifest | `tasks/prd-18-mod-como-fonte-do-contexto/tasks.md` | read (T01 to T03 `[x]`, links to `done/task_0N.md` resolve) |
| Handoffs | `done/task_01.md` to `done/task_03.md`; `codereview_01/done/task_01.md` to `task_03.md` | read |
| Previous report | `codereview_01/codereview.md` | read |
| Workflow | `workflow.md` (D-01 to D-17) | read |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter (header, next step brief, open threads O-01 to O-03, `on-run` L-03); header `git_head 63fd5cb` equals `HEAD` |
| Implementation | `git diff 63fd5cb` plus untracked files | delimited |

## Coverage matrix

Only rows that changed or that the correction round touches are re-derived; the other rows of codereview_01 were re-checked against the unchanged code (full suite green) and keep their state.

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Mod publishes tokens, window, percent; missing value is null | `mod/context-reading.ts:readingOf`, `publishChanged` | `tests/integration/claude-mod-reading.test.ts` (4 events, change-only, nulls) | conformant | Passed in the full run |
| FR-02 | Fresher source, window from mod, bridge fallback, text unchanged | `mod-reading.ts`, `runtime.ts` | `freshest-measured.test.ts`, `claude-hook-mod-reading.test.ts` | conformant | Unchanged since codereview_01 |
| FR-03 to FR-05 | Version decision, mod-first install, flags | `context-source.ts`, planners | `context-source.test.ts`, `init-mod-first.test.ts` | conformant | Second-run plan now asserted `toEqual([])` (`init-mod-first.test.ts`, first test) |
| FR-06 | Migration restores bytes; dry-run equals run | `statusline-migration.ts` | `init-mod-migration.test.ts` | conformant | Dry-run vs run compared on the whole `plan.changes` (path, kind, summary) |
| FR-07 | Doctor source and findings, JSON, schema | `statusline-context-window.ts`, `doctor-report-extras.ts` | `doctor-context-source.test.ts` (both files) | conformant | `schemas:check` passed; meaning of `reporting` now stated in README (Claude Code Context Source) |
| FR-08 | `remove` leaves `statusLine` alone | existing planners | `init-mod-first.test.ts` | conformant | |
| FR-09 | `usage()` failing or without window: nothing recorded, error code in the runtime log, session continues | `mod/context-reading.ts:publishChanged` (`return reportOnce($)` on a null window), `publishContextReading` (`catch` -> `reportOnce`), `mod/mod-log.ts:lastRecordedCode` | `claude-mod-reading.test.ts`: rejecting `usage()` -> `['ERROR_INTERNAL']`; no window -> `['ERROR_INTERNAL']`; three calls -> one record, a `RESTARTED` record in between allows a second | conformant | Resolves codereview_01/CR-01 |
| NFR-01 to NFR-04 | Reader validation, privacy, bundle, failure policy | as in codereview_01 | `claude-hook-mod-reading.test.ts`, `context-reading-schema.test.ts`, `claude-mod-bundle.test.ts` | conformant | Bundle test passed; QA-04 empty. The new `ensureRuntimeIgnore` uses only `$.fs.exists` and `$.fs.write` |
| NFR-05 | Three platforms, symlinked settings | `node:path`, forward slashes in the mod | `symlinked-harness-config.test.ts` | not verifiable | Only Windows ran here; CI matrix not available |
| DEC-04 | Events, change-only, failure or missing window reported once; runtime `.gitignore` ensured before first write | `mod/context-reading.ts:reportOnce`, `ensureRuntimeIgnore` | `claude-mod-reading.test.ts`, `mod-reading-git-status.test.ts` | conformant | Resolves the DEC-04 partial of codereview_01 |
| DEC-10 | Mod reuses the core schema and constants | `core/contracts/context-reading.ts` (`RUNTIME_IGNORE_*`), `runtime-paths.ts` imports the constant | bundle test | conformant | `core` still imports nothing from `infrastructure` (QA-03) |
| TC-01 to TC-16 | Scenarios | files named in the amended TechSpec | full suite | conformant | Every path named in the TechSpec test table and Relevant files exists (listing run); `context-source-diagnostics.ts` and `context-reading-mod.test.ts` no longer appear |
| TechSpec Risks | `git status` stays clean after a publish | `mod-reading-git-status.test.ts` | same | conformant | Real `git init` plus `git status --porcelain --untracked-files=all` after `init` and `publishContextReading`; resolves codereview_01/CR-02. The file is registered in `PROCESS_LANE_FILES` and the lane allow-list test |
| TechSpec Rollout | `MOD_VERSION` follows the package version | `mod/mod-info.ts:3` `1.0.0` | `claude-mod-bundle.test.ts:46` | conformant with note | Deferred to the release commit and recorded as a release checklist item in the TechSpec rollout (CR-02) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (100 lines per file) | OK with note | New and modified source files stay at or under 100 lines; `tests/unit/test-lanes.test.ts` is 103 lines (102 at the base), see CR-01 |
| `javascript-typescript.md` | OK | QA-01 empty |
| `node.md` | OK | QA-04 empty; async I/O on the hook path |
| `tests.md` | OK | Process-lane file registered for the test that spawns `git`; test budget 102.4 s of 180 s |
| `harness-adapters.md` | OK | Claude shapes stay in `claude-code/`; research file updated |
| `file-changes.md` | OK | Migration reuses the restore plan; the mod writes only under `.context-brake/runtime/` |
| `cli-output.md` | OK | QA-05 empty |
| `AGENTS.md` architecture | OK | QA-03 empty |
| `ts-tests` | OK | New tests assert behavior; the strengthened assertions compare plans, not paths only |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | No `any`, `@ts-ignore`, `eslint-disable` | blocking | TechSpec command over the 52 TypeScript files of the diff | 0 of 0 | OK |
| QA-02 | No empty `catch` | blocking | TechSpec command | 1 of 1, `tests/integration/symlinked-harness-config.test.ts` (`.catch(() => {})` in `afterEach`) | pre-existing (same line at the base; this feature only injects the runner there) |
| QA-03 | `core` never imports `infrastructure` or `cli` | blocking | TechSpec command over `src/core/` files of the diff | 0 of 0 | OK |
| QA-04 | No sync file or process API in mod and hook | blocking | TechSpec command | 0 of 0 | OK |
| QA-05 | No `console.log` or `process.stdout.write` on the hook path | blocking | TechSpec command | 0 of 0 | OK |
| QA-06 | File above 100 lines | reservation | TechSpec command | 2 of 2: `tests/unit/cli-output-text.test.ts` (107, 107 at the base); `tests/unit/test-lanes.test.ts` (103, 102 at the base) | cli-output-text pre-existing; test-lanes aggravated by one line (CR-01) |
| QA-07 | Four or more parameters | reservation | TechSpec command | 0 of 0 | OK |

- Terrain baseline: applied from TechSpec; the two hit files were measured against `63fd5cb` with `git show`.
- Hits discounted by baseline: 2 (QA-02 line, QA-06 `cli-output-text.test.ts`).
- Reservations accumulated in the feature: 2 (CR-01 profile reservation hit; CR-02 optional improvement).
- Suggested escalation: no trigger fired (fewer than 8 reservations; no touched file above 200 lines; no duplication in 3 or more places found).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01, DEC-02, DEC-03 | YES | Unchanged and green |
| DEC-04 (report once, runtime ignore) | YES | `mod/context-reading.ts:reportOnce`, `ensureRuntimeIgnore` |
| DEC-05 to DEC-09 | YES | Unchanged and green |
| DEC-10 bundle rules | YES | Bundle test passed |
| Contract: report schema and findings | YES | `npm run schemas:check` passed |
| Rollout: `MOD_VERSION` follows the package version | PARTIAL | Deferred by decisions D-16 and D-17 to the release commit; on the TechSpec release checklist |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | Probe recorded in the research file |
| T02 | `done/task_02.md` | COMPLETE | Mod publisher and hook selection tested |
| T03 | `done/task_03.md` | COMPLETE | Install, migration, doctor, assistant, README, schema |
| Correction T01 | `codereview_01/done/task_01.md` | COMPLETE | `lastRecordedCode`, `reportOnce`, tests for the three behaviors; verified in code and test |
| Correction T02 | `codereview_01/done/task_02.md` | COMPLETE | Plan-level assertions and `git status` test present; the handoff's real-gap claim (runtime `.gitignore` missing when the mod publishes first) is backed by `ensureRuntimeIgnore` and the shared constants |
| Correction T03 | `codereview_01/done/task_03.md` | COMPLETE | TechSpec paths exist; README defines `reporting` |

## Executed validations

- Profile and scope: TypeScript strict CLI plus mod and hook; in-process unit and integration tests and the existing built-CLI smoke set; no browser or port surfaces; no new end-to-end file per the TechSpec.
- Validated state: base `63fd5cb` plus the uncommitted worktree (56 paths, unchanged before and after the runs); Windows 11, Node 20+, `rg` from scoop. macOS and Linux not run.
- Reused evidence: the real-session run (`claude -p` 2.1.296) in the T03 handoff and the `claude plugin validate` run in correction T01's handoff are not rerun (no real Claude Code session by instruction). The first remains valid for the publisher path; the second covers a bundle that changed only by the handoff's word (see limitations).
- Manual acceptance: open, the user's own repository (TechSpec "Manual acceptance", snapshot O-01).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed | code standards |
| `npm run typecheck` | passed | all |
| `npm run build` | passed | bundle, package |
| `npm run coverage` | passed: 252 files, 1259 tests, 95.89% lines overall; `mod-reading.ts` 100%, `runtime-paths.ts` 100% lines | FR-01 to FR-09, NFR-01 to NFR-04, DEC-04 |
| `npm run schemas:check` | passed | FR-07 |
| `npm run package:smoke` | passed (exit 0) | packaging |
| `npm run test:budget` | passed, 102.4 s of 180 s | `tests.md` |
| Quality profile QA-01 to QA-07 | see table | profile |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Low (optional improvement, QA-06 reservation hit) | QA-06, `code-standards.md` (100 lines per file) | `tests/unit/test-lanes.test.ts` has 103 lines (102 at the base `63fd5cb`); this feature added one line (`'tests/integration/mod-reading-git-status.test.ts'` in `ALLOWED_PROCESS_FILES`, line 57) | The file was already over the limit and the allow-list grows by one entry per process-lane test; no behavior effect | When that file is next touched for another reason, move the `ALLOWED_PROCESS_FILES` list into a shared fixture or split the file; not needed for this feature |
| CR-02 | Low (optional improvement) | TechSpec Rollout (carried from codereview_01/CR-06) | `src/infrastructure/harnesses/claude-code/mod/mod-info.ts:3` `MOD_VERSION = '1.0.0'` while the mod behavior changed | Until the release bump `doctor` cannot flag a session still running an older mod with the same version | Bump package and `MOD_VERSION` together in the release commit; the item is on the TechSpec release checklist |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_01/CR-01 (FR-09, DEC-04, TC-02; blocking) | resolved | `mod/context-reading.ts:publishChanged` calls `reportOnce` on a null window and `publishContextReading` calls it on failure; `mod-log.ts:lastRecordedCode`; `claude-mod-reading.test.ts` expects `['ERROR_INTERNAL']` for no window and for a rejecting `usage()`, one record after three calls, and a new record after a `RESTARTED` record; tests passed |
| codereview_01/CR-02 (git status after a publish) | resolved | `tests/integration/mod-reading-git-status.test.ts` runs real `git status`; the production gap it exposed is fixed by `ensureRuntimeIgnore`; passed in the process lane |
| codereview_01/CR-03 (`reporting` has no freshness bound) | resolved by documentation | README "Claude Code Context Source" states that `reporting` means a session of this repository has reported at some point, with no freshness bound; `statusline-context-window.ts` behavior unchanged. It was an optional improvement; the accepted trade-off is now explicit |
| codereview_01/CR-04 (idempotency and dry-run by bytes and paths) | resolved | `init-mod-first.test.ts` asserts `second.plan.changes` equals `[]`; `init-mod-migration.test.ts` asserts `dryRun.plan.changes` equals `applied.plan.changes` |
| codereview_01/CR-05 (TechSpec lists missing files) | resolved | Listing of every path named in the TechSpec tables against the repository: none missing; grep for the two old names returns nothing |
| codereview_01/CR-06 (`MOD_VERSION` not bumped) | persistent (accepted) | `mod-info.ts:3` still `1.0.0`; recorded as the release checklist in the TechSpec rollout; carried as CR-02 here |

## Limitations and open items

- NFR-05: only Windows ran. Linux and macOS behavior of `$.fs.write` and the new paths is unverified here and in the handoffs (TechSpec risk accepted).
- No real Claude Code session was started by this review, by instruction. The correction round changed the bundled mod (`reportOnce`, `ensureRuntimeIgnore`, `lastRecordedCode`); `claude plugin validate` of that rebuilt bundle is known only from the correction T01 handoff (passed with warnings about existing handlers) and was not rerun. The bundle test (no `node:` import, no sync I/O) passed here.
- `usage().context.tokens` after a response was observed only on 2.1.296; 2.1.287 and 2.1.289 are window-only evidence (T01).
- The temporary mutation checks the correction handoffs describe were not repeated; the strengthened assertions were judged by reading (full-list equality and empty-plan equality).
- Manual acceptance on the user's repository (snapshot O-01), the per-project marketplace name (O-02), and the user-level `installed_plugins.json` entry (O-03) are open items for the user and do not change this status.
- `workflow.md`: nothing was written by this review (instruction). Record for the author: review `codereview_02` of `prd-18` finished APPROVED WITH RESERVATIONS; Execution: delegated reviewer; CR-01 of codereview_01 resolved.
- `checkpoint.json`, `tasks.md`, the handoffs, the snapshot, and all code were not edited; nothing was committed, stashed, or cleaned. `dist/` and `coverage/` were rewritten by the build and coverage runs.

## Conclusion

The correction round resolves the blocking finding: a reading without a window, and a failing `usage()`, now leave exactly one `ERROR_INTERNAL` record until another record follows, which satisfies FR-09 and DEC-04 and keeps the bounded restart log from filling. The `git status` test added for the TechSpec risk exposed and fixed a real gap (the runtime `.gitignore` did not exist when the mod published first). The tests now prove idempotency and dry-run equality by plan, the TechSpec names only files that exist, and the README defines `reporting`. Lint, typecheck, build, the full suite (252 files, 1259 tests, 95.89% lines), schema currency, package smoke, and the test budget pass, and there is no new blocking quality profile hit. What remains is optional: one reservation hit of one line on an already oversized test file (CR-01), the `MOD_VERSION` bump left to the release commit (CR-02), and the unverified Linux and macOS platforms. The status is APPROVED WITH RESERVATIONS.
