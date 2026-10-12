# Code review report — Mod as the context source for Claude Code (prd-18)

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `63fd5cb5a4855d6147690fdefc016e0b3a23a408..current worktree` (33 modified tracked files, 16 new source/test files, `tasks/`; staged, unstaged, and untracked included)
- Previous review: —

One obligation is non-conformant (FR-09 / DEC-04: a reading without a window is not reported to the runtime log, and a test asserts the opposite). Everything else is conformant or carries only optional improvements. Per the status rules, a non-conformant obligation means REJECTED.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-18-mod-como-fonte-do-contexto/prd.md` | read |
| TechSpec | `tasks/prd-18-mod-como-fonte-do-contexto/techspec.md` | read |
| Manifest | `tasks/prd-18-mod-como-fonte-do-contexto/tasks.md` | read (T01 to T03 `[x]`, links to `done/task_0N.md` resolve) |
| Handoffs | `done/task_01.md`, `done/task_02.md`, `done/task_03.md` | read |
| Workflow, checkpoint | `workflow.md` (D-01 to D-15) | read; `checkpoint.json` not judged (not a review source) |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter (header, next step brief, open threads O-01 to O-03; `on-run` entries L-03 only for environment facts); header `git_head 63fd5cb` equals `HEAD`; worktree is 51 paths as the snapshot says |
| Implementation | `git diff 63fd5cb` plus untracked files | delimited |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Mod publishes tokens, window, percent per session; missing value is null, never zero | `mod/context-reading.ts:publishChanged`, `readingOf`; `mod/register.ts` (4 events) | `tests/integration/claude-mod-reading.test.ts` (TC-01) | conformant | Strict schema fields; nulls tested (`windowTokens` 200000, others null) |
| FR-02 | Fresher of mod and transcript (mod wins tie), window from mod, then bridge, then estimate; telemetry text unchanged | `mod-reading.ts:freshestMeasured`, `runtime.ts:measuredUsage`; core `session-zone.ts:mergeMeasurements` untouched | `tests/unit/freshest-measured.test.ts` (newer, equal, older, absent, window-only), `tests/integration/claude-hook-mod-reading.test.ts` (bridge-only fallback) | conformant | Existing telemetry-text tests pass in the full run |
| FR-03 | `init` decides mod-first or bridge by version; undetectable gives bridge | `context-source.ts:decideContextSource`, `detectContextSource`; `adapter.ts:planInstall` | `tests/unit/context-source.test.ts` (2.1.286, 2.1.287, 2.1.296, 3.0.0, null) | conformant | Decision reported in the plan summaries and the assistant line |
| FR-04 | Plain `init` in mod-first installs the mod, touches no `statusLine`, no bridge files, no `autoRestart` block, second run idempotent | `planner.ts:planClaudeInstall`, `statusline-planner.ts:planStatuslineInstall`, `auto-restart-planner.ts:planAutoRestart` (`forModFirst`) | `tests/integration/init-mod-first.test.ts` | conformant | Bytes of `settings.local.json` compared; `autoRestart` absent from config |
| FR-05 | Flags keep meaning on any version | `context-source.ts:decideContextSource` (`install` always bridge, `remove` opt-out kept) | `init-mod-first.test.ts` (forced bridge, opt-out), existing bridge tests unchanged | conformant | Full suite passes |
| FR-06 | Migration restores the earlier `statusLine` byte for byte, removes the bridge; dry-run equals run | `statusline-migration.ts:planModFirstStatusline` (reuses `planStatuslineRestore`) | `tests/integration/init-mod-migration.test.ts` | conformant | Dry-run compared by paths only (see CR-04) |
| FR-07 | Doctor reports mod/bridge/none, warns when silent, JSON and schema updated | `statusline-context-window.ts`, `doctor-report-extras.ts:modFindings`, `context-window-report.ts`, `schemas/doctor-report.schema.json` | `tests/integration/doctor-context-source.test.ts`, `tests/unit/doctor-context-source.test.ts` | conformant | `npm run schemas:check` passed; "fresh" is not tested (CR-03) |
| FR-08 | `remove` deletes mod-first artifacts and leaves `statusLine` alone | existing `planClaudeRemove` | `init-mod-first.test.ts` (original bytes; created file deleted) | conformant | |
| FR-09 | When `usage()` fails or returns no window: nothing recorded, error code written to the runtime log, session continues | `mod/context-reading.ts:39` returns silently on a null window; `catch` reports `ERROR_INTERNAL` only for a thrown failure | `claude-mod-reading.test.ts:55` asserts `readCodes` is `[]` for a missing window | non-conformant | See CR-01 |
| NFR-01 | Reader never merges readings; invalid file is no reading; mod never writes the ledger | `mod-reading.ts:parseContextReading` (size cap, strict schema), `readContextReading` | `claude-hook-mod-reading.test.ts` (empty, truncated, null, v2, extra field, oversized) | conformant | |
| NFR-02 | Only counts, ids, timestamps | `context-reading.ts:contextReadingSchema` (strict) | `context-reading-schema.test.ts` (extra field rejected) | conformant | |
| NFR-03 | Mod bundle uses no Node module and no sync I/O | `mod/context-reading.ts` imports only the core schema and `$` | `tests/integration/claude-mod-bundle.test.ts` | conformant | Passes in the full run |
| NFR-04 | Mod failure never blocks; hook falls back | `register.ts` handlers always `return next(e)`; `publishContextReading` catches; `readContextReading` catches read errors | `claude-mod-reading.test.ts` (rejecting `usage()`), `claude-hook-mod-reading.test.ts` (directory at the reading path) | conformant | |
| NFR-05 | Linux, macOS, Windows, symlinked settings | `node:path` use, forward slashes in the mod | `symlinked-harness-config.test.ts` (runner injected) | not verifiable | Only Windows ran here; the CI matrix was not available to this review |
| OBJ-01, OBJ-02, OBJ-03 | Outcomes | see FR-03 to FR-06 | `init-mod-first`, existing bridge suite, `init-mod-migration` | conformant | Manual acceptance on the user's repository remains the user's (O-01) |
| US-01 to US-04 | Journeys | see FR-03 to FR-07 | as above | conformant | US-04 is served by `CONTEXT_MOD_SILENT` with the causes |
| DEC-01, DEC-02 | One file per session, strict schema, id check | `context-reading.ts`, `mod-reading.ts` | TC-01, TC-11, TC-12 | conformant | |
| DEC-03 | `mapClaudeInput` picks the fresher; core unchanged | `runtime.ts:measuredUsage`, `mod-reading.ts:freshestMeasured` | `freshest-measured.test.ts` | conformant | |
| DEC-04 | Events, skip unchanged, failure or missing window reports `ERROR_INTERNAL` | `register.ts`, `mod/context-reading.ts` | `claude-mod-reading.test.ts` | partial | Events, skip-unchanged, guards conformant; missing window not reported (CR-01) |
| DEC-05 | Version decision, own runner, constant `2.1.287` | `context-source.ts` | `context-source.test.ts` | conformant | |
| DEC-06 | Install gate `autoRestart \|\| mod`, options object | `auto-restart-planner.ts:planAutoRestart` | `auto-restart-planner.test.ts` and mod-first tests | conformant | |
| DEC-07 | Migration keeps the opt-out marker, deletes the bridge script | `statusline-migration.ts` | `init-mod-migration.test.ts` | conformant | |
| DEC-08 | Report fields, findings, remove needs no code | `statusline-context-window.ts`, `doctor-report-extras.ts` | doctor tests, schema check | conformant | `context-source-diagnostics.ts` listed in CMP-07 was not created; the TechSpec's own DEC-08 says "no separate diagnostics file" (documentation drift, CR-05) |
| DEC-09 | Assistant skips the bridge question and prints the source | `questions-misc.ts:askMisc`, `summary.ts:bridgeLine`, `assistant-context.ts` | `assistant-questions.test.ts`, `assistant-output.test.ts` | conformant | |
| DEC-10 | Mod reuses the core schema, no duplicated schema | `mod/context-reading.ts` imports `contextReadingSchema` | bundle test | conformant | |
| TC-01 to TC-15 | Scenarios | files listed above | run in the full suite | conformant (TC-02 partly, see CR-01) | Four TechSpec test file names differ from the files that exist; scenarios are covered |
| TC-16 / T01 | Probe findings recorded, constant decided | `docs/research/harness-integrations.md` bullet "Leitura de contexto pelo mod (PRD-18 T01)" | manual | conformant | Probe output in the handoff is counts and ids only |
| TechSpec Risks | "T03 adds a test that `git status` stays clean after a publish" | none | none | pending | See CR-02 |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (no comments, files and functions within limits) | OK | QA-06 returned only `tests/unit/cli-output-text.test.ts` (107 lines, 107 at the base); new and modified source files are all at or under 100 lines (`adapter.ts` 92, `statusline-planner.ts` 91, `auto-restart-planner.ts` 91) |
| `javascript-typescript.md` | OK | QA-01 empty; strict schemas; no `any` |
| `node.md` | OK | Async file calls on the hook path; no sync API (QA-04 empty) |
| `tests.md` | OK | Test budget 105.5 s of 180 s; temporary directories cleaned in `afterEach` |
| `harness-adapters.md` | OK | Harness section of `docs/research/harness-integrations.md` updated; Claude event shapes stay inside `claude-code/` |
| `file-changes.md` | OK | Migration reuses `planStatuslineRestore`; plan before write; byte-for-byte restore tested |
| `cli-output.md` | OK | Doctor text adds `mod:` to the context window line, covered in `cli-output-text.test.ts`; no new stdout on the hook path (QA-05 empty) |
| `AGENTS.md` architecture | OK | QA-03 empty (core never imports infrastructure or cli); `context-source.ts` types reach `cli/assistant/types.ts` from infrastructure, which the CLI layer is allowed to do |
| `ts-tests` | OK | Parameterised tables; no test without an assertion found in the new files |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | No `any`, `@ts-ignore`, `eslint-disable` | blocking | TechSpec command over the 47 TypeScript files of the diff | 0 of 0 | OK |
| QA-02 | No empty `catch` | blocking | TechSpec command | 1 of 1, in `tests/integration/symlinked-harness-config.test.ts:31` (`.catch(() => {})` in `afterEach`) | pre-existing (identical line at the base, line 30); the only change in that file is the injected runner |
| QA-03 | `core` never imports `infrastructure` or `cli` | blocking | TechSpec command over `src/core/` files of the diff | 0 of 0 | OK |
| QA-04 | No sync file or process API in the mod and the hook | blocking | TechSpec command over `mod/`, `runtime.ts`, `mod-reading.ts` | 0 of 0 | OK |
| QA-05 | No `console.log`/`process.stdout.write` on the hook path | blocking | TechSpec command over `runtime.ts`, `mod-reading.ts` | 0 of 0 | OK |
| QA-06 | File above 100 lines | reservation | TechSpec command | 1 of 1, `tests/unit/cli-output-text.test.ts` (107 lines) | pre-existing (107 lines at the base) |
| QA-07 | Four or more parameters | reservation | TechSpec command | 0 of 0 | OK |

- Terrain baseline: applied from TechSpec (no blocking hit before; the two hits above were verified against `63fd5cb`).
- Hits discounted by baseline: 2.
- Reservations accumulated in the feature: 0 profile reservations; 3 optional improvements below (CR-03, CR-04, CR-06).
- Suggested escalation: no trigger fired (fewer than 8 reservations; no touched file above 200 lines; no duplication in 3+ places found).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 file path and session id check, on both sides | YES | `context-reading.ts:isReadingSessionId`, used in `mod/context-reading.ts:37` and `mod-reading.ts:readContextReading` |
| DEC-02 strict schema; invalid is no reading | YES | `context-reading.ts`, `mod-reading.ts:parseContextReading` |
| DEC-03 fresher by `at`, mod wins tie, core untouched | YES | `mod-reading.ts:isNotOlder` uses `>=`; `session-zone.ts` has no diff |
| DEC-04 events, change-only publish, top-level publisher, failure and missing window reported | PARTIAL | Missing window not reported (CR-01) |
| DEC-05 version gate and own runner | YES | `context-source.ts` |
| DEC-06 install gate | YES | `auto-restart-planner.ts:planAutoRestart` |
| DEC-07 migration | YES | `statusline-migration.ts` |
| DEC-08 doctor | YES | `doctor-report-extras.ts:modFindings`; `bridgeAbsentFindings` suppressed when the mod is present |
| DEC-09 assistant | YES | `questions-misc.ts` |
| DEC-10 bundle rules | YES | bundle test passed |
| Contract: report schema and findings | YES | `schemas:check` passed; `CONTEXT_MOD_READY`, `CONTEXT_MOD_SILENT` emitted |
| Rollout: `MOD_VERSION` follows the package version | PARTIAL | `mod/mod-info.ts` stays `1.0.0` (CR-06) |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | Research bullet present in `docs/research/harness-integrations.md`; no `src/`, `tests/`, `assets/`, `schemas/` change attributable to it; TechSpec amended with `2.1.287` |
| T02 | `done/task_02.md` | COMPLETE with one deviation | All listed files exist; T02.5 "bump `MOD_VERSION`" was deferred to release and stated in the handoff (CR-06); FR-09 gap (CR-01) |
| T03 | `done/task_03.md` | COMPLETE | All listed files exist except `context-source-diagnostics.ts`, replaced by core code (documented in D-15 and DEC-08); acceptance criteria covered by the new integration tests |

## Executed validations

- Profile and scope: TypeScript strict CLI plus mod and hook; in-process unit and integration tests, existing built-CLI smoke set through `npm run coverage`; no new end-to-end file per the TechSpec; no browser or port surfaces.
- Validated state: base `63fd5cb` plus the uncommitted worktree (51 changed paths, unchanged before and after the runs); Windows 11, Node 20+, `rg` from scoop. macOS and Linux not run.
- Reused evidence: the authoring session's end-to-end run on the built CLI with a real `claude -p` 2.1.296 session (handoff T03: reading written, ledger `windowOrigin: harness`, doctor `reporting`). Not rerun, to honor the no-real-session constraint; it stays valid for the same code because no source file changed after it.
- Manual acceptance: open, the user's own repository (TechSpec "Manual acceptance", snapshot O-01); the older mod registered under the shared marketplace name in that repository will shadow the new copy until updated (TechSpec risk, doctor remediation names it).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed | code standards |
| `npm run typecheck` | passed | all |
| `npm run build` | passed | bundle, package |
| `npm run coverage` | passed: 251 files, all passed; 95.9% lines overall; new files `mod-reading.ts`, `project-root.ts` at 100% | FR-01 to FR-09 (except FR-09 as written), NFR-01 to NFR-04 |
| `npm run schemas:check` | passed | FR-07 |
| `npm run package:smoke` | passed (722 packaged files) | packaging |
| `npm run test:budget` | passed, 105.5 s of 180 s | `tests.md` |
| Quality profile QA-01 to QA-07 | see table | profile |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Medium | FR-09, DEC-04, TC-02 | `src/infrastructure/harnesses/claude-code/mod/context-reading.ts:39` returns silently when `windowTokens === null`; `tests/integration/claude-mod-reading.test.ts:55-60` asserts `readCodes(scene)` equals `[]` for a reading without a window. FR-09 says the mod "records nothing, writes an error code to the runtime log" when `usage()` "returns no window", and DEC-04 says a failure "or a missing window" reports `ERROR_INTERNAL` | A usage reading that arrives without a window leaves no trace in the mod log, so `doctor` and the user cannot tell a mod that sees `usage()` without a window from one that is off; the test locks the divergence in | Report `ERROR_INTERNAL` through `reportSafely` before returning on a null window and change the test to expect it; or, if silence is intended, amend FR-09 and DEC-04 through the HIL. Either way, a de-duplicated report avoids a log entry on every tool call |
| CR-02 | Low | TechSpec Risks (reading directory outside the runtime `.gitignore`) | No test asserts that `git status` stays clean after a publish; grep for `git status` in `init-mod-first`, `claude-mod-reading`, `claude-hook-mod-reading` finds nothing. In this repository `.gitignore:20` covers `/.context-brake/`, which hides the gap | The mitigation the TechSpec promised is unverified; a project without the ContextBrake `.gitignore` block (`--no-gitignore`) may show an untracked `context-readings/` path | Add the test promised in the TechSpec, or record that the `.gitignore` block is the accepted mitigation |
| CR-03 | Low (optional improvement) | FR-07 ("mod fresh", "mod silent") | `statusline-context-window.ts:29-32` reports `mod: reporting` whenever any valid reading file exists; `context-readings-scan.ts:latestContextReading` picks the newest file by mtime with no age limit | A reading left by an old session keeps `source: mod` and suppresses `CONTEXT_MOD_SILENT` even if the mod stopped loading (for example after the shared-marketplace shadowing the TechSpec lists as high probability) | Compare the reading's `at` against a freshness bound, or state in the PRD that "reporting" means "has ever reported" |
| CR-04 | Low (optional improvement) | FR-04, FR-06, TC-06, TC-08 | `init-mod-first.test.ts` proves idempotency only by comparing `settings.local.json` bytes; `init-mod-migration.test.ts` compares dry-run and run by `change.path` lists only | The acceptance wording is "plans no change" and "prints the same plan"; the tests would pass if a summary or `kind` differed or a second run planned a no-op rewrite elsewhere | Assert the second run's plan has no changes, and compare path, kind, and summary in the dry-run test |
| CR-05 | Low (documentation) | TechSpec CMP-07, "Relevant files", `done/task_03.md` Affected files; TC-02, TC-09 file names | The TechSpec still lists `context-source-diagnostics.ts` and `tests/unit/context-reading-mod.test.ts`, which do not exist; DEC-08 says "no separate diagnostics file" | A later reader cannot trace TC-02 to its test by file name | Align the component and test tables with the files that exist (author-owned artifacts; not changed by this review) |
| CR-06 | Low (optional improvement) | TechSpec Rollout, T02.5 | `src/infrastructure/harnesses/claude-code/mod/mod-info.ts:3` `MOD_VERSION = '1.0.0'`, tied to `package.json` by `claude-mod-bundle.test.ts:46`; the mod behavior changed with this feature | Until the release bump, `doctor` cannot flag a session still running a previous mod build with the same `1.0.0`; the handoff records this as deferred to the release | Bump package and `MOD_VERSION` together in the release commit; keep this on the release checklist |

## Previous findings (re-review only)

Not applicable: first review.

## Limitations and open items

- NFR-05: only Windows was run. Linux and macOS behavior of `$.fs.write` atomicity and the new paths is unverified here and in the handoffs (TechSpec risk accepted).
- No real Claude Code session was started by this review, by instruction. The real-session evidence (T01 probe, T02 and T03 runs) comes from the handoffs only; `claude plugin validate` of the built mod was not rerun here, and no automated test runs the validator (recorded in the research file).
- `usage().context.tokens` after a response was observed only on 2.1.296; 2.1.287 and 2.1.289 are window-only evidence (T01).
- Manual acceptance on the user's own repository (TechSpec; snapshot O-01), the per-project marketplace name (O-02), and the user-level `installed_plugins.json` entry left by the runs (O-03) are open items for the user and do not change this status.
- `workflow.md`: nothing was written by this review (instruction). Record for the author: review `codereview_01` of `prd-18` finished REJECTED with CR-01 as the blocking finding; Execution: delegated reviewer.
- `checkpoint.json`, `tasks.md`, the handoffs, and the snapshot were not edited.

## Conclusion

The implementation delivers the mod publisher, the hook-side selection, the version-based install decision, the migration, the doctor and assistant changes, the docs, and the regenerated schema. Lint, typecheck, build, the full suite (251 files, 95.9% lines), schema currency, package smoke, and the test budget all pass, and no new blocking quality profile hit exists (two pre-existing hits were discounted against the base). One obligation is not met as written: FR-09 and DEC-04 require a reading without a window to leave an error code in the runtime log, and the code and its test do the opposite (CR-01). The remaining findings are low-severity: an unverified TechSpec mitigation (CR-02), optional improvements (CR-03, CR-04, CR-06), and documentation drift (CR-05). The status is REJECTED until CR-01 is corrected or FR-09 and DEC-04 are amended through the HIL; after that, the remaining points do not block approval.
